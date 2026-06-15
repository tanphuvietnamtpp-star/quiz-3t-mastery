import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc,
  addDoc, 
  query, 
  where,
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { User, Question, QuizResult, BRANCHES, DEPARTMENTS, CompanyMapping, MotivationalSloganBand, LevelRulesConfig, LevelRuleItem, ChatTopic, ChatMessage } from './types';
import { INITIAL_QUESTIONS } from './data/mockQuestions';
import rawFirebaseConfig from './firebase-applet-config.json';

let firebaseConfig = { ...rawFirebaseConfig };

const importMetaEnv = (import.meta as any).env || {};

// Try loading from environment variables set in Secrets / Configs safely
try {
  const envConfigStr = importMetaEnv.VITE_FIREBASE_CONFIG;
  if (envConfigStr && typeof envConfigStr === 'string' && envConfigStr.trim()) {
    let parsedConfig: any = null;
    const trimmed = envConfigStr.trim();
    try {
      parsedConfig = JSON.parse(trimmed);
    } catch {
      try {
        const normalized = trimmed
          .replace(/'/g, '"')
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
          .replace(/,\s*([\]}])/g, '$1');
        parsedConfig = JSON.parse(normalized);
      } catch {
        // Fallback silently without throwing parser warnings or logging stack traces
      }
    }
    if (parsedConfig && typeof parsedConfig === 'object') {
      firebaseConfig = { ...firebaseConfig, ...parsedConfig };
    }
  }
} catch (e) {
  // Silent fallback
}

// Also try loading individual keys
if (importMetaEnv.VITE_FIREBASE_API_KEY) {
  firebaseConfig.apiKey = importMetaEnv.VITE_FIREBASE_API_KEY;
}
if (importMetaEnv.VITE_FIREBASE_AUTH_DOMAIN) {
  firebaseConfig.authDomain = importMetaEnv.VITE_FIREBASE_AUTH_DOMAIN;
}
if (importMetaEnv.VITE_FIREBASE_PROJECT_ID) {
  firebaseConfig.projectId = importMetaEnv.VITE_FIREBASE_PROJECT_ID;
}
if (importMetaEnv.VITE_FIREBASE_STORAGE_BUCKET) {
  firebaseConfig.storageBucket = importMetaEnv.VITE_FIREBASE_STORAGE_BUCKET;
}
if (importMetaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID) {
  firebaseConfig.messagingSenderId = importMetaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID;
}
if (importMetaEnv.VITE_FIREBASE_APP_ID) {
  firebaseConfig.appId = importMetaEnv.VITE_FIREBASE_APP_ID;
}

// Simple helper to dynamically fetch and initialize Firebase
let db: any = null;
let auth: any = null;
let isFirebaseConfigured = false;
let initPromise: Promise<void> | null = null;

// Default INITIAL_COMPANY_MAPPINGS
export const INITIAL_COMPANY_MAPPINGS: CompanyMapping[] = [
  {
    id: 'tanphuvietnam',
    name: 'TÂN PHÚ VIỆT NAM',
    branches: [
      {
        id: 'vpct',
        name: 'Văn Phòng Công Ty (TPP-CTY)',
        departments: [
          { id: 'vp_btgd', name: 'Ban Tổng Giám Đốc' },
          { id: 'vp_kbl', name: 'Kênh Bán lẻ' },
          { id: 'vp_kda', name: 'Kênh Dự án' },
          { id: 'vp_kgt', name: 'Kênh GT' },
          { id: 'vp_kmt', name: 'Kênh MT' },
          { id: 'vp_kqliccu', name: 'Khối quản lý chuỗi cung ứng' },
          { id: 'vp_phcns', name: 'Phòng Hành chính nhân sự' },
          { id: 'vp_pkhvdb', name: 'Phòng Kế hoạch và dự báo' },
          { id: 'vp_pkdcn', name: 'Phòng kinh doanh công nghiệp' },
          { id: 'vp_pkdqt', name: 'Phòng Kinh doanh quốc tế' },
          { id: 'vp_pkdqt2', name: 'Phòng Kinh doanh quốc tế 2' },
          { id: 'vp_pkdqtbbm', name: 'Phòng Kinh doanh quốc tế BBM' },
          { id: 'vp_pmkt', name: 'Phòng Marketing - Truyền thông' },
          { id: 'vp_pmh', name: 'Phòng Mua hàng' },
          { id: 'vp_pncptsp', name: 'Phòng Nghiên cứu và phát triển sản phẩm' },
          { id: 'vp_ppp', name: 'Phòng phân phối' },
          { id: 'vp_pqcl', name: 'Phòng Quản Lý Chất Lượng' },
          { id: 'vp_ptckt', name: 'Phòng Tài chính Kế toán' },
          { id: 'vp_ptkkt', name: 'Phòng Thiết kế kỹ thuật' },
          { id: 'vp_btrl', name: 'Ban trợ lý + KSTC' }
        ]
      },
      {
        id: 'cnbn',
        name: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        departments: [
          { id: 'bn_bgd', name: 'Ban Giám đốc' },
          { id: 'bn_bqd', name: 'Ban Quản đốc' },
          { id: 'bn_dcn', name: 'Dây chuyền nước' },
          { id: 'bn_phcns', name: 'Phòng Hành chính nhân sự' },
          { id: 'bn_pkhsx', name: 'Phòng Kế hoạch sản xuất' },
          { id: 'bn_pkv', name: 'Phòng Kho vận' },
          { id: 'bn_pkt', name: 'Phòng Kỹ Thuật' },
          { id: 'bn_pqcl', name: 'Phòng Quản Lý Chất Lượng' },
          { id: 'bn_ptckt', name: 'Phòng Tài chính Kế toán' },
          { id: 'bn_sx', name: 'Sản xuất' },
          { id: 'bn_tbx', name: 'Tổ bốc xếp' },
          { id: 'bn_tlxt', name: 'Tổ lái xe tải' },
          { id: 'bn_txt', name: 'Tổ Xay trộn' },
          { id: 'bn_xgmp', name: 'Xưởng GMP' },
          { id: 'bn_xpet', name: 'Xưởng Pet' }
        ]
      },
      {
        id: 'cnla',
        name: 'Chi Nhánh Long An (TPP-LAN)',
        departments: [
          { id: 'la_bgd', name: 'Ban Giám đốc' },
          { id: 'la_bqd', name: 'Ban Quản đốc' },
          { id: 'la_px1', name: 'Phân Xưởng 1' },
          { id: 'la_px2', name: 'Phân xưởng 2' },
          { id: 'la_phcns', name: 'Phòng Hành chính nhân sự' },
          { id: 'la_pkhvt', name: 'Phòng Kế hoạch vật tư' },
          { id: 'la_pkv', name: 'Phòng Kho vận' },
          { id: 'la_pkt', name: 'Phòng Kỹ Thuật' },
          { id: 'la_pqcl', name: 'Phòng Quản Lý Chất Lượng' },
          { id: 'la_ptckt', name: 'Phòng Tài chính Kế toán' },
          { id: 'la_tht', name: 'Tổ hoàn tất' },
          { id: 'la_txt', name: 'Tổ Xay trộn' },
          { id: 'la_xck', name: 'Xưởng Cơ khí' }
        ]
      },
      {
        id: 'nm314',
        name: 'Nhà máy 314 (TPP-314)',
        departments: [
          { id: 'nm_pxsx', name: 'Phân xưởng sản xuất' },
          { id: 'nm_ptckt', name: 'Phòng Tài chính Kế toán' }
        ]
      }
    ]
  }
];

// Seed default Admin Lê Nhật Trường which can automatically log in or register
const defaultAdmin: User = {
  id: 'admin_lenhattruong',
  name: 'Lê Nhật Trường',
  phone: '0907767304',
  password: '111222',
  role: 'admin',
  company: 'TÂN PHÚ VIỆT NAM',
  department: 'Phòng Quản Lý Chất Lượng (TPP-CTY)',
  branch: 'Văn Phòng Công Ty (TPP-CTY)',
  status: 'approved',
  createdAt: '2026-06-06T08:30:36Z',
  employeeId: '2018.00281'
};

