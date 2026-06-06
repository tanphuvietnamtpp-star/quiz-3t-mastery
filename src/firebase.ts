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
import { User, Question, QuizResult, BRANCHES, DEPARTMENTS } from './types';
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

// Seed default Admin Lê Nhật Trường which can automatically log in or register
const defaultAdmin: User = {
  id: 'admin_lenhattruong',
  name: 'Lê Nhật Trường',
  phone: '0907767304',
  password: '111222',
  role: 'admin',
  department: 'Ban Giám Đốc',
  branch: 'Hội sở chính',
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
        department: 'Ban Giám Đốc',
        branch: 'Hội sở chính',
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
        if (targetDbId) {
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
          department: u.department || 'Ban Giám Đốc',
          branch: u.branch || 'Hội sở chính',
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
          department: supremeAdminMerged.department || u.department || 'Ban Giám Đốc',
          branch: supremeAdminMerged.branch || u.branch || 'Hội sở chính',
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
      createdAt: new Date().toISOString()
    };

    try {
      const querySnapshot = await getDocs(collection(db, 'user_profiles'));
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push(doc.data() as User);
      });

      if (usersList.some(u => u.phone?.trim() === phoneTrim)) {
        throw new Error('Số điện thoại này đã được đăng ký!');
      }

      await setDoc(doc(db, 'user_profiles', newUser.id), newUser);
      return newUser;
    } catch (err: any) {
      if (err.message && (err.message.includes('đăng ký') || err.message.includes('trống'))) {
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
      const user = usersList.find(u => 
        u.phone === phoneTrim && 
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
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      
      const cleaned = sanitizeUserList(users);
      // Seed first Admin if the collection is completely empty
      if (cleaned.length === 0) {
        await setDoc(doc(db, 'user_profiles', defaultAdmin.id), defaultAdmin);
        cleaned.push(defaultAdmin);
      }
      return cleaned;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'user_profiles');
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
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push(doc.data() as User);
      });
      
      const cleaned = sanitizeUserList(usersList);
      // Seed first Admin if the collection is completely empty
      if (cleaned.length === 0) {
        setDoc(doc(db, 'user_profiles', defaultAdmin.id), defaultAdmin).catch(err => {
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
  async getQuizResults(): Promise<QuizResult[]> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'quiz_results'));
        const results: QuizResult[] = [];
        querySnapshot.forEach((doc) => {
          results.push(doc.data() as QuizResult);
        });
        return results;
      } catch (err) {
        console.warn('Error reading real quiz results:', err);
      }
    }

    return getLocalData<QuizResult[]>('3t_quiz_results', []);
  },

  async saveQuizResult(result: QuizResult): Promise<void> {
    await initializeDatabase();
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'quiz_results', result.id), result);
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
      } catch (err) {
        console.warn('Error writing slogan to Firestore:', err);
      }
    }
    localStorage.setItem('3t_slogan', slogan);
  }
};

