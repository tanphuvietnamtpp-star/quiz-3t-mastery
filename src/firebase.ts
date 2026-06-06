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
  getDocFromServer
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { User, Question, QuizResult, BRANCHES, DEPARTMENTS } from './types';
import { INITIAL_QUESTIONS } from './data/mockQuestions';
import firebaseConfig from './firebase-applet-config.json';

// Simple check if real configuration values are populated
const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "");

let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Quick validation check from SKILL.md
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration: Client is offline.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.error("Failed to initialize real Firebase:", err);
  }
}

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
  createdAt: new Date().toISOString(),
  employeeId: '2018.00281'
};

const seedDefaultUsersAndDept = () => {
  const users = getLocalData<User[]>('3t_users', []);
  const foundIdx = users.findIndex(u => u.name === 'Lê Nhật Trường' || u.phone === '0907767304' || u.phone === '0909999999');
  if (foundIdx === -1) {
    users.push(defaultAdmin);
    setLocalData('3t_users', users);
  } else {
    // Sync all matching accounts to have the correct employeeId, phone and password
    let changed = false;
    users.forEach(u => {
      if (u.name === 'Lê Nhật Trường' || u.phone === '0907767304' || u.phone === '0909999999') {
        u.name = 'Lê Nhật Trường';
        u.employeeId = '2018.00281';
        u.phone = '0907767304';
        u.password = '111222';
        u.role = 'admin';
        u.status = 'approved';
        changed = true;
      }
    });
    if (changed) {
      setLocalData('3t_users', users);
    }
  }
};
seedDefaultUsersAndDept();

export const databaseService = {
  isConfigured: () => isFirebaseConfigured,

  // User Authentication & Registration (Phone & Password Based)
  async registerUser(userData: Omit<User, 'id' | 'role' | 'status' | 'createdAt'>): Promise<User> {
    const isLNT = userData.name.trim() === 'Lê Nhật Trường';
    const role = isLNT ? 'admin' : 'employee';
    const status = isLNT ? 'approved' : 'pending';

    const newUser: User = {
      ...userData,
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      role,
      status,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'users', newUser.id), newUser);
        return newUser;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`);
      }
    }

    // Fallback LocalStorage
    const users = getLocalData<User[]>('3t_users', []);
    if (users.some(u => u.phone === userData.phone)) {
      throw new Error('Số điện thoại này đã được đăng ký!');
    }
    users.push(newUser);
    setLocalData('3t_users', users);
    return newUser;
  },

  async loginUser(phone: string, password?: string, employeeId?: string): Promise<User> {
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList: User[] = [];
        querySnapshot.forEach((doc) => {
          usersList.push(doc.data() as User);
        });
        const user = usersList.find(u => 
          u.phone === phone && 
          u.password === password && 
          (!employeeId || !u.employeeId || u.employeeId.trim().toLowerCase() === employeeId.trim().toLowerCase())
        );
        if (!user) {
          throw new Error('Số điện thoại, mã nhân sự hoặc mật khẩu không chính xác!');
        }
        return user;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
    }

    // Fallback LocalStorage
    const users = getLocalData<User[]>('3t_users', []);
    const user = users.find(u => u.phone === phone);
    if (!user) {
      throw new Error('Tài khoản này chưa tồn tại!');
    }
    if (employeeId && user.employeeId && user.employeeId.trim().toLowerCase() !== employeeId.trim().toLowerCase()) {
      throw new Error('Mã nhân sự không khớp với số điện thoại đã đăng ký!');
    }
    if (password && user.password !== password) {
      throw new Error('Mật khẩu không chính xác!');
    }
    return user;
  },

  async getUsers(): Promise<User[]> {
    if (isFirebaseConfigured && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users: User[] = [];
        querySnapshot.forEach((doc) => {
          users.push(doc.data() as User);
        });
        return users;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
    }

    return getLocalData<User[]>('3t_users', [defaultAdmin]);
  },

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'users', userId), data);
        return;
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
    }

    const users = getLocalData<User[]>('3t_users', []);
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      setLocalData('3t_users', users);
    }
  },

  async deleteUser(userId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      }
    }

    const users = getLocalData<User[]>('3t_users', []);
    const filtered = users.filter(u => u.id !== userId);
    setLocalData('3t_users', filtered);
  },

  // Questions Manager
  async getQuestions(): Promise<Question[]> {
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
    return this.saveQuestions([q]);
  },

  async deleteQuestion(id: string): Promise<void> {
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
