import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { databaseService, getQuotaStats } from '../firebase';
import { User, Question, QuizResult, BRANCHES, DEPARTMENTS, CompanyMapping, MotivationalSloganBand } from '../types';
import { INITIAL_QUESTIONS } from '../data/mockQuestions';
import { 
  Users, HelpCircle, ImagePlus, QrCode, AlertTriangle, 
  Trash2, Plus, Sparkles, LogOut, CheckCircle2, UserCheck, 
  RefreshCcw, UserMinus, FileDown, Upload, Pencil, Lock, BarChart3,
  Database, Building, Briefcase, Landmark, Home, ChevronDown, ChevronUp,
  ShieldCheck, ShieldAlert, Zap, Activity, Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StatsDashboard from './StatsDashboard';
import { cleanOptionText, formatDate } from '../utils/format';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onSimulateEmployee: () => void;
  slogan: string;
  onUpdateSlogan: (slogan: string) => void;
  difficulty?: number;
  onUpdateDifficulty?: (newLevel: number) => void;
  initialTab?: 'users' | 'questions' | 'add_images' | 'qr' | 'stats' | 'encoding' | 'firebase_data';
  maintenanceObj: { isMaintenance: boolean; message: string };
  onUpdateMaintenance: (isMaintenance: boolean, message: string) => void;
  motivationalSlogans?: MotivationalSloganBand[];
  onUpdateMotivationalSlogans?: (newValue: MotivationalSloganBand[]) => void;
}

