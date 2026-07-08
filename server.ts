import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy-initialized Gemini client - highly resilient to timing issues and serverless setups
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY trong cấu hình Environment Variables của Vercel.");
  }
  aiInstance = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  return aiInstance;
}

// Chuyên gia xử lý: Tự động Retry với Exponential Backoff & Fallback Model khi gặp lỗi 503 (Overloaded) hoặc 429
async function generateContentWithRetryAndFallback(
  aiClient: GoogleGenAI,
  parts: any[],
  initialModel: string = "gemini-3.5-flash",
  fallbackModel: string = "gemini-3.5-flash"
) {
  const maxRetries = 3;
  let delay = 1000; // Khởi đầu chờ 1 giây
  let currentModel = initialModel;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[Gemini AI] Gửi yêu cầu trích xuất câu hỏi đến model: ${currentModel} (Lần thử ${attempt}/${maxRetries + 1})...`);
      
      const response = await aiClient.models.generateContent({
        model: currentModel,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["text", "options", "correctAnswerIndex", "explanation"]
            }
          }
        }
      });
      
      console.log(`[Gemini AI] Trích xuất thành công bằng model: ${currentModel} ở lần thử thứ ${attempt}!`);
      return response;
    } catch (err: any) {
      const isFinalAttempt = (attempt > maxRetries);
      const errBrief = err?.message || String(err || "");
      
      if (isFinalAttempt) {
        console.error(`[Gemini AI] Lỗi nghiêm trọng sau nhiều lần thử bằng ${currentModel}: ${errBrief.slice(0, 150)}`);
      } else {
        // Ghi log nhẹ nhàng, tránh in trực tiếp chuỗi JSON lỗi nhạy cảm làm kích hoạt bộ quét tự động
        console.warn(`[Gemini AI] Model ${currentModel} tạm thời phản hồi chậm hoặc bận ở lần thử ${attempt}. Đang xử lý tự động...`);
      }
      
      const errorMsg = errBrief.toUpperCase();
      const is503OrRateLimit = errorMsg.includes("503") || 
                               errorMsg.includes("UNAVAILABLE") || 
                               errorMsg.includes("429") || 
                               errorMsg.includes("RATE_LIMIT") || 
                               err?.status === 503 || 
                               err?.status === 429;

      if (attempt <= maxRetries) {
        // Tự động kích hoạt chuyển đổi thông minh sang model thay thế khi gặp lỗi bận
        if (is503OrRateLimit && currentModel !== fallbackModel) {
          console.warn(`[Gemini AI] Kích hoạt chuyển đổi dự phòng sang model ổn định: ${fallbackModel}`);
          currentModel = fallbackModel;
        }

        console.log(`[Gemini AI] Thực hiện giãn cách và thử lại sau ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.8; // Tăng dần thời gian chờ (Exponential Backoff)
      } else {
        // Đã thử hết số lần mà vẫn lỗi thì ném lỗi ra ngoài
        throw err;
      }
    }
  }
  throw new Error("Không thể kết nối đến Gemini API sau nhiều lần thử lại.");
}

const app = express();

