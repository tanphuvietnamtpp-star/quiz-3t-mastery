import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { databaseService, getQuotaStats } from '../firebase';
import { User, Question, QuizResult, BRANCHES, DEPARTMENTS, CompanyMapping, MotivationalSloganBand, LevelRulesConfig, LevelRuleItem } from '../types';
import { INITIAL_QUESTIONS } from '../data/mockQuestions';
import { 
  Users, HelpCircle, ImagePlus, QrCode, AlertTriangle, 
  Trash2, Plus, Sparkles, LogOut, CheckCircle2, UserCheck, 
  RefreshCcw, UserMinus, FileDown, Upload, Pencil, Lock, BarChart3,
  Database, Building, Briefcase, Landmark, Home, ChevronDown, ChevronUp,
  ShieldCheck, ShieldAlert, Zap, Activity, Server, Search, X,
  Award, TrendingUp, RotateCcw, ArrowLeft, Bell, MessageSquare, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StatsDashboard from './StatsDashboard';
import PersonalStats from './PersonalStats';
import ConversationExchange from './ConversationExchange';
import { cleanOptionText, formatDate } from '../utils/format';
import { calculateInactivityAugmentedLevel, getVietnamDateString } from '../utils/levelCalculator';

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

const DEFAULT_LEVEL_RULES: LevelRulesConfig = {
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
      demotion: "Đạt dưới 28 điểm trong 2 lần thi (áp dụng trước 17/06/26). CHÍNH THỨC TỪ 0h00 NGÀY 17/06/26: CHỈ cần duy trì ít nhất 2 lượt mỗi ngày và đạt điểm trung bình >= 20/30đ là đạt yêu cầu. Trường hợp không duy trì thì bị hạ cấp tự động.",
      maxTime: "15s/câu",
      reactionPoints: ["≤ 3s (+10đ)", "4s-5s (+8đ)", "6s-8s (+6đ)", "9s-15s (+5đ)"]
    }
  ]
};