export default function AdminDashboard({ 
  user, 
  onLogout, 
  onSimulateEmployee, 
  slogan, 
  onUpdateSlogan, 
  difficulty = 1,
  onUpdateDifficulty,
  initialTab,
  maintenanceObj,
  onUpdateMaintenance,
  motivationalSlogans = [],
  onUpdateMotivationalSlogans
}: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  
  const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'add_images' | 'qr' | 'stats' | 'encoding' | 'firebase_data'>('users');
  const [isSlogansExpanded, setIsSlogansExpanded] = useState(false);
  const [localBands, setLocalBands] = useState<MotivationalSloganBand[]>([]);

  // Real-time online users calculation (active in last 240 seconds / 4 minutes, robust against device clock drift)
  const onlineUsers = users.filter((u) => {
    if (!u.lastActive) return false;
    return Math.abs(Date.now() - u.lastActive) <= 240000;
  });

  // Group online users by branch / representative office
  const onlineByBranch = onlineUsers.reduce((acc, u) => {
    const branchName = u.branch ? u.branch.trim() : 'Chưa phân chi nhánh';
    acc[branchName] = (acc[branchName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (motivationalSlogans && motivationalSlogans.length > 0) {
      setLocalBands(motivationalSlogans.map(item => {
        if (!item.slogans || !Array.isArray(item.slogans) || item.slogans.length === 0) {
          return {
            ...item,
            slogans: [item.slogan || '']
          };
        }
        return item;
      }));
    } else {
      setLocalBands([
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
      ]);
    }
  }, [motivationalSlogans]);

  const handleLocalSloganIndexChange = (bandId: string, sloganIndex: number, newValue: string) => {
    setLocalBands(prev => prev.map(band => {
      if (band.id === bandId) {
        const updatedSlogans = [...(band.slogans || [band.slogan])];
        updatedSlogans[sloganIndex] = newValue;
        return {
          ...band,
          slogans: updatedSlogans,
          slogan: updatedSlogans[0] || ''
        };
      }
      return band;
    }));
  };

  const handleAddSloganSlot = (bandId: string) => {
    setLocalBands(prev => prev.map(band => {
      if (band.id === bandId) {
        const updatedSlogans = [...(band.slogans || [band.slogan]), ''];
        return {
          ...band,
          slogans: updatedSlogans
        };
      }
      return band;
    }));
  };

  const handleRemoveSloganSlot = (bandId: string, sloganIndex: number) => {
    setLocalBands(prev => prev.map(band => {
      if (band.id === bandId) {
        const updatedSlogans = [...(band.slogans || [band.slogan])];
        if (updatedSlogans.length <= 1) {
          alert('Mỗi nhóm phải có tối thiểu 1 Slogan hâm nóng ý chí!');
          return band;
        }
        updatedSlogans.splice(sloganIndex, 1);
        return {
          ...band,
          slogans: updatedSlogans,
          slogan: updatedSlogans[0] || ''
        };
      }
      return band;
    }));
  };

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // States for Editing and Deleting Users
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [editingMapping, setEditingMapping] = useState<{
    type: 'company' | 'branch' | 'department';
    coId: string;
    brId?: string;
    deptId?: string;
    oldName: string;
    newName: string;
  } | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editBranch, setEditBranch] = useState('');
  
  // Dynamic Encoding management state
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [selectedCoId, setSelectedCoId] = useState<string>('');
  const [selectedBrId, setSelectedBrId] = useState<string>('');
  
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editRole, setEditRole] = useState<'employee' | 'approver' | 'admin'>('employee');
  const [editStatus, setEditStatus] = useState<'approved' | 'pending' | 'rejected'>('pending');
  const [editPassword, setEditPassword] = useState('');
  const [editCanViewStats, setEditCanViewStats] = useState(false);

  // States for 'DỮ LIỆU' - Firebase Quota Integrity & Optimization Center
  const [quota, setQuota] = useState(getQuotaStats());
  const [oldResultCount, setOldResultCount] = useState<number | null>(null);
  const [oldResultIds, setOldResultIds] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setQuota(getQuotaStats());
  }, [results]);

  const firebaseQuotaLimits = {
    reads: 50000,
    writes: 20000,
    deletes: 20000
  };

  const readPercent = Math.min(100, parseFloat(((quota.reads / firebaseQuotaLimits.reads) * 100).toFixed(2)));
  const writePercent = Math.min(100, parseFloat(((quota.writes / firebaseQuotaLimits.writes) * 100).toFixed(2)));
  const deletePercent = Math.min(100, parseFloat(((quota.deletes / firebaseQuotaLimits.deletes) * 100).toFixed(2)));

  const getProgressColor = (percent: number) => {
    if (percent > 80) return 'bg-red-500';
    if (percent > 40) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getTextColor = (percent: number) => {
    if (percent > 80) return 'text-red-600';
    if (percent > 40) return 'text-amber-600';
    return 'text-green-600';
  };

  const runHistoricalAnalysis = async () => {
    setIsAnalyzing(true);
    setCleanMessage(null);
    try {
      const allRes = await databaseService.getQuizResults(false);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const oldRes = allRes.filter(r => r.timestamp < thirtyDaysAgo);
      setOldResultCount(oldRes.length);
      setOldResultIds(oldRes.map(r => r.id));
    } catch (err: any) {
      console.error("Lỗi khi phân tích dữ liệu lịch sử:", err);
      setCleanMessage({ type: 'error', text: 'Không thể phân tích dữ liệu Firestore để dọn dẹp.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCleanOldResults = async () => {
    if (oldResultIds.length === 0) return;
    
    const confirmClean = window.confirm(
      `Hành động Bảo Trì:\nBạn có chắc chắn muốn dọn dẹp và xóa vĩnh viễn ${oldResultIds.length} kết quả thi thử cũ từ tháng trước (>30 ngày trước) không?\n\nHành động này không thể hoàn tác, sẽ giải phóng dung lượng và giúp bảo toàn quota đọc của bạn.`
    );
    if (!confirmClean) return;

    setIsCleaning(true);
    setCleanMessage(null);
    try {
      const deletedCount = await databaseService.deleteQuizResults(oldResultIds);
      setCleanMessage({
        type: 'success',
        text: `Dọn dẹp thành công! Đã xóa vĩnh viễn ${deletedCount} kết quả thi thử cũ khỏi Cloud Firestore.`
      });
      setOldResultCount(0);
      setOldResultIds([]);
      await loadData(true);
      setQuota(getQuotaStats());
    } catch (err: any) {
      console.error("Lỗi khi xóa kết quả:", err);
      setCleanMessage({
        type: 'error',
        text: 'Có lỗi xảy ra trong quá trình dọn dẹp. Vui lòng thử lại.'
      });
    } finally {
      setIsCleaning(false);
    }
  };

  // States for Manual Question Form
  const [manualText, setManualText] = useState('');
  const [manualOptions, setManualOptions] = useState(['', '', '', '']);
  const [manualCorrect, setManualCorrect] = useState(0);
  const [manualExp, setManualExp] = useState('');

  // States for Image extraction
  const [selectedImages, setSelectedImages] = useState<{ file: File; compressedBase64: string }[]>([]);
  const [extractedQuestions, setExtractedQuestions] = useState<(Question & { isDuplicate: boolean; duplicateOriginal?: string })[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [customQrUrl, setCustomQrUrl] = useState('https://quiz3t.vercel.app');
  const [showQrNotice, setShowQrNotice] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const allUsers = await databaseService.getUsers();
      setUsers(allUsers);

      const allQs = await databaseService.getQuestions();
      setQuestions(allQs);

      const allRes = await databaseService.getQuizResults(false, forceRefresh);
      setResults(allRes);

      const allMappings = await databaseService.getCompanyMappings();
      setCompanyMappings(allMappings);
      if (allMappings.length > 0 && !selectedCoId) {
        setSelectedCoId(allMappings[0].id);
        if (allMappings[0].branches.length > 0) {
          setSelectedBrId(allMappings[0].branches[0].id);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time onSnapshot listener so that new registrations immediately pop up for Admin
    const unsubscribe = databaseService.subscribeUsers((allUsers) => {
      setUsers(allUsers);
    });
    return () => unsubscribe();
  }, []);

  // Seed question action
  const handleSeedQuestions = async () => {
    try {
      setLoading(true);
      await databaseService.saveQuestions(INITIAL_QUESTIONS);
      setNotice({ type: 'success', msg: 'Đã khởi tạo bộ đề gốc 07 câu hỏi 3T ban đầu thành công!' });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Khởi tạo bộ đề gốc thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  // User Administration Operations
  const handleToggleRole = async (userId: string, currentRole: 'employee' | 'approver' | 'admin') => {
    const newRole = currentRole === 'employee' ? 'approver' : 'employee';
    try {
      await databaseService.updateUser(userId, { role: newRole });
      setNotice({ type: 'success', msg: `Đã thay đổi quyền tài khoản thành công.` });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật phân quyền.' });
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'approved' });
      setNotice({ type: 'success', msg: 'Đã kích hoạt phê duyệt CBNV thành công.' });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Phê duyệt tài khoản thất bại.' });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'rejected' });
      setNotice({ type: 'success', msg: 'Đã chặn/từ chối CBNV thành công.' });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Chặn tài khoản thất bại.' });
    }
  };

  const handleToggleStatsPermission = async (userId: string, currentPermission: boolean) => {
    try {
      const newPerm = !currentPermission;
      await databaseService.updateUser(userId, { canViewStats: newPerm });
      setNotice({ 
        type: 'success', 
        msg: `Đã ${newPerm ? 'cấp' : 'thu hồi'} quyền xem thống kê cho CBNV thành công.` 
      });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Thay đổi quyền xem thống kê thất bại.' });
    }
  };

  const handleOpenEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditName(targetUser.name || '');
    setEditPhone(targetUser.phone || '');
    setEditEmployeeId(targetUser.employeeId || '');
    
    // Normalize values to NFC and trim them
    const userCo = (targetUser.company || 'TÂN PHÚ VIỆT NAM').trim().normalize('NFC');
    const userBr = (targetUser.branch || '').trim().normalize('NFC');
    const userDept = (targetUser.department || '').trim().normalize('NFC');

    // Find closest matching company in mappings
    const matchedCo = companyMappings.find(c => c.name.trim().normalize('NFC') === userCo) 
      || companyMappings.find(c => c.name.trim().normalize('NFC').includes(userCo))
      || companyMappings[0];

    // Find legacy matched branch, or default to first branch
    const matchedBr = matchedCo?.branches.find(b => b.name.trim().normalize('NFC') === userBr)
      || matchedCo?.branches.find(b => b.name.trim().normalize('NFC').includes(userBr))
      || matchedCo?.branches[0];

    // Find legacy matched department, or default to first department
    const matchedDept = matchedBr?.departments.find(d => d.name.trim().normalize('NFC') === userDept)
      || matchedBr?.departments.find(d => d.name.trim().normalize('NFC').includes(userDept))
      || matchedBr?.departments[0];

    setEditCompany(matchedCo ? matchedCo.name : (targetUser.company || 'TÂN PHÚ VIỆT NAM'));
    setEditBranch(matchedBr ? matchedBr.name : (targetUser.branch || ''));
    setEditDepartment(matchedDept ? matchedDept.name : (targetUser.department || ''));

    setEditRole(targetUser.role || 'employee');
    setEditStatus(targetUser.status || 'pending');
    setEditPassword(targetUser.password || '123');
    setEditCanViewStats(targetUser.canViewStats || false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editPhone.trim()) {
      setNotice({ type: 'error', msg: 'Họ tên và Số điện thoại không được để trống!' });
      return;
    }

    try {
      setLoading(true);
      const finalName = editName.trim().toUpperCase();
      await databaseService.updateUser(editingUser.id, {
        name: finalName,
        phone: editPhone.trim(),
        employeeId: editEmployeeId.trim(),
        company: editCompany,
        department: editDepartment,
        branch: editBranch,
        role: editRole,
        status: editStatus,
        password: editPassword,
        canViewStats: editCanViewStats
      });
      setNotice({ type: 'success', msg: `Đã cập nhật thông tin CBNV "${finalName}" thành công!` });
      setEditingUser(null);
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật thông tin CBNV.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      await databaseService.deleteUser(userId);
      setNotice({ type: 'success', msg: 'Đã xóa tài khoản CBNV khỏi hệ thống thành công!' });
      setUserToDelete(null);
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi xóa tài khoản CBNV.' });
    } finally {
      setLoading(false);
    }
  };

  // Encoding Management logic helpers
  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    const newCo: CompanyMapping = {
      id: 'co_' + Math.random().toString(36).substring(2, 9),
      name: newCompanyName.trim(),
      branches: []
    };
    const updated = [...companyMappings, newCo];
    try {
      setLoading(true);
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      setNewCompanyName('');
      setSelectedCoId(newCo.id);
      setNotice({ type: 'success', msg: `Đã thêm Công Ty Thành Viên "${newCo.name}" thành công!` });
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi thêm công ty thành viên.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    if (!newBranchName.trim() || !selectedCoId) return;
    const updated = companyMappings.map(co => {
      if (co.id === selectedCoId) {
        return {
          ...co,
          branches: [
            ...co.branches,
            {
              id: 'br_' + Math.random().toString(36).substring(2, 9),
              name: newBranchName.trim(),
              departments: []
            }
          ]
        };
      }
      return co;
    });
    try {
      setLoading(true);
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      setNewBranchName('');
      setNotice({ type: 'success', msg: `Đã thêm Chi nhánh / Văn phòng mới!` });
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi thêm chi nhánh.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim() || !selectedCoId || !selectedBrId) return;
    const updated = companyMappings.map(co => {
      if (co.id === selectedCoId) {
        return {
          ...co,
          branches: co.branches.map(br => {
            if (br.id === selectedBrId) {
              return {
                ...br,
                departments: [
                  ...br.departments,
                  {
                    id: 'dept_' + Math.random().toString(36).substring(2, 9),
                    name: newDepartmentName.trim()
                  }
                ]
              };
            }
            return br;
          })
        };
      }
      return co;
    });
    try {
      setLoading(true);
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      setNewDepartmentName('');
      setNotice({ type: 'success', msg: `Đã thêm Bộ phận / Đơn vị mới!` });
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi thêm bộ phận.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompanyMapping = (coId: string) => {
    const co = companyMappings.find(c => c.id === coId);
    if (!co) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa Công ty',
      message: `Bạn có chắc chắn muốn xóa Công ty "${co.name}" cùng tất cả Chi nhánh, Bộ phận trực thuộc? Hành động này không thể hoàn tác!`,
      onConfirm: async () => {
        const updated = companyMappings.filter(c => c.id !== coId);
        try {
          setLoading(true);
          await databaseService.saveCompanyMappings(updated);
          setCompanyMappings(updated);
          if (selectedCoId === coId) {
            setSelectedCoId('');
            setSelectedBrId('');
          }
          setNotice({ type: 'success', msg: `Đã xóa Công ty "${co.name}" thành công.` });
        } catch (err) {
          setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi xóa.' });
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleDeleteBranchMapping = (coId: string, brId: string) => {
    const co = companyMappings.find(c => c.id === coId);
    const br = co?.branches.find(b => b.id === brId);
    if (!co || !br) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa Chi nhánh',
      message: `Bạn có chắc chắn muốn xóa Chi nhánh "${br.name}" cùng tất cả Bộ phận trực thuộc? Hành động này không thể hoàn tác!`,
      onConfirm: async () => {
        const updated = companyMappings.map(c => {
          if (c.id === coId) {
            return {
              ...c,
              branches: c.branches.filter(b => b.id !== brId)
            };
          }
          return c;
        });
        try {
          setLoading(true);
          await databaseService.saveCompanyMappings(updated);
          setCompanyMappings(updated);
          if (selectedBrId === brId) {
            setSelectedBrId('');
          }
          setNotice({ type: 'success', msg: `Đã xóa Chi nhánh "${br.name}".` });
        } catch (err) {
          setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi xóa.' });
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleDeleteDepartmentMapping = (coId: string, brId: string, deptId: string) => {
    const co = companyMappings.find(c => c.id === coId);
    const br = co?.branches.find(b => b.id === brId);
    const dept = br?.departments.find(d => d.id === deptId);
    if (!co || !br || !dept) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa Bộ phận',
      message: `Bạn có chắc chắn muốn xóa Bộ phận/Đơn vị "${dept.name}"? Hành động này không thể hoàn tác!`,
      onConfirm: async () => {
        const updated = companyMappings.map(c => {
          if (c.id === coId) {
            return {
              ...c,
              branches: c.branches.map(b => {
                if (b.id === brId) {
                  return {
                    ...b,
                    departments: b.departments.filter(d => d.id !== deptId)
                  };
                }
                return b;
              })
            };
          }
          return c;
        });
        try {
          setLoading(true);
          await databaseService.saveCompanyMappings(updated);
          setCompanyMappings(updated);
          setNotice({ type: 'success', msg: `Đã xóa Bộ phận "${dept.name}".` });
        } catch (err) {
          setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi xóa.' });
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleEditMapping = async () => {
    if (!editingMapping || !editingMapping.newName.trim()) return;
    const { type, coId, brId, deptId, oldName, newName } = editingMapping;
    const trimmedNewName = newName.trim();
    if (trimmedNewName === oldName) {
      setEditingMapping(null);
      return;
    }

    setLoading(true);
    try {
      // 1. Update company mappings array structure
      const updated = companyMappings.map(co => {
        if (type === 'company' && co.id === coId) {
          return { ...co, name: trimmedNewName };
        }
        if (co.id === coId) {
          return {
            ...co,
            branches: co.branches.map(br => {
              if (type === 'branch' && br.id === brId) {
                return { ...br, name: trimmedNewName };
              }
              if (br.id === brId) {
                return {
                  ...br,
                  departments: br.departments.map(dept => {
                    if (type === 'department' && dept.id === deptId) {
                      return { ...dept, name: trimmedNewName };
                    }
                    return dept;
                  })
                };
              }
              return br;
            })
          };
        }
        return co;
      });

      // Save structural change
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);

      // Extract details for related profile synchronization
      const currentCo = companyMappings.find(c => c.id === coId);
      const currentBr = currentCo?.branches.find(b => b.id === brId);

      const extra = {
        companyName: currentCo?.name || '',
        branchName: currentBr?.name || ''
      };

      // 2. Sync profile fields & quiz results under the cloud or local db
      const syncRes = await (databaseService as any).syncMappingNames(type, oldName, trimmedNewName, extra);

      setNotice({ 
        type: 'success', 
        msg: `Đã chỉnh sửa thành công và đồng bộ cho ${syncRes.usersUpdated} tài khoản, ${syncRes.resultsUpdated} kết quả liên quan.` 
      });
      setEditingMapping(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật và đồng bộ liên kết.' });
    } finally {
      setLoading(false);
    }
  };

  // Add Manual Question
  const handleAddManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText || manualOptions.some(o => !o) || !manualExp) {
      setNotice({ type: 'error', msg: 'Vui lòng điền hoàn chỉnh nội dung câu hỏi!' });
      return;
    }

    // Duplicate Check
    const isDuplicate = questions.some(q => q.text.trim().toLowerCase() === manualText.trim().toLowerCase());
    if (isDuplicate) {
      setNotice({ type: 'error', msg: 'Câu hỏi này đã tồn tại trong Ngân hàng đề!' });
      return;
    }

    const newQ: Question = {
      id: 'q_admin_' + Math.random().toString(36).substring(2, 9),
      text: manualText.trim(),
      options: manualOptions.map(o => cleanOptionText(o.trim())),
      correctAnswerIndex: manualCorrect,
      explanation: manualExp.trim()
    };

    try {
      await databaseService.saveQuestion(newQ);
      setNotice({ type: 'success', msg: 'Thêm câu hỏi mới vào ngân hàng đề thành công!' });
      setManualText('');
      setManualOptions(['', '', '', '']);
      setManualExp('');
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Không thể lưu câu hỏi mới.' });
    }
  };

  // Compression helper (Canvas-based Resizer & quality compressor to maintain quotas)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension scaling constraint (e.g. 1024px maximum edge to preserve bandwidth)
          const MAX_SIZE = 1024;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress with high compression quality 0.65 JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            // Extract the pure base64 chunk from Data URL
            const base64Chunk = dataUrl.split(',')[1];
            resolve(base64Chunk);
          } else {
            reject(new Error("Không thể khởi tạo môi trường vẽ canvas."));
          }
        };
        img.onerror = () => reject(new Error("Lỗi khi đọc file ảnh."));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Lỗi khi tải file."));
      reader.readAsDataURL(file);
    });
  };

  // Image Selection Processor
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setNotice(null);
    setLoading(true);

    const promises = Array.from(files).map(async (file: File) => {
      try {
        const compressed = await compressImage(file);
        return { file, compressedBase64: compressed };
      } catch (err) {
        console.error("Compression error:", err);
        return null;
      }
    });

    const results = (await Promise.all(promises)).filter((r): r is { file: File; compressedBase64: string } => r !== null);
    setSelectedImages(prev => [...prev, ...results]);
    setLoading(false);
  };

  // Gemini Extraction & Automatic Duplicate Filter Comparison
  const handleExtractWithAI = async () => {
    if (selectedImages.length === 0) return;
    setNotice(null);
    setExtracting(true);

    try {
      // Map base64 representations
      const imagePayloads = selectedImages.map(img => ({
        mimeType: img.file.type || "image/jpeg",
        data: img.compressedBase64
      }));

      // Post payload to Backend endpoint
      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagePayloads })
      });

      if (!response.ok) {
        const errResult = await response.json();
        throw new Error(errResult.error || "Gặp lỗi trong tiến trình giải mã hình ảnh.");
      }

      const result = await response.json();
      const aiQuestions: Question[] = result.questions || [];

      if (aiQuestions.length === 0) {
        setNotice({ type: 'error', msg: 'Không tìm thấy câu hỏi trắc nghiệm hợp lệ nào trong các hình ảnh đã chọn.' });
        setExtracting(false);
        return;
      }

      // Automatically check for duplication compared to our active questions database (Semantic/Word overlap comparison)
      const formattedWithDuplicates = aiQuestions.map(extracted => {
        // Find if normalized text overlaps or strictly exists
        const normExtracted = extracted.text.replace(/\s+/g, '').toLowerCase();
        
        const duplicateMatch = questions.find(existing => {
          const normExisting = existing.text.replace(/\s+/g, '').toLowerCase();
          // Substring or overlap matching
          return normExisting.includes(normExtracted) || normExtracted.includes(normExisting);
        });

        return {
          ...extracted,
          isDuplicate: !!duplicateMatch,
          duplicateOriginal: duplicateMatch?.text
        };
      });

      setExtractedQuestions(formattedWithDuplicates);
      setNotice({ type: 'success', msg: `Bóc tách thành công ${aiQuestions.length} câu hỏi bằng trí tuệ nhân tạo Gemini!` });

    } catch (err: any) {
      console.error(err);
      setNotice({ type: 'error', msg: err.message || 'Lỗi bóc tác dữ liệu bằng AI. Vui lòng thử lại.' });
    } finally {
      setExtracting(false);
    }
  };

  // Save approved AI extracted questions to global Database
  const handleSaveExtractedQuestions = async () => {
    const validQuestions = extractedQuestions.filter(q => !q.isDuplicate);
    if (validQuestions.length === 0) {
      setNotice({ type: 'error', msg: 'Tất cả câu hỏi bóc tách đều nằm thế trùng lặp. Không có dữ liệu lưu trữ mới.' });
      return;
    }

    // Chuẩn hóa và làm sạch dữ liệu câu hỏi trước khi lưu vào Firestore để tránh lỗi unsupported field value: undefined
    const cleanQuestions: Question[] = validQuestions.map(q => {
      const cleanQ: Question = {
        id: q.id,
        text: q.text,
        options: q.options.map(o => cleanOptionText(o)),
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation
      };
      if (q.imageUrl) {
        cleanQ.imageUrl = q.imageUrl;
      }
      return cleanQ;
    });

    try {
      setLoading(true);
      await databaseService.saveQuestions(cleanQuestions);
      setNotice({ type: 'success', msg: `Đã lưu thành công ${cleanQuestions.length} câu hỏi mới vào hệ thống!` });
      setExtractedQuestions([]);
      setSelectedImages([]);
      await loadData();
    } catch (err) {
      console.error("Lỗi lưu câu hỏi bóc tách:", err);
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi lưu ngân hàng đề.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa câu hỏi',
      message: "Bạn có chắc chắn muốn xóa câu hỏi này khỏi hệ thống rèn luyện?",
      onConfirm: async () => {
        try {
          await databaseService.deleteQuestion(id);
          setNotice({ type: 'success', msg: 'Đã xóa câu hỏi khỏi cơ sở dữ liệu.' });
          await loadData();
        } catch (err) {
          setNotice({ type: 'error', msg: 'Xóa câu hỏi thất bại.' });
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  // Notifications and badge calculations
  const pendingUsersCount = users.filter(u => u.status?.toLowerCase() === 'pending').length;
  const approvedUsersCount = users.filter(u => u.status?.toLowerCase() === 'approved').length;
  const totalQuestionsCount = questions.length;
  const todayStr = formatDate(new Date());
  const todayResults = results.filter(r => r.date === todayStr);
  const participantsTodayCount = new Set(todayResults.map(r => r.userId)).size;
  const attemptsTodayCount = todayResults.length;

  const handleExportUsers = () => {
    try {
      const seenKeys = new Set<string>();
      const dedupedRaw = users.filter((item) => {
        if (!item || !item.id || !item.name || !item.phone) return false;
        const nameTrim = item.name.trim();
        const phoneTrim = item.phone.trim();
        if (!nameTrim || !phoneTrim) return false;

        const uniqueKey = `${nameTrim}_${phoneTrim}`;
        if (seenKeys.has(uniqueKey)) return false;
        seenKeys.add(uniqueKey);
        return true;
      });

      const sortedUsers = [...dedupedRaw].sort((a, b) => {
        const isALNT = (a.name || '').trim().normalize('NFC').toLowerCase().includes('lê nhật trường') || a.phone?.trim() === '0907767304';
        const isBLNT = (b.name || '').trim().normalize('NFC').toLowerCase().includes('lê nhật trường') || b.phone?.trim() === '0907767304';
        
        if (isALNT && !isBLNT) return -1;
        if (!isALNT && isBLNT) return 1;

        const aPending = a.status?.toLowerCase() === 'pending';
        const bPending = b.status?.toLowerCase() === 'pending';
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
        return 0;
      });

      const exportRows = sortedUsers.map(u => ({
        'Họ và Tên': u.name,
        'SĐT': u.phone,
        'Mã NS': u.employeeId || '',
        'Thuộc Bộ Phận': u.department || '',
        'Chi nhánh': u.branch || '',
        'Vai trò phân cấp': u.role === 'admin' ? 'Chủ Admin' : u.role === 'approver' ? 'Duyệt viên (Trưởng BP)' : 'CBNV',
        'Trạng thái': u.status?.toLowerCase() === 'approved' ? 'Đã hoạt động' : u.status?.toLowerCase() === 'pending' ? 'Chờ duyệt (PENDING)' : 'Tạm khóa',
        'Mật khẩu': u.password || '123456',
        'Mã ID Hệ Thống': u.id,
        'Ngày tạo': u.createdAt || new Date().toISOString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sach CBNV");

      // Auto fit column widths
      const maxLens = Object.keys(exportRows[0] || {}).map((key) => {
        const keyLen = key.length;
        const maxValLen = exportRows.reduce((max, row: any) => {
          const val = row[key] ? row[key].toString() : '';
          return Math.max(max, val.length);
        }, 0);
        return { wch: Math.max(keyLen, maxValLen) + 3 };
      });
      worksheet['!cols'] = maxLens;

      XLSX.writeFile(workbook, `Danh_Sach_CBNV_3T_Mastery_${new Date().toISOString().split('T')[0]}.xlsx`);
      setNotice({ type: 'success', msg: 'Xuất danh sách file Excel thành công!' });
    } catch (err: any) {
      console.error(err);
      setNotice({ type: 'error', msg: `Lỗi xuất excel: ${err.message || 'vui lòng thử lại.'}` });
    }
  };

  const handleImportUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawRows.length === 0) {
          setNotice({ type: 'error', msg: 'File không chứa bất kỳ dữ liệu nào để nhập!' });
          return;
        }

        let importCount = 0;
        let skippedCount = 0;

        for (const row of rawRows) {
          const name = (row['Họ và Tên'] || row['Name'] || row['name'] || '').toString().trim().toUpperCase();
          const phone = (row['SĐT'] || row['Sđt'] || row['Phone'] || row['phone'] || '').toString().trim();
          
          if (!name || !phone) {
            skippedCount++;
            continue;
          }

          const employeeId = (row['Mã NS'] || row['EmployeeID'] || row['employeeId'] || row['mã ns'] || '').toString().trim();
          const department = (row['Thuộc Bộ Phận'] || row['Bộ Phận'] || row['Department'] || row['department'] || '').toString().trim();
          const branch = (row['Chi nhánh'] || row['Branch'] || row['branch'] || '').toString().trim();
          
          const rawRole = (row['Vai trò phân cấp'] || row['Role'] || row['role'] || '').toString().trim().toLowerCase();
          let role: 'employee' | 'approver' | 'admin' = 'employee';
          if (rawRole.includes('admin') || rawRole.includes('chủ') || rawRole === 'admin') {
            role = 'admin';
          } else if (rawRole.includes('duyệt') || rawRole.includes('trưởng') || rawRole.includes('approver') || rawRole === 'approver') {
            role = 'approver';
          }

          const rawStatus = (row['Trạng thái'] || row['Status'] || row['status'] || '').toString().trim().toLowerCase();
          let status: 'approved' | 'pending' | 'rejected' | 'APPROVED' | 'PENDING' | 'REJECTED' = 'PENDING';
          if (rawStatus.includes('hoạt động') || rawStatus.includes('approved') || rawStatus.includes('đã') || rawStatus === 'approved') {
            status = 'APPROVED';
          } else if (rawStatus.includes('khóa') || rawStatus.includes('từ chối') || rawStatus.includes('rejected') || rawStatus === 'rejected') {
            status = 'REJECTED';
          }

          const password = (row['Mật khẩu'] || row['Password'] || row['password'] || '123456').toString().trim();
          const idCol = (row['Mã ID Hệ Thống'] || row['Id'] || row['id'] || '').toString().trim();
          const id = idCol || ('usr_' + Math.random().toString(36).substring(2, 9));
          const createdAt = (row['Ngày tạo'] || row['CreatedAt'] || row['createdAt'] || new Date().toISOString()).toString().trim();

          const importedUser: User = {
            id,
            name,
            phone,
            password,
            role,
            company: 'TÂN PHÚ VIỆT NAM',
            department: department || 'Phòng Quản Lý Chất Lượng (QLCL)',
            branch: branch || 'Hội sở chính',
            status,
            createdAt,
            employeeId: employeeId || undefined
          };

          await databaseService.saveUser(importedUser.id, importedUser);
          importCount++;
        }

        setNotice({ 
          type: 'success', 
          msg: `Đã nhập và đồng bộ thành công ${importCount} tài khoản CBNV.` + (skippedCount > 0 ? ` (Bỏ qua ${skippedCount} dòng do thiếu Tên hoặc SĐT)` : '') 
        });
        
        loadData();
      } catch (err: any) {
        console.error(err);
        setNotice({ type: 'error', msg: `Lỗi đọc file Excel: ${err.message || 'định dạng sai, vui lòng kiểm tra lại.'}` });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Bar */}
      <header className="bg-white border-b border-gray-150 py-4 px-6 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-md border border-blue-150">
              <Sparkles className="h-6 w-6 text-[#1971C2]" />
            </span>
            <div>
              <h1 className="text-xl font-sans font-bold text-gray-900 leading-none">
                <span translate="no" className="notranslate">Quản Trị Tối Cao: Lê Nhật Trường</span>
              </h1>
              <p className="text-xs text-[#1971C2] mt-1 font-semibold flex items-center gap-1.5">
                <span translate="no" className="notranslate">Trưởng Phòng Quản lý Chất Lượng (TP.QLCL)</span>
              </p>
            </div>
          </div>

          {/* Real-time active presence tracker grouped by departments/branches (VỊ TRÍ KHOANH ĐỎ) */}
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-emerald-50/45 border border-emerald-150/70 rounded-full px-4.5 py-1.5 shrink-0 shadow-3xs max-w-full md:max-w-md lg:max-w-xl text-center md:text-left">
            <div className="flex items-center gap-1.5 shrink-0 sm:border-r sm:border-emerald-200/50 sm:pr-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black text-emerald-800 tracking-wide uppercase">
                ĐANG ONLINE: {onlineUsers.length}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[10px] font-bold text-slate-650">
              {onlineUsers.length === 0 ? (
                <span className="text-gray-400 font-semibold italic text-[10px]">Không có nhân viên trực tuyến</span>
              ) : (
                Object.entries(onlineByBranch).map(([branchName, count]) => (
                  <span key={branchName} className="bg-white px-2 py-0.5 border border-emerald-100 rounded-full text-emerald-850 flex items-center gap-1 shadow-3xs" title={branchName}>
                    <span className="max-w-[100px] truncate">{branchName}</span>
                    <span className="bg-emerald-150 text-emerald-900 rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] font-black shrink-0">{count}</span>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSimulateEmployee}
              className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 hover:shadow shadow-sm rounded-md py-2 px-3.5 transition-all flex items-center gap-1.5 border border-green-500 font-sans"
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span translate="no" className="notranslate">GIẢ LẬP CBNV</span>
            </button>
            <button
              onClick={onLogout}
              className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-150 rounded-md py-2 px-3 transition-colors flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span translate="no" className="notranslate">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Work Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Dynamic Slogan Admin Customizer Widget */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span translate="no" className="notranslate text-xs font-bold text-blue-700 uppercase tracking-widest block">Slogan Hiện Tại: Văn Hóa 3T</span>
            <p className="text-sm font-bold text-gray-800">
              <span translate="no" className="notranslate">" {slogan} "</span>
            </p>
          </div>

          {/* Cấu hình Mức độ Khó (Segmented Tab) - Trực quan theo Khoanh Đỏ và yêu cầu từ đối tác */}
          <div className="flex flex-col gap-1 items-start md:items-center shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cấp độ khó tính điểm</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[
                { level: 1, label: 'Cấp 1 (Dễ)', tooltip: '90s/câu | Đúng ≤30s: 10đ | ≤40s: 8đ | ≤50s: 6đ | >50s: 5đ' },
                { level: 2, label: 'Cấp 2 (Vừa)', tooltip: '60s/câu | Đúng ≤20s: 10đ | ≤30s: 8đ | ≤40s: 6đ | >40s: 5đ' },
                { level: 3, label: 'Cấp 3 (Khó)', tooltip: '30s/câu | Đúng ≤10s: 10đ | ≤15s: 8đ | ≤20s: 6đ | >20s: 5đ' },
              ].map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => onUpdateDifficulty && onUpdateDifficulty(opt.level)}
                  className={`px-3 py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer whitespace-nowrap outline-none ${
                    difficulty === opt.level
                      ? 'bg-gradient-to-r from-blue-600 to-[#1971C2] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-850 hover:bg-slate-200/60'
                  }`}
                  title={opt.tooltip}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <input 
              type="text" 
              placeholder="Nhập Slogan mới..." 
              id="new-slogan-input"
              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 outline-none focus:border-[#1971C2] bg-white flex-1 md:w-64 font-sans text-gray-800"
              defaultValue={slogan}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.currentTarget;
                  if (target.value.trim()) {
                    onUpdateSlogan(target.value.trim());
                    alert("Cập nhật Slogan mới thành công!");
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.getElementById('new-slogan-input') as HTMLInputElement;
                if (input && input.value.trim()) {
                  onUpdateSlogan(input.value.trim());
                  alert("Cập nhật Slogan mới thành công!");
                }
              }}
              className="px-3.5 py-1.5 bg-[#1971C2] hover:bg-opacity-95 text-white text-xs font-bold rounded-md transition-all whitespace-nowrap shadow-sm font-sans"
            >
              <span translate="no" className="notranslate">Cập nhật</span>
            </button>
          </div>
        </div>

        {/* Expandable Slogan Bands Customizer Panel */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <button 
            type="button"
            onClick={() => setIsSlogansExpanded(!isSlogansExpanded)}
            className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors focus:outline-hidden border-b border-gray-150"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
              <span translate="no" className="notranslate uppercase tracking-wider block">Cấu hình Danh sách Slogan truyền động lực ngẫu nhiên (MỚI)</span>
            </div>
            {isSlogansExpanded ? <ChevronUp className="h-4.5 w-4.5 text-gray-500" /> : <ChevronDown className="h-4.5 w-4.5 text-gray-500" />}
          </button>

          {isSlogansExpanded && (
            <div className="p-4 space-y-4 bg-white">
              <p className="text-xs text-slate-550 italic leading-relaxed">
                * Quý quản trị viên có thể thêm **nhiều Slogan hâm nóng ý chí** khác nhau cho từng mốc điểm thi. Hệ thống sẽ **tự động chọn ngẫu nhiên** một Slogan trong danh sách dải điểm tương ứng để tạo bất ngờ và truyền động lực cho nhân viên mỗi khi họ hoàn thành bài thi! Sử dụng phím <strong>Enter</strong> để ngắt xuống dòng thủ công.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localBands.map((band) => {
                  let bandLabel = `Mốc điểm ${band.minScore} - ${band.maxScore}`;
                  let bandBadgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
                  
                  if (band.minScore === 30 && band.maxScore === 30) {
                    bandLabel = 'Nhóm xuất sắc, tuyệt đối (30đ)';
                    bandBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  } else if (band.minScore === 20 && band.maxScore === 29) {
                    bandLabel = 'Nhóm Khá & Tốt (20đ - 29đ)';
                    bandBadgeBg = 'bg-blue-50 text-blue-700 border-blue-250';
                  } else if (band.minScore === 15 && band.maxScore === 19) {
                    bandLabel = 'Nhóm Đạt Yêu Cầu (15đ - 19đ)';
                    bandBadgeBg = 'bg-amber-50 text-amber-700 border-amber-250';
                  } else if (band.minScore === 0 && band.maxScore === 14) {
                    bandLabel = 'Nhóm Chưa Đạt (Dưới 15đ)';
                    bandBadgeBg = 'bg-red-50 text-red-700 border-red-200';
                  }

                  const activeSlogans = band.slogans || [band.slogan];

                  return (
                    <div key={band.id} className="p-4 border border-gray-200 rounded-lg bg-slate-50/50 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-gray-200/60">
                          <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">{bandLabel}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${bandBadgeBg}`}>
                            {band.minScore}đ - {band.maxScore}đ
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {activeSlogans.map((slog, idx) => (
                            <div key={idx} className="p-2.5 bg-white border border-gray-200 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-650 tracking-wider">SLOGAN LỰA CHỌN #{idx + 1}</span>
                                {activeSlogans.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSloganSlot(band.id, idx)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                    title="Xóa slogan này"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              <textarea
                                rows={2}
                                value={slog}
                                onChange={(e) => handleLocalSloganIndexChange(band.id, idx, e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs text-gray-800 border border-gray-200 rounded outline-none focus:border-[#1971C2] leading-relaxed whitespace-pre font-sans"
                                placeholder="..."
                              />

                              {/* Dynamic Interactive Mobile Preview */}
                              <div className="bg-red-50/5 border border-dashed border-red-200 p-2 rounded-md">
                                <span className="text-[9px] text-gray-400 font-bold tracking-wider block mb-1">XEM TRƯỚC BẢN DI ĐỘNG (MOBILE PREVIEW):</span>
                                <div className="mx-auto max-w-[260px] text-center">
                                  <span translate="no" className="notranslate text-red-600 italic font-semibold text-[11px] block whitespace-pre-line leading-relaxed">
                                    "{slog ? slog : 'Chưa có slogan configuration...'}"
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddSloganSlot(band.id)}
                          className="w-full py-1.5 border border-dashed border-indigo-300 text-indigo-650 hover:bg-indigo-50/60 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-98"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm Slogan ý chí cho dải điểm này</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={async () => {
                    if (onUpdateMotivationalSlogans) {
                      await onUpdateMotivationalSlogans(localBands);
                      alert("Cập nhật danh sách Slogan truyền động lực thành công!");
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-xs active:scale-95 flex items-center gap-1.5 font-sans cursor-pointer"
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span translate="no" className="notranslate">Lưu danh sách Slogan động lực</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Compact Dynamic Maintenance Admin Customizer Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-md text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[9px] border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-500/10">Bảo trì / Quota</span>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${maintenanceObj.isMaintenance ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="font-semibold text-slate-200">
                  {maintenanceObj.isMaintenance ? '🔴 Đang Khóa App' : '🟢 Bình Thường'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                id="maintenance-msg-input"
                type="text"
                className="px-2 py-1 text-xs border border-slate-700 rounded bg-slate-800 text-slate-200 focus:border-amber-500 outline-none w-52 sm:w-64 max-w-full font-medium"
                placeholder="Nội dung hiển thị..."
                defaultValue={maintenanceObj.message || 'Hệ thống đang tạm khóa để bảo trì phần cứng và đồng bộ cấu trúc mới. Vui lòng quay lại sau ít phút!'}
              />
              <button
                onClick={() => {
                  const msgInput = document.getElementById('maintenance-msg-input') as HTMLInputElement;
                  const finalMsg = msgInput?.value.trim() || 'Hệ thống đang tạm khóa để bảo trì phần cứng và đồng bộ cấu trúc mới. Vui lòng quay lại sau ít phút!';
                  onUpdateMaintenance(maintenanceObj.isMaintenance, finalMsg);
                  alert("Đã lưu nội dung thông báo bảo trì.");
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-bold transition-all active:scale-95"
              >
                Lưu nội dung
              </button>
              <button
                onClick={() => {
                  const msgInput = document.getElementById('maintenance-msg-input') as HTMLInputElement;
                  const finalMsg = msgInput?.value.trim() || 'Hệ thống đang tạm khóa để bảo trì phần cứng và đồng bộ cấu trúc mới. Vui lòng quay lại sau ít phút!';
                  onUpdateMaintenance(!maintenanceObj.isMaintenance, finalMsg);
                  alert(maintenanceObj.isMaintenance ? "Đã dỡ bỏ trạng thái tạm khóa bảo trì thành công!" : "Đã kích hoạt tạm khóa bảo trì toàn hệ thống!");
                }}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-all active:scale-95 uppercase tracking-wider text-white ${
                  maintenanceObj.isMaintenance 
                    ? 'bg-green-600 hover:bg-green-500' 
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {maintenanceObj.isMaintenance ? 'Mở khóa' : 'Tạm khóa app'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Dynamic Alerts */}
        {notice && (
          <div className={`p-4 rounded-md border text-sm flex items-center justify-between gap-3 ${
            notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span translate="no" className="notranslate">{notice.msg}</span>
            <button onClick={() => setNotice(null)} className="text-xs font-bold uppercase shrink-0"><span translate="no" className="notranslate">Đóng</span></button>
          </div>
        )}

        {/* Workspace Tab Bar */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('users'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'users' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Users className="h-[26px] w-[26px] text-current" />
              {pendingUsersCount > 0 && (
                <span className="absolute -top-2 -left-3.5 text-[11px] font-black leading-none bg-rose-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse shadow-xs ring-1.5 ring-white">
                  {pendingUsersCount}
                </span>
              )}
            </div>
            <span translate="no" className="notranslate">PHÊ DUYỆT({approvedUsersCount})</span>
          </button>
          <button
            onClick={() => { setActiveTab('questions'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'questions' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <HelpCircle className="h-[26px] w-[26px] text-current" />
              {totalQuestionsCount > 0 && (
                <span className="absolute -top-2 -left-3.5 text-[11px] font-black leading-none bg-[#1971C2] text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-xs ring-1.5 ring-white">
                  {totalQuestionsCount}
                </span>
              )}
            </div>
            <span translate="no" className="notranslate">CÂU HỎI</span>
          </button>
          <button
            onClick={() => { setActiveTab('add_images'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'add_images' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <ImagePlus className="h-[26px] w-[26px] text-current" />
            </div>
            <span translate="no" className="notranslate">THÊM PIC</span>
          </button>
          <button
            onClick={() => { setActiveTab('qr'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'qr' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <QrCode className="h-[26px] w-[26px] text-current" />
            </div>
            <span translate="no" className="notranslate">MÃ QR</span>
          </button>
          <button
            onClick={() => { setActiveTab('stats'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'stats' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <BarChart3 className="h-[26px] w-[26px] text-current" />
              {participantsTodayCount > 0 && (
                <span className="absolute -top-2 -left-3.5 text-[11px] font-black leading-none bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-xs ring-1.5 ring-white">
                  {participantsTodayCount}
                </span>
              )}
            </div>
            <span translate="no" className="notranslate">THỐNG KÊ</span>
            <motion.span
              key={attemptsTodayCount}
              initial={{ y: 0 }}
              animate={attemptsTodayCount > 0 ? {
                y: [0, -12, 0, -8, 0, -4, 0],
                scale: [1, 1.25, 0.95, 1.1, 0.98, 1.02, 1],
              } : {}}
              transition={{
                duration: 0.8,
                ease: "easeInOut"
              }}
              className={`text-[11px] font-black leading-none rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-xs ring-1.5 ring-white shrink-0 ${
                attemptsTodayCount > 0 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-400 text-white'
              }`}
              title="Số lượt kỳ thi đã thực hiện trong ngày"
            >
              {attemptsTodayCount}
            </motion.span>
          </button>
          <button
            onClick={() => { setActiveTab('encoding'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'encoding' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Database className="h-[26px] w-[26px] text-current" />
            </div>
            <span translate="no" className="notranslate">MÃ HÓA</span>
          </button>
          <button
            onClick={() => { setActiveTab('firebase_data'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'firebase_data' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Server className="h-[26px] w-[26px] text-current" />
            </div>
            <span translate="no" className="notranslate">DỮ LIỆU</span>
          </button>
        </div>

        {/* Viewport Render panels */}
        <AnimatePresence mode="wait">
          
          {/* User Approval Panel View */}
          {activeTab === 'users' && (
            <motion.div
              key="users_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest"><span translate="no" className="notranslate">Danh sách CBNV đăng ký hệ thống</span></h3>
                    <p className="text-xs text-gray-400 mt-0.5"><span translate="no" className="notranslate">Với tư cách Admin tối cao, bạn có thể phê duyệt quyền vào sảnh học tập cho CBNV quốc gia.</span></p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={onSimulateEmployee}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Home className="h-3.5 w-3.5" />
                      <span>MOBILE</span>
                    </button>
                    
                    {/* Export / Import Excel action controls */}
                    <button
                      onClick={handleExportUsers}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 hover:bg-emerald-100 rounded-md shadow-xs transition-all cursor-pointer active:scale-95"
                      title="Xuất danh sách ra file Excel"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>XUẤT EXCEL</span>
                    </button>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-250 hover:bg-blue-100 rounded-md shadow-xs transition-all cursor-pointer active:scale-95">
                      <Upload className="h-3.5 w-3.5" />
                      <span>NHẬP EXCEL</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleImportUsers}
                        className="hidden"
                      />
                    </label>

                    <button 
                      onClick={loadData}
                      className="p-1.5 border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 transition-all"
                      title="Tải lại danh sách"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase border-b border-gray-150">
                        <th className="py-2.5 px-4 font-bold"><span translate="no" className="notranslate">Họ và Tên / SĐT</span></th>
                        <th className="py-2.5 px-4 font-bold"><span translate="no" className="notranslate">Thuộc Bộ Phận / Chi nhánh</span></th>
                        <th className="py-2.5 px-4 font-bold"><span translate="no" className="notranslate">Vai trò phân cấp</span></th>
                        <th className="py-2.5 px-4 font-bold"><span translate="no" className="notranslate">Phê duyệt trạng thái</span></th>
                        <th className="py-2.5 px-4 font-bold text-right text-xs"><span translate="no" className="notranslate">Phân bổ thao tác</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const seenKeys = new Set<string>();
                        // 1. Deduplicate users by Name & Phone to ensure exact unique entries, and automatically clean trash / empty IDs / blank fields
                        const deduped = users.filter((item) => {
                          if (!item || !item.id || !item.name || !item.phone) return false;
                          const nameTrim = item.name.trim();
                          const phoneTrim = item.phone.trim();
                          if (!nameTrim || !phoneTrim) return false;

                          const uniqueKey = `${nameTrim}_${phoneTrim}`;
                          if (seenKeys.has(uniqueKey)) return false;
                          seenKeys.add(uniqueKey);
                          return true;
                        });
                        // 2. Sort: Admin Lê Nhật Trường (supreme admin) first, then pending requests, then other users
                        const sorted = [...deduped].sort((a, b) => {
                          const isALNT = (a.name || '').trim().normalize('NFC').toLowerCase().includes('lê nhật trường') || a.phone?.trim() === '0907767304';
                          const isBLNT = (b.name || '').trim().normalize('NFC').toLowerCase().includes('lê nhật trường') || b.phone?.trim() === '0907767304';
                          
                          if (isALNT && !isBLNT) return -1;
                          if (!isALNT && isBLNT) return 1;

                          const aPending = a.status?.toLowerCase() === 'pending';
                          const bPending = b.status?.toLowerCase() === 'pending';
                          if (aPending && !bPending) return -1;
                          if (!aPending && bPending) return 1;
                          return 0;
                        });

                        if (sorted.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-gray-300 italic">
                                <span translate="no" className="notranslate">Chưa có dữ liệu CBNV đăng ký.</span>
                              </td>
                            </tr>
                          );
                        }

                        return sorted.map((item) => {
                          const isPendingState = item.status?.toLowerCase() === 'pending';
                          const rowBgClass = isPendingState 
                            ? 'bg-yellow-50/90 hover:bg-yellow-100/90 transition-all font-medium border-l-4 border-yellow-400' 
                            : 'hover:bg-gray-50/50 transition-colors';
                          // Standardized unique key (Name + Phone) as requested by user
                          const itemKey = `${item.name.trim()}_${item.phone.trim()}`;

                          return (
                            <tr key={itemKey} className={rowBgClass}>
                              <td className="py-3 px-4 text-gray-800">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span translate="no" className="notranslate font-bold">{item.name}</span>
                                  {item.employeeId && (
                                    <span translate="no" className="notranslate text-[10px] uppercase font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 font-mono">
                                      MS: {item.employeeId}
                                    </span>
                                  )}
                                </div>
                                <span translate="no" className="notranslate block font-sans text-gray-400 font-normal mt-0.5">{item.phone}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span translate="no" className="notranslate">{item.department}</span>
                                <span translate="no" className="notranslate block font-sans text-gray-450 mt-0.5">{item.branch}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                    item.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                    item.role === 'approver' ? 'bg-yellow-50 text-yellow-700 border border-yellow-105' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    <span translate="no" className="notranslate">{item.role === 'admin' ? 'Chủ Admin' : item.role === 'approver' ? 'Duyệt viên (Trưởng BP)' : 'CBNV'}</span>
                                  </span>
                                  {item.canViewStats && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-emerald-150 text-[9px] font-black bg-emerald-50 text-emerald-800 tracking-tight mt-1">
                                      <BarChart3 className="h-3 w-3 text-emerald-600 shrink-0" />
                                      <span>XEM THỐNG KÊ</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full font-bold ${
                                  item.status?.toLowerCase() === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                  isPendingState ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                                  'bg-red-50 text-red-700 border border-red-100'
                                }`}>
                                  <span translate="no" className="notranslate">
                                    {item.status?.toLowerCase() === 'approved' ? 'Đã hoạt động' : 
                                     isPendingState ? 'Chờ duyệt (PENDING)' : 'Tạm khóa'}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2 font-sans">
                                  {item.id !== 'admin_lenhattruong' && item.name !== 'Lê Nhật Trường' && (
                                    <>
                                      {/* Approve / Reject Actions */}
                                      {item.status?.toLowerCase() !== 'approved' ? (
                                        <button
                                          onClick={() => handleApproveUser(item.id)}
                                          className="p-1.5 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                                          title="Phê duyệt tài khoản hoạt động"
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleRejectUser(item.id)}
                                          className="p-1.5 rounded-lg border text-amber-600 bg-amber-50 border-amber-250 hover:bg-amber-100 hover:text-amber-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                                          title="Tạm khóa tài khoản"
                                        >
                                          <Lock className="h-4 w-4" />
                                        </button>
                                      )}

                                      {/* Edit button */}
                                      <button
                                        onClick={() => handleOpenEdit(item)}
                                        className="p-1.5 rounded-lg border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                                        title="Sửa thông tin tài khoản"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>

                                      {/* Toggle role operator */}
                                      {item.role === 'employee' ? (
                                        <button
                                          onClick={() => handleToggleRole(item.id, item.role)}
                                          className="p-1.5 rounded-lg border text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                                          title="Đặt làm Trưởng bộ phận (Duyệt viên)"
                                        >
                                          <UserCheck className="h-4 w-4" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleRole(item.id, item.role)}
                                          className="p-1.5 rounded-lg border text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                                          title="Hạ cấp xuống Cán bộ nhân viên"
                                        >
                                          <UserMinus className="h-4 w-4" />
                                        </button>
                                      )}

                                      {/* Toggle Stats view permission */}
                                      <button
                                        onClick={() => handleToggleStatsPermission(item.id, !!item.canViewStats)}
                                        className={`p-1.5 rounded-lg border transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm cursor-pointer ${
                                          item.canViewStats 
                                            ? "text-teal-700 bg-teal-50 border-teal-300 hover:bg-teal-100 hover:text-teal-800" 
                                            : "text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                                        }`}
                                        title={item.canViewStats ? "Thu hồi quyền xem Thống Kê" : "Cấp quyền xem Thống Kê"}
                                      >
                                        <BarChart3 className="h-4 w-4" />
                                      </button>

                                      {/* Delete button */}
                                      <button
                                        onClick={() => setUserToDelete(item)}
                                        className="p-1.5 rounded-lg border text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                                        title="Xóa tài khoản vĩnh viễn"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Ngân hàng đề thủ công Panel */}
          {activeTab === 'questions' && (
            <motion.div
              key="questions_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-150 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs font-sans">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    <span>Ngân Hàng Câu Hỏi</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Quản lý và điều chỉnh danh sách câu hỏi trắc nghiệm 3T.</p>
                </div>
                <button
                  onClick={onSimulateEmployee}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>MOBILE</span>
                </button>
              </div>

              {/* Seed controller help */}
              {questions.length === 0 && (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-md flex justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-blue-800 text-sm"><span translate="no" className="notranslate">Khởi tạo dữ liệu mẫu 3T ban đầu?</span></h3>
                    <p className="text-xs text-blue-700 mt-1"><span translate="no" className="notranslate">Hệ thống đang trống. Nhấp vào đây để thêm nhanh 07 câu hỏi huấn luyện 3T chuẩn ban đầu cho anh em CBNV ôn luyện.</span></p>
                  </div>
                  <button 
                    onClick={handleSeedQuestions}
                    className="flex items-center gap-2 bg-[#1971C2] text-white font-bold text-xs px-4 py-2 rounded-md shadow-sm"
                  >
                    <span translate="no" className="notranslate">Khởi tạo mẫu</span>
                  </button>
                </div>
              )}

              {/* Form add manual question */}
              <div className="bg-white border border-gray-150 rounded-md p-6 shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-900 uppercase tracking-widest focus:outline-none cursor-pointer"
                >
                  <span translate="no" className="notranslate">Nhập câu hỏi thủ công mới</span>
                  {showManualForm ? (
                    <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 transition-transform" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 transition-transform" />
                  )}
                </button>
                
                {showManualForm && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <form onSubmit={handleAddManualQuestion} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1"><span translate="no" className="notranslate">Nội dung câu hỏi 3T</span></label>
                        <input 
                          type="text" 
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                          placeholder="Nhập câu tự giác/tuân thủ an toàn..."
                          className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {manualOptions.map((opt, oIdx) => (
                          <div key={oIdx}>
                            <label className="block text-xs font-semibold text-gray-500 mb-1"><span translate="no" className="notranslate">Lựa chọn {String.fromCharCode(65 + oIdx)}</span></label>
                            <input 
                              type="text" 
                              value={opt}
                              onChange={(e) => {
                                const updated = [...manualOptions];
                                updated[oIdx] = e.target.value;
                                setManualOptions(updated);
                              }}
                              placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}...`}
                              className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 outline-none focus:border-blue-500"
                              required
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1"><span translate="no" className="notranslate">Đáp án đúng chính xác</span></label>
                          <select
                            value={manualCorrect}
                            onChange={(e) => setManualCorrect(Number(e.target.value))}
                            className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 bg-white outline-none focus:border-blue-500"
                          >
                            <option value={0} translate="no" className="notranslate">Lựa chọn A</option>
                            <option value={1} translate="no" className="notranslate">Lựa chọn B</option>
                            <option value={2} translate="no" className="notranslate">Lựa chọn C</option>
                            <option value={3} translate="no" className="notranslate">Lựa chọn D</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1"><span translate="no" className="notranslate">Lời giải của sếp / cảnh báo ghi nhớ</span></label>
                          <input 
                            type="text" 
                            value={manualExp}
                            onChange={(e) => setManualExp(e.target.value)}
                            placeholder="Nên dặn: Làm đúng cam kết, không lơ là..."
                            className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="flex items-center gap-1.5 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2 px-4 rounded-md shadow-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span translate="no" className="notranslate">Thêm câu hỏi mới</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Active list table */}
              <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-105 bg-gray-50">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest"><span translate="no" className="notranslate">Ngân hàng đề hiện có ({questions.length} câu)</span></h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {questions.map((q, qIdx) => (
                        <tr key={q.id} className="hover:bg-gray-50/20">
                          <td className="p-4 space-y-2">
                            <div className="flex justify-between items-start gap-3">
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full uppercase">Câu {qIdx + 1}</span>
                              <button 
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="text-red-600 hover:bg-red-50 p-1 rounded-md transition-all shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm">{q.text}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className={`rounded p-2 border ${
                                  oIdx === q.correctAnswerIndex ? 'bg-green-50/50 border-green-200 text-green-900 font-semibold' : 'bg-gray-50/50 border-gray-100 text-gray-500'
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}. {cleanOptionText(opt)}
                                </div>
                              ))}
                            </div>
                            <div className="bg-blue-50/30 p-2.5 rounded-md text-blue-700 text-[11px] leading-relaxed">
                              <span translate="no" className="notranslate"><strong>Dặn dò:</strong> {q.explanation}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Question Extractor Tab */}
          {activeTab === 'add_images' && (
            <motion.div
              key="add_images"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-150 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <ImagePlus className="h-4 w-4 text-purple-650" />
                    <span>Trích xuất Câu Hỏi AI (Hình Ảnh)</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Tải lên hình ảnh chụp đề thi để bóc tách tự động bằng AI siêu tốc.</p>
                </div>
                <button
                  onClick={onSimulateEmployee}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>MOBILE</span>
                </button>
              </div>

              {/* Image Input field Box */}
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-md p-8 text-center space-y-4">
                <div className="bg-blue-50 text-blue-600 h-12 w-12 rounded-full flex items-center justify-center mx-auto border border-blue-100">
                  <ImagePlus className="h-6 w-6 text-[#1971C2]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-800"><span translate="no" className="notranslate">Tải lên loạt hình ảnh chụp đề thi 3T</span></h3>
                  <p className="text-xs text-gray-500 mt-1"><span translate="no" className="notranslate">Cơ chế nén tự động tối ưu hóa dung lượng & API Quota sẽ chạy tại chỗ trước khi phân tích qua Gemini AI.</span></p>
                </div>
                
                <div className="relative inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    disabled={extracting || loading}
                  />
                  <button className="bg-[#1971C2] text-white font-bold text-xs py-2 px-5 rounded-md shadow-sm">
                    <span translate="no" className="notranslate">{loading ? 'Đang nén ảnh...' : 'Chọn từ máy tính / chụp ảnh'}</span>
                  </button>
                </div>

                {selectedImages.length > 0 && (
                  <div className="pt-4 max-w-sm mx-auto">
                    <div className="text-xs text-gray-450 uppercase mb-2"><span translate="no" className="notranslate">Hình ảnh đã chọn rèn luyện ({selectedImages.length})</span></div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {selectedImages.map((img, iIdx) => (
                        <div key={iIdx} className="relative h-14 w-14 rounded-md overflow-hidden bg-gray-100 border border-gray-250">
                          <img 
                            src={`data:image/jpeg;base64,${img.compressedBase64}`} 
                            alt="preview" 
                            className="object-cover h-full w-full" 
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== iIdx))}
                            className="absolute bg-black/60 text-white rounded-full p-0.5 top-0.5 right-0.5 hover:bg-black"
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleExtractWithAI}
                        disabled={extracting || selectedImages.length === 0}
                        className="w-full bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2 px-4 rounded-md shadow-sm"
                      >
                        <span translate="no" className="notranslate">{extracting ? 'Trí tuệ Nhân tạo Gemini đang bóc tách...' : 'Phân Tích Bóc Tách Đề Bằng AI'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Extract questions table with duplication warnings! */}
              {extractedQuestions.length > 0 && (
                <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden space-y-4 p-4">
                  <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest"><span translate="no" className="notranslate">Nội dung câu hỏi AI bóc tách</span></h3>
                      <p className="text-xs text-red-500 mt-0.5 italic"><span translate="no" className="notranslate">Hệ thống đã tự động rà quét kiểm tra trùng lặp câu hỏi.</span></p>
                    </div>
                    <button
                      onClick={handleSaveExtractedQuestions}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2 px-4 rounded-md"
                    >
                      <span translate="no" className="notranslate">Lưu đề không trùng lặp</span>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto">
                    {extractedQuestions.map((eq, qIdx) => (
                      <div 
                        key={eq.id}
                        className={`p-4 rounded-md border ${
                          eq.isDuplicate ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <span translate="no" className="notranslate text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded font-bold">CÂU TRÍ TUỆ {qIdx + 1}</span>
                          {eq.isDuplicate ? (
                            <span translate="no" className="notranslate flex items-center gap-1 font-bold text-orange-700 text-xs px-2 py-0.5 bg-orange-100 border border-orange-200 rounded-full">
                              <AlertTriangle className="h-3 w-3" /> TRÙNG LẶP SỐ LIỆU ĐỀ CŨ
                            </span>
                          ) : (
                            <span translate="no" className="notranslate text-green-700 text-xs font-bold px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">HỢP LỆ</span>
                          )}
                        </div>

                        <div className="pt-2">
                          <h4 className="font-bold text-sm text-gray-800">{eq.text}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {eq.options.map((opt, oIdx) => (
                              <div key={oIdx} className={`p-2 rounded text-xs text-gray-600 ${
                                oIdx === eq.correctAnswerIndex ? 'bg-green-50/50 text-green-900 border border-green-200 font-semibold' : 'bg-white border border-gray-150'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}. {cleanOptionText(opt)}
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-2 text-xs bg-blue-50/50 p-2.5 rounded text-blue-700">
                            <strong>Lời khuyên Sếp:</strong> {eq.explanation}
                          </div>

                          {eq.isDuplicate && (
                            <div className="mt-2 text-[11px] text-orange-850 bg-orange-50 p-2 rounded-md">
                              <strong>Lỗi trùng với đề cũ:</strong> "{eq.duplicateOriginal}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* QR Code Creation View */}
          {activeTab === 'qr' && (
            <motion.div
              key="qr_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-150 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs font-sans">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-emerald-600" />
                    <span>Mã QR "Chiến" Ngay</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Xuất bản mã QR để CBNV quét nhanh bằng điện thoại và làm bài trắc nghiệm.</p>
                </div>
                <button
                  onClick={onSimulateEmployee}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>MOBILE</span>
                </button>
              </div>

              <div className="max-w-md mx-auto bg-white border border-gray-150 rounded-md p-8 text-center space-y-6 shadow-sm">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900"><span translate="no" className="notranslate">Mã QR Truy Cập Nhanh "Chiến Ngay"</span></h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span translate="no" className="notranslate">Lưu trữ hoặc in mã QR này treo ở bảng tin, phòng sản xuất hoặc cửa phòng làm việc để rèn luyện tinh thần 3T hàng ngày.</span>
                  </p>
                </div>

                {/* Important notice regarding Google AI Studio iframe authentication boundary */}
                <div className="bg-amber-50 border border-amber-200 text-left p-3.5 rounded-lg text-[11px] leading-relaxed text-amber-900">
                  <button 
                    type="button"
                    onClick={() => setShowQrNotice(!showQrNotice)}
                    className="w-full flex items-center justify-between font-bold text-amber-950 focus:outline-none cursor-pointer"
                  >
                    <span>⚠️ Lưu ý Quan Trọng khi Quét Thử Nghiệm:</span>
                    {showQrNotice ? <ChevronUp className="h-4 w-4 shrink-0 transition-transform" /> : <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />}
                  </button>
                  {showQrNotice && (
                    <div className="mt-2 space-y-1 border-t border-amber-200 pt-2">
                      <p>
                        Đường dẫn hiện vật này <code className="bg-amber-100 px-1 py-0.2 rounded font-mono text-amber-950 font-bold">ais-dev-...</code> thuộc môi trường phát triển cục bộ và được <strong>bảo mật nghiêm ngặt bởi Google Cloud</strong>.
                      </p>
                      <p className="mt-1">
                        • <strong>Yêu cầu:</strong> Trình duyệt trên điện thoại của bạn <strong>phải đăng nhập tài khoản Google</strong> đã tham gia dự án này (<code className="font-semibold text-amber-950 font-sans">club.nhuatanphu@gmail.com</code>). Nếu không, bạn sẽ gặp lỗi <strong>"Page not found"</strong> của Google AI Studio do bị chặn truy cập.
                      </p>
                      <p className="mt-1">
                        • <strong>Khuyên dùng:</strong> Hãy thử mở trình duyệt Safari/Chrome trên điện thoại để đăng nhập tài khoản Google trước khi quét, hoặc dán đường dẫn bài viết/đường dẫn liên kết của ứng dụng khi chạy chính thức vào khung phía dưới.
                      </p>
                    </div>
                  )}
                </div>

                {/* Interactive custom link injector */}
                <div className="text-left space-y-1.5 font-sans">
                  <label className="text-[11px] font-black text-gray-650 uppercase tracking-wider block">Liên kết nhúng trong Mã QR:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={customQrUrl} 
                      onChange={(e) => setCustomQrUrl(e.target.value)}
                      placeholder="Nhập đường dẫn URL mong muốn..."
                      className="w-full px-3 py-2 text-xs border border-gray-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50 font-mono text-gray-700"
                    />
                    {customQrUrl !== 'https://quiz3t.vercel.app' && (
                      <button 
                        onClick={() => setCustomQrUrl('https://quiz3t.vercel.app')} 
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-650 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                        title="Khôi phục mặc định"
                      >
                        Mặc định
                      </button>
                    )}
                  </div>
                </div>

                {/* Secure dyn QR generator (using standard open-source QRServer API) */}
                <div className="p-4 bg-gray-50 border border-gray-150 rounded-md flex justify-center items-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customQrUrl || 'https://quiz3t.vercel.app')}`} 
                    alt="Văn Hóa 3T QR Code Portal" 
                    className="bg-white border rounded-lg p-2.5 shadow-inner h-[250px] w-[250px]"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="text-xs font-mono text-gray-500 bg-gray-100 p-2.5 rounded break-all border border-gray-200">
                  <span translate="no" className="notranslate">{customQrUrl || 'https://quiz3t.vercel.app'}</span>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2.5 px-4 rounded-md shadow-sm"
                >
                  <FileDown className="h-4 w-4" />
                  <span translate="no" className="notranslate">In / Xuất Bản Mã QR Bảng Tin</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Statistics View */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <StatsDashboard 
                users={users} 
                results={results} 
                onRefresh={() => loadData(true)} 
                onBackToHome={onSimulateEmployee}
                companyMappings={companyMappings}
              />
            </motion.div>
          )}

          {/* Encoding Management Panel View */}
          {activeTab === 'encoding' && (
            <motion.div
              key="encoding_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-150 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs font-sans">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-[#1971C2]" />
                    <span>Trang Mã Hóa Dữ Liệu</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Quản lý các danh mục mã hóa về công ty thành viên, phòng ban và chi nhánh.</p>
                </div>
                <button
                  onClick={onSimulateEmployee}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>MOBILE</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                
                {/* 1. Companies Panel */}
                <div className="bg-white border border-gray-150 rounded-md shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Building className="h-5 w-5 text-[#1971C2]" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">1. CÔNG TY THÀNH VIÊN</h3>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Thêm Công ty mới..."
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="flex-1 border border-gray-250 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1971C2]"
                    />
                    <button
                      onClick={handleAddCompany}
                      className="bg-[#1971C2] hover:bg-opacity-90 text-white rounded px-3 py-1.5 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                    {companyMappings.map((co) => (
                      <div
                        key={co.id}
                        onClick={() => {
                          setSelectedCoId(co.id);
                          if (co.branches.length > 0) {
                            setSelectedBrId(co.branches[0].id);
                          } else {
                            setSelectedBrId('');
                          }
                        }}
                        className={`p-3 rounded-md border text-xs flex justify-between items-center cursor-pointer transition-all ${
                          selectedCoId === co.id
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                            : 'bg-gray-50/50 border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{co.name}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMapping({
                                type: 'company',
                                coId: co.id,
                                oldName: co.name,
                                newName: co.name
                              });
                            }}
                            className="text-[#1971C2] hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 cursor-pointer"
                            title="Sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompanyMapping(co.id);
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {companyMappings.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-4">Chưa có công ty thành viên nào.</p>
                    )}
                  </div>
                </div>

                {/* 2. Branches Panel */}
                <div className="bg-white border border-gray-150 rounded-md shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Landmark className="h-5 w-5 text-[#1971C2]" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">2. CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN</h3>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Thêm Chi nhánh/VPĐD..."
                      value={newBranchName}
                      disabled={!selectedCoId}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="flex-1 border border-gray-250 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1971C2] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleAddBranch}
                      disabled={!selectedCoId}
                      className="bg-[#1971C2] hover:bg-opacity-90 text-white rounded px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                    {(() => {
                      const activeCo = companyMappings.find(c => c.id === selectedCoId);
                      if (!activeCo) return <p className="text-xs text-gray-400 italic text-center py-4">Vui lòng chọn 1 Công ty thành viên trước.</p>;
                      
                      return (
                        <>
                          <div className="px-1 pb-1.5 mb-1.5 border-b border-dashed border-gray-100">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Của công ty: {activeCo.name}</span>
                          </div>
                          {activeCo.branches.map((br) => (
                            <div
                              key={br.id}
                              onClick={() => setSelectedBrId(br.id)}
                              className={`p-3 rounded-md border text-xs flex justify-between items-center cursor-pointer transition-all ${
                                selectedBrId === br.id
                                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                                  : 'bg-gray-50/50 border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="truncate">{br.name}</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMapping({
                                      type: 'branch',
                                      coId: selectedCoId,
                                      brId: br.id,
                                      oldName: br.name,
                                      newName: br.name
                                    });
                                  }}
                                  className="text-[#1971C2] hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 cursor-pointer"
                                  title="Sửa"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBranchMapping(selectedCoId, br.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {activeCo.branches.length === 0 && (
                            <p className="text-xs text-gray-400 italic text-center py-4">Chưa có Chi nhánh nào dưới Công ty này.</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Departments Panel */}
                <div className="bg-white border border-gray-150 rounded-md shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Briefcase className="h-5 w-5 text-[#1971C2]" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">3. BỘ PHẬN / ĐƠN VỊ</h3>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Thêm Bộ phận / Đơn vị..."
                      value={newDepartmentName}
                      disabled={!selectedCoId || !selectedBrId}
                      onChange={(e) => setNewDepartmentName(e.target.value)}
                      className="flex-1 border border-gray-250 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1971C2] disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleAddDepartment}
                      disabled={!selectedCoId || !selectedBrId}
                      className="bg-[#1971C2] hover:bg-opacity-90 text-white rounded px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                    {(() => {
                      const activeCo = companyMappings.find(c => c.id === selectedCoId);
                      const activeBr = activeCo?.branches.find(b => b.id === selectedBrId);
                      if (!activeCo || !activeBr) return <p className="text-xs text-gray-400 italic text-center py-4">Vui lòng chọn 1 Chi nhánh/VPĐD trước.</p>;
                      
                      return (
                        <>
                          <div className="px-1 pb-1.5 mb-1.5 border-b border-dashed border-gray-100 flex flex-col gap-0.5">
                            <span className="text-[10px] text-gray-400 uppercase font-bold truncate text-ellipsis">Của Công ty: {activeCo.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold truncate text-ellipsis">Chi nhánh: {activeBr.name}</span>
                          </div>
                          {activeBr.departments.map((dept) => (
                            <div
                              key={dept.id}
                              className="p-3 rounded-md border border-gray-200 bg-gray-50/50 text-gray-700 text-xs flex justify-between items-center transition-all hover:bg-gray-50"
                            >
                              <span className="truncate">{dept.name}</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => {
                                    setEditingMapping({
                                      type: 'department',
                                      coId: selectedCoId,
                                      brId: selectedBrId,
                                      deptId: dept.id,
                                      oldName: dept.name,
                                      newName: dept.name
                                    });
                                  }}
                                  className="text-[#1971C2] hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 cursor-pointer animate-none"
                                  title="Sửa"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDepartmentMapping(selectedCoId, selectedBrId, dept.id)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 cursor-pointer animate-none"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {activeBr.departments.length === 0 && (
                            <p className="text-xs text-gray-400 italic text-center py-4">Chưa có Bộ phận nào dưới Chi nhánh này.</p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* DỮ LIỆU View - Firebase Quota, Auto-optimization & Cleanup Control Center */}
          {activeTab === 'firebase_data' && (
            <motion.div
              key="firebase_data_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header card */}
              <div className="bg-white border border-gray-150 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs font-sans">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <Server className="h-4 w-4 text-[#1971C2]" />
                    <span>Hệ Thống Dữ Liệu & Quota Bảo Trì</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Giám sát tài nguyên truy vấn Cloud Firestore và kích hoạt các kịch bản dọn dẹp tối ưu dung lượng.</p>
                </div>
                <button
                  onClick={onSimulateEmployee}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-colors cursor-pointer active:scale-95 whitespace-nowrap animate-none"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>MOBILE</span>
                </button>
              </div>

              {/* 2-Column Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                
                {/* 1. Firebase Quota Tracker Card */}
                <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left">
                  <div className="border-b border-gray-150 pb-3 flex justify-between items-center mr-0">
                    <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-500" />
                      <span>Giới hạn Quota Firebase hàng ngày</span>
                    </h4>
                    <div className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-[#1971C2] text-[10px] font-extrabold rounded-md uppercase tracking-wider animate-pulse flex items-center gap-1 shrink-0">
                      <Zap className="h-3 w-3 fill-current text-[#1971C2]" />
                      <span>Spark Plan</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed font-sans font-normal">
                    Ứng dụng của doanh nghiệp đang hoạt động trên gói <strong className="text-gray-700 font-bold">Firestore Enterprise (Spark - Free Tier)</strong> miễn phí trọn đời của Firebase. Hệ thống tự động theo dõi lượng tài nguyên dịch vụ thực tế phát sinh để bạn chủ động điều phối bảo trì.
                  </p>

                  <div className="space-y-4 pt-2">
                    {/* Reads Tracker */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-sans">
                        <span className="font-bold text-gray-750">Đọc Dữ Liệu (Reads)</span>
                        <span className={`font-mono font-bold ${getTextColor(readPercent)}`}>
                          {quota.reads.toLocaleString()} / {firebaseQuotaLimits.reads.toLocaleString()} ({readPercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${readPercent}%` }} 
                          className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(readPercent)}`}
                        />
                      </div>
                    </div>

                    {/* Writes Tracker */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-sans">
                        <span className="font-bold text-gray-750">Ghi Dữ Liệu (Writes)</span>
                        <span className={`font-mono font-bold ${getTextColor(writePercent)}`}>
                          {quota.writes.toLocaleString()} / {firebaseQuotaLimits.writes.toLocaleString()} ({writePercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${writePercent}%` }} 
                          className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(writePercent)}`}
                        />
                      </div>
                    </div>

                    {/* Deletes Tracker */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-sans">
                        <span className="font-bold text-gray-750">Xoá Dữ Liệu (Deletes)</span>
                        <span className={`font-mono font-bold ${getTextColor(deletePercent)}`}>
                          {quota.deletes.toLocaleString()} / {firebaseQuotaLimits.deletes.toLocaleString()} ({deletePercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${deletePercent}%` }} 
                          className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(deletePercent)}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-gray-100 bg-gray-50/50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-800 leading-relaxed font-sans font-medium">
                    <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <b>Mẹo tiết kiệm quota:</b> Toàn bộ kết quả và câu hỏi được tối ưu hóa cấu trúc nạp tĩnh và lắng nghe thay đổi thông minh (<code>onSnapshot</code>), giúp giảm tối thiểu số lượng đọc dư thừa khi dữ liệu không đổi.
                    </div>
                  </div>
                </div>

                {/* 2. Optimizer & Maintenance Section */}
                <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 relative overflow-hidden font-sans text-left">
                  <div className="border-b border-gray-150 pb-3 flex justify-between items-center mr-0">
                    <h4 className="font-sans font-bold text-sm text-[#3b5bdb] uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-indigo-500" />
                      <span>Bảo trì & Tối ưu hóa Quota</span>
                    </h4>
                    <div className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[#3B5BDB] text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <Sparkles className="h-3 w-3 text-indigo-600" />
                      <span>Lọc Tự Động</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed font-sans font-normal">
                    Hệ thống hiện đã kích hoạt chế độ <b>Tự động Lọc kết quả cũ</b>. Khi nạp dữ liệu ôn tập trên giao diện, Cloud Firestore chỉ đọc các kết quả trong vòng <b>30 ngày gần nhất</b>, giúp bạn tiết kiệm hơn 85% số lượt đọc Firestore mỗi ngày.
                  </p>

                  <div className="bg-gray-50/70 border border-gray-150 p-4 rounded-xl space-y-3 relative font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <Activity className={`h-4 w-4 text-gray-500 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        Quét dọn dẹp cơ sở kết quả cũ
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono font-medium">Auto-Audit</span>
                    </div>

                    {isAnalyzing ? (
                      <div className="text-xs font-semibold text-gray-500 italic py-2.5 flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        Đang rà quét và phân tích trọng số lịch sử từ Cloud Firestore...
                      </div>
                    ) : oldResultCount !== null ? (
                      <div className="space-y-3">
                        {oldResultCount === 0 ? (
                          <div className="bg-green-50 border border-green-150 p-3 rounded-lg text-xs leading-relaxed text-green-800 font-bold flex items-start gap-2 animate-fadeIn">
                            <ShieldCheck className="h-4.5 w-4.5 text-green-600 shrink-0 mt-0.5" />
                            <div>
                              Trạng thái Tối ưu Tuyệt đối! Toàn bộ cơ sở dữ liệu đều sạch sẽ và không có bất kỳ kết quả thi cũ nào vượt qua ngưỡng 30 ngày.
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 animate-fadeIn">
                            <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-lg text-xs leading-relaxed text-amber-800 font-bold flex items-start gap-2.5 shadow-3xs font-sans">
                              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                              <div>
                                Phát hiện <span className="text-sm font-black text-amber-950 font-mono underline">{oldResultCount}</span> kết quả thi thử cũ từ tháng trước (hơn 30 ngày trước).
                                <div className="text-[11px] text-gray-500 font-medium mt-1 leading-normal font-sans font-normal">
                                  Sự hiện diện của dữ liệu này tuy được ẩn đi khỏi giao diện thường nhật nhưng vẫn nằm trong Cloud Firestore. Hãy nhấn nút dưới đây để dọn dẹp toàn bộ, giải phóng dung lượng và giúp bảo toàn quota đọc của bạn.
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={handleCleanOldResults}
                              disabled={isCleaning}
                              className="w-full py-2.5 bg-gradient-to-r from-red-650 to-amber-650 hover:from-red-700 hover:to-amber-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>{isCleaning ? 'ĐANG DỌN DẸP...' : `HÀNH ĐỘNG: XÓA VĨNH VIỄN ${oldResultCount} BẢN GHI CŨ`}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={runHistoricalAnalysis}
                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-[#1971C2] font-black text-xs rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-95 shadow-2xs"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Kích Hoạt Quét Kiểm Tra Dọn Dẹp
                      </button>
                    )}

                    {cleanMessage && (
                      <div className={`p-3 rounded-lg text-xs border leading-relaxed font-bold ${
                        cleanMessage.type === 'success' 
                          ? 'bg-green-50 border-green-200 text-green-900 shadow-3xs' 
                          : 'bg-red-50 border-red-200 text-red-900 shadow-3xs'
                      }`}>
                        {cleanMessage.text}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Delete User Modal Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-gray-150 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-655 font-sans">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900"><span translate="no" className="notranslate">Xác nhận xóa thành viên</span></h3>
            </div>
            
            <p className="text-xs text-gray-650 leading-relaxed font-sans font-normal">
              <span translate="no" className="notranslate">Bạn có chắc chắn muốn xóa tài khoản của thành viên <strong>{userToDelete.name}</strong> (SĐT: {userToDelete.phone}) ra khỏi danh sách quản lý? Hành động này không thể hoàn tác!</span>
            </p>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md text-xs font-bold text-gray-650 transition-colors"
              >
                <span translate="no" className="notranslate">Hủy bỏ</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
              >
                <span translate="no" className="notranslate">Xác nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Action Confirmation Drawer/Overlay Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg border border-gray-150 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-655 font-sans">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                <span translate="no" className="notranslate">{confirmDialog.title}</span>
              </h3>
            </div>
            
            <p className="text-xs text-gray-650 leading-relaxed font-sans font-normal">
              <span translate="no" className="notranslate">{confirmDialog.message}</span>
            </p>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md text-xs font-bold text-gray-655 transition-colors cursor-pointer"
              >
                <span translate="no" className="notranslate">Hủy bỏ</span>
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span translate="no" className="notranslate">Xác nhận</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Mapping Modal */}
      {editingMapping && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-gray-150 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-blue-600 font-sans">
              <div className="p-2 bg-blue-50 rounded-full">
                <Pencil className="h-6 w-6 text-[#1971C2]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                <span>
                  {editingMapping.type === 'company' && 'Sửa Tên Công Ty'}
                  {editingMapping.type === 'branch' && 'Sửa Tên Chi Nhánh'}
                  {editingMapping.type === 'department' && 'Sửa Tên Bộ Phận'}
                </span>
              </h3>
            </div>
            
            <div className="space-y-3 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-bold">Tên cũ:</label>
                <p className="p-2.5 bg-gray-50 border border-gray-200 rounded text-gray-600 font-medium break-words">
                  {editingMapping.oldName}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase font-bold">Tên mới:</label>
                <input
                  type="text"
                  value={editingMapping.newName}
                  onChange={(e) => setEditingMapping(prev => prev ? { ...prev, newName: e.target.value } : null)}
                  placeholder="Nhập tên mới..."
                  className="w-full border border-gray-250 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] font-medium"
                />
              </div>

              <div className="text-[11px] text-amber-700 leading-relaxed bg-amber-50 rounded p-2.5 border border-amber-100 flex gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 self-start mt-0.5" />
                <span>
                  <strong>Đồng bộ tự động:</strong> Tên mới sẽ cập nhật trực tiếp sơ đồ tổ chức, đồng bộ toàn bộ tài khoản CBNV và lịch sử làm bài liên quan tức thì.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setEditingMapping(null)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md text-xs font-bold text-gray-650 transition-colors cursor-pointer"
              >
                <span>Hủy bỏ</span>
              </button>
              <button
                type="button"
                onClick={handleEditMapping}
                disabled={!editingMapping.newName.trim() || editingMapping.newName.trim() === editingMapping.oldName}
                className="px-3 py-1.5 bg-[#1971C2] hover:bg-opacity-95 disabled:opacity-50 text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center"
              >
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-gray-150 max-w-md w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 font-sans">
              <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#1971C2]" />
                <span translate="no" className="notranslate">Sửa Thông Tin CBNV</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold"><span translate="no" className="notranslate">Họ và Tên</span></label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.toUpperCase())}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-bold"><span translate="no" className="notranslate">Số Điện Thoại</span></label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-bold"><span translate="no" className="notranslate">Mã Nhân Sự</span></label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 2018.00281"
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold"><span translate="no" className="notranslate">Mật khẩu đăng nhập (Mới hoặc cũ)</span></label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">Công Ty Thành Viên</span></label>
                <select
                  value={editCompany}
                  onChange={(e) => {
                    const coName = e.target.value;
                    setEditCompany(coName);
                    const co = companyMappings.find(m => m.name.trim().normalize('NFC') === coName.trim().normalize('NFC'));
                    if (co && co.branches.length > 0) {
                      setEditBranch(co.branches[0].name);
                      if (co.branches[0].departments.length > 0) {
                        setEditDepartment(co.branches[0].departments[0].name);
                      } else {
                        setEditDepartment('');
                      }
                    } else {
                      setEditBranch('');
                      setEditDepartment('');
                    }
                  }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                >
                  {companyMappings.map(co => (
                    <option key={co.id} value={co.name}>{co.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">CHI NHÁNH/ VĂN PHÒNG ĐẠI DIỆN</span></label>
                <select
                  value={editBranch}
                  onChange={(e) => {
                    const brName = e.target.value;
                    setEditBranch(brName);
                    const co = companyMappings.find(m => m.name.trim().normalize('NFC') === editCompany.trim().normalize('NFC'));
                    const br = co?.branches.find(b => b.name.trim().normalize('NFC') === brName.trim().normalize('NFC'));
                    if (br && br.departments.length > 0) {
                      setEditDepartment(br.departments[0].name);
                    } else {
                      setEditDepartment('');
                    }
                  }}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                >
                  {(companyMappings.find(m => m.name.trim().normalize('NFC') === editCompany.trim().normalize('NFC'))?.branches || []).map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">BỘ PHẬN/ ĐƠN VỊ</span></label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                >
                  {(companyMappings.find(m => m.name.trim().normalize('NFC') === editCompany.trim().normalize('NFC'))?.branches.find(b => b.name.trim().normalize('NFC') === editBranch.trim().normalize('NFC'))?.departments || []).map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">Vai trò hệ thống</span></label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                  >
                    <option value="employee" translate="no" className="notranslate">CBNV</option>
                    <option value="approver" translate="no" className="notranslate">Trưởng bộ phận</option>
                    <option value="admin" translate="no" className="notranslate">Quản trị tối cao</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">Trạng thái tài khoản</span></label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                  >
                    <option value="approved" translate="no" className="notranslate">Đã hoạt động</option>
                    <option value="pending" translate="no" className="notranslate">Chờ kích hoạt</option>
                    <option value="rejected" translate="no" className="notranslate">Tạm khóa / Từ chối</option>
                  </select>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="bg-blue-50/50 hover:bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between gap-3 text-xs leading-relaxed transition-all">
                <div className="flex items-start gap-2 max-w-[80%]">
                  <BarChart3 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-blue-955">Quyền xem Thống kê</h5>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed mt-0.5">
                      Cho phép tài khoản này truy cập màn hình báo cáo dữ liệu rèn luyện 3T của ban ngành họ phụ trách.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editCanViewStats}
                    onChange={(e) => setEditCanViewStats(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1971C2]"></div>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 font-sans">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md font-bold text-gray-650 transition-colors"
                >
                  <span translate="no" className="notranslate">Bỏ qua</span>
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1971C2] hover:bg-[#155d9e] text-white rounded-md font-bold transition-all shadow-xs"
                >
                  <span translate="no" className="notranslate">Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
