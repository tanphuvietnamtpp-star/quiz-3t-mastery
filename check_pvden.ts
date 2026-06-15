import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

async function run() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log("Fetching quiz results for 'PHẠM VĂN ĐEN'...");
  const q = query(
    collection(db, 'quiz_results'),
    where('userName', '==', 'PHẠM VĂN ĐEN')
  );
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} quiz results.`);
  
  const results: any[] = [];
  snap.forEach(doc => {
    results.push({ id: doc.id, ...doc.data() });
  });
  
  // Sort chronological
  results.sort((a, b) => a.timestamp - b.timestamp);
  
  results.forEach((res, idx) => {
    console.log(`[#${idx + 1}] Date: ${res.date} | Score: ${res.score}/30 | Duration: ${res.duration}s | Timestamp: ${res.timestamp}`);
  });
}

run().catch(console.error);
