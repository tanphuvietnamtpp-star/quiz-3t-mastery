import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
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
import { User, Question, QuizResult, BRANCHES, DEPARTMENTS, CompanyMapping } from './types';
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
        id: 'vpnamky',
        name: 'Văn Phòng Nam Kỳ',
        departments: [
          { id: 'pqlcl', name: 'Phòng Quản Lý Chất Lượng (P.QLCL)' },
          { id: 'psx', name: 'Phòng Sản Xuất' },
          { id: 'pns', name: 'Phòng Nhân Sự' },
          { id: 'pkt', name: 'Phòng Kế Toán' },
          { id: 'pkd', name: 'Phòng Kinh Doanh' }
        ]
      },
      {
        id: 'vpbacninh',
        name: 'Văn Phòng Bắc Ninh',
        departments: [
          { id: 'vpbacninh-bgd', name: 'Ban Giám Đốc' },
          { id: 'vpbacninh-psx', name: 'Phòng Sản Xuất' },
          { id: 'vpbacninh-pns', name: 'Phòng Nhân Sự' }
        ]
      }
    ]
  },
  {
    id: 'baobitanphu',
    name: 'BAO BÌ TÂN PHÚ',
    branches: [
      {
        id: 'cnlongan',
        name: 'Chi nhánh Long An',
        departments: [
          { id: 'cnla-tcd', name: 'Tổ Cơ Điện' },
          { id: 'cnla-pdbcl', name: 'Phòng Đảm Bảo Chất Lượng' },
          { id: 'cnla-psx', name: 'Phòng Sản Xuất' }
        ]
      },
      {
        id: 'cnhungyen',
        name: 'Chi nhánh Hưng Yên',
        departments: [
          { id: 'cnhy-hyns', name: 'Hành Chính Nhân Sự' },
          { id: 'cnhy-kt', name: 'Kế Toán' }
        ]
      }
    ]
  },
  {
    id: 'nhuatienphong',
    name: 'NHỰA TIÊN PHONG TÂN PHÚ',
    branches: [
      {
        id: 'cn-danang',
        name: 'Văn Phòng Đà Nẵng',
        departments: [
          { id: 'cndn-pkd', name: 'Phòng Kinh Doanh' },
          { id: 'cndn-bpk', name: 'Bộ Phận Kho' }
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
  department: 'Phòng Quản Lý Chất Lượng (P.QLCL)',
  branch: 'Văn Phòng Nam Kỳ',
  status: 'approved',
  createdAt: '2026-06-06T08:30:36Z',
  employeeId: '2018.00281'
};

const forceSeedSupremeAdmin = async () => {
  if (isFirebaseConfigured && db) {
    try {
      const adminRef = doc(db, 'user_profiles', 'admin_lenhattruong');
      const adminSnap = await getDocFromServer(adminRef).catch(() => null);
      
      const adminData = {
        id: 'admin_lenhattruong',
        name: 'Lê Nhật Trường',
        phone: '0907767304',
        password: '111222',
        role: 'admin',
        status: 'approved',
        company: 'TÂN PHÚ VIỆT NAM',
        department: 'Phòng Quản Lý Chất Lượng (P.QLCL)',
        branch: 'Văn Phòng Nam Kỳ',
        employeeId: '2018.00281',
        createdAt: adminSnap && adminSnap.exists() ? (adminSnap.data()?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };
      
      await setDoc(adminRef, adminData, { merge: true });
      console.log("Supreme Admin Lê Nhật Trường emergency seed successfully completed on Firebase!");
    } catch (seedErr) {
      console.error("Emergency admin seed to cloud failed:", seedErr);
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

if (!localStorage.getItem('3t_company_mappings')) {
  setLocalData('3t_company_mappings', INITIAL_COMPANY_MAPPINGS);
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

  // Filter out invalid/empty records first
  const validUsers = users.filter(u => u && u.name && u.phone);

  // 1. Gather and merge all possible 'Lê Nhật Trường' profiles (by name, phone, or id)
  let supremeAdminMerged: User | null = null;
  validUsers.forEach(u => {
    const nameTrim = u.name.trim();
    const phoneTrim = u.phone.trim();
    const isLNT = nameTrim === 'Lê Nhật Trường' || phoneTrim === '0907767304' || u.id === 'admin_lenhattruong';
    if (isLNT) {
      if (!supremeAdminMerged) {
        supremeAdminMerged = {
          id: u.id || 'admin_lenhattruong',
          name: 'Lê Nhật Trường',
          phone: phoneTrim || '0907767304',
          password: u.password || '111222',
          role: 'admin',
          status: 'approved',
          company: 'TÂN PHÚ VIỆT NAM',
          department: 'Phòng Quản Lý Chất Lượng (P.QLCL)',
          branch: u.branch || 'Văn Phòng Nam Kỳ',
          employeeId: u.employeeId || '2018.00281',
          createdAt: u.createdAt || new Date().toISOString()
        };
      } else {
        // GỘP (Merge) data if there are duplicate Admin entries in the database
        supremeAdminMerged = {
          ...supremeAdminMerged,
          ...u,
          id: supremeAdminMerged.id, // Preserve the standard ID
          name: 'Lê Nhật Trường',
          phone: '0907767304',
          role: 'admin',
          status: 'approved',
          company: 'TÂN PHÚ VIỆT NAM',
          department: 'Phòng Quản Lý Chất Lượng (P.QLCL)',
          branch: supremeAdminMerged.branch || u.branch || 'Văn Phòng Nam Kỳ',
          employeeId: supremeAdminMerged.employeeId || u.employeeId || '2018.00281',
          password: supremeAdminMerged.password || u.password || '111222'
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
    const isLNT = nameTrim === 'Lê Nhật Trường' || phoneTrim === '0907767304' || u.id === 'admin_lenhattruong';
    if (isLNT) return;

    const key = `${nameTrim.toLowerCase()}_${phoneTrim}`;
    if (!seenUniqueKeys.has(key)) {
      seenUniqueKeys.add(key);
      cleaned.push({
        ...u,
        name: nameTrim,
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

    const nameTrim = userData.name.trim();
    const phoneTrim = userData.phone.trim();
    if (!nameTrim || !phoneTrim) {
      throw new Error('Họ tên và số điện thoại không được để trống!');
    }

    const isLNT = nameTrim === 'Lê Nhật Trường';
    const role = isLNT ? 'admin' : 'employee';
    const status = isLNT ? 'approved' : 'PENDING';

    const newUser: User = {
      ...userData,
      name: nameTrim,
      phone: phoneTrim,
      id: isLNT ? 'admin_lenhattruong' : ('usr_' + Math.random().toString(36).substring(2, 9)),
      role,
      status,
      company: userData.company || 'TÂN PHÚ VIỆT NAM',
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
    
    try {
      const usersList = await this.getUsers();
      const normInput = phoneTrim.replace(/\s+/g, '');
      const user = usersList.find(u => 
        (u.phone || '').replace(/\s+/g, '') === normInput && 
        (!password || u.password === password) && 
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

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await initializeDatabase();
    if (!isFirebaseConfigured || !db) {
      throw new Error('Ứng dụng chưa kết nối Cloud Firestore! Vui lòng cập nhật API Key hoặc kiểm tra file firebase-applet-config.json trong AI Studio.');
    }

    try {
      await updateDoc(doc(db, 'user_profiles', userId), data);
      incrementQuota('writes', 1);
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `user_profiles/${userId}`);
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
  async getQuestions(): Promise<Question[]> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'questions'));
        incrementQuota('reads', querySnapshot.size);
        const questions: Question[] = [];
        querySnapshot.forEach((doc) => {
          questions.push(doc.data() as Question);
        });
        if (questions.length > 0) return questions;
      } catch (err) {
        console.warn('Real Firestore read error for questions:', err);
      }
    }

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

  async deleteQuestion(id: string): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        // Mocking deletion pattern if connected
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `questions/${id}`);
      }
    }
    const questions = getLocalData<Question[]>('3t_questions', INITIAL_QUESTIONS);
    const filtered = questions.filter(q => q.id !== id);
    setLocalData('3t_questions', filtered);
  },

  // Quiz Results / History
  async getQuizResults(fetchOnlyRecent = true): Promise<QuizResult[]> {
    await initializeDatabase();
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
          results.push(doc.data() as QuizResult);
        });
        return results;
      } catch (err) {
        console.warn('Error reading real quiz results:', err);
      }
    }

    const localData = getLocalData<QuizResult[]>('3t_quiz_results', []);
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
        if (mappings) return mappings;
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
  }
};

