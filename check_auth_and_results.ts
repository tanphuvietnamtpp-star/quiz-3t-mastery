import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import * as fs from 'fs';

const rawConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

if (process.env.VITE_FIREBASE_CONFIG) {
  try {
    const envObj = JSON.parse(process.env.VITE_FIREBASE_CONFIG);
    Object.assign(rawConfig, envObj);
  } catch {}
}

async function run() {
  console.log("Firebase config loaded. Project ID:", rawConfig.projectId);
  const app = initializeApp(rawConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log("Attempting to sign in anonymously...");
  try {
    const userCredential = await signInAnonymously(auth);
    console.log("Signed in anonymously! UID:", userCredential.user.uid);
  } catch (err: any) {
    console.error("Sign in anonymously failed:", err.message);
  }

  console.log("Fetching quiz_results...");
  const snapshot = await getDocs(collection(db, 'quiz_results'));
  console.log(`Fetched ${snapshot.size} quiz documents!`);
  
  const results: any[] = [];
  snapshot.forEach(doc => {
    results.push({ id: doc.id, ...doc.data() });
  });
  
  fs.writeFileSync('./fetched_results.json', JSON.stringify(results, null, 2));
  console.log("Saved results to fetched_results.json");
}

run().catch(console.error);