const forceSeedSupremeAdmin = async () => {
  if (isFirebaseConfigured && db) {
    try {
      const adminRef = doc(db, 'user_profiles', 'admin_lenhattruong');
      
      const adminData = {
        id: 'admin_lenhattruong',
        name: 'Lê Nhật Trường',
        phone: '0907767304',
        password: '111222',
        role: 'admin',
        status: 'approved',
        company: 'TÂN PHÚ VIỆT NAM',
        department: 'Phòng Quản Lý Chất Lượng (TPP-CTY)',
        branch: 'Văn Phòng Công Ty (TPP-CTY)',
        employeeId: '2018.00281',
        createdAt: '2026-06-06T08:30:36Z'
      };

      // Unconditionally force write/merge on start to completely repair and prevent any database discrepancies or wrong departments
      await setDoc(adminRef, adminData, { merge: true });
      console.log("[CRITICAL FIXED - NO REPEAT] Supreme Admin Lê Nhật Trường profile has been forcefully synchronized and corrected in Firestore!");

      // Check if default executive accounts have been seeded historically
      const seedStatusRef = doc(db, 'user_profiles', 'system_seed_status');
      const seedStatusSnap = await getDocFromServer(seedStatusRef).catch(() => null);
      const isAlreadySeeded = seedStatusSnap && seedStatusSnap.exists() && seedStatusSnap.data()?.executives_seeded === true;

      if (!isAlreadySeeded) {
        // Seed 5 Special Executive Accounts
        const execUsers = [
          {
            id: 'exec_chutich',
            name: 'Chủ Tịch HĐQT',
            phone: '0901234561',
            password: '123456',
            role: 'executive' as const,
            status: 'approved' as const,
            company: 'TÂN PHÚ VIỆT NAM',
            department: 'Ban Tổng Giám Đốc',
            branch: 'Văn Phòng Công Ty (TPP-CTY)',
            employeeId: 'EXEC_CHUTICH_01'
          },
          {
            id: 'exec_tonggiamdoc',
            name: 'Tổng Giám Đốc',
            phone: '0901234562',
            password: '123456',
            role: 'executive' as const,
            status: 'approved' as const,
            company: 'TÂN PHÚ VIỆT NAM',
            department: 'Ban Tổng Giám Đốc',
            branch: 'Văn Phòng Công Ty (TPP-CTY)',
            employeeId: 'EXEC_TGD_02'
          },
          {
            id: 'exec_photonggiamdoc1',
            name: 'Phó Tổng Giám Đốc 1',
            phone: '0901234563',
            password: '123456',
            role: 'executive' as const,
            status: 'approved' as const,
            company: 'TÂN PHÚ VIỆT NAM',
            department: 'Ban Tổng Giám Đốc',
            branch: 'Văn Phòng Công Ty (TPP-CTY)',
            employeeId: 'EXEC_PTGD_03'
          },
          {
            id: 'exec_photonggiamdoc2',
            name: 'Phó Tổng Giám Đốc 2',
            phone: '0901234564',
            password: '123456',
            role: 'executive' as const,
            status: 'approved' as const,
            company: 'TÂN PHÚ VIỆT NAM',
            department: 'Ban Tổng Giám Đốc',
            branch: 'Văn Phòng Công Ty (TPP-CTY)',
            employeeId: 'EXEC_PTGD_04'
          },
          {
            id: 'exec_photonggiamdoc3',
            name: 'Phó Tổng Giám Đốc 3',
            phone: '0901234565',
            password: '123456',
            role: 'executive' as const,
            status: 'approved' as const,
            company: 'TÂN PHÚ VIỆT NAM',
            department: 'Ban Tổng Giám Đốc',
            branch: 'Văn Phòng Công Ty (TPP-CTY)',
            employeeId: 'EXEC_PTGD_05'
          }
        ];

        for (const exec of execUsers) {
          const ref = doc(db, 'user_profiles', exec.id);
          const snap = await getDocFromServer(ref).catch(() => null);
          if (!snap || !snap.exists()) {
            const data = {
              ...exec,
              createdAt: new Date().toISOString()
            };
            await setDoc(ref, data);
            console.log(`Seeded executive account: ${exec.name}`);
          } else {
            console.log(`Executive account ${exec.name} already exists, skipping seed.`);
          }
        }

        // Write status to secure that they will never be seeded again if deleted
        await setDoc(seedStatusRef, { executives_seeded: true });
        console.log("Successfully marked default executive accounts as permanently seeded on Firestore.");
      } else {
        console.log("Executive accounts have already been seeded previously. Skipping re-seeding to respect custom deletions.");
      }
    } catch (seedErr) {
      console.error("Emergency admin seed to cloud failed:", seedErr);
    }
  }
};

const forceSeedCompanyMappings = async () => {
  if (isFirebaseConfigured && db) {
    try {
      const configRef = doc(db, 'config', 'company_mappings');
      const snap = await getDocFromServer(configRef).catch(() => null);
      
      if (!snap || !snap.exists() || !snap.data()?.mappings || snap.data()?.mappings?.length === 0) {
        // Only write INITIAL_COMPANY_MAPPINGS if the document does not exist, is empty or failed to load
        await setDoc(configRef, { mappings: INITIAL_COMPANY_MAPPINGS });
        console.log("[SUCCESS] Khởi tạo cấu trúc Công ty mặc định lên Cloud Firestore (Lần đầu tiên).");
      } else {
        console.log("[INFO] Cấu trúc Công ty đã tồn tại trên Firestore, kiểm tra và dọn dẹp các công ty cũ (nếu có).");
        const currentMappings = snap.data()?.mappings as CompanyMapping[];
        if (currentMappings && Array.isArray(currentMappings)) {
          const filtered = currentMappings.filter(co => {
            const upperName = (co.name || '').trim().toUpperCase();
            return upperName !== 'BAO BÌ TÂN PHÚ' && upperName !== 'NHỰA TIÊN PHONG TÂN PHÚ' && co.id !== 'baobitanphu' && co.id !== 'nhuatienphong';
          });
          if (filtered.length !== currentMappings.length) {
            await setDoc(configRef, { mappings: filtered });
            setLocalData('3t_company_mappings', filtered);
            console.log("[SUCCESS] Đã dọn dẹp và xóa vĩnh viễn BAO BÌ TÂN PHÚ và NHỰA TIÊN PHONG TÂN PHÚ ra khỏi Firestore!");
          }
        }
      }
    } catch (err) {
      console.error("Automatic seeding of company mappings failed:", err);
    }
  }
};

export const initializeDatabase = async (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let app: any = null;
    let targetDbId: string | undefined = undefined;

    try {
      const response = await fetch('/api/firebase-config');
      if (response.ok) {
        const serverConfig = await response.json();
        if (serverConfig && serverConfig.apiKey) {
          console.log("Dynamically initialized real Firebase from server secrets successfully.");
          app = getApps().length === 0 ? initializeApp(serverConfig) : getApp();
          targetDbId = serverConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId;
          auth = getAuth(app);
          isFirebaseConfigured = true;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic Firebase config from Express server, using local fallback:", err);
    }

    if (!app) {
      // Fallback compile-time check
      const hasLocalConfig = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "");
      if (hasLocalConfig) {
        try {
          app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
          targetDbId = firebaseConfig.firestoreDatabaseId;
          auth = getAuth(app);
          isFirebaseConfigured = true;
          console.log("Initialized Firebase from local JSON file.");
        } catch (err) {
          console.error("Failed to initialize fallback compile-time Firebase:", err);
        }
      }
    }

    if (app && isFirebaseConfigured) {
      try {
        if (targetDbId && targetDbId !== '(default)') {
          const dbCandidate = getFirestore(app, targetDbId);
          // Quickly test if the custom named database exists with a strict 1500ms timeout
          try {
            const probePromise = getDocFromServer(doc(dbCandidate, 'user_profiles', 'probe_connection'));
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout connecting to custom named database')), 1500)
            );
            await Promise.race([probePromise, timeoutPromise]);
            db = dbCandidate;
            console.log("Verified database connection with custom database ID:", targetDbId);
          } catch (probeErr: any) {
            const errMsg = probeErr?.message || String(probeErr);
            console.warn(`Custom database '${targetDbId}' probe failed or timed out. Falling back to default database. Details:`, errMsg);
            db = getFirestore(app);
          }
        } else {
          db = getFirestore(app);
        }
        console.log("[SUCCESS] ĐÃ KẾT NỐI ĐÚNG VÀO DỰ ÁN: quiz-3t-mastery");
        await forceSeedSupremeAdmin();
        await forceSeedCompanyMappings();
      } catch (err) {
        console.error("Error setting up Firestore:", err);
      }
    }
    console.log('Firebase Status:', isFirebaseConfigured);
  })();

  return initPromise;
};

// Trigger immediate fire-and-forget async loading
initializeDatabase().catch(err => console.error("Immediate initialization error ignored:", err));

// Error handler required by SKILL.md
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure local storage has fallback data to make the app fully operational out-of-the-box in preview!
export const getQuotaStats = (): { reads: number; writes: number; deletes: number } => {
  const todayStr = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem('3t_firebase_quota');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === todayStr) {
        return { reads: parsed.reads || 0, writes: parsed.writes || 0, deletes: parsed.deletes || 0 };
      }
    } catch {}
  }
  return { reads: 0, writes: 0, deletes: 0 };
};

