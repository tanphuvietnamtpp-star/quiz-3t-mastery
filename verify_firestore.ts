import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';

// Load base config
const rawConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

function getFinalConfig() {
  const config: any = { ...rawConfig };
  if (process.env.VITE_FIREBASE_CONFIG) {
    try {
      const envObj = JSON.parse(process.env.VITE_FIREBASE_CONFIG);
      Object.assign(config, envObj);
      console.log("Firebase config loaded successfully from process.env.VITE_FIREBASE_CONFIG!");
    } catch (e: any) {
      console.error("Error parsing VITE_FIREBASE_CONFIG environment variable:", e.message);
    }
  }
  return config;
}

// Convert DD/MM/YY or DD/MM/YYYY to YYYY-MM-DD
function normalizeDateString(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

async function run() {
  const finalConfig = getFinalConfig();
  const app = initializeApp(finalConfig);
  const db = getFirestore(app);
  
  console.log("Fetching level rules from Firestore to get accurate thăng cấp criteria...");
  const rulesDoc = await getDoc(doc(db, 'system_configs', 'level_rules')).catch(() => null);
  let activeRules: any = null;
  if (rulesDoc && rulesDoc.exists()) {
    activeRules = rulesDoc.data();
    console.log("Fetched live level rules from Firestore!");
  } else {
    // Standard level rules config
    activeRules = {
      levels: [
        { level: 1, name: "Cấp 1: Tập Sự", promotion: "Đạt 30/30 liên tục 10 lượt", demotion: "Không" },
        { level: 2, name: "Cấp 2: Sát Thủ", promotion: "Đạt 30/30 liên tục 10 lượt", demotion: "Có dưới 20 điểm 2 lượt" },
        { level: 3, name: "Cấp 3: Chiến Binh", promotion: "Đạt 30/30 liên tục 10 lượt", demotion: "Có dưới 26 điểm 2 lượt" },
        { level: 4, name: "Cấp 4: Tướng Quân", promotion: "Đạt 30/30 liên tục 10 lượt", demotion: "Có dưới 27 điểm 2 lượt" },
        { level: 5, name: "Cấp 5: Huyền Thoại", promotion: "Thần cấp tối thượng", demotion: "Có dưới 28 điểm 2 lượt" }
      ]
    };
    console.log("Using default level rules criteria.");
  }
  
  console.log("Fetching quiz_results from Firestore...");
  const snapshot = await getDocs(collection(db, 'quiz_results'));
  console.log(`Successfully fetched ${snapshot.size} quiz documents!`);
  
  const results: any[] = [];
  snapshot.forEach(doc => {
    results.push({ id: doc.id, ...doc.data() });
  });
  
  // Group results by normalized user name
  const grouped: Record<string, any[]> = {};
  results.forEach(res => {
    const rawName = res.userName || 'ANONYMOUS';
    const normName = rawName.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!grouped[normName]) {
      grouped[normName] = [];
    }
    grouped[normName].push(res);
  });

  const parseRequiredConsecutive = (lvlIdx: number, defaultVal: number = 10): number => {
    const promotionText = activeRules.levels[lvlIdx]?.promotion;
    if (!promotionText) return defaultVal;
    const match = promotionText.match(/liên\s+tục\s+(\d+)\s+lượt/i) || 
                  promotionText.match(/(\d+)\s+lượt\s+liên\s+tục/i) || 
                  promotionText.match(/(\d+)\s+lượt/i);
    return match ? parseInt(match[1], 10) : defaultVal;
  };

  const parseDemotionThreshold = (lvlIdx: number, defaultVal: number): number => {
    const demotionText = activeRules.levels[lvlIdx]?.demotion;
    if (!demotionText) return defaultVal;
    const match = demotionText.match(/dưới\s+(\d+)\s+điểm/i) || 
                  demotionText.match(/dưới\s+(\d+)/i) || 
                  demotionText.match(/<\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : defaultVal;
  };
  
  console.log(`\n=================== DETAILED ANALYSIS OF ${Object.keys(grouped).length} EMPLOYEES ===================`);
  
  Object.keys(grouped).sort().forEach(userKey => {
    const userResultsList = grouped[userKey];
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`EMPLOYEE: ${userKey} (${userResultsList.length} total attempts in database)`);
    
    // Sort chronological (earliest first)
    const chronological = [...userResultsList].sort((a, b) => a.timestamp - b.timestamp);
    
    let currentLevel = 1;
    let consecutiveMax = 0;
    let consecutiveLow = 0;
    
    interface LevelChange {
      fromLevel: number;
      toLevel: number;
      triggerAttemptIndex: number;
      triggerDate: string;
      triggerTime: string;
      triggerScore: number;
      consecutiveStatus: string;
    }
    
    const levelChanges: LevelChange[] = [];
    
    chronological.forEach((res, idx) => {
      const score = res.score;
      const prevLevel = currentLevel;
      const formattedTime = new Date(res.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = res.date || new Date(res.timestamp).toLocaleDateString('vi-VN');
      
      let debugStr = `Attempt #${idx + 1} on ${dateStr} ${formattedTime} | Score: ${score}/30 | Lvl before: ${currentLevel}`;
      
      if (currentLevel === 1) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        
        const req = parseRequiredConsecutive(0, 10);
        if (consecutiveMax >= req) {
          currentLevel = 2;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 2) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        
        const demotionMin = parseDemotionThreshold(1, 20);
        if (score < demotionMin) {
          consecutiveLow++;
        }
        
        const req = parseRequiredConsecutive(1, 10);
        if (consecutiveMax >= req) {
          currentLevel = 3;
          consecutiveMax = 0;
          consecutiveLow = 0;
        } else if (consecutiveLow >= 2) {
          currentLevel = 1;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 3) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        
        const demotionMin = parseDemotionThreshold(2, 26);
        if (score < demotionMin) {
          consecutiveLow++;
        }
        
        const req = parseRequiredConsecutive(2, 10);
        if (consecutiveMax >= req) {
          currentLevel = 4;
          consecutiveMax = 0;
          consecutiveLow = 0;
        } else if (consecutiveLow >= 2) {
          currentLevel = 2;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 4) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        
        const demotionMin = parseDemotionThreshold(3, 27);
        if (score < demotionMin) {
          consecutiveLow++;
        }
        
        const req = parseRequiredConsecutive(3, 10);
        if (consecutiveMax >= req) {
          currentLevel = 5;
          consecutiveMax = 0;
          consecutiveLow = 0;
        } else if (consecutiveLow >= 2) {
          currentLevel = 3;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 5) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        
        const demotionMin = parseDemotionThreshold(4, 28);
        if (score < demotionMin) {
          consecutiveLow++;
        }
        
        if (consecutiveLow >= 2) {
          currentLevel = 4;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      }
      
      if (currentLevel !== prevLevel) {
        levelChanges.push({
          fromLevel: prevLevel,
          toLevel: currentLevel,
          triggerAttemptIndex: idx + 1,
          triggerDate: dateStr,
          triggerTime: formattedTime,
          triggerScore: score,
          consecutiveStatus: currentLevel > prevLevel ? "Thành tích chuỗi 30/30 liên tục" : "Điểm thấp dưới ngưỡng phạt"
        });
      }
    });
    
    console.log(`Current level calculated: ${currentLevel}`);
    console.log("Level up/down events:");
    if (levelChanges.length === 0) {
      console.log("  No level changes! (Remained at Level 1)");
    } else {
      levelChanges.forEach(change => {
        const arrow = change.toLevel > change.fromLevel ? "🔺 UP" : "🔻 DOWN";
        console.log(`  * ${arrow} from Level ${change.fromLevel} -> Level ${change.toLevel} at attempt #${change.triggerAttemptIndex} (Date: ${change.triggerDate} ${change.triggerTime}, Score: ${change.triggerScore}/30) [Trigger: ${change.consecutiveStatus}]`);
      });
    }
  });
}

run().catch(console.error);
