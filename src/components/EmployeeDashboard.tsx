import React, { useState, useEffect, useRef, useMemo } from 'react';
import { databaseService, getQuotaStats } from '../firebase';
import { User, Question, QuizResult, CompanyMapping, MotivationalSloganBand, LevelRulesConfig, LevelRuleItem } from '../types';
import { formatDate, formatTimeInSeconds, cleanOptionText } from '../utils/format';
import { BookOpen, Trophy, Award, BarChart3, ChevronRight, CheckCircle2, XCircle, ArrowRight, RotateCcw, HelpCircle, GraduationCap, AlertCircle, Users, TrendingUp, Building2, LogOut, Home, Maximize2, Minimize2, UserCheck, ImagePlus, Lock, Sparkles, X, Plus, Smartphone, Share, ArrowUp, ArrowLeft, Pencil, Trash2, Building, Landmark, Briefcase, Search, Database, RefreshCcw, QrCode, Server, ShieldCheck, Zap, FileDown, ChevronUp, ChevronDown, Timer, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import StatsDashboard from './StatsDashboard';

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
  isAdminReview?: boolean;
  onBackToAdmin?: (tab?: 'users' | 'add_images' | 'stats' | 'encoding' | 'qr' | 'firebase_data') => void;
  slogan?: string;
  difficulty?: number;
  onUpdateDifficulty?: (newLevel: number) => void;
  motivationalSlogans?: MotivationalSloganBand[];
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
      promotion: "Đạt điểm tuyệt đối 30/30 liên tục 10 lượt (đã cập nhật tự động theo đúng thay đổi mới nhất của anh) để nâng hạng lên Chiến Binh.",
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

export default function EmployeeDashboard({ 
  user, 
  onLogout, 
  isAdminReview = false, 
  onBackToAdmin, 
  slogan = '3T Hội Tụ - Tân Phú Vươn Xa',
  difficulty: propDifficulty = 1,
  onUpdateDifficulty,
  motivationalSlogans = []
}: EmployeeDashboardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [deptUsers, setDeptUsers] = useState<User[]>([]);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [approvalSearchTerm, setApprovalSearchTerm] = useState('');

  useEffect(() => {
    if ((isAdminReview && (user.role === 'admin' || user.role === 'executive')) || user.role === 'approver' || user.canViewStats) {
      try {
        const unsubscribe = databaseService.subscribeUsers((allUsers) => {
          if (user.role === 'admin') {
            setDeptUsers(allUsers);
            const pending = allUsers.filter(u => u.status?.toLowerCase() === 'pending');
            setPendingUsersCount(pending.length);
          } else {
            // Approver or authorized stats viewer: Check department to decide scope
            const deptNorm = (user.department || '').trim().toLowerCase();
            let filtered: User[] = [];
            if (deptNorm === 'ban tổng giám đốc') {
               // BTGĐ: Company-wide
              filtered = allUsers;
            } else if (deptNorm === 'ban giám đốc') {
               // BGĐ: Branch-wide
              filtered = allUsers.filter(u => u.branch === user.branch);
            } else {
               // Trưởng Bộ Phận: Department-wide
              filtered = allUsers.filter(u => u.branch === user.branch && u.department === user.department);
            }
            setDeptUsers(filtered);
            const pending = filtered.filter(u => u.status?.toLowerCase() === 'pending');
            setPendingUsersCount(pending.length);
          }
        });
        return () => unsubscribe();
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu người dùng bộ phận:", err);
      }
    }
  }, [isAdminReview, user.role, user.branch, user.department]);

  // Real-time online users calculation (active in last 240 seconds / 4 minutes)
  const onlineUsersCount = deptUsers.filter((u) => {
    if (!u.lastActive) return false;
    return Math.abs(Date.now() - u.lastActive) <= 240000;
  }).length;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Tự động kiểm tra và ẩn thanh địa chỉ trình duyệt trên điện thoại khi có tương tác chạm đầu tiên
  useEffect(() => {
    const autoFullscreenOnInteraction = () => {
      const isMobile = window.innerWidth < 640 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && !document.fullscreenElement) {
        const docEl = document.documentElement as any;
        try {
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
          }
        } catch (err) {
          console.warn("Auto-fullscreen failed:", err);
        }
      }
      // Dọn dẹp listener sau lần tương tác đầu tiên
      window.removeEventListener('click', autoFullscreenOnInteraction);
      window.removeEventListener('touchstart', autoFullscreenOnInteraction);
    };

    window.addEventListener('click', autoFullscreenOnInteraction);
    window.addEventListener('touchstart', autoFullscreenOnInteraction);
    return () => {
      window.removeEventListener('click', autoFullscreenOnInteraction);
      window.removeEventListener('touchstart', autoFullscreenOnInteraction);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [pwaTab, setPwaTab] = useState<'android' | 'ios'>('android');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePwaInstall = () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      pwaPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setPwaPrompt(null);
      });
    } else {
      setShowPwaModal(true);
    }
  };

  const innerViewportRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 100);
  };

  const scrollToTop = () => {
    if (innerViewportRef.current) {
      innerViewportRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const [activeTab, setActiveTab] = useState<'practice' | 'quiz' | 'history' | 'ai_extract'>('quiz');
  const [showLevelRules, setShowLevelRules] = useState(false);
  const [levelRules, setLevelRules] = useState<LevelRulesConfig | null>(null);
  const [savingLevelRules, setSavingLevelRules] = useState(false);
  const [editableRules, setEditableRules] = useState<LevelRulesConfig | null>(null);
  
  // Admin mobile action states
  const [adminMobileTab, setAdminMobileTab] = useState<'home' | 'users' | 'stats' | 'encoding' | 'qr' | 'firebase_data'>('home');
  const [adminMobileNotice, setAdminMobileNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  // States for Mobile QR and Firebase Data tabs
  const [customQrUrl, setCustomQrUrl] = useState('https://quiz3t.vercel.app');
  const [showQrNotice, setShowQrNotice] = useState(false);
  const [quota, setQuota] = useState({ reads: 0, writes: 0, deletes: 0 });
  
  // States for user management panel
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'employee' | 'approver' | 'admin'>('all');

  // States for company mappings / encoding config
  const [companyMappings, setCompanyMappings] = useState<CompanyMapping[]>([]);
  const [selectedCoId, setSelectedCoId] = useState('');
  const [selectedBrId, setSelectedBrId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  
  // Segmented sub-tab for encoding panel to easily navigate Company -> Branch -> Department on small space
  const [encodingStep, setEncodingStep] = useState<'company' | 'branch' | 'department'>('company');
  const [editingMapping, setEditingMapping] = useState<{
    type: 'company' | 'branch' | 'department';
    coId?: string;
    brId?: string;
    deptId?: string;
    oldName: string;
    newName: string;
  } | null>(null);

  // Auto clear banners after delay
  useEffect(() => {
    if (adminMobileNotice) {
      const t = setTimeout(() => setAdminMobileNotice(null), 3000);
      return () => clearTimeout(t);
    }
  }, [adminMobileNotice]);

  // Load quota stats when the firebase_data tab is opened
  useEffect(() => {
    if (adminMobileTab === 'firebase_data') {
      setQuota(getQuotaStats());
    }
  }, [adminMobileTab]);

  // Load company mappings for stats & encoding
  const loadMappings = async () => {
    try {
      const mappings = await databaseService.getCompanyMappings();
      setCompanyMappings(mappings);
    } catch (err) {
      console.error("Lỗi khi tải danh mục mã hóa ở mobile:", err);
    }
  };

  useEffect(() => {
    if (isAdminReview && user.role === 'admin') {
      loadMappings();
    }
  }, [isAdminReview]);

  const handleMobileAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    const newCo: CompanyMapping = {
      id: 'co_' + Math.random().toString(36).substring(2, 9),
      name: newCompanyName.trim(),
      branches: []
    };
    const updated = [...companyMappings, newCo];
    try {
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      setNewCompanyName('');
      setSelectedCoId(newCo.id);
      setAdminMobileNotice({ type: 'success', msg: `Đã thêm Công Ty "${newCo.name}"` });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Có lỗi xảy ra khi thêm Công Ty.' });
    }
  };

  const handleMobileAddBranch = async () => {
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
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      setNewBranchName('');
      setAdminMobileNotice({ type: 'success', msg: `Đã thêm Chi nhánh mới` });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi xảy ra khi thêm chi nhánh.' });
    }
  };

  const handleMobileAddDepartment = async () => {
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
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      setNewDepartmentName('');
      setAdminMobileNotice({ type: 'success', msg: `Đã thêm Bộ phận mới` });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi xảy ra khi thêm bộ phận.' });
    }
  };

  const handleMobileDeleteCompany = async (coId: string) => {
    const co = companyMappings.find(c => c.id === coId);
    if (!co) return;
    if (!window.confirm(`Bạn muốn xóa Công ty "${co.name}" và toàn bộ Chi nhánh, Bộ phận trực thuộc?`)) return;
    const updated = companyMappings.filter(c => c.id !== coId);
    try {
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      if (selectedCoId === coId) {
        setSelectedCoId('');
        setSelectedBrId('');
      }
      setAdminMobileNotice({ type: 'success', msg: `Đã xóa Công ty "${co.name}".` });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi xảy ra khi xóa.' });
    }
  };

  const handleMobileDeleteBranch = async (coId: string, brId: string) => {
    const co = companyMappings.find(c => c.id === coId);
    const br = co?.branches.find(b => b.id === brId);
    if (!co || !br) return;
    if (!window.confirm(`Bạn muốn xóa Chi nhánh "${br.name}"?`)) return;
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
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      if (selectedBrId === brId) {
        setSelectedBrId('');
      }
      setAdminMobileNotice({ type: 'success', msg: `Đã xóa Chi nhánh "${br.name}".` });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi xảy ra khi xóa.' });
    }
  };

  const handleMobileDeleteDepartment = async (coId: string, brId: string, deptId: string) => {
    const co = companyMappings.find(c => c.id === coId);
    const br = co?.branches.find(b => b.id === brId);
    const dept = br?.departments.find(d => d.id === deptId);
    if (!co || !br || !dept) return;
    if (!window.confirm(`Bạn muốn xóa Bộ phận "${dept.name}"?`)) return;
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
      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);
      setAdminMobileNotice({ type: 'success', msg: `Đã xóa Bộ phận "${dept.name}".` });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi xảy ra khi xóa.' });
    }
  };

  const handleMobileEditMappingDirectly = async (
    type: 'company' | 'branch' | 'department',
    coId: string | undefined,
    brId: string | undefined,
    deptId: string | undefined,
    oldName: string,
    newName: string
  ) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === oldName) return;

    try {
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

      await databaseService.saveCompanyMappings(updated);
      setCompanyMappings(updated);

      const currentCo = companyMappings.find(c => c.id === coId);
      const currentBr = currentCo?.branches.find(b => b.id === brId);
      const extra = {
        companyName: currentCo?.name || '',
        branchName: currentBr?.name || ''
      };

      await databaseService.syncMappingNames(type, oldName, trimmedNewName, extra);
      setAdminMobileNotice({ type: 'success', msg: `Cập nhật thành công từ "${oldName}" thành "${trimmedNewName}"` });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi xảy ra khi sửa đổi danh mục.' });
    }
  };

  const handleMobileDeleteUser = async (userId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản CBNV này?")) return;
    try {
      await databaseService.deleteUser(userId);
      setAdminMobileNotice({ type: 'success', msg: 'Đã xóa tài khoản thành công.' });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi khi xóa tài khoản.' });
    }
  };

  const handleMobileToggleRole = async (userId: string, currentRole: 'employee' | 'approver' | 'admin') => {
    const newRole = currentRole === 'employee' ? 'approver' : 'employee';
    try {
      await databaseService.updateUser(userId, { role: newRole });
      setAdminMobileNotice({ type: 'success', msg: 'Đã cập nhật vai trò.' });
    } catch (err) {
      setAdminMobileNotice({ type: 'error', msg: 'Lỗi khi cập nhật vai trò.' });
    }
  };
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);

  // Dynamic level:
  // Cấp 1 (Tân Binh): 5 lượt liên tiếp đạt 30/30 -> Cấp 2. Hạ cấp: Giữ nguyên.
  // Cấp 2 (Chiến Binh): 5 lượt liên tiếp đạt 30/30 -> Cấp 3. Hạ cấp: Điểm < 20 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 1.
  // Cấp 3 (Thống Lĩnh): 5 lượt liên tiếp đạt 30/30 -> Cấp 4. Hạ cấp: Điểm < 26 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 2.
  // Cấp 4 (Tối Cao): 5 lượt liên tiếp đạt 30/30 -> Cấp 5. Hạ cấp: Điểm < 27 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 3.
  // Cấp 5 (Huyền Thoại): Thăng cấp: Đạt điểm tuyệt đối 30 điểm liên tục -> Giữ nguyên. Hạ cấp: Điểm < 28 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 4.
  const difficultyState = useMemo(() => {
    const chronologicalResults = [...results].sort((a, b) => a.timestamp - b.timestamp);
    const activeRules = levelRules || DEFAULT_LEVEL_RULES;
    
    let currentLevel = 1;
    let consecutiveMaxAtLevel = 0;
    let lowScoreCountAtLevel = 0;

    let latestFeedbackMessage: string | null = null;
    let latestFeedbackType: 'promotion' | 'demotion' | 'warning' | null = null;

    const levelNames: Record<number, string> = {
      1: activeRules.levels[0]?.name || 'Tân Binh (Cấp 1)',
      2: activeRules.levels[1]?.name || 'Chiến Binh (Cấp 2)',
      3: activeRules.levels[2]?.name || 'Thống Lĩnh (Cấp 3)',
      4: activeRules.levels[3]?.name || 'Tối Cao (Cấp 4)',
      5: activeRules.levels[4]?.name || 'Huyền Thoại (Cấp 5)'
    };

    const parseRequiredConsecutive = (lvlIdx: number, defaultVal: number = 10): number => {
      const promotionText = activeRules.levels[lvlIdx]?.promotion;
      if (!promotionText) return defaultVal;
      const match = promotionText.match(/liên\s+tục\s+(\d+)\s+lượt/i) || 
                    promotionText.match(/(\d+)\s+lượt\s+liên\s+tục/i) || 
                    promotionText.match(/(\d+)\s+lượt/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      return defaultVal;
    };

    const parseDemotionThreshold = (lvlIdx: number, defaultVal: number): number => {
      const demotionText = activeRules.levels[lvlIdx]?.demotion;
      if (!demotionText) return defaultVal;
      const match = demotionText.match(/dưới\s+(\d+)\s+điểm/i) || 
                    demotionText.match(/dưới\s+(\d+)/i) || 
                    demotionText.match(/<\s*(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      return defaultVal;
    };

    for (let i = 0; i < chronologicalResults.length; i++) {
      const res = chronologicalResults[i];
      const score = res.score;
      const isLatestResult = i === chronologicalResults.length - 1;

      if (isLatestResult) {
        latestFeedbackMessage = null;
        latestFeedbackType = null;
      }

      if (currentLevel === 1) {
        if (score === 30) {
          consecutiveMaxAtLevel++;
        } else {
          consecutiveMaxAtLevel = 0;
        }
        
        const reqConsecutive = parseRequiredConsecutive(0, 10);
        if (consecutiveMaxAtLevel >= reqConsecutive) {
          currentLevel = 2;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'promotion';
            latestFeedbackMessage = `Chúc mừng! Bạn đã xuất sắc thăng cấp lên ${levelNames[2]}!`;
          }
        }
      } else if (currentLevel === 2) {
        if (score === 30) {
          consecutiveMaxAtLevel++;
        } else {
          consecutiveMaxAtLevel = 0;
        }

        const demotionMin = parseDemotionThreshold(1, 20);
        if (score < demotionMin) {
          lowScoreCountAtLevel++;
        }

        const reqConsecutive = parseRequiredConsecutive(1, 10);
        if (consecutiveMaxAtLevel >= reqConsecutive) {
          currentLevel = 3;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'promotion';
            latestFeedbackMessage = `Chúc mừng! Bạn đã xuất sắc thăng cấp lên ${levelNames[3]}!`;
          }
        } else if (lowScoreCountAtLevel >= 2) {
          currentLevel = 1;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'demotion';
            latestFeedbackMessage = `Bạn đã bị tụt xuống ${levelNames[1]} do có 2 lần đạt điểm dưới ${demotionMin} điểm.`;
          }
        } else if (score < demotionMin && lowScoreCountAtLevel === 1 && isLatestResult) {
          latestFeedbackType = 'warning';
          latestFeedbackMessage = `⚠️ CẢNH BÁO: Đây là lần thứ 1 bạn đạt điểm dưới tối thiểu (${score}/30đ) của cấp độ ${levelNames[2]}. Sẽ bị hạ cấp về ${levelNames[1]} nếu đạt thấp thêm lần nữa!`;
        }
      } else if (currentLevel === 3) {
        if (score === 30) {
          consecutiveMaxAtLevel++;
        } else {
          consecutiveMaxAtLevel = 0;
        }

        const demotionMin = parseDemotionThreshold(2, 26);
        if (score < demotionMin) {
          lowScoreCountAtLevel++;
        }

        const reqConsecutive = parseRequiredConsecutive(2, 10);
        if (consecutiveMaxAtLevel >= reqConsecutive) {
          currentLevel = 4;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'promotion';
            latestFeedbackMessage = `Chúc mừng! Bạn đã xuất sắc thăng cấp lên ${levelNames[4]}!`;
          }
        } else if (lowScoreCountAtLevel >= 2) {
          currentLevel = 2;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'demotion';
            latestFeedbackMessage = `Bạn đã bị tụt xuống ${levelNames[2]} do có 2 lần đạt điểm dưới ${demotionMin} điểm.`;
          }
        } else if (score < demotionMin && lowScoreCountAtLevel === 1 && isLatestResult) {
          latestFeedbackType = 'warning';
          latestFeedbackMessage = `⚠️ CẢNH BÁO: Đây là lần thứ 1 bạn đạt điểm dưới tối thiểu (${score}/30đ) của cấp độ ${levelNames[3]}. Sẽ bị hạ cấp về ${levelNames[2]} nếu đạt thấp thêm lần nữa!`;
        }
      } else if (currentLevel === 4) {
        if (score === 30) {
          consecutiveMaxAtLevel++;
        } else {
          consecutiveMaxAtLevel = 0;
        }

        const demotionMin = parseDemotionThreshold(3, 27);
        if (score < demotionMin) {
          lowScoreCountAtLevel++;
        }

        const reqConsecutive = parseRequiredConsecutive(3, 10);
        if (consecutiveMaxAtLevel >= reqConsecutive) {
          currentLevel = 5;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'promotion';
            latestFeedbackMessage = `Chúc mừng! Bạn đã xuất sắc thăng cấp lên ${levelNames[5]}!`;
          }
        } else if (lowScoreCountAtLevel >= 2) {
          currentLevel = 3;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'demotion';
            latestFeedbackMessage = `Bạn đã bị tụt xuống ${levelNames[3]} do có 2 lần đạt điểm dưới ${demotionMin} điểm.`;
          }
        } else if (score < demotionMin && lowScoreCountAtLevel === 1 && isLatestResult) {
          latestFeedbackType = 'warning';
          latestFeedbackMessage = `⚠️ CẢNH BÁO: Đây là lần thứ 1 bạn đạt điểm dưới tối thiểu (${score}/30đ) của cấp độ ${levelNames[4]}. Sẽ bị hạ cấp về ${levelNames[3]} nếu đạt thấp thêm lần nữa!`;
        }
      } else if (currentLevel === 5) {
        if (score === 30) {
          consecutiveMaxAtLevel++;
        } else {
          consecutiveMaxAtLevel = 0;
        }

        const demotionMin = parseDemotionThreshold(4, 28);
        if (score < demotionMin) {
          lowScoreCountAtLevel++;
        }

        if (lowScoreCountAtLevel >= 2) {
          currentLevel = 4;
          consecutiveMaxAtLevel = 0;
          lowScoreCountAtLevel = 0;
          
          if (isLatestResult) {
            latestFeedbackType = 'demotion';
            latestFeedbackMessage = `Bạn đã bị tụt xuống ${levelNames[4]} do có 2 lần đạt điểm dưới ${demotionMin} điểm.`;
          }
        } else if (score < demotionMin && lowScoreCountAtLevel === 1 && isLatestResult) {
          latestFeedbackType = 'warning';
          latestFeedbackMessage = `⚠️ CẢNH BÁO: Đây là lần thứ 1 bạn đạt điểm dưới tối thiểu (${score}/30đ) của cấp độ ${levelNames[5]}. Sẽ bị hạ cấp về ${levelNames[4]} nếu đạt thấp thêm lần nữa!`;
        }
      }
    }
    
    return {
      level: currentLevel,
      consecutiveMax: consecutiveMaxAtLevel,
      consecutiveLow: lowScoreCountAtLevel,
      latestFeedbackType,
      latestFeedbackMessage
    };
  }, [results, levelRules]);

  const difficulty = difficultyState.level;

  // Calculate stats for today's participants
  const participantsTodayCount = useMemo(() => {
    const todayStr = formatDate(new Date());
    const todayResults = allResults.filter(r => r.date === todayStr);
    return new Set(todayResults.map(r => r.userId || r.userName)).size;
  }, [allResults]);

  const attemptsTodayCount = useMemo(() => {
    const todayStr = formatDate(new Date());
    return allResults.filter(r => r.date === todayStr).length;
  }, [allResults]);

  // AI Image extraction states (simulated inside smartphone viewport for admins)
  const [selectedImages, setSelectedImages] = useState<{ file: File; compressedBase64: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [aiNotice, setAiNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Handle Approving a user
  const handleApproveUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'approved' });
      const freshRes = await databaseService.getQuizResults();
      setAllResults(freshRes);
    } catch (err) {
      console.error("Lỗi khi duyệt nhân viên:", err);
    }
  };

  // Handle Rejecting / Blocking a user
  const handleRejectUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'rejected' });
      const freshRes = await databaseService.getQuizResults();
      setAllResults(freshRes);
    } catch (err) {
      console.error("Lỗi khi từ chối nhân viên:", err);
    }
  };

  // Get Employee Stats for approvals / progress track
  const getEmployeeStats = (empId: string) => {
    const empQuizResults = allResults.filter(r => r.userId === empId);
    const count = empQuizResults.length;
    const avg = count > 0 
      ? Math.round(empQuizResults.reduce((acc, curr) => acc + curr.score, 0) / count)
      : 0;
    
    let evaluationClass = 'CHƯA THI';
    let style = 'bg-gray-150 text-gray-500 border border-gray-205 font-medium';

    if (count === 0) {
      evaluationClass = 'CHƯA THI';
      style = 'bg-gray-100 text-gray-400 border border-gray-200';
    } else if (count >= 5 && avg >= 28) {
      evaluationClass = 'ĐẠT 150%';
      style = 'bg-blue-50 text-blue-700 border border-blue-100 font-bold';
    } else if (count >= 3 && avg >= 25) {
      evaluationClass = 'ĐẠT 120%';
      style = 'bg-green-50 text-green-700 border border-green-100 font-bold';
    } else if (count >= 1 && avg >= 20) {
      evaluationClass = 'ĐẠT 100%';
      style = 'bg-yellow-50 text-yellow-700 border border-yellow-105 font-bold';
    } else {
      evaluationClass = 'ĐẠT 90%';
      style = 'bg-gray-100 text-gray-750 border border-gray-200';
    }

    return {
      quizzesTaken: count,
      average: avg,
      evaluation: evaluationClass,
      style
    };
  };

  const refreshQuestions = async () => {
    try {
      const qs = await databaseService.getQuestions();
      setQuestions(qs);
    } catch (err) {
      console.error("Lỗi khi đồng bộ câu hỏi mới:", err);
    }
  };

  const refreshData = async (forceRefresh = false) => {
    try {
      const qs = await databaseService.getQuestions();
      setQuestions(qs);
      
      const allRes = await databaseService.getQuizResults(false, forceRefresh);
      setAllResults(allRes);

      await loadMappings();
      setAdminMobileNotice({ type: 'success', msg: 'Đồng bộ dữ liệu thành công!' });
    } catch (err) {
      console.error("Lỗi khi đồng bộ dữ liệu quản trị viên (mobile):", err);
    }
  };

  const renderMobileUsersPanel = () => {
    const rawFilteredUsers = deptUsers.filter((u) => {
      const s = approvalSearchTerm.toLowerCase();
      const matchesSearch = 
        u.name?.toLowerCase().includes(s) || 
        u.phone?.includes(s) || 
        u.employeeId?.toLowerCase().includes(s) ||
        u.department?.toLowerCase().includes(s) ||
        u.branch?.toLowerCase().includes(s);

      const matchesStatus = 
        userStatusFilter === 'all' || 
        u.status?.toLowerCase() === userStatusFilter.toLowerCase();

      const matchesRole =
        userRoleFilter === 'all' ||
        u.role?.toLowerCase() === userRoleFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesRole;
    });

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

    const filteredUsers = [...rawFilteredUsers].sort((a, b) => {
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

      const isOnlineA = a.lastActive && Math.abs(Date.now() - a.lastActive) <= 240000;
      const isOnlineB = b.lastActive && Math.abs(Date.now() - b.lastActive) <= 240000;
      if (isOnlineA && !isOnlineB) return -1;
      if (!isOnlineA && isOnlineB) return 1;

      const dateA = a.createdAt || '';
      const dateB = b.createdAt || '';
      return dateB.localeCompare(dateA);
    });

    return (
      <div className="flex flex-col flex-1 h-full font-sans pb-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-3 sticky top-0 bg-white z-10 shrink-0">
          <button 
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            PHÊ DUYỆT & PHÂN QUYỀN
          </span>
          <div className="w-6" />
        </div>

        {/* Search */}
        <div className="relative mb-3 shrink-0">
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, mã nhân viên..."
            value={approvalSearchTerm}
            onChange={(e) => setApprovalSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1971C2] shadow-3xs"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          {approvalSearchTerm && (
            <button 
              onClick={() => setApprovalSearchTerm('')}
              className="absolute right-2.5 top-2 h-5 w-5 bg-gray-105 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 text-[10px]"
            >
              ×
            </button>
          )}
        </div>

        {/* Segmented Filter bar */}
        <div className="flex flex-wrap gap-1 mb-3 shrink-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setUserStatusFilter(st)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all ${
                userStatusFilter === st
                  ? 'bg-blue-600 border-blue-600 text-white shadow-3xs'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {st === 'all' && 'TẤT CẢ'}
              {st === 'pending' && `CHỜ DUYỆT (${deptUsers.filter(u => u.status?.toLowerCase() === 'pending').length})`}
              {st === 'approved' && 'ĐÃ DUYỆT'}
              {st === 'rejected' && 'ĐÃ CHẶN'}
            </button>
          ))}
        </div>

        {/* Status notification */}
        {adminMobileNotice && (
          <div className={`p-2.5 mb-3 rounded-lg text-xs font-bold border transition-all duration-300 ${
            adminMobileNotice.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {adminMobileNotice.msg}
          </div>
        )}

        {/* User list */}
        <div className="space-y-2.5 pr-0.5 pb-24">
          {filteredUsers.map((item) => {
            const stats = getEmployeeStats(item.id);
            return (
              <div 
                key={item.id} 
                className="bg-white border border-gray-155 rounded-xl p-3 shadow-3xs space-y-2 flex flex-col hover:border-gray-350 transition-all"
              >
                {/* Header card row */}
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#0B3A60] flex items-center gap-1.5">
                      {item.name}
                      <span className={`px-1.5 h-4.5 inline-flex items-center justify-center rounded border text-[8px] font-black tracking-wider uppercase shrink-0 ${
                        item.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        item.role === 'executive' ? 'bg-orange-50 text-[#E8590C] border-orange-200 font-bold' :
                        item.role === 'approver' ? 'bg-yellow-50 text-yellow-700 border-yellow-250 font-bold' :
                        'bg-gray-50 text-gray-500 border-gray-200 font-medium'
                      }`}>
                        <span translate="no" className="notranslate">
                          {item.role === 'admin' ? 'CHỦ ADMIN' : 
                           item.role === 'executive' ? 'BAN TGĐ' :
                           item.role === 'approver' ? 'DUYỆT VIÊN' : 'CBNV'}
                        </span>
                      </span>
                    </h4>
                    <p className="text-[10px] text-gray-500 font-bold mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>{item.phone} {item.employeeId ? `| MNV: ${item.employeeId}` : ''}</span>
                      {(() => {
                        const isOnline = item.lastActive && Math.abs(Date.now() - item.lastActive) <= 240000;
                        const isApprovedToday = (item.status || '').toLowerCase() === 'approved' && item.createdAt && item.createdAt.startsWith(todayStr);
                        return (
                          <>
                            {isOnline && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-green-600 animate-pulse bg-green-50 px-1 py-0.5 rounded border border-green-200 uppercase tracking-wider">
                                <span className="w-1 h-1 rounded-full bg-green-500 animate-ping inline-block"></span>
                                <span>online</span>
                              </span>
                            )}
                            {isApprovedToday && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-red-600 animate-pulse bg-red-50 border border-red-200 px-1 py-0.5 rounded uppercase tracking-wide">
                                <span className="w-1 h-1 rounded-full bg-red-600 inline-block animate-ping"></span>
                                <span>New</span>
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </p>
                  </div>

                  {/* Status label badge */}
                  <div>
                    {item.status === 'approved' ? (
                      <span className="bg-green-50 text-green-700 text-[8.5px] font-extrabold px-2 py-0.5 rounded-full border border-green-100 uppercase">Hoạt động</span>
                    ) : item.status === 'rejected' ? (
                      <span className="bg-red-50 text-red-700 text-[8.5px] font-extrabold px-2 py-0.5 rounded-full border border-red-100 uppercase">Bị chặn</span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 text-[8.5px] font-extrabold px-2 py-0.5 rounded-full border border-amber-100 uppercase animate-pulse">Chờ duyệt</span>
                    )}
                  </div>
                </div>

                {/* Structure / Org specs */}
                <div className="text-[9.5px] text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-lg leading-relaxed">
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="font-bold truncate">{item.company || 'TÂN PHÚ VIỆT NAM'}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 font-medium">
                    <Landmark className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{item.branch || 'Sở Tại'}</span> &rarr; <span className="font-semibold truncate">{item.department || 'Đơn vị'}</span>
                  </div>
                </div>

                {/* Performance specs of the quiz user */}
                <div className="flex items-center justify-between text-[9px] text-gray-450 border-t border-gray-100 pt-2">
                  <span>Số lượt làm: <strong className="text-gray-750 font-bold">{stats.quizzesTaken} lượt</strong></span>
                  <span>Điểm trung bình: <strong className="text-gray-755 font-bold">{stats.average}/30đ</strong></span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[8.5px] uppercase ${stats.style}`}>
                    {stats.evaluation}
                  </span>
                </div>

                {/* Actions row footer */}
                <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-2 mt-1">
                  <div className="flex items-center gap-1.5 flex-1Wrap w-full">
                    {item.status !== 'approved' && (
                      <button
                        onClick={() => handleApproveUser(item.id)}
                        className="py-1 px-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[9.5px] font-extrabold shadow-3xs active:scale-95 transition-all outline-none cursor-pointer"
                      >
                        DUYỆT ĐĂNG KÝ
                      </button>
                    )}
                    {item.status !== 'rejected' && (
                      <button
                        onClick={() => handleRejectUser(item.id)}
                        className="py-1 px-2.5 bg-red-100 hover:bg-red-200 border border-red-200 text-red-700 rounded-lg text-[9.5px] font-extrabold active:scale-95 transition-all outline-none cursor-pointer"
                      >
                        CHẶN/TỪ CHỐI
                      </button>
                    )}
                    
                    {/* Promoting Role buttons */}
                    {item.role !== 'admin' && (
                      <button
                        onClick={() => handleMobileToggleRole(item.id, item.role || 'employee')}
                        className={`py-1 px-2 border rounded-lg text-[9.5px] font-semibold active:scale-95 transition-all outline-none cursor-pointer ${
                          item.role === 'approver'
                            ? 'bg-orange-50 border-orange-200 text-orange-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={item.role === 'approver' ? "Hạ cấp xuống Nhân viên" : "Thăng cấp lên Duyệt viên"}
                      >
                        {item.role === 'approver' ? 'HẠ CẤP THOÁT KHỎI DUYỆT VIÊN' : 'XÉT LÀM DUYỆT VIÊN'}
                      </button>
                    )}
                  </div>

                  {item.role !== 'admin' && (
                    <button
                      onClick={() => handleMobileDeleteUser(item.id)}
                      className="p-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg border border-red-200/50 hover:border-red-300 transition-all active:scale-95 cursor-pointer ml-1 inline-flex items-center justify-center"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <p className="text-center text-xs text-gray-400 italic py-8">Không tìm thấy tài khoản CBNV nào phù hợp.</p>
          )}
        </div>
      </div>
    );
  };

  const renderMobileStatsPanel = () => {
    return (
      <div className="flex flex-col flex-1 h-full pb-4 font-sans">
        {/* Header bar */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-2 sticky top-0 bg-white z-10 shrink-0">
          <button 
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            THỐNG KÊ HOẠT ĐỘNG
          </span>
          <button 
            onClick={refreshData}
            className="p-1 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 transition-all cursor-pointer"
            title="Đồng bộ"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stats content area */}
        <div className="-mx-4 px-4 pb-24 text-left">
          <StatsDashboard 
            users={deptUsers} 
            results={
              user.role === 'admin' 
                ? allResults 
                : (() => {
                    const deptNorm = (user.department || '').trim().toLowerCase();
                    if (deptNorm === 'ban tổng giám đốc') {
                      return allResults;
                    } else if (deptNorm === 'ban giám đốc') {
                      return allResults.filter(r => r.branch === user.branch);
                    } else {
                      return allResults.filter(r => r.branch === user.branch && r.department === user.department);
                    }
                  })()
            } 
            onRefresh={() => refreshData(true)} 
            onBackToHome={() => setAdminMobileTab('home')}
            companyMappings={companyMappings}
            isAdmin={user.role === 'admin'}
          />
        </div>
      </div>
    );
  };

  const renderMobileEncodingPanel = () => {
    const activeCo = companyMappings.find(c => c.id === selectedCoId);
    const activeBr = activeCo?.branches.find(b => b.id === selectedBrId);

    return (
      <div className="flex flex-col flex-1 h-full font-sans pb-4">
        {/* Header */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-3 sticky top-0 bg-white z-10 shrink-0">
          <button 
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            MÃ HÓA DANH MỤC
          </span>
          <div className="w-6" />
        </div>

        {/* Step tab switcher */}
        <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl mb-3 shrink-0">
          {(['company', 'branch', 'department'] as const).map((step) => (
            <button
              key={step}
              onClick={() => setEncodingStep(step)}
              className={`py-1.5 rounded-lg text-[9.5px] font-extrabold uppercase transition-all tracking-tight ${
                encodingStep === step
                  ? 'bg-white text-blue-900 shadow-2xs border border-gray-200 font-extrabold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {step === 'company' && '1. Công ty'}
              {step === 'branch' && '2. Chi nhánh'}
              {step === 'department' && '3. Bộ phận'}
            </button>
          ))}
        </div>

        {/* Notification Alert Banner */}
        {adminMobileNotice && (
          <div className={`p-2 mb-3 rounded-lg text-xs font-bold border transition-all duration-300 ${
            adminMobileNotice.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {adminMobileNotice.msg}
          </div>
        )}

        {/* Dynamic Panel content depending on Step */}

        {/* 1. COMPANY STEP */}
        {encodingStep === 'company' && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex gap-1.5 shrink-0">
              <input
                type="text"
                placeholder="Thêm Công ty mới..."
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 shadow-3xs text-left"
              />
              <button
                onClick={handleMobileAddCompany}
                className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 animate-none" />
              </button>
            </div>

            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold shrink-0 text-left">Danh sách Công ty:</div>
            <div className="space-y-1.5 pr-1 pb-24">
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
                  className={`p-3 rounded-xl border text-xs flex justify-between items-center cursor-pointer transition-all ${
                    selectedCoId === co.id
                      ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-bold shadow-3xs font-sans'
                      : 'bg-white border-gray-150 text-gray-700 hover:bg-gray-50 font-sans'
                  }`}
                >
                  <span className="truncate pr-2">{co.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const name = window.prompt("Nhập tên Công ty mới:", co.name);
                        if (name && name.trim()) {
                          handleMobileEditMappingDirectly('company', co.id, undefined, undefined, co.name, name);
                        }
                      }}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg cursor-pointer inline-flex items-center justify-center"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMobileDeleteCompany(co.id);
                      }}
                      className="text-red-500 hover:bg-red-50 p-1 rounded-lg cursor-pointer inline-flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {companyMappings.length === 0 && (
                <p className="text-center text-xs text-gray-400 italic py-6">Chưa có công ty thành viên nào.</p>
              )}
            </div>
            {selectedCoId && (
              <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-[9.5px] text-slate-500 shrink-0 text-left">
                Đang chọn: <strong className="text-blue-900 font-extrabold">{activeCo?.name}</strong>. Bấm sang mục Chi nhánh/Bộ phận để cấu hình chi tiết!
              </div>
            )}
          </div>
        )}

        {/* 2. BRANCH STEP */}
        {encodingStep === 'branch' && (
          <div className="flex-1 flex flex-col space-y-3">
            {!selectedCoId ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-xs font-semibold text-center mt-4">
                Vui lòng chọn một <strong>Công ty thành viên</strong> ở Tab "1. Công ty" trước.
              </div>
            ) : (
              <>
                <div className="text-[10px] text-gray-400 uppercase font-bold shrink-0 text-left">
                  Công ty đang chọn: <span className="text-[#0B3A60] font-black">{activeCo?.name}</span>
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <input
                    type="text"
                    placeholder="Thêm Chi nhánh mới..."
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 shadow-3xs text-left"
                  />
                  <button
                    onClick={handleMobileAddBranch}
                    className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold shrink-0 text-left">Danh sách Chi nhánh:</div>
                <div className="space-y-1.5 pr-1 pb-24">
                  {activeCo?.branches.map((br) => (
                    <div
                      key={br.id}
                      onClick={() => setSelectedBrId(br.id)}
                      className={`p-3 rounded-xl border text-xs flex justify-between items-center cursor-pointer transition-all ${
                        selectedBrId === br.id
                          ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-bold shadow-3xs'
                          : 'bg-white border-gray-150 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate pr-2">{br.name}</span>
                      <div className="flex items-center gap-1 shrink-0 bg-transparent" onClick={(e) => e.stopPropagation()}>
                        <label className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-gray-250 bg-white hover:bg-gray-50 rounded text-[9px] text-gray-500 font-bold select-none cursor-pointer">
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
                            }}
                            className="rounded border-gray-200 text-blue-600 focus:ring-blue-500 h-3 w-3 cursor-pointer"
                          />
                          <span>Tính điểm</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = window.prompt("Nhập tên Chi nhánh mới:", br.name);
                            if (name && name.trim()) {
                              handleMobileEditMappingDirectly('branch', selectedCoId, br.id, undefined, br.name, name);
                            }
                          }}
                          className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg cursor-pointer inline-flex items-center justify-center animate-none"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMobileDeleteBranch(selectedCoId, br.id);
                          }}
                          className="text-red-500 hover:bg-red-50 p-1 rounded-lg cursor-pointer inline-flex items-center justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(activeCo?.branches || []).length === 0 && (
                    <p className="text-center text-xs text-gray-400 italic py-6">Chưa có chi nhánh nào thuộc công ty này.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 3. DEPARTMENT STEP */}
        {encodingStep === 'department' && (
          <div className="flex-1 flex flex-col space-y-3">
            {!selectedCoId || !selectedBrId ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-xs font-semibold text-center mt-4">
                Vui lòng chọn <strong>Công ty</strong> và <strong>Chi nhánh</strong> trực thuộc ở Tab 1 & Tab 2 trước.
              </div>
            ) : (
              <>
                <div className="text-[10px] text-gray-400 uppercase font-bold shrink-0 space-y-0.5 text-left">
                  <div>Cty: <span className="text-slate-700 truncate font-semibold">{activeCo?.name}</span></div>
                  <div>Chi nhánh: <span className="text-blue-900 font-extrabold truncate">{activeBr?.name}</span></div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <input
                    type="text"
                    placeholder="Thêm Bộ phận mới..."
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 shadow-3xs text-left"
                  />
                  <button
                    onClick={handleMobileAddDepartment}
                    className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer animate-none"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-[10px] uppercase tracking-wider text-gray-455 font-bold shrink-0 text-left">Danh sách Bộ phận:</div>
                <div className="space-y-1.5 pr-1 pb-24">
                  {activeBr?.departments.map((dept) => (
                    <div
                      key={dept.id}
                      className="p-3 bg-white border border-gray-150 rounded-xl text-xs flex justify-between items-center transition-all"
                    >
                      <span className="truncate pr-2 font-sans">{dept.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <label className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-gray-250 bg-white hover:bg-gray-50 rounded text-[9px] text-gray-500 font-bold select-none cursor-pointer">
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
                            }}
                            className="rounded border-gray-200 text-blue-600 focus:ring-blue-500 h-3 w-3 cursor-pointer"
                          />
                          <span>Tính điểm</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = window.prompt("Nhập tên Bộ phận mới:", dept.name);
                            if (name && name.trim()) {
                              handleMobileEditMappingDirectly('department', selectedCoId, selectedBrId, dept.id, dept.name, name);
                            }
                          }}
                          className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg cursor-pointer inline-flex items-center justify-center"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMobileDeleteDepartment(selectedCoId, selectedBrId, dept.id);
                          }}
                          className="text-red-500 hover:bg-red-50 p-1 rounded-lg cursor-pointer inline-flex items-center justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(activeBr?.departments || []).length === 0 && (
                    <p className="text-center text-xs text-gray-400 italic py-6">Chưa có bộ phận nào dưới chi nhánh này.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMobileQrPanel = () => {
    return (
      <div className="flex flex-col flex-1 h-full pb-4 font-sans text-left">
        {/* Header bar */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-3 sticky top-0 bg-white z-10 shrink-0">
          <button 
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            MÃ QR TRUY CẬP
          </span>
          <div className="w-6" />
        </div>

        {/* Content */}
        <div className="space-y-4 pb-20 overflow-y-auto max-h-[75vh]">
          <div className="bg-white border border-gray-150 rounded-xl p-4 space-y-4 shadow-3xs">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-800">Mã QR "Chiến" Ngay</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Quét nhanh bằng camera điện thoại để thực hiện bài trắc nghiệm nhanh 3T Mastery.
              </p>
            </div>

            {/* Note alert */}
            <div className="bg-amber-50 border border-amber-200 text-left p-3 rounded-lg text-[11px] leading-relaxed text-amber-900">
              <button 
                type="button"
                onClick={() => setShowQrNotice(!showQrNotice)}
                className="w-full flex items-center justify-between font-bold text-amber-955 focus:outline-none cursor-pointer"
              >
                <span>⚠️ Lưu ý khi Quét Thử Nghiệm:</span>
                {showQrNotice ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showQrNotice && (
                <div className="mt-2 space-y-1 border-t border-amber-200 pt-2 text-[10.5px]">
                  <p>
                    Vùng phát triển qua <code className="bg-amber-100 px-1 rounded font-mono text-amber-955 font-bold">ais-dev-...</code> được Google kiểm soát bảo mật.
                  </p>
                  <p className="mt-1">
                    Trình duyệt của bạn phải được đăng nhập bằng Google Mail được phân quyền dự án, hoặc dán đường dẫn web thực tế vào bộ lọc bên dưới.
                  </p>
                </div>
              )}
            </div>

            {/* Input URL */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Liên kết nhúng QR:</label>
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  value={customQrUrl} 
                  onChange={(e) => setCustomQrUrl(e.target.value)}
                  placeholder="Đường dẫn URL..."
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50 font-mono text-gray-700"
                />
                {customQrUrl !== 'https://quiz3t.vercel.app' && (
                  <button 
                    onClick={() => setCustomQrUrl('https://quiz3t.vercel.app')} 
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-655 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                  >
                    Mặc định
                  </button>
                )}
              </div>
            </div>

            {/* QR Generation image */}
            <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl flex justify-center items-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(customQrUrl || 'https://quiz3t.vercel.app')}`} 
                alt="Văn Hóa 3T QR Code Portal" 
                className="bg-white border rounded-lg p-2 shadow-inner h-[180px] w-[180px]"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="text-[10px] font-mono text-gray-500 bg-gray-50 p-2 rounded break-all border border-gray-200 max-w-full text-center">
              {customQrUrl || 'https://quiz3t.vercel.app'}
            </div>

            <button
              onClick={() => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(customQrUrl || 'https://quiz3t.vercel.app')}`;
                window.open(qrUrl, '_blank');
              }}
              className="w-full flex items-center justify-center gap-1.5 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2 rounded-lg shadow-3xs"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Tải Mã QR nét cao</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMobileFirebaseDataPanel = () => {
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

    return (
      <div className="flex flex-col flex-1 h-full pb-4 font-sans text-left">
        {/* Header bar */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-3 sticky top-0 bg-white z-10 shrink-0">
          <button 
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            HỆ THỐNG DỮ LIỆU
          </span>
          <button 
            onClick={() => setQuota(getQuotaStats())}
            className="p-1 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 transition-all cursor-pointer"
            title="Đồng bộ"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 pb-20 overflow-y-auto max-h-[75vh]">
          {/* Quota limit card */}
          <div className="bg-white border border-gray-150 rounded-xl p-4 space-y-4 shadow-3xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-[#0B3A60] uppercase tracking-wide flex items-center gap-1.5">
                <Database className="h-4 w-4 text-blue-500" />
                <span>HẠN MỨC QUOTA FIREBASE</span>
              </h3>
              <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-[#1971C2] text-[8px] font-extrabold rounded uppercase tracking-wider">
                Spark Plan
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-normal">
              Định mức truy cập thực tế của ứng dụng Văn Hóa 3T Mastery với gói Firebase miễn phí trọn đời (Spark Plan):
            </p>

            <div className="space-y-3.5 pt-1">
              {/* Reads Tracker */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-gray-700">Đọc dữ liệu (Reads)</span>
                  <span className={`font-mono font-bold ${getTextColor(readPercent)}`}>
                    {quota.reads.toLocaleString()} / {firebaseQuotaLimits.reads.toLocaleString()} ({readPercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${readPercent}%` }} 
                    className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(readPercent)}`}
                  />
                </div>
              </div>

              {/* Writes Tracker */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-gray-700">Ghi dữ liệu (Writes)</span>
                  <span className={`font-mono font-bold ${getTextColor(writePercent)}`}>
                    {quota.writes.toLocaleString()} / {firebaseQuotaLimits.writes.toLocaleString()} ({writePercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${writePercent}%` }} 
                    className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(writePercent)}`}
                  />
                </div>
              </div>

              {/* Deletes Tracker */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-gray-700">Xóa dữ liệu (Deletes)</span>
                  <span className={`font-mono font-bold ${getTextColor(deletePercent)}`}>
                    {quota.deletes.toLocaleString()} / {firebaseQuotaLimits.deletes.toLocaleString()} ({deletePercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${deletePercent}%` }} 
                    className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(deletePercent)}`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 bg-gray-50/70 p-3 rounded-lg flex items-start gap-1.5 text-[10.5px] text-blue-800 leading-relaxed font-medium">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <b>Tự động tối ưu:</b> Máy chủ chỉ đọc kết quả trong vòng <b>30 ngày gần nhất</b>. Giúp giảm tải 85% tổng lượt đọc & bảo toàn định mức quota của dự án.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMobileRulesEditorPanel = () => {
    return null;
  };

  const old_unused_renderMobileRulesEditorPanel = () => {

    const handleSaveRulesClick = async () => {
      setSavingLevelRules(true);
      try {
        await databaseService.saveLevelRules(editableRules);
        // Also update local live rules immediately so change is reflected live
        setLevelRules(editableRules);
        setAdminMobileNotice({ type: 'success', msg: 'Lưu quy chế thăng/hạ cấp và điểm số thành công đồng bộ trên hệ thống!' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err: any) {
        console.error(err);
        setAdminMobileNotice({ type: 'error', msg: 'Lỗi đồng bộ dữ liệu quy chế lên Firestore: ' + err.message });
      } finally {
        setSavingLevelRules(false);
      }
    };

    return (
      <div className="flex flex-col flex-1 h-full pb-4 font-sans text-left">
        {/* Header bar */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-3 sticky top-0 bg-white z-10 shrink-0">
          <button 
            onClick={() => {
              setAdminMobileTab('home');
              setAdminMobileNotice(null);
            }}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            CẤU HÌNH QUY CHẾ 3T
          </span>
          <button 
            onClick={() => setEditableRules(levelRules || DEFAULT_LEVEL_RULES)}
            className="p-1 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 transition-all cursor-pointer"
            title="Khôi phục lại hiện tại"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Notice toast */}
        {adminMobileNotice && (
          <div className={`p-2.5 rounded-lg text-xs font-bold mb-3 flex items-start gap-1.5 shadow-3xs ${
            adminMobileNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {adminMobileNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{adminMobileNotice.msg}</span>
          </div>
        )}

        {/* Content fields - elegant scrolling layout */}
        <div className="space-y-4 pb-24 overflow-y-auto max-h-[72vh] px-0.5 style-scrollbar">
          
          {/* Card: Giới thiệu chung */}
          <div className="bg-white border border-gray-150 rounded-xl p-3.5 space-y-3 shadow-3xs">
            <h3 className="text-xs font-extrabold text-[#0B3A60] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Award className="h-4 w-4 text-blue-500" />
              <span>GIỚI THIỆU CHUNG DUY TRÌ HỌC TẬP</span>
            </h3>
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-gray-650 block">Mô tả và tiêu đề đầu trang quyển quy chế:</label>
              <textarea
                value={editableRules.introduction || ''}
                onChange={(e) => setEditableRules({ ...editableRules, introduction: e.target.value })}
                className="w-full min-h-[70px] text-xs p-2 border border-gray-250 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-normal"
                placeholder="Nhập nội dung mô tả quy chế..."
              />
            </div>
          </div>

          {/* Card: Quy chế Hạ cấp độ do không hoạt động (Duy trì phong độ) */}
          <div className="bg-white border border-gray-150 rounded-xl p-3.5 space-y-3 shadow-3xs">
            <h3 className="text-xs font-extrabold text-[#0B3A60] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>QUY CHẾ DUY TRÌ & HẠ CẤP TỰ ĐỘNG</span>
            </h3>
            
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
              CBNV cần hoàn thành ít nhất 02 lượt ôn luyện/ngày để giữ vững phong độ. Nếu không đạt yêu cầu, hệ thống sẽ tự động hạ giảm cấp độ chầm chậm qua mỗi ngày cho tới khi về Cấp 1: Tân Binh.
            </p>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600">Yêu cầu giữ vững phong độ (Dòng 1):</label>
                <input
                  type="text"
                  value={editableRules.inactivityRules?.rule1 || 'Để duy trì cấp độ, mỗi ngày nhân viên cần phải thực hiện ít nhất 02 lượt đánh giá để giữ vững phong độ của mình.'}
                  onChange={(e) => setEditableRules({
                    ...editableRules,
                    inactivityRules: {
                      ...editableRules.inactivityRules,
                      rule1: e.target.value
                    }
                  })}
                  className="w-full text-xs p-2 border border-gray-250 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-600">Quy định hạ cấp tự động hàng ngày (Dòng 2):</label>
                <input
                  type="text"
                  value={editableRules.inactivityRules?.rule2 || 'Nếu nhân viên không hoạt động thì hệ thống sẽ hạ dần cấp độ (mỗi ngày hạ một cấp) cho đến khi quay về lại cấp 1.'}
                  onChange={(e) => setEditableRules({
                    ...editableRules,
                    inactivityRules: {
                      ...editableRules.inactivityRules,
                      rule2: e.target.value
                    }
                  })}
                  className="w-full text-xs p-2 border border-gray-250 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cards for each Level Rule */}
          {editableRules.levels.map((lvl, index) => (
            <div key={lvl.level} className="bg-white border border-gray-150 rounded-xl p-3.5 space-y-3.5 shadow-3xs">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h4 className="text-xs font-black text-gray-950 uppercase flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-900 text-white text-[9.5px] font-bold font-mono">{lvl.level}</span>
                  <span>CẤP {lvl.level}: {lvl.name}</span>
                </h4>
                <input
                  type="text"
                  value={lvl.emoji || ''}
                  onChange={(e) => {
                    const newLevels = [...editableRules.levels];
                    newLevels[index] = { ...newLevels[index], emoji: e.target.value };
                    setEditableRules({ ...editableRules, levels: newLevels });
                  }}
                  className="w-8 text-center text-xs p-0.5 border border-gray-250 rounded focus:outline-none"
                  title="Emoji đại diện"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600">Tên Cấp Độ:</label>
                  <input
                    type="text"
                    value={lvl.name || ''}
                    onChange={(e) => {
                      const newLevels = [...editableRules.levels];
                      newLevels[index] = { ...newLevels[index], name: e.target.value };
                      setEditableRules({ ...editableRules, levels: newLevels });
                    }}
                    className="w-full text-xs p-1.5 border border-gray-250 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-600">Thời gian trả lời tối đa (giây):</label>
                  <input
                    type="number"
                    value={lvl.maxTime || 0}
                    onChange={(e) => {
                      const newLevels = [...editableRules.levels];
                      newLevels[index] = { ...newLevels[index], maxTime: parseInt(e.target.value) || 0 };
                      setEditableRules({ ...editableRules, levels: newLevels });
                    }}
                    className="w-full text-xs p-1.5 border border-gray-250 rounded-lg font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#0B3A60] flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    <span>Quy tắc đạt điểm tuyệt đối đạt chuẩn (Thăng cấp):</span>
                  </label>
                  <textarea
                    value={lvl.promotionCriteria || ''}
                    onChange={(e) => {
                      const newLevels = [...editableRules.levels];
                      newLevels[index] = { ...newLevels[index], promotionCriteria: e.target.value };
                      setEditableRules({ ...editableRules, levels: newLevels });
                    }}
                    className="w-full text-[11px] p-2 border border-gray-250 rounded-lg focus:outline-none leading-normal min-h-[46px]"
                  />
                </div>

                {lvl.level > 1 && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#0B3A60] flex items-center gap-1">
                      <ChevronDown className="h-3 w-3 text-red-600" />
                      <span>Quy tắc cảnh báo hạ cấp độ:</span>
                    </label>
                    <textarea
                      value={lvl.demotionCriteria || ''}
                      onChange={(e) => {
                        const newLevels = [...editableRules.levels];
                        newLevels[index] = { ...newLevels[index], demotionCriteria: e.target.value };
                        setEditableRules({ ...editableRules, levels: newLevels });
                      }}
                      className="w-full text-[11px] p-2 border border-gray-250 rounded-lg focus:outline-none leading-normal min-h-[46px]"
                    />
                  </div>
                )}
              </div>

              {/* Reaction Points Config */}
              <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider block">Thiết lập điểm số phản xạ nhanh:</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="space-y-0.5">
                    <label className="text-emerald-700 font-bold block">Đạt 10 điểm khi trả lời dưới (giây):</label>
                    <input
                      type="text"
                      value={lvl.reactionPoints?.p10 || ''}
                      onChange={(e) => {
                        const newLevels = [...editableRules.levels];
                        newLevels[index] = {
                          ...newLevels[index],
                          reactionPoints: {
                            ...newLevels[index].reactionPoints,
                            p10: e.target.value
                          }
                        };
                        setEditableRules({ ...editableRules, levels: newLevels });
                      }}
                      className="w-full text-xs p-1.5 border border-gray-250 rounded focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-blue-700 font-bold block">Nhận 8 điểm trong khoảng (giây):</label>
                    <input
                      type="text"
                      value={lvl.reactionPoints?.p8 || ''}
                      onChange={(e) => {
                        const newLevels = [...editableRules.levels];
                        newLevels[index] = {
                          ...newLevels[index],
                          reactionPoints: {
                            ...newLevels[index].reactionPoints,
                            p8: e.target.value
                          }
                        };
                        setEditableRules({ ...editableRules, levels: newLevels });
                      }}
                      className="w-full text-xs p-1.5 border border-gray-250 rounded focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-amber-700 font-bold block">Nhận 6 điểm trong khoảng (giây):</label>
                    <input
                      type="text"
                      value={lvl.reactionPoints?.p6 || ''}
                      onChange={(e) => {
                        const newLevels = [...editableRules.levels];
                        newLevels[index] = {
                          ...newLevels[index],
                          reactionPoints: {
                            ...newLevels[index].reactionPoints,
                            p6: e.target.value
                          }
                        };
                        setEditableRules({ ...editableRules, levels: newLevels });
                      }}
                      className="w-full text-xs p-1.5 border border-gray-250 rounded focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-slate-500 font-bold block">Nhận 5 điểm trong khoảng (giây):</label>
                    <input
                      type="text"
                      value={lvl.reactionPoints?.p5 || ''}
                      onChange={(e) => {
                        const newLevels = [...editableRules.levels];
                        newLevels[index] = {
                          ...newLevels[index],
                          reactionPoints: {
                            ...newLevels[index].reactionPoints,
                            p5: e.target.value
                          }
                        };
                        setEditableRules({ ...editableRules, levels: newLevels });
                      }}
                      className="w-full text-xs p-1.5 border border-gray-250 rounded focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Spacer to push save button */}
          <div className="h-10"></div>
        </div>

        {/* Floating action bar at bottom with save */}
        <div className="absolute bottom-3 left-3 right-3 bg-white border border-gray-150 p-2.5 rounded-xl shadow-lg flex items-center justify-between gap-3 z-30">
          <button
            onClick={() => {
              setAdminMobileTab('home');
              setAdminMobileNotice(null);
            }}
            className="flex-1 py-2 px-3 border border-gray-250 hover:bg-gray-50 active:scale-95 transition-all text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>ĐÓNG THOÁT</span>
          </button>
          
          <button
            onClick={handleSaveRulesClick}
            disabled={savingLevelRules}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-[#1971C2] hover:shadow-md active:scale-97 transition-all text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {savingLevelRules ? (
              <>
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                <span>ĐANG đồng bộ...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>LƯU QUY CHẾ LÊN CLOUD</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.60);
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAiNotice(null);
    setAiLoading(true);

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
    setAiLoading(false);
  };

  const handleExtractWithAI = async () => {
    if (selectedImages.length === 0) return;
    setAiNotice(null);
    setExtracting(true);

    try {
      const imagePayloads = selectedImages.map(img => ({
        mimeType: img.file.type || "image/jpeg",
        data: img.compressedBase64
      }));

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
              // Extract error description or show status code
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
        throw new Error("Không thể đọc phản hồi JSON thành công từ máy chủ AI. Vui lòng thử lại bằng ảnh chụp màn hình gọn hơn.");
      }

      const aiQuestions: Question[] = result.questions || [];

      if (aiQuestions.length === 0) {
        setAiNotice({ type: 'error', msg: 'Không tìm thấy câu hỏi trắc nghiệm hợp lệ nào trong các hình ảnh đã chọn. Bạn hãy chụp thẳng trục diện câu hỏi và thử lại.' });
        setExtracting(false);
        return;
      }

      // Automatically check for duplication compared to our active questions database (Semantic/Word overlap comparison)
      const formattedWithDuplicates = aiQuestions.map(extracted => {
        const normExtracted = extracted.text.replace(/\s+/g, '').toLowerCase();
        
        const duplicateMatch = questions.find(existing => {
          const normExisting = existing.text.replace(/\s+/g, '').toLowerCase();
          return normExisting.includes(normExtracted) || normExtracted.includes(normExisting);
        });

        return {
          ...extracted,
          isDuplicate: !!duplicateMatch,
          duplicateOriginal: duplicateMatch?.text
        };
      });

      setExtractedQuestions(formattedWithDuplicates);
      setAiNotice({ type: 'success', msg: `Bóc tách thành công và đối soát trùng lặp ${aiQuestions.length} câu hỏi!` });

    } catch (err: any) {
      console.error(err);
      setAiNotice({ 
        type: 'error', 
        msg: err.message || 'Lỗi bóc tách dữ liệu bằng AI. Vui lòng tải lại ảnh chụp nhỡ/bản chụp mờ hoặc kiểm tra lại mạng.' 
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtractedQuestions = async () => {
    const validQuestions = extractedQuestions.filter(q => !q.isDuplicate);
    if (validQuestions.length === 0) {
      setAiNotice({ type: 'error', msg: 'Tất cả câu hỏi bóc tách đều nằm thế trùng lặp. Không có dữ liệu lưu trữ mới.' });
      return;
    }

    const cleanQuestions: Question[] = validQuestions.map(q => {
      const cleanQ: Question = {
        id: q.id,
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation
      };
      if (q.imageUrl) {
        cleanQ.imageUrl = q.imageUrl;
      }
      return cleanQ;
    });

    try {
      setAiLoading(true);
      await databaseService.saveQuestions(cleanQuestions);
      setAiNotice({ type: 'success', msg: `Đã lưu thành công ${cleanQuestions.length} câu hỏi mới vào hệ thống!` });
      setExtractedQuestions([]);
      setSelectedImages([]);
      await refreshQuestions();
    } catch (err) {
      console.error("Lỗi lưu câu hỏi bóc tách:", err);
      setAiNotice({ type: 'error', msg: 'Có lỗi xảy ra khi lưu ngân hàng đề.' });
    } finally {
      setAiLoading(false);
    }
  };
  
  const getMaxQuestionTimer = (level: number): number => {
    if (levelRules && levelRules.levels) {
      const match = levelRules.levels.find(l => l.level === level);
      if (match && match.maxTime) {
        const parsed = parseInt(match.maxTime, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    if (level === 5) return 15;
    if (level === 4) return 20;
    if (level === 3) return 30;
    if (level === 2) return 60;
    return 90;
  };

  const getQuestionScore = (timeSpent: number, isCorrect: boolean, level: number): number => {
    if (!isCorrect) return 0;
    if (level === 5) {
      if (timeSpent <= 4) return 10;
      if (timeSpent <= 6) return 8;
      if (timeSpent <= 8) return 6;
      return 5;
    } else if (level === 4) {
      if (timeSpent <= 6) return 10;
      if (timeSpent <= 10) return 8;
      if (timeSpent <= 15) return 6;
      return 5;
    } else if (level === 3) {
      if (timeSpent <= 10) return 10;
      if (timeSpent <= 15) return 8;
      if (timeSpent <= 20) return 6;
      return 5;
    } else if (level === 2) {
      if (timeSpent <= 20) return 10;
      if (timeSpent <= 30) return 8;
      if (timeSpent <= 40) return 6;
      return 5;
    } else {
      // Level 1: Default
      if (timeSpent <= 30) return 10;
      if (timeSpent <= 40) return 8;
      if (timeSpent <= 50) return 6;
      return 5;
    }
  };

  // States of Active Quiz
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizTimer, setQuizTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(getMaxQuestionTimer(difficulty));
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0 });
  const [timerInterval, setTimerInterval] = useState<any>(null);
  
  const [backChanceUsed, setBackChanceUsed] = useState(false);
  const [backClicksCount, setBackClicksCount] = useState(0);
  const [quizInfoMessage, setQuizInfoMessage] = useState<string | null>(null);
  
  const [showResultsReview, setShowResultsReview] = useState(false);
  const [lastQuizResult, setLastQuizResult] = useState<QuizResult | null>(null);
  const [selectedMotivationalSlogan, setSelectedMotivationalSlogan] = useState<string>('');

  useEffect(() => {
    if (lastQuizResult) {
      const getMotivationalSloganForScore = (score: number): string => {
        const match = (motivationalSlogans || []).find(
          (band) => score >= band.minScore && score <= band.maxScore
        );
        if (match && match.slogans && match.slogans.length > 0) {
          const randomIndex = Math.floor(Math.random() * match.slogans.length);
          return match.slogans[randomIndex];
        }
        if (match && match.slogan) {
          return match.slogan;
        }
        
        let fallbackList: string[] = [];
        if (score === 30) {
          fallbackList = [
            "Phản xạ ánh sáng - Tốc độ dẫn đầu,\nxứng danh chiến binh 3T thực thụ!",
            "Trí tuệ tinh thông, phản xạ thần tốc -\nBạn chính là tấm gương tốc độ 3T!",
            "Bứt phá mọi giới hạn -\nTốc độ tuyệt đối tạo nên vị thế dẫn đầu!"
          ];
        } else if (score >= 20) {
          fallbackList = [
            "Chính xác thôi chưa đủ -\nĐẩy nhanh tốc độ để chiếm lĩnh đỉnh cao!",
            "Kiến thức rất vững vàng -\nHãy rèn thêm phản xạ để tối ưu hóa thời gian!",
            "Chậm một giây, lỡ một nhịp -\nCố gắng rút ngắn thời gian làm bài ở lượt sau!"
          ];
        } else if (score >= 15) {
          fallbackList = [
            "Vượt qua thử thách -\nTiếp tục mài giũa tư duy để tăng tốc phản xạ!",
            "Tốc độ tạo khoảng cách -\nHãy nỗ lực luyện tập để phản xạ nhanh như chớp!",
            "Kiến thức nằm lòng, phản xạ tự nhiên -\nHãy luyện tập để không còn độ trễ!"
          ];
        } else {
          fallbackList = [
            "Tốc độ là sống còn - Hãy luyện tập thật nhiều\nđể phản xạ nhanh hơn!",
            "Thất bại là bước đệm -\nLuyện tập không ngừng, làm chủ tốc độ 3T!",
            "Quyết tâm bứt phá -\nĐập tan độ trễ để nâng tầm bản thân ở lượt thi tới!"
          ];
        }
        const rIndex = Math.floor(Math.random() * fallbackList.length);
        return fallbackList[rIndex];
      };

      const picked = getMotivationalSloganForScore(lastQuizResult.score);
      setSelectedMotivationalSlogan(picked || '');
    }
  }, [lastQuizResult, motivationalSlogans]);

  // States for Mistakes reviewing and Analysis
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);
  const [analysisScope, setAnalysisScope] = useState<'personal' | 'collective'>('personal');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const qs = await databaseService.getQuestions();
        setQuestions(qs);
        
        const allRes = await databaseService.getQuizResults();
        setAllResults(allRes);
        
        // Filter result for this user
        const userResults = allRes
          .filter(r => r.userId === user.id)
          .sort((a, b) => b.timestamp - a.timestamp);
        setResults(userResults);

        try {
          const rules = await databaseService.getLevelRules();
          setLevelRules(rules);
        } catch (ruleErr) {
          console.error("Lỗi khi tải quy chế cấp độ:", ruleErr);
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu nhân viên:", err);
      }
    };
    loadData();
  }, [user.id]);

  // Refs to avoid state closures inside setInterval
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const quizStartedRef = useRef(quizStarted);
  const showResultsReviewRef = useRef(showResultsReview);
  const selectedAnswersRef = useRef(selectedAnswers);
  const currentQuizQuestionsRef = useRef(currentQuizQuestions);
  const quizTimerRef = useRef(quizTimer);
  const questionTimesRef = useRef(questionTimes);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    quizStartedRef.current = quizStarted;
  }, [quizStarted]);

  useEffect(() => {
    showResultsReviewRef.current = showResultsReview;
  }, [showResultsReview]);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    currentQuizQuestionsRef.current = currentQuizQuestions;
  }, [currentQuizQuestions]);

  useEffect(() => {
    quizTimerRef.current = quizTimer;
  }, [quizTimer]);

  useEffect(() => {
    questionTimesRef.current = questionTimes;
  }, [questionTimes]);

  // Reset countdown to dynamic seconds each time the question changes
  useEffect(() => {
    if (quizStarted) {
      setQuestionTimer(getMaxQuestionTimer(difficulty));
    }
  }, [currentQuestionIndex, quizStarted, difficulty]);

  const autoSubmitQuiz = async () => {
    setErrorState(null);
    let finalScore = 0;
    const answerLog = currentQuizQuestionsRef.current.map((q, idx) => {
      const selectedIndex = selectedAnswersRef.current[q.id] !== undefined ? selectedAnswersRef.current[q.id] : -1;
      const isCorrect = selectedIndex === q.correctAnswerIndex;
      const timeSpent = questionTimesRef.current[idx] || 0;
      const qScore = getQuestionScore(timeSpent, isCorrect, difficulty);
      finalScore += qScore;
      return {
        questionId: q.id,
        selectedIndex: selectedIndex,
        correct: isCorrect,
        timeSpent,
        score: qScore
      };
    });

    const newResult: QuizResult = {
      id: 'res_' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      userName: user.name,
      department: user.department,
      branch: user.branch,
      score: finalScore,
      totalQuestions: 3,
      date: formatDate(new Date()),
      timestamp: Date.now(),
      answers: answerLog,
      duration: quizTimerRef.current
    };

    try {
      await databaseService.saveQuizResult(newResult);
      setLastQuizResult(newResult);
      setResults(prev => [newResult, ...prev]);
      setAllResults(prev => [newResult, ...prev]);
      setShowResultsReview(true);
      setReviewMode(false);
      setReviewQuestionIndex(0);
    } catch (err) {
      console.error("Lỗi khi nộp bài thi tự động:", err);
    }
  };

  const handleQuestionTimeout = () => {
    const currentIndex = currentQuestionIndexRef.current;
    if (currentIndex < 2) {
      setCurrentQuestionIndex(currentIndex + 1);
      setQuestionTimer(getMaxQuestionTimer(difficulty));
    } else {
      autoSubmitQuiz();
    }
  };

  // Handle Timer
  useEffect(() => {
    if (quizStarted && !showResultsReview) {
      const interval = setInterval(() => {
        setQuizTimer(prev => prev + 1);
        setQuestionTimes(prev => ({
          ...prev,
          [currentQuestionIndexRef.current]: (prev[currentQuestionIndexRef.current] || 0) + 1
        }));
        setQuestionTimer(prev => {
          if (prev <= 1) {
            setTimeout(() => {
              handleQuestionTimeout();
            }, 0);
            return getMaxQuestionTimer(difficulty);
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    }
  }, [quizStarted, showResultsReview, difficulty]);

  // Start the 3T Daily Mock Quiz (3 random questions)
  const startQuiz = () => {
    if (questions.length < 3) {
      alert("Ngân hàng câu hỏi hiện có ít hơn 3 câu, không thể thi thử. Vui lòng nhờ admin Lê Nhật Trường seed thêm dữ liệu.");
      return;
    }
    setErrorState(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizTimer(0);
    setQuestionTimer(getMaxQuestionTimer(difficulty));
    setQuestionTimes({ 0: 0, 1: 0, 2: 0 });
    setBackChanceUsed(false);
    setBackClicksCount(0);
    setQuizInfoMessage(null);
    setShowResultsReview(false);
    
    // Choose 3 random questions
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    setCurrentQuizQuestions(selected);
    setQuizStarted(true);
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const [errorState, setErrorState] = useState<string | null>(null);

  // Submit Quiz Action
  const submitQuiz = async () => {
    setErrorState(null);
    let finalScore = 0;
    const answerLog = currentQuizQuestions.map((q, idx) => {
      const selectedIndex = selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1;
      const isCorrect = selectedIndex === q.correctAnswerIndex;
      const timeSpent = questionTimes[idx] || 0;
      const qScore = getQuestionScore(timeSpent, isCorrect, difficulty);
      finalScore += qScore;
      return {
        questionId: q.id,
        selectedIndex: selectedIndex,
        correct: isCorrect,
        timeSpent,
        score: qScore
      };
    });

    const newResult: QuizResult = {
      id: 'res_' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      userName: user.name,
      department: user.department,
      branch: user.branch,
      score: finalScore,
      totalQuestions: 3,
      date: formatDate(new Date()),
      timestamp: Date.now(),
      answers: answerLog,
      duration: quizTimer
    };

    try {
      await databaseService.saveQuizResult(newResult);
      setLastQuizResult(newResult);
      setResults(prev => [newResult, ...prev]);
      setAllResults(prev => [newResult, ...prev]);
      setShowResultsReview(true);
      setReviewMode(false);
      setReviewQuestionIndex(0);
    } catch (err) {
      console.error("Lỗi khi lưu kết quả bài thi:", err);
    }
  };

  // Expanded explanations in practice mode state
  const [expandedPracticeId, setExpandedPracticeId] = useState<string | null>(null);

  // Statistics calculation
  const totalQuizzes = results.length;
  const averageScore = totalQuizzes > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / totalQuizzes)
    : 0;
  const passingRate = totalQuizzes > 0
    ? Math.round((results.filter(r => r.score === 30).length / totalQuizzes) * 100)
    : 0;

  // Collective stats for department & branch (e.g., P. QLCL)
  const myDeptResults = allResults.filter(r => r.department === user.department);
  const deptTotalQuizzes = myDeptResults.length;
  const deptAverageScore = deptTotalQuizzes > 0
    ? Math.round((myDeptResults.reduce((acc, curr) => acc + curr.score, 0) / deptTotalQuizzes) * 10) / 10
    : 0;
  const deptPassingRate = deptTotalQuizzes > 0
    ? Math.round((myDeptResults.filter(r => r.score === 30).length / deptTotalQuizzes) * 100)
    : 0;

  // 3T values detailed evaluation for the user's department
  // T1: Trọng tâm khách hàng (indices % 3 === 0)
  // T2: Tinh gọn (indices % 3 === 1)
  // T3: Tốc độ quyết liệt (indices % 3 === 2)
  let t1Correct = 0, t1Total = 0;
  let t2Correct = 0, t2Total = 0;
  let t3Correct = 0, t3Total = 0;

  myDeptResults.forEach(res => {
    res.answers.forEach((ans, idx) => {
      if (idx % 3 === 0) {
        t1Total++;
        if (ans.correct) t1Correct++;
      } else if (idx % 3 === 1) {
        t2Total++;
        if (ans.correct) t2Correct++;
      } else {
        t3Total++;
        if (ans.correct) t3Correct++;
      }
    });
  });

  const deptT1Percent = t1Total > 0 ? Math.round((t1Correct / t1Total) * 100) : 88;
  const deptT2Percent = t2Total > 0 ? Math.round((t2Correct / t2Total) * 100) : 84;
  const deptT3Percent = t3Total > 0 ? Math.round((t3Correct / t3Total) * 100) : 80;

  // Ranked list of active department participation
  const departmentsList = [
    'Phòng Quản Lý Chất Lượng (QLCL)',
    'Phòng Sản Xuất',
    'Phòng Nhân Sự',
    'Phòng Kế Toán',
    'Phòng Kinh Doanh',
    'Phòng Kỹ Thuật',
    'Phòng Kho Vận'
  ];
  const deptLeaderboard = departmentsList.map(dept => {
    const deptRes = allResults.filter(r => r.department === dept);
    const count = deptRes.length;
    const avg = count > 0 ? Math.round((deptRes.reduce((sum, r) => sum + r.score, 0) / count) * 10) / 10 : 0;
    const rate = count > 0 ? Math.round((deptRes.filter(r => r.score === 30).length / count) * 100) : 0;
    return { name: dept, count, avg, rate };
  }).sort((a, b) => b.count - a.count || b.avg - a.avg);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-gray-50 flex flex-col">
      {/* Simulation preview banner - Hidden on mobile viewports so mock screen can occupy the top space (tràn lên trên) */}
      {isAdminReview && (user.role === 'admin' || user.role === 'executive') && (
        <div className="hidden sm:flex bg-amber-500 text-white px-6 py-2 flex-col sm:flex-row justify-between items-center text-xs md:text-sm font-bold shadow-md z-50 gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span translate="no" className="notranslate bg-amber-700 px-2 py-0.5 rounded text-[10px] text-white tracking-widest shrink-0 uppercase">Chế độ xem thử</span>
            <span translate="no" className="notranslate">Anh/Chị đang trải nghiệm giao diện CBNV để trực tiếp kiểm duyệt Thi thử, Học từ sai và Phân tích 3T!</span>
          </div>
          {onBackToAdmin && (
            <button 
              onClick={() => onBackToAdmin()}
              className="bg-white text-gray-900 hover:bg-gray-100 transition-all font-bold px-3 py-1 rounded shadow-sm font-sans shrink-0 text-xs cursor-pointer"
            >
              <span translate="no" className="notranslate">Quay lại trang Quản trị</span>
            </button>
          )}
        </div>
      )}

      {/* Main Area containing Structured Smartphone Mockup with Auto-Detection */}
      <main className="flex-1 flex items-center justify-center p-1.5 sm:p-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-0 h-0 overflow-hidden relative w-full">
        
        {/* Smartphone Frame Outer Shell with mathematically concentric corner radius */}
        <div className="w-full sm:max-w-[415px] h-full sm:h-[810px] max-h-full sm:max-h-[810px] bg-[#0F1C2E] rounded-[32px] p-1 shadow-2xl relative border-4 border-slate-800 ring-2 ring-slate-900/5 transition-all text-gray-800 flex flex-col my-0.5 sm:my-1 shrink-0 overflow-hidden">
          
          {/* Physical Phone Top Notch / Speaker Deco element simulating phone layout */}
          <div className="hidden sm:flex absolute -top-0.5 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-slate-800 rounded-b-md z-20 items-center justify-center">
            <div className="w-8 h-0.5 bg-slate-900 rounded-full"></div>
          </div>
          
          {/* Floating Fullscreen Toggle Button at Top-Right Corner */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-3.5 right-3.5 z-40 p-2 bg-white/80 hover:bg-white active:scale-95 text-[#0B3A60] hover:text-[#1971C2] rounded-full flex items-center justify-center shadow-md border border-gray-100/80 transition-all cursor-pointer group"
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5 group-hover:scale-105 transition-transform" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 group-hover:scale-105 transition-transform" />
            )}
          </button>
          
          {/* Screen Inner Viewport (Auto-co giãn, scrollable elegantly like a native application) */}
          <div ref={innerViewportRef} onScroll={handleScroll} className="bg-white w-full h-full rounded-[24px] overflow-hidden flex flex-col shadow-inner relative border border-gray-150 p-3 sm:p-4 overflow-y-auto style-scrollbar flex-1">
            
            {/* Dynamic Inner Panel Viewports */}
            <AnimatePresence mode="wait">
              {/* Quy định Thăng/Hạ Cấp Độ & Điểm Phản Xạ */}
              {showLevelRules && (
                <motion.div
                  key="level_rules_viewport"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-4 font-sans pb-10"
                >
                  {/* Top Header Bar inside Smartphone with Home Button */}
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowLevelRules(false)}
                        className="p-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-[#1971C2] border border-blue-200/50 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95 text-[11px] font-extrabold gap-1"
                        title="Trở về Trang chủ [Home]"
                      >
                        <Home className="h-3.5 w-3.5" />
                        <span>Trang chủ</span>
                      </button>
                    </div>
                    <span translate="no" className="notranslate text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200/50 px-2.5 py-0.5 rounded-full uppercase truncate">
                      Quy chế 3T Mastery
                    </span>
                  </div>

                  {(() => {
                    const currentRules = levelRules || DEFAULT_LEVEL_RULES;
                    
                    const getLevelBgClass = (lvlNum: number) => {
                      if (lvlNum === 1) return "bg-slate-50 border-slate-200";
                      if (lvlNum === 2) return "bg-blue-50/50 border-blue-150";
                      if (lvlNum === 3) return "bg-emerald-50/30 border-emerald-150";
                      if (lvlNum === 4) return "bg-amber-50/40 border-amber-150";
                      return "bg-rose-50/45 border-rose-150";
                    };

                    const getLevelNumBgClass = (lvlNum: number) => {
                      if (lvlNum === 1) return "bg-slate-200/25 text-slate-400/40";
                      if (lvlNum === 2) return "bg-blue-105/25 text-blue-400/30";
                      if (lvlNum === 3) return "bg-emerald-100/25 text-emerald-450/40";
                      if (lvlNum === 4) return "bg-amber-155/25 text-amber-500/30";
                      return "bg-rose-150/25 text-rose-500/30";
                    };

                    return (
                      <>
                        <div className="bg-gradient-to-br from-blue-600 to-[#1971C2] text-white p-3 rounded-xl shadow-sm text-left">
                          <h2 className="text-xs font-black flex items-center gap-1.5 leading-tight animate-pulse">
                            <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
                            QUY CHẾ THĂNG / HẠ CẤP ĐỘ
                          </h2>
                          <p className="text-[10px] mt-1 text-blue-10/95 leading-relaxed font-semibold">
                            {currentRules.introduction}
                          </p>
                        </div>

                        {/* 5 Levels Section with cards layout */}
                        <div className="space-y-2.5">
                          <h3 className="text-[10px] font-extrabold text-[#1971C2] uppercase tracking-widest text-left flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                            <span>Chi tiết 5 Cấp bậc Ôn Luyện</span>
                          </h3>

                          {currentRules.levels.map((lvl) => (
                            <div key={lvl.level} className={`${getLevelBgClass(lvl.level)} border rounded-xl p-3 text-left relative overflow-hidden shadow-3xs`}>
                              <div className={`${getLevelNumBgClass(lvl.level)} absolute -top-1.5 -right-1.5 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black select-none`}>
                                {lvl.level}
                              </div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-sm">{lvl.emoji}</span>
                                <h4 translate="no" className="notranslate text-xs font-black leading-none bg-transparent border-0 p-0 m-0 outline-none inline-block shadow-none text-left font-sans text-gray-900">{lvl.name}</h4>
                              </div>
                              <div className="space-y-1 text-[10.5px] leading-relaxed">
                                <div className="flex items-start gap-1">
                                  <span className="text-emerald-600 font-bold shrink-0">➢ Thăng cấp:</span>
                                  <span className="text-gray-650">{lvl.promotion}</span>
                                </div>
                                <div className="flex items-start gap-1 pt-1 border-t border-dotted border-gray-200 mt-1">
                                  <span className="text-rose-600 font-bold shrink-0">➢ Hạ cấp:</span>
                                  <span className="text-gray-655">{lvl.demotion}</span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Level Maintenance & Inactivity Penalty Policy Card */}
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50/60 border border-orange-200 rounded-xl p-3 text-left relative overflow-hidden shadow-3xs col-span-full">
                            <div className="absolute -top-1.5 -right-1.5 w-10 h-10 bg-orange-200/20 rounded-full flex items-center justify-center text-xs font-black text-orange-400/40 select-none">
                              ⚠️
                            </div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-sm">🔄</span>
                              <h4 translate="no" className="notranslate text-xs font-black text-orange-850 leading-none">{currentRules.inactivityTitle}</h4>
                            </div>
                            <div className="space-y-1.5 text-[10.5px] leading-relaxed">
                              <div className="flex items-start gap-1">
                                <span className="text-orange-700 font-bold shrink-0">➢ Để duy trì cấp độ:</span>
                                <span className="text-gray-700">{currentRules.inactivityRule1}</span>
                              </div>
                              <div className="flex items-start gap-1 pt-1.5 border-t border-orange-200/40 mt-1.5">
                                <span className="text-rose-600 font-bold shrink-0">➢ Nếu không hoạt động:</span>
                                <span className="text-gray-700">{currentRules.inactivityRule2}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Reaction Score Guidelines */}
                        <div className="bg-slate-50 border border-slate-205 rounded-xl p-3.5 text-left shadow-2xs space-y-2.5">
                          <h3 className="text-[10px] font-extrabold text-blue-900 border-b border-blue-100 pb-1.5 flex items-center gap-1.5">
                            <Timer className="h-4 w-4 text-[#1971C2]" />
                            ĐIỂM TRẢ LỜI THEO THỜI GIAN PHẢN XẠ
                          </h3>
                          <p className="text-[10px] sm:text-[10.5px] text-gray-600 leading-relaxed font-semibold">
                            Để khuyến khích phản xạ nhanh nhạy và nắm vững kiến thức, hệ thống chấm điểm nhảy động tự động dựa trên số giây suy nghĩ (chỉ tính khi bạn trả lời <strong className="text-emerald-700 font-bold">ĐÚNG</strong>):
                          </p>

                          <div className="space-y-3.5 pt-1">
                            {currentRules.levels.map((lvl) => (
                              <div key={lvl.level} className="space-y-1">
                                <div className={`flex justify-between items-center ${
                                  lvl.level === 1 ? 'bg-slate-200/50' : 
                                  lvl.level === 2 ? 'bg-blue-100/50' :
                                  lvl.level === 3 ? 'bg-emerald-100/50' :
                                  lvl.level === 4 ? 'bg-amber-100/50' : 'bg-rose-100/50'
                                } px-2 py-0.5 rounded-sm`}>
                                  <span translate="no" className="notranslate text-[10px] font-bold text-gray-700">{lvl.emoji} {lvl.name}</span>
                                  <span translate="no" className="notranslate text-[9px] font-bold text-gray-550">Tối đa: {lvl.maxTime}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 px-1 text-[9.5px] font-semibold text-gray-600">
                                  {(Array.isArray(lvl.reactionPoints) 
                                    ? lvl.reactionPoints 
                                    : [
                                        `≤ ${(lvl.reactionPoints as any).p10 || '0s'} (+10đ)`,
                                        `${(lvl.reactionPoints as any).p8 || '0s'} (+8đ)`,
                                        `${(lvl.reactionPoints as any).p6 || '0s'} (+6đ)`,
                                        `${(lvl.reactionPoints as any).p5 || '0s'} (+5đ)`
                                      ]
                                  ).map((pt, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-0.5">
                                      {pIdx === 0 ? '⚡' : '⏱️'} {pt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Fatal Warning footnote */}
                          <div className="flex items-start gap-1 p-2 bg-rose-50/50 border border-rose-100 rounded-lg mt-2.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-[9px] sm:text-[9.5px] text-rose-750 font-bold leading-normal">
                              Lưu ý: Nếu thành viên trả lời SAI ở bất kỳ cấp độ nào, điểm số nhận về chắc chắn là 0 điểm.
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Foot navigation: Home and Back to top */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setShowLevelRules(false);
                        innerViewportRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                      }}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-[#1971C2] hover:shadow-xs active:scale-98 transition-all text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Home className="h-4 w-4" />
                      <span>QUAY VỀ TRANG CHỦ</span>
                    </button>
                    
                    {showScrollTop && (
                      <button
                        onClick={scrollToTop}
                        className="py-2 px-3 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer border border-gray-200"
                        title="Cuộn lên đầu trang"
                      >
                        <ChevronUp className="h-4 w-4 animate-bounce" />
                        <span>TOP</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Departmental Approval Viewport for Approvers */}
              {showApprovalPanel && !showLevelRules && (user.role === 'approver' || user.canViewStats) && !quizStarted && (
                <motion.div
                  key="department_approvals"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Elegant top-back button bar */}
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowApprovalPanel(false)}
                        className="p-1 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                        title="Quay lại"
                      >
                        <Home className="h-4.5 w-4.5" />
                      </button>
                      <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">PHÊ DUYỆT 3T</span>
                    </div>
                    <span className="text-[9px] font-extrabold text-white bg-purple-600 px-2.5 py-1 rounded-full uppercase truncate max-w-[150px]">
                      {user.department}
                    </span>
                  </div>

                  {/* Intro card */}
                  <div className="bg-purple-50 border border-purple-100 p-3 rounded-xl">
                    <h3 className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 shrink-0" />
                      <span translate="no" className="notranslate">Duyệt Thành Viên & Tiến Độ</span>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-purple-750 mt-1 leading-relaxed">
                      <span translate="no" className="notranslate">
                        {(() => {
                          const deptNorm = (user.department || '').trim().toLowerCase();
                          if (deptNorm === 'ban tổng giám đốc') {
                            return 'Là thành viên Ban Tổng Giám Đốc, Anh/Chị có thẩm quyền phê duyệt nhân sự đăng ký trên toàn bộ hệ thống doanh nghiệp và theo dõi liên thông báo cáo học tập 3T.';
                          } else if (deptNorm === 'ban giám đốc') {
                            return `Là thành viên Ban Giám Đốc, Anh/Chị có quyền phê duyệt tài khoản đăng ký và theo dõi báo cáo toàn diện thuộc chi nhánh ${user.branch}.`;
                          } else {
                            return 'Là Trưởng Bộ Phận, Anh/Chị có quyền phê duyệt nhân sự đăng ký mới và theo dõi sát sao tiến trình học tập của bộ phận mình phụ trách.';
                          }
                        })()}
                      </span>
                    </p>
                  </div>

                  {/* Pending Registrations Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        YÊU CẦU CHỜ DUYỆT ({deptUsers.filter(u => u.status?.toLowerCase() === 'pending').length})
                      </h3>
                    </div>

                    {deptUsers.filter(u => u.status?.toLowerCase() === 'pending').length === 0 ? (
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-center text-xs font-medium text-gray-550">
                        <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1.5" />
                        Không có yêu cầu phê duyệt mới!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5 style-scrollbar">
                        {deptUsers.filter(u => u.status?.toLowerCase() === 'pending').map((pendingUser) => (
                          <div 
                            key={pendingUser.id}
                            className="bg-white border border-purple-100 rounded-xl p-3 shadow-3xs hover:border-purple-200 transition-all flex flex-col justify-between"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-semibold text-gray-900">{pendingUser.name}</h4>
                                <p className="text-[10px] text-gray-500 font-mono">MSNV: {pendingUser.employeeId}</p>
                                <p className="text-[10px] text-gray-500">SĐT: {pendingUser.phone || 'Chưa cung cấp'}</p>
                              </div>
                              <span className="text-[9px] bg-amber-50 border border-amber-205 text-amber-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                Chờ duyệt
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
                              <button
                                onClick={() => handleApproveUser(pendingUser.id)}
                                className="flex-1 py-1 px-2.5 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold text-[10px] rounded-lg shadow-3xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>DUYỆT</span>
                              </button>
                              <button
                                onClick={() => handleRejectUser(pendingUser.id)}
                                className="flex-1 py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] rounded-lg border border-red-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>TỪ CHỐI</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Approved Employees List / Progress Track */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        BẢNG THEO DÕI HỌC TẬP ({deptUsers.filter(u => u.status?.toLowerCase() === 'approved').length})
                      </h3>
                    </div>

                    {/* Compact Search bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Tìm nhân viên bộ phận..."
                        value={approvalSearchTerm}
                        onChange={(e) => setApprovalSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-205 focus:border-[#1971C2] focus:bg-white rounded-lg pl-3 pr-8 py-1.5 text-xs font-sans text-gray-800 outline-hidden transition-all placeholder-gray-400 font-medium"
                      />
                      {approvalSearchTerm && (
                        <button
                          onClick={() => setApprovalSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {deptUsers.filter(u => u.status?.toLowerCase() === 'approved').length === 0 ? (
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-center text-xs font-medium text-gray-550">
                        Chưa có nhân sự nào được duyệt!
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 style-scrollbar">
                        {deptUsers
                          .filter(u => u.status?.toLowerCase() === 'approved')
                          .filter(u => !approvalSearchTerm || u.name.toLowerCase().includes(approvalSearchTerm.toLowerCase()) || u.employeeId.includes(approvalSearchTerm))
                          .map((approvedUser) => {
                            const stats = getEmployeeStats(approvedUser.id);
                            return (
                              <div 
                                key={approvedUser.id}
                                className="bg-slate-50/50 border border-slate-150 hover:bg-slate-50 transition-all rounded-lg p-2.5 flex items-center justify-between gap-2.5"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <h4 className="text-xs font-bold text-gray-800 truncate">{approvedUser.name}</h4>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] font-mono text-gray-450">{approvedUser.employeeId}</span>
                                    <span className="text-[9px] text-gray-450">&bull;</span>
                                    <span className="text-[9px] text-gray-500 font-bold">Lượt ôn: {stats.quizzesTaken}</span>
                                    <span className="text-[9px] text-gray-450">&bull;</span>
                                    <span className="text-[9px] text-gray-500 font-bold">Điểm TB: {stats.average}đ</span>
                                  </div>
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md text-center font-bold tracking-tight shrink-0 ${stats.style}`}>
                                  {stats.evaluation}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Practice Tab Viewport */}
              {activeTab === 'practice' && !quizStarted && !showApprovalPanel && !showLevelRules && (
                <motion.div
                  key="practice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Elegant top-back button bar to transition back safely */}
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="p-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      title="Trang chủ"
                    >
                      <Home className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-gray-450 uppercase tracking-wider">Tài liệu ôn tập</span>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-105 p-3.5 rounded-xl">
                    <h3 className="text-xs font-bold text-yellow-800 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      <span translate="no" className="notranslate">Hướng dẫn Ôn tập</span>
                    </h3>
                    <p className="text-[11px] text-yellow-700 mt-1 leading-relaxed">
                      <span translate="no" className="notranslate">
                        Dưới đây là ngân hàng đề câu hỏi Quiz 3T được ban quản trị TASCO biên soạn. 
                        Nhân viên hãy nghiên cứu kỹ đáp án chính xác kèm theo các lời nhắn dặn dò để rèn luyện vững vàng trước khi bước vào kỳ thi thực tế.
                      </span>
                    </p>
                  </div>

              <div className="grid grid-cols-1 gap-3">
                {questions.map((q, idx) => (
                  <div 
                    key={q.id}
                    className="bg-white border border-gray-150 rounded-md p-4 shadow-sm hover:border-gray-300 transition-all cursor-pointer"
                    onClick={() => setExpandedPracticeId(expandedPracticeId === q.id ? null : q.id)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                          <span translate="no" className="notranslate">Câu số {idx + 1}</span>
                        </span>
                        <h4 className="text-sm font-bold text-gray-800 pt-1">
                          <span translate="no" className="notranslate">{q.text}</span>
                        </h4>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform shrink-0 ${expandedPracticeId === q.id ? 'rotate-90' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {expandedPracticeId === q.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pt-4 mt-3 border-t border-gray-100 space-y-3"
                          onClick={(e) => e.stopPropagation()} // Stop bubbling
                        >
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctAnswerIndex;
                              return (
                                <div 
                                  key={oIdx}
                                  className={`rounded-md p-3 text-xs flex items-center justify-between border ${
                                    isCorrect 
                                    ? 'bg-green-50 border-green-200 text-green-900 font-medium' 
                                    : 'bg-gray-50 border-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span translate="no" className="notranslate">{cleanOptionText(opt)}</span>
                                  {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          <div className="bg-blue-50/50 rounded-md p-3 border border-blue-50 text-xs">
                            <h5 className="font-bold text-blue-800">
                              <span translate="no" className="notranslate">Giải thích và Ghi nhớ:</span>
                            </h5>
                            <p className="text-blue-700 mt-1 leading-relaxed">
                              <span translate="no" className="notranslate">{q.explanation}</span>
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* AI Extract Tab Viewport inside Smartphone Simulation for Administrators */}
          {activeTab === 'ai_extract' && !quizStarted && !showApprovalPanel && !showLevelRules && (
            <motion.div
              key="ai_extract_viewport"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 font-sans"
            >
              {/* Top navigation header inside smartphone */}
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <button
                  onClick={() => {
                    setActiveTab('quiz');
                    setAiNotice(null);
                    setExtractedQuestions([]);
                    setSelectedImages([]);
                  }}
                  className="p-1.5 px-2.5 bg-gray-110 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                  title="Về Trang chủ"
                >
                  <Home className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-xs font-black text-purple-750 uppercase tracking-wider">Trích xuất AI trực tiếp</span>
              </div>

              {/* Informative Header card */}
              <div className="bg-purple-50/70 border border-purple-100 p-3.5 rounded-xl">
                <h3 className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                  <ImagePlus className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>Trích Xuất Đề Bằng AI</span>
                </h3>
                <p className="text-[11px] text-purple-705 mt-1 leading-relaxed">
                  Quét chữ tự động từ ảnh chụp đề thi bằng trí tuệ nhân tạo Gemini. Hệ thống sẽ tự động rà quét kiểm tra và lọc mẫu trùng lặp trước khi lưu.
                </p>
              </div>

              {aiNotice && (
                <div className={`p-3 rounded-lg text-[11px] leading-relaxed font-semibold border ${
                  aiNotice.type === 'success' 
                    ? 'bg-green-50 text-green-905 border-green-200 shadow-3xs' 
                    : 'bg-red-50 text-red-905 border-red-200 shadow-3xs'
                }`}>
                  {aiNotice.msg}
                </div>
              )}

              {/* Camera upload zone */}
              <div className="border border-dashed border-gray-200 hover:border-purple-300 rounded-xl p-4 text-center bg-gray-50/50 hover:bg-gray-55 transition-all relative cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={extracting || aiLoading}
                />
                <div className="flex flex-col items-center justify-center gap-1">
                  <ImagePlus className="h-8 w-8 text-purple-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-655">Kéo thả ảnh hoặc Chụp Đề thi</span>
                  <span className="text-[10px] text-gray-450 italic">Hỗ trợ ảnh tài liệu chụp trực diện</span>
                </div>
              </div>

              {selectedImages.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Hình đã chọn ({selectedImages.length})</div>
                  <div className="flex gap-2 flex-wrap pb-1 max-h-[140px] overflow-y-auto">
                    {selectedImages.map((img, iIdx) => (
                      <div key={iIdx} className="relative h-14 w-14 rounded-lg overflow-hidden bg-white border border-gray-200 shadow-3xs group shrink-0">
                        <img 
                          src={`data:image/jpeg;base64,${img.compressedBase64}`} 
                          alt="preview" 
                          className="object-cover h-full w-full" 
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== iIdx))}
                          className="absolute bg-black/60 hover:bg-black text-white rounded-full p-0.5 top-0.5 right-0.5 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleExtractWithAI}
                    disabled={extracting || selectedImages.length === 0}
                    className="w-full py-2.5 bg-[#1971C2] hover:bg-opacity-95 text-white font-extrabold text-[11px] tracking-wide rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{extracting ? 'Trí tuệ Nhân tạo Gemini đang bóc...' : 'PHÂN TÍCH BÓC TÁCH ĐỀ BẰNG AI'}</span>
                  </button>
                </div>
              )}

              {/* Extracted results visualization in layout list */}
              {extractedQuestions.length > 0 && (
                <div className="space-y-3 border-t border-gray-150 pt-4.5">
                  <div className="flex justify-between items-center gap-2">
                    <div className="text-[10px] font-black uppercase text-[#0B3A60] tracking-wider">Đề AI bóc tách</div>
                    <button
                      onClick={handleSaveExtractedQuestions}
                      disabled={aiLoading}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black text-[10px] rounded-lg transition-all shadow-sm cursor-pointer"
                    >
                      LƯU ĐỀ KHÔNG TRÙNG
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 style-scrollbar">
                    {extractedQuestions.map((eq, qIdx) => (
                      <div 
                        key={eq.id}
                        className={`p-3 rounded-lg border text-xs leading-relaxed ${
                          eq.isDuplicate ? 'bg-orange-50/50 border-orange-200 text-orange-950' : 'bg-gray-50/50 border-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="text-[9px] font-black uppercase bg-white border border-gray-250 px-1.5 py-0.5 rounded text-gray-650 font-sans">Mẫu {qIdx + 1}</span>
                          {eq.isDuplicate && (
                            <span className="text-[8px] font-black text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 uppercase tracking-tighter">
                              <AlertCircle className="h-2.5 w-2.5" /> Trùng ngân hàng đề cũ
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-gray-900 mb-2 font-sans">{eq.text}</p>
                        
                        <div className="space-y-1 mb-2 font-sans">
                          {eq.options.map((opt: string, oIdx: number) => {
                            const isCorrect = oIdx === eq.correctAnswerIndex;
                            return (
                              <div 
                                key={oIdx}
                                className={`p-2 rounded text-[11px] flex items-center justify-between border ${
                                  isCorrect 
                                    ? 'bg-green-50 border-green-200 text-green-955 font-bold' 
                                    : 'bg-white border-gray-150 text-gray-600'
                                }`}
                              >
                                <span>{String.fromCharCode(65 + oIdx)}. {cleanOptionText(opt)}</span>
                                {isCorrect && <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-blue-50/50 p-2 rounded text-[10px] text-blue-800 leading-relaxed font-semibold font-sans">
                          Dặn dò: {eq.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* History Tab Viewport */}
          {activeTab === 'history' && !quizStarted && !showApprovalPanel && !showLevelRules && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Elegant top-back button bar to transition back safely */}
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <button
                  onClick={() => setActiveTab('quiz')}
                  className="p-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                  title="Trang chủ"
                >
                  <Home className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-gray-450 uppercase tracking-wider">Phân tích tiến độ</span>
              </div>

              {/* Analytics Tab Switcher Pills */}
              <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setAnalysisScope('personal')}
                  className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                    analysisScope === 'personal'
                      ? 'bg-white text-gray-950 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Users className="h-4 w-4 text-blue-500" />
                  <span translate="no" className="notranslate">Tiến độ cá nhân</span>
                </button>
                <button
                  onClick={() => setAnalysisScope('collective')}
                  className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                    analysisScope === 'collective'
                      ? 'bg-white text-gray-950 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Building2 className="h-4 w-4 text-[#1971C2]" />
                  <span translate="no" className="notranslate">Bộ phận & Chi nhánh</span>
                </button>
              </div>

              {analysisScope === 'personal' ? (
                // =============== A. TIẾN ĐỘ CÁ NHÂN ===============
                <div className="space-y-6">
                  {/* Analytics summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Kỳ thi đã thử</span>
                      </div>
                      <div className="text-3xl font-extrabold text-gray-950 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{totalQuizzes}</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Điểm số trung bình</span>
                      </div>
                      <div className="text-3xl font-extrabold text-blue-600 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{averageScore} / 30</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Tỉ lệ Đạt tối đa (30 điểm)</span>
                      </div>
                      <div className="text-3xl font-extrabold text-green-600 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{passingRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Graphical progress */}
                  {results.length > 0 && (
                    <div className="bg-white border border-gray-150 p-5 rounded-xl shadow-xs">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span translate="no" className="notranslate">Biểu đồ tiến độ điểm số cá nhân gần nhất</span>
                      </h3>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[...results].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1971C2" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#1971C2" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tickStyle={{ fontSize: '10px' }} />
                            <YAxis domain={[0, 30]} tickCount={4} tickStyle={{ fontSize: '10px' }} />
                            <Tooltip contentStyle={{ fontSize: '12px' }} />
                            <Area type="monotone" dataKey="score" stroke="#1971C2" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* History Table list */}
                  <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
                      <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wider">
                        <span translate="no" className="notranslate">Danh sách kết quả học tập rèn luyện cá nhân</span>
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Ngày thi</span></th>
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Điểm đạt được</span></th>
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Thời gian làm bài</span></th>
                            <th className="py-3 px-5 font-bold text-right"><span translate="no" className="notranslate">Đánh giá</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {results.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-gray-400 text-xs italic">
                                <span translate="no" className="notranslate">Bạn chưa tham gia bất kỳ đợt thi thử nào.</span>
                              </td>
                            </tr>
                          ) : (
                            results.map((res) => (
                              <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3.5 px-5 font-mono text-xs text-gray-600">{res.date}</td>
                                <td className="py-3.5 px-5">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    res.score === 30 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    <span translate="no" className="notranslate">{res.score}/30</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-xs font-mono text-gray-500">
                                  <span translate="no" className="notranslate">{formatTimeInSeconds(res.duration)}</span>
                                </td>
                                <td className="py-3.5 px-5 text-right text-xs">
                                  {res.score === 30 ? (
                                    <span translate="no" className="notranslate text-green-600 font-extrabold uppercase tracking-wide">Xuất sắc (Đạt 100%)</span>
                                  ) : (
                                    <span translate="no" className="notranslate text-amber-600 font-extrabold uppercase tracking-wide">Chưa tối đa</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // =============== B. PHÂN TÍCH TẬP THỂ (BỘ PHẬN & CHI NHÁNH) ===============
                <div className="space-y-6">
                  {/* Department Name Callout */}
                  <div className="bg-blue-50 border border-blue-150 p-5 rounded-xl shadow-xs text-left">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#1971C2]" />
                      <span translate="no" className="notranslate">Không gian thi đua: {user.department}</span>
                    </h3>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      <span translate="no" className="notranslate">Phân tích quá trình học tập rèn luyện 3T của toàn thể nhân sự thuộc phòng <strong>{user.department}</strong> tại <strong>{user.branch}</strong>. Lãnh đạo và tập thể cùng chung tay hoàn thành xuất sắc mục tiêu 100%!</span>
                    </p>
                  </div>

                  {/* Collective summary stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Lập thành tích (Lượt thi bộ phận)</span>
                      </div>
                      <div className="text-3xl font-extrabold text-gray-950 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{deptTotalQuizzes} lượt</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Điểm trung bình bộ phận</span>
                      </div>
                      <div className="text-3xl font-extrabold text-[#1971C2] mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{deptAverageScore} / 30</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Tỷ lệ hoàn thành xuất sắc</span>
                      </div>
                      <div className="text-3xl font-extrabold text-green-600 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{deptPassingRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 3T Core Strength Analysis */}
                  <div className="bg-white border border-gray-150 p-6 rounded-xl shadow-xs space-y-6 text-left">
                    <div className="border-b border-gray-100 pb-3">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
                        <span translate="no" className="notranslate">Mức Độ Hoàn Thành 3 Giá Trị Cốt Lõi (3T)</span>
                      </h4>
                      <p className="text-xs text-gray-450 mt-1"><span translate="no" className="notranslate">Sức mạnh tập thể phản ánh qua tỉ lệ trả lời đúng cấu trúc câu hỏi 3T tại bộ phận của bạn.</span></p>
                    </div>

                    <div className="space-y-5">
                      {/* T1 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-bold">
                          <span translate="no" className="notranslate text-[#1971C2]">T1 - TRỌNG TÂM KHÁCH HÀNG</span>
                          <span translate="no" className="notranslate text-[#1971C2]">{deptT1Percent}%</span>
                        </div>
                        <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
                          <div style={{ width: `${deptT1Percent}%` }} className="bg-[#1971C2] h-full rounded-full transition-all duration-1000" />
                        </div>
                        <p className="text-[11px] text-gray-500 italic"><span translate="no" className="notranslate">Thấu hiểu nhu cầu của khách hàng nội bộ và khách hàng bên ngoài để phục vụ xuất sắc.</span></p>
                      </div>

                      {/* T2 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-bold">
                          <span translate="no" className="notranslate text-emerald-600">T2 - TINH GỌN (KAIZEN)</span>
                          <span translate="no" className="notranslate text-emerald-600">{deptT2Percent}%</span>
                        </div>
                        <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
                          <div style={{ width: `${deptT2Percent}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-1000" />
                        </div>
                        <p className="text-[11px] text-gray-500 italic"><span translate="no" className="notranslate">Làm đúng ngay từ đầu, giảm thiểu lãng phí và không ngừng cải tiến năng suất.</span></p>
                      </div>

                      {/* T3 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-bold">
                          <span translate="no" className="notranslate text-orange-600">T3 - TỐC ĐỘ QUYẾT LIỆT</span>
                          <span translate="no" className="notranslate text-orange-600">{deptT3Percent}%</span>
                        </div>
                        <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
                          <div style={{ width: `${deptT3Percent}%` }} className="bg-orange-500 h-full rounded-full transition-all duration-1000" />
                        </div>
                        <p className="text-[11px] text-gray-500 italic"><span translate="no" className="notranslate">Quyết liệt trong tư duy hành động, nhanh chóng giải quyết triệt để vấn đề.</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Inter-departmental Leaderboard */}
                  <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden text-left">
                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-150">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-500" />
                        <span translate="no" className="notranslate">Bảng Xếp Hạng Thi Đua Học Tập Các Bộ Phận</span>
                      </h4>
                      <p className="text-xs text-gray-450 mt-1"><span translate="no" className="notranslate">Đánh giá thứ hạng dựa trên tổng điểm thi đua tích lũy và số lượt CBNV tham gia.</span></p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                            <th className="py-3 px-5 font-bold text-center w-16"><span translate="no" className="notranslate">Hạng</span></th>
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Bộ phận</span></th>
                            <th className="py-3 px-5 font-bold text-center"><span translate="no" className="notranslate"> CBNV tham gia (Lượt)</span></th>
                            <th className="py-3 px-5 font-bold text-center"><span translate="no" className="notranslate">Điểm trung bình</span></th>
                            <th className="py-3 px-5 font-bold text-center"><span translate="no" className="notranslate">Chọn xuất sắc (30đ)</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {deptLeaderboard.map((item, idx) => {
                            const isMyDept = item.name === user.department;
                            return (
                              <tr key={item.name} className={`hover:bg-gray-50/50 transition-colors ${isMyDept ? 'bg-blue-50/40 text-[#1971C2] font-semibold' : ''}`}>
                                <td className="py-4 px-5 text-center">
                                  {idx === 0 ? (
                                    <span translate="no" className="notranslate inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 font-bold font-mono">1</span>
                                  ) : idx === 1 ? (
                                    <span translate="no" className="notranslate inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-150 text-gray-800 font-bold font-mono">2</span>
                                  ) : idx === 2 ? (
                                    <span translate="no" className="notranslate inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 font-bold font-mono">3</span>
                                  ) : (
                                    <span translate="no" className="notranslate text-gray-500 font-mono">{idx + 1}</span>
                                  )}
                                </td>
                                <td className="py-4 px-5 font-sans leading-tight">
                                  <span translate="no" className="notranslate">{item.name}</span>
                                  {isMyDept && (
                                    <span translate="no" className="notranslate ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">Bộ phận của bạn</span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-center font-mono font-semibold"><span translate="no" className="notranslate">{item.count} lượt</span></td>
                                <td className="py-4 px-5 text-center font-mono text-[#1971C2] font-bold"><span translate="no" className="notranslate">{item.avg} / 30</span></td>
                                <td className="py-4 px-5 text-center font-mono font-semibold text-green-600"><span translate="no" className="notranslate">{item.rate}%</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Core Mock Interactive Quiz Section */}
          {activeTab === 'quiz' && !showApprovalPanel && !showLevelRules && (
            <motion.div
              key="quiz_portal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col h-full"
            >
              {!quizStarted ? (
                adminMobileTab !== 'home' ? (
                  <div className="flex flex-col flex-1 min-h-0 w-full max-w-sm mx-auto px-0 pt-1">
                    {adminMobileTab === 'users' && renderMobileUsersPanel()}
                    {adminMobileTab === 'stats' && renderMobileStatsPanel()}
                    {adminMobileTab === 'encoding' && renderMobileEncodingPanel()}
                    {adminMobileTab === 'qr' && renderMobileQrPanel()}
                    {adminMobileTab === 'firebase_data' && renderMobileFirebaseDataPanel()}
                  </div>
                ) : (
                  // Landing Screen for Practice Exams
                  <div className="flex flex-col items-center justify-between text-center flex-1 h-full pt-1 pb-0.5 sm:pt-1.5 sm:pb-1 relative">
                  {/* Centered Top & Mid content wrapper to keep them tight together */}
                  <div className="flex flex-col items-center justify-center text-center space-y-4.5 sm:space-y-5 flex-1 w-full shrink-0">
                    
                    {/* Admin rapid action buttons */}
                    {isAdminReview && (user.role === 'admin' || user.role === 'executive') && (
                      <div className="w-full max-w-sm mx-auto bg-slate-50/90 border border-slate-200/60 rounded-xl p-2 shadow-xs mb-4 sm:mb-5">
                        <div className="text-[9px] font-extrabold text-[#0B3A60]/85 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <span>CÔNG CỤ QUẢN TRỊ HỆ THỐNG</span>
                          {(user.role === 'admin' || user.role === 'executive') && (
                            <span className="flex items-center gap-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-2xs shrink-0 normal-case">
                              <span className="h-1 w-1 rounded-full bg-white block animate-ping" />
                              <span>{onlineUsersCount} Online</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-row items-center justify-between gap-1 overflow-x-auto no-scrollbar px-1 pt-2.5 pb-1 mb-1">
                          {(user.role === 'admin' || user.role === 'executive') && (
                            <button
                              onClick={() => setAdminMobileTab('users')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                              title="Phê Duyệt & Phân Quyền"
                            >
                              <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100/60 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0 relative">
                                <UserCheck className="h-3.5 w-3.5 text-[#1971C2]" />
                                {pendingUsersCount > 0 && (
                                  <span className="absolute -top-2 -right-1.5 bg-red-650 text-white text-[9.5px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                    {pendingUsersCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Phê Duyệt</span>
                            </button>
                          )}

                          <button
                            onClick={() => setActiveTab('ai_extract')}
                            className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-755 font-sans cursor-pointer group shrink-0"
                            title="Trích xuất Câu Hỏi AI (Hình Ảnh)"
                          >
                            <div className="h-7 w-7 rounded-lg bg-purple-50 border border-purple-100/60 flex items-center justify-center group-hover:bg-purple-100 transition-colors shrink-0 font-sans">
                              <ImagePlus className="h-3.5 w-3.5 text-purple-600" />
                            </div>
                            <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Picture</span>
                          </button>

                          <button
                            onClick={() => setAdminMobileTab('qr')}
                            className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                            title="Mã QR"
                          >
                            <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100/60 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                              <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700">Mã QR</span>
                          </button>

                          <button
                            onClick={() => setAdminMobileTab('stats')}
                            className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                            title="Trang Thống Kê"
                          >
                            <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100/60 flex items-center justify-center group-hover:bg-emerald-100 transition-colors shrink-0 relative">
                              <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                              {attemptsTodayCount > 0 && (
                                <span className="absolute -top-2.5 -left-3 bg-emerald-500 text-white text-[9px] font-black h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none">
                                  {attemptsTodayCount}
                                </span>
                              )}
                              {participantsTodayCount > 0 && (
                                <span className="absolute -top-2.5 -right-2.5 bg-blue-600 text-white text-[9px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                  {participantsTodayCount}
                                </span>
                              )}
                            </div>
                            <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700">Thống Kê</span>
                          </button>

                          {user.role === 'admin' && (
                            <button
                              onClick={() => setAdminMobileTab('encoding')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                              title="Trang Mã Hóa"
                            >
                              <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100/60 flex items-center justify-center group-hover:bg-amber-100 transition-colors shrink-0">
                                <Lock className="h-3.5 w-3.5 text-amber-600" />
                              </div>
                              <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700">Mã Hóa</span>
                            </button>
                          )}

                          {user.role === 'admin' && (
                            <button
                              onClick={() => setAdminMobileTab('firebase_data')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                              title="Dữ Liệu"
                            >
                              <div className="h-7 w-7 rounded-lg bg-cyan-50 border border-cyan-100/60 flex items-center justify-center group-hover:bg-cyan-100 transition-colors shrink-0">
                                <Database className="h-3.5 w-3.5 text-[#0B7285]" />
                              </div>
                              <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700">Dữ Liệu</span>
                            </button>
                          )}
                        </div>
                        {/* Integrated exit button for mobile users where headers are hidden */}
                        {onBackToAdmin && (
                          <button
                            onClick={() => onBackToAdmin?.()}
                            className="w-full mt-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-250 text-red-650 active:scale-95 transition-all rounded-lg text-[9px] font-extrabold tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                          >
                            <LogOut className="h-3 w-3 shrink-0" />
                            <span>QUAY LẠI TRANG QUẢN TRỊ VIÊN</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* 3T Logo replacing Trophy Icon */}
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B3A60] border-2 border-orange-500 shadow-md select-none shrink-0 relative overflow-hidden">
                      <span translate="no" className="notranslate text-3xl font-black tracking-tighter text-orange-500 font-sans select-none">
                        3<span className="text-white">T</span>
                      </span>
                    </div>

                    {/* VĂN HÓA 3T styled logo block */}
                    <div className="space-y-1 w-full text-center shrink-0 animate-fade-in">
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                        <span className="text-[#0B3A60] translate-no notranslate">VĂN HÓA </span>
                        <span className="text-[#E8590C] translate-no notranslate">3T</span>
                      </h1>
                      <h3 className="text-[10px] sm:text-xs font-bold tracking-[0.1em] text-gray-400 font-sans uppercase">
                        <span translate="no" className="notranslate">{slogan}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto mt-1 leading-normal">
                        <span translate="no" className="notranslate">
                          Ứng Dụng Ôn Tập Quiz 3T Hàng Ngày
                        </span>
                      </p>
                    </div>

                    {/* Cấu hình Mức độ Khó tự dộng */}
                    <div 
                      onClick={() => setShowLevelRules(true)}
                      className="w-full max-w-sm mx-auto mb-2 bg-gradient-to-r from-blue-50/70 via-slate-50/50 to-orange-50/40 border border-blue-200/60 hover:border-blue-400 py-1.5 px-2.5 rounded-xl flex items-center justify-between text-left shadow-2xs shrink-0 font-sans cursor-pointer hover:shadow-xs active:scale-[0.995] transition-all relative group"
                      title="Bấm để xem Quy chế Thăng/Hạ Cấp & Điểm Phản Xạ"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-3xs border ${
                          difficulty === 5
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : difficulty === 4
                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                            : difficulty === 3
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : difficulty === 2
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <Sparkles className={`h-4 w-4 ${difficulty >= 4 ? 'animate-bounce text-[#FF6B6B]' : 'text-[#1971C2] animate-pulse'}`} />
                        </div>
                        <div>
                          <div className="text-[8px] font-extrabold text-[#1971C2] uppercase tracking-wider font-sans leading-none mb-0.5">CẤP ĐỘ ÔN LUYỆN TỰ ĐỘNG</div>
                          <div className="text-xs font-black text-gray-800 font-sans leading-tight flex items-center gap-1">
                            <span>
                              {difficulty === 5 ? '🏆 Cấp 5: Huyền Thoại' :
                               difficulty === 4 ? '🔥 Cấp 4: Tối Cao' :
                               difficulty === 3 ? '⚔️ Cấp 3: Thống Lĩnh' :
                               difficulty === 2 ? '🛡️ Cấp 2: Chiến Binh' :
                               '🌱 Cấp 1: Tân Binh'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {difficulty === 1 && (
                          <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200/50 px-2 py-0.5 rounded-full shadow-2xs">
                            {difficultyState.consecutiveMax > 0 ? `🎯 Đạt 30/30: ${difficultyState.consecutiveMax}/5` : '🎯 Thử thách 30/30'}
                          </span>
                        )}
                        {difficulty === 2 && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${
                            difficultyState.consecutiveLow > 0 
                              ? 'text-rose-600 bg-rose-55 border-rose-250 animate-pulse' 
                              : difficultyState.consecutiveMax > 0
                              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                              : 'text-slate-650 bg-slate-100 border-slate-200'
                          }`}>
                            {difficultyState.consecutiveMax > 0 
                              ? `🎯 Đạt 30/30: ${difficultyState.consecutiveMax}/5` 
                              : difficultyState.consecutiveLow > 0
                              ? `⚠️ Điểm < 20: ${difficultyState.consecutiveLow}/2`
                              : 'Bền bỉ Cấp 2'
                            }
                          </span>
                        )}
                        {difficulty === 3 && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${
                            difficultyState.consecutiveLow > 0 
                              ? 'text-rose-700 bg-rose-55 border-rose-250 animate-pulse' 
                              : difficultyState.consecutiveMax > 0
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-indigo-750 bg-indigo-55 border-indigo-200'
                          }`}>
                            {difficultyState.consecutiveMax > 0 
                              ? `🎯 Đạt 30/30: ${difficultyState.consecutiveMax}/5` 
                              : difficultyState.consecutiveLow > 0
                              ? `⚠️ Điểm < 26: ${difficultyState.consecutiveLow}/2`
                              : '👑 Cấp 3 Thống Lĩnh'
                            }
                          </span>
                        )}
                        {difficulty === 4 && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${
                            difficultyState.consecutiveLow > 0 
                              ? 'text-rose-700 bg-rose-55 border-rose-250 animate-pulse' 
                              : difficultyState.consecutiveMax > 0
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-orange-750 bg-orange-55 border-orange-200'
                          }`}>
                            {difficultyState.consecutiveMax > 0 
                              ? `🎯 Đạt 30/30: ${difficultyState.consecutiveMax}/5` 
                              : difficultyState.consecutiveLow > 0
                              ? `⚠️ Điểm < 27: ${difficultyState.consecutiveLow}/2`
                              : '🔥 Cấp 4 Tối Cao'
                            }
                          </span>
                        )}
                        {difficulty === 5 && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${
                            difficultyState.consecutiveLow > 0 
                              ? 'text-rose-755 bg-rose-55 border-rose-250 animate-pulse' 
                              : 'text-rose-600 bg-rose-50 border-rose-200 animate-bounce'
                          }`}>
                            {difficultyState.consecutiveLow > 0
                              ? `⚠️ Điểm < 28: ${difficultyState.consecutiveLow}/2`
                              : '👑 Cấp 5 Huyền Thoại'
                            }
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Condensed responsive grid */}
                    <div className="bg-gray-50 border border-gray-150 p-3 sm:p-3.5 rounded-xl w-full max-w-sm grid grid-cols-2 gap-3 text-left text-xs sm:text-sm shrink-0 shadow-2xs">
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-xs text-gray-455 uppercase tracking-wider font-semibold">Số câu hỏi</div>
                        <div className="font-bold text-gray-800">
                          <span translate="no" className="notranslate">03 câu (Ngẫu nhiên)</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-xs text-gray-455 uppercase tracking-wider font-semibold">Thời gian tính</div>
                        <div className="font-bold text-gray-800">
                          <span translate="no" className="notranslate font-sans">
                            {difficulty === 5 ? '10 giây / câu' : difficulty === 4 ? '20 giây / câu' : difficulty === 3 ? '30 giây / câu' : difficulty === 2 ? '60 giây / câu' : '90 giây / câu'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-xs text-gray-455 uppercase tracking-wider font-semibold">Tổng điểm tối đa</div>
                        <div className="font-bold text-gray-800">
                          <span translate="no" className="notranslate">30 Điểm (10đ / câu)</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] sm:text-xs text-gray-455 uppercase tracking-wider font-semibold">Trạng thái</div>
                        <div className="font-bold text-green-600">
                          <span translate="no" className="notranslate">Đã duyệt học viên</span>
                        </div>
                      </div>
                    </div>

                  {/* High Quality Exam Tips section */}
                  <div className="w-full max-w-sm bg-blue-50/40 border border-blue-100 p-3 rounded-xl text-left text-xs sm:text-sm font-sans text-gray-650 space-y-1 shrink-0 shadow-3xs">
                    <div className="font-bold text-[#1971C2] flex items-center gap-1">
                      <span translate="no" className="notranslate">💡 Mẹo làm bài hiệu quả:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 leading-snug font-medium text-[11px] sm:text-xs">
                      <li>
                        <span translate="no" className="notranslate">Đọc kỹ giải thích chi tiết đáp án để khắc cốt ghi tâm.</span>
                      </li>
                      <li>
                        <span translate="no" className="notranslate">Chủ động rèn luyện, ứng dụng 3T hàng ngày.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Approver Department Action Card */}
                  {(user.role === 'approver' || user.canViewStats) && (
                    <div className="w-full max-w-sm bg-purple-50/70 border border-purple-200/60 p-2.5 sm:p-3 rounded-xl text-left shrink-0 shadow-3xs relative overflow-hidden">
                      <div className="absolute top-0 right-0 h-14 w-14 bg-purple-500/5 rounded-full -mr-4 -mt-4 animate-pulse-slow font-sans" />
                      <div className="flex flex-col">
                        <div className="space-y-1 relative z-10">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-extrabold text-[#0B3A60] leading-none">
                              {user.role === 'approver' ? 'Hoạt Động Quản Lý' : 'Dữ Liệu Thống Kê'}
                            </h4>
                            <span translate="no" className="notranslate bg-purple-250 text-purple-800 text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                              {(() => {
                                const deptNorm = (user.department || '').trim().toLowerCase();
                                if (deptNorm === 'ban tổng giám đốc') return 'Ban Tổng Giám Đốc';
                                if (deptNorm === 'ban giám đốc') return 'Ban Giám Đốc';
                                return 'DUYỆT VIÊN';
                              })()}
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-snug">
                            {user.role === 'approver' ? (
                              <span>Có <strong className="text-purple-700 font-extrabold">{pendingUsersCount}</strong> nhân sự chờ duyệt thuộc cơ cấu của Anh/Chị.</span>
                            ) : (
                              <span>Anh/Chị được phân quyền xem báo cáo thống kê rèn luyện học tập 3T của cơ quan/phòng ban.</span>
                            )}
                          </p>
                        </div>
                        
                        <div className={`grid ${user.canViewStats ? 'grid-cols-2 gap-2' : 'grid-cols-1'} mt-2.5 pt-2.5 border-t border-purple-200/35 relative z-10`}>
                          <button
                            onClick={() => setShowApprovalPanel(true)}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-[10.5px] sm:text-[11px] font-extrabold rounded-lg transition-all cursor-pointer shadow-3xs relative animate-fadeIn"
                          >
                            <UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span>Duyệt Nhân Sự</span>
                            {pendingUsersCount > 0 && (
                              <span className="bg-red-650 text-white text-[8px] font-black h-3.5 px-1 rounded-full border border-white flex items-center justify-center min-w-[14px] animate-pulse">
                                {pendingUsersCount}
                              </span>
                            )}
                          </button>
                          {user.canViewStats && (
                            <button
                              onClick={() => setAdminMobileTab('stats')}
                              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-violet-50 border border-purple-200 text-purple-700 text-[10.5px] sm:text-[11px] font-extrabold rounded-lg transition-all cursor-pointer active:scale-95 shadow-3xs animate-fadeIn"
                            >
                              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-purple-600" />
                              <span>Xem Thống Kê</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Welcome Greeting Box for Employee */}
                  <div className="w-full max-w-sm bg-blue-50/50 border border-blue-100 p-3 rounded-xl text-center shrink-0 shadow-3xs">
                    <p className="text-[10px] sm:text-xs text-[#1971C2] font-semibold uppercase tracking-wider leading-none">Thành Viên Dự Thi</p>
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#0B3A60] mt-1.5 leading-snug">
                      Chào mừng: <span className="text-[#E8590C]">{user.name}</span>
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-450 mt-1">Bộ phận: {user.department}</p>
                  </div>

                  {/* Elegant PWA Quick Installation Action Button */}
                  <div className="w-full flex justify-center shrink-0">
                    <button
                      onClick={handlePwaInstall}
                      className="w-full max-w-sm flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 hover:text-emerald-900 font-extrabold text-[11px] sm:text-xs rounded-xl shadow-3xs hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                      <span>{pwaPrompt ? "CÀI ĐẶT APP 3T VỀ ĐIỆN THOẠI" : "HƯỚNG DẪN CÀI ĐẶT APP 3T"}</span>
                    </button>
                  </div>

                  {/* Big Primary Start Button */}
                  <div className="w-full flex justify-center shrink-0">
                    <button
                      onClick={startQuiz}
                      className="w-full max-w-sm flex items-center justify-center gap-2 py-3 px-4 bg-[#1971C2] hover:bg-opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span translate="no" className="notranslate">Bắt Đầu Làm Bài Đánh Giá</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>
                  </div>

                  {/* Bottom Navigation Row: Ôn Tập (left), Đăng Xuất (middle) and Phân Tích (right) */}
                  <div className="w-full flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 gap-1 shrink-0 mt-auto">
                    <button
                      onClick={() => {
                        setActiveTab('practice');
                        setExpandedPracticeId(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-0.5 sm:px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg sm:rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-[7.5px] min-[320px]:text-[8px] min-[360px]:text-[9px] min-[400px]:text-[10px] sm:text-xs font-extrabold tracking-tight whitespace-nowrap overflow-visible select-none animate-fade-in"
                    >
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 shrink-0 mr-0.5" />
                      <span className="whitespace-nowrap">ÔN TẬP</span>
                      {questions.length > 0 && (
                        <span className="text-[8.5px] font-black leading-none bg-amber-600 text-white rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 shadow-3xs ring-1 ring-white ml-1 shrink-0 animate-pulse">
                          {questions.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={onLogout}
                      className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-0.5 sm:px-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-lg sm:rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-[7.5px] min-[320px]:text-[8px] min-[360px]:text-[9px] min-[400px]:text-[10px] sm:text-xs font-extrabold tracking-tight whitespace-nowrap overflow-hidden select-none font-sans"
                    >
                      <LogOut className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                      <span className="whitespace-nowrap">ĐĂNG XUẤT</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('history');
                        setAnalysisScope('personal');
                      }}
                      className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-0.5 sm:px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-lg sm:rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-[7.5px] min-[320px]:text-[8px] min-[360px]:text-[9px] min-[400px]:text-[10px] sm:text-xs font-extrabold tracking-tight whitespace-nowrap overflow-hidden select-none"
                    >
                      <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600 shrink-0" />
                      <span className="whitespace-nowrap">PHÂN TÍCH</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
                // Active Quiz Form
                <div className="w-full flex-1 flex flex-col h-full max-w-sm mx-auto justify-between">
                  {showResultsReview && lastQuizResult ? (
                    // Quiz Completed - Circular score percentage / Học từ sai Screen!
                    <div className="w-full flex-1 flex flex-col h-full justify-between">
                      {!reviewMode ? (
                        // 1. HIGH-FIDELITY RESULT SCREEN
                        <div className="bg-white border border-gray-150 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col items-center justify-between text-center w-full flex-1 h-full max-w-sm mx-auto">
                          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 font-sans tracking-wide">
                            <span translate="no" className="notranslate">Kết quả</span>
                          </h2>

                          {/* Circular Score percentage ring drawing */}
                          <div className="relative h-52 w-52 sm:h-56 sm:w-56 flex items-center justify-center shrink-0 my-3">
                            <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                               {/* Track */}
                              <circle 
                                cx="50" cy="50" r="44" 
                                stroke="#f1f5f9" strokeWidth="6" fill="transparent" 
                              />
                               {/* Score fill */}
                              <circle 
                                cx="50" cy="50" r="44" 
                                stroke="#1971C2" 
                                strokeWidth="7" fill="transparent" 
                                strokeDasharray={`${2 * Math.PI * 44}`}
                                strokeDashoffset={`${2 * Math.PI * 44 * (1 - lastQuizResult.score / 30)}`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            <div className="text-center z-10 flex flex-col items-center">
                              <span translate="no" className="notranslate text-4xl sm:text-5xl font-extrabold text-gray-950 block font-sans tracking-tight leading-none">
                                {lastQuizResult.score}/30
                              </span>
                              <span translate="no" className="notranslate text-xs sm:text-sm text-gray-400 font-bold block mt-2 tracking-wider uppercase leading-none">
                                Điểm số
                              </span>
                            </div>
                          </div>

                          {/* Badge Đạt yêu cầu / Trạng thái quy đổi điểm */}
                          <div className="flex justify-center -mt-1.5 shrink-0">
                            {(() => {
                              const s = lastQuizResult.score;
                              if (s < 15) {
                                return (
                                  <span className="px-5 py-1 border border-red-400 bg-red-50 text-red-600 text-xs sm:text-sm font-bold rounded-lg inline-flex items-center justify-center shadow-3xs tracking-wide">
                                    <span translate="no" className="notranslate">Chưa đạt yêu cầu</span>
                                  </span>
                                );
                              } else if (s >= 15 && s < 20) {
                                return (
                                  <span className="px-5 py-1 border border-blue-400 bg-blue-50 text-blue-600 text-xs sm:text-sm font-bold rounded-lg inline-flex items-center justify-center shadow-3xs tracking-wide">
                                    <span translate="no" className="notranslate">Đạt 90%</span>
                                  </span>
                                );
                              } else if (s >= 20 && s < 24) {
                                return (
                                  <span className="px-5 py-1 border border-emerald-400 bg-emerald-50 text-emerald-600 text-xs sm:text-sm font-bold rounded-lg inline-flex items-center justify-center shadow-3xs tracking-wide">
                                    <span translate="no" className="notranslate">Đạt 100%</span>
                                  </span>
                                );
                              } else if (s >= 24 && s < 27) {
                                return (
                                  <span className="px-5 py-1 border border-purple-400 bg-purple-50 text-purple-600 text-xs sm:text-sm font-bold rounded-lg inline-flex items-center justify-center shadow-3xs tracking-wide">
                                    <span translate="no" className="notranslate">Đạt 120%</span>
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="px-5 py-1 border border-indigo-400 bg-indigo-50 text-indigo-600 text-xs sm:text-sm font-bold rounded-lg inline-flex items-center justify-center shadow-3xs tracking-wide">
                                    <span translate="no" className="notranslate">Đạt 150%</span>
                                  </span>
                                );
                              }
                            })()}
                          </div>

                          {/* Slogan for speed dependent on user score with correct dynamic wrapping for mobile */}
                          {selectedMotivationalSlogan && (
                            <div className="shrink-0 my-1.5 w-full px-4 text-center">
                              <span translate="no" className="notranslate italic text-red-600 font-bold text-xs sm:text-sm block whitespace-pre-line leading-relaxed max-w-[290px] sm:max-w-md mx-auto text-balance">
                                "{selectedMotivationalSlogan}"
                              </span>
                            </div>
                          )}

                          {/* Stat Grid (4 blocks matching exactly) */}
                          {(() => {
                            const correctCount = lastQuizResult.answers.filter(ans => ans.correct).length;
                            const incorrectCount = 3 - correctCount;
                            return (
                              <div className="grid grid-cols-2 gap-3 w-full shrink-0">
                                {/* Câu đúng */}
                                <div className="bg-white rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-gray-200 shadow-3xs text-left">
                                  <div className="w-9 h-9 rounded-full bg-green-50 border border-green-155 flex items-center justify-center text-green-600 shrink-0">
                                    <CheckCircle2 className="h-4.5 w-4.5 stroke-[2.5]" />
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold text-gray-900 font-mono leading-none">
                                      <span translate="no" className="notranslate">{String(correctCount).padStart(2, '0')}</span>
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-gray-455 font-bold mt-0.5">Câu đúng</div>
                                  </div>
                                </div>

                                {/* Câu sai */}
                                <div className="bg-white rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-gray-200 shadow-3xs text-left">
                                  <div className="w-9 h-9 rounded-full bg-red-50 border border-red-155 flex items-center justify-center text-red-600 shrink-0">
                                    <XCircle className="h-4.5 w-4.5 stroke-[2.5]" />
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold text-gray-900 font-mono leading-none">
                                      <span translate="no" className="notranslate">{String(incorrectCount).padStart(2, '0')}</span>
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-gray-455 font-bold mt-0.5">Câu sai</div>
                                  </div>
                                </div>

                                {/* Bỏ qua */}
                                <div className="bg-white rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-gray-200 shadow-3xs text-left">
                                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-155 flex items-center justify-center text-amber-500 shrink-0">
                                    <div className="font-bold text-base select-none leading-none">-</div>
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold text-gray-900 font-mono leading-none">
                                      <span translate="no" className="notranslate">00</span>
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-gray-455 font-bold mt-0.5">Bỏ qua</div>
                                  </div>
                                </div>

                                {/* Thời gian */}
                                <div className="bg-white rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-gray-200 shadow-3xs text-left">
                                  <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-155 flex items-center justify-center text-blue-500 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-blue-500 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="text-base font-bold text-gray-900 font-mono leading-none">
                                      <span translate="no" className="notranslate">{formatTimeInSeconds(lastQuizResult.duration)}</span>
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-gray-455 font-bold mt-0.5">Thời gian</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Accuracy block */}
                          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-3xs w-full space-y-2.5 text-left shrink-0">
                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-450 uppercase tracking-wider">
                              <span>Độ chính xác</span>
                              <span className="font-bold text-gray-900 font-mono text-xs">{Math.round((lastQuizResult.score / 30) * 100)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                              <div style={{ width: `${(lastQuizResult.score / 30) * 100}%` }} className="bg-[#4ade80] h-full transition-all duration-500" />
                              <div style={{ width: `${((30 - lastQuizResult.score) / 30) * 100}%` }} className="bg-[#f87171] h-full transition-all duration-500" />
                            </div>
                            <div className="flex justify-center items-center gap-4 pt-0.5 text-[10px] text-gray-500 font-bold">
                              <div className="flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4ade80]"></span>
                                <span>Đúng</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f87171]"></span>
                                <span>Sai</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#fbbf24]"></span>
                                <span>Bỏ qua</span>
                              </div>
                            </div>
                          </div>

                          {/* Control action buttons */}
                          <div className="flex gap-1.5 w-full pt-1 shrink-0">
                            <button
                              onClick={() => { setQuizStarted(false); setShowResultsReview(false); setReviewMode(false); }}
                              className="flex-1 py-2 sm:py-2.5 px-0.5 sm:px-2 bg-white border border-[#1971C2] text-[#1971C2] hover:bg-blue-50 font-bold rounded-lg text-[8px] min-[355px]:text-[10px] sm:text-xs shadow-3xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center whitespace-nowrap"
                            >
                              <span>Về trang chủ</span>
                            </button>
                            <button
                              onClick={() => { setReviewMode(true); setReviewQuestionIndex(0); }}
                              className="flex-1 py-2 sm:py-2.5 px-0.5 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold rounded-lg text-[8px] min-[355px]:text-[10px] sm:text-xs shadow-3xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center text-center whitespace-nowrap"
                            >
                              Xem câu trả lời
                            </button>
                            <button
                              onClick={startQuiz}
                              className="flex-[0.9] py-2 sm:py-2.5 px-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[8px] min-[355px]:text-[10px] sm:text-xs shadow-3xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center text-center whitespace-nowrap"
                            >
                              Làm tiếp
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 2. HIGH-FIDELITY REVIEW SCREEN (HỌC TỪ SAI)
                        <div className="bg-white border border-gray-150 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between max-w-sm mx-auto w-full flex-1 h-full">
                          {/* Upper Header Review Title */}
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <button 
                              onClick={() => setReviewMode(false)}
                              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-700 transition cursor-pointer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 font-sans tracking-wide">
                              Câu trả lời
                            </h2>
                            <div className="w-8 h-8"></div> {/* Spacer balance */}
                          </div>

                          {currentQuizQuestions.length > 0 && (
                            <div className="space-y-3.5 flex-1 flex flex-col justify-between mt-3">
                              <div className="text-left space-y-0.5">
                                <span className="text-[10px] font-bold text-gray-400 font-mono block">CÂU HỎI {reviewQuestionIndex + 1}</span>
                                <h3 className="text-sm font-sans font-extrabold text-gray-800 leading-snug">
                                  {currentQuizQuestions[reviewQuestionIndex].text}
                                </h3>
                              </div>

                              {currentQuizQuestions[reviewQuestionIndex].imageUrl && (
                                <div className="rounded-xl overflow-hidden max-h-40 border border-gray-100 flex justify-center bg-gray-50 shadow-3xs">
                                  <img 
                                    src={currentQuizQuestions[reviewQuestionIndex].imageUrl} 
                                    alt="Sơ đồ minh hoạ" 
                                    className="object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                              {/* Interactive Answer Options List (High Fidelity Option Highlight) */}
                              <div className="grid grid-cols-1 gap-2 pt-1">
                                {currentQuizQuestions[reviewQuestionIndex].options.map((opt, oIdx) => {
                                  const question = currentQuizQuestions[reviewQuestionIndex];
                                  const selectedIdx = selectedAnswers[question.id];
                                  const isCorrectOpt = oIdx === question.correctAnswerIndex;
                                  const isSelected = selectedIdx === oIdx;

                                  let containerStyle = "border-gray-200 bg-white hover:bg-gray-50/50";
                                  let textStyle = "text-gray-750 font-semibold";
                                  let radioShapeStyle = "border-gray-350 text-gray-400";
                                  let radioActiveDot = false;

                                  if (isCorrectOpt) {
                                    containerStyle = "border-[#4ade80] bg-[#f0fdf4] text-green-900 shadow-3xs ring-1 ring-[#48bb78]";
                                    textStyle = "text-green-800 font-extrabold";
                                    radioShapeStyle = "border-green-600 text-green-600 bg-green-50";
                                    radioActiveDot = true;
                                  } else if (isSelected) {
                                    containerStyle = "border-red-350 bg-red-50/50 text-red-900 ring-1 ring-red-400";
                                    textStyle = "text-red-800 font-extrabold";
                                    radioShapeStyle = "border-red-650 text-red-650 bg-red-50";
                                    radioActiveDot = true;
                                  }

                                  return (
                                    <div 
                                      key={oIdx} 
                                      className={`w-full p-3 text-xs rounded-xl border flex items-center gap-2.5 transition-all ${containerStyle}`}
                                    >
                                      {/* Radio dot element */}
                                      <div className={`h-4.5 w-4.5 rounded-full shrink-0 flex items-center justify-center border ${radioShapeStyle}`}>
                                        {radioActiveDot && (
                                          <div className={`h-2.5 w-2.5 rounded-full ${isCorrectOpt ? 'bg-green-600' : 'bg-red-650'}`} />
                                        )}
                                      </div>
                                      <div className={`flex-1 text-xs font-semibold ${textStyle}`}>
                                        {cleanOptionText(opt)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Custom failure warning banner / explanation */}
                              <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-xl text-xs text-orange-950 mt-3 leading-relaxed">
                                <h5 className="font-bold text-orange-850 flex items-center gap-1 mb-0.5">
                                  <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                                  <span>Dặn dò & Giải thích:</span>
                                </h5>
                                <p className="font-semibold italic text-[11px] sm:text-xs text-orange-900">
                                  {(() => {
                                    let exp = (currentQuizQuestions[reviewQuestionIndex].explanation || "").trim();
                                    // Remove existing quotes at the start/end if any
                                    exp = exp.replace(/^["'“]+|["'”]+$/g, "").trim();
                                    
                                    // Pattern to match variations of "Anh/Chị nhớ nhé" or "Anh chị nhớ nhé" at the start, with optional colons/spaces
                                    const pattern = /^(anh[\/\s]chị\s+nhớ\s+nhé\s*:?\s*)/i;
                                    
                                    if (pattern.test(exp)) {
                                      // Strip the existing prefix
                                      exp = exp.replace(pattern, "").trim();
                                    }
                                    
                                    return `"Anh/Chị nhớ nhé: ${exp}"`;
                                  })()}
                                </p>
                              </div>

                              {/* Footer Action controls */}
                              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <button
                                  disabled={reviewQuestionIndex === 0}
                                  onClick={() => setReviewQuestionIndex(prev => prev - 1)}
                                  className="px-5 py-2.5 bg-white border border-[#1971C2] text-[#1971C2] rounded-lg text-xs md:text-sm font-bold disabled:opacity-40 transition-colors"
                                >
                                  Câu trước
                                </button>

                                {reviewQuestionIndex < 2 ? (
                                  <button
                                    onClick={() => setReviewQuestionIndex(prev => prev + 1)}
                                    className="px-5 py-2.5 bg-[#1971C2] hover:bg-opacity-95 text-white rounded-lg text-xs md:text-sm font-bold transition-colors shadow-xs"
                                  >
                                    Câu tiếp theo
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setReviewMode(false)}
                                    className="px-5 py-2.5 bg-[#1971C2] hover:bg-opacity-95 text-white rounded-lg text-xs md:text-sm font-bold transition-colors shadow-xs"
                                  >
                                    Kết thúc
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Quiz in Progress - Active Screen with Company App Bar layout
                    <div className="flex flex-col justify-between flex-1 h-full space-y-2.5">
                      {/* Company App style Header bar with Back button < */}
                      <div className="bg-white border border-gray-150 rounded-xl py-2 px-3 flex items-center justify-between shadow-xs shrink-0 z-10 select-none">
                        <button
                          type="button"
                          onClick={() => {
                            const newClicks = backClicksCount + 1;
                            setBackClicksCount(newClicks);

                            // Pressed 2 or more times -> goes straight back to landing dashboard
                            if (newClicks >= 2) {
                              setQuizStarted(false);
                              setShowResultsReview(false);
                              setReviewMode(false);
                              setBackClicksCount(0);
                              setErrorState(null);
                              setQuizInfoMessage(null);
                              return;
                            }

                            if (currentQuestionIndex === 0) {
                              setQuizInfoMessage(null);
                              setErrorState("Anh/Chị đang ở câu hỏi 1. Ấn BACK lần 2 sẽ quay về trang chủ. Hoặc hãy sang câu 2, câu 3 mới có thể làm lại câu 1.");
                              return;
                            }
                            if (backChanceUsed) {
                              setQuizInfoMessage(null);
                              setErrorState("Anh/Chị đã sử dụng cơ hội quay lại làm lại duy nhất trong đợt thi này! Ấn BACK lần 2 sẽ quay về trang chủ.");
                              return;
                            }
                            
                            // Successful activation of one-time back retry!
                            if (questions.length >= 3) {
                              const shuffled = [...questions].sort(() => 0.5 - Math.random());
                              const selected = shuffled.slice(0, 3);
                              setCurrentQuizQuestions(selected);
                            }
                            setSelectedAnswers({}); // Xóa sạch các câu đã chọn để làm lại mới hoàn toàn
                            setQuestionTimer(getMaxQuestionTimer(difficulty)); // Reset countdown timer for the new set
                            setQuestionTimes({ 0: 0, 1: 0, 2: 0 }); // Reset question times
                            setQuizTimer(0); // Reset main quiz timer
                            setCurrentQuestionIndex(0); // Quay lại làm lại từ đầu từ câu 1
                            setBackChanceUsed(true);
                            setErrorState(null);
                            setQuizInfoMessage("Chúc mừng! Anh/Chị đã kích hoạt Quyền Làm Lại duy nhất. Hệ thống đã đổi bộ câu hỏi ngẫu nhiên mới và đưa Anh/Chị về lại câu số 1! (Ấn BACK một lần nữa sẽ quay về trang chủ)");
                          }}
                          className="p-1 px-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors flex items-center justify-center border border-gray-200 shadow-2xs focus:outline-none"
                          title="Quay lại làm lại hoặc quay về trang chủ"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-[3] text-[#0B3A60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className="text-center flex-1">
                          <h2 className="text-xs sm:text-sm font-extrabold text-gray-905 font-sans tracking-tight">
                            <span translate="no" className="notranslate">Bài đánh giá</span>
                          </h2>
                          <p className="text-[9px] text-[#E8590C] font-extrabold uppercase tracking-wide">
                            <span translate="no" className="notranslate">{slogan}</span>
                          </p>
                        </div>
                        
                        {/* Right Pill for Back Opportunity */}
                        <div className="flex items-center shrink-0">
                          {!backChanceUsed ? (
                            <span className="bg-green-100 text-green-800 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-3xs">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              <span translate="no" className="notranslate">Sẵn sàng BACK (1)</span>
                            </span>
                          ) : (
                            <span className="bg-gray-105 text-gray-400 border border-gray-150 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                              <span translate="no" className="notranslate">Hết quyền BACK</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main quiz interface - restored to luxury card layout with elegant spacing */}
                      <div className="bg-white border border-gray-150 rounded-2xl p-4 sm:p-5 shadow-xs flex-1 flex flex-col justify-between space-y-4">
                        
                        {/* Progress display and countdown timer on same row */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-gray-500">
                            <div>
                               <span translate="no" className="notranslate">{currentQuestionIndex + 1}/3 câu hỏi</span>
                            </div>
                            <div className={`px-2.5 py-1 rounded-md font-mono font-bold flex items-center gap-1.5 text-xs sm:text-sm shadow-3xs border transition-all duration-300 ${
                              questionTimer <= 15 
                                ? "bg-red-50 border-red-200 text-red-650 animate-pulse font-extrabold" 
                                : "bg-green-50 border-green-150 text-green-700"
                            }`}>
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-4 w-4 ${questionTimer <= 15 ? "text-red-500 animate-pulse" : "text-green-600"}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span translate="no" className="notranslate">{formatCountdown(questionTimer)}</span>
                            </div>
                          </div>
                          
                          {/* Continuous progress line exactly like company app bar */}
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#1971C2] h-full transition-all duration-300 rounded-full" 
                              style={{ width: `${((currentQuestionIndex + 1) / 3) * 100}%` }} 
                            />
                          </div>
                        </div>

                        {/* Standard elegant notice for BACK advice - addressing screenshot red arrow comment! */}
                        <div className="bg-blue-50/50 border border-blue-100 py-1.5 px-3 rounded-xl text-left shrink-0 shadow-3xs">
                          <p className="text-[10px] sm:text-[11px] text-blue-800 leading-relaxed font-sans">
                            💡 <b>Mẹo sửa sai:</b> Nếu câu 1, câu 2 lỡ chọn nhầm, làm sai, ấn nút <b>(&lt;)</b> ở góc trên cùng để đổi đề và làm lại từ đầu (duy nhất 1 lần).
                          </p>
                        </div>

                        {/* Notice messages / Success or Warning */}
                        {quizInfoMessage && (
                          <div className="flex items-center gap-2 rounded-xl bg-green-50/80 p-3 text-xs sm:text-sm text-green-800 border border-green-150 font-sans text-left shrink-0 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></span>
                            <span translate="no" className="notranslate font-semibold">{quizInfoMessage}</span>
                          </div>
                        )}

                        {errorState && (
                          <div className="flex items-start gap-2 rounded-xl bg-red-50/80 p-3 text-xs sm:text-sm text-red-700 border border-red-155 font-sans text-left shrink-0">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                            <span translate="no" className="notranslate">{errorState}</span>
                          </div>
                        )}

                        {/* Question display */}
                        {currentQuizQuestions.length > 0 && (
                          <div className="flex-1 flex flex-col justify-center space-y-3.5 text-left font-sans">
                            <div className="flex justify-between items-center shrink-0">
                              <div className="text-[10px] sm:text-xs font-extrabold text-gray-400 tracking-wider uppercase">
                                <span translate="no" className="notranslate">CÂU HỎI {currentQuestionIndex + 1}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Thời gian:</span>
                                <span 
                                  translate="no" 
                                  className={`notranslate font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                                    (questionTimes[currentQuestionIndex] || 0) <= 30
                                      ? "text-emerald-600 bg-emerald-50 border border-emerald-150"
                                      : (questionTimes[currentQuestionIndex] || 0) <= 50
                                        ? "text-amber-600 bg-amber-50 border border-amber-150"
                                        : "text-red-600 bg-red-50 border border-red-150 animate-pulse font-extrabold"
                                  }`}
                                >
                                  {questionTimes[currentQuestionIndex] || 0} giây
                                </span>
                              </div>
                            </div>
                            <h3 className="text-sm sm:text-base font-sans font-extrabold text-gray-950 leading-snug shrink-0">
                              <span translate="no" className="notranslate">{currentQuizQuestions[currentQuestionIndex].text}</span>
                            </h3>

                            {/* Image illustration if present */}
                            {currentQuizQuestions[currentQuestionIndex].imageUrl && (
                              <div className="rounded-xl overflow-hidden max-h-[160px] sm:max-h-[200px] border border-gray-150 flex justify-center bg-gray-50 my-1 shrink-0 shadow-3xs">
                                <img 
                                  src={currentQuizQuestions[currentQuestionIndex].imageUrl} 
                                  alt="Sơ đồ câu hỏi" 
                                  className="object-contain h-full"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {/* Options list styling matching Company visual system */}
                            <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                              {currentQuizQuestions[currentQuestionIndex].options.map((opt, oIdx) => {
                                const qId = currentQuizQuestions[currentQuestionIndex].id;
                                const isSelected = selectedAnswers[qId] === oIdx;
                                
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => {
                                      handleSelectOption(qId, oIdx);
                                      // Clear temporary success messages when selecting
                                      setQuizInfoMessage(null);
                                    }}
                                    className={`w-full text-left p-3.5 sm:p-4 text-xs sm:text-sm rounded-xl border transition-all flex items-center gap-3 active:scale-[0.99] group shadow-2xs ${
                                      isSelected 
                                      ? 'bg-blue-50 border-[#1971C2] text-[#1971C2] font-bold ring-1 ring-[#1971C2]' 
                                      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    <div className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center border font-sans text-xs font-bold transition-all ${
                                      isSelected 
                                      ? 'bg-[#1971C2] text-white border-[#1971C2]' 
                                      : 'border-gray-250 text-gray-450'
                                    }`}>
                                      {String.fromCharCode(65 + oIdx)}
                                    </div>
                                    <div className="flex-1 text-xs sm:text-sm font-semibold">
                                      <span translate="no" className="notranslate">{cleanOptionText(opt)}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Slide/Submit buttons styled explicitly matching the custom design */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 gap-3 font-sans shrink-0">
                          <button
                            disabled={currentQuestionIndex === 0}
                            onClick={() => {
                              setCurrentQuestionIndex(prev => prev - 1);
                              setQuizInfoMessage(null);
                            }}
                            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <span translate="no" className="notranslate">Câu Trước</span>
                          </button>

                          {currentQuestionIndex < 2 ? (
                            <button
                              onClick={() => {
                                setCurrentQuestionIndex(prev => prev + 1);
                                setQuizInfoMessage(null);
                              }}
                              className="px-5 py-2 bg-[#0B3A60] hover:bg-[#0B3A60]/90 border border-transparent text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                            >
                              <span translate="no" className="notranslate">Tiếp Theo</span>
                            </button>
                          ) : (
                            <button
                              onClick={submitQuiz}
                              className="px-5 py-2 bg-green-600 hover:bg-green-700 border border-transparent text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                              <span translate="no" className="notranslate">Nộp Bài Thi</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Beautiful Interactive PWA Custom Installation Guide Modal */}
        <AnimatePresence>
          {showPwaModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              {/* Opacity Fade Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPwaModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              />

              {/* Slide Zoom Dialog box */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative bg-white w-full max-w-sm rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col z-10 max-h-[90vh]"
              >
                {/* Header */}
                <div className="bg-[#0B3A60] text-white px-5 py-4 flex items-center justify-between relative shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
                    <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">Cài đặt Ứng dụng Quiz 3T</h3>
                  </div>
                  <button
                    onClick={() => setShowPwaModal(false)}
                    className="p-1 px-1.5 hover:bg-white/10 active:scale-95 transition-all text-white/90 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-4 overflow-y-auto space-y-4 font-sans text-xs sm:text-sm text-gray-700 style-scrollbar">
                  <p className="text-gray-500 font-medium leading-relaxed text-center px-1">
                    Hệ thống chạy trên chuẩn <strong className="text-[#0B3A60]">PWA (Progressive Web App)</strong> siêu nhẹ, không cần tải qua App Store / CH Play mà vẫn cài được icon trực tiếp ra màn hình chính!
                  </p>

                  {/* Device Tab Switches */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
                    <button
                      onClick={() => setPwaTab('android')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 sm:py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                        pwaTab === 'android'
                          ? 'bg-[#0B3A60] text-white shadow-xs'
                          : 'text-gray-600 hover:bg-slate-200/50'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5 shrink-0" />
                      <span>ĐIỆN THOẠI ANDROID</span>
                    </button>
                    <button
                      onClick={() => setPwaTab('ios')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 sm:py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                        pwaTab === 'ios'
                          ? 'bg-[#0B3A60] text-white shadow-xs'
                          : 'text-gray-600 hover:bg-slate-200/50'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5 shrink-0" />
                      <span>ĐIỆN THOẠI IPHONE</span>
                    </button>
                  </div>

                  {/* Step Guides based on Selected Tab */}
                  {pwaTab === 'android' ? (
                    <div className="space-y-3.5 pt-1">
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div>
                          <p className="font-bold text-gray-900">Bắt buộc dùng trình duyệt Google Chrome</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Sao chép đường link ứng dụng và dán vào Google Chrome để mở.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div>
                          <p className="font-bold text-gray-900">Mở menu chức năng</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Chạm vào biểu tượng dấu <strong className="text-gray-800">3 dấu chấm dọc (⋮)</strong> ở góc trên bên phải màn hình Chrome.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <div>
                          <p className="font-bold text-gray-900">Chọn Thêm vào màn hình chính</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug text-emerald-700 font-semibold">
                            Tìm và click vào nút <strong className="underline">"Cài đặt ứng dụng"</strong> hoặc <strong className="underline">"Thêm vào Màn hình chính"</strong>. Điện thoại sẽ cài đặt một icon ứng dụng 3T độc lập cực xịn!
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5 pt-1">
                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div>
                          <p className="font-bold text-gray-900">Bắt buộc dùng Safari trên iPhone</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Mở đường link ứng dụng bằng trình duyệt gốc <strong className="text-gray-850">Safari</strong> của Apple.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div>
                          <p className="font-bold text-gray-900">Bấm nút "Chia sẻ" (Share)</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug flex items-center gap-1">
                            Click vào biểu tượng nút Chia sẻ <Share className="h-3.5 w-3.5 text-indigo-600 inline shrink-0" /> (hình vuông có mũi tên trỏ lên) ở thanh công cụ dưới cùng.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <div>
                          <p className="font-bold text-gray-900">Chọn "Thêm vào MH chính"</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug text-indigo-700 font-semibold flex items-center gap-1">
                            Cuộn xuống dưới rồi ấn nút <strong className="underline">"Thêm vào MH chính"</strong> (hoặc <strong className="underline">"Add to Home Screen"</strong> <Plus className="h-3 w-3 inline shrink-0" />), sau đó nhấn <strong className="underline">"Thêm"</strong> ở góc trên bên phải để lưu.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visual Indicator of Output */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[11px] text-slate-500 leading-snug font-medium text-center">
                    Sau khi thực hiện, màn hình điện thoại của bạn sẽ xuất hiện một Icon ứng dụng tên <strong className="text-[#0B3A60]">"Quiz 3T"</strong> độc lập, mượt mà giống hệt ứng dụng cài từ App Store!
                  </div>
                </div>

                {/* Footer close button */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                  <button
                    onClick={() => setShowPwaModal(false)}
                    className="w-full py-2 bg-[#0B3A60] hover:bg-[#0B3A60]/95 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Đã hiểu, tôi tự làm được!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
          </div>

          {/* Floating Action Buttons for Ôn Tập Tab (Scroll To Top & Back to Home) */}
          {activeTab === 'practice' && !quizStarted && (
            <div className="absolute bottom-18 right-5 z-45 flex flex-col gap-2.5">
              {/* Scroll to Top Button */}
              <AnimatePresence>
                {showScrollTop && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    className="w-11 h-11 bg-[#0B3A60] hover:bg-[#1971C2] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 transition-all cursor-pointer group shrink-0"
                    title="Cuộn lên đầu trang"
                  >
                    <ArrowUp className="h-5.5 w-5.5 group-hover:-translate-y-0.5 transition-transform" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Home Icon Button (Quay về Trang chủ) */}
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setActiveTab('quiz');
                  scrollToTop();
                }}
                className="w-11 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/10 transition-all cursor-pointer group shrink-0 animate-pulse-slow"
                title="Quay về Trang chủ"
              >
                <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </motion.button>
            </div>
          )}

          {/* Floating Action Buttons for Phân Tích Tab (Scroll To Top & Back to Home) */}
          {activeTab === 'history' && !quizStarted && (
            <div className="absolute bottom-18 right-5 z-45 flex flex-col gap-2.5">
              {/* Scroll to Top Button */}
              <AnimatePresence>
                {showScrollTop && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    className="w-11 h-11 bg-[#0B3A60] hover:bg-[#1971C2] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 transition-all cursor-pointer group shrink-0"
                    title="Cuộn lên đầu trang"
                  >
                    <ArrowUp className="h-5.5 w-5.5 group-hover:-translate-y-0.5 transition-transform" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Home Icon Button (Quay về Trang chủ) */}
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setActiveTab('quiz');
                  scrollToTop();
                }}
                className="w-11 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/10 transition-all cursor-pointer group shrink-0 animate-pulse-slow"
                title="Quay về Trang chủ"
              >
                <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </motion.button>
            </div>
          )}

          {/* Floating Action Buttons for Admin Mobile Tabs (Phê Duyệt, Thống Kê, Mã Hóa) */}
          {activeTab === 'quiz' && adminMobileTab !== 'home' && !quizStarted && (
            <div className="absolute bottom-18 right-5 z-45 flex flex-col gap-2.5">
              {/* Scroll to Top Button */}
              <AnimatePresence>
                {showScrollTop && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    className="w-11 h-11 bg-[#0B3A60] hover:bg-[#1971C2] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 transition-all cursor-pointer group shrink-0"
                    title="Cuộn lên đầu trang"
                  >
                    <ArrowUp className="h-5.5 w-5.5 group-hover:-translate-y-0.5 transition-transform" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Home Icon Button (Quay về Sảnh chính dạng Admin) */}
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setAdminMobileTab('home');
                  scrollToTop();
                }}
                className="w-11 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/10 transition-all cursor-pointer group shrink-0"
                title="Quay về Sảnh chính"
              >
                <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </motion.button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
