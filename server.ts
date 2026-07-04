import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared Gemini client initialization - as instructed by gemini-api skill
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits high to allow multiple base64 image uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Extract questions from multiple uploaded images
  app.post("/api/extract-questions", async (req, res) => {
    try {
      const { images } = req.body; // Array of base64 images { data: string, mimeType: string }
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "Vui lòng tải lên ít nhất một hình ảnh." });
      }

      if (!ai) {
        return res.status(500).json({ 
          error: "Gemini API chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY trong cấu hình Secrets." 
        });
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

      let response = null;
      let lastError: any = null;
      // List of robust models in order of priority: 
      // 1. gemini-3.5-flash (Smartest/best text understanding)
      // 2. gemini-3.1-flash-lite (Extremely fast, lightweight, lowest utilization, highly available)
      // 3. gemini-flash-latest (Very stable, widely available legacy fallback)
      const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`[Gemini AI] Đang gọi model ${modelName}...`);
          response = await ai.models.generateContent({
            model: modelName,
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
          if (response && response.text) {
            console.log(`[Gemini AI] Gọi thành công bằng model: ${modelName}`);
            break; // Exit the loop on success
          }
        } catch (err: any) {
          lastError = err;
          console.error(`[Gemini AI] Lỗi với model ${modelName}:`, err.message || err);
          // If a model is overloaded (503), immediately try the next model cluster without delay!
        }
      }

      // If all three models failed on their first try, let's do a fast second try with gemini-3.1-flash-lite (as it is the most available one)
      if (!response || !response.text) {
        console.log(`[Gemini AI] Tất cả các model chính đều bận. Thử lại lần cuối bằng gemini-3.1-flash-lite sau 1 giây...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
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
          if (response && response.text) {
            console.log(`[Gemini AI] Gọi thành công trong lượt thử lại bằng: gemini-3.1-flash-lite`);
          }
        } catch (err: any) {
          lastError = err;
          console.error(`[Gemini AI] Lượt thử lại cuối bằng gemini-3.1-flash-lite thất bại:`, err.message || err);
        }
      }

      if (!response || !response.text) {
        console.error("[Gemini AI] Tất cả các models đều thất bại.");
        throw lastError || new Error("Không thể kết nối đến máy chủ Gemini AI sau nhiều lần thử.");
      }

      const textOutput = response.text || "[]";
      let parsedQuestions = [];
      try {
        parsedQuestions = JSON.parse(textOutput.trim());
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
  app.get("/api/firebase-config", (req, res) => {
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

  // Setup Vite Dev server middleware or serve built resources in production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
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