const getReactionField = (reactionPoints: any, field: 'p10' | 'p8' | 'p6' | 'p5', defaultVal: string): string => {
  if (!reactionPoints) return defaultVal;
  
  if (!Array.isArray(reactionPoints)) {
    return reactionPoints[field] || defaultVal;
  }
  
  if ((reactionPoints as any)[field]) {
    return (reactionPoints as any)[field];
  }
  
  try {
    if (field === 'p10') {
      const match = reactionPoints[0]?.match(/≤\s*(.+?)\s*\(?\+/);
      return match ? match[1].trim() : defaultVal;
    }
    const idx = field === 'p8' ? 1 : field === 'p6' ? 2 : 3;
    const rawVal = reactionPoints[idx] || '';
    const match = rawVal.match(/^([^(\+]+)/);
    return match ? match[1].trim() : defaultVal;
  } catch (e) {
    console.error("Error parsing reaction field:", e);
  }
  
  return defaultVal;
};

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
  const [excelPreviewQuestions, setExcelPreviewQuestions] = useState<Question[]>([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [excelFileName, setExcelFileName] = useState('');
  const [unreadExchangeCount, setUnreadExchangeCount] = useState(0);
  
  const [activeTab, setActiveTab ] = useState<'users' | 'questions' | 'add_images' | 'qr' | 'stats' | 'encoding' | 'firebase_data' | 'rules' | 'personal' | 'notifications' | 'exchange' | 'details'>('users');

  // Custom states for 'details' (CHI TIẾT) tab
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [detailSearch, setDetailSearch] = useState('');

  // System Announcement States
  const [systemAnnouncement, setSystemAnnouncement] = useState('Chào mừng toàn thể cán bộ nhân viên đến với Hội Thi Văn Hóa 3T! Tốc độ là sống còn - Tinh gọn là sức mạnh!');
  const [systemAnnouncementSpeed, setSystemAnnouncementSpeed] = useState(35);
  const [systemAnnouncementGap, setSystemAnnouncementGap] = useState(32);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementEditText, setAnnouncementEditText] = useState('');
  const [announcementEditSpeed, setAnnouncementEditSpeed] = useState(35);
  const [announcementEditGap, setAnnouncementEditGap] = useState(32);
  const [allAnnouncements, setAllAnnouncements] = useState<any[]>([]);
  const [lastReadAnnouncementAdminTimestamp, setLastReadAnnouncementAdminTimestamp] = useState<number>(() => Number(localStorage.getItem('3t_admin_last_read_ann_ts') || '0'));
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);

  useEffect(() => {
    const count = allAnnouncements.filter(a => a.timestamp > lastReadAnnouncementAdminTimestamp).length;
    setUnreadAnnouncementsCount(count);
  }, [allAnnouncements, lastReadAnnouncementAdminTimestamp]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      const now = Date.now();
      setLastReadAnnouncementAdminTimestamp(now);
      localStorage.setItem('3t_admin_last_read_ann_ts', String(now));
    }
  }, [activeTab]);
  const [newAnnouncementText, setNewAnnouncementText] = useState('');
  const [newAnnouncementType, setNewAnnouncementType] = useState<'admin_broadcast' | 'congrats'>('admin_broadcast');
  const [announcementToDelete, setAnnouncementToDelete] = useState<any | null>(null);
  const [onlineTick, setOnlineTick] = useState<number>(0);
  
  // Search and filter states for User Registration List
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userBranchFilter, setUserBranchFilter] = useState('all');
  const [userDeptFilter, setUserDeptFilter] = useState('all');

  const [isSlogansExpanded, setIsSlogansExpanded] = useState(false);
  const [localBands, setLocalBands] = useState<MotivationalSloganBand[]>([]);

  // States for rules management
  const [levelRules, setLevelRules] = useState<LevelRulesConfig>(DEFAULT_LEVEL_RULES);
  const [editableRules, setEditableRules] = useState<LevelRulesConfig>(JSON.parse(JSON.stringify(DEFAULT_LEVEL_RULES)));
  const [savingLevelRules, setSavingLevelRules] = useState(false);
  const [rulesNotice, setRulesNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

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

  // States for Searching and Editing Questions
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQOpt0, setEditQOpt0] = useState('');
  const [editQOpt1, setEditQOpt1] = useState('');
  const [editQOpt2, setEditQOpt2] = useState('');
  const [editQOpt3, setEditQOpt3] = useState('');
  const [editQCorrectIndex, setEditQCorrectIndex] = useState(0);
  const [editQExplanation, setEditQExplanation] = useState('');
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
  const [showImageForm, setShowImageForm] = useState(false);

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

      // Load current system announcement once
      try {
        const text = await databaseService.getSystemAnnouncement();
        setSystemAnnouncement(text);
        if (!isEditingAnnouncement) {
          setAnnouncementEditText(text);
        }
      } catch (annErr) {
        console.error("Lỗi khi tải thông báo hệ thống:", annErr);
      }

      // Load general congratulations announcements once
      try {
        const list = await databaseService.getAnnouncements();
        const sorted = (list || []).sort((a, b) => b.timestamp - a.timestamp);
        setAllAnnouncements(sorted);
      } catch (annListErr) {
        console.error("Lỗi khi tải bảng tin:", annListErr);
      }

      try {
        const rules = await databaseService.getLevelRules();
        if (rules) {
          const normalizedLevels = rules.levels.map(lvl => {
            let rp = lvl.reactionPoints;
            if (rp && !Array.isArray(rp)) {
              const obj = rp as any;
              rp = [
                obj.p10 || '',
                obj.p8 || '',
                obj.p6 || '',
                obj.p5 || ''
              ];
            }
            return { 
              ...lvl, 
              reactionPoints: rp || ['', '', '', ''] 
            };
          });
          const normalizedRules = { ...rules, levels: normalizedLevels };
          setLevelRules(normalizedRules);
          setEditableRules(JSON.parse(JSON.stringify(normalizedRules)));
        }
      } catch (err) {
        console.error("Lỗi khi tải quy chế cấp độ:", err);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLevelRules = async () => {
    if (!editableRules) return;
    setSavingLevelRules(true);
    setRulesNotice(null);
    try {
      const rulesToSave: LevelRulesConfig = JSON.parse(JSON.stringify(editableRules));
      
      const inactivityRules = {
        rule1: rulesToSave.inactivityRule1 || '',
        rule2: rulesToSave.inactivityRule2 || ''
      };
      
      const finalRules: any = {
        ...rulesToSave,
        inactivityRules,
        levels: rulesToSave.levels.map(lvl => ({
          ...lvl,
          promotionCriteria: lvl.promotion,
          demotionCriteria: lvl.demotion,
        }))
      };
      
      await databaseService.saveLevelRules(finalRules);
      setLevelRules(editableRules);
      setRulesNotice({ type: 'success', msg: 'Đã lưu và đồng bộ toàn bộ quy chế cấp độ mới thành công!' });
    } catch (err: any) {
      console.error("Lỗi khi lưu quy chế:", err);
      setRulesNotice({ type: 'error', msg: 'Lỗi lưu quy chế lên Cloud: ' + err.message });
    } finally {
      setSavingLevelRules(false);
    }
  };

  const handleRestoreDefaultRules = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục cấu hình quy chế về trạng thái mặc định ban đầu của hệ thống không?")) {
      setEditableRules(JSON.parse(JSON.stringify(DEFAULT_LEVEL_RULES)));
      setRulesNotice({ type: 'success', msg: 'Đã tải mẫu quy chế gốc mặc định. Hãy ấn "LƯU ĐỒNG BỘ LÊN CLOUD" để áp dụng.' });
    }
  };

  useEffect(() => {
    loadData();
    
    // Subscribe to users collection in real-time to ensure online tracking is always 100% accurate without manual refresh
    const unsubscribeUsers = databaseService.subscribeUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });

    // Subscribe to quiz results in real-time to guarantee 100% accurate statistics live
    const unsubscribeResults = databaseService.subscribeQuizResults((updatedResults) => {
      setResults(updatedResults);
    });

    // Subscribe to system announcement in real-time
    const unsubscribeSystem = databaseService.subscribeSystemAnnouncement((text, speed, gap) => {
      if (text) {
        setSystemAnnouncement(text);
        setSystemAnnouncementSpeed(speed || 35);
        setSystemAnnouncementGap(gap || 32);
      }
    });

    // Subscribe to chat topics in real-time to compute the unread exchange badge
    const unsubscribeChat = databaseService.subscribeChatTopics((allTopics) => {
      if (!allTopics) {
        setUnreadExchangeCount(0);
        return;
      }
      const count = allTopics.filter(topic => topic.unreadForAdmin === true).length;
      setUnreadExchangeCount(count);
    });

    // Create a periodic visual ticker running every 20 seconds to make sure that as Date.now() increments,
    // the online user filters dynamically re-evaluate and stay completely accurate
    const tickerInterval = setInterval(() => {
      setOnlineTick(t => t + 1);
    }, 20000);

    return () => {
      unsubscribeUsers();
      unsubscribeResults();
      unsubscribeSystem();
      unsubscribeChat();
      clearInterval(tickerInterval);
    };
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
      if (newRole === 'employee') {
        await databaseService.updateUser(userId, { role: newRole, canViewStats: false });
      } else {
        await databaseService.updateUser(userId, { role: newRole });
      }
      setNotice({ type: 'success', msg: `Đã thay đổi quyền tài khoản thành công.` });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật phân quyền.' });
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'approved', approvedAt: new Date().toISOString() });
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

  const handleToggleExecutive = async (userId: string, currentRole: string) => {
    try {
      if (currentRole !== 'executive') {
        await databaseService.updateUser(userId, { 
          role: 'executive',
          status: 'approved',
          approvedAt: new Date().toISOString(),
          company: 'TÂN PHÚ VIỆT NAM',
          department: 'Ban Tổng Giám Đốc',
          branch: 'Văn Phòng Công Ty (TPP-CTY)'
        });
        setNotice({ type: 'success', msg: 'Đã đặc cách tài khoản vào Ban Tổng Giám Đốc thành công.' });
      } else {
        await databaseService.updateUser(userId, { 
          role: 'employee'
        });
        setNotice({ type: 'success', msg: 'Đã bãi nhiệm quyền đặc cách Ban Tổng Giám Đốc.' });
      }
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật đặc quyền đặc cách.' });
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

  // Download Excel Template for Questions
  const handleDownloadTemplate = () => {
    const header = ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng (A/B/C/D)', 'Giải thích dặn dò'];
    const sampleRows = [
      [
        'Kiên trì, kỷ luật, tự học tập tự rèn luyện chính là tinh thần cốt lõi của chữ T nào trong 3T?',
        'Tự lực',
        'Tự học',
        'Trí tuệ',
        'Tất cả đều sai',
        'B',
        'Tự học là tinh thần chủ động nâng cao năng lực bản thân liên tục của người Tân Phú.'
      ],
      [
        'Khi nhân viên thắc mắc về quyết định tuyển dụng kéo dài nhiều tuần, bạn nên phản hồi theo tinh thần nào?',
        'Đổ lỗi cho bộ phận tuyển dụng hoặc cấp trên không duyệt.',
        'Im lặng không trả lời để tránh xung đột.',
        'Chủ động xin lỗi, giải thích rõ nút thắt tinh gọn quy trình và tìm giải pháp hỗ trợ kịp thời.',
        'Yêu cầu nhân viên tự đi hỏi bộ phận nhân sự.',
        'C',
        'Ứng xử văn minh, thẳng thắn, trách nhiệm và hướng đến tinh giản mọi thủ tục phiền hà.'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Cau_Hoi_3T');

    ws['!cols'] = [
      { wch: 55 }, // Câu hỏi
      { wch: 20 }, // A
      { wch: 20 }, // B
      { wch: 20 }, // C
      { wch: 20 }, // D
      { wch: 25 }, // Đáp án đúng
      { wch: 55 }  // Giải thích
    ];

    XLSX.writeFile(wb, 'Mau_Nap_Ngan_Hang_Cau_Hoi_3T.xlsx');
    setNotice({ type: 'success', msg: 'Đã tải mẫu Excel thành công!' });
  };

  // Export existing questions to Excel
  const handleExportQuestions = () => {
    if (questions.length === 0) {
      setNotice({ type: 'error', msg: 'Không có câu hỏi nào để xuất!' });
      return;
    }

    const exportData = questions.map((q, idx) => ({
      'STT': idx + 1,
      'Mã câu hỏi': q.id,
      'Nội dung câu hỏi': q.text,
      'Đáp án A': q.options[0] || '',
      'Đáp án B': q.options[1] || '',
      'Đáp án C': q.options[2] || '',
      'Đáp án D': q.options[3] || '',
      'Đáp án đúng (A/B/C/D)': q.correctAnswerIndex === 0 ? 'A' : q.correctAnswerIndex === 1 ? 'B' : q.correctAnswerIndex === 2 ? 'C' : 'D',
      'Giải thích dặn dò': q.explanation || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ngan_Hang_Cau_Hoi_3T');
    
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 15 }, // Mã câu hỏi
      { wch: 55 }, // Nội dung câu hỏi
      { wch: 25 }, // Đáp án A
      { wch: 25 }, // Đáp án B
      { wch: 25 }, // Đáp án C
      { wch: 25 }, // Đáp án D
      { wch: 25 }, // Đáp án đúng
      { wch: 55 }  // Giải thích
    ];

    XLSX.writeFile(wb, `Ngan_Hang_Cau_Hoi_3T_${Date.now()}.xlsx`);
    setNotice({ type: 'success', msg: `Đã xuất thành công ${questions.length} câu hỏi ra file Excel!` });
  };

  // Excel File Input Handler
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length === 0) {
          setNotice({ type: 'error', msg: 'File Excel không có dữ liệu!' });
          return;
        }

        // Detect columns dynamically
        const headers = jsonData[0].map(h => String(h || '').trim().toLowerCase());
        
        let textIdx = headers.findIndex(h => h.includes('câu hỏi') || h.includes('nội dung') || h.includes('question') || h.includes('text'));
        let optAIdx = headers.findIndex(h => h.includes('đáp án a') || h.includes('lựa chọn a') || h.includes('option a') || h === 'a');
        let optBIdx = headers.findIndex(h => h.includes('đáp án b') || h.includes('lựa chọn b') || h.includes('option b') || h === 'b');
        let optCIdx = headers.findIndex(h => h.includes('đáp án c') || h.includes('lựa chọn c') || h.includes('option c') || h === 'c');
        let optDIdx = headers.findIndex(h => h.includes('đáp án d') || h.includes('lựa chọn d') || h.includes('option d') || h === 'd');
        let correctIdx = headers.findIndex(h => h.includes('đáp án đúng') || h.includes('đáp án') || h.includes('correct') || h.includes('trả lời') || h.includes('chỉ mục'));
        let expIdx = headers.findIndex(h => h.includes('giải thích') || h.includes('dặn d') || h.includes('explanation') || h.includes('chú dẫn'));

        // Fallbacks for default row locations
        if (textIdx === -1) textIdx = 0;
        if (optAIdx === -1) optAIdx = 1;
        if (optBIdx === -1) optBIdx = 2;
        if (optCIdx === -1) optCIdx = 3;
        if (optDIdx === -1) optDIdx = 4;
        if (correctIdx === -1) correctIdx = 5;
        if (expIdx === -1) expIdx = 6;

        const isFirstRowHeader = jsonData[0].some(cell => {
          const s = String(cell || '').toLowerCase();
          return s.includes('câu hỏi') || s.includes('nội dung') || s.includes('đáp án') || s.includes('giải thích') || s.includes('dặn d') || s === 'a' || s === 'b' || s === 'c' || s === 'd' || s === 'stt';
        });
        const startRow = isFirstRowHeader ? 1 : 0;

        const parsedQuestions: Question[] = [];
        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const textVal = String(row[textIdx] || '').trim();
          if (!textVal) continue;

          const optA = String(row[optAIdx] || '').trim();
          const optB = String(row[optBIdx] || '').trim();
          const optC = String(row[optCIdx] || '').trim();
          const optD = String(row[optDIdx] || '').trim();

          if (!optA || !optB) continue;

          const optionsList = [optA, optB];
          if (optC) optionsList.push(optC);
          if (optD) optionsList.push(optD);

          const cleanOpts = optionsList.map(o => cleanOptionText(o));

          const rawCorrect = String(row[correctIdx] || '').trim();
          let correctIndex = 0;

          const normCorrect = rawCorrect.toUpperCase();
          if (normCorrect === 'A' || normCorrect.startsWith('A.') || normCorrect === 'DÁP ÁN A' || normCorrect === 'ĐÁP ÁN A' || normCorrect === '1') {
            correctIndex = 0;
          } else if (normCorrect === 'B' || normCorrect.startsWith('B.') || normCorrect === 'DÁP ÁN B' || normCorrect === 'ĐÁP ÁN B' || normCorrect === '2') {
            correctIndex = 1;
          } else if (normCorrect === 'C' || normCorrect.startsWith('C.') || normCorrect === 'DÁP ÁN C' || normCorrect === 'ĐÁP ÁN C' || normCorrect === '3') {
            correctIndex = 2;
          } else if (normCorrect === 'D' || normCorrect.startsWith('D.') || normCorrect === 'DÁP ÁN D' || normCorrect === 'ĐÁP ÁN D' || normCorrect === '4') {
            correctIndex = 3;
          } else {
            const parsedNum = parseInt(rawCorrect, 10);
            if (!isNaN(parsedNum)) {
              if (parsedNum >= 1 && parsedNum <= 4) {
                correctIndex = parsedNum - 1;
              } else if (parsedNum >= 0 && parsedNum <= 3) {
                correctIndex = parsedNum;
              }
            }
          }

          const explanationVal = String(row[expIdx] || '').trim() || 'Văn hóa 3T - Đồng hành cùng Tân Phú Việt Nam!';

          parsedQuestions.push({
            id: 'q_excel_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString().slice(-4),
            text: textVal,
            options: cleanOpts,
            correctAnswerIndex: correctIndex,
            explanation: explanationVal
          });
        }

        if (parsedQuestions.length === 0) {
          setNotice({ type: 'error', msg: 'Không tìm thấy câu hỏi hợp lệ nào trong file Excel!' });
          return;
        }

        setExcelPreviewQuestions(parsedQuestions);
        setShowExcelPreview(true);
      } catch (err) {
        console.error(err);
        setNotice({ type: 'error', msg: 'Lỗi đọc file Excel. Vui lòng kiểm tra lại cấu trúc file!' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // clean input
  };

  // Confirm Excel Import (either all or non-duplicated questions)
  const handleConfirmImport = async (importOnlyNew: boolean) => {
    setLoading(true);
    try {
      let toSave = [...excelPreviewQuestions];
      if (importOnlyNew) {
        toSave = excelPreviewQuestions.filter(newQ => 
          !questions.some(q => q.text.trim().toLowerCase() === newQ.text.trim().toLowerCase())
        );
      }

      if (toSave.length === 0) {
        setNotice({ type: 'error', msg: 'Không có câu hỏi mới nào để lưu (tất cả đều đã bị trùng lặp)!' });
        setShowExcelPreview(false);
        setExcelPreviewQuestions([]);
        return;
      }

      await databaseService.saveQuestions(toSave);
      setNotice({ type: 'success', msg: `Đã nhập và lưu thành công ${toSave.length} câu hỏi mới từ Excel!` });
      setShowExcelPreview(false);
      setExcelPreviewQuestions([]);
      await loadData();
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi lưu câu hỏi vào cơ sở dữ liệu!' });
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
          
          // Max dimension scaling constraint (optimized to 800px for faster mobile uploads and higher success rate)
          const MAX_SIZE = 800;
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
            // Compress with high compression quality 0.60 JPEG for optimal bandwidth
            const dataUrl = canvas.toDataURL('image/jpeg', 0.60);
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
        let errorMsg = "Gặp lỗi trong tiến trình giải mã hình ảnh.";
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const errResult = await response.json();
            errorMsg = errResult.error || errorMsg;
          } catch (e) {
            // Ignore parse error and keep default
          }
        } else {
          try {
            const rawText = await response.text();
            if (rawText.length > 0) {
              const titleMatch = rawText.match(/<title>([\s\S]*?)<\/title>/i);
              const titleText = titleMatch ? titleMatch[1].trim() : "";
              errorMsg = `Lỗi máy chủ (${response.status}): ${titleText || rawText.substring(0, 100)}...`;
            } else {
              errorMsg = `Lỗi kết nối máy chủ (Mã trạng thái: ${response.status}).`;
            }
          } catch (e) {
            errorMsg = `Lỗi kết nối HTTP status ${response.status}.`;
          }
        }
        
        throw new Error(
          `${errorMsg}\n\n👉 Ý KIẾN KHẮC PHỤC:\n` +
          `1. Có thể ảnh dung lượng quá lớn hoặc kết nối 4G/Wifi bị gián đoạn gây Hết thời gian chờ (Timeout).\n` +
          `2. Bạn hãy thử CHỤP ẢNH MÀN HÌNH (Screenshot) hình ảnh này để tối ưu dung lượng siêu nhẹ, rồi chọn tải ảnh chụp màn hình đó lên để bóc tách lại.\n` +
          `3. Nên thực hiện ở nơi sóng mạnh hoặc kết nối Wifi ổn định hơn.`
        );
      }

      let result;
      try {
        result = await response.json();
      } catch (e) {
        throw new Error("Không thể đọc phản hồi JSON từ máy chủ AI. Vui lòng thử lại bằng ảnh chụp màn hình gọn hơn.");
      }

      const aiQuestions: Question[] = result.questions || [];

      if (aiQuestions.length === 0) {
        setNotice({ type: 'error', msg: 'Không tìm thấy câu hỏi trắc nghiệm hợp lệ nào trong các hình ảnh đã chọn. Bạn hãy chụp thẳng diện câu hỏi và thử lại.' });
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
      setNotice({ 
        type: 'error', 
        msg: err.message || 'Lỗi bóc tác dữ liệu bằng AI. Vui lòng tải lại ảnh chụp nhỡ/bản chụp mờ hoặc kiểm tra mạng.' 
      });
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

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setEditQText(q.text || '');
    // Clean A. or other prefixes from stored option if needed, but cleanOptionText handles that!
    setEditQOpt0(cleanOptionText(q.options?.[0] || ''));
    setEditQOpt1(cleanOptionText(q.options?.[1] || ''));
    setEditQOpt2(cleanOptionText(q.options?.[2] || ''));
    setEditQOpt3(cleanOptionText(q.options?.[3] || ''));
    setEditQCorrectIndex(q.correctAnswerIndex ?? 0);
    setEditQExplanation(q.explanation || '');
  };

  const handleSaveQuestionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    const updatedOptions = [
      `A. ${editQOpt0.trim()}`,
      `B. ${editQOpt1.trim()}`,
      `C. ${editQOpt2.trim()}`,
      `D. ${editQOpt3.trim()}`,
    ];

    const updatedQ: Question = {
      ...editingQuestion,
      text: editQText.trim(),
      options: updatedOptions,
      correctAnswerIndex: editQCorrectIndex,
      explanation: editQExplanation.trim(),
    };

    setLoading(true);
    try {
      await databaseService.updateQuestion(updatedQ);
      setNotice({ type: 'success', msg: 'Đã cập nhật câu hỏi thành công!' });
      setEditingQuestion(null);
      await loadData();
    } catch (err) {
      console.error("Lỗi khi cập nhật câu hỏi:", err);
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật câu hỏi.' });
    } finally {
      setLoading(false);
    }
  };

  // Notifications and badge calculations
  const pendingUsersCount = users.filter(u => u.status?.toLowerCase() === 'pending').length;
  const approvedUsersCount = users.filter(u => u.status?.toLowerCase() === 'approved').length;
  const totalQuestionsCount = questions.length;
  const todayResults = useMemo(() => {
    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return results.filter(r => r.timestamp >= startOfTodayMs);
  }, [results]);
  const participantsTodayCount = new Set(todayResults.map(r => r.userId || r.userName)).size;
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
        const todayLocal = new Date();
        const year = todayLocal.getFullYear();
        const month = String(todayLocal.getMonth() + 1).padStart(2, '0');
        const day = String(todayLocal.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const getPriorityWeight = (u: User) => {
          const isLNT = (u.name || '').trim().normalize('NFC').toLowerCase().includes('lê nhật trường') || u.phone?.trim() === '0907767304' || u.role === 'admin';
          if (isLNT) return 1;

          const dept = (u.department || '').trim().normalize('NFC').toLowerCase();
          if (u.role === 'executive' || dept.includes('tổng giám đốc')) return 2;

          if (dept.includes('ban giám đốc') && !dept.includes('tổng giám đốc')) return 3;

          if (u.role === 'approver') return 4;

          const isApprovedToday = (u.status || '').toLowerCase() === 'approved' && u.createdAt && u.createdAt.startsWith(todayStr);
          if (isApprovedToday) return 5;

          const isOnline = u.lastActive && Math.abs(Date.now() - u.lastActive) <= 240000;
          if (isOnline) return 6;

          return 7;
        };

        const weightA = getPriorityWeight(a);
        const weightB = getPriorityWeight(b);

        if (weightA !== weightB) {
          return weightA - weightB;
        }

        if (weightA === 2) {
          const getExecutiveOrder = (name: string) => {
            const norm = (name || '').trim().normalize('NFC').toUpperCase();
            if (norm.includes('TRẦN ĐỨC HUY')) return 1;
            if (norm.includes('PHAN ANH TUẤN')) return 2;
            if (norm.includes('NGÔ ĐỨC TRUNG')) return 3;
            if (norm.includes('NGUYỄN THỊ THOẠI')) return 4;
            return 999;
          };
          const ordA = getExecutiveOrder(a.name || '');
          const ordB = getExecutiveOrder(b.name || '');
          if (ordA !== ordB) {
            return ordA - ordB;
          }
        }

        const aApproved = (a.status || '').toLowerCase() === 'approved';
        const bApproved = (b.status || '').toLowerCase() === 'approved';
        if (aApproved && !bApproved) return -1;
        if (!aApproved && bApproved) return 1;

        const timeA = a.createdAt || '';
        const timeB = b.createdAt || '';
        return timeB.localeCompare(timeA);
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
      {/* Global compact running marquee announcement banner */}
      {systemAnnouncement && systemAnnouncement.trim() ? (
        <div className="bg-transparent text-slate-700 text-[11px] font-bold py-2 overflow-hidden flex items-center shrink-0 z-50 select-none">
          <div 
            className="animate-marquee notranslate flex whitespace-nowrap animate-marquee-container" 
            style={{ 
              animationDuration: `${systemAnnouncementSpeed}s`, 
              gap: `${systemAnnouncementGap}px` 
            }} 
            translate="no"
          >
            <span>{systemAnnouncement}</span>
            <span className="text-gray-400 select-none">✦</span>
            <span>{systemAnnouncement}</span>
            <span className="text-gray-400 select-none">✦</span>
          </div>
        </div>
      ) : null}

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

          {/* Real-time active presence tracker - Only show online count as requested */}
          <div className="flex items-center gap-1.5 bg-emerald-50/45 border border-emerald-150/70 rounded-full px-4 py-1.5 shrink-0 shadow-3xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-black text-emerald-800 tracking-wide uppercase">
              ĐANG ONLINE: {onlineUsers.length}
            </span>
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
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
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
                className={`px-3 py-1 text-[10px] font-bold rounded transition-all active:scale-95 uppercase tracking-wider text-white cursor-pointer ${
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
        <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none pt-3">
          <button
            onClick={() => { setActiveTab('users'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'users' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Users className="h-[21px] w-[21px] text-current" />
              {pendingUsersCount > 0 && (
                <span className="absolute -top-2 -right-2 text-[9px] font-black leading-none bg-rose-500 text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 animate-pulse shadow-xs ring-1 ring-white">
                  {pendingUsersCount}
                </span>
              )}
            </div>
            <span translate="no" className="notranslate">PHÊ DUYỆT({approvedUsersCount})</span>
          </button>
          <button
            onClick={() => { setActiveTab('questions'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'questions' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <HelpCircle className="h-[21px] w-[21px] text-current" />
              {totalQuestionsCount > 0 && (
                <span className="absolute -top-2 -right-2 text-[9px] font-black leading-none bg-[#1971C2] text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 shadow-xs ring-1 ring-white">
                  {totalQuestionsCount}
                </span>
              )}
            </div>
            <span translate="no" className="notranslate">CÂU HỎI</span>
          </button>
          <button
            onClick={() => { setActiveTab('qr'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'qr' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <QrCode className="h-[21px] w-[21px] text-current" />
            </div>
            <span translate="no" className="notranslate">MÃ QR</span>
          </button>
          <button
            onClick={() => { setActiveTab('stats'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'stats' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <BarChart3 className="h-[21px] w-[21px] text-current" />
              {participantsTodayCount > 0 && (
                <span className="absolute -top-2 -right-2 text-[9px] font-black leading-none bg-blue-600 text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 shadow-xs ring-1 ring-white">
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
                scale: [1, 1.15, 0.95, 1.05, 0.98, 1.01, 1],
              } : {}}
              transition={{
                duration: 0.8,
                ease: "easeInOut"
              }}
              className={`text-[9.5px] font-black leading-none rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 shadow-xs ring-1 ring-white shrink-0 ${
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
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all md:flex hidden items-center gap-1.5 shrink-0 ${
              activeTab === 'encoding' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Database className="h-[21px] w-[21px] text-current" />
            </div>
            <span translate="no" className="notranslate">MÃ HÓA</span>
          </button>
          <button
            onClick={() => { setActiveTab('firebase_data'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'firebase_data' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Server className="h-[21px] w-[21px] text-current" />
            </div>
            <span translate="no" className="notranslate">DỮ LIỆU</span>
          </button>
          <button
            onClick={() => { setActiveTab('rules'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'rules' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Award className="h-[21px] w-[21px] text-current" />
            </div>
            <span translate="no" className="notranslate">QUY CHẾ</span>
          </button>
          <button
            onClick={() => { setActiveTab('personal'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'personal' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <UserCheck className="h-[21px] w-[21px] text-current" />
            </div>
            <span translate="no" className="notranslate">CÁ NHÂN</span>
          </button>
          <button
            onClick={() => { 
              setActiveTab('notifications'); 
              setNotice(null); 
              const now = Date.now();
              setLastReadAnnouncementAdminTimestamp(now);
              localStorage.setItem('3t_admin_last_read_ann_ts', String(now));
            }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'notifications' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <Bell className="h-[21px] w-[21px] text-current" />
              {unreadAnnouncementsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[8.5px] font-black leading-none bg-red-600 text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 shadow-xs ring-1 ring-white animate-pulse">
                  {unreadAnnouncementsCount}
                </span>
              )}
            </div>
            <span translate="no" className="notranslate">THÔNG BÁO</span>
          </button>
          <button
            onClick={() => { setActiveTab('exchange'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'exchange' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <MessageSquare className="h-[21px] w-[21px] text-current" />
              {unreadExchangeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[15px] leading-none animate-bounce">
                  {unreadExchangeCount}
                </span>
              )}
            </div>
            <span translate="no" className="notranslate">TRAO ĐỔI</span>
          </button>
          <button
            onClick={() => { setActiveTab('details'); setNotice(null); }}
            className={`pb-3 px-2 lg:px-3 text-[11.5px] md:text-[12px] font-medium border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'details' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative flex items-center justify-center p-0.5">
              <ClipboardList className="h-[21px] w-[21px] text-current" />
            </div>
            <span translate="no" className="notranslate">CHI TIẾT</span>
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

                {/* Bộ lọc tìm kiếm tiện ích */}
                {(() => {
                  const uniqueBranches = Array.from(new Set(users.map(u => u.branch).filter(Boolean))) as string[];
                  const uniqueDepartments = Array.from(new Set(users.map(u => u.department).filter(Boolean))) as string[];
                  const hasActiveFilters = userSearchQuery || userRoleFilter !== 'all' || userStatusFilter !== 'all' || userBranchFilter !== 'all' || userDeptFilter !== 'all';

                  return (
                    <div className="p-3 bg-slate-50 border-b border-gray-100 flex flex-col gap-2 font-sans">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        {/* Thanh tìm kiếm chính */}
                        <div className="md:col-span-4 relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="Tìm tên, SĐT, mã số..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 font-sans"
                          />
                          {userSearchQuery && (
                            <button
                              onClick={() => setUserSearchQuery('')}
                              className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Các bộ lọc dropdown */}
                        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {/* Vai trò */}
                          <div className="relative">
                            <select
                              value={userRoleFilter}
                              onChange={(e) => setUserRoleFilter(e.target.value)}
                              className="w-full pl-2 pr-5 py-1 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none font-sans cursor-pointer truncate"
                            >
                              <option value="all">Mọi vai trò</option>
                              <option value="admin">Chủ Admin</option>
                              <option value="executive">Ban TGĐ (Đặc cách)</option>
                              <option value="approver">Duyệt viên</option>
                              <option value="employee">CBNV</option>
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-gray-400">
                              <ChevronDown className="h-3 w-3" />
                            </span>
                          </div>

                          {/* Trạng thái */}
                          <div className="relative">
                            <select
                              value={userStatusFilter}
                              onChange={(e) => setUserStatusFilter(e.target.value)}
                              className="w-full pl-2 pr-5 py-1 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none font-sans cursor-pointer truncate"
                            >
                              <option value="all">Mọi trạng thái</option>
                              <option value="approved">Đã hoạt động</option>
                              <option value="pending">Chờ duyệt / Khóa</option>
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-gray-400">
                              <ChevronDown className="h-3 w-3" />
                            </span>
                          </div>

                          {/* Chi nhánh */}
                          <div className="relative">
                            <select
                              value={userBranchFilter}
                              onChange={(e) => setUserBranchFilter(e.target.value)}
                              className="w-full pl-2 pr-5 py-1 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none font-sans cursor-pointer truncate"
                            >
                              <option value="all">Mọi chi nhánh</option>
                              {uniqueBranches.map((br) => (
                                <option key={br} value={br}>{br}</option>
                              ))}
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-gray-400">
                              <ChevronDown className="h-3 w-3" />
                            </span>
                          </div>

                          {/* Bộ phận */}
                          <div className="relative">
                            <select
                              value={userDeptFilter}
                              onChange={(e) => setUserDeptFilter(e.target.value)}
                              className="w-full pl-2 pr-5 py-1 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none font-sans cursor-pointer truncate"
                            >
                              <option value="all">Mọi bộ phận</option>
                              {uniqueDepartments.map((dp) => (
                                <option key={dp} value={dp}>{dp}</option>
                              ))}
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-gray-400">
                              <ChevronDown className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Thông tin lọc active */}
                      {hasActiveFilters && (
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 border-t border-gray-100/60 pt-1.5 mt-0.5">
                          <span>Đang lọc danh sách thành viên:</span>
                          <button
                            onClick={() => {
                              setUserSearchQuery('');
                              setUserRoleFilter('all');
                              setUserStatusFilter('all');
                              setUserBranchFilter('all');
                              setUserDeptFilter('all');
                            }}
                            className="flex items-center gap-1 text-[10px] font-semibold text-rose-500 hover:text-rose-600 transition-colors bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                            <span>Xóa tất cả bộ lọc</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                        // 1. Deduplicate users by Name & Phone to ensure exact unique entries
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

                        // 1.5 Apply Filters & Search
                        const filtered = dedupedRaw.filter((item) => {
                          if (userSearchQuery.trim()) {
                            const q = userSearchQuery.trim().toLowerCase();
                            const matchesName = (item.name || '').toLowerCase().includes(q);
                            const matchesPhone = (item.phone || '').toLowerCase().includes(q);
                            const matchesEmpId = (item.employeeId || '').toLowerCase().includes(q);
                            const matchesDept = (item.department || '').toLowerCase().includes(q);
                            const matchesBranch = (item.branch || '').toLowerCase().includes(q);
                            
                            if (!matchesName && !matchesPhone && !matchesEmpId && !matchesDept && !matchesBranch) {
                              return false;
                            }
                          }

                          if (userRoleFilter !== 'all') {
                            if (item.role !== userRoleFilter) return false;
                          }

                          if (userStatusFilter !== 'all') {
                            const status = (item.status || '').toLowerCase();
                            if (userStatusFilter === 'approved') {
                              if (status !== 'approved') return false;
                            } else if (userStatusFilter === 'pending') {
                              if (status !== 'pending' && status !== 'rejected' && status !== 'blocked') return false;
                            }
                          }

                          if (userBranchFilter !== 'all') {
                            if (item.branch !== userBranchFilter) return false;
                          }

                          if (userDeptFilter !== 'all') {
                            if (item.department !== userDeptFilter) return false;
                          }

                          return true;
                        });

                        // 2. Sort order according to priority:
                        // 1. Admin
                        // 2. Ban Tổng Giám Đốc
                        // 3. Ban Giám Đốc
                        // 4. Trưởng Bộ Phận (Duyệt viên)
                        // 5. CBNV mới được duyệt (Approved in the today)
                        // 6. Nhân viên đang online (Active within last 240 seconds - priority 6)
                        // 7. CBNV khác
                        const todayLocal = new Date();
                        const year = todayLocal.getFullYear();
                        const month = String(todayLocal.getMonth() + 1).padStart(2, '0');
                        const day = String(todayLocal.getDate()).padStart(2, '0');
                        const todayStr = `${year}-${month}-${day}`;

                        const getPriorityWeight = (u: User) => {
                          const isLNT = (u.name || '').trim().normalize('NFC').toLowerCase().includes('lê nhật trường') || u.phone?.trim() === '0907767304' || u.role === 'admin';
                          if (isLNT) return 1;

                          const dept = (u.department || '').trim().normalize('NFC').toLowerCase();
                          if (u.role === 'executive' || dept.includes('tổng giám đốc')) return 2;

                          if (dept.includes('ban giám đốc') && !dept.includes('tổng giám đốc')) return 3;

                          if (u.role === 'approver') return 4;

                          const isApprovedToday = (u.status || '').toLowerCase() === 'approved' && u.createdAt && u.createdAt.startsWith(todayStr);
                          if (isApprovedToday) return 5;

                          const isOnline = u.lastActive && Math.abs(Date.now() - u.lastActive) <= 240000;
                          if (isOnline) return 6;

                          return 7;
                        };

                        const sorted = [...filtered].sort((a, b) => {
                          const weightA = getPriorityWeight(a);
                          const weightB = getPriorityWeight(b);

                          if (weightA !== weightB) {
                            return weightA - weightB;
                          }

                          if (weightA === 2) {
                            const getExecutiveOrder = (name: string) => {
                              const norm = (name || '').trim().normalize('NFC').toUpperCase();
                              if (norm.includes('TRẦN ĐỨC HUY')) return 1;
                              if (norm.includes('PHAN ANH TUẤN')) return 2;
                              if (norm.includes('NGÔ ĐỨC TRUNG')) return 3;
                              if (norm.includes('NGUYỄN THỊ THOẠI')) return 4;
                              return 999;
                            };
                            const ordA = getExecutiveOrder(a.name || '');
                            const ordB = getExecutiveOrder(b.name || '');
                            if (ordA !== ordB) {
                              return ordA - ordB;
                            }
                          }

                          // Same group: put approved before pending/rejected (crucial for "CBNV mới được duyệt" to appear higher)
                          const aApproved = (a.status || '').toLowerCase() === 'approved';
                          const bApproved = (b.status || '').toLowerCase() === 'approved';
                          if (aApproved && !bApproved) return -1;
                          if (!aApproved && bApproved) return 1;

                          // Then sort by registration date descending (newest first)
                          const timeA = a.createdAt || '';
                          const timeB = b.createdAt || '';
                          return timeB.localeCompare(timeA);
                        });

                        if (sorted.length === 0) {
                          const hasFilters = userSearchQuery || userRoleFilter !== 'all' || userStatusFilter !== 'all' || userBranchFilter !== 'all' || userDeptFilter !== 'all';
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                                <span translate="no" className="notranslate">
                                  {hasFilters 
                                    ? "Không có CBNV nào khớp với bộ lọc & tìm kiếm hiện tại." 
                                    : "Chưa có dữ liệu CBNV đăng ký."}
                                </span>
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
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span translate="no" className="notranslate block font-sans text-gray-400 font-normal">{item.phone}</span>
                                  {(() => {
                                    const isOnline = item.lastActive && Math.abs(Date.now() - item.lastActive) <= 240000;
                                    const isApprovedToday = (item.status || '').toLowerCase() === 'approved' && item.createdAt && item.createdAt.startsWith(todayStr);
                                    return (
                                      <>
                                        {isOnline && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-green-600 animate-pulse bg-green-50 px-1 py-0.5 rounded border border-green-200 uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block"></span>
                                            <span>online</span>
                                          </span>
                                        )}
                                        {isApprovedToday && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-red-600 animate-pulse bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                            <span className="w-1 h-1 rounded-full bg-red-600 inline-block animate-ping"></span>
                                            <span>New</span>
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span translate="no" className="notranslate">{item.department}</span>
                                <span translate="no" className="notranslate block font-sans text-gray-450 mt-0.5">{item.branch}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-start">
                                  <span className={`w-24 h-5 inline-flex items-center justify-center rounded border text-[9px] font-black tracking-wider uppercase ${
                                    item.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    item.role === 'executive' ? 'bg-orange-50 text-[#E8590C] border-orange-200' :
                                    item.role === 'approver' ? 'bg-yellow-50 text-yellow-700 border-yellow-250' :
                                    'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}>
                                    <span translate="no" className="notranslate">
                                      {item.role === 'admin' ? 'CHỦ ADMIN' : 
                                       item.role === 'executive' ? 'BAN TGĐ' :
                                       item.role === 'approver' ? 'DUYỆT VIÊN' : 'CBNV'}
                                    </span>
                                  </span>
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
                                <div className="flex items-center justify-end gap-1 font-sans">
                                  {item.id !== 'admin_lenhattruong' && item.name !== 'Lê Nhật Trường' && (
                                    <>
                                      {/* Đặc cách Ban Tổng Giám Đốc */}
                                      <button
                                        onClick={() => handleToggleExecutive(item.id, item.role)}
                                        className={`p-1 rounded-md border transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                                          item.role === 'executive' 
                                            ? "text-[#E8590C] bg-orange-100 border-[#E8590C]/50 hover:bg-orange-200" 
                                            : "text-slate-400 bg-slate-50 border-slate-200 hover:text-[#E8590C] hover:bg-orange-50 hover:border-orange-200"
                                        }`}
                                        title={item.role === 'executive' ? "Hủy đặc cách Ban Tổng Giám Đốc" : "Đặc cách vào Ban Tổng Giám Đốc"}
                                      >
                                        <Zap className={`h-3.5 w-3.5 ${item.role === 'executive' ? 'fill-[#E8590C]' : ''}`} />
                                      </button>

                                      {/* Approve / Reject Actions */}
                                      {item.status?.toLowerCase() !== 'approved' ? (
                                        <button
                                          onClick={() => handleApproveUser(item.id)}
                                          className="p-1 rounded-md border text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                                          title="Phê duyệt tài khoản hoạt động"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleRejectUser(item.id)}
                                          className="p-1 rounded-md border text-amber-600 bg-amber-50 border-amber-250 hover:bg-amber-100 hover:text-amber-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                                          title="Tạm khóa tài khoản"
                                        >
                                          <Lock className="h-3.5 w-3.5" />
                                        </button>
                                      )}

                                      {/* Edit button */}
                                      <button
                                        onClick={() => handleOpenEdit(item)}
                                        className="p-1 rounded-md border text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                                        title="Sửa thông tin tài khoản"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Toggle role operator */}
                                      {item.role === 'employee' ? (
                                        <button
                                          onClick={() => handleToggleRole(item.id, item.role)}
                                          className="p-1 rounded-md border text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                                          title="Đặt làm Trưởng bộ phận (Duyệt viên)"
                                        >
                                          <UserCheck className="h-3.5 w-3.5" />
                                        </button>
                                      ) : item.role === 'approver' ? (
                                        <button
                                          onClick={() => handleToggleRole(item.id, item.role)}
                                          className="p-1 rounded-md border text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                                          title="Hạ cấp xuống Cán bộ nhân viên"
                                        >
                                          <UserMinus className="h-3.5 w-3.5" />
                                        </button>
                                      ) : (
                                        /* For other high roles (executive), we can disable/hide or offer demotion */
                                        <button
                                          disabled
                                          className="p-1 rounded-md border text-slate-300 bg-slate-50 border-slate-100 transition-all flex items-center justify-center cursor-not-allowed opacity-50"
                                          title="Không khả dụng cho vai trò này"
                                        >
                                          <UserCheck className="h-3.5 w-3.5" />
                                        </button>
                                      )}

                                      {/* Toggle Stats view permission */}
                                      <button
                                        onClick={() => handleToggleStatsPermission(item.id, !!item.canViewStats)}
                                        className={`p-1 rounded-md border transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                                          item.canViewStats 
                                            ? "text-teal-700 bg-teal-50 border-teal-300 hover:bg-teal-100 hover:text-teal-800" 
                                            : "text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                                        }`}
                                        title={item.canViewStats ? "Thu hồi quyền xem Thống Kê" : "Cấp quyền xem Thống Kê"}
                                      >
                                        <BarChart3 className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Delete button */}
                                      <button
                                        onClick={() => setUserToDelete(item)}
                                        className="p-1 rounded-md border text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                                        title="Xóa tài khoản vĩnh viễn"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
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
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={handleDownloadTemplate}
                    title="Tải tệp Excel mẫu để chuẩn bị câu hỏi"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <FileDown className="h-3.5 w-3.5 text-gray-500" />
                    <span>TẢI FILE MẪU</span>
                  </button>

                  <label
                    title="Nhập danh sách câu hỏi từ tệp Excel"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 rounded-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-600" />
                    <span>NHẬP EXCEL</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelImport}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={handleExportQuestions}
                    title="Xuất toàn bộ câu hỏi hiện tại ra file Excel"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>XUẤT EXCEL</span>
                  </button>

                  <button
                    onClick={onSimulateEmployee}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span>MOBILE</span>
                  </button>
                </div>
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

              {/* Image Extractor Form */}
              <div className="bg-white border border-gray-150 rounded-md p-6 shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowImageForm(!showImageForm)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-900 uppercase tracking-widest focus:outline-none cursor-pointer"
                >
                  <span translate="no" className="notranslate">THÊM CÂU HỎI BẰNG HÌNH ẢNH</span>
                  {showImageForm ? (
                    <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 transition-transform" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 transition-transform" />
                  )}
                </button>

                {showImageForm && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-4 font-sans">
                    <p className="text-xs text-gray-550">Tải lên hình ảnh chụp đề thi để bóc tách tự động bằng AI siêu tốc.</p>
                    
                    {/* Image Input field Box */}
                    <div className="border-2 border-dashed border-gray-200 rounded-md p-8 text-center space-y-4 bg-gray-50/50">
                      <div className="bg-blue-50 text-blue-600 h-10 w-10 rounded-full flex items-center justify-center mx-auto border border-blue-100">
                        <ImagePlus className="h-5 w-5 text-[#1971C2]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider"><span translate="no" className="notranslate">Tải lên loạt hình ảnh chụp đề thi 3T</span></h3>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-md mx-auto leading-relaxed"><span translate="no" className="notranslate">Cơ chế nén tự động tối ưu hóa dung lượng & API Quota sẽ chạy tại chỗ trước khi phân tích qua Gemini AI.</span></p>
                      </div>
                      
                      <div className="relative inline-block mt-2">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          disabled={extracting || loading}
                        />
                        <button type="button" className="bg-[#1971C2] text-white font-bold text-[10px] uppercase tracking-wider py-2 px-5 rounded shadow-sm hover:bg-opacity-95 cursor-pointer">
                          <span translate="no" className="notranslate">{loading ? 'Đang nén ảnh...' : 'Chọn từ máy tính / chụp ảnh'}</span>
                        </button>
                      </div>

                      {selectedImages.length > 0 && (
                        <div className="pt-4 max-w-sm mx-auto border-t border-gray-200/50 mt-4">
                          <div className="text-[10px] text-gray-450 uppercase mb-2 font-bold tracking-wider"><span translate="no" className="notranslate">Hình ảnh đã chọn ({selectedImages.length})</span></div>
                          <div className="flex gap-2 justify-center flex-wrap">
                            {selectedImages.map((img, iIdx) => (
                              <div key={iIdx} className="relative h-12 w-12 rounded overflow-hidden bg-gray-100 border border-gray-250">
                                <img 
                                  src={`data:image/jpeg;base64,${img.compressedBase64}`} 
                                  alt="preview" 
                                  className="object-cover h-full w-full" 
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== iIdx))}
                                  className="absolute bg-black/60 text-white rounded-full p-0.5 top-0.5 right-0.5 hover:bg-black cursor-pointer"
                                  title="Xóa hình"
                                >
                                  <UserMinus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="pt-4">
                            <button
                              type="button"
                              onClick={handleExtractWithAI}
                              disabled={extracting || selectedImages.length === 0}
                              className="w-full bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2 px-4 rounded shadow-sm cursor-pointer uppercase tracking-wider"
                            >
                              <span translate="no" className="notranslate">{extracting ? 'Trí tuệ Nhân tạo Gemini đang bóc tách...' : 'Phân Tích Bóc Tách Đề Bằng AI'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Extract questions table with duplication warnings! */}
                    {extractedQuestions.length > 0 && (
                      <div className="border border-gray-150 rounded-md shadow-sm overflow-hidden space-y-4 p-4 bg-white mt-4">
                        <div className="border-b border-gray-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xs font-bold text-gray-505 uppercase tracking-widest"><span translate="no" className="notranslate">Nội dung câu hỏi AI bóc tách</span></h3>
                            <p className="text-[10px] text-red-500 mt-0.5 italic"><span translate="no" className="notranslate">Hệ thống đã tự động rà quét kiểm tra trùng lặp câu hỏi.</span></p>
                          </div>

                          {/* Stats Badge circled by the user */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                              <span className="text-[10px] font-extrabold text-green-700">
                                {extractedQuestions.filter(q => !q.isDuplicate).length} CÂU HỢP LỆ
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange Block rounded border border-orange-200 bg-orange-50">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                              <span className="text-[10px] font-extrabold text-orange-700">
                                {extractedQuestions.filter(q => q.isDuplicate).length} CÂU KHÔNG HỢP LỆ
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveExtractedQuestions}
                            className="bg-green-600 hover:bg-green-750 text-white font-bold text-[10px] uppercase tracking-wider py-2 px-4 rounded cursor-pointer shrink-0"
                          >
                            <span translate="no" className="notranslate">Lưu đề không trùng lặp</span>
                          </button>
                        </div>

                        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                          {extractedQuestions.map((eq, qIdx) => (
                            <div 
                              key={eq.id}
                              className={`p-3 rounded border ${
                                eq.isDuplicate ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50/50 border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <span translate="no" className="notranslate text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded font-bold uppercase">CÂU TRÍ TUỆ {qIdx + 1}</span>
                                {eq.isDuplicate ? (
                                  <span translate="no" className="notranslate flex items-center gap-1 font-bold text-orange-700 text-[10px] px-2 py-0.5 bg-orange-100/55 border border-orange-200/60 rounded-full leading-none">
                                    <AlertTriangle className="h-2.5 w-2.5" /> TRÙNG LẶP SỐ LIỆU ĐỀ CŨ
                                  </span>
                                ) : (
                                  <span translate="no" className="notranslate text-green-700 text-[10px] font-bold px-2 py-0.5 bg-green-50 border border-green-200 rounded-full leading-none">HỢP LỆ</span>
                                )}
                              </div>

                              <div className="pt-2">
                                <h4 className="font-bold text-xs text-gray-800">{eq.text}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                                  {eq.options.map((opt, oIdx) => (
                                    <div key={oIdx} className={`p-1.5 rounded text-[11px] text-gray-600 ${
                                      oIdx === eq.correctAnswerIndex ? 'bg-green-50 border border-green-200/80 text-green-900 font-bold' : 'bg-white border border-gray-150'
                                    }`}>
                                      {String.fromCharCode(65 + oIdx)}. {cleanOptionText(opt)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active list table */}
              <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden">
                <div className="p-3 border-b border-gray-105 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest shrink-0">
                    <span translate="no" className="notranslate">Ngân hàng đề hiện có ({questions.length} câu)</span>
                  </h3>
                  
                  {/* Tìm kiếm câu hỏi */}
                  <div className="relative w-full sm:max-w-xs font-sans">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Tìm kiếm câu hỏi, đáp án, dặn dò..."
                      value={questionSearchQuery}
                      onChange={(e) => setQuestionSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 text-gray-750"
                    />
                    {questionSearchQuery && (
                      <button
                        onClick={() => setQuestionSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse font-sans">
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const filteredQuestions = questions.filter(q => {
                          if (!questionSearchQuery.trim()) return true;
                          const query = questionSearchQuery.toLowerCase().trim();
                          const matchesText = (q.text || '').toLowerCase().includes(query);
                          const matchesExplanation = (q.explanation || '').toLowerCase().includes(query);
                          const matchesOptions = q.options?.some(opt => (opt || '').toLowerCase().includes(query));
                          return matchesText || matchesExplanation || matchesOptions;
                        });

                        if (filteredQuestions.length === 0) {
                          return (
                            <tr>
                              <td className="p-8 text-center text-gray-400 italic">
                                Không tìm thấy câu hỏi phù hợp với từ khóa tìm kiếm.
                              </td>
                            </tr>
                          );
                        }

                        return filteredQuestions.map((q) => {
                          const originalIndex = questions.indexOf(q);
                          return (
                            <tr key={q.id} className="hover:bg-gray-50/20">
                              <td className="p-4 space-y-2">
                                <div className="flex justify-between items-start gap-3">
                                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full uppercase">Câu {originalIndex + 1}</span>
                                  
                                  <div className="flex items-center gap-1.5">
                                    {/* Nút Chỉnh sửa */}
                                    <button 
                                      onClick={() => handleOpenEditQuestion(q)}
                                      className="text-blue-600 hover:bg-blue-105 p-1 rounded-md transition-all shrink-0 cursor-pointer border border-blue-100 hover:border-blue-200 bg-blue-50/50"
                                      title="Chỉnh sửa nội dung câu hỏi"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Nút Xóa */}
                                    <button 
                                      onClick={() => handleDeleteQuestion(q.id)}
                                      className="text-red-605 hover:bg-red-105 p-1 rounded-md transition-all shrink-0 cursor-pointer border border-red-100 hover:border-red-200 bg-red-50/50"
                                      title="Xóa câu hỏi khỏi hệ thống"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm leading-snug">{q.text}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className={`rounded p-2 border ${
                                      oIdx === q.correctAnswerIndex ? 'bg-green-50/50 border-green-205 text-green-905 font-bold shadow-2xs' : 'bg-gray-50/50 border-gray-100 text-gray-500'
                                    }`}>
                                      {String.fromCharCode(65 + oIdx)}. {cleanOptionText(opt)}
                                    </div>
                                  ))}
                                </div>
                                <div className="bg-blue-50/30 border border-blue-100/50 p-2.5 rounded-md text-blue-700 text-[11px] leading-relaxed">
                                  <span translate="no" className="notranslate"><strong>Dặn dò:</strong> {q.explanation}</span>
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
                              <span className="truncate pr-1">{br.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <label className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-gray-250 bg-white hover:bg-gray-50 rounded text-[10px] text-gray-500 font-bold select-none cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={br.excludeFromStats !== true}
                                    onChange={async (e) => {
                                      const updated = companyMappings.map(co => {
                                        if (co.id === selectedCoId) {
                                          return {
                                            ...co,
                                            branches: co.branches.map(b => {
                                              if (b.id === br.id) {
                                                return { ...b, excludeFromStats: !e.target.checked };
                                              }
                                              return b;
                                            })
                                          };
                                        }
                                        return co;
                                      });
                                      await databaseService.saveCompanyMappings(updated);
                                      setCompanyMappings(updated);
                                    }}
                                    className="rounded border-gray-300 text-blue-650 focus:ring-blue-500 h-3 w-3 cursor-pointer"
                                  />
                                  <span>Tính điểm</span>
                                </label>
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
                              <span className="truncate pr-1">{dept.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <label className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-gray-250 bg-white hover:bg-gray-50 rounded text-[10px] text-gray-500 font-bold select-none cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={dept.excludeFromStats !== true}
                                    onChange={async (e) => {
                                      const updated = companyMappings.map(co => {
                                        if (co.id === selectedCoId) {
                                          return {
                                            ...co,
                                            branches: co.branches.map(b => {
                                              if (b.id === selectedBrId) {
                                                return {
                                                  ...b,
                                                  departments: b.departments.map(d => {
                                                    if (d.id === dept.id) {
                                                      return { ...d, excludeFromStats: !e.target.checked };
                                                    }
                                                    return d;
                                                  })
                                                };
                                              }
                                              return b;
                                            })
                                          };
                                        }
                                        return co;
                                        });
                                        await databaseService.saveCompanyMappings(updated);
                                        setCompanyMappings(updated);
                                    }}
                                    className="rounded border-gray-300 text-blue-650 focus:ring-blue-500 h-3 w-3 cursor-pointer"
                                  />
                                  <span>Tính điểm</span>
                                </label>
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

          {/* QUY CHẾ View - 3T Levels & Promotion Rules Config Panel */}
          {activeTab === 'rules' && editableRules && (
            <motion.div
              key="level_rules_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-left"
            >
              {/* Header card */}
              <div className="bg-white border border-gray-150 rounded-md p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs font-sans">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <Award className="h-4 w-4 text-[#1971C2]" />
                    <span>Thiết Lập Quy Chế Thăng & Hạ Cấp Độ Ôn Luyện 3T</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Tùy biến điều kiện thăng tiến thứ hạng, thời gian tối đa mỗi câu và mốc điểm cộng phản xạ nhanh.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleRestoreDefaultRules}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-250 rounded-md shadow-2xs transition-colors cursor-pointer active:scale-95"
                    title="Khôi phục lại cấu hình mặc định sẵn có của hệ thống"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>MẪU MẶC ĐỊNH</span>
                  </button>
                  <button
                    onClick={handleSaveLevelRules}
                    disabled={savingLevelRules}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-green-600 hover:bg-green-750 disabled:opacity-50 rounded-md shadow-xs transition-colors cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    {savingLevelRules ? (
                      <>
                        <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                        <span>ĐANG ĐỒNG BỘ...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>LƯU ĐỒNG BỘ LÊN CLOUD</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status alert notification */}
              {rulesNotice && (
                <div className={`p-4 rounded-md border text-xs leading-relaxed font-bold flex items-center justify-between gap-3 ${
                  rulesNotice.type === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-900 shadow-3xs' 
                    : 'bg-red-50 border-red-200 text-red-900 shadow-3xs'
                }`}>
                  <div className="flex items-center gap-2">
                    {rulesNotice.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                    <span>{rulesNotice.msg}</span>
                  </div>
                  <button onClick={() => setRulesNotice(null)} className="text-[10px] font-bold uppercase shrink-0 hover:underline">Đóng</button>
                </div>
              )}

              {/* Grid content blocks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12 font-sans">
                {/* Left Column (Main rules configuration) */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Card 1: Giới thiệu chung */}
                  <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4">
                    <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-3">
                      <Award className="h-5 w-5 text-indigo-600" />
                      <span>Tổng quan Sảnh Quy Chế</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                      Nội dung giới thiệu xuất hiện trên phần đầu trang khi cán bộ nhân viên mở sổ tay Quy Chế 3T Mastery.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[11.5px] font-bold text-gray-650 block">Mô tả quyển quy chế:</label>
                      <textarea
                        value={editableRules.introduction || ''}
                        onChange={(e) => setEditableRules({ ...editableRules, introduction: e.target.value })}
                        className="w-full min-h-[140px] text-xs p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed font-medium"
                        placeholder="Nhập nội dung dẫn nhập quy chế..."
                      />
                    </div>
                  </div>

                  {/* Card 2: Quy định duy trì phong độ */}
                  <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4">
                    <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span>Duy Trì & Hạ Cấp Tự Động</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                      Quy định về thời gian, số lượt ôn thi tối thiểu hàng ngày và kịch bản giảm cấp độ tự động nếu thiếu hoạt động.
                    </p>
                    
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[11.5px] font-bold text-gray-650 block">Tiêu đề tiêu chuẩn:</label>
                        <input
                          type="text"
                          value={editableRules.inactivityTitle || 'Quy Định Duy Trì & Không Hoạt Động'}
                          onChange={(e) => setEditableRules({ ...editableRules, inactivityTitle: e.target.value })}
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11.5px] font-bold text-gray-650 block">Yêu cầu duy trì (Dòng 1):</label>
                        <textarea
                          rows={3}
                          value={editableRules.inactivityRule1 || 'Mỗi ngày, nhân viên cần phải thực hiện ít nhất 02 lượt đánh giá để duy trì và giữ vững phong độ của mình.'}
                          onChange={(e) => setEditableRules({ ...editableRules, inactivityRule1: e.target.value })}
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 leading-normal font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11.5px] font-bold text-gray-650 block">Chế tài giảm cấp độ (Dòng 2):</label>
                        <textarea
                          rows={3}
                          value={editableRules.inactivityRule2 || 'Nếu không hoạt động, hệ thống sẽ tự động hạ dần cấp độ (mỗi ngày hạ mỗi cấp) cho đến khi quay về lại cấp 1.'}
                          onChange={(e) => setEditableRules({ ...editableRules, inactivityRule2: e.target.value })}
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 leading-normal font-medium"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column (5 Levels Configuration cards) */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4">
                    <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-3">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span>Cấu hình chi tiết 5 Cấp độ 3T</span>
                    </h4>
                    
                    <div className="space-y-4">
                      {editableRules.levels.map((lvl, index) => {
                        const getLvlHeaderColor = (lvlNum: number) => {
                          if (lvlNum === 1) return 'border-b-2 border-slate-400';
                          if (lvlNum === 2) return 'border-b-2 border-blue-500';
                          if (lvlNum === 3) return 'border-b-2 border-emerald-500';
                          if (lvlNum === 4) return 'border-b-2 border-amber-500';
                          return 'border-b-2 border-rose-500';
                        };

                        const getLvlHeaderBg = (lvlNum: number) => {
                          if (lvlNum === 1) return 'bg-slate-50 text-slate-900';
                          if (lvlNum === 2) return 'bg-blue-50/45 text-blue-900';
                          if (lvlNum === 3) return 'bg-emerald-50/25 text-emerald-900';
                          if (lvlNum === 4) return 'bg-amber-50/35 text-amber-900';
                          return 'bg-rose-50/35 text-rose-900';
                        };

                        return (
                          <div key={lvl.level} className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                            <div className={`p-3 font-bold text-xs flex justify-between items-center ${getLvlHeaderBg(lvl.level)} ${getLvlHeaderColor(lvl.level)}`}>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center font-mono text-[10px] w-5 h-5 rounded-full bg-slate-900 text-white font-black">{lvl.level}</span>
                                <span className="uppercase tracking-wider">{lvl.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500 font-semibold uppercase shrink-0">Biểu tượng:</span>
                                <input
                                  type="text"
                                  value={lvl.emoji || ''}
                                  onChange={(e) => {
                                    const newLevels = [...editableRules.levels];
                                    newLevels[index] = { ...newLevels[index], emoji: e.target.value };
                                    setEditableRules({ ...editableRules, levels: newLevels });
                                  }}
                                  className="w-10 text-center text-xs p-1 bg-white border border-gray-250 rounded font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div className="p-4 space-y-4 bg-white/50 text-[11px] leading-relaxed">
                              {/* 2-Column Basics */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-gray-650 font-bold block">Tên cấp bậc hiệu chỉnh:</label>
                                  <input
                                    type="text"
                                    value={lvl.name || ''}
                                    onChange={(e) => {
                                      const newLevels = [...editableRules.levels];
                                      newLevels[index] = { ...newLevels[index], name: e.target.value };
                                      setEditableRules({ ...editableRules, levels: newLevels });
                                    }}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-gray-655 font-bold block">Thời gian trả lời tối đa mỗi câu:</label>
                                  <input
                                    type="text"
                                    value={lvl.maxTime || ''}
                                    onChange={(e) => {
                                      const newLevels = [...editableRules.levels];
                                      newLevels[index] = { ...newLevels[index], maxTime: e.target.value };
                                      setEditableRules({ ...editableRules, levels: newLevels });
                                    }}
                                    placeholder="Ví dụ: 15s/câu"
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono font-semibold text-gray-700"
                                  />
                                </div>
                              </div>

                              {/* Promotion & Demotion Textarea */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                <div className="space-y-1">
                                  <label className="text-blue-900 font-extrabold block flex items-center gap-1">
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 animate-none shrink-0" />
                                    <span>Điều kiện Thăng Cấp (Thăng hạng):</span>
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={lvl.promotion || ''}
                                    onChange={(e) => {
                                      const newLevels = [...editableRules.levels];
                                      newLevels[index] = { ...newLevels[index], promotion: e.target.value };
                                      setEditableRules({ ...editableRules, levels: newLevels });
                                    }}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal font-medium"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-red-900 font-extrabold block flex items-center gap-1">
                                    <ChevronDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                    <span>Quy chế Cảnh Báo & Hạ Cấp:</span>
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={lvl.demotion || ''}
                                    onChange={(e) => {
                                      const newLevels = [...editableRules.levels];
                                      newLevels[index] = { ...newLevels[index], demotion: e.target.value };
                                      setEditableRules({ ...editableRules, levels: newLevels });
                                    }}
                                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 leading-normal font-medium"
                                  />
                                </div>
                              </div>

                              {/* Reaction scoring thresholds */}
                              <div className="border-t border-gray-100 pt-3 space-y-2">
                                <span className="font-extrabold text-[#0B3A60] uppercase tracking-wider block">Mốc thời gian quy đổi điểm phản xạ cộng thêm:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                  <div className="bg-emerald-50/40 p-2 rounded-lg border border-emerald-100">
                                    <label className="text-[9.5px] font-black text-emerald-800 block mb-1">Mốc cộng 10 điểm:</label>
                                    <input
                                      type="text"
                                      value={lvl.reactionPoints?.[0] || ''}
                                      onChange={(e) => {
                                        const newLevels = [...editableRules.levels];
                                        const newPoints = [...(newLevels[index].reactionPoints || ['', '', '', ''])];
                                        newPoints[0] = e.target.value;
                                        newLevels[index] = { ...newLevels[index], reactionPoints: newPoints };
                                        setEditableRules({ ...editableRules, levels: newLevels });
                                      }}
                                      className="w-full text-xs p-1 border border-emerald-200 rounded bg-white text-emerald-950 font-bold focus:outline-none"
                                    />
                                  </div>
                                  <div className="bg-blue-50/40 p-2 rounded-lg border border-blue-100">
                                    <label className="text-[9.5px] font-black text-blue-800 block mb-1">Mốc cộng 8 điểm:</label>
                                    <input
                                      type="text"
                                      value={lvl.reactionPoints?.[1] || ''}
                                      onChange={(e) => {
                                        const newLevels = [...editableRules.levels];
                                        const newPoints = [...(newLevels[index].reactionPoints || ['', '', '', ''])];
                                        newPoints[1] = e.target.value;
                                        newLevels[index] = { ...newLevels[index], reactionPoints: newPoints };
                                        setEditableRules({ ...editableRules, levels: newLevels });
                                      }}
                                      className="w-full text-xs p-1 border border-blue-200 rounded bg-white text-blue-955 font-bold focus:outline-none"
                                    />
                                  </div>
                                  <div className="bg-amber-50/40 p-2 rounded-lg border border-amber-100">
                                    <label className="text-[9.5px] font-black text-amber-800 block mb-1">Mốc cộng 6 điểm:</label>
                                    <input
                                      type="text"
                                      value={lvl.reactionPoints?.[2] || ''}
                                      onChange={(e) => {
                                        const newLevels = [...editableRules.levels];
                                        const newPoints = [...(newLevels[index].reactionPoints || ['', '', '', ''])];
                                        newPoints[2] = e.target.value;
                                        newLevels[index] = { ...newLevels[index], reactionPoints: newPoints };
                                        setEditableRules({ ...editableRules, levels: newLevels });
                                      }}
                                      className="w-full text-xs p-1 border border-amber-200 rounded bg-white text-amber-955 font-bold focus:outline-none"
                                    />
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <label className="text-[9.5px] font-black text-gray-700 block mb-1">Mốc cộng 5 điểm:</label>
                                    <input
                                      type="text"
                                      value={lvl.reactionPoints?.[3] || ''}
                                      onChange={(e) => {
                                        const newLevels = [...editableRules.levels];
                                        const newPoints = [...(newLevels[index].reactionPoints || ['', '', '', ''])];
                                        newPoints[3] = e.target.value;
                                        newLevels[index] = { ...newLevels[index], reactionPoints: newPoints };
                                        setEditableRules({ ...editableRules, levels: newLevels });
                                      }}
                                      className="w-full text-xs p-1 border-gray-300 rounded bg-white text-gray-805 font-bold focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* CÁ NHÂN View - Personal Stats and Insights Analysis View */}
          {activeTab === 'personal' && (
            <motion.div
              key="personal_stats_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PersonalStats 
                users={users} 
                results={results} 
                levelRulesFromCloud={levelRules} 
              />
            </motion.div>
          )}

          {/* THÔNG BÁO View */}
          {activeTab === 'notifications' && (
            <motion.div
              key="notifications_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left side: Post and Edit Announcements */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Edit Global Marquee */}
                  <div className="bg-white border border-gray-150 rounded-lg p-4 shadow-sm font-sans">
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
                      <Bell className="h-4.5 w-4.5 text-[#D9480F] animate-swing" />
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Thông Báo Chữ Chạy Hệ Thống</h3>
                    </div>
                    {isEditingAnnouncement ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase font-black tracking-wider mb-1">Nội dung thông báo</label>
                          <textarea
                            rows={3}
                            value={announcementEditText}
                            onChange={(e) => setAnnouncementEditText(e.target.value)}
                            className="w-full text-xs p-2.5 border border-amber-300 rounded-lg bg-white text-slate-850 outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-sans leading-relaxed"
                            placeholder="Nhập thông báo hiển thị cho toàn bộ hệ thống..."
                            autoFocus
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-wider mb-1">Tốc độ chạy (giây)</label>
                            <input
                              type="number"
                              min={5}
                              max={120}
                              value={announcementEditSpeed}
                              onChange={(e) => setAnnouncementEditSpeed(Math.max(5, parseInt(e.target.value) || 35))}
                              className="w-full text-xs p-2 border border-amber-300 rounded-lg bg-white text-slate-850 outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                            />
                            <span className="text-[9px] text-gray-400">Giây/vòng. Nhỏ = nhanh hơn</span>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-black tracking-wider mb-1">Khoảng cách lặp (px)</label>
                            <input
                              type="number"
                              min={10}
                              max={200}
                              value={announcementEditGap}
                              onChange={(e) => setAnnouncementEditGap(Math.max(10, parseInt(e.target.value) || 32))}
                              className="w-full text-xs p-2 border border-amber-300 rounded-lg bg-white text-slate-850 outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                            />
                            <span className="text-[9px] text-gray-400">Khoảng cách giữa 2 vòng chạy</span>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setAnnouncementEditText(systemAnnouncement);
                              setAnnouncementEditSpeed(systemAnnouncementSpeed);
                              setAnnouncementEditGap(systemAnnouncementGap);
                              setIsEditingAnnouncement(false);
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-[11px] font-bold rounded-md transition-all active:scale-95 cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={async () => {
                              const trimmedText = announcementEditText.trim();
                              try {
                                await databaseService.saveSystemAnnouncement(trimmedText, announcementEditSpeed, announcementEditGap);
                                setSystemAnnouncement(trimmedText);
                                setSystemAnnouncementSpeed(announcementEditSpeed);
                                setSystemAnnouncementGap(announcementEditGap);
                                // Log to database
                                await databaseService.saveAnnouncement({
                                  id: 'ann_sys_' + Date.now(),
                                  userName: user.name,
                                  type: 'admin_broadcast',
                                  detail: trimmedText || '(Không có thông báo - Trạng thái: TẮT)',
                                  timestamp: Date.now()
                                });
                                setIsEditingAnnouncement(false);
                                alert(trimmedText ? "Đã lưu cấu hình thông báo chữ chạy mới!" : "Đã tắt thông báo chữ chạy hệ thống!");
                              } catch (err) {
                                console.error("Lỗi cập nhật thông báo chữ chạy:", err);
                              }
                            }}
                            className="px-3 py-1.5 bg-[#2B8A3E] text-white text-[11px] font-bold rounded-md transition-all active:scale-95 cursor-pointer"
                          >
                            Lưu cấu hình
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className={`p-3 bg-amber-50/70 border border-amber-100 rounded-lg leading-relaxed text-xs font-bold ${systemAnnouncement.trim() ? "text-slate-805" : "text-gray-400 italic"}`}>
                          {systemAnnouncement.trim() ? systemAnnouncement : "(Đã tắt thông báo chữ chạy - Để trống)"}
                        </div>
                        <div className="flex justify-between items-center bg-gray-50/70 rounded-md border border-gray-150 p-2 text-[10px] text-gray-500 font-medium font-sans">
                          <span>⏱️ Tốc độ: <strong className="text-gray-700">{systemAnnouncementSpeed} giây/vòng</strong></span>
                          <span>📏 Khoảng cách: <strong className="text-gray-700">{systemAnnouncementGap}px</strong></span>
                        </div>
                        <button
                          onClick={() => {
                            setAnnouncementEditText(systemAnnouncement);
                            setAnnouncementEditSpeed(systemAnnouncementSpeed);
                            setAnnouncementEditGap(systemAnnouncementGap);
                            setIsEditingAnnouncement(true);
                          }}
                          className="w-full py-1.5 bg-amber-50 hover:bg-amber-100/80 active:scale-95 rounded-md border border-amber-200 text-amber-850 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Chỉnh Sửa Thông Báo Chữ Chạy</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post New Announcement Feed */}
                  <div className="bg-white border border-gray-150 rounded-lg p-4 shadow-sm font-sans">
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100">
                      <Plus className="h-4.5 w-4.5 text-[#1971C2]" />
                      <h3 className="text-xs font-bold text-gray-750 uppercase tracking-wider">Đăng Tin Thông Báo Mới</h3>
                    </div>
                    
                    <div className="space-y-3 text-xs font-sans">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Phân loại hiển thị</label>
                        <select
                          value={newAnnouncementType}
                          onChange={(e) => setNewAnnouncementType(e.target.value as 'admin_broadcast' | 'congrats')}
                          className="w-full border border-gray-250 rounded px-2.5 py-2 text-xs outline-none focus:border-[#1971C2] font-semibold text-slate-750 bg-white"
                        >
                          <option value="admin_broadcast">📢 Quản trị viên phát sóng (Đỏ nổi bật)</option>
                          <option value="congrats">🎉 Biểu dương khen thưởng (Xanh lá)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Nội dung chi tiết</label>
                        <textarea
                          rows={4}
                          value={newAnnouncementText}
                          onChange={(e) => setNewAnnouncementText(e.target.value)}
                          placeholder="Nhập nội dung thông báo gửi tới bảng tin toàn bộ CBNV..."
                          className="w-full border border-gray-250 rounded-lg p-2.5 font-medium outline-none text-xs focus:ring-1 focus:ring-[#1971C2] focus:border-[#1971C2] bg-white text-slate-850 leading-relaxed"
                        />
                      </div>

                      <button
                        onClick={async () => {
                          if (!newAnnouncementText.trim()) {
                            alert("Vui lòng nhập nội dung thông báo!");
                            return;
                          }
                          try {
                            const newId = 'ann_' + Date.now();
                            const newAnn = {
                              id: newId,
                              userName: user.name,
                              type: newAnnouncementType,
                              detail: newAnnouncementText.trim(),
                              timestamp: Date.now()
                            };
                            await databaseService.saveAnnouncement(newAnn);
                            setAllAnnouncements(prev => [newAnn, ...prev]);
                            setNewAnnouncementText('');
                            alert("Đăng tin thông báo mới thành công!");
                          } catch (err) {
                            console.error("Lỗi khi lưu thông báo mới:", err);
                          }
                        }}
                        className="w-full py-2 bg-[#1971C2] hover:bg-opacity-95 text-white font-black text-[11px] uppercase tracking-wider rounded-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Đăng Lên Bảng Tin</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right side: Current Notification Feed Log */}
                <div className="lg:col-span-8">
                  <div className="bg-white border border-gray-150 rounded-lg shadow-sm font-sans flex flex-col h-[520px]">
                    <div className="px-4 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4.5 w-4.5 text-slate-500" />
                        <h3 className="text-xs font-bold text-gray-650 uppercase tracking-widest font-sans">Nhật ký bảng tin hiện tại</h3>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                        {allAnnouncements.length} tin tức
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[460px]">
                      {allAnnouncements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                          <Bell className="h-10 w-10 mb-2 opacity-30 animate-pulse" />
                          <p className="text-xs font-medium">Chưa có thông báo nào được lưu trên hệ thống.</p>
                        </div>
                      ) : (
                        allAnnouncements.map((ann) => {
                          const isBroadcast = ann.type === 'admin_broadcast';
                          return (
                            <div 
                              key={ann.id} 
                              className={`p-3.5 rounded-xl border leading-relaxed font-sans text-xs flex flex-col gap-1.5 shadow-3xs transition-all ${
                                isBroadcast 
                                  ? 'bg-[#FFF9DB] border-[#FFE3E3]/40' 
                                  : 'bg-[#EBFBEE] border-[#D3F9D8]/45'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    isBroadcast 
                                      ? 'bg-[#FFE3E3] text-[#E03131]' 
                                      : 'bg-[#D3F9D8] text-[#2B8A3E]'
                                  }`}>
                                    {isBroadcast ? '📢 Phát Sóng' : '🎉 Biểu Dương'}
                                  </span>
                                  {ann.userName && (ann.userName.trim().normalize('NFC').toUpperCase() === 'LÊ NHẬT TRƯỜNG' || ann.userName.trim().normalize('NFC').toUpperCase() === 'LE NHAT TRUONG') ? (
                                    <span className="bg-[#FFE066] text-[#E67E22] text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase border border-[#FFE066]">
                                      BAN QUẢN TRỊ
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-600 font-bold">
                                      Người tạo: <span className="text-slate-900 font-extrabold">{ann.userName || 'Hệ thống'}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    {formatDate(new Date(ann.timestamp))}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setAnnouncementToDelete(ann);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-all active:scale-90 cursor-pointer"
                                    title="Xóa thông báo"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p translate="no" className="notranslate text-xs text-slate-800 leading-relaxed font-sans font-medium">
                                {ann.detail ? (ann.detail.charAt(0).toUpperCase() + ann.detail.slice(1)) : ""}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TRAO ĐỔI (Conversation Exchange) Panel View */}
          {activeTab === 'exchange' && (
            <motion.div
              key="exchange_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full flex-1"
            >
              <ConversationExchange 
                user={user} 
                onBackToHome={() => setActiveTab('users')}
                isMobileView={false}
              />
            </motion.div>
          )}

          {/* CHI TIẾT (Assessment Details History) Panel View */}
          {activeTab === 'details' && (
            <motion.div
              key="details_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                
                {/* 1. LEFT COLUMN: LIST OF EMPLOYEES */}
                <div className="w-full lg:w-1/3 bg-white rounded-lg border border-gray-150 p-4 shadow-xs flex flex-col h-[750px] lg:h-auto lg:min-h-[750px] font-sans">
                  <div className="space-y-3 pb-3 border-b border-gray-100 shrink-0">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <Users className="h-4 w-4 text-[#1971C2]" />
                      <span>Danh Sách Nhân Viên</span>
                    </h3>
                    
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={detailSearch}
                        onChange={(e) => setDetailSearch(e.target.value)}
                        placeholder="Tìm theo tên, SĐT, Mã NV..."
                        className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      {detailSearch && (
                        <button
                          onClick={() => setDetailSearch('')}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List Container */}
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1 mt-2 space-y-1">
                    {(() => {
                      const filteredEmployees = users.filter(u => {
                        // Show all approved/active employees
                        if (u.status !== 'approved' && u.status !== 'APPROVED') return false;
                        const s = detailSearch.toLowerCase().trim();
                        if (!s) return true;
                        return (
                          u.name?.toLowerCase().includes(s) ||
                          u.phone?.includes(s) ||
                          u.employeeId?.toLowerCase().includes(s) ||
                          u.department?.toLowerCase().includes(s) ||
                          u.branch?.toLowerCase().includes(s)
                        );
                      });

                      if (filteredEmployees.length === 0) {
                        return (
                          <div className="text-center py-12 text-gray-400 text-xs shadow-3xs">
                            Không tìm thấy nhân viên nào phù hợp.
                          </div>
                        );
                      }

                      return filteredEmployees.map((emp) => {
                        // Calculate current level
                        const empResults = results.filter(r => 
                          (r.userId && r.userId === emp.id) || 
                          (emp.phone && r.userId === emp.phone) || 
                          (r.userName && r.userName.toLowerCase().trim() === emp.name.toLowerCase().trim())
                        );
                        
                        const state = calculateInactivityAugmentedLevel(emp.id, empResults, levelRules);
                        const isSelected = selectedUserId === emp.id;

                        // Return item row
                        return (
                          <button
                            key={emp.id}
                            onClick={() => {
                              setSelectedUserId(emp.id);
                              setExpandedResultId(null);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between gap-3 border ${
                              isSelected 
                                ? 'bg-blue-50/50 border-blue-200 shadow-3xs' 
                                : 'border-transparent hover:bg-gray-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs text-gray-950 truncate flex items-center gap-1.5">
                                {emp.name}
                                {emp.employeeId && (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-1 rounded font-bold">
                                    {emp.employeeId}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate uppercase font-semibold">
                                {emp.department} • {emp.branch}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] text-gray-400 font-bold font-mono">
                                  {empResults.length} lượt thi
                                </span>
                              </div>
                            </div>

                            {/* Level Badge */}
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border ${
                                state.level === 5 ? 'bg-amber-50 border-amber-300 text-amber-800' :
                                state.level === 4 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                state.level === 3 ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
                                state.level === 2 ? 'bg-blue-50 border-blue-250 text-blue-700' :
                                'bg-zinc-50 border-zinc-200 text-zinc-650'
                              }`}>
                                <span>Cấp {state.level}</span>
                              </span>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 2. RIGHT COLUMN: EMPLOYEE DETAIL HISTORY */}
                <div className="flex-1 bg-white rounded-lg border border-gray-150 p-6 shadow-xs flex flex-col min-h-[750px] font-sans">
                  {(() => {
                    const selectedEmp = users.find(u => u.id === selectedUserId);
                    if (!selectedEmp) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                          <div className="p-3 bg-gray-50 rounded-full text-gray-400 border border-gray-100">
                            <Activity className="h-8 w-8 text-[#1971C2]" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">Chưa chọn nhân viên</p>
                            <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
                              Vui lòng chọn một CBNV từ danh sách bên trái để xem đầy đủ chi tiết lịch sử đánh giá của họ.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Selected employee detail data
                    const empResults = results.filter(r => 
                      (r.userId && r.userId === selectedEmp.id) || 
                      (selectedEmp.phone && r.userId === selectedEmp.phone) || 
                      (r.userName && r.userName.toLowerCase().trim() === selectedEmp.name.toLowerCase().trim())
                    );
                    const chronologicalResults = [...empResults].sort((a, b) => b.timestamp - a.timestamp); // latest first
                    
                    const state = calculateInactivityAugmentedLevel(selectedEmp.id, empResults, levelRules);
                    const currentLvlRules = levelRules.levels.find(l => l.level === state.level) || DEFAULT_LEVEL_RULES.levels[state.level - 1] || { name: `Cấp ${state.level}`, emoji: '🌱', promotion: '', demotion: '' };

                    // Parse consecutive max required for current level to display progress towards promotion
                    const getRequiredForPromotion = () => {
                      const text = currentLvlRules.promotion || '';
                      const match = text.match(/liên\s+tục\s+(\d+)\s+lượt/i) || 
                                    text.match(/(\d+)\s+lượt\s+liên\s+tục/i) || 
                                    text.match(/(\d+)\s+lượt/i);
                      return match ? parseInt(match[1], 10) : 10;
                    };
                    const requiredConsecutive = getRequiredForPromotion();

                    return (
                      <div className="flex-1 flex flex-col space-y-6">
                        
                        {/* Selected Employee Info Row */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-base font-extrabold text-gray-950">{selectedEmp.name}</h2>
                              {selectedEmp.employeeId && (
                                <span className="text-xs font-mono font-bold bg-[#1971C2]/10 text-[#1971C2] px-2 py-0.5 rounded">
                                  {selectedEmp.employeeId}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 uppercase mt-1 font-semibold tracking-wider">
                              {selectedEmp.department} | {selectedEmp.branch}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              SĐT liên lạc: <span className="font-mono font-bold text-gray-700">{selectedEmp.phone}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400">ĐĂNG KÝ:</span>
                            <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-150">
                              {selectedEmp.createdAt ? new Date(selectedEmp.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Top Summary Grid (Rank, promotion progress, Warns) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          
                          {/* Box 1: Level Badge info */}
                          <div className="p-4 bg-slate-50 border border-slate-150 rounded-lg flex items-center gap-3">
                            <div className="p-2.5 bg-white rounded-full border border-slate-200">
                              <span className="text-2xl">{currentLvlRules.emoji || '🌱'}</span>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cấp Bậc Hiện Tại</p>
                              <p className="text-xs font-black text-slate-850 mt-0.5">{currentLvlRules.name || `Cấp ${state.level}`}</p>
                            </div>
                          </div>

                          {/* Box 2: Promotion Progress */}
                          <div className="p-4 bg-emerald-50/50 border border-emerald-150 rounded-lg flex flex-col justify-between space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest">Tiến Trình Thăng Cấp</p>
                              <TrendingUp className="h-4 w-4 text-emerald-600" />
                            </div>
                            {state.level === 5 ? (
                              <p className="text-xs font-semibold text-emerald-800">Cấp tối cao (Huyền Thoại 🏆)</p>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <span className="font-bold text-emerald-900">{state.consecutiveMax} / {requiredConsecutive}</span>
                                  <span className="text-[10px] text-emerald-600 font-bold">đạt 30/30 liên tiếp</span>
                                </div>
                                <div className="w-full bg-emerald-200/50 rounded-full h-1">
                                  <div 
                                    className="bg-emerald-600 h-1 rounded-full transition-all duration-550"
                                    style={{ width: `${Math.min(100, (state.consecutiveMax / requiredConsecutive) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Box 3: Inactivity Status */}
                          <div className="p-4 bg-amber-50/50 border border-amber-150 rounded-lg flex flex-col justify-between space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-bold text-amber-800 uppercase tracking-widest">Duy Trì Điều Kiện (Ngày)</p>
                              <Zap className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="text-xs space-y-0.5 text-amber-900">
                              <p className="font-medium">
                                Hôm nay: <span className="font-bold font-mono">{state.attemptsToday} / 2 lượt</span>
                              </p>
                              {state.inactiveDaysWarning ? (
                                <p className="text-[9px] text-red-650 font-bold flex flex-col gap-0.5 animate-pulse">
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    {state.level === 5 && getVietnamDateString() >= '2026-06-17' ? (
                                      <span>Huyền Thoại: Chưa đạt bảo trì giữ hạng!</span>
                                    ) : (
                                      <span>Có nguy cơ hạ cấp nếu không đủ 2 lượt!</span>
                                    )}
                                  </span>
                                  {state.level === 5 && getVietnamDateString() >= '2026-06-17' && (
                                    <span className="text-[8px] pl-4 text-red-500 font-medium font-sans">
                                      {"Yêu cầu rèn luyện ít nhất 02 lượt/ngày và điểm TB hôm nay >= 20."}
                                    </span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-[9px] text-green-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  {state.level === 5 && getVietnamDateString() >= '2026-06-17' ? (
                                    <span>Huyền Thoại: Đã đạt giữ hạng hôm nay!</span>
                                  ) : (
                                    <span>Đã đạt chuẩn giữ hạng hôm nay!</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Summary numbers details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-150 p-3.5 rounded-md text-xs">
                          <div>
                            <span className="text-gray-400 block font-semibold text-[9px] uppercase">Tổng lượt thi:</span>
                            <span className="text-xs font-black text-gray-800 font-mono">{chronologicalResults.length} lượt</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[9px] uppercase">Hạ cấp (Inactivity):</span>
                            <span className="text-xs font-black text-amber-700 font-mono">{state.demotionsApplied} lần</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[9px] uppercase">Điểm cao nhất:</span>
                            <span className="text-xs font-black text-green-800 font-mono">
                              {empResults.length > 0 ? Math.max(...empResults.map(r => r.score)) : 0}/30
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold text-[9px] uppercase">Điểm trung bình:</span>
                            <span className="text-xs font-black text-blue-800 font-mono">
                              {empResults.length > 0 
                                ? (empResults.reduce((acc, curr) => acc + curr.score, 0) / empResults.length).toFixed(1) 
                                : '0.0'}
                            </span>
                          </div>
                        </div>

                        {/* List of attempts */}
                        <div className="space-y-3 flex-1 flex flex-col">
                          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                            Chi Tiết Lịch Sử Làm Bài Đánh Giá ({chronologicalResults.length})
                          </h4>

                          {chronologicalResults.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 rounded-lg p-12 text-gray-400 text-xs text-center shadow-3xs">
                              Chưa ghi nhận lượt tự đánh giá nào từ tài khoản nhân viên này. 
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                              {chronologicalResults.map((res, index) => {
                                const isExpanded = expandedResultId === res.id;
                                return (
                                  <div 
                                    key={res.id || index}
                                    className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-2xs hover:border-blue-300 transition-all text-xs"
                                  >
                                    
                                    {/* Accordion Trigger Header */}
                                    <button
                                      onClick={() => {
                                        setExpandedResultId(isExpanded ? null : res.id);
                                      }}
                                      className={`w-full text-left p-3 flex items-center justify-between gap-4 transition-colors ${
                                        isExpanded ? 'bg-slate-50' : 'hover:bg-gray-50/50'
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center gap-2 md:gap-4 flex-1">
                                        <div className="min-w-[100px]">
                                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Lượt đánh giá</p>
                                          <p className="text-xs font-bold font-mono text-gray-700"># {chronologicalResults.length - index}</p>
                                        </div>

                                        <div className="min-w-[100px]">
                                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Ngày Thực Hiện</p>
                                          <p className="text-xs font-bold text-gray-900 font-mono">
                                            {res.date || (res.timestamp ? new Date(res.timestamp).toLocaleDateString('vi-VN') : 'N/A')}
                                          </p>
                                        </div>

                                        <div className="min-w-[100px]">
                                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Kết Quả Lượt Này</p>
                                          <div className="flex items-center gap-1 mt-0.5">
                                            <span className={`text-xs font-mono font-black border px-2 py-0.5 rounded ${
                                              res.score === 30 
                                                ? 'bg-green-50 border-green-200 text-green-800' 
                                                : res.score >= 20 
                                                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                                                  : 'bg-red-50 border-red-200 text-red-800'
                                            }`}>
                                              {res.score} / {res.totalQuestions || 30}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="min-w-[120px]">
                                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Thời Gian Hoàn Thành</p>
                                          <p className="text-xs font-semibold text-gray-700 font-mono mt-0.5">
                                            {res.duration || 0} giây ({Math.round((res.duration || 0) / (res.totalQuestions || 30))}s/câu)
                                          </p>
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-gray-400 p-1">
                                        {isExpanded ? (
                                          <ChevronUp className="h-4 w-4 text-[#1971C2]" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </div>
                                    </button>

                                    {/* Expanded Detail View */}
                                    {isExpanded && (
                                      <div className="p-3 border-t border-gray-150 bg-slate-50/50 space-y-3">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-gray-100">
                                          <h5 className="text-[10px] font-bold text-[#1971C2] uppercase tracking-wider">
                                            BÁO CÁO KẾT QUẢ TỪNG CÂU HỎI TRONG ĐỀ
                                          </h5>
                                        </div>

                                        {/* Questions result grid or list */}
                                        <div className="space-y-2.5">
                                          {(() => {
                                            if (!res.answers || res.answers.length === 0) {
                                              return (
                                                <div className="text-center py-4 text-xs text-gray-400">
                                                  Không tìm thấy chi tiết đáp án của lượt này.
                                                </div>
                                              );
                                            }

                                            return res.answers.map((ans, ansIdx) => {
                                              // Find matched original question
                                              const matchedQ = questions.find(q => q.id === ans.questionId);
                                              
                                              return (
                                                <div 
                                                  key={ansIdx} 
                                                  className="bg-white rounded-md border border-gray-150 p-3 shadow-3xs space-y-1.5 text-xs"
                                                >
                                                  <div className="flex items-start justify-between gap-3">
                                                    <span className="font-bold text-gray-400 font-mono shrink-0">
                                                      Câu {ansIdx + 1}:
                                                    </span>
                                                    
                                                    {ans.correct ? (
                                                      <span className="bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider flex items-center gap-0.5">
                                                        <CheckCircle2 className="h-2.5 w-2.5 text-green-700" />
                                                        ĐÚNG
                                                      </span>
                                                    ) : (
                                                      <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider flex items-center gap-0.5">
                                                        <AlertTriangle className="h-2.5 w-2.5 text-red-700" />
                                                        SAI
                                                      </span>
                                                    )}
                                                  </div>

                                                  <p className="font-semibold text-gray-900 leading-relaxed text-xs">
                                                    {matchedQ ? matchedQ.text : `Hỏi cũ/bị xóa (mã: ${ans.questionId})`}
                                                  </p>

                                                  {/* Show Option context */}
                                                  {matchedQ && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] pt-1 text-gray-700">
                                                      {matchedQ.options.map((opt, optIdx) => {
                                                        const isCorrect = matchedQ.correctAnswerIndex === optIdx;
                                                        const isSelected = ans.selectedIndex === optIdx;

                                                        let optionStyle = "bg-gray-50 border-gray-150";
                                                        if (isCorrect) {
                                                          optionStyle = "bg-green-50 border-green-200 text-green-800 font-bold";
                                                        } else if (isSelected && !isCorrect) {
                                                          optionStyle = "bg-red-50 border-red-150 text-red-800 font-medium";
                                                        }

                                                        return (
                                                          <div 
                                                            key={optIdx} 
                                                            className={`px-2 py-1 rounded border flex items-start gap-1 ${optionStyle}`}
                                                          >
                                                            <span className="font-bold shrink-0">{String.fromCharCode(65 + optIdx)}.</span>
                                                            <span>{opt}</span>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}

                                                  {/* Detail specs of answer: timeSpent, correctness explanation */}
                                                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-400 italic pt-1 border-t border-gray-50 bg-gray-50/20 p-1 rounded">
                                                    {ans.timeSpent !== undefined && (
                                                      <span>⏱️ Tốc độ phản xạ: <strong className="font-bold text-gray-650 not-italic">{ans.timeSpent}giây</strong></span>
                                                    )}
                                                    {matchedQ && matchedQ.explanation && (
                                                      <span className="text-gray-500 font-sans">
                                                        💡 <strong className="font-bold text-gray-600 not-italic">Dặn dò:</strong> {matchedQ.explanation}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()}
                </div>

              </div>
            </motion.div>
          )}


        </AnimatePresence>
      </main>

      {/* Delete Announcement Modal Confirmation */}
      {announcementToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-gray-150 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-655 font-sans">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900"><span translate="no" className="notranslate">Xác nhận xóa bảng tin</span></h3>
            </div>
            
            <p className="text-xs text-gray-650 leading-relaxed font-sans font-normal">
              <span translate="no" className="notranslate">Bạn có chắc chắn muốn xóa tin tức này? Hành động này không thể hoàn tác!</span>
            </p>

            <div className="bg-slate-50 p-2.5 rounded text-xs select-none border border-slate-150 font-medium italic text-slate-600 line-clamp-3">
              "{announcementToDelete.detail}"
            </div>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md text-xs font-bold text-gray-650 transition-colors cursor-pointer"
              >
                <span translate="no" className="notranslate">Hủy bỏ</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await databaseService.deleteAnnouncement(announcementToDelete.id);
                    setAllAnnouncements(prev => prev.filter(ann => ann.id !== announcementToDelete.id));
                    setAnnouncementToDelete(null);
                  } catch (err) {
                    console.error("Lỗi xóa thông báo:", err);
                  }
                }}
                className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span translate="no" className="notranslate">Xác nhận Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-lg border border-gray-150 max-w-2xl w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-[#1971C2]" />
                <span translate="no" className="notranslate">Chỉnh Sửa Câu Hỏi Trắc Nghiệm 3T</span>
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveQuestionEdit} className="space-y-4 text-xs">
              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">Nội dung câu hỏi</span></label>
                <textarea
                  value={editQText}
                  onChange={(e) => setEditQText(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] min-h-[70px] text-gray-800 font-medium"
                  placeholder="Nhập nội dung câu hỏi..."
                  required
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-750"><span translate="no" className="notranslate">Các lựa chọn trả lời</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500">Lựa chọn A</label>
                    <input
                      type="text"
                      value={editQOpt0}
                      onChange={(e) => setEditQOpt0(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1971C2] text-gray-800"
                      placeholder="Nội dung lựa chọn A"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500">Lựa chọn B</label>
                    <input
                      type="text"
                      value={editQOpt1}
                      onChange={(e) => setEditQOpt1(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1971C2] text-gray-800"
                      placeholder="Nội dung lựa chọn B"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500">Lựa chọn C</label>
                    <input
                      type="text"
                      value={editQOpt2}
                      onChange={(e) => setEditQOpt2(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1971C2] text-gray-800"
                      placeholder="Nội dung lựa chọn C"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500">Lựa chọn D</label>
                    <input
                      type="text"
                      value={editQOpt3}
                      onChange={(e) => setEditQOpt3(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1971C2] text-gray-800"
                      placeholder="Nội dung lựa chọn D"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Correct Answer Selector */}
              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">Đáp án đúng chính xác</span></label>
                <select
                  value={editQCorrectIndex}
                  onChange={(e) => setEditQCorrectIndex(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800 font-medium"
                >
                  <option value={0} translate="no" className="notranslate">Lựa chọn A</option>
                  <option value={1} translate="no" className="notranslate">Lựa chọn B</option>
                  <option value={2} translate="no" className="notranslate">Lựa chọn C</option>
                  <option value={3} translate="no" className="notranslate">Lựa chọn D</option>
                </select>
              </div>

              {/* Explanation (Dặn dò thay đổi) */}
              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold"><span translate="no" className="notranslate">Dặn dò ghi nhớ / Lời khuyên của sếp</span></label>
                <textarea
                  value={editQExplanation}
                  onChange={(e) => setEditQExplanation(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] min-h-[60px] text-gray-800 font-medium"
                  placeholder="Dặn dò CBNV khi gặp hoặc giải thích đáp án này..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 font-sans col-span-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md font-bold text-gray-650 transition-colors cursor-pointer"
                >
                  <span translate="no" className="notranslate">Hủy bỏ</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#1971C2] hover:bg-[#155d9e] text-white rounded-md font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span translate="no" className="notranslate">Đang cập nhật...</span>
                  ) : (
                    <span translate="no" className="notranslate">Cập nhật câu hỏi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Preview Modal */}
      {showExcelPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-lg border border-gray-150 max-w-4xl w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                <span>Xem Trước Danh Sách Câu Hỏi Excel - {excelFileName}</span>
              </h3>
              <button
                onClick={() => {
                  setShowExcelPreview(false);
                  setExcelPreviewQuestions([]);
                }}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-150 text-blue-800 p-3.5 rounded-md text-xs leading-relaxed space-y-1">
                <p className="font-bold">✨ Thống kê tệp nạp vào:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  <div>• Tổng số câu bóc tách được: <span className="font-bold text-sm text-blue-900">{excelPreviewQuestions.length}</span> câu.</div>
                  <div>• Số câu trùng lặp nội dung: <span className="font-bold text-sm text-amber-600">{
                    excelPreviewQuestions.filter(q => questions.some(ex => ex.text.trim().toLowerCase() === q.text.trim().toLowerCase())).length
                  }</span> câu.</div>
                  <div>• Số câu mới có thể thêm: <span className="font-bold text-sm text-green-700">{
                    excelPreviewQuestions.filter(q => !questions.some(ex => ex.text.trim().toLowerCase() === q.text.trim().toLowerCase())).length
                  }</span> câu.</div>
                </div>
              </div>

              {/* List container of parsed questions */}
              <div className="max-h-[350px] overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50 space-y-3">
                {excelPreviewQuestions.map((q, idx) => {
                  const isDup = questions.some(ex => ex.text.trim().toLowerCase() === q.text.trim().toLowerCase());
                  return (
                    <div 
                      key={q.id || idx} 
                      className={`p-3 rounded-md border text-xs bg-white space-y-1.5 transition-all ${
                        isDup ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-gray-500 shrink-0">CÂU TRẮC NGHIỆM {idx + 1}:</span>
                        {isDup && (
                          <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[9px] shrink-0 uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                            Trùng lặp
                          </span>
                        )}
                      </div>
                      
                      <p className="font-semibold text-gray-900 text-sm">{q.text}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                        {q.options.map((opt, optIdx) => (
                          <div 
                            key={optIdx} 
                            className={`px-2.5 py-1.5 rounded border ${
                              q.correctAnswerIndex === optIdx 
                                ? 'bg-green-50 border-green-200 text-green-800 font-medium' 
                                : 'bg-gray-50 border-gray-150'
                            }`}
                          >
                            <span className="font-bold mr-1">{String.fromCharCode(65 + optIdx)}.</span> {opt}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <p className="text-gray-500 italic mt-1 text-[11px] bg-gray-100 p-1.5 rounded border border-gray-150">
                          <span className="font-bold text-gray-700 not-italic">Dặn dò:</span> {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-gray-100 font-sans">
              <button
                type="button"
                onClick={() => {
                  setShowExcelPreview(false);
                  setExcelPreviewQuestions([]);
                }}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md font-bold text-gray-650 transition-colors cursor-pointer text-xs"
              >
                HỦY BỎ
              </button>

              <div className="flex flex-wrap gap-2">
                {/* Save only non-duplicates */}
                <button
                  type="button"
                  onClick={() => handleConfirmImport(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 text-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>CHỈ NẠP CÂU MỚI ({
                    excelPreviewQuestions.filter(q => !questions.some(ex => ex.text.trim().toLowerCase() === q.text.trim().toLowerCase())).length
                  })</span>
                </button>

                {/* Save all */}
                <button
                  type="button"
                  onClick={() => handleConfirmImport(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-[#1971C2] hover:bg-[#155d9e] text-white rounded-md font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 text-xs flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>NẠP TẤT CẢ ({excelPreviewQuestions.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