// Memory cache flag for questions to ensure we only load once from DB per app launch/refresh
let isQuestionsFetchedThisSession = false;

// Memory cache flag for quiz results to ensure we load from Firestore at least once per app launch/refresh
let isQuizResultsFetchedThisSession = false;
let isFullQuizResultsFetchedThisSession = false;

export const incrementQuota = (type: 'reads' | 'writes' | 'deletes', count: number = 1) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = getQuotaStats();
  stats[type] += count;
  localStorage.setItem('3t_firebase_quota', JSON.stringify({
    ...stats,
    date: todayStr
  }));
};

const getLocalData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Seed questions if not present
if (!localStorage.getItem('3t_questions')) {
  setLocalData('3t_questions', INITIAL_QUESTIONS);
}

let storedMappings = localStorage.getItem('3t_company_mappings');
if (!storedMappings || !storedMappings.includes('TPP-BNI')) {
  setLocalData('3t_company_mappings', INITIAL_COMPANY_MAPPINGS);
} else {
  try {
    const parsed = JSON.parse(storedMappings) as CompanyMapping[];
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(co => {
        const upperName = (co.name || '').trim().toUpperCase();
        return upperName !== 'BAO BÌ TÂN PHÚ' && upperName !== 'NHỰA TIÊN PHONG TÂN PHÚ' && co.id !== 'baobitanphu' && co.id !== 'nhuatienphong';
      });
      if (filtered.length !== parsed.length) {
        setLocalData('3t_company_mappings', filtered);
      }
    }
  } catch (e) {
    // Ignore error
  }
}

// Clear stale "3t_users" LocalStorage garbage instantly to ensure clean environment
try {
  localStorage.removeItem('3t_users');
} catch (e) {
  // Ignore
}

export const sanitizeUserList = (users: User[]): User[] => {
  const seenUniqueKeys = new Set<string>();
  const cleaned: User[] = [];

  // Filter out invalid/empty records first and normalize department names
  const validUsers = users.filter(u => u && u.name && u.phone).map(u => {
    let dept = u.department || '';
    if (dept.includes('Quản lí chất lượng')) {
      dept = dept.replace(/Quản lí chất lượng/g, 'Quản Lý Chất Lượng');
    }
    return {
      ...u,
      department: dept
    };
  });

  // 1. Gather and merge all possible 'Lê Nhật Trường' profiles (by name, phone, or id)
  let supremeAdminMerged: User | null = null;
  validUsers.forEach(u => {
    const nameTrim = u.name.trim();
    const phoneTrim = u.phone.trim();
    const isLNT = nameTrim.toUpperCase() === 'LÊ NHẬT TRƯỜNG' || phoneTrim === '0907767304' || u.id === 'admin_lenhattruong';
    if (isLNT) {
      if (!supremeAdminMerged) {
        supremeAdminMerged = {
          id: 'admin_lenhattruong',
          name: 'Lê Nhật Trường',
          phone: '0907767304',
          password: u.password || '111222',
          role: 'admin',
          status: 'approved',
          company: 'TÂN PHÚ VIỆT NAM',
          department: 'Phòng Quản Lý Chất Lượng (TPP-CTY)',
          branch: 'Văn Phòng Công Ty (TPP-CTY)',
          employeeId: '2018.00281',
          createdAt: u.createdAt || '2026-06-06T08:30:36Z',
          lastActive: u.lastActive || undefined
        };
      } else {
        // GỘP (Merge) data if there are duplicate Admin entries in the database
        supremeAdminMerged = {
          ...supremeAdminMerged,
          ...u,
          id: 'admin_lenhattruong', // Preserve the standard ID
          name: 'Lê Nhật Trường',
          phone: '0907767304',
          role: 'admin',
          status: 'approved',
          company: 'TÂN PHÚ VIỆT NAM',
          department: 'Phòng Quản Lý Chất Lượng (TPP-CTY)',
          branch: 'Văn Phòng Công Ty (TPP-CTY)',
          employeeId: '2018.00281',
          password: supremeAdminMerged.password || u.password || '111222',
          lastActive: u.lastActive || supremeAdminMerged.lastActive
        };
      }
    }
  });

  // Always put the merged supreme admin at the top exactly once
  if (supremeAdminMerged) {
    cleaned.push(supremeAdminMerged);
    seenUniqueKeys.add('lê nhật trường_0907767304');
  } else {
    cleaned.push(defaultAdmin);
    seenUniqueKeys.add('lê nhật trường_0907767304');
  }

  // 2. Process off all other users safely
  validUsers.forEach(u => {
    const nameTrim = u.name.trim();
    const phoneTrim = u.phone.trim();
    if (!nameTrim || !phoneTrim) return;

    // Skip any administrator matching Name, Phone or ID of supreme admin (handled in step 1)
    const isLNT = nameTrim.toUpperCase() === 'LÊ NHẬT TRƯỜNG' || phoneTrim === '0907767304' || u.id === 'admin_lenhattruong';
    if (isLNT) return;

    const key = `${nameTrim.toLowerCase()}_${phoneTrim}`;
    if (!seenUniqueKeys.has(key)) {
      seenUniqueKeys.add(key);
      cleaned.push({
        ...u,
        name: nameTrim.toUpperCase(), // Normalize name capitalization consistently
        phone: phoneTrim,
        status: u.status || 'PENDING'
      });
    }
  });

  return cleaned;
};

