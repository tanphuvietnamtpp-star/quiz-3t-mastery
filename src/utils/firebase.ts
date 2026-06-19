import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

let firebaseApp: any = null;
let db: any = null;
let parsedConfig: any = null;

const rawConf = (import.meta as any).env?.VITE_FIREBASE_CONF || (import.meta as any).env?.VITE_FIREBASE_CONFIG || "";

let trimmed = "";

if (rawConf) {
  try {
    trimmed = rawConf.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      parsedConfig = JSON.parse(trimmed);
    } else {
      // Attempt to clean up single quotes and non-quoted JSON keys
      const formatted = trimmed
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ':"$1"')
        .replace(/,\s*([}\]])/g, '$1');
      parsedConfig = JSON.parse(formatted);
    }
    console.log("Firebase config parsed successfully from environment secrets.");
  } catch (err) {
    console.warn("Failed to parse VITE_FIREBASE_CONF automatically. Parsing raw fallback.", err);
    // Try to extract known fields using regex
    try {
      const apiKeyMatch = trimmed.match(/apiKey:\s*["']([^"']+)["']/);
      const authDomainMatch = trimmed.match(/authDomain:\s*["']([^"']+)["']/);
      const projectIdMatch = trimmed.match(/projectId:\s*["']([^"']+)["']/);
      const storageBucketMatch = trimmed.match(/storageBucket:\s*["']([^"']+)["']/);
      const messagingSenderIdMatch = trimmed.match(/messagingSenderId:\s*["']([^"']+)["']/);
      const appIdMatch = trimmed.match(/appId:\s*["']([^"']+)["']/);

      parsedConfig = {
        apiKey: apiKeyMatch ? apiKeyMatch[1] : "",
        authDomain: authDomainMatch ? authDomainMatch[1] : "tanphu-4m1e1i.firebaseapp.com",
        projectId: projectIdMatch ? projectIdMatch[1] : "tanphu-4m1e1i",
        storageBucket: storageBucketMatch ? storageBucketMatch[1] : "tanphu-4m1e1i.appspot.com",
        messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : "",
        appId: appIdMatch ? appIdMatch[1] : ""
      };
    } catch (e) {
      console.error("Regex parsing of Firebase config failed:", e);
    }
  }
}

// Fallback to defaults corresponding to 'tanphu-4m1e1i'
if (!parsedConfig) {
  parsedConfig = {
    apiKey: "AIzaSyDummyKeyForViteDevServerOnly",
    authDomain: "tanphu-4m1e1i.firebaseapp.com",
    projectId: "tanphu-4m1e1i",
    storageBucket: "tanphu-4m1e1i.appspot.com",
    messagingSenderId: "10384729102",
    appId: "1:10384729102:web:cbd594c4fcf14eb7b8ce7f"
  };
}

try {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(parsedConfig);
  } else {
    firebaseApp = getApp();
  }
  db = getFirestore(firebaseApp);
} catch (error) {
  console.error("Firebase/Firestore client initialization failed:", error);
}

export { firebaseApp, db, parsedConfig as config };
