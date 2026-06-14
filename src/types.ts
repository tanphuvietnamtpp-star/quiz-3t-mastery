export interface User {
  id: string;
  name: string;
  phone: string;
  password?: string;
  role: 'employee' | 'approver' | 'admin' | 'executive';
  company?: string;
  department: string;
  branch: string;
  status: 'pending' | 'approved' | 'rejected' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  approvedAt?: string;
  employeeId?: string;
  canViewStats?: boolean;
  lastActive?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  imageUrl?: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  userName: string;
  company?: string;
  department: string;
  branch: string;
  score: number;
  totalQuestions: number;
  date: string; // dd/mm/yy
  timestamp: number;
  answers: {
    questionId: string;
    selectedIndex: number;
    correct: boolean;
    timeSpent?: number;
    score?: number;
  }[];
  duration: number; // in seconds
}

export interface Department {
  id: string;
  name: string;
  branch: string;
}

export interface CompanyMapping {
  id: string;
  name: string;
  branches: {
    id: string;
    name: string;
    excludeFromStats?: boolean;
    departments: {
      id: string;
      name: string;
      excludeFromStats?: boolean;
    }[];
  }[];
}

export const BRANCHES = [
  'Văn Phòng Nam Kỳ',
  'Hội sở chính',
  'Chi nhánh miền Nam',
  'Chi nhánh miền Bắc',
  'Chi nhánh miền Trung',
  'Chi nhánh miền Tây'
] as const;

export const DEPARTMENTS = [
  'Phòng Quản Lý Chất Lượng (QLCL)',
  'Phòng Sản Xuất',
  'Phòng Nhân Sự',
  'Phòng Kế Toán',
  'Phòng Kinh Doanh',
  'Phòng Kỹ Thuật',
  'Phòng Kho Vận'
] as const;

export interface MotivationalSloganBand {
  id: string;
  minScore: number;
  maxScore: number;
  slogan: string;
  slogans?: string[];
}

export interface LevelRuleItem {
  level: number;
  name: string;
  emoji: string;
  promotion: string;
  demotion: string;
  maxTime: string;
  reactionPoints: string[];
}

export interface LevelRulesConfig {
  id?: string;
  introduction: string;
  inactivityTitle: string;
  inactivityRule1: string;
  inactivityRule2: string;
  levels: LevelRuleItem[];
}