export const databaseService = {
  isConfigured: () => isFirebaseConfigured,

  async initialize(): Promise<void> {
    await initializeDatabase();
  },

  // User Authentication & Registration (Phone & Password Based) - strictly via Cloud Firestore
  async registerUser(userData: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      throw new Error('Ứng dụng chưa kết nối Cloud Firestore! Vui lòng cập nhật API Key hoặc kiểm tra file firebase-applet-config.json trong AI Studio.');
    }

    const nameTrim = userData.name.trim().toUpperCase();
    const phoneTrim = userData.phone.trim();
    if (!nameTrim || !phoneTrim) {
      throw new Error('Họ tên và số điện thoại không được để trống!');
    }

    const isLNT = nameTrim === 'LÊ NHẬT TRƯỜNG' || phoneTrim === '0907767304';
    const role = isLNT ? 'admin' : 'employee';
    const status = isLNT ? 'approved' : 'PENDING';

    const newUser: User = {
      ...userData,
      name: nameTrim,
      phone: phoneTrim,
      id: isLNT ? 'admin_lenhattruong' : ('usr_' + Math.random().toString(36).substring(2, 9)),
      role,
      status,
      company: isLNT ? 'TÂN PHÚ VIỆT NAM' : (userData.company || 'TÂN PHÚ VIỆT NAM'),
      branch: isLNT ? 'Văn Phòng Công Ty (TPP-CTY)' : userData.branch,
      department: isLNT ? 'Phòng Quản Lý Chất Lượng (TPP-CTY)' : userData.department,
      employeeId: isLNT ? '2018.00281' : userData.employeeId,
      createdAt: new Date().toISOString()
    };

    try {
      const querySnapshot = await getDocs(collection(db, 'user_profiles'));
      incrementQuota('reads', querySnapshot.size);
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push(doc.data() as User);
      });

      const normInput = phoneTrim.replace(/\s+/g, '');
      if (usersList.some(u => (u.phone || '').replace(/\s+/g, '') === normInput)) {
        throw new Error('Số điện thoại này đã tồn tại trên hệ thống!');
      }

      await setDoc(doc(db, 'user_profiles', newUser.id), newUser);
      incrementQuota('writes', 1);
      return newUser;
    } catch (err: any) {
      if (err.message && (err.message.includes('tồn tại') || err.message.includes('trống'))) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, `user_profiles/${newUser.id}`);
    }
  },

  async loginUser(phone: string, password?: string, employeeId?: string): Promise<User> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      throw new Error('Ứng dụng chưa kết nối Cloud Firestore! Vui lòng cập nhật API Key hoặc kiểm tra file firebase-applet-config.json trong AI Studio.');
    }

    const phoneTrim = phone.trim();
    if (!phoneTrim || !password) {
      throw new Error('Số điện thoại và mật khẩu không được để trống!');
    }
    
    try {
      const usersList = await this.getUsers();
      const normInput = phoneTrim.replace(/\s+/g, '');
      const user = usersList.find(u => 
        (u.phone || '').replace(/\s+/g, '') === normInput && 
        u.password === password && 
        (!employeeId || !u.employeeId || u.employeeId.trim().toLowerCase() === employeeId.trim().toLowerCase())
      );
      if (!user) {
        throw new Error('Số điện thoại, mã nhân sự hoặc mật khẩu không chính xác!');
      }
      return user;
    } catch (err: any) {
      if (err instanceof Error && (err.message.includes('chính xác') || err.message.includes('chưa kết nối') || err.message.includes('API Key'))) {
        throw err;
      }
      handleFirestoreError(err, OperationType.GET, 'user_profiles');
    }
  },

  async getUsers(): Promise<User[]> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      throw new Error('Ứng dụng chưa kết nối Cloud Firestore! Vui lòng cập nhật API Key hoặc kiểm tra file firebase-applet-config.json trong AI Studio.');
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'user_profiles'));
      incrementQuota('reads', querySnapshot.size);
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      
      const cleaned = sanitizeUserList(users);
      // Seed first Admin if the collection is completely empty
      if (cleaned.length === 0) {
        await setDoc(doc(db, 'user_profiles', defaultAdmin.id), defaultAdmin);
        incrementQuota('writes', 1);
        cleaned.push(defaultAdmin);
      }
      return cleaned;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'user_profiles');
    }
  },

  async getUserByEmployeeId(employeeId: string): Promise<User | null> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      const localUsers = getLocalData<User[]>('3t_users', []);
      return localUsers.find(u => u.employeeId?.trim().toLowerCase() === employeeId.trim().toLowerCase()) || null;
    }
    try {
      const users = await this.getUsers();
      return users?.find(u => u.employeeId?.trim().toLowerCase() === employeeId.trim().toLowerCase()) || null;
    } catch (err) {
      console.warn("Lỗi tìm thông tin người dùng bằng mã nhân sự:", err);
      return null;
    }
  },

  subscribeUsers(onUpdate: (users: User[]) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      // Return a passive unsubscriber if Firestore is not online
      console.warn('Real Firestore Connection unavailable for subscribeUsers.');
      return () => {};
    }

    const q = collection(db, 'user_profiles');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      incrementQuota('reads', querySnapshot.size);
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push(doc.data() as User);
      });
      
      const cleaned = sanitizeUserList(usersList);
      // Seed first Admin if the collection is completely empty
      if (cleaned.length === 0) {
        setDoc(doc(db, 'user_profiles', defaultAdmin.id), defaultAdmin).then(() => {
          incrementQuota('writes', 1);
        }).catch(err => {
          console.error("Failed to seed default admin via onSnapshot:", err);
        });
        cleaned.push(defaultAdmin);
      }
      onUpdate(cleaned);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'user_profiles');
    });
    return unsubscribe;
  },

  subscribeUser(userId: string, onUpdate: (user: User | null) => void): () => void {
    if (!isFirebaseConfigured || !db || !userId) {
      return () => {};
    }
    const docRef = doc(db, 'user_profiles', userId);
    return onSnapshot(docRef, (docSnapshot) => {
      incrementQuota('reads', 1);
      if (docSnapshot.exists()) {
        const rawUserData = docSnapshot.data() as User;
        const nameTrim = (rawUserData.name || '').trim().toUpperCase();
        const phoneTrim = (rawUserData.phone || '').trim();
        const isLNT = userId === 'admin_lenhattruong' || nameTrim === 'LÊ NHẬT TRƯỜNG' || phoneTrim === '0907767304';
        
        if (isLNT) {
          // Force supreme admin values to be always correct and consistent across the whole system, avoiding any spreadsheet modifications or local deviations
          const sanitizedAdmin: User = {
            ...rawUserData,
            id: 'admin_lenhattruong',
            name: 'Lê Nhật Trường',
            phone: '0907767304',
            role: 'admin',
            status: 'approved',
            company: 'TÂN PHÚ VIỆT NAM',
            department: 'Phòng Quản Lý Chất Lượng (TPP-CTY)',
            branch: 'Văn Phòng Công Ty (TPP-CTY)',
            employeeId: '2018.00281'
          };
          onUpdate(sanitizedAdmin);
        } else {
          onUpdate(rawUserData);
        }
      } else {
        onUpdate(null);
      }
    }, (err) => {
      console.warn("Error subscribing to user:", err);
    });
  },

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      throw new Error('Ứng dụng chưa kết nối Cloud Firestore! Vui lòng cập nhật API Key hoặc kiểm tra file firebase-applet-config.json trong AI Studio.');
    }

    try {
      let finalData = { ...data };
      const nameTrim = (data.name || '').trim().toUpperCase();
      const phoneTrim = (data.phone || '').trim();
      const isLNT = userId === 'admin_lenhattruong' || nameTrim === 'LÊ NHẬT TRƯỜNG' || phoneTrim === '0907767304';
      
      if (isLNT) {
        finalData.company = 'TÂN PHÚ VIỆT NAM';
        finalData.department = 'Phòng Quản Lý Chất Lượng (TPP-CTY)';
        finalData.branch = 'Văn Phòng Công Ty (TPP-CTY)';
        finalData.role = 'admin';
        finalData.status = 'approved';
        finalData.employeeId = '2018.00281';
      }
      
      await updateDoc(doc(db, 'user_profiles', userId), finalData);
      incrementQuota('writes', 1);
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `user_profiles/${userId}`);
    }
  },

  async saveUser(userId: string, data: User): Promise<void> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      throw new Error('Ứng dụng chưa kết nối Cloud Firestore! Vui lòng cập nhật API Key hoặc kiểm tra file firebase-applet-config.json trong AI Studio.');
    }

    try {
      let finalData = { ...data };
      const nameTrim = (data.name || '').trim().toUpperCase();
      const phoneTrim = (data.phone || '').trim();
      const isLNT = userId === 'admin_lenhattruong' || nameTrim === 'LÊ NHẬT TRƯỜNG' || phoneTrim === '0907767304';
      
      if (isLNT) {
        finalData.company = 'TÂN PHÚ VIỆT NAM';
        finalData.department = 'Phòng Quản Lý Chất Lượng (TPP-CTY)';
        finalData.branch = 'Văn Phòng Công Ty (TPP-CTY)';
        finalData.role = 'admin';
        finalData.status = 'approved';
        finalData.employeeId = '2018.00281';
      }
      
      await setDoc(doc(db, 'user_profiles', userId), finalData, { merge: true });
      incrementQuota('writes', 1);
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_profiles/${userId}`);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      throw new Error('Ứng dụng chưa kết nối Cloud Firestore! Vui lòng cập nhật API Key hoặc kiểm tra file firebase-applet-config.json trong AI Studio.');
    }

    try {
      await deleteDoc(doc(db, 'user_profiles', userId));
      incrementQuota('deletes', 1);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `user_profiles/${userId}`);
    }
  },

  // Questions Manager
  async incrementQuestionVersion(): Promise<number> {
    await initializeDatabase();
    let newVersion = 1;
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'config', 'question_version');
        const snap = await getDoc(docRef);
        incrementQuota('reads', 1);
        if (snap.exists()) {
          const currentVersion = snap.data().version || 0;
          newVersion = currentVersion + 1;
        }
        await setDoc(docRef, { version: newVersion });
        incrementQuota('writes', 1);
        console.log(`[VERSION UPDATE] Đã cập nhật version bộ câu hỏi mới lên Firestore: v${newVersion}`);
      } catch (err) {
        console.warn('Error incrementing question version:', err);
      }
    }
    // Storage locally so we don't clear it immediately on our own machine
    localStorage.setItem('3t_local_question_version', String(newVersion));
    return newVersion;
  },

  async getQuestions(forceRefresh = false): Promise<Question[]> {
    await initializeDatabase();
    
    // Check version difference between Firestore and LocalStorage
    if (isFirebaseConfigured && db && !forceRefresh) {
      try {
        const docRef = doc(db, 'config', 'question_version');
        const snap = await getDoc(docRef);
        incrementQuota('reads', 1);
        if (snap.exists()) {
          const cloudVersion = snap.data().version || 0;
          const localVersion = parseInt(localStorage.getItem('3t_local_question_version') || '0', 10);
          if (cloudVersion > localVersion) {
            console.log(`[VERSION OUTDATED] Phát hiện bộ câu hỏi mới (v${cloudVersion} > v${localVersion}). Tiến hành xóa cache và tải lại!`);
            localStorage.removeItem('3t_questions');
            localStorage.setItem('3t_local_question_version', String(cloudVersion));
            isQuestionsFetchedThisSession = false; // reset the cache flag to force refetch
          } else {
            console.log(`[VERSION MATCH] Bộ câu hỏi cục bộ trùng khớp với cloud (v${cloudVersion}). Dùng cache.`);
          }
        }
      } catch (err) {
        console.warn('Error checking question version:', err);
      }
    }
    
    // Hard check: If already fetched in this session, grab from localStorage cache and block Firestore reads
    if (isQuestionsFetchedThisSession && !forceRefresh) {
      console.log("[CACHE SUCCESS] Đã lấy bộ câu hỏi từ LocalStorage! Tránh gọi lại Firebase thành công.");
      return getLocalData<Question[]>('3t_questions', INITIAL_QUESTIONS);
    }

    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'questions'));
        incrementQuota('reads', querySnapshot.size);
        const questions: Question[] = [];
        querySnapshot.forEach((doc) => {
          questions.push(doc.data() as Question);
        });
        if (questions.length > 0) {
          setLocalData('3t_questions', questions);
          isQuestionsFetchedThisSession = true;
          console.log("[FIREBASE SUCCESS] Đã nạp thành công bộ câu hỏi từ Firestore và lưu vào LocalStorage!");
          return questions;
        }
      } catch (err) {
        console.warn('Real Firestore read error for questions:', err);
      }
    }

    isQuestionsFetchedThisSession = true; // Block subsequent reads even on mock questions to protect quota
    return getLocalData<Question[]>('3t_questions', INITIAL_QUESTIONS);
  },

  async saveQuestions(newQuestions: Question[]): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        for (const q of newQuestions) {
          await setDoc(doc(db, 'questions', q.id), q);
          incrementQuota('writes', 1);
        }
        await this.incrementQuestionVersion();

        // Save real-time system announcement about new questions
        await this.saveAnnouncement({
          id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          userName: 'Hệ thống',
          type: 'new_questions',
          detail: `vừa cập nhật thành công ${newQuestions.length} câu hỏi mới vào Ngân hàng đề thi văn hóa 3T! 📚`,
          timestamp: Date.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'questions');
      }
    }

    const existingQs = getLocalData<Question[]>('3t_questions', INITIAL_QUESTIONS);
    existingQs.push(...newQuestions);
    setLocalData('3t_questions', existingQs);
  },

  async saveQuestion(q: Question): Promise<void> {
    await initializeDatabase();
    return this.saveQuestions([q]);
  },

  async updateQuestion(q: Question): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'questions', q.id), q);
        incrementQuota('writes', 1);
        await this.incrementQuestionVersion();

        // Save real-time system announcement about a question update
        await this.saveAnnouncement({
          id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          userName: 'Hệ thống',
          type: 'new_questions',
          detail: `với cải tiến/điều chỉnh nội dung câu hỏi mã #${q.id.substring(0, 5)}! 📚`,
          timestamp: Date.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `questions/${q.id}`);
      }
    }
    const questions = getLocalData<Question[]>('3t_questions', INITIAL_QUESTIONS);
    const updated = questions.map(item => item.id === q.id ? q : item);
    if (!questions.some(item => item.id === q.id)) {
      updated.push(q);
    }
    setLocalData('3t_questions', updated);
  },

  async deleteQuestion(id: string): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'questions', id));
        incrementQuota('deletes', 1);
        await this.incrementQuestionVersion();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `questions/${id}`);
      }
    }
    const questions = getLocalData<Question[]>('3t_questions', INITIAL_QUESTIONS);
    const filtered = questions.filter(q => q.id !== id);
    setLocalData('3t_questions', filtered);
  },

  subscribeQuizResults(onUpdate: (results: QuizResult[]) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      const local = getLocalData<QuizResult[]>('3t_quiz_results', []);
      onUpdate(local);
      return () => {};
    }
    const q = collection(db, 'quiz_results');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      incrementQuota('reads', querySnapshot.size);
      const results: QuizResult[] = [];
      querySnapshot.forEach((doc) => {
        const item = doc.data() as QuizResult;
        if (item && item.department && item.department.includes('Quản lí chất lượng')) {
          item.department = item.department.replace(/Quản lí chất lượng/g, 'Quản Lý Chất Lượng');
        }
        results.push(item);
      });
      // Sort them descending by timestamp so active computations start with latest
      results.sort((a, b) => b.timestamp - a.timestamp);
      setLocalData('3t_quiz_results', results);
      onUpdate(results);
    }, (error) => {
      console.warn("Error subscribing to quiz results:", error);
    });
    return unsubscribe;
  },

  // Quiz Results / History
  async getQuizResults(fetchOnlyRecent = true, forceRefresh = false): Promise<QuizResult[]> {
    await initializeDatabase();

    // If we're not forcing a refresh, check memory flags and verify the level of details cached
    if (!forceRefresh) {
      if (fetchOnlyRecent && isQuizResultsFetchedThisSession) {
        const localData = getLocalData<QuizResult[]>('3t_quiz_results', []);
        if (localData.length > 0) {
          console.log(`[CACHE SUCCESS] Lấy ${localData.length} kết quả từ LocalStorage sạch sẽ, tiêu thụ 0 lượt đọc Firestore!`);
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          return localData.filter(r => r.timestamp >= thirtyDaysAgo);
        }
      }
      if (!fetchOnlyRecent && isFullQuizResultsFetchedThisSession) {
        const localData = getLocalData<QuizResult[]>('3t_quiz_results', []);
        if (localData.length > 0) {
          console.log(`[CACHE SUCCESS] Lấy TOÀN BỘ ${localData.length} kết quả từ LocalStorage sòng phẳng, tiêu thụ 0 lượt đọc Firestore!`);
          return localData;
        }
      }
    }

    if (isFirebaseConfigured && db) {
      try {
        let qRef: any = collection(db, 'quiz_results');
        if (fetchOnlyRecent) {
          // Default: Fetch only quiz results from the last 30 days to optimize Firestore reads
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          qRef = query(collection(db, 'quiz_results'), where('timestamp', '>=', thirtyDaysAgo));
        }
        const querySnapshot = await getDocs(qRef);
        incrementQuota('reads', querySnapshot.size);
        const results: QuizResult[] = [];
        querySnapshot.forEach((doc) => {
          const item = doc.data() as QuizResult;
          if (item && item.department && item.department.includes('Quản lí chất lượng')) {
            item.department = item.department.replace(/Quản lí chất lượng/g, 'Quản Lý Chất Lượng');
          }
          results.push(item);
        });

        // Merge or replace cached results in localStorage smartly
        const localData = getLocalData<QuizResult[]>('3t_quiz_results', []);
        const resultMap = new Map<string, QuizResult>();
        localData.forEach(r => resultMap.set(r.id, r));
        results.forEach(r => resultMap.set(r.id, r));
        const mergedResults = Array.from(resultMap.values());
        setLocalData('3t_quiz_results', mergedResults);

        isQuizResultsFetchedThisSession = true;
        if (!fetchOnlyRecent) {
          isFullQuizResultsFetchedThisSession = true;
        }
        console.log(`[FIREBASE SUCCESS] Đã tải mới ${results.length} kết quả từ Firestore và làm mới bộ nhớ đệm.`);
        return results;
      } catch (err) {
        console.warn('Error reading real quiz results:', err);
      }
    }

    const localData = getLocalData<QuizResult[]>('3t_quiz_results', []);
    isQuizResultsFetchedThisSession = true;
    if (!fetchOnlyRecent) {
      isFullQuizResultsFetchedThisSession = true;
    }
    if (fetchOnlyRecent) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return localData.filter(r => r.timestamp >= thirtyDaysAgo);
    }
    return localData;
  },

  async deleteQuizResults(resultIds: string[]): Promise<number> {
    await initializeDatabase();
    let deletedCount = 0;
    if (isFirebaseConfigured && db) {
      try {
        for (const id of resultIds) {
          await deleteDoc(doc(db, 'quiz_results', id));
          incrementQuota('deletes', 1);
          deletedCount++;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `quiz_results`);
      }
    }

    const results = getLocalData<QuizResult[]>('3t_quiz_results', []);
    const filtered = results.filter(r => !resultIds.includes(r.id));
    setLocalData('3t_quiz_results', filtered);

    return deletedCount;
  },

  async saveQuizResult(result: QuizResult): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'quiz_results', result.id), result);
        incrementQuota('writes', 1);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `quiz_results/${result.id}`);
      }
    }

    const results = getLocalData<QuizResult[]>('3t_quiz_results', []);
    results.push(result);
    setLocalData('3t_quiz_results', results);
  },

  async getSlogan(): Promise<string> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'config'));
        incrementQuota('reads', querySnapshot.size);
        let txt = '';
        querySnapshot.forEach((doc) => {
          if (doc.id === 'slogan') {
            txt = doc.data().text;
          }
        });
        if (txt) return txt;
      } catch (err) {
        console.warn('Error reading slogan from Firestore:', err);
      }
    }
    return localStorage.getItem('3t_slogan') || '3T Hội Tụ - Tân Phú Vươn Xa';
  },

  async saveSlogan(slogan: string): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'config', 'slogan'), { text: slogan });
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error writing slogan to Firestore:', err);
      }
    }
    localStorage.setItem('3t_slogan', slogan);
  },

  async getDifficulty(): Promise<number> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'config'));
        incrementQuota('reads', querySnapshot.size);
        let level = 1;
        querySnapshot.forEach((doc) => {
          if (doc.id === 'difficulty') {
            level = Number(doc.data().level) || 1;
          }
        });
        if (level) return level;
      } catch (err) {
        console.warn('Error reading difficulty from Firestore:', err);
      }
    }
    const local = localStorage.getItem('3t_quiz_difficulty');
    return local ? Number(local) : 1;
  },

  async saveDifficulty(level: number): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'config', 'difficulty'), { level: level });
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error writing difficulty to Firestore:', err);
      }
    }
    localStorage.setItem('3t_quiz_difficulty', String(level));
  },

  async saveAnnouncement(announcement: {
    id: string;
    userName: string;
    type: 'record_broken' | 'level_5' | 'promotion' | 'demotion' | 'new_user' | 'new_questions' | 'admin_broadcast';
    detail: string;
    timestamp: number;
    title?: string;
  }): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'congratulations_announcements', announcement.id), announcement);
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error writing congrats announcement:', err);
      }
    }
    const local = getLocalData<any[]>('3t_announcements', []);
    local.push(announcement);
    setLocalData('3t_announcements', local);
  },

  async deleteAnnouncement(announcementId: string): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'congratulations_announcements', announcementId));
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error deleting congrats announcement:', err);
      }
    }
    const local = getLocalData<any[]>('3t_announcements', []);
    const filtered = local.filter(ann => ann.id !== announcementId);
    setLocalData('3t_announcements', filtered);
  },

  async getAnnouncements(): Promise<any[]> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      return getLocalData<any[]>('3t_announcements', []);
    }
    try {
      const q = collection(db, 'congratulations_announcements');
      const querySnapshot = await getDocs(q);
      incrementQuota('reads', querySnapshot.size);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setLocalData('3t_announcements', list);
      return list;
    } catch (error) {
      console.warn("Error getting announcements:", error);
      return getLocalData<any[]>('3t_announcements', []);
    }
  },

  async getSystemAnnouncement(): Promise<string> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      return localStorage.getItem('3t_system_announcement') || 'Chào mừng toàn thể cán bộ nhân viên đến với Hội Thi Văn Hóa 3T! Tốc độ là sống còn - Tinh gọn là sức mạnh!';
    }
    try {
      const docRef = doc(db, 'config', 'system_announcement');
      const docSnap = await getDoc(docRef);
      incrementQuota('reads', 1);
      if (docSnap.exists()) {
        const text = docSnap.data().text || '';
        localStorage.setItem('3t_system_announcement', text);
        return text;
      } else {
        const defaultText = 'Chào mừng toàn thể cán bộ nhân viên đến với Hội Thi Văn Hóa 3T! Tốc độ là sống còn - Tinh gọn là sức mạnh!';
        localStorage.setItem('3t_system_announcement', defaultText);
        return defaultText;
      }
    } catch (error) {
      console.warn("Error getting system announcement:", error);
      return localStorage.getItem('3t_system_announcement') || 'Chào mừng toàn thể cán bộ nhân viên đến với Hội Thi Văn Hóa 3T! Tốc độ là sống còn - Tinh gọn là sức mạnh!';
    }
  },

  subscribeAnnouncements(onUpdate: (announcements: any[]) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      const local = getLocalData<any[]>('3t_announcements', []);
      onUpdate(local);
      return () => {};
    }
    const q = collection(db, 'congratulations_announcements');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      incrementQuota('reads', querySnapshot.size);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data());
      });
      onUpdate(list);
    }, (error) => {
      console.warn("Error subscribing to announcements:", error);
    });
    return unsubscribe;
  },

  subscribeSystemAnnouncement(onUpdate: (text: string) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      onUpdate(localStorage.getItem('3t_system_announcement') || 'Chào mừng toàn thể cán bộ nhân viên đến với Hội Thi Văn Hóa 3T! Tốc độ là sống còn - Tinh gọn là sức mạnh!');
      return () => {};
    }
    const docRef = doc(db, 'config', 'system_announcement');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      incrementQuota('reads', 1);
      if (docSnap.exists()) {
        const text = docSnap.data().text || '';
        onUpdate(text);
        localStorage.setItem('3t_system_announcement', text);
      } else {
        const defaultText = 'Chào mừng toàn thể cán bộ nhân viên đến với Hội Thi Văn Hóa 3T! Tốc độ là sống còn - Tinh gọn là sức mạnh!';
        onUpdate(defaultText);
        localStorage.setItem('3t_system_announcement', defaultText);
      }
    }, (error) => {
      console.warn("Error subscribing to system announcement:", error);
    });
    return unsubscribe;
  },

  async saveSystemAnnouncement(text: string): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'config', 'system_announcement'), { text });
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error saving system announcement:', err);
      }
    }
    localStorage.setItem('3t_system_announcement', text);
  },

  async getMotivationalSlogans(): Promise<MotivationalSloganBand[]> {
    await initializeDatabase();
    const fallbackSlogans: MotivationalSloganBand[] = [
      {
        id: 'excellent',
        minScore: 30,
        maxScore: 30,
        slogan: 'Phản xạ ánh sáng - Tốc độ dẫn đầu,\nxứng danh chiến binh 3T thực thụ!',
        slogans: [
          'Phản xạ ánh sáng - Tốc độ dẫn đầu,\nxứng danh chiến binh 3T thực thụ!',
          'Trí tuệ tinh thông, phản xạ thần tốc -\nBạn chính là tấm gương tốc độ 3T!',
          'Bứt phá mọi giới hạn -\nTốc độ tuyệt đối tạo nên vị thế dẫn đầu!'
        ]
      },
      {
        id: 'good',
        minScore: 20,
        maxScore: 29,
        slogan: 'Chính xác thôi chưa đủ -\nĐẩy nhanh tốc độ để chiếm lĩnh đỉnh cao!',
        slogans: [
          'Chính xác thôi chưa đủ -\nĐẩy nhanh tốc độ để chiếm lĩnh đỉnh cao!',
          'Kiến thức rất vững vàng -\nHãy rèn thêm phản xạ để tối ưu hóa thời gian!',
          'Chậm một giây, lỡ một nhịp -\nCố gắng rút ngắn thời gian làm bài ở lượt sau!'
        ]
      },
      {
        id: 'passing',
        minScore: 15,
        maxScore: 19,
        slogan: 'Vượt qua thử thách -\nTiếp tục mài giũa tư duy để tăng tốc phản xạ!',
        slogans: [
          'Vượt qua thử thách -\nTiếp tục mài giũa tư duy để tăng tốc phản xạ!',
          'Tốc độ tạo khoảng cách -\nHãy nỗ lực luyện tập để phản xạ nhanh như chớp!',
          'Kiến thức nằm lòng, phản xạ tự nhiên -\nHãy luyện tập để không còn độ trễ!'
        ]
      },
      {
        id: 'unsatisfactory',
        minScore: 0,
        maxScore: 14,
        slogan: 'Tốc độ là sống còn - Hãy luyện tập thật nhiều\nđể phản xạ nhanh hơn!',
        slogans: [
          'Tốc độ là sống còn - Hãy luyện tập thật nhiều\nđể phản xạ nhanh hơn!',
          'Thất bại là bước đệm -\nLuyện tập không ngừng, làm chủ tốc độ 3T!',
          'Quyết tâm bứt phá -\nĐập tan độ trễ để nâng tầm bản thân ở lượt thi tới!'
        ]
      }
    ];

    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'config'));
        incrementQuota('reads', querySnapshot.size);
        let list: MotivationalSloganBand[] | null = null;
        querySnapshot.forEach((doc) => {
          if (doc.id === 'motivational_slogans') {
            list = doc.data().slogans;
          }
        });
        if (list && Array.isArray(list)) {
          // Normalize to make sure slogans arrays exist
          return list.map(item => {
            if (!item.slogans || !Array.isArray(item.slogans) || item.slogans.length === 0) {
              return {
                ...item,
                slogans: [item.slogan || '']
              };
            }
            return item;
          });
        }
      } catch (err) {
        console.warn('Error reading motivational slogans from Firestore:', err);
      }
    }
    const local = localStorage.getItem('3t_motivational_slogans');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            if (!item.slogans || !Array.isArray(item.slogans) || item.slogans.length === 0) {
              return {
                ...item,
                slogans: [item.slogan || '']
              };
            }
            return item;
          });
        }
      } catch {
        // ignore
      }
    }
    return fallbackSlogans;
  },

  async saveMotivationalSlogans(slogans: MotivationalSloganBand[]): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'config', 'motivational_slogans'), { slogans });
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error writing motivational slogans to Firestore:', err);
      }
    }
    localStorage.setItem('3t_motivational_slogans', JSON.stringify(slogans));
  },


  async getMaintenanceMode(): Promise<{ isMaintenance: boolean; message: string }> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'config'));
        incrementQuota('reads', querySnapshot.size);
        let configObj: any = null;
        querySnapshot.forEach((doc) => {
          if (doc.id === 'maintenance') {
            configObj = doc.data();
          }
        });
        if (configObj) {
          return {
            isMaintenance: !!configObj.isMaintenance,
            message: configObj.message || 'Hệ thống đang tạm khóa để bảo trì phần cứng và nâng cấp hiệu năng. Vui lòng quay lại sau ít phút!'
          };
        }
      } catch (err: any) {
        console.warn('Error reading maintenance config from Firestore:', err);
        const errMsg = String(err);
        if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('exhausted')) {
          return {
            isMaintenance: true,
            message: 'Hệ thống tạm thời đạt giới hạn lưu lượng (Firebase Quota Limit). Đang bảo trì tự động, xin lỗi vì sự bất tiện này!'
          };
        }
      }
    }
    
    const localVal = localStorage.getItem('3t_maintenance');
    if (localVal) {
      try {
        const parsed = JSON.parse(localVal);
        return {
          isMaintenance: !!parsed.isMaintenance,
          message: parsed.message || 'Hệ thống đang tạm khóa để bảo trì phần cứng và nâng cấp hiệu năng. Vui lòng quay lại sau ít phút!'
        };
      } catch {}
    }
    return { isMaintenance: false, message: '' };
  },

  async saveMaintenanceMode(isMaintenance: boolean, message: string): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'config', 'maintenance'), { isMaintenance, message });
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error writing maintenance config to Firestore:', err);
      }
    }
    localStorage.setItem('3t_maintenance', JSON.stringify({ isMaintenance, message }));
  },

  subscribeMaintenanceMode(onUpdate: (data: { isMaintenance: boolean; message: string }) => void): () => void {
    let unsubscribedRef = { current: false };
    let realUnsubscribe: (() => void) | null = null;
    let localInterval: any = null;

    // First do a local check / local storage check immediately so ui is not empty:
    const checkLocal = () => {
      const localVal = localStorage.getItem('3t_maintenance');
      if (localVal) {
        try {
          const parsed = JSON.parse(localVal);
          onUpdate({
            isMaintenance: !!parsed.isMaintenance,
            message: parsed.message || 'Hệ thống đang tạm khóa để bảo trì phần cứng và nâng cấp hiệu năng. Vui lòng quay lại sau ít phút!'
          });
        } catch {}
      } else {
        onUpdate({ isMaintenance: false, message: '' });
      }
    };
    checkLocal();

    // Start database hook after initialization completes
    initializeDatabase().then(() => {
      if (unsubscribedRef.current) return;

      if (isFirebaseConfigured && db) {
        try {
          const q = doc(db, 'config', 'maintenance');
          realUnsubscribe = onSnapshot(q, (snapshot) => {
            if (unsubscribedRef.current) return;
            incrementQuota('reads', 1);
            if (snapshot.exists()) {
              const data = snapshot.data();
              onUpdate({
                isMaintenance: !!data.isMaintenance,
                message: data.message || 'Hệ thống đang tạm khóa để bảo trì phần cứng và nâng cấp hiệu năng. Vui lòng quay lại sau ít phút!'
              });
            } else {
              onUpdate({ isMaintenance: false, message: '' });
            }
          }, (error) => {
            const errMsg = String(error);
            if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('exhausted')) {
              onUpdate({
                isMaintenance: true,
                message: 'Hệ thống tạm thời đạt giới hạn lưu lượng (Firebase Quota Limit). Đang bảo trì tự động, xin lỗi vì sự bất tiện này!'
              });
            } else {
              console.warn("Maintenance snapshot listen error:", error);
            }
          });
        } catch (e) {
          console.warn("Error subscribing maintenance document:", e);
        }
      } else {
        // Fallback to local interval polling if firebase is not configured
        localInterval = setInterval(checkLocal, 5000);
      }
    });

    return () => {
      unsubscribedRef.current = true;
      if (realUnsubscribe) {
        realUnsubscribe();
      }
      if (localInterval) {
        clearInterval(localInterval);
      }
    };
  },

  async getCompanyMappings(): Promise<CompanyMapping[]> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'config'));
        incrementQuota('reads', querySnapshot.size);
        let mappings: CompanyMapping[] | null = null;
        querySnapshot.forEach((doc) => {
          if (doc.id === 'company_mappings') {
            mappings = doc.data().mappings;
          }
        });
        if (mappings) {
          setLocalData('3t_company_mappings', mappings);
          return mappings;
        }
      } catch (err) {
        console.warn('Error reading company mappings from Firestore:', err);
      }
    }
    return getLocalData<CompanyMapping[]>('3t_company_mappings', INITIAL_COMPANY_MAPPINGS);
  },

  async saveCompanyMappings(mappings: CompanyMapping[]): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'config', 'company_mappings'), { mappings });
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error writing company mappings to Firestore:', err);
      }
    }
    setLocalData('3t_company_mappings', mappings);
  },

  async syncMappingNames(
    type: 'company' | 'branch' | 'department', 
    oldName: string, 
    newName: string, 
    extra?: { companyName?: string; branchName?: string }
  ): Promise<{ usersUpdated: number; resultsUpdated: number }> {
    await initializeDatabase();
    let usersUpdated = 0;
    let resultsUpdated = 0;

    if (isFirebaseConfigured && db) {
      try {
        // 1. Get all user profiles to update
        const userSnap = await getDocs(collection(db, 'user_profiles'));
        incrementQuota('reads', userSnap.size);
        for (const docObj of userSnap.docs) {
          const u = docObj.data() as User;
          let needsUpdate = false;
          const userUpdate: Partial<User> = {};

          if (type === 'company' && u.company === oldName) {
            userUpdate.company = newName;
            needsUpdate = true;
          } else if (type === 'branch' && u.branch === oldName && u.company === extra?.companyName) {
            userUpdate.branch = newName;
            needsUpdate = true;
          } else if (type === 'department' && u.department === oldName && u.company === extra?.companyName && u.branch === extra?.branchName) {
            userUpdate.department = newName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await updateDoc(doc(db, 'user_profiles', docObj.id), userUpdate);
            incrementQuota('writes', 1);
            usersUpdated++;
          }
        }

        // 2. Get and update quiz results
        const resultsSnap = await getDocs(collection(db, 'quiz_results'));
        incrementQuota('reads', resultsSnap.size);
        for (const docObj of resultsSnap.docs) {
          const res = docObj.data() as QuizResult;
          let needsUpdate = false;
          const resultUpdate: Partial<QuizResult> = {};

          if (type === 'company' && res.company === oldName) {
            resultUpdate.company = newName;
            needsUpdate = true;
          } else if (type === 'branch' && res.branch === oldName && res.company === extra?.companyName) {
            resultUpdate.branch = newName;
            needsUpdate = true;
          } else if (type === 'department' && res.department === oldName && res.company === extra?.companyName && res.branch === extra?.branchName) {
            resultUpdate.department = newName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await updateDoc(doc(db, 'quiz_results', docObj.id), resultUpdate);
            incrementQuota('writes', 1);
            resultsUpdated++;
          }
        }
      } catch (err) {
        console.warn("Cloud synchronization error:", err);
      }
    }

    // 3. Fallback/Local storage backup synchronization
    const localResults = localStorage.getItem('3t_quiz_results');
    if (localResults) {
      try {
        const parsed = JSON.parse(localResults) as QuizResult[];
        const updatedLocalRes = parsed.map(res => {
          let updatedRes = { ...res };
          if (type === 'company' && res.company === oldName) {
            updatedRes.company = newName;
          } else if (type === 'branch' && res.branch === oldName && res.company === extra?.companyName) {
            updatedRes.branch = newName;
          } else if (type === 'department' && res.department === oldName && res.company === extra?.companyName && res.branch === extra?.branchName) {
            updatedRes.department = newName;
          }
          return updatedRes;
        });
        localStorage.setItem('3t_quiz_results', JSON.stringify(updatedLocalRes));
      } catch (e) {
        console.warn(e);
      }
    }

    return { usersUpdated, resultsUpdated };
  },

  async getLevelRules(): Promise<LevelRulesConfig> {
    await initializeDatabase();
    const fallbackRules: LevelRulesConfig = {
      introduction: "Để khuyến khích thái độ kiên trì luyện tập, tạo phản xạ nhạy bén và nâng cao chuyên môn, hệ thống Quiz 3T Mastery áp dụng cơ chế phân hạng và thay đổi cấp độ tự động.",
      inactivityTitle: "Quy Định Duy Trì & Không Hoạt Động",
      inactivityRule1: "Mỗi ngày, nhân viên cần phải thực hiện ít nhất 02 lượt đánh giá để duy trì và giữ vững phong độ của mình.",
      inactivityRule2: "Nếu không hoạt động, hệ thống sẽ tự động hạ dần cấp độ (mỗi ngày hạ mỗi cấp) cho đến khi quay về lại cấp 1.",
      levels: [
        {
          level: 1,
          name: "Cấp 1: Tân Binh",
          emoji: "🌱",
          promotion: "Đạt điểm tuyệt đối 30/30 liên tục 10 lượt để nâng hạng lên Chiến Binh.",
          demotion: "Mức sàn tối thiểu, không thể hạ thấp hơn.",
          maxTime: "90s/câu",
          reactionPoints: ["≤ 30s (+10đ)", "31s-40s (+8đ)", "41s-50s (+6đ)", "51s-90s (+5đ)"]
        },
        {
          level: 2,
          name: "Cấp 2: Chiến Binh",
          emoji: "🛡️",
          promotion: "Đạt điểm tuyệt đối 30/30 liên tục 10 lượt để nâng hạng lên Thống Lĩnh.",
          demotion: "Đạt dưới 20 điểm trong 2 lần thi liên tiếp sẽ bị hạ về Tân Binh.\nLần thứ 1 đạt dưới 20đ: Hệ thống sẽ ngay lập tức hiện cảnh báo đỏ nhắc nhở giữ vững phong độ.\nLần thứ 2 đạt dưới 20đ: Hệ thống tự động hạ cấp.",
          maxTime: "60s/câu",
          reactionPoints: ["≤ 20s (+10đ)", "21s-30s (+8đ)", "31s-40s (+6đ)", "41s-60s (+5đ)"]
        },
        {
          level: 3,
          name: "Cấp 3: Thống Lĩnh",
          emoji: "⚔️",
          promotion: "Đạt điểm tuyệt đối 30/30 liên tục 10 lượt để nâng hạng lên Tối Cao.",
          demotion: "Đạt dưới 26 điểm trong 2 lần thi liên tiếp sẽ bị hạ về Chiến Binh.\nLần thứ 1 dưới 26đ: Cảnh báo phong độ.\nLần thứ 2 dưới 26đ: Tự động hạ cấp.",
          maxTime: "30s/câu",
          reactionPoints: ["≤ 10s (+10đ)", "11s-15s (+8đ)", "16s-20s (+6đ)", "21s-30s (+5đ)"]
        },
        {
          level: 4,
          name: "Cấp 4: Tối Cao",
          emoji: "👑",
          promotion: "Đạt điểm tuyệt đối 30/30 liên tục 10 lượt để thăng hạng cao nhất Huyền Thoại.",
          demotion: "Đạt dưới 27 điểm trong 2 lần thi liên tiếp sẽ bị hạ về Thống Lĩnh (có cảnh báo ở lần đầu).",
          maxTime: "20s/câu",
          reactionPoints: ["≤ 5s (+10đ)", "6s-8s (+8đ)", "9s-12s (+6đ)", "13s-20s (+5đ)"]
        },
        {
          level: 5,
          name: "Cấp 5: Huyền Thoại",
          emoji: "🔮",
          promotion: "Cấp bậc cao nhất hệ thống (Giữ nguyên).",
          demotion: "Đạt dưới 28 điểm trong 2 lần thi liên tiếp sẽ bị hạ về Tối Cao (có cảnh báo ở lần đầu).",
          maxTime: "15s/câu",
          reactionPoints: ["≤ 3s (+10đ)", "4s-5s (+8đ)", "6s-8s (+6đ)", "9s-15s (+5đ)"]
        }
      ]
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'config', 'level_rules');
        const snap = await getDoc(docRef);
        incrementQuota('reads', 1);
        if (snap.exists()) {
          const cloudConfig = snap.data() as LevelRulesConfig;
          localStorage.setItem('3t_level_rules', JSON.stringify(cloudConfig));
          return cloudConfig;
        }
      } catch (err) {
        console.warn('Error reading level rules from Firestore:', err);
      }
    }

    const localData = localStorage.getItem('3t_level_rules');
    if (localData) {
      try {
        return JSON.parse(localData) as LevelRulesConfig;
      } catch {
        return fallbackRules;
      }
    }
    return fallbackRules;
  },

  async saveLevelRules(rules: LevelRulesConfig): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'config', 'level_rules'), rules);
        incrementQuota('writes', 1);
        console.log("[SUCCESS] Đã lưu thành công quy chế thăng hạ cấp mới lên Firestore.");
      } catch (err) {
        console.warn('Error writing level rules to Firestore:', err);
      }
    }
    localStorage.setItem('3t_level_rules', JSON.stringify(rules));
  },

  async saveChatTopic(topic: ChatTopic): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'chat_topics', topic.id), topic);
        incrementQuota('writes', 1);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chat_topics/${topic.id}`);
      }
    }
    const local = getLocalData<ChatTopic[]>('3t_chat_topics', []);
    const idx = local.findIndex(t => t.id === topic.id);
    if (idx >= 0) {
      local[idx] = topic;
    } else {
      local.push(topic);
    }
    setLocalData('3t_chat_topics', local);
  },

  async deleteChatTopic(topicId: string): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'chat_topics', topicId));
        incrementQuota('deletes', 1);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `chat_topics/${topicId}`);
      }
    }
    const local = getLocalData<ChatTopic[]>('3t_chat_topics', []);
    const filtered = local.filter(t => t.id !== topicId);
    setLocalData('3t_chat_topics', filtered);
  },

  subscribeChatTopics(onUpdate: (topics: ChatTopic[]) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      const local = getLocalData<ChatTopic[]>('3t_chat_topics', []);
      onUpdate(local);
      return () => {};
    }
    const q = collection(db, 'chat_topics');
    const unsub = onSnapshot(q, (snapshot) => {
      incrementQuota('reads', snapshot.docs.length || 1);
      const list: ChatTopic[] = [];
      snapshot.forEach(docDoc => {
        list.push(docDoc.data() as ChatTopic);
      });
      list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setLocalData('3t_chat_topics', list);
      onUpdate(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'chat_topics');
    });
    return unsub;
  },

  async saveChatMessage(message: ChatMessage): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'chat_topics', message.topicId, 'messages', message.id), message);
        incrementQuota('writes', 1);
        
        await updateDoc(doc(db, 'chat_topics', message.topicId), {
          lastMessageAt: message.createdAt,
          lastMessageText: message.text,
          unreadForUser: message.senderRole === 'admin' || message.senderRole === 'executive',
          unreadForAdmin: message.senderRole !== 'admin' && message.senderRole !== 'executive'
        });
        incrementQuota('writes', 1);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chat_topics/${message.topicId}/messages/${message.id}`);
      }
    }
    const local = getLocalData<ChatMessage[]>(`3t_chat_msg_${message.topicId}`, []);
    local.push(message);
    setLocalData(`3t_chat_msg_${message.topicId}`, local);
  },

  subscribeChatMessages(topicId: string, onUpdate: (messages: ChatMessage[]) => void): () => void {
    if (!isFirebaseConfigured || !db) {
      const local = getLocalData<ChatMessage[]>(`3t_chat_msg_${topicId}`, []);
      onUpdate(local);
      return () => {};
    }
    const q = collection(db, 'chat_topics', topicId, 'messages');
    const unsub = onSnapshot(q, (snapshot) => {
      incrementQuota('reads', snapshot.docs.length || 1);
      const list: ChatMessage[] = [];
      snapshot.forEach(docDoc => {
        list.push(docDoc.data() as ChatMessage);
      });
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setLocalData(`3t_chat_msg_${topicId}`, list);
      onUpdate(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `chat_topics/${topicId}/messages`);
    });
    return unsub;
  },

  async markTopicAsRead(topicId: string, isAdmin: boolean): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        const updateObj: any = {};
        if (isAdmin) {
          updateObj.unreadForAdmin = false;
        } else {
          updateObj.unreadForUser = false;
        }
        await updateDoc(doc(db, 'chat_topics', topicId), updateObj);
        incrementQuota('writes', 1);
      } catch (err) {
        console.warn('Error marking topic as read:', err);
      }
    }
  }
};

