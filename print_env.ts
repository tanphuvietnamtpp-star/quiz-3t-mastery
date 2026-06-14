console.log("VITE_FIREBASE_CONFIG in env?", !!process.env.VITE_FIREBASE_CONFIG);
console.log("GEMINI_API_KEY in env?", !!process.env.GEMINI_API_KEY);
console.log("Keys in process.env starting with VITE_:", Object.keys(process.env).filter(k => k.startsWith("VITE_")));