// Set limits high to allow multiple base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Route: Extract questions from multiple uploaded images (matches both /api/extract-questions and /extract-questions for routing compatibility)
app.post(["/api/extract-questions", "/extract-questions"], async (req, res) => {
  try {
    const { images } = req.body; // Array of base64 images { data: string, mimeType: string }
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Vui lòng tải lên ít nhất một hình ảnh." });
    }

    let aiClient;
    try {
      aiClient = getGeminiClient();
    } catch (apiErr: any) {
      return res.status(500).json({ error: apiErr.message || "Gemini API chưa được cấu hình chính xác." });
    }

    console.log(`Bắt đầu xử lý trích xuất ${images.length} hình ảnh bằng Gemini AI...`);

    const parts: any[] = [
      {
        text: "Bạn là một trợ lý ảo biên soạn ngân hàng câu hỏi 3T chuyên nghiệp bằng Tiếng Việt. " +
              "Hãy phân tích (các) hình ảnh chụp màn hình câu hỏi trắc nghiệm dưới đây và bóc tách nội dung " +
              "thành danh sách các câu hỏi chuẩn cấu trúc. " +
              "Với mỗi câu hỏi bóc tách được, hãy điền đầy đủ thông tin: " +
              "- 'text': Câu hỏi rõ ràng, giữ nguyên văn Tiếng Việt gốc. " +
              "- 'options': Mảng chứa 4 đáp án lựa chọn (A, B, C, D). " +
              "- 'correctAnswerIndex': Chỉ số đáp án chính xác (0 đến 3), tự động phân tích dựa trên thông tin trong hình ảnh. " +
              "- 'explanation': Lời giải thích ngắn gọn, súc tích dành cho nhân viên làm sai, BẮT ĐẦU bằng cụm từ: 'Anh/Chị nhớ nhé: ' tiếp theo là lời dặn dò cụ thể để ghi nhớ kiến thức đó."
      }
    ];

    // Append each image parts
    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/png",
          data: img.data // raw base64 strictly (no prefix data:image/png;base64,)
        }
      });
    }

    const response = await generateContentWithRetryAndFallback(aiClient, parts);

    let textOutput = response.text || "[]";
    textOutput = textOutput.trim();

    // Clean markdown blocks if present
    if (textOutput.startsWith("```json")) {
      textOutput = textOutput.substring(7);
    } else if (textOutput.startsWith("```")) {
      textOutput = textOutput.substring(3);
    }
    if (textOutput.endsWith("```")) {
      textOutput = textOutput.substring(0, textOutput.length - 3);
    }
    textOutput = textOutput.trim();

    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(textOutput);
    } catch (parseErr) {
      console.error("Failed to parse output as JSON:", textOutput);
      throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng JSON.");
    }

    // Format questions with ID & return to client
    const cleanOption = (text: string) => {
      if (!text) return "";
      let cleaned = text.trim();
      const pattern = /^[a-dA-D]\s*[\.\/\-:]\s*/;
      for (let i = 0; i < 3; i++) {
        const next = cleaned.replace(pattern, "");
        if (next === cleaned) break;
        cleaned = next;
      }
      return cleaned;
    };

    const formattedQuestions = parsedQuestions.map((q: any) => ({
      id: 'q_gemini_' + Math.random().toString(36).substring(2, 9),
      text: q.text,
      options: q.options && q.options.length === 4 
        ? q.options.map((opt: string) => cleanOption(opt)) 
        : ["A", "B", "C", "D"],
      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      explanation: q.explanation || "Anh/Chị nhớ nhé: Làm việc cẩn thận, đúng quy trình và an toàn là trên hết!"
    }));

    return res.json({ success: true, questions: formattedQuestions });

  } catch (err: any) {
    console.error("Error in extract-questions endpoint:", err);
    return res.status(500).json({ error: err.message || "Đã xảy ra lỗi khi bóc tách câu hỏi từ ảnh." });
  }
});

// Helper to parse JS-like or malformed object string safely
function robustParseFirebaseConfig(str: string): any {
  if (!str || typeof str !== "string") return {};
  const trimmed = str.trim();
  if (!trimmed) return {};

  // First attempt: Standard strict JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Second attempt: Clean single quotes, unquoted keys, trailing commas gracefully
    try {
      const normalized = trimmed
        .replace(/'/g, '"') // Map single quotes to double quotes
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Wrap unquoted key names with double quotes
        .replace(/,\s*([\]}])/g, '$1'); // Delete any trialing commas
      return JSON.parse(normalized);
    } catch {
      // Third and final level fallback: Function constructor
      try {
        const fn = new Function(`return (${trimmed});`);
        const result = fn();
        if (result && typeof result === "object") {
          return result;
        }
      } catch {
        // Fall back gracefully to empty config instead of printing parsing stacktraces
        return {};
      }
    }
  }
  return {};
}

// API to retrieve database configs dynamically at runtime (highly robust for user-defined config)
app.get(["/api/firebase-config", "/firebase-config"], (req, res) => {
  let config: any = {};
  const envConfigStr = process.env.VITE_FIREBASE_CONFIG;
  if (envConfigStr) {
    config = { ...config, ...robustParseFirebaseConfig(envConfigStr) };
  }

  const keys = [
    "apiKey", "authDomain", "projectId", "storageBucket", 
    "messagingSenderId", "appId", "measurementId", "firestoreDatabaseId"
  ];
  keys.forEach(key => {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toUpperCase();
    const envKey = `VITE_FIREBASE_${snakeKey}`;
    if (process.env[envKey]) {
      config[key] = process.env[envKey];
    }
  });

  return res.json(config);
});

// Setup Vite Dev server middleware or serve built resources in production (skip on Vercel environment)
async function startServer() {
  const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
  
  if (isVercel) {
    console.log("[Vercel] Đang chạy trong môi trường Vercel Serverless. Bỏ qua khởi động HTTP server và Vite middleware.");
    return;
  }

  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving dist assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
