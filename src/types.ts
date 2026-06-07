export interface User {
  id: string;
  name: string;
  phone: string;
  password?: string;
  role: 'employee' | 'approver' | 'admin';
  company?: string;
  department: string;
  branch: string;
  status: 'pending' | 'approved' | 'rejected' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  employeeId?: string;
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
    departments: {
      id: string;
      name: string;
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
