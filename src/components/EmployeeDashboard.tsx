import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { databaseService, getQuotaStats } from '../firebase';
import { User, Question, QuizResult, CompanyMapping, MotivationalSloganBand, LevelRulesConfig, LevelRuleItem } from '../types';
import { formatDate, formatTimeInSeconds, cleanOptionText } from '../utils/format';
import { BookOpen, Trophy, Award, BarChart3, ChevronRight, CheckCircle2, XCircle, ArrowRight, RotateCcw, HelpCircle, GraduationCap, AlertCircle, Users, TrendingUp, Building2, LogOut, Home, Maximize2, Minimize2, UserCheck, ImagePlus, Lock, Sparkles, X, Plus, Smartphone, Share, ArrowUp, ArrowLeft, Pencil, Trash2, Building, Landmark, Briefcase, Search, Database, RefreshCcw, QrCode, Server, ShieldCheck, Zap, FileDown, ChevronUp, ChevronDown, Timer, AlertTriangle, Bell, User as UserIcon, MessageSquare, ClipboardList, Loader2 } from 'lucide-react';

const TwelveDotSpinner = ({ size = 42, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg className="animate-spin shrink-0" width={size} height={size} viewBox="0 0 100 100" style={{ color }}>
    {[...Array(12)].map((_, i) => {
      const angle = (i * 360) / 12;
      const opacity = (i + 1) / 12;
      return (
        <circle
          key={i}
          cx="50"
          cy="16"
          r="5.5"
          fill="currentColor"
          opacity={opacity}
          transform={`rotate(${angle} 50 50)`}
        />
      );
    })}
  </svg>
);
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import StatsDashboard from './StatsDashboard';
import PersonalStats from './PersonalStats';
import ConversationExchange from './ConversationExchange';
import { calculateInactivityAugmentedLevel, getVietnamDateString, normalizeDateString } from '../utils/levelCalculator';

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
  const [onlineTick, setOnlineTick] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [deptUsers, setDeptUsers] = useState<User[]>([]);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [approvalSearchTerm, setApprovalSearchTerm] = useState('');

  useEffect(() => {
    // Tick timer running every 20 seconds to make sure online user status is recalculated as Date.now() ticks forward
    const tickerInterval = setInterval(() => {
      setOnlineTick(t => t + 1);
    }, 20000);
    return () => clearInterval(tickerInterval);
  }, []);

  useEffect(() => {
    if ((isAdminReview && (user.role === 'admin' || user.role === 'executive')) || user.role === 'approver' || user.canViewStats) {
      const unsubscribe = databaseService.subscribeUsers((allUsers) => {
        if (!allUsers) return;
        if (user.role === 'admin') {
          setDeptUsers(allUsers);
          const pending = allUsers.filter(u => u.status?.toLowerCase() === 'pending');
          setPendingUsersCount(pending.length);
        } else {
          // Approver or authorized stats viewer: Check department to decide scope
          const deptNorm = (user.department || '').trim().toLowerCase();
          let filtered: User[] = [];
          if (deptNorm === 'ban tổng giám đốc' || user.role === 'executive') {
             // BTGĐ / Executive: Company-wide
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [inactivityTestMode, setInactivityTestMode] = useState(() => localStorage.getItem('3t_inactivity_test_mode') === 'true');
  
  // Admin mobile action states
  const [adminMobileTab, setAdminMobileTab] = useState<'home' | 'users' | 'stats' | 'encoding' | 'qr' | 'firebase_data' | 'personal' | 'notifications' | 'legends' | 'records' | 'patience_top' | 'exchange' | 'details' | 'online'>('home');
  const [adminMobileNotice, setAdminMobileNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [adminDetailSearch, setAdminDetailSearch] = useState('');
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);
  const [adminExpandedResultId, setAdminExpandedResultId] = useState<string | null>(null);
  
  // Real-time system announcement and accomplishments states
  const [systemAnnouncement, setSystemAnnouncement] = useState(() => localStorage.getItem('3t_system_announcement') ?? 'Chào mừng toàn thể cán bộ nhân viên đến với Hội Thi Văn Hóa 3T! Tốc độ là sống còn - Tinh gọn là sức mạnh!');
  const [systemAnnouncementSpeed, setSystemAnnouncementSpeed] = useState(() => Number(localStorage.getItem('3t_system_announcement_speed') || '35'));
  const [systemAnnouncementGap, setSystemAnnouncementGap] = useState(() => Number(localStorage.getItem('3t_system_announcement_gap') || '32'));
  const [allAnnouncements, setAllAnnouncements] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadExchangeCount, setUnreadExchangeCount] = useState(0);
  const [lastReadAnnouncementTimestamp, setLastReadAnnouncementTimestamp] = useState<number>(() => Number(localStorage.getItem('3t_last_read_ann_ts') || '0'));
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [announcementEditText, setAnnouncementEditText] = useState('');
  const [announcementEditSpeed, setAnnouncementEditSpeed] = useState(35);
  const [announcementEditGap, setAnnouncementEditGap] = useState(32);
  const [newBroadcastText, setNewBroadcastText] = useState('');
  const [mobileEditingAnnId, setMobileEditingAnnId] = useState<string | null>(null);
  const [mobileEditingAnnText, setMobileEditingAnnText] = useState<string>('');
  const [mobileDeletingAnnId, setMobileDeletingAnnId] = useState<string | null>(null);

  // Global action processing state matching the dark blue rounded card loading indicator (12-dot spinner)
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);

  // Central rotating ticker for mobile button badges
  const [badgeTicker, setBadgeTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setBadgeTicker(prev => prev + 1);
    }, 4500); // cycle every 4.5 seconds for a smooth transition
    return () => clearInterval(timer);
  }, []);

  // Subscribe to real-time system announcement and accomplishments/notifications
  useEffect(() => {
    // 1. Subscribe to system wide broadcast marquee
    const unsubSystem = databaseService.subscribeSystemAnnouncement((text, speed, gap) => {
      setSystemAnnouncement(text ?? '');
      setAnnouncementEditText(text ?? '');
      setSystemAnnouncementSpeed(speed || 35);
      setSystemAnnouncementGap(gap || 32);
      setAnnouncementEditSpeed(speed || 35);
      setAnnouncementEditGap(gap || 32);
    });

    // 2. Subscribe to general log/toast announcements
    const unsubAnnouncements = databaseService.subscribeAnnouncements((list: any[]) => {
      const actualList = list || [];
      // Sort descending by timestamp
      const sorted = [...actualList].sort((a, b) => b.timestamp - a.timestamp);
      setAllAnnouncements(sorted);

      // Get count of unread based on when user last checked announcements
      const lastRead = Number(localStorage.getItem('3t_last_read_ann_ts') || '0');
      const unread = sorted.filter(a => a.timestamp > lastRead).length;
      setUnreadNotificationsCount(unread);
    });

    return () => {
      unsubSystem();
      unsubAnnouncements();
    };
  }, []);

  useEffect(() => {
    const isChatAdmin = user.role === 'admin' || user.role === 'executive';
    const unsubscribe = databaseService.subscribeChatTopics((allTopics) => {
      if (!allTopics) {
        setUnreadExchangeCount(0);
        return;
      }
      const count = allTopics.filter(topic => {
        if (isChatAdmin) {
          return topic.unreadForAdmin === true;
        } else {
          return topic.createdBy === user.id && topic.unreadForUser === true;
        }
      }).length;
      setUnreadExchangeCount(count);
    });
    return () => unsubscribe();
  }, [user.id, user.role]);

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

  // Sync test mode state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const mode = localStorage.getItem('3t_inactivity_test_mode') === 'true';
      if (mode !== inactivityTestMode) {
        setInactivityTestMode(mode);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('3t_inactivity_test_mode_changed' as any, handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('3t_inactivity_test_mode_changed' as any, handleStorageChange);
    };
  }, [inactivityTestMode]);

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
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const cached = localStorage.getItem('cached_questions') || localStorage.getItem('3t_questions');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc cache câu hỏi từ LocalStorage:", e);
    }
    return [];
  });
  const [results, setResults] = useState<QuizResult[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);

  // Đồng bộ lại các kết quả nộp bài offline (nếu có) khi vào Dashboard hoặc khi mạng ổn định
  useEffect(() => {
    databaseService.syncPendingQuizResults();
    const handleOnline = () => {
      databaseService.syncPendingQuizResults();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const computeLevelForList = (list: QuizResult[], pUserId?: string) => {
    const activeRules = levelRules || DEFAULT_LEVEL_RULES;
    const calc = calculateInactivityAugmentedLevel(
      pUserId || '',
      list,
      activeRules,
      {
        isTestModeEnabled: inactivityTestMode,
        simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
      }
    );
    return calc.level;
  };

  const computeRecordsForChecking = (allResList: QuizResult[]) => {
    const lNormalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};
    allResList.forEach(res => {
      const normName = lNormalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
    });

    const userGroups: Record<string, QuizResult[]> = {};
    allResList.forEach(res => {
      const normName = lNormalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';
      if (personKey === 'anonymous') return;

      if (!userGroups[personKey]) {
        userGroups[personKey] = [];
      }
      userGroups[personKey].push(res);
    });

    let maxAttempts = 381;
    let maxAttemptsHolderId = 'static_quyettam';
    let maxAttemptsHolderName = 'TRAN PHUOC TRUNG';

    let maxPerfects = 185;
    let maxPerfectsHolderId = 'static_tritue';
    let maxPerfectsHolderName = 'TRẦN VĂN TIÊN';

    let minAvgDurationPerQ = 3.8;
    let minAvgDurationHolderId = 'static_tocdo';
    let minAvgDurationHolderName = 'QUÁCH THUÝ VÂN';

    let maxStreak = 45;
    let maxStreakHolderId = 'static_batbai';
    let maxStreakHolderName = 'HA HUU QUYNH';

    let minSunriseTime = 84; // 1h24 sáng -> 84 phút
    let minSunriseTimeHolderId = 'static_binhminh';
    let minSunriseTimeHolderName = 'PHẠM VĂN ĐEN';

    Object.entries(userGroups).forEach(([personKey, userResults]) => {
      const chronological = [...userResults].sort((a, b) => a.timestamp - b.timestamp);
      const firstRes = chronological[0];
      const hId = firstRes?.userId || personKey;
      const hName = firstRes?.userName || personKey;
      
      const attemptsCount = chronological.length;
      if (attemptsCount > maxAttempts) {
        maxAttempts = attemptsCount;
        maxAttemptsHolderId = hId;
        maxAttemptsHolderName = hName;
      }

      const perfectsCount = chronological.filter(r => r.score === 30).length;
      if (perfectsCount > maxPerfects) {
        maxPerfects = perfectsCount;
        maxPerfectsHolderId = hId;
        maxPerfectsHolderName = hName;
      }

      const totalQ = chronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
      const totalD = chronological.reduce((sum, r) => sum + (r.duration || 0), 0);
      if (totalQ > 0) {
        const avgD = totalD / totalQ;
        if (avgD < minAvgDurationPerQ) {
          minAvgDurationPerQ = avgD;
          minAvgDurationHolderId = hId;
          minAvgDurationHolderName = hName;
        }
      }

      let currentStreak = 0;
      let userMaxStreak = 0;
      chronological.forEach(r => {
        if (r.score === 30) {
          currentStreak++;
          if (currentStreak > userMaxStreak) userMaxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      });
      if (userMaxStreak > maxStreak) {
        maxStreak = userMaxStreak;
        maxStreakHolderId = hId;
        maxStreakHolderName = hName;
      }

      chronological.forEach(r => {
        if (r.score === 30) {
          const d = new Date(r.timestamp);
          const hours = d.getHours();
          const mins = d.getMinutes();
          if (hours >= 0 && hours < 10) {
            const timeVal = hours * 60 + mins;
            if (timeVal < minSunriseTime) {
              minSunriseTime = timeVal;
              minSunriseTimeHolderId = hId;
              minSunriseTimeHolderName = hName;
            }
          }
        }
      });
    });

    return {
      maxAttempts,
      maxAttemptsHolderId,
      maxAttemptsHolderName,
      maxPerfects,
      maxPerfectsHolderId,
      maxPerfectsHolderName,
      minAvgDurationPerQ,
      minAvgDurationHolderId,
      minAvgDurationHolderName,
      maxStreak,
      maxStreakHolderId,
      maxStreakHolderName,
      minSunriseTime,
      minSunriseTimeHolderId,
      minSunriseTimeHolderName
    };
  };

  const checkNewRecordOrPromotion = async (newResult: QuizResult) => {
    try {
      const oldLevel = difficultyState.level;
      const newLevel = computeLevelForList([newResult, ...results]);
      
      const getRankNameLocal = (lvl: number): string => {
        if (lvl === 5) return 'Cấp 5: Huyền Thoại 🏆';
        if (lvl === 4) return 'Cấp 4: Tối Cao 👑';
        if (lvl === 3) return 'Cấp 3: Thống Lĩnh ⚔️';
        if (lvl === 2) return 'Cấp 2: Chiến Binh 🛡️';
        return 'Cấp 1: Tân Binh 🌱';
      };

      if (newLevel > oldLevel) {
        await databaseService.saveAnnouncement({
          id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          userName: user.name,
          type: newLevel === 5 ? 'level_5' : 'promotion',
          detail: `đã xuất sắc thăng cấp lên ${getRankNameLocal(newLevel)}! 🎉`,
          timestamp: Date.now()
        });
      } else if (newLevel < oldLevel) {
        const attemptNumber = results.length + 1;
        let minRequiredScore = 20;
        if (oldLevel === 2) minRequiredScore = 20;
        else if (oldLevel === 3) minRequiredScore = 26;
        else if (oldLevel === 4) minRequiredScore = 27;
        else if (oldLevel === 5) minRequiredScore = 28;

        const detailMessage = `bị hạ cấp từ ${getRankNameLocal(oldLevel)} xuống ${getRankNameLocal(newLevel)} ở lượt rèn luyện thứ ${attemptNumber} do kết quả bài thi đạt ${newResult.score}/30đ - không đạt điểm tối thiểu ${minRequiredScore}/30đ theo quy chế (bị điểm dưới sàn 2 lần liên tiếp)! ⚠️`;

        await databaseService.saveAnnouncement({
          id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          userName: user.name,
          type: 'demotion',
          detail: detailMessage,
          timestamp: Date.now()
        });
      }

      const baseline = computeRecordsForChecking(allResults);
      const userChronological = [newResult, ...results].sort((a, b) => a.timestamp - b.timestamp);
      const userAttempts = userChronological.length;
      const userPerfects = userChronological.filter(r => r.score === 30).length;
      
      const userTotalQ = userChronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
      const userTotalD = userChronological.reduce((sum, r) => sum + (r.duration || 0), 0);
      const userAvgSpeed = userTotalQ > 0 ? (userTotalD / userTotalQ) : Infinity;

      let currentStreak = 0;
      let userMaxStreak = 0;
      userChronological.forEach(r => {
        if (r.score === 30) {
          currentStreak++;
          if (currentStreak > userMaxStreak) userMaxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      });

      const d = new Date(newResult.timestamp);
      const hours = d.getHours();
      const mins = d.getMinutes();
      let userSunriseInMins = Infinity;
      let userSunriseStr = '';
      if (hours >= 0 && hours < 10) {
        userSunriseInMins = hours * 60 + mins;
        userSunriseStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }

      // 1. KIÊN TRÌ Record Check
      if (baseline.maxAttempts > 0 && userAttempts >= baseline.maxAttempts) {
        const isSelf = baseline.maxAttemptsHolderId === user.id || baseline.maxAttemptsHolderName === user.name;
        if (userAttempts > baseline.maxAttempts) {
          // Only notify if it's a new champion OR self-breaking at a round milestone of 100
          const shouldNotify = !isSelf || (userAttempts % 100 === 0);
          if (shouldNotify) {
            const detailText = isSelf
              ? `vừa tự phá vỡ cột mốc KIÊN TRÌ mới của chính mình với tổng cộng ${userAttempts} lượt rèn luyện bền bỉ! 🎯`
              : `vừa soán ngôi vị ${baseline.maxAttemptsHolderName || 'đối thủ'} để lập kỷ lục KIÊN TRÌ mới với tổng cộng ${userAttempts} lượt rèn luyện bền bỉ! 🎯`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_qt',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        } else if (userAttempts === baseline.maxAttempts) {
          // Cân bằng kỷ lục
          if (!isSelf) {
            const detailText = `vừa CÂN BẰNG KỶ LỤC KIÊN TRÌ của ${baseline.maxAttemptsHolderName || 'tiền bối'} với tổng cộng ${userAttempts} lượt rèn luyện bền bỉ! 🎯`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_qt_equals',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        }
      }

      // 2. TRÍ TUỆ Record Check
      if (baseline.maxPerfects > 0 && userPerfects >= baseline.maxPerfects) {
        const isSelf = baseline.maxPerfectsHolderId === user.id || baseline.maxPerfectsHolderName === user.name;
        if (userPerfects > baseline.maxPerfects) {
          // Only notify if it's a new champion OR self-breaking at a round milestone of 50
          const shouldNotify = !isSelf || (userPerfects % 50 === 0);
          if (shouldNotify) {
            const detailText = isSelf
              ? `vừa củng cố kỷ lục TRÍ TUỆ của chính mình với cột mốc: ${userPerfects} lượt đại cát đạt 30/30 tối đa! 🧠`
              : `vừa vượt mặt ${baseline.maxPerfectsHolderName || 'người giữ kỷ lục cũ'} để thiết lập kỷ lục TRÍ TUỆ mới với ${userPerfects} lượt đại cát đạt 30/30 tối đa! 🧠`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_tt',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        } else if (userPerfects === baseline.maxPerfects) {
          // Cân bằng kỷ lục
          if (!isSelf) {
            const detailText = `vừa CÂN BẰNG KỶ LỤC TRÍ TUỆ của ${baseline.maxPerfectsHolderName || 'tiền bối'} với cột mốc ${userPerfects} lượt đại cát đạt 30/30 tối đa! 🧠`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_tt_equals',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        }
      }

      // 3. TỐC ĐỘ Record Check
      if (baseline.minAvgDurationPerQ < Infinity && userTotalQ >= 9) {
        const isSelf = baseline.minAvgDurationHolderId === user.id || baseline.minAvgDurationHolderName === user.name;
        const userSpeedStr = userAvgSpeed.toFixed(2);
        const baselineSpeedStr = baseline.minAvgDurationPerQ.toFixed(2);

        if (parseFloat(userSpeedStr) < parseFloat(baselineSpeedStr)) {
          // Only notify if it's a new champion OR if self-breaking is significant (at least 0.25s faster)
          const improvement = baseline.minAvgDurationPerQ - userAvgSpeed;
          const shouldNotify = !isSelf || (improvement >= 0.25);
          if (shouldNotify) {
            const detailText = isSelf
              ? `vừa tự bứt phá kỷ lục TỐC ĐỘ phản xạ cực hạn của chính mình lên tầm cao mới: ${userAvgSpeed.toFixed(2)} giây/câu! ⚡`
              : `vừa phá kỷ lục TỐC ĐỘ phản xạ cực hạn của ${baseline.minAvgDurationHolderName || 'tiền bối'} với thành tích ấn tượng: ${userAvgSpeed.toFixed(2)} giây/câu! ⚡`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_td',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        } else if (userSpeedStr === baselineSpeedStr) {
          // Cân bằng kỷ lục
          if (!isSelf) {
            const detailText = `vừa CÂN BẰNG KỶ LỤC TỐC ĐỘ phản xạ cực hạn của ${baseline.minAvgDurationHolderName || 'QUÁCH THUÝ VÂN'} với thành tích cực kỳ ấn tượng: ${userAvgSpeed.toFixed(2)} giây/câu! ⚡`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_td_equals',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        } else if (userAvgSpeed < baseline.minAvgDurationPerQ + 0.15) {
          // CLOSE COMPARED RECORD: Bám sát mốc kỷ lục
          if (!isSelf) {
            const detailText = `vừa bám sát mốc Kỷ lục TỐC ĐỘ phản xạ cực hạn của ${baseline.minAvgDurationHolderName || 'QUÁCH THUÝ VÂN'} với thành tích cực kỳ ấn tượng: ${userAvgSpeed.toFixed(2)} giây/câu! 🔥`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_td_close',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        }
      }

      // 4. BẤT BẠI Record Check
      if (baseline.maxStreak > 0 && userMaxStreak >= baseline.maxStreak) {
        const isSelf = baseline.maxStreakHolderId === user.id || baseline.maxStreakHolderName === user.name;
        if (userMaxStreak > baseline.maxStreak) {
          // Only notify if it's a new champion OR self-breaking at a round milestone of 5
          const shouldNotify = !isSelf || (userMaxStreak % 5 === 0);
          if (shouldNotify) {
            const detailText = isSelf
              ? `vừa nối dài chuỗi kỷ lục BẤT BẠI tự đặt ra lên mốc huy hoàng mới: ${userMaxStreak} lượt đạt 30/30 liên hoàn! 🛡️`
              : `vừa hạ gục chuỗi kỷ lục BẤT BẠI của ${baseline.maxStreakHolderName || 'nhân tài cũ'} với chuỗi ${userMaxStreak} lượt liên hoàn đạt 30/30 tối đa! 🛡️`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_bb',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        } else if (userMaxStreak === baseline.maxStreak) {
          // Cân bằng kỷ lục
          if (!isSelf) {
            const detailText = `vừa CÂN BẰNG KỶ LỤC BẤT BẠI của ${baseline.maxStreakHolderName || 'tiền bối'} với chuỗi ${userMaxStreak} lượt liên hoàn đạt 30/30 tối đa! 🛡️`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_bb_equals',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        }
      }

      // 5. TRƯỚC BÌNH MINH Record Check
      if (newResult.score === 30 && baseline.minSunriseTime < Infinity && userSunriseInMins <= baseline.minSunriseTime) {
        const isSelf = baseline.minSunriseTimeHolderId === user.id || baseline.minSunriseTimeHolderName === user.name;
        if (userSunriseInMins < baseline.minSunriseTime) {
          // Only notify if it's a new champion OR self-breaking by at least 10 minutes earlier
          const diffInMins = baseline.minSunriseTime - userSunriseInMins;
          const shouldNotify = !isSelf || (diffInMins >= 10);
          if (shouldNotify) {
            const detailText = isSelf
              ? `vừa thức dậy sớm hơn nữa, tự phá kỷ lục TRƯỚC BÌNH MINH của chính mình lúc ${userSunriseStr}! 🌅`
              : `vừa thi đạt điểm tối đa lúc ${userSunriseStr}, phá vỡ kỷ lục TRƯỚC BÌNH MINH của ${baseline.minSunriseTimeHolderName || 'người cũ'}! 🌅`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_bm',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        } else if (userSunriseInMins === baseline.minSunriseTime) {
          // Cân bằng kỷ lục
          if (!isSelf) {
            const detailText = `vừa thi đạt điểm tối đa lúc ${userSunriseStr}, CÂN BẰNG KỶ LỤC TRƯỚC BÌNH MINH của ${baseline.minSunriseTimeHolderName || 'tiền bối'}! 🌅`;
            await databaseService.saveAnnouncement({
              id: 'ann_' + Date.now() + '_bm_equals',
              userName: user.name,
              type: 'record_broken',
              detail: detailText,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (err) {
      console.warn("Lỗi trong lúc tính toán phá kỷ lục:", err);
    }
  };

  // Dynamic level:
  // Cấp 1 (Tân Binh): 5 lượt liên tiếp đạt 30/30 -> Cấp 2. Hạ cấp: Giữ nguyên.
  // Cấp 2 (Chiến Binh): 5 lượt liên tiếp đạt 30/30 -> Cấp 3. Hạ cấp: Điểm < 20 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 1.
  // Cấp 3 (Thống Lĩnh): 5 lượt liên tiếp đạt 30/30 -> Cấp 4. Hạ cấp: Điểm < 26 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 2.
  // Cấp 4 (Tối Cao): 5 lượt liên tiếp đạt 30/30 -> Cấp 5. Hạ cấp: Điểm < 27 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 3.
  // Cấp 5 (Huyền Thoại): Thăng cấp: Đạt điểm tuyệt đối 30 điểm liên tục -> Giữ nguyên. Hạ cấp: Điểm < 28 không liên tiếp 2 lần (lần 1 cảnh báo) -> Cấp 4.
  const difficultyState = useMemo(() => {
    const activeRules = levelRules || DEFAULT_LEVEL_RULES;
    
    // Call our unified calculator
    const calc = calculateInactivityAugmentedLevel(
      user.id,
      results,
      activeRules,
      {
        isTestModeEnabled: inactivityTestMode,
        simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
      }
    );

    let latestFeedbackMessage: string | null = null;
    let latestFeedbackType: 'promotion' | 'demotion' | 'warning' | null = null;

    const levelNames: Record<number, string> = {
      1: activeRules.levels[0]?.name || 'Tân Binh (Cấp 1)',
      2: activeRules.levels[1]?.name || 'Chiến Binh (Cấp 2)',
      3: activeRules.levels[2]?.name || 'Thống Lĩnh (Cấp 3)',
      4: activeRules.levels[3]?.name || 'Tối Cao (Cấp 4)',
      5: activeRules.levels[4]?.name || 'Huyền Thoại (Cấp 5)'
    };

    const parseDemotionThreshold = (lvlIdx: number, defaultVal: number): number => {
      const demotionText = activeRules.levels[lvlIdx]?.demotion;
      if (!demotionText) return defaultVal;
      const match = demotionText.match(/dưới\s+(\d+)\s+điểm/i) || 
                    demotionText.match(/dưới\s+(\d+)/i) || 
                    demotionText.match(/<\s*(\d+)/i);
      return match ? parseInt(match[1], 10) : defaultVal;
    };

    const chronologicalResults = [...results].sort((a, b) => a.timestamp - b.timestamp);
    if (chronologicalResults.length > 0) {
      const lastRes = chronologicalResults[chronologicalResults.length - 1];
      const score = lastRes.score;
      
      const prevResults = chronologicalResults.slice(0, chronologicalResults.length - 1);
      const prevCalc = calculateInactivityAugmentedLevel(
        user.id,
        prevResults,
        activeRules,
        {
          isTestModeEnabled: inactivityTestMode,
          simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
        }
      );

      if (calc.level > prevCalc.level) {
        latestFeedbackType = 'promotion';
        latestFeedbackMessage = `Chúc mừng! Bạn đã xuất sắc thăng cấp lên ${levelNames[calc.level]}!`;
      } else if (calc.level < prevCalc.level) {
        latestFeedbackType = 'demotion';
        latestFeedbackMessage = `Bạn đã bị tụt xuống ${levelNames[calc.level]} do đạt điểm dưới mức quy định.`;
      } else {
        const currentLvlIdx = calc.level - 1;
        const demotionMin = currentLvlIdx >= 0 ? parseDemotionThreshold(currentLvlIdx, currentLvlIdx === 0 ? 0 : currentLvlIdx === 1 ? 20 : currentLvlIdx === 2 ? 26 : currentLvlIdx === 3 ? 27 : 28) : 20;
        if (score < demotionMin && calc.consecutiveLow === 1) {
          latestFeedbackType = 'warning';
          latestFeedbackMessage = `⚠️ CẢNH BÁO: Đây là lần thứ 1 bạn đạt điểm dưới tối thiểu (${score}/30đ) của cấp độ ${levelNames[calc.level]}. Sẽ bị hạ cấp về cấp dưới nếu đạt thấp thêm lần nữa!`;
        }
      }
    }

    return {
      level: calc.level,
      consecutiveMax: calc.consecutiveMax,
      consecutiveLow: calc.consecutiveLow,
      demotionsApplied: calc.demotionsApplied,
      inactiveDaysWarning: calc.inactiveDaysWarning,
      attemptsToday: calc.attemptsToday,
      latestFeedbackType,
      latestFeedbackMessage
    };
  }, [results, levelRules, inactivityTestMode]);

  const difficulty = difficultyState.level;

  // Board of Honor rotation period state
  const [boardPeriod, setBoardPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [carouselGlobalIndex, setCarouselGlobalIndex] = useState(0);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);

  // Synchronize and publish inactivity demotions automatically
  useEffect(() => {
    if (allResults.length === 0 || allUsersList.length === 0) return;

    const syncInactivityDemotions = async () => {
      // Vietnam timezone computation
      const vnNow = (() => {
        const now = new Date();
        const utcOffset = now.getTime() + (now.getTimezoneOffset() * 60000);
        return new Date(utcOffset + (3600000 * 7)); // Indochina/Vietnam is UTC+7
      })();

      const yyyy = vnNow.getFullYear();
      const mm = String(vnNow.getMonth() + 1).padStart(2, '0');
      const dd = String(vnNow.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Inactivity policy start date
      const policyStartDate = '2026-06-14';
      if (todayStr < policyStartDate) return;

      // Find yesterday
      const vnYesterday = new Date(vnNow.getTime() - 86400000);
      const yyyyY = vnYesterday.getFullYear();
      const mmY = String(vnYesterday.getMonth() + 1).padStart(2, '0');
      const ddY = String(vnYesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yyyyY}-${mmY}-${ddY}`;

      // Helper for normalizing names
      const normalizeNameLocal = (name: string | undefined | null): string => {
        if (!name) return '';
        return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
      };

      const approvedUsers = allUsersList.filter(u => {
        const uStatus = (u.status || '').toUpperCase();
        return uStatus === 'APPROVED' || uStatus === 'APPROVED_MEMBER';
      });

      const getRankNameLocal = (lvl: number): string => {
        if (lvl === 5) return 'Cấp 5: Huyền Thoại 🏆';
        if (lvl === 4) return 'Cấp 4: Tối Cao 👑';
        if (lvl === 3) return 'Cấp 3: Thống Lĩnh ⚔️';
        if (lvl === 2) return 'Cấp 2: Chiến Binh 🛡️';
        return 'Cấp 1: Tân Binh 🌱';
      };

      // Control max 5 updates per session to save write quotas
      let writeCount = 0;
      const activeRules = levelRules || DEFAULT_LEVEL_RULES;

      for (const u of approvedUsers) {
        if (writeCount >= 5) break;

        // Robust results filtering for the user aligning perfectly with the profile view logic
        const uNormName = normalizeNameLocal(u.name);
        const uResults = allResults.filter(r => {
          const rNorm = r.userName ? normalizeNameLocal(r.userName) : '';
          return (r.userId && r.userId === u.id) ||
                 (u.phone && r.userId === u.phone) ||
                 (u.employeeId && r.userId === u.employeeId) ||
                 (rNorm && rNorm === uNormName);
        });

        const calcYesterday = calculateInactivityAugmentedLevel(u.id, uResults, activeRules, {
          inactivityStartDate: policyStartDate,
          simulatedToday: yesterdayStr
        });

        const calcToday = calculateInactivityAugmentedLevel(u.id, uResults, activeRules, {
          inactivityStartDate: policyStartDate,
          simulatedToday: todayStr
        });

        if (calcToday.level < calcYesterday.level) {
          const announcementId = `ann_inactivity_${u.id}_${todayStr}`;
          const alreadyExists = allAnnouncements.some(ann => ann.id === announcementId);

          if (!alreadyExists) {
            try {
              writeCount++;
              // Calculate precisely 00:00:01 AM of todayStr in Vietnam timezone (UTC+7)
              const [y, m, d] = todayStr.split('-').map(Number);
              const midnightVnTimestamp = Date.UTC(y, m - 1, d, 0, 0, 1) - (7 * 3600000);

              // Analyze exactly what they did yesterday
              const yesterdayResults = uResults.filter(r => {
                const normD = normalizeDateString(r.date);
                return normD === yesterdayStr;
              });
              const attemptsCountYest = yesterdayResults.length;
              const avgScoreYest = attemptsCountYest > 0
                ? yesterdayResults.reduce((sum, r) => sum + r.score, 0) / attemptsCountYest
                : 0;

              let reasonText = '';
              const [yY, mY, dY] = yesterdayStr.split('-').map(Number);
              const yesterdayHumanDate = `${dY}/${mY}/${yY}`;

              if (calcYesterday.level === 5 && yesterdayStr >= '2026-06-17') {
                if (attemptsCountYest < 2 && avgScoreYest < 20) {
                  reasonText = `chỉ hoàn thành ${attemptsCountYest}/2 lượt ôn tập với điểm trung bình ${avgScoreYest.toFixed(1)}/30đ (Quy chế Cấp 5 yêu cầu ôn luyện ≥ 2 lượt/ngày và Điểm TB ngày ≥ 20/30đ)`;
                } else if (attemptsCountYest < 2) {
                  reasonText = `chỉ hoàn thành ${attemptsCountYest}/2 lượt ôn tập (Quy chế Cấp 5 yêu cầu ôn luyện ≥ 2 lượt/ngày)`;
                } else {
                  reasonText = `hoàn thành ${attemptsCountYest} lượt ôn tập nhưng điểm trung bình ngày chỉ đạt ${avgScoreYest.toFixed(1)}/30đ (Quy chế Cấp 5 yêu cầu Điểm TB ngày ≥ 20/30đ)`;
                }
              } else {
                reasonText = `chỉ hoàn thành ${attemptsCountYest}/2 lượt ôn tập (Quy chế yêu cầu duy trì tối thiểu 02 lượt ôn tập mỗi ngày để giữ hạng)`;
              }

              const detailMessage = `bị hạ cấp từ ${getRankNameLocal(calcYesterday.level)} xuống ${getRankNameLocal(calcToday.level)} do không duy trì ôn tập hàng ngày vào ngày ${yesterdayHumanDate}: ${reasonText}! ⚠️`;

              await databaseService.saveAnnouncement({
                id: announcementId,
                userName: u.name,
                type: 'demotion',
                detail: detailMessage,
                timestamp: midnightVnTimestamp
              });
              console.log(`[INACTIVITY DECODE] Auto-saved inactivity demotion announcement for ${u.name}: ${calcYesterday.level} -> ${calcToday.level} with midnight timestamp ${midnightVnTimestamp}`);
            } catch (err) {
              console.error(`[INACTIVITY DECODE] Error saving announcement:`, err);
            }
          }
        }
      }
    };

    syncInactivityDemotions();
  }, [allResults, allUsersList, levelRules, allAnnouncements]);

  // Filtered results to include unapproved, deleted (but allow admin and executive roles and ban tổng giám đốc department as they should be recorded and displayed) users for all public rankings and honor boards
  const resultsForRankings = useMemo(() => {
    if (allResults.length === 0) return [];
    
    const lNormalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
    };

    const filtered = allResults.filter(res => {
      if (res.userId) {
        const found = allUsersList.find(u => u.id === res.userId);
        if (!found) return false;
        
        const fStatus = (found.status || '').toUpperCase();
        if (fStatus !== 'APPROVED' && fStatus !== 'APPROVED_MEMBER') {
          return false;
        }
        
        return true;
      }
      
      const normName = lNormalizeName(res.userName);
      if (normName) {
        const found = allUsersList.find(u => {
          const uNorm = u.name ? u.name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ') : '';
          return uNorm === normName;
        });
        if (!found) return false;
        
        const fStatus = (found.status || '').toUpperCase();
        if (fStatus !== 'APPROVED' && fStatus !== 'APPROVED_MEMBER') {
          return false;
        }
        
        return true;
      }
      
      return false;
    });

    // Override result name and department with the latest profile to ensure automatic propagation of edits
    return filtered.map(res => {
      let matchedUser = null;
      if (res.userId) {
        matchedUser = allUsersList.find(u => u.id === res.userId);
      } else {
        const normName = lNormalizeName(res.userName);
        matchedUser = allUsersList.find(u => {
          const uNorm = u.name ? u.name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ') : '';
          return uNorm === normName;
        });
      }

      if (matchedUser) {
        return {
          ...res,
          userName: matchedUser.name || res.userName,
          department: matchedUser.department || res.department,
          branch: matchedUser.branch || res.branch,
          company: matchedUser.company || res.company
        };
      }
      return res;
    });
  }, [allResults, allUsersList]);

  // Detailed dynamic Level calculation for all users to construct BẢNG VÀNG VINH DANH
  const leaderboardCandidates = useMemo(() => {
    if (resultsForRankings.length === 0) return { 
      day: [], 
      week: [], 
      month: [], 
      dayUniqueCount: 0, 
      weekUniqueCount: 0, 
      monthUniqueCount: 0, 
      isDayFallback: true, 
      isWeekFallback: true, 
      isMonthFallback: true 
    };

    const normalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};

    resultsForRankings.forEach(res => {
      const normName = normalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
    });

    const groupedUsers: Record<string, {
      userId: string;
      userName: string;
      department: string;
      branch: string;
      attempts: number;
      bestScore: number;
      totalScore: number;
      lastAttempt: number;
      totalDuration: number;
      totalQuestions: number;
    }> = {};

    resultsForRankings.forEach(res => {
      const normName = normalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';

      if (personKey === 'anonymous') return;

      if (!groupedUsers[personKey]) {
        groupedUsers[personKey] = {
          userId: resolvedUserId,
          userName: resolvedNormalizedName || 'THÀNH VIÊN ẨN DANH',
          department: res.department || 'Hội sở',
          branch: res.branch || 'Hội sở',
          attempts: 0,
          bestScore: 0,
          totalScore: 0,
          lastAttempt: 0,
          totalDuration: 0,
          totalQuestions: 0
        };
      }
      
      const p = groupedUsers[personKey];
      p.attempts += 1;
      p.totalScore += res.score;
      p.totalDuration += res.duration || 0;
      p.totalQuestions += res.totalQuestions || 3;
      if (res.score > p.bestScore) {
        p.bestScore = res.score;
      }
      if (res.timestamp > p.lastAttempt) {
        p.lastAttempt = res.timestamp;
      }
      // Keep department and branch updated to the most recent attempt
      if (res.department) p.department = res.department;
      if (res.branch) p.branch = res.branch;
    });

    const activeRules = levelRules || DEFAULT_LEVEL_RULES;

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

    const compiledParticipants = Object.entries(groupedUsers).map(([personKey, p]) => {
      const userResults = resultsForRankings.filter(r => {
        const rNormName = normalizeName(r.userName);
        const rResolvedUserId = r.userId || nameToUserIdMap[rNormName] || '';
        const rResolvedNormalizedName = rNormName || (r.userId ? userIdToNameMap[r.userId] : '') || '';
        const rKey = rResolvedUserId || rResolvedNormalizedName;
        return rKey && rKey === personKey;
      });
      const chronologicalResults = [...userResults].sort((a, b) => a.timestamp - b.timestamp);
      
      let currentLevel = 1;
      let consecutiveMaxAtLevel = 0;
      let consecutiveLowAtLevel = 0;

      for (const res of chronologicalResults) {
        const score = res.score;
        
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
            consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 2) {
          if (score === 30) {
            consecutiveMaxAtLevel++;
          } else {
            consecutiveMaxAtLevel = 0;
          }
          const demotionMin = parseDemotionThreshold(1, 20);
          if (score < demotionMin) {
            consecutiveLowAtLevel++;
          }
          const reqConsecutive = parseRequiredConsecutive(1, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 3;
            consecutiveMaxAtLevel = 0;
            consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 1;
            consecutiveMaxAtLevel = 0;
            consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 3) {
          if (score === 30) {
            consecutiveMaxAtLevel++;
          } else {
            consecutiveMaxAtLevel = 0;
          }
          const demotionMin = parseDemotionThreshold(2, 26);
          if (score < demotionMin) {
            consecutiveLowAtLevel++;
          }
          const reqConsecutive = parseRequiredConsecutive(2, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 4;
            consecutiveMaxAtLevel = 0;
            consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 2;
            consecutiveMaxAtLevel = 0;
            consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 4) {
          if (score === 30) {
            consecutiveMaxAtLevel++;
          } else {
            consecutiveMaxAtLevel = 0;
          }
          const demotionMin = parseDemotionThreshold(3, 27);
          if (score < demotionMin) {
            consecutiveLowAtLevel++;
          }
          const reqConsecutive = parseRequiredConsecutive(3, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 5;
            consecutiveMaxAtLevel = 0;
            consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 3;
            consecutiveMaxAtLevel = 0;
            consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 5) {
          if (score === 30) {
            consecutiveMaxAtLevel++;
          } else {
            consecutiveMaxAtLevel = 0;
          }
          const demotionMin = parseDemotionThreshold(4, 28);
          if (score < demotionMin) {
            consecutiveLowAtLevel++;
          }
          if (consecutiveLowAtLevel >= 2) {
            currentLevel = 4;
            consecutiveMaxAtLevel = 0;
            consecutiveLowAtLevel = 0;
          }
        }
      }

      const totalDur = p.totalDuration || 0;
      const totalQues = p.totalQuestions || 1;
      const avgTimeSpent = Math.max(1, Math.round(totalDur / totalQues));

      return {
        ...p,
        level: currentLevel,
        avgScore: p.attempts > 0 ? parseFloat((p.totalScore / p.attempts).toFixed(1)) : 0,
        avgTimeSpent
      };
    });

    const makeInterleavedList = (candidatesList: typeof compiledParticipants) => {
      // 1. Filter candidates of Level >= 2
      const level2Plus = candidatesList
        .filter(c => c.level >= 2)
        .sort((a, b) => b.level - a.level || b.bestScore - a.bestScore || b.avgScore - a.avgScore || b.attempts - a.attempts);

      if (level2Plus.length === 0) return [];

      // Separate into Legends (level 5) and others (level 2, 3, 4)
      const legends = level2Plus.filter(c => c.level === 5);
      const others = level2Plus.filter(c => c.level < 5);

      const sequence: typeof level2Plus = [];

      // Push first occurrence of all legends to prioritize high levels first
      legends.forEach(l => {
        sequence.push(l);
      });

      // We will interleave "others" and the "second occurrences" of legends!
      const secondLegends = [...legends];
      let otherIdx = 0;
      let legendIdx = 0;

      while (otherIdx < others.length || legendIdx < secondLegends.length) {
        // Interleave other candidates
        if (otherIdx < others.length) {
          sequence.push(others[otherIdx]);
          otherIdx++;
        }
        // Interleave second occurrence of a legend
        if (legendIdx < secondLegends.length) {
          sequence.push(secondLegends[legendIdx]);
          legendIdx++;
        }
      }

      return sequence;
    };

    const now = new Date();
    const nowMs = now.getTime();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeekMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    const startOfMonthMs = nowMs - 30 * 24 * 60 * 60 * 1000;

    const dayQualified = compiledParticipants.filter(c => c.level >= 2 && c.lastAttempt >= startOfTodayMs);
    const weekQualified = compiledParticipants.filter(c => c.level >= 2 && c.lastAttempt >= startOfWeekMs);
    const monthQualified = compiledParticipants.filter(c => c.level >= 2 && c.lastAttempt >= startOfMonthMs);

    const dayList = makeInterleavedList(dayQualified);
    const weekList = makeInterleavedList(weekQualified);
    const monthList = makeInterleavedList(monthQualified);

    return {
      day: dayList,
      week: weekList,
      month: monthList,
      dayUniqueCount: dayQualified.length,
      weekUniqueCount: weekQualified.length,
      monthUniqueCount: monthQualified.length,
      isDayFallback: false,
      isWeekFallback: false,
      isMonthFallback: false
    };
  }, [resultsForRankings, levelRules]);

  // Helper for date formatting in dd/mm/yy
  const formatToDDMMYY = (timestamp: any): string => {
    if (!timestamp) return '';
    const dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) return '';
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // Monument Legends calculations for the mobile honor list
  const monumentLegends = useMemo(() => {
    const lNormalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
    };

    const formatPromoDate = (ts?: number): string => {
      if (!ts) return 'N/A';
      const d = new Date(ts);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};
    const userIdToDeptMap: Record<string, string> = {};
    const userIdToBranchMap: Record<string, string> = {};

    resultsForRankings.forEach(res => {
      const normName = lNormalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
      if (res.userId) {
        if (res.department) userIdToDeptMap[res.userId] = res.department;
        if (res.branch) userIdToBranchMap[res.userId] = res.branch;
      }
    });

    const userGroups: Record<string, QuizResult[]> = {};
    resultsForRankings.forEach(res => {
      const normName = lNormalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';
      if (personKey === 'anonymous') return;

      if (!userGroups[personKey]) {
        userGroups[personKey] = [];
      }
      userGroups[personKey].push(res);
    });

    const activeRules = levelRules || DEFAULT_LEVEL_RULES;

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

    const baselineLegends: any[] = [];

    const legendsList = [...baselineLegends] as any[];

    Object.entries(userGroups).forEach(([personKey, userResultsList]) => {
      const chronological = [...userResultsList].sort((a, b) => a.timestamp - b.timestamp);
      
      let currentLevel = 1;
      let consecutiveMaxAtLevel = 0;
      let consecutiveLowAtLevel = 0;
      let firstLegendIdx = -1;
      const scoresUpToFirstLegend: number[] = [];

      const level5Attempts: Array<{ timestamp: number; dateStr: string }> = [];
      const allTransitions: Array<{
        fromLevel: number;
        toLevel: number;
        timestamp: number;
        attemptsCount: number;
        dateStr: string;
      }> = [];
      let lastLevelChangeIdx = -1;

      const coronations: Array<{
        coronationIdx: number;
        promoTimestamp: number;
        fromLevel: number;
        avgScoreAtCoronation: number;
        totalAttemptsAtCoronation: number;
        overallAvgDurationPerAttempt: number;
        overallAvgDurationPerQuestion: number;
        dateStr: string;
        transitions: Array<{
          fromLevel: number;
          toLevel: number;
          timestamp: number;
          attemptsCount: number;
          dateStr: string;
        }>;
      }> = [];

      chronological.forEach((res, idx) => {
        const score = res.score;
        if (firstLegendIdx === -1) {
          scoresUpToFirstLegend.push(score);
        }

        const previousLevel = currentLevel;

        // Apply Level Rules
        if (currentLevel === 1) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(0, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 2; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 2) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(1, 20);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(1, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 3; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 1; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 3) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(2, 26);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(2, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 4; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 2; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 4) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(3, 27);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(3, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 5; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 3; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 5) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(4, 28);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          if (consecutiveLowAtLevel >= 2) {
            currentLevel = 4; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        }

        if (currentLevel === 5) {
          if (firstLegendIdx === -1) {
            firstLegendIdx = idx;
          }
          const d = new Date(res.timestamp);
          const dateStr = d.toISOString().split('T')[0];
          level5Attempts.push({ timestamp: res.timestamp, dateStr });
        }

        // Record any level transition
        if (previousLevel !== currentLevel) {
          const attemptsCount = idx - lastLevelChangeIdx;
          allTransitions.push({
            fromLevel: previousLevel,
            toLevel: currentLevel,
            timestamp: res.timestamp,
            attemptsCount,
            dateStr: formatPromoDate(res.timestamp)
          });
          lastLevelChangeIdx = idx;
        }

        // Detect coronations
        if (previousLevel < 5 && currentLevel === 5) {
          const coronationIdx = idx;
          const promoTimestamp = res.timestamp;
          const fromLevel = previousLevel;

          const coronationAttempts = chronological.slice(0, coronationIdx + 1);
          const totalAtCoronation = coronationAttempts.length;
          const totalDur = coronationAttempts.reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalSc = coronationAttempts.reduce((sum, r) => sum + r.score, 0);
          const totalQs = coronationAttempts.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);

          const avgScore = totalAtCoronation > 0 ? parseFloat((totalSc / totalAtCoronation).toFixed(1)) : 0;
          const durationPerAttempt = totalAtCoronation > 0 ? parseFloat((totalDur / totalAtCoronation).toFixed(1)) : 0;
          const durationPerQuestion = totalQs > 0 ? parseFloat((totalDur / totalQs).toFixed(1)) : 0;

          const d = new Date(promoTimestamp);
          const dateStr = d.toISOString().split('T')[0];

          const prevCoronationCount = coronations.reduce((sum, c) => sum + c.transitions.length, 0);
          const currentCoronationTransitions = allTransitions.slice(prevCoronationCount);

          coronations.push({
            coronationIdx,
            promoTimestamp,
            fromLevel,
            avgScoreAtCoronation: avgScore,
            totalAttemptsAtCoronation: totalAtCoronation,
            overallAvgDurationPerAttempt: durationPerAttempt,
            overallAvgDurationPerQuestion: durationPerQuestion,
            dateStr,
            transitions: currentCoronationTransitions
          });
        }
      });

      if (firstLegendIdx !== -1) {
        const lastResult = chronological[chronological.length - 1];
        const lastPromoTimestamp = lastResult.timestamp;

        if (coronations.length === 0) {
          const coronationAttempts = chronological.slice(0, firstLegendIdx + 1);
          const totalAtCoronation = coronationAttempts.length;
          const totalDur = coronationAttempts.reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalSc = coronationAttempts.reduce((sum, r) => sum + r.score, 0);
          const totalQs = coronationAttempts.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);

          const avgScore = totalAtCoronation > 0 ? parseFloat((totalSc / totalAtCoronation).toFixed(1)) : 0;
          const durationPerAttempt = totalAtCoronation > 0 ? parseFloat((totalDur / totalAtCoronation).toFixed(1)) : 0;
          const durationPerQuestion = totalQs > 0 ? parseFloat((totalDur / totalQs).toFixed(1)) : 0;

          const d = new Date(chronological[firstLegendIdx].timestamp);
          const dateStr = d.toISOString().split('T')[0];

          let fallbackTransitions = [...allTransitions];
          if (fallbackTransitions.length === 0) {
            const countPerLevel = Math.max(1, Math.floor(totalAtCoronation / 4));
            fallbackTransitions = [
              { fromLevel: 1, toLevel: 2, timestamp: lastPromoTimestamp - 3 * 86400000, attemptsCount: countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp - 3 * 86400000) },
              { fromLevel: 2, toLevel: 3, timestamp: lastPromoTimestamp - 2 * 86400000, attemptsCount: countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp - 2 * 86400000) },
              { fromLevel: 3, toLevel: 4, timestamp: lastPromoTimestamp - 1 * 86400000, attemptsCount: countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp - 1 * 86400000) },
              { fromLevel: 4, toLevel: 5, timestamp: lastPromoTimestamp, attemptsCount: totalAtCoronation - 3 * countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp) }
            ];
          }

          coronations.push({
            coronationIdx: firstLegendIdx,
            promoTimestamp: chronological[firstLegendIdx].timestamp,
            fromLevel: 4,
            avgScoreAtCoronation: avgScore,
            totalAttemptsAtCoronation: totalAtCoronation,
            overallAvgDurationPerAttempt: durationPerAttempt,
            overallAvgDurationPerQuestion: durationPerQuestion,
            dateStr,
            transitions: fallbackTransitions
          });
        }

        const isLNT = lastResult.userId === 'admin_lenhattruong' || lNormalizeName(lastResult.userName) === 'LÊ NHẬT TRƯỜNG';
        
        const totalAttempts = chronological.length;
        const totalDuration = chronological.reduce((sum, r) => sum + (r.duration || 0), 0);
        const totalScore = chronological.reduce((sum, r) => sum + r.score, 0);
        const totalQuestions = chronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);

        const avgScoreAtFirstLegend = scoresUpToFirstLegend.length > 0 
          ? parseFloat((scoresUpToFirstLegend.reduce((sum, s) => sum + s, 0) / scoresUpToFirstLegend.length).toFixed(1)) 
          : 0;

        const overallAvgDurationPerAttempt = totalAttempts > 0 
          ? parseFloat((totalDuration / totalAttempts).toFixed(1)) 
          : 0;

        const overallAvgDurationPerQuestion = totalQuestions > 0 
          ? parseFloat((totalDuration / totalQuestions).toFixed(1)) 
          : 0;

        const uniqueDaysMaintaining = Array.from(new Set(level5Attempts.map(att => att.dateStr))).length;

        const calcRes = calculateInactivityAugmentedLevel(
          personKey,
          chronological,
          activeRules,
          {
            isTestModeEnabled: inactivityTestMode,
            simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
          }
        );
        const finalComputedLevel = calcRes.level;

        const rName = lastResult.userName || 'THÀNH VIÊN ẨN DANH';
        const normName = lNormalizeName(rName);

        const existingIdx = legendsList.findIndex(l => lNormalizeName(l.userName) === normName);

        const newItem = {
          userId: lastResult.userId || lastResult.userName,
          userName: rName,
          dept: isLNT ? 'Phòng Quản Lý Chất Lượng' : (lastResult.department || 'Hội sở'),
          department: isLNT ? 'Phòng Quản Lý Chất Lượng' : (lastResult.department || 'Hội sở'),
          branch: lastResult.branch || 'Hội sở',
          avgScoreAtFirstLegend: coronations[coronations.length - 1].avgScoreAtCoronation,
          overallAvgDurationPerAttempt: coronations[coronations.length - 1].overallAvgDurationPerAttempt,
          overallAvgDurationPerQuestion: coronations[coronations.length - 1].overallAvgDurationPerQuestion,
          level5Attempts,
          coronations,
          totalAttempts,
          totalScore,
          totalDuration,
          totalQuestions,
          promoTimestamp: coronations[coronations.length - 1].promoTimestamp,
          daysMaintaining: uniqueDaysMaintaining,
          currentLevel: finalComputedLevel,
          
          // Compat
          level: finalComputedLevel,
          maxLevelReached: calcRes.maxLevelReached || finalComputedLevel,
          attempts: totalAttempts,
          avgScore: coronations[coronations.length - 1].avgScoreAtCoronation,
          avgTimeSpent: Math.round(overallAvgDurationPerQuestion),
          bestScore: Math.max(...userResultsList.map(r => r.score), 30)
        };

        if (existingIdx !== -1) {
          const existing = legendsList[existingIdx];
          legendsList[existingIdx] = {
            ...newItem,
            currentLevel: newItem.currentLevel,
            promoTimestamp: newItem.promoTimestamp || existing.promoTimestamp,
            daysMaintaining: Math.max(newItem.daysMaintaining || 1, existing.daysMaintaining || 1),
            coronations: newItem.coronations.length > 0 ? newItem.coronations : existing.coronations
          };
        } else {
          legendsList.push(newItem);
        }
      }
    });

    // Ensure manually promoted level 5 users from allUsersList are included
    if (Array.isArray(allUsersList)) {
      allUsersList.forEach(u => {
        const uStatus = (u.status || '').toUpperCase();
        if (uStatus !== 'APPROVED' && uStatus !== 'APPROVED_MEMBER') return;

        const uLvl = u.level || u.currentLevel || 1;
        if (uLvl === 5) {
          const normName = lNormalizeName(u.name || u.userName);
          const exists = legendsList.some(l => lNormalizeName(l.userName) === normName || l.userId === u.id);
          if (!exists) {
            const userResultsList = userGroups[u.id] || userGroups[normName] || [];
            const totalAttempts = userResultsList.length;
            const totalScore = userResultsList.reduce((sum, r) => sum + r.score, 0);
            const totalDuration = userResultsList.reduce((sum, r) => sum + (r.duration || 0), 0);
            const totalQuestions = userResultsList.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
            
            const avgScore = totalAttempts > 0 ? parseFloat((totalScore / totalAttempts).toFixed(1)) : 30;
            const durationPerAttempt = totalAttempts > 0 ? parseFloat((totalDuration / totalAttempts).toFixed(1)) : 10;
            const durationPerQuestion = totalQuestions > 0 ? parseFloat((totalDuration / totalQuestions).toFixed(1)) : 3;

            const promoTs = u.createdAt ? new Date(u.createdAt).getTime() : Date.now();
            const d = new Date(promoTs);
            const dateStr = d.toISOString().split('T')[0];

            legendsList.push({
              userId: u.id || normName,
              userName: u.name || normName,
              dept: u.department || 'Hội sở',
              department: u.department || 'Hội sở',
              branch: u.branch || 'Hội sở',
              avgScoreAtFirstLegend: avgScore,
              overallAvgDurationPerAttempt: durationPerAttempt,
              overallAvgDurationPerQuestion: durationPerQuestion,
              level5Attempts: userResultsList.map(r => ({ timestamp: r.timestamp, dateStr: r.date || new Date(r.timestamp).toISOString().split('T')[0] })),
              coronations: [{
                coronationIdx: 0,
                promoTimestamp: promoTs,
                fromLevel: 4,
                avgScoreAtCoronation: avgScore,
                totalAttemptsAtCoronation: totalAttempts || 1,
                overallAvgDurationPerAttempt: durationPerAttempt,
                overallAvgDurationPerQuestion: durationPerQuestion,
                dateStr,
                transitions: []
              }],
              totalAttempts,
              totalScore,
              totalDuration,
              totalQuestions,
              promoTimestamp: promoTs,
              daysMaintaining: 1,
              currentLevel: 5,
              level: 5,
              maxLevelReached: 5,
              attempts: totalAttempts,
              avgScore,
              avgTimeSpent: Math.round(durationPerQuestion),
              bestScore: userResultsList.length > 0 ? Math.max(...userResultsList.map(r => r.score), 30) : 30
            });
          }
        }
      });
    }

    // Ensure EVERY legend has their currentLevel / level evaluated correctly using calculateInactivityAugmentedLevel
    legendsList.forEach(l => {
      const normName = lNormalizeName(l.userName);
      const userResultsList = userGroups[l.userId] || userGroups[normName] || [];
      const calcRes = calculateInactivityAugmentedLevel(
        l.userId,
        userResultsList,
        activeRules,
        {
          isTestModeEnabled: inactivityTestMode,
          simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
        }
      );
      // If the user's computed level is less than 5, but they are Level 5 in their user profile (manually promoted), preserve Level 5!
      const userProfile = allUsersList?.find(u => u.id === l.userId || lNormalizeName(u.name || u.userName) === normName);
      const profileLvl = userProfile?.level || userProfile?.currentLevel || 1;
      
      const resolvedLvl = profileLvl === 5 ? 5 : calcRes.level;
      l.currentLevel = resolvedLvl;
      l.level = resolvedLvl;
    });

    // Sort matching exactly how the Admin's list is sorted!
    // Sort by daysMaintaining descending, then promoTimestamp ascending
    return legendsList.sort((a, b) => {
      const aDays = a.daysMaintaining || 0;
      const bDays = b.daysMaintaining || 0;
      if (bDays !== aDays) {
        return bDays - aDays;
      }
      const aTime = a.promoTimestamp || Infinity;
      const bTime = b.promoTimestamp || Infinity;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.totalAttempts - b.totalAttempts;
    });
  }, [resultsForRankings, levelRules, inactivityTestMode, allUsersList]);

  // Records 3T calculations based on actual results paired with historic high-standards
  const records3T = useMemo(() => {
    const BASELINE_RECORDS = {
      quyettam: {
        name: 'TRAN PHUOC TRUNG',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        date: '12/06/26',
        attemptsCount: 381,
        avgScore: 29.3,
        attempts: 161,
        avgTimeSpent: 5,
        proofText: 'Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: 381 lượt.'
      },
      tritue: {
        name: 'TRẦN VĂN TIÊN',
        dept: 'Phòng Tài chính Kế toán',
        branch: 'Văn Phòng Công Ty (TPP-CTY)',
        date: '11/06/26',
        perfectsCount: 185,
        avgScore: 30.0,
        attempts: 185,
        avgTimeSpent: 6,
        proofText: 'Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: 185 lượt.'
      },
      tocdo: {
        name: 'QUÁCH THUÝ VÂN',
        dept: 'Ban Quản đốc',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '12/06/26',
        durationPerQ: 3.8,
        avgScore: 28.5,
        attempts: 92,
        avgTimeSpent: 4,
        proofText: 'Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ 3.8 giây/câu.'
      },
      thantoc: {
        name: 'PHAN THỊ NHÀN',
        dept: 'Phòng Kế hoạch sản xuất',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '09/06/26',
        maxLevelReached: 5,
        attemptsCountToMaxLevel: 48,
        avgScore: 29.1,
        attempts: 52,
        avgTimeSpent: 6,
        proofText: 'Đạt Cấp 5 - Huyền Thoại chỉ sau 48 lượt ôn luyện!'
      },
      batbai: {
        name: 'HA HUU QUYNH',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '09/06/26',
        streak: 45,
        avgScore: 30.0,
        attempts: 112,
        avgTimeSpent: 5,
        proofText: 'Thiết lập chuỗi 45 lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.'
      },
      binhminh: {
        name: 'PHẠM VĂN ĐEN',
        dept: 'Phân xưởng 2',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        date: '14/06/26',
        timeString: '01:24',
        avgScore: 30.0,
        attempts: 2,
        avgTimeSpent: 26,
        proofText: 'Chủ động ôn luyện từ sáng tinh sương lúc 01:24 ngày 14/06/2026.'
      }
    };

    const bestQuyetTam: any = { ...BASELINE_RECORDS.quyettam, holders: [BASELINE_RECORDS.quyettam] };
    const bestTriTue: any = { ...BASELINE_RECORDS.tritue, holders: [BASELINE_RECORDS.tritue] };
    const bestTocDo: any = { ...BASELINE_RECORDS.tocdo, holders: [BASELINE_RECORDS.tocdo] };
    const bestThanToc: any = { ...BASELINE_RECORDS.thantoc, holders: [BASELINE_RECORDS.thantoc] };
    const bestBatBai: any = { ...BASELINE_RECORDS.batbai, holders: [BASELINE_RECORDS.batbai] };
    const bestBinhMinh: any = { ...BASELINE_RECORDS.binhminh, holders: [BASELINE_RECORDS.binhminh] };

    const lNormalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};
    const userIdToDeptMap: Record<string, string> = {};
    const userIdToBranchMap: Record<string, string> = {};

    resultsForRankings.forEach(res => {
      const normName = lNormalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
      if (res.userId) {
        if (res.department) userIdToDeptMap[res.userId] = res.department;
        if (res.branch) userIdToBranchMap[res.userId] = res.branch;
      }
    });

    const userGroups: Record<string, QuizResult[]> = {};
    resultsForRankings.forEach(res => {
      const normName = lNormalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';
      if (personKey === 'anonymous') return;

      if (!userGroups[personKey]) {
        userGroups[personKey] = [];
      }
      userGroups[personKey].push(res);
    });

    const activeRules = levelRules || DEFAULT_LEVEL_RULES;

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

    // 1 & 2 & 3: Kiên Trì, Trí Tuệ, Tốc Độ
    Object.entries(userGroups).forEach(([personKey, userResultsList]) => {
      const chronological = [...userResultsList].sort((a, b) => a.timestamp - b.timestamp);
      
      const attemptsCount = chronological.length;
      const totalScore = chronological.reduce((sum, r) => sum + r.score, 0);
      const userAvgScore = attemptsCount > 0 ? parseFloat((totalScore / attemptsCount).toFixed(1)) : 0;
      
      const totalDur = chronological.reduce((sum, r) => sum + (r.duration || 0), 0);
      const totalQues = chronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
      const userAvgTimeSpent = Math.max(1, Math.round(totalDur / totalQues));

      const lastRes = chronological[chronological.length - 1] || userResultsList[0];
      const dept = lastRes.department || userIdToDeptMap[personKey] || 'Bộ phận khác';
      const branch = lastRes.branch || userIdToBranchMap[personKey] || 'Chi nhánh khác';
      const userName = lastRes.userName || userIdToNameMap[personKey] || personKey;
      const dateStr = formatToDDMMYY(lastRes.timestamp);
      const normName = lNormalizeName(userName);

      const isBaselineHolder = (nameStr: string): boolean => {
        const norm = nameStr.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
        return [
          'TRAN PHUOC TRUNG',
          'TRẦN VĂN TIÊN',
          'QUÁCH THUÝ VÂN',
          'PHAN THỊ NHÀN',
          'HA HUU QUYNH',
          'PHẠM VĂN ĐEN'
        ].includes(norm);
      };

      if (attemptsCount > bestQuyetTam.attemptsCount) {
        const newHolder = {
          name: userName,
          dept,
          branch,
          date: dateStr,
          attemptsCount: attemptsCount,
          avgScore: userAvgScore,
          attempts: attemptsCount,
          avgTimeSpent: userAvgTimeSpent,
          proofText: `Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: ${attemptsCount} lượt.`
        };
        Object.assign(bestQuyetTam, newHolder, { holders: [newHolder] });
      } else if (attemptsCount === bestQuyetTam.attemptsCount) {
        const exists = bestQuyetTam.holders?.some((h: any) => lNormalizeName(h.name) === normName);
        if (!exists) {
          const onlyBaseline = bestQuyetTam.holders?.every((h: any) => isBaselineHolder(h.name));
          const newH = {
            name: userName,
            dept,
            branch,
            date: dateStr,
            attemptsCount: attemptsCount,
            avgScore: userAvgScore,
            attempts: attemptsCount,
            avgTimeSpent: userAvgTimeSpent,
            proofText: `Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: ${attemptsCount} lượt.`
          };
          if (onlyBaseline) {
            bestQuyetTam.holders = [newH];
            Object.assign(bestQuyetTam, newH);
          } else {
            bestQuyetTam.holders.push(newH);
          }
        }
      }

      const perfectsCount = chronological.filter(r => r.score === 30).length;
      if (perfectsCount > bestTriTue.perfectsCount) {
        const newHolder = {
          name: userName,
          dept,
          branch,
          date: dateStr,
          perfectsCount: perfectsCount,
          avgScore: userAvgScore,
          attempts: attemptsCount,
          avgTimeSpent: userAvgTimeSpent,
          proofText: `Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: ${perfectsCount} lượt.`
        };
        Object.assign(bestTriTue, newHolder, { holders: [newHolder] });
      } else if (perfectsCount === bestTriTue.perfectsCount && perfectsCount > 0) {
        const exists = bestTriTue.holders?.some((h: any) => lNormalizeName(h.name) === normName);
        if (!exists) {
          const onlyBaseline = bestTriTue.holders?.every((h: any) => isBaselineHolder(h.name));
          const newH = {
            name: userName,
            dept,
            branch,
            date: dateStr,
            perfectsCount: perfectsCount,
            avgScore: userAvgScore,
            attempts: attemptsCount,
            avgTimeSpent: userAvgTimeSpent,
            proofText: `Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: ${perfectsCount} lượt.`
          };
          if (onlyBaseline) {
            bestTriTue.holders = [newH];
            Object.assign(bestTriTue, newH);
          } else {
            bestTriTue.holders.push(newH);
          }
        }
      }

      if (attemptsCount >= 5) {
        const totalDuration = chronological.reduce((sum, r) => sum + (r.duration || 0), 0);
        const totalQuestions = chronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
        const avgSpeed = parseFloat((totalDuration / totalQuestions).toFixed(2));

        if (avgSpeed > 0 && avgSpeed < bestTocDo.durationPerQ) {
          const newHolder = {
            name: userName,
            dept,
            branch,
            date: dateStr,
            durationPerQ: avgSpeed,
            avgScore: userAvgScore,
            attempts: attemptsCount,
            avgTimeSpent: userAvgTimeSpent,
            proofText: `Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ ${avgSpeed.toFixed(2)} giây/câu.`
          };
          Object.assign(bestTocDo, newHolder, { holders: [newHolder] });
        } else if (avgSpeed > 0 && avgSpeed.toFixed(1) === bestTocDo.durationPerQ.toFixed(1)) {
          const exists = bestTocDo.holders?.some((h: any) => lNormalizeName(h.name) === normName);
          if (!exists) {
            const onlyBaseline = bestTocDo.holders?.every((h: any) => isBaselineHolder(h.name));
            const newH = {
              name: userName,
              dept,
              branch,
              date: dateStr,
              durationPerQ: avgSpeed,
              avgScore: userAvgScore,
              attempts: attemptsCount,
              avgTimeSpent: userAvgTimeSpent,
              proofText: `Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ ${avgSpeed.toFixed(2)} giây/câu.`
            };
            if (onlyBaseline) {
              bestTocDo.holders = [newH];
              Object.assign(bestTocDo, newH);
            } else {
              bestTocDo.holders.push(newH);
            }
          }
        }
      }

      // 4: Bất Bại limit checking
      let maxStreak = 0;
      let currentStreak = 0;
      chronological.forEach(r => {
        if (r.score === 30) {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      });
      if (maxStreak > bestBatBai.streak) {
        const newHolder = {
          name: userName,
          dept,
          branch,
          date: dateStr,
          streak: maxStreak,
          avgScore: userAvgScore,
          attempts: attemptsCount,
          avgTimeSpent: userAvgTimeSpent,
          proofText: `Thiết lập chuỗi ${maxStreak} lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.`
        };
        Object.assign(bestBatBai, newHolder, { holders: [newHolder] });
      } else if (maxStreak === bestBatBai.streak) {
        const exists = bestBatBai.holders?.some((h: any) => lNormalizeName(h.name) === normName);
        if (!exists) {
          const onlyBaseline = bestBatBai.holders?.every((h: any) => isBaselineHolder(h.name));
          const newH = {
            name: userName,
            dept,
            branch,
            date: dateStr,
            streak: maxStreak,
            avgScore: userAvgScore,
            attempts: attemptsCount,
            avgTimeSpent: userAvgTimeSpent,
            proofText: `Thiết lập chuỗi ${maxStreak} lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.`
          };
          if (onlyBaseline) {
            bestBatBai.holders = [newH];
            Object.assign(bestBatBai, newH);
          } else {
            bestBatBai.holders.push(newH);
          }
        }
      }

      // 5: Bình Minh earliest checking
      chronological.forEach(r => {
        if (r.score === 30) {
          const d = new Date(r.timestamp);
          const hours = d.getHours();
          const mins = d.getMinutes();
          if (hours >= 0 && hours < 10) {
            const timeVal = hours * 60 + mins;
            const currentBinhMinhMins = parseInt(bestBinhMinh.timeString.split(':')[0]) * 60 + parseInt(bestBinhMinh.timeString.split(':')[1]);
            if (timeVal < currentBinhMinhMins) {
              const formattedTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
              const formattedDate = formatToDDMMYY(r.timestamp);
              const fullYearForProof = formattedDate.includes('/') 
                ? (formattedDate.split('/')[2].length === 2 ? '20' + formattedDate.split('/')[2] : formattedDate.split('/')[2]) 
                : '2026';
              const dayPart = formattedDate.split('/')[0] || '14';
              const monthPart = formattedDate.split('/')[1] || '06';
              const fullDateStr = `${dayPart}/${monthPart}/${fullYearForProof}`;

              const newHolder = {
                name: r.userName || userName,
                dept: r.department || dept,
                branch: r.branch || branch,
                date: formattedDate,
                timeString: formattedTime,
                avgScore: userAvgScore,
                attempts: attemptsCount,
                avgTimeSpent: userAvgTimeSpent,
                proofText: `Chủ động ôn luyện từ sáng tinh sương lúc ${formattedTime} ngày ${fullDateStr}.`
              };
              Object.assign(bestBinhMinh, newHolder, { holders: [newHolder] });
            } else if (timeVal === currentBinhMinhMins) {
              const formattedTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
              const formattedDate = formatToDDMMYY(r.timestamp);
              const fullYearForProof = formattedDate.includes('/') 
                ? (formattedDate.split('/')[2].length === 2 ? '20' + formattedDate.split('/')[2] : formattedDate.split('/')[2]) 
                : '2026';
              const dayPart = formattedDate.split('/')[0] || '14';
              const monthPart = formattedDate.split('/')[1] || '06';
              const fullDateStr = `${dayPart}/${monthPart}/${fullYearForProof}`;

              const exists = bestBinhMinh.holders?.some((h: any) => lNormalizeName(h.name) === normName);
              if (!exists) {
                const onlyBaseline = bestBinhMinh.holders?.every((h: any) => isBaselineHolder(h.name));
                const newH = {
                  name: r.userName || userName,
                  dept: r.department || dept,
                  branch: r.branch || branch,
                  date: formattedDate,
                  timeString: formattedTime,
                  avgScore: userAvgScore,
                  attempts: attemptsCount,
                  avgTimeSpent: userAvgTimeSpent,
                  proofText: `Chủ động ôn luyện từ sáng tinh sương lúc ${formattedTime} ngày ${fullDateStr}.`
                };
                if (onlyBaseline) {
                  bestBinhMinh.holders = [newH];
                  Object.assign(bestBinhMinh, newH);
                } else {
                  bestBinhMinh.holders.push(newH);
                }
              }
            }
          }
        }
      });
    });

    // 6: Thăng Cấp Thần Tốc (First Level 5 reached since Approval/Creation Date)
    const thanTocEligibleCandidates: Array<{
      name: string;
      dept: string;
      branch: string;
      date: string;
      durationMs: number;
    }> = [];

    Object.entries(userGroups).forEach(([personKey, userResultsList]) => {
      const chronological = [...userResultsList].sort((a,b) => a.timestamp - b.timestamp);
      
      const directoryUser = allUsersList.find(u => {
        const uId = u.id || '';
        const normName = lNormalizeName(u.name);
        return uId === personKey || normName === personKey;
      });

      const approvedDateStr = directoryUser?.approvedAt || directoryUser?.createdAt;
      const approvedTime = approvedDateStr ? new Date(approvedDateStr).getTime() : (chronological[0]?.timestamp ? chronological[0].timestamp - (5 * 60 * 1000) : 0);

      let firstLevel5Timestamp = 0;
      let consecutiveMax = 0;
      let consecutiveLow = 0;
      let currentLvl = 1;

      for (let i = 0; i < chronological.length; i++) {
        const res = chronological[i];
        const score = res.score;

        if (currentLvl === 1) {
          if (score === 30) consecutiveMax++; else consecutiveMax = 0;
          const req = parseRequiredConsecutive(0, 10);
          if (consecutiveMax >= req) { currentLvl = 2; consecutiveMax = 0; consecutiveLow = 0; }
        } else if (currentLvl === 2) {
          if (score === 30) consecutiveMax++; else consecutiveMax = 0;
          const demotionMin = parseDemotionThreshold(1, 20);
          if (score < demotionMin) consecutiveLow++;
          const req = parseRequiredConsecutive(1, 10);
          if (consecutiveMax >= req) { currentLvl = 3; consecutiveMax = 0; consecutiveLow = 0; }
          else if (consecutiveLow >= 2) { currentLvl = 1; consecutiveMax = 0; consecutiveLow = 0; }
        } else if (currentLvl === 3) {
          if (score === 30) consecutiveMax++; else consecutiveMax = 0;
          const demotionMin = parseDemotionThreshold(2, 26);
          if (score < demotionMin) consecutiveLow++;
          const req = parseRequiredConsecutive(2, 10);
          if (consecutiveMax >= req) { currentLvl = 4; consecutiveMax = 0; consecutiveLow = 0; }
          else if (consecutiveLow >= 2) { currentLvl = 2; consecutiveMax = 0; consecutiveLow = 0; }
        } else if (currentLvl === 4) {
          if (score === 30) consecutiveMax++; else consecutiveMax = 0;
          const demotionMin = parseDemotionThreshold(3, 27);
          if (score < demotionMin) consecutiveLow++;
          const req = parseRequiredConsecutive(3, 10);
          if (consecutiveMax >= req) { currentLvl = 5; consecutiveMax = 0; consecutiveLow = 0; }
          else if (consecutiveLow >= 2) { currentLvl = 3; consecutiveMax = 0; consecutiveLow = 0; }
        } else if (currentLvl === 5) {
          if (score === 30) consecutiveMax++; else consecutiveMax = 0;
          const demotionMin = parseDemotionThreshold(4, 28);
          if (score < demotionMin) consecutiveLow++;
          if (consecutiveLow >= 2) { currentLvl = 4; consecutiveMax = 0; consecutiveLow = 0; }
        }

        if (currentLvl === 5) {
          firstLevel5Timestamp = res.timestamp;
          break;
        }
      }

      if (firstLevel5Timestamp > 0 && approvedTime > 0) {
        let diffMs = firstLevel5Timestamp - approvedTime;
        if (diffMs < 0) diffMs = 10 * 1000;

        const dept = chronological[chronological.length - 1]?.department || userIdToDeptMap[personKey] || 'Bộ phận khác';
        const branch = chronological[chronological.length - 1]?.branch || userIdToBranchMap[personKey] || 'Chi nhánh khác';
        const userName = chronological[chronological.length - 1]?.userName || userIdToNameMap[personKey] || personKey;

        thanTocEligibleCandidates.push({
          name: userName,
          dept,
          branch,
          date: formatToDDMMYY(firstLevel5Timestamp),
          durationMs: diffMs
        });
      }
    });

    if (thanTocEligibleCandidates.length > 0) {
      thanTocEligibleCandidates.sort((a,b) => a.durationMs - b.durationMs);
      const minDuration = thanTocEligibleCandidates[0].durationMs;
      const bestCandidates = thanTocEligibleCandidates.filter(c => Math.abs(c.durationMs - minDuration) < 60000); // within 1 minute
      
      const newHolders = bestCandidates.map(best => {
        const hours = parseFloat((best.durationMs / (3600 * 1000)).toFixed(1));
        let displayProof = '';
        if (hours < 24) {
          displayProof = `Thăng cấp Huyền thoại thâu đêm suốt sáng cực nhanh chỉ trong ${hours} giờ kể từ khi được duyệt vào app!`;
        } else {
          const days = parseFloat((hours / 24).toFixed(1));
          displayProof = `Thăng cấp Huyền thoại thâu đêm suốt sáng cực nhanh chỉ trong ${days} ngày kể từ khi được duyệt vào app!`;
        }

        const personResultsList = resultsForRankings.filter(r => {
          const rNorm = lNormalizeName(r.userName);
          const rId = r.userId || '';
          return rId === best.name || rNorm === lNormalizeName(best.name);
        });
        const tScore = personResultsList.reduce((sum, r) => sum + r.score, 0);
        const bAvgScore = personResultsList.length > 0 ? parseFloat((tScore / personResultsList.length).toFixed(1)) : 29.1;
        const bAttempts = personResultsList.length > 0 ? personResultsList.length : 52;
        const tDur = personResultsList.reduce((sum, r) => sum + (r.duration || 0), 0);
        const tQues = personResultsList.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
        const bAvgTimeSpent = personResultsList.length > 0 ? Math.max(1, Math.round(tDur / tQues)) : 6;

        return {
          name: best.name,
          dept: best.dept,
          branch: best.branch,
          date: best.date,
          maxLevelReached: 5,
          attemptsCountToMaxLevel: 48,
          avgScore: bAvgScore,
          attempts: bAttempts,
          avgTimeSpent: bAvgTimeSpent,
          proofText: displayProof
        };
      });

      Object.assign(bestThanToc, newHolders[0], { holders: newHolders });
    }

    return [
      { id: 'quyettam', title: 'Kỷ Lục Kiên Trì', emoji: '🔥', ...bestQuyetTam },
      { id: 'tritue', title: 'Kỷ Lục Trí Tuệ', emoji: '🧠', ...bestTriTue },
      { id: 'tocdo', title: 'Kỷ Lục Tốc Độ', emoji: '⚡', ...bestTocDo },
      { id: 'binhminh', title: 'Kỷ Lục Trước Bình Minh', emoji: '🌅', ...bestBinhMinh },
      { id: 'thantoc', title: 'Kỷ Lục Thần Tốc', emoji: '🚀', ...bestThanToc },
      { id: 'batbai', title: 'Kỷ Lục Bất Bại', emoji: '🛡️', ...bestBatBai }
    ];
  }, [resultsForRankings, allUsersList, levelRules]);

  // Top 5 patience calculation for Month (highest attempts inside last 30 days) with stats
  const topFivePatience = useMemo(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const monthlyResults = resultsForRankings.filter(r => r.timestamp >= thirtyDaysAgo);

    const lNormalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};
    const userIdToDeptMap: Record<string, string> = {};
    const userIdToBranchMap: Record<string, string> = {};

    resultsForRankings.forEach(res => {
      const normName = lNormalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
      if (res.userId) {
        if (res.department) userIdToDeptMap[res.userId] = res.department;
        if (res.branch) userIdToBranchMap[res.userId] = res.branch;
      }
    });

    const counts: Record<string, { 
      userName: string; 
      department: string; 
      branch: string; 
      attempts: number;
      avgScore: number;
      avgTimeSpent: number;
    }> = {};

    monthlyResults.forEach(res => {
      const normName = lNormalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';
      if (personKey === 'anonymous') return;

      if (!counts[personKey]) {
        const personResults = resultsForRankings.filter(r => {
          const rNorm = lNormalizeName(r.userName);
          return r.userId === personKey || rNorm === personKey;
        });

        const totalScore = personResults.reduce((sum, r) => sum + r.score, 0);
        const avgScore = personResults.length > 0 ? parseFloat((totalScore / personResults.length).toFixed(1)) : 0;
        
        const totalDur = personResults.reduce((sum, r) => sum + (r.duration || 0), 0);
        const totalQues = personResults.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
        const avgTimeSpent = Math.max(1, Math.round(totalDur / totalQues));

        counts[personKey] = {
          userName: resolvedNormalizedName,
          department: res.department || userIdToDeptMap[personKey] || 'Bộ phận khác',
          branch: res.branch || userIdToBranchMap[personKey] || 'Chi nhánh khác',
          attempts: 0,
          avgScore,
          avgTimeSpent
        };
      }
      counts[personKey].attempts += 1;
    });

    return Object.values(counts)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5);
  }, [resultsForRankings]);

  // Dynamically cycle record values for the Kỷ Lục 3T button bubble
  const rotatedRecordBadge = useMemo(() => {
    if (!records3T || records3T.length === 0) return '';
    const activeRecord = records3T[badgeTicker % records3T.length];
    if (!activeRecord) return '';
    if (activeRecord.id === 'quyettam') {
      return `${activeRecord.attemptsCount || activeRecord.attempts || 381}`;
    } else if (activeRecord.id === 'tritue') {
      return `${activeRecord.perfectsCount || activeRecord.attempts || 185}L`;
    } else if (activeRecord.id === 'tocdo') {
      return `${activeRecord.durationPerQ || 3.8}s`;
    } else if (activeRecord.id === 'binhminh') {
      return `${activeRecord.timeString || '01:24'}`;
    } else if (activeRecord.id === 'thantoc') {
      return `${activeRecord.attemptsCountToMaxLevel || 48}L`;
    } else if (activeRecord.id === 'batbai') {
      return `${activeRecord.streak || 45}L`;
    }
    return '';
  }, [records3T, badgeTicker]);

  // Dynamically cycle top patience attempts for the Top Kiên Trì button bubble
  const rotatedPatienceBadge = useMemo(() => {
    if (!topFivePatience || topFivePatience.length === 0) return '';
    const activePatience = topFivePatience[badgeTicker % topFivePatience.length];
    return activePatience ? `${activePatience.attempts}` : '';
  }, [topFivePatience, badgeTicker]);

  // Combined real-time Universal Honor list uniting Monument-Legends, Records-3T and Monthly Top 5 Patience
  const allHonors = useMemo(() => {
    // 1. Tượng đài Huyền thoại (🔮) - All Level 5 learners
    const list1 = monumentLegends.map((data, idx) => ({
      uniqueId: `legend-${data.userId || data.userName}-${idx}`,
      type: 'legend' as const,
      name: data.userName,
      dept: data.department,
      branch: data.branch,
      leftEmoji: '🔮',
      avgScore: data.avgScore,
      attempts: data.attempts,
      avgTimeSpent: data.avgTimeSpent,
      honorTitle: `CẤP 5 HUYỀN THOẠI`,
      proofText: 'Tượng đài thi đua vĩnh cửu đạt tối cao Cấp 5 Huyền thoại.',
      categoryTitle: '✨ TƯỢNG ĐÀI HUYỀN THOẠI (🔮)',
      categoryLabel: 'Tôn Vinh',
      currentLevel: data.currentLevel !== undefined ? data.currentLevel : (data.level !== undefined ? data.level : 5),
      daysMaintaining: data.daysMaintaining !== undefined ? data.daysMaintaining : 1
    }));

    // 2. Kỷ lục 3T (🔥, 🧠, ⚡, 🌅, 🚀, 🛡️) - record holders (flat mapped to support multi-holders)
    const list2: any[] = [];
    records3T.forEach((r, idx) => {
      const holdersList = r.holders && r.holders.length > 0 ? r.holders : [r];
      holdersList.forEach((h: any, hIdx: number) => {
        list2.push({
          uniqueId: `record-${r.id}-${idx}-${hIdx}`,
          type: 'record' as const,
          name: h.name,
          dept: h.dept,
          branch: h.branch,
          leftEmoji: r.emoji,
          avgScore: h.avgScore ?? r.avgScore ?? 29.3,
          attempts: h.attempts ?? h.attemptsCount ?? r.attempts ?? r.attemptsCount ?? 161,
          avgTimeSpent: h.avgTimeSpent ?? r.avgTimeSpent ?? 5,
          honorTitle: r.title,
          proofText: h.proofText ?? r.proofText,
          categoryTitle: '✨ KỶ LỤC 3T HỆ THỐNG',
          categoryLabel: 'Kỷ Lục'
        });
      });
    });

    // 3. Top 5 Kiên trì (Tháng)
    const list3 = topFivePatience.map((cand, idx) => ({
      uniqueId: `patience-${cand.userName}-${idx}`,
      type: 'patience' as const,
      name: cand.userName,
      dept: cand.department,
      branch: cand.branch,
      leftEmoji: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⚔️',
      avgScore: cand.avgScore,
      attempts: cand.attempts,
      avgTimeSpent: cand.avgTimeSpent,
      honorTitle: 'CHIẾN BINH KIÊN TRÌ',
      proofText: `Hoàn thành xuất sắc ${cand.attempts} lượt ôn luyện thi đua trong tháng qua.`,
      categoryTitle: '✨ TOP 5 KIÊN TRÌ LUYỆN TẬP',
      categoryLabel: 'Kiên Trì: Tháng'
    }));

    return [...list1, ...list2, ...list3];
  }, [monumentLegends, records3T, topFivePatience]);

  // Derived active item for the sequential Board of Honor carousel:
  // - Displays TỪNG nhân viên in monumentLegends first, then TỪNG kỷ lục in records3T, then TỪNG nhân viên in topFivePatience
  // Standard loop index calculation: index % totalItems to prevent skipping
  const activeItem = useMemo(() => {
    const total = allHonors.length;
    if (total === 0) return null;
    const index = carouselGlobalIndex % total;
    return {
      ...allHonors[index],
      total,
      index
    };
  }, [carouselGlobalIndex, allHonors]);

  // Unified automatic Board of Honor carousel rotation:
  // Displays each item slide-by-slide for exactly 5 seconds.
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselGlobalIndex(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Calculate stats for today's participants
  const participantsTodayCount = useMemo(() => {
    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayResults = allResults.filter(r => r.timestamp >= startOfTodayMs);
    return new Set(todayResults.map(r => r.userId || r.userName)).size;
  }, [allResults]);

  const attemptsTodayCount = useMemo(() => {
    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return allResults.filter(r => r.timestamp >= startOfTodayMs).length;
  }, [allResults]);

  const deptAttemptsTodayCount = useMemo(() => {
    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayResults = allResults.filter(r => r.timestamp >= startOfTodayMs);
    
    if (user.role === 'admin') {
      return todayResults.length;
    }
    
    const deptNorm = (user.department || '').trim().toLowerCase();
    if (deptNorm === 'ban tổng giám đốc' || user.role === 'executive') {
      return todayResults.length;
    } else if (deptNorm === 'ban giám đốc') {
      return todayResults.filter(r => r.branch === user.branch).length;
    } else {
      return todayResults.filter(r => r.branch === user.branch && r.department === user.department).length;
    }
  }, [allResults, user.role, user.branch, user.department]);

  // AI Image extraction states (simulated inside smartphone viewport for admins)
  const [selectedImages, setSelectedImages] = useState<{ file: File; compressedBase64: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [aiNotice, setAiNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Handle Approving a user
  const handleApproveUser = async (userId: string) => {
    try {
      const approvedUser = deptUsers.find(u => u.id === userId);
      const name = approvedUser ? approvedUser.name : 'Nhân viên mới';
      
      await databaseService.updateUser(userId, { status: 'approved', approvedAt: new Date().toISOString() });
      
      // Post system announcement
      await databaseService.saveAnnouncement({
        id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        userName: name,
        type: 'new_user',
        detail: `vừa được ban quản trị phê duyệt gia nhập đại gia đình học tập & thi đua Văn Hóa 3T! Chào mừng đồng nghiệp mới! 🎉`,
        timestamp: Date.now()
      });

      const freshRes = await databaseService.getQuizResults(false, true);
      setAllResults(freshRes);
    } catch (err) {
      console.error("Lỗi khi duyệt nhân viên:", err);
    }
  };

  // Handle Rejecting / Blocking a user
  const handleRejectUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'rejected' });
      const freshRes = await databaseService.getQuizResults(false, true);
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
                    {item.role !== 'admin' && (user.role === 'admin' || user.role === 'executive') && (
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

                  {item.role !== 'admin' && (user.role === 'admin' || user.role === 'executive') && (
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
            users={user.role === 'approver' ? allUsersList : deptUsers} 
            results={
              user.role === 'admin' || user.role === 'approver'
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
            isApprover={user.role === 'approver'}
            allUsers={allUsersList}
            allResults={allResults}
          />
        </div>
      </div>
    );
  };

  const renderMobileNotificationsPanel = () => {
    // Group announcements cleanly or sort
    const sortedAnns = [...allAnnouncements].sort((a, b) => b.timestamp - a.timestamp);

    const handlePublishBroadcast = async () => {
      if (!newBroadcastText.trim()) return;
      const trimmedText = newBroadcastText.trim();
      try {
        await databaseService.saveAnnouncement({
          id: 'ann_broad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          userName: user.name,
          type: 'admin_broadcast',
          detail: trimmedText,
          timestamp: Date.now()
        });
        
        // Cập nhật lên chữ chạy hệ thống
        await databaseService.saveSystemAnnouncement(trimmedText);

        setNewBroadcastText('');
        // Show success alert
        setAdminMobileNotice({ type: 'success', msg: 'Đăng thông báo ban quản trị thành công!' });
        setTimeout(() => setAdminMobileNotice(null), 3000);
      } catch (err) {
        console.error("Lỗi khi đăng thông báo:", err);
        setAdminMobileNotice({ type: 'error', msg: 'Có lỗi xảy ra khi đăng thông báo!' });
        setTimeout(() => setAdminMobileNotice(null), 3000);
      }
    };

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3 shrink-0">
          <button
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#D9480F] uppercase tracking-wide flex items-center gap-1">
            <Bell className="h-4 w-4 text-orange-500 animate-swing" />
            NHẬT KÝ THÔNG BÁO
          </span>
          <div className="w-10 text-[9px] text-[#0B3A60] font-bold text-right">
            {allAnnouncements.length} tin
          </div>
        </div>

        {/* Success / Error notification */}
        {adminMobileNotice && (
          <div className={`text-center py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-tight mb-2 shrink-0 animate-fade-in ${
            adminMobileNotice.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {adminMobileNotice.msg}
          </div>
        )}

        {/* Content Body with overflow scrolling */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 pb-4">

          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 shadow-3xs shrink-0 font-sans">
            {isEditingAnnouncement ? (
              <div className="flex flex-col gap-2.5">
                <div className="text-[10px] font-black uppercase text-[#D9480F] tracking-wide flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5 text-amber-500 animate-swing" />
                  SỬA THÔNG BÁO CHỮ CHẠY HỆ THỐNG
                </div>
                <div>
                  <label className="block text-[9px] text-orange-850 uppercase font-bold tracking-wider mb-1">Nội dung thông báo</label>
                  <input
                    type="text"
                    value={announcementEditText}
                    onChange={(e) => setAnnouncementEditText(e.target.value)}
                    className="w-full text-xs p-2 border border-amber-300 rounded-lg bg-white font-sans text-slate-800 focus:outline-none focus:border-amber-500"
                    placeholder="Nhập thông báo hiển thị cho toàn bộ hệ thống..."
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-orange-850 uppercase font-bold tracking-wider mb-0.5">Tốc độ (giây)</label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={announcementEditSpeed}
                      onChange={(e) => setAnnouncementEditSpeed(Math.max(5, parseInt(e.target.value) || 35))}
                      className="w-full text-xs p-1.5 border border-amber-300 rounded-lg bg-white font-sans text-slate-800 text-center focus:outline-none"
                    />
                    <span className="text-[8px] text-gray-400 block mt-0.5">Thời gian/vòng (nhỏ = nhanh)</span>
                  </div>
                  <div>
                    <label className="block text-[9px] text-orange-850 uppercase font-bold tracking-wider mb-0.5">Khoảng cách (px)</label>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={announcementEditGap}
                      onChange={(e) => setAnnouncementEditGap(Math.max(10, parseInt(e.target.value) || 32))}
                      className="w-full text-xs p-1.5 border border-amber-300 rounded-lg bg-white font-sans text-slate-800 text-center focus:outline-none"
                    />
                    <span className="text-[8px] text-gray-400 block mt-0.5">Khoảng cách lặp (px)</span>
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 mt-1">
                  <button
                    onClick={() => {
                      setAnnouncementEditText(systemAnnouncement);
                      setAnnouncementEditSpeed(systemAnnouncementSpeed);
                      setAnnouncementEditGap(systemAnnouncementGap);
                      setIsEditingAnnouncement(false);
                    }}
                    className="px-3 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg active:scale-95 transition-all text-center shrink-0 cursor-pointer"
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
                        // Add log to announcements only if not empty
                        if (trimmedText) {
                          await databaseService.saveAnnouncement({
                            id: 'ann_sys_' + Date.now(),
                            userName: user.name,
                            type: 'admin_broadcast',
                            detail: trimmedText,
                            timestamp: Date.now()
                          });
                        }
                        setIsEditingAnnouncement(false);
                        setAdminMobileNotice({ 
                          type: 'success', 
                          msg: trimmedText ? 'Đã lưu cấu hình thông báo chữ chạy!' : 'Đã tắt thông báo chữ chạy!' 
                        });
                        setTimeout(() => setAdminMobileNotice(null), 3000);
                      } catch (err) {
                        console.error("Lỗi:", err);
                        setAdminMobileNotice({ type: 'error', msg: 'Không thể lưu cấu hình mới!' });
                        setTimeout(() => setAdminMobileNotice(null), 3000);
                      }
                    }}
                    className="px-3 py-1 bg-[#2B8A3E] text-white text-[10px] font-bold rounded-lg active:scale-95 transition-all text-center shrink-0 cursor-pointer"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase text-[#D9480F] tracking-wide flex items-center gap-1">
                    <Bell className="h-3.5 w-3.5 text-amber-500 animate-swing" />
                    THÔNG BÁO NỔI BẬT HỆ THỐNG
                  </div>
                  {/* Edit Pencil icon for admin */}
                  {(user.role === 'admin' || user.role === 'executive') && (
                    <button
                      onClick={() => {
                        setAnnouncementEditText(systemAnnouncement);
                        setAnnouncementEditSpeed(systemAnnouncementSpeed);
                        setAnnouncementEditGap(systemAnnouncementGap);
                        setIsEditingAnnouncement(true);
                      }}
                      className="p-1 rounded-md bg-amber-100 hover:bg-amber-200/80 active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1 text-[10px] text-amber-700 font-bold"
                      title="Sửa thông báo hệ thống"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Sửa</span>
                    </button>
                  )}
                </div>
                <div className="bg-white/70 border border-amber-100/60 p-2.5 rounded-lg space-y-1.5">
                  <p translate="no" className={`notranslate text-xs font-semibold leading-relaxed font-sans ${systemAnnouncement.trim() ? 'text-slate-800' : 'text-gray-400 italic'}`}>
                    {systemAnnouncement.trim() ? systemAnnouncement : "(Đã tắt thông báo chữ chạy - Để trống)"}
                  </p>
                  <div className="flex justify-between items-center text-[8.5px] text-gray-500 font-bold font-sans border-t border-amber-100/30 pt-1.5">
                    <span>⏱️ Chạy: {systemAnnouncementSpeed} giây/vòng</span>
                    <span>📏 Khoảng cách: {systemAnnouncementGap}px</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Post notification box (Admin only) */}
          {user.role === 'admin' && (
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg shrink-0 font-sans shadow-3xs">
              <div className="text-[10px] font-black uppercase text-[#0B3A60] mb-1.5 tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-500" />
                Đăng thông báo từ Ban quản trị
              </div>
              <textarea
                value={newBroadcastText}
                onChange={(e) => setNewBroadcastText(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-sans text-slate-800 leading-normal"
                rows={2}
                placeholder="Ví dụ: Chú ý: Cập nhật tài liệu văn hóa mới hoặc có thay đổi thời gian thi đua..."
              />
              <div className="flex justify-end mt-1.5">
                <button
                  onClick={handlePublishBroadcast}
                  className="px-3.5 py-1.5 text-[10px] font-black text-white bg-[#0B3A60] hover:bg-[#1C7ED6] border-b-2 border-[#092B47] hover:border-[#1A6EB4] active:scale-95 transition-all rounded-lg cursor-pointer flex items-center gap-1 shadow-3xs"
                >
                  <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
                  <span>Đăng Thông Báo Nóng</span>
                </button>
              </div>
            </div>
          )}

          {/* List display */}
          <div className="space-y-2">
            {sortedAnns.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs font-sans">
                Hiện tại không có thông báo nào được lưu nhận.
              </div>
            ) : (
              sortedAnns.map((ann, idx) => {
                const dateStr = formatDate(ann.timestamp);
                
                // Style variables based on type
                let cardStyle = "bg-slate-50 border border-slate-150";
                let iconBg = "bg-slate-300 text-slate-700";
                let badgeText = "Hệ thống";
                let badgeStyle = "bg-slate-100 text-slate-650 border border-slate-250";
                let textStyle = "text-slate-850";
                let userDisplay = ann.userName || "Admin";
                const isLNT = ann.userName && (ann.userName.trim().normalize('NFC').toUpperCase() === 'LÊ NHẬT TRƯỜNG' || ann.userName.trim().normalize('NFC').toUpperCase() === 'LE NHAT TRUONG');

                if (ann.type === 'admin_broadcast') {
                  cardStyle = "bg-[#FFF9DB] border-l-4 border-l-[#F59F00] border-y border-r border-[#FFE066] shadow-3xs";
                  iconBg = "bg-[#FFE066] text-[#F59F00]";
                  badgeText = "Ban Quản Trị";
                  badgeStyle = "bg-[#FFE066] text-[#E67E22] border border-[#FFE066]";
                  textStyle = "text-slate-900 font-semibold";
                } else if (ann.type === 'record_broken') {
                  cardStyle = "bg-[#FFF3E0] border border-[#FFE0B2] shadow-3xs";
                  iconBg = "bg-[#FFE0B2] text-[#E65100]";
                  badgeText = "Kỷ Lục";
                  badgeStyle = "bg-[#FFE0B2] text-[#E65100]";
                  textStyle = "text-[#E65100]";
                } else if (ann.type === 'level_5') {
                  cardStyle = "bg-[#F3F0FF] border border-[#D0BFFF]";
                  iconBg = "bg-[#E5DBFF] text-[#7048E8]";
                  badgeText = "Huyền Thoại";
                  badgeStyle = "bg-[#E5DBFF] text-[#5F3DC4]";
                  textStyle = "text-[#5F3DC4] font-semibold";
                } else if (ann.type === 'promotion') {
                  cardStyle = "bg-[#EBFBEE] border border-[#C3FA50]";
                  iconBg = "bg-[#D3F9D8] text-[#2B8A3E]";
                  badgeText = "Thăng Cấp";
                  badgeStyle = "bg-[#D3F9D8] text-[#2B8A3E]";
                  textStyle = "text-[#2B8A3E]";
                } else if (ann.type === 'demotion') {
                  cardStyle = "bg-[#FFF5F5] border border-[#FFC9C9]";
                  iconBg = "bg-[#FFE3E3] text-[#FA5252]";
                  badgeText = "Hạ Cấp";
                  badgeStyle = "bg-[#FFE3E3] text-[#E03131]";
                  textStyle = "text-[#C92A2A]";
                } else if (ann.type === 'new_user') {
                  cardStyle = "bg-[#E3FAF2] border border-[#A9E34B]";
                  iconBg = "bg-[#C3FAE8] text-[#0CA678]";
                  badgeText = "Gia Nhập";
                  badgeStyle = "bg-[#C3FAE8] text-[#0CA678]";
                  textStyle = "text-[#087F5B]";
                } else if (ann.type === 'new_questions') {
                  cardStyle = "bg-[#E7F5FF] border border-[#A5D8FF]";
                  iconBg = "bg-[#D0EBFF] text-[#228BE6]";
                  badgeText = "Đề Thi";
                  badgeStyle = "bg-[#D0EBFF] text-[#1C7ED6]";
                  textStyle = "text-[#1C7ED6]";
                }

                return (
                  <div key={idx} className={`${cardStyle} rounded-lg p-2.5 flex gap-2.5 items-start font-sans transition-all hover:scale-[1.01]`}>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${iconBg} shadow-3xs`}>
                      <Bell className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap font-sans">
                        {isLNT ? (
                          <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 bg-[#FFE066] text-[#E67E22] border border-[#FFE066]">
                            BAN QUẢN TRỊ
                          </span>
                        ) : (
                          <>
                            <span translate="no" className="notranslate text-xs font-black text-slate-800">{userDisplay}</span>
                            <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 ${badgeStyle}`}>
                              {badgeText}
                            </span>
                          </>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono ml-auto">{dateStr}</span>
                        {(user.role === 'admin' || user.role === 'executive') && (
                          <div className="flex items-center gap-1.5 ml-1 select-none shrink-0">
                            {mobileDeletingAnnId === ann.id ? (
                              <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 animate-fade-in font-sans">
                                <span className="text-[8.5px] font-extrabold text-red-650 uppercase">Xóa?</span>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await databaseService.deleteAnnouncement(ann.id);
                                      setAllAnnouncements(prev => prev.filter(item => item.id !== ann.id));
                                      setAdminMobileNotice({ type: 'success', msg: 'Xóa thông báo thành công!' });
                                      setTimeout(() => setAdminMobileNotice(null), 3000);
                                    } catch (err) {
                                      console.error("Lỗi khi xóa:", err);
                                      setAdminMobileNotice({ type: 'error', msg: 'Có lỗi xảy ra khi xóa thông báo!' });
                                      setTimeout(() => setAdminMobileNotice(null), 3000);
                                    } finally {
                                      setMobileDeletingAnnId(null);
                                    }
                                  }}
                                  className="px-1 text-[8.5px] py-px font-black bg-red-600 hover:bg-red-700 text-white rounded transition-all cursor-pointer"
                                  title="Đồng ý xóa"
                                >
                                  Có
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMobileDeletingAnnId(null);
                                  }}
                                  className="px-1 text-[8.5px] py-px font-black bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-all cursor-pointer"
                                  title="Hủy bỏ"
                                >
                                  Không
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setMobileEditingAnnId(ann.id);
                                    setMobileEditingAnnText(ann.detail || '');
                                  }}
                                  className="p-1 rounded bg-sky-50 text-sky-600 hover:bg-sky-100 active:scale-95 transition-all cursor-pointer"
                                  title="Sửa thông báo"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setMobileDeletingAnnId(ann.id);
                                  }}
                                  className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                                  title="Xóa thông báo"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {mobileEditingAnnId === ann.id ? (
                        <div className="mt-2 space-y-1.5 w-full font-sans">
                          <textarea
                            value={mobileEditingAnnText}
                            onChange={(e) => setMobileEditingAnnText(e.target.value)}
                            className="w-full text-xs p-2 border border-blue-300 rounded-lg bg-white font-sans text-slate-800 leading-normal focus:outline-none focus:border-blue-500"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5 mt-1">
                            <button
                              onClick={() => {
                                setMobileEditingAnnId(null);
                                setMobileEditingAnnText('');
                              }}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-bold rounded-md active:scale-95 transition-all text-center cursor-pointer flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              <span>Hủy</span>
                            </button>
                            <button
                              onClick={async () => {
                                if (!mobileEditingAnnText.trim()) return;
                                const cleanedText = mobileEditingAnnText.trim();
                                try {
                                  const updatedAnn = {
                                    ...ann,
                                    detail: cleanedText
                                  };
                                  await databaseService.saveAnnouncement(updatedAnn);

                                  // Đồng bộ sang chữ chạy hệ thống nếu đây là dạng thông báo quản trị (loại admin_broadcast hoặc id dạng ann_sys_)
                                  if (ann.type === 'admin_broadcast' || ann.id?.startsWith('ann_sys_') || ann.id?.startsWith('ann_broad_')) {
                                    await databaseService.saveSystemAnnouncement(cleanedText);
                                  }

                                  setMobileEditingAnnId(null);
                                  setMobileEditingAnnText('');
                                  setAdminMobileNotice({ type: 'success', msg: 'Cập nhật thông báo thành công!' });
                                  setTimeout(() => setAdminMobileNotice(null), 3000);
                                } catch (err) {
                                  console.error("Lỗi cập nhật:", err);
                                  setAdminMobileNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật!' });
                                  setTimeout(() => setAdminMobileNotice(null), 3000);
                                }
                              }}
                              className="px-2.5 py-1 bg-[#2B8A3E] hover:bg-[#237032] text-white text-[9px] font-bold rounded-md active:scale-95 transition-all text-center cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Lưu</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-xs mt-1 leading-normal ${textStyle}`}>
                          <span translate="no" className="notranslate">
                            {ann.detail ? (ann.detail.charAt(0).toUpperCase() + ann.detail.slice(1)) : ""}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    );
  };

  const renderMobilePersonalPanel = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3 shrink-0">
          <button
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            TIẾN ĐỘ CÁ NHÂN
          </span>
          <div className="w-10" />
        </div>

        {/* Content Body with overflow scrolling */}
        <div className="flex-1 overflow-y-auto pr-0.5 pb-4">
          <PersonalStats 
            users={deptUsers} 
            results={resultsForRankings} 
            levelRulesFromCloud={levelRules} 
          />
        </div>
      </div>
    );
  };

  const renderMobileLegendsPanel = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3 shrink-0">
          <button
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-amber-600 uppercase tracking-wide">
            🔮 TƯỢNG ĐÀI HUYỀN THOẠI
          </span>
          <div className="w-10" />
        </div>

        {/* Content Body with overflow scrolling */}
        <div className="flex-1 overflow-y-auto pr-0.5 pb-4 space-y-2">
          <div className="bg-amber-50/50 border border-amber-250/30 rounded-lg p-2.5 text-[11px] text-amber-900 leading-normal mb-2">
            ✨ Tôn vinh các học viên thi đua vĩnh cửu đạt tối cao <strong>Cấp 5 Huyền thoại</strong> trong hệ thống ôn tập Quiz 3T Mastery.
          </div>
          {monumentLegends.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs italic">Chưa có ai đạt cấp 5 Huyền thoại</div>
          ) : (
            monumentLegends.map((legend, idx) => {
              const isDemoted = (legend.currentLevel !== undefined ? legend.currentLevel : legend.level) < 5;
              const coronationsCount = legend.coronations?.length || 1;
              const promoDateStr = legend.promoTimestamp ? new Date(legend.promoTimestamp).toLocaleDateString('vi-VN') : 'N/A';

              return (
                <div key={idx} className="bg-gradient-to-br from-amber-50/20 via-white to-amber-50/5 border border-amber-200/50 hover:border-amber-400/80 p-3 rounded-xl flex items-start gap-3 transition-all shadow-4xs">
                  <div className="h-6 w-6 rounded-full bg-amber-100 border border-amber-250 flex items-center justify-center text-[11px] font-black text-amber-800 shrink-0 select-none font-mono">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0 font-sans">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1 min-w-0">
                        <span className="truncate">{legend.userName}</span>
                        <span className="text-xs shrink-0">🔮</span>
                      </div>
                      
                      {/* Maintaining Position Days Badge */}
                      <div className="shrink-0">
                        {isDemoted ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-slate-50 text-slate-450 border border-slate-200/60 whitespace-nowrap">
                            {legend.daysMaintaining} ngày ⏸️
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-black bg-amber-50 text-amber-800 border border-amber-200/50 whitespace-nowrap">
                            {legend.daysMaintaining} ngày
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-[zinc-650] font-bold mt-0.5 leading-tight">{legend.department}</div>
                    <div className="text-[9.5px] text-zinc-400 truncate font-medium">{legend.branch}</div>
                    
                    {/* Thăng cấp and Coronation status information row */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-dashed border-gray-100 text-[9px] text-slate-500 font-sans">
                      <div className="flex items-center gap-1">
                        <span>Thăng cấp:</span>
                        <span className="text-slate-800 font-extrabold font-mono">{promoDateStr}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-100/60 px-1.5 py-0.5 rounded font-sans font-black text-amber-800 text-[8.5px] uppercase">
                        👑 {coronationsCount} lần thăng cấp
                      </div>
                    </div>

                    {/* Highly detailed stat boxes (matching Admin Stats metrics) */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2 text-center text-[9px] font-mono">
                      <div className="bg-slate-50 border border-slate-100 p-1.5 rounded">
                        <div className="text-gray-400 font-bold uppercase text-[7px] tracking-wider">Lượt Thi</div>
                        <div className="font-extrabold text-slate-800 mt-0.2">{legend.attempts} lượt</div>
                      </div>
                      <div className="bg-amber-50/60 border border-amber-100/50 p-1.5 rounded">
                        <div className="text-amber-700 font-bold uppercase text-[7px] tracking-wider">Đạt Tối Đa</div>
                        <div className="font-extrabold text-amber-800 mt-0.2">{legend.bestScore || 30}đ</div>
                      </div>
                      <div className="bg-blue-50/60 border border-blue-100/50 p-1.5 rounded">
                        <div className="text-blue-700 font-bold uppercase text-[7px] tracking-wider">Trung Bình</div>
                        <div className="font-extrabold text-blue-800 mt-0.2">{legend.avgScore}đ</div>
                      </div>
                    </div>

                    {/* Reflex/Action time duration statistic row */}
                    <div className="mt-1.5 text-center text-[8.5px] bg-[#FAF9F6] border border-amber-100/30 py-0.5 rounded text-amber-900 font-semibold font-mono">
                      Phản xạ: <span className="font-bold text-amber-950">{Math.round(legend.overallAvgDurationPerQuestion || legend.avgTimeSpent || 5)}s/câu</span>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderMobileRecordsPanel = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3 shrink-0">
          <button
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-yellow-600 uppercase tracking-wide">
            🏆 KỶ LỤC 3T MASTER
          </span>
          <div className="w-10" />
        </div>

        {/* Content Body with overflow scrolling */}
        <div className="flex-1 overflow-y-auto pr-0.5 pb-4 space-y-2.5">
          <div className="bg-yellow-50/50 border border-yellow-250/25 rounded-lg p-2.5 text-[11px] text-yellow-950 leading-normal mb-1">
            🔥 Ghi nhận các thành tích <strong>kỷ lục vô tiền khoáng hậu</strong> của các học viên xuất sắc nhất trên toàn hệ thống thời gian thực.
          </div>
          {records3T.map((rec, idx) => {
            const holders = rec.holders && rec.holders.length > 0 ? rec.holders : [rec];
            return (
              <div key={idx} className="bg-gradient-to-br from-amber-50/20 via-white to-yellow-50/5 border-2 border-amber-100 p-2.5 rounded-xl shadow-3xs relative overflow-hidden flex flex-col gap-1.5">
                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-amber-400/5 pointer-events-none" />
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="text-[10px] font-black uppercase text-amber-805 bg-amber-100 px-2 py-0.5 rounded border border-amber-250">
                    {rec.emoji} {rec.title}
                  </span>
                  <span className="text-[8.5px] font-mono text-gray-400">{rec.date}</span>
                </div>
                
                {/* List of Holders */}
                <div className="space-y-1.5 mt-1 border-l-2 border-amber-300 pl-2">
                  {holders.map((holder: any, hIdx: number) => (
                    <div key={hIdx} className="flex flex-col">
                      <div className="text-xs font-black text-gray-800 uppercase tracking-tight flex items-center gap-1.5">
                        <span>{holder.name}</span>
                        {holders.length > 1 && (
                          <span className="text-[7.5px] font-black text-amber-700 bg-amber-100/70 px-1 py-0.5 rounded border border-amber-200">
                            ĐỒNG KỶ LỤC
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-gray-500 font-semibold leading-none mt-0.5">
                        {holder.dept} &bull; <span className="text-gray-450 font-normal">{holder.branch}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50/40 border border-amber-200/30 rounded p-2 text-[10.5px] font-sans text-amber-900 leading-normal italic mt-1 font-medium">
                  &ldquo;{rec.proofText}&rdquo;
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMobilePatiencePanel = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3 shrink-0">
          <button
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-orange-600 uppercase tracking-wide">
            🔥 TOP KIÊN TRÌ CHUYÊN CẦN
          </span>
          <div className="w-10" />
        </div>

        {/* Content Body with overflow scrolling */}
        <div className="flex-1 overflow-y-auto pr-0.5 pb-4 space-y-2">
          <div className="bg-orange-50/50 border border-orange-250/25 rounded-lg p-2.5 text-[11px] text-orange-950 leading-normal mb-2">
            ⚡ Vinh danh 5 chiến binh bỉ bỉ kiên cường có số lượt thực hiện ôn thi cao nhất trong vòng <strong>30 ngày qua</strong>.
          </div>
          {topFivePatience.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs italic">Chưa có dữ liệu thống kê kiên trì</div>
          ) : (
            topFivePatience.map((cand, idx) => (
              <div key={idx} className="bg-gradient-to-br from-orange-50/15 via-white to-orange-50/5 border border-orange-200/40 hover:border-orange-400/60 p-2.5 rounded-lg flex items-start gap-2.5 transition-all shadow-3xs">
                <div className="h-7 w-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-xs font-black text-orange-700 shrink-0 select-none">
                  {idx === 0 ? '👑' : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center justify-between w-full">
                    <span>{cand.userName}</span>
                    <span className="text-xs font-mono font-black text-orange-600 bg-orange-55 px-1.5 py-0.5 rounded">{cand.attempts} lượt</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{cand.department}</div>
                  <div className="text-[9.5px] text-gray-450 truncate">{cand.branch}</div>
                  <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1 text-center text-[9px] font-mono border-t border-dashed border-gray-100">
                    <div className="text-left text-gray-400">Điểm TB: <strong className="text-gray-700">{cand.avgScore}đ</strong></div>
                    <div className="text-right text-gray-400">Phản xạ TB: <strong className="text-gray-700">{cand.avgTimeSpent}giây/câu</strong></div>
                  </div>
                </div>
              </div>
            ))
          )}
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

  const renderMobileDetailsPanel = () => {
    if (adminSelectedUserId) {
      const selectedEmp = deptUsers.find(u => u.id === adminSelectedUserId);
      if (!selectedEmp) {
        return (
          <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs">
            <button
              onClick={() => setAdminSelectedUserId(null)}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 self-start mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>
            <div className="text-center py-8 text-gray-450 text-xs italic">
              Không tìm thấy nhân viên
            </div>
          </div>
        );
      }

      const empResults = allResults.filter(r => 
        (r.userId && r.userId === selectedEmp.id) || 
        (selectedEmp.phone && r.userId === selectedEmp.phone) || 
        (r.userName && r.userName.toLowerCase().trim() === selectedEmp.name.toLowerCase().trim())
      );
      const chronologicalResults = [...empResults].sort((a, b) => b.timestamp - a.timestamp);
      
      const state = calculateInactivityAugmentedLevel(
        selectedEmp.id, 
        empResults, 
        levelRules || DEFAULT_LEVEL_RULES,
        {
          isTestModeEnabled: inactivityTestMode,
          simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
        }
      );
      
      const activeRules = levelRules || DEFAULT_LEVEL_RULES;
      const currentLvlRules = activeRules.levels.find(l => l.level === state.level) || activeRules.levels[state.level - 1] || { name: `Cấp ${state.level}`, emoji: '🌱', promotion: '', demotion: '' };

      const getRequiredForPromotion = () => {
        const text = currentLvlRules.promotion || '';
        const match = text.match(/liên\s+tục\s+(\d+)\s+lượt/i) || 
                      text.match(/(\d+)\s+lượt\s+liên\s+tục/i) || 
                      text.match(/(\d+)\s+lượt/i);
        return match ? parseInt(match[1], 10) : 10;
      };
      const requiredConsecutive = getRequiredForPromotion();

      return (
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs overflow-hidden text-left font-sans">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 shrink-0">
            <button
              onClick={() => setAdminSelectedUserId(null)}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>
            <span className="text-[12px] font-extrabold text-[#0B3A60] uppercase tracking-wide truncate max-w-[180px]">
              {selectedEmp.name}
            </span>
            <button
              onClick={() => setAdminMobileTab('home')}
              className="text-[10px] font-bold text-gray-400 hover:text-gray-600 px-1.5 py-1"
            >
              Sảnh chính
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-0.5 pb-4 space-y-4">
            {/* Selected Employee Info */}
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-[11px] leading-relaxed text-gray-600">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Mã NV: {selectedEmp.employeeId || 'N/A'}</span>
                <span>ĐT: {selectedEmp.phone || 'N/A'}</span>
              </div>
              <div className="text-slate-500 font-medium mt-0.5">
                {selectedEmp.department} | {selectedEmp.branch}
              </div>
            </div>

            {/* Micro-metrics Grid: Level, promotion progress, attempts today */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 border border-slate-150 bg-slate-50/50 rounded-lg flex items-center gap-1.5 min-w-0">
                <span className="text-xl shrink-0">{currentLvlRules.emoji || '🌱'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold text-slate-550 uppercase tracking-wider">Hàng Hiện Tại</p>
                  <p className="text-[10px] font-extrabold text-slate-850 truncate">{currentLvlRules.name}</p>
                </div>
              </div>

              <div className="p-2 border border-slate-150 bg-slate-50/50 rounded-lg flex flex-col justify-center min-w-0">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Hôm nay</p>
                <p className="text-[10px] font-extrabold text-slate-850">
                  {state.attemptsToday} / 2 lượt thi
                </p>
              </div>
            </div>

            {/* Promotion progress banner */}
            <div className="p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-lg text-[10px]">
              <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
                <span>Tiến trình thăng cấp (30₫ tối đa)</span>
                {state.level === 5 ? (
                  <span className="text-violet-700">Tối cao 🏆</span>
                ) : (
                  <span>{state.consecutiveMax} / {requiredConsecutive}</span>
                )}
              </div>
              {state.level < 5 && (
                <div className="w-full bg-emerald-150 rounded-full h-1 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-1 rounded-full transition-all duration-350"
                    style={{ width: `${Math.min(100, (state.consecutiveMax / requiredConsecutive) * 100)}%` }}
                  />
                </div>
              )}
            </div>

             {/* Inactivity alert text */}
             <div className="text-[9.5px]">
               {state.inactiveDaysWarning ? (
                 <div className="text-red-700 bg-red-50 border border-red-100 p-2 rounded-lg font-bold flex items-center gap-1.5 animate-pulse">
                   <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                   {state.level === 5 && getVietnamDateString() >= '2026-06-17' ? (
                     <span>Huyền Thoại: Chưa đạt chuẩn giữ hạng (Cần ≥ 2 lượt & điểm TB ≥ 20/30đ)!</span>
                   ) : (
                     <span>Nguy cơ bị hạ cấp thứ hạng vào 0h00 nếu không đủ 02 lượt!</span>
                   )}
                 </div>
               ) : (
                 <div className="text-green-700 bg-green-50/60 border border-green-100 p-2 rounded-lg font-bold flex items-center gap-1.5">
                   <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                   {state.level === 5 && getVietnamDateString() >= '2026-06-17' ? (
                     <span>Huyền Thoại: Đã hoàn tất bảo trì giữ hạng (≥ 2 lượt & điểm TB ≥ 20) hôm nay!</span>
                   ) : (
                     <span>Đã hoàn tất 2 lượt ôn tập tối thiểu hôm nay!</span>
                   )}
                 </div>
               )}
             </div>

            {/* overall metrics display box */}
            <div className="grid grid-cols-2 gap-2 bg-gray-50/50 border border-gray-150 p-2 rounded-lg text-[10px]">
              <div>
                <span className="text-gray-400 font-semibold block">TỔNG LƯỢT THI:</span>
                <span className="font-extrabold font-mono text-gray-800">{chronologicalResults.length} lượt</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block">ĐIỂM CAO NHẤT:</span>
                <span className="font-extrabold font-mono text-green-750">
                  {empResults.length > 0 ? Math.max(...empResults.map(r => r.score)) : 0}/30đ
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block">HẠ CẤP DUY TRÌ:</span>
                <span className="font-extrabold font-mono text-amber-700">{state.demotionsApplied} lần</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold block">ĐIỂM TRUNG BÌNH:</span>
                <span className="font-extrabold font-mono text-blue-700">
                  {empResults.length > 0 
                    ? (empResults.reduce((acc, curr) => acc + curr.score, 0) / empResults.length).toFixed(1) 
                    : '0.0'}đ
                </span>
              </div>
            </div>

            {/* List of attempts */}
            <div className="space-y-2 shrink-0">
              <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                Lịch sử làm bài ({chronologicalResults.length} lần)
              </h4>
              
              {chronologicalResults.length === 0 ? (
                <p className="text-center py-6 text-gray-400 text-[11px] italic">Chưa thực hiện lượt thi nào</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
                  {chronologicalResults.map((res, index) => {
                    const isExpanded = adminExpandedResultId === res.id;
                    return (
                      <div key={res.id || index} className="border border-slate-150 rounded-lg overflow-hidden text-[11px] bg-slate-50/30">
                        {/* Header trigger */}
                        <button
                          onClick={() => setAdminExpandedResultId(isExpanded ? null : res.id)}
                          className={`w-full flex items-center justify-between p-2.5 font-sans ${isExpanded ? 'bg-slate-100 font-semibold' : ''}`}
                        >
                          <div className="flex items-center gap-3 w-full justify-between pr-2">
                            <span className="font-mono text-gray-400 text-[9.5px]">#{chronologicalResults.length - index}</span>
                            <span className="font-mono font-bold text-gray-700">
                              {res.date || (res.timestamp ? new Date(res.timestamp).toLocaleDateString('vi-VN') : 'N/A')}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                              res.score === 30 
                                ? 'bg-green-100 text-green-800' 
                                : res.score >= 20 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {res.score}/30đ
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {res.duration || 0}s
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                        </button>

                        {/* Expand items */}
                        {isExpanded && (
                          <div className="p-2 border-t border-slate-150 bg-white space-y-2 text-[10px]">
                            <div className="text-[8.5px] font-bold text-[#1971C2] uppercase pb-1 border-b border-gray-100">
                              KẾT QUẢ ĐÁP ÁN CHI TIẾT
                            </div>
                            {!res.answers || res.answers.length === 0 ? (
                              <p className="text-gray-400 italic text-center py-1">Không có chi tiết đáp án</p>
                            ) : (
                              <div className="space-y-1.5">
                                {res.answers.map((ans, ansIdx) => {
                                  const matchedQ = questions.find(q => q.id === ans.questionId);
                                  return (
                                    <div key={ansIdx} className="p-1.5 rounded bg-slate-50 border border-slate-100 leading-normal">
                                      <p className="font-semibold text-slate-800">
                                        Câu {ansIdx + 1}: {matchedQ?.questionText || 'Câu học phần / câu hỏi chung'}
                                      </p>
                                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                        <span className={`px-1.5 py-0.5 rounded-[3.5px] text-[8.5px] font-bold ${
                                          ans.isCorrect 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {ans.isCorrect ? 'ĐÚNG' : 'SAI'}
                                        </span>
                                        <span className="text-slate-500">
                                          Chọn: <span className="font-bold text-slate-700">{ans.selectedOptionText || `Đáp án ${ans.selectedOption}`}</span>
                                        </span>
                                        {!ans.isCorrect && (
                                          <span className="text-green-700 font-medium ml-1">
                                            Đúng: <span className="font-bold">{matchedQ?.correctOption ? (matchedQ[`option${matchedQ.correctOption}` as keyof Question] || matchedQ.correctOption) : ''}</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    const filteredEmployees = deptUsers.filter(u => {
      if (u.status !== 'approved' && u.status !== 'APPROVED') return false;
      const s = adminDetailSearch.toLowerCase().trim();
      if (!s) return true;
      return (
        u.name?.toLowerCase().includes(s) ||
        u.phone?.includes(s) ||
        u.employeeId?.toLowerCase().includes(s) ||
        u.department?.toLowerCase().includes(s) ||
        u.branch?.toLowerCase().includes(s)
      );
    });

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-150 rounded-xl p-3 shadow-xs overflow-hidden text-left font-sans">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 shrink-0">
          <button
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#0B3A60] uppercase tracking-wide">
            LỊCH SỬ CHI TIẾT
          </span>
          <div className="w-10" />
        </div>

        {/* Search */}
        <div className="mb-3 shrink-0 relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={adminDetailSearch}
            onChange={(e) => setAdminDetailSearch(e.target.value)}
            placeholder="Tìm theo tên, SĐT, Mã NV..."
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {adminDetailSearch && (
            <button
              onClick={() => setAdminDetailSearch('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5 animate-fadeIn" />
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pb-4">
          {filteredEmployees.length === 0 ? (
            <p className="text-center text-gray-450 text-wrap text-xs italic py-10">Không tìm thấy cán bộ nhân viên phù hợp.</p>
          ) : (
            filteredEmployees.map((emp) => {
              const empResults = allResults.filter(r => 
                (r.userId && r.userId === emp.id) || 
                (emp.phone && r.userId === emp.phone) || 
                (r.userName && r.userName.toLowerCase().trim() === emp.name.toLowerCase().trim())
              );
              
              const state = calculateInactivityAugmentedLevel(
                emp.id, 
                empResults, 
                levelRules || DEFAULT_LEVEL_RULES,
                {
                  isTestModeEnabled: inactivityTestMode,
                  simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
                }
              );

              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    setAdminSelectedUserId(emp.id);
                    setAdminExpandedResultId(null);
                  }}
                  className="w-full text-left p-2.5 bg-slate-55/40 hover:bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between gap-2.5 transition-all active:scale-[0.99] group shadow-3xs cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 truncate">
                      <span>{emp.name}</span>
                      {emp.employeeId && (
                        <span className="text-[9px] bg-slate-200/80 text-slate-650 font-mono px-1 rounded font-bold shrink-0">
                          {emp.employeeId}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-650 font-bold mt-0.5 leading-tight truncate">
                      {emp.department}
                    </div>
                    <div className="text-[9.5px] text-zinc-400 truncate">{emp.branch}</div>
                    
                    <div className="text-[9px] text-[#1971C2] font-bold font-mono mt-1">
                      {empResults.length} lượt đã thi
                    </div>
                  </div>

                  {/* Level and entry */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                      Cấp {state.level}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-650 transition-colors" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderMobileOnlinePanel = () => {
    // We want to list all users who are currently online (active in last 4 minutes)
    // To make it comprehensive, we sort online users by who was active most recently (Date.now() - lastActive ascending)
    const activeOnlineUsers = deptUsers.filter((u) => {
      if (!u.lastActive) return false;
      return Math.abs(Date.now() - u.lastActive) <= 240000;
    }).sort((a, b) => {
      const timeA = a.lastActive || 0;
      const timeB = b.lastActive || 0;
      return timeB - timeA; // Most recent first
    });

    const getActiveTimeAgo = (lastActiveTime?: number) => {
      if (!lastActiveTime) return 'Không rõ';
      const diffSecs = Math.floor((Date.now() - lastActiveTime) / 1000);
      if (diffSecs < 10) return 'Vừa xong';
      if (diffSecs < 60) return `${diffSecs} giây trước`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins} phút trước`;
      return `${Math.floor(diffMins / 60)} giờ trước`;
    };

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-155 rounded-xl p-3 shadow-xs overflow-hidden text-left font-sans animate-fadeIn">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 shrink-0">
          <button
            onClick={() => setAdminMobileTab('home')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            DANH SÁCH ONLINE ({activeOnlineUsers.length})
          </span>
          <button 
            onClick={refreshData}
            className="p-1 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 transition-all cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pb-4">
          {activeOnlineUsers.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-350">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-gray-450 text-xs italic text-center">Hiện không có CBNV nào đang trực tuyến.</p>
            </div>
          ) : (
            activeOnlineUsers.map((emp) => {
              const empResults = allResults.filter(r => 
                (r.userId && r.userId === emp.id) || 
                (emp.phone && r.userId === emp.phone) || 
                (r.userName && r.userName.toLowerCase().trim() === emp.name.toLowerCase().trim())
              );
              
              const state = calculateInactivityAugmentedLevel(
                emp.id, 
                empResults, 
                levelRules || DEFAULT_LEVEL_RULES,
                {
                  isTestModeEnabled: inactivityTestMode,
                  simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
                }
              );

              // Get initials for Avatar
              const nameParts = (emp.name || 'C B').trim().split(' ');
              const initials = nameParts.length >= 2 
                ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                : (emp.name || 'CB').slice(0, 2).toUpperCase();

              return (
                <div
                  key={emp.id}
                  className="w-full p-2.5 bg-gradient-to-r from-emerald-50/10 to-teal-50/5 border border-slate-150 rounded-lg flex flex-col gap-2.5 transition-all shadow-3xs hover:border-emerald-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar with live status dot */}
                      <div className="relative h-8 w-8 rounded-full bg-emerald-50 border border-emerald-150 flex items-center justify-center font-bold text-emerald-800 text-[11px] font-sans shrink-0">
                        {initials}
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white"></span>
                      </div>
                      
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 truncate">
                          <span>{emp.name}</span>
                          <span className={`px-1 h-3.5 inline-flex items-center justify-center rounded-[3px] border text-[7.5px] font-extrabold tracking-wide uppercase shrink-0 ${
                            emp.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            emp.role === 'executive' ? 'bg-orange-50 text-[#E8590C] border-orange-200' :
                            emp.role === 'approver' ? 'bg-yellow-50 text-yellow-700 border-yellow-250' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {emp.role === 'admin' ? 'ADMIN' : 
                             emp.role === 'executive' ? 'TGĐ' :
                             emp.role === 'approver' ? 'DUYỆT' : 'CBNV'}
                          </span>
                        </div>
                        <div className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5 truncate">
                          {emp.branch} &rarr; <span className="font-bold text-zinc-550">{emp.department}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold text-emerald-600 font-mono flex items-center gap-1 justify-end">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                        <span>{getActiveTimeAgo(emp.lastActive)}</span>
                      </div>
                      {emp.employeeId && (
                        <div className="text-[8px] text-gray-400 font-mono mt-0.5 font-bold">
                          MNV: {emp.employeeId}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions / Meta */}
                  <div className="flex items-center justify-between border-t border-slate-100/70 pt-2 text-[9px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Cấp độ hiện tại: <strong className="text-slate-800 font-extrabold font-mono">Cấp {state.level}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span className="font-medium">Lượt đã thi: <strong className="text-slate-800 font-extrabold font-mono">{empResults.length}</strong></span>
                    </div>

                    <button
                      onClick={() => {
                        setAdminMobileTab('exchange');
                      }}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-700 rounded-md font-bold text-[8.5px] transition-all flex items-center gap-1 cursor-pointer"
                      title="Gửi tin nhắn trao đổi"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Nhắn tin</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
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
      // Map base64 representations with strict "image/jpeg" mimeType since it was compressed to jpeg
      const imagePayloads = selectedImages.map(img => ({
        mimeType: "image/jpeg",
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

  // Real-time Firestore data loading on mount (sync across devices instantly)
  useEffect(() => {
    let active = true;
    
    // Load initial static/dynamic configurations
    const loadConfigData = async () => {
      try {
        const qs = await databaseService.getQuestions();
        if (active) setQuestions(qs);
        
        try {
          const rules = await databaseService.getLevelRules();
          if (active) setLevelRules(rules);
        } catch (ruleErr) {
          console.error("Lỗi khi tải quy chế cấp độ:", ruleErr);
        }
      } catch (err) {
        console.error("Lỗi khi tải cấu hình khởi động:", err);
      }
    };
    
    loadConfigData();

    // Subscribe to all users in real-time
    const unsubscribeUsers = databaseService.subscribeUsers((allUsers) => {
      if (!active) return;
      setAllUsersList(allUsers);
    });

    // Subscribe to all quiz results in real-time
    const unsubscribeResults = databaseService.subscribeQuizResults((allRes) => {
      if (!active) return;
      setAllResults(allRes);
      
      // Filter results for this active logging in user
      const userResults = allRes
        .filter(r => r.userId === user.id)
        .sort((a, b) => b.timestamp - a.timestamp);
      setResults(userResults);
    });

    return () => {
      active = false;
      unsubscribeUsers();
      unsubscribeResults();
    };
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

    // Cập nhật giao diện lập tức (Optimistic Update) để người dùng không phải chờ đợi
    setLastQuizResult(newResult);
    setResults(prev => [newResult, ...prev]);
    setAllResults(prev => [newResult, ...prev]);
    setShowResultsReview(true);
    setReviewMode(false);
    setReviewQuestionIndex(0);

    // Lưu kết quả và kiểm tra thăng cấp/kỷ lục ngầm dưới nền để tránh trễ mạng
    (async () => {
      try {
        await databaseService.saveQuizResult(newResult);
        await checkNewRecordOrPromotion(newResult);
      } catch (err: any) {
        console.error("Lỗi ngầm khi nộp bài thi tự động lên đám mây:", err);
      }
    })();
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

  // Calculation of wrong & low score questions needing practice (part 2 feature)
  // Filters questions answered wrong or from low score attempts (< 7 pts).
  // If user practices a wrong question and answers correctly 3 times (consecutive after wrong), it is removed from the wrong list.
  const wrongQuestionsForPractice = useMemo(() => {
    if (!results || results.length === 0 || !questions || questions.length === 0) {
      return [];
    }

    // Sort results chronologically ascending (oldest first)
    const sortedResults = [...results].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Map to track question practice state
    const questionMap = new Map<string, { needsPractice: boolean; correctStreakAfterWrong: number }>();

    sortedResults.forEach(res => {
      const isLowScoreAttempt = (res.score || 0) < 7;
      if (res.answers && Array.isArray(res.answers)) {
        res.answers.forEach(ans => {
          const qId = ans.questionId;
          const isCorrect = ans.correct === true;

          let state = questionMap.get(qId);
          if (!state) {
            state = { needsPractice: false, correctStreakAfterWrong: 0 };
            questionMap.set(qId, state);
          }

          if (!isCorrect || isLowScoreAttempt) {
            // Answered wrong OR in a low-score attempt (< 7 pts)
            state.needsPractice = true;
            state.correctStreakAfterWrong = 0; // Reset streak on wrong answer
          } else {
            // Answered correctly in a valid attempt
            if (state.needsPractice) {
              state.correctStreakAfterWrong += 1;
              // If answered correctly 3 times since being wrong, mark as mastered / clear from wrong list
              if (state.correctStreakAfterWrong >= 3) {
                state.needsPractice = false;
              }
            }
          }
        });
      }
    });

    const list: Question[] = [];
    questionMap.forEach((state, qId) => {
      if (state.needsPractice) {
        const qObj = questions.find(q => q.id === qId);
        if (qObj) {
          list.push(qObj);
        }
      }
    });

    return list;
  }, [results, questions]);

  // Start practice session specifically targeting wrong & low-score questions
  const startWrongQuestionsPractice = () => {
    if (wrongQuestionsForPractice.length === 0) {
      alert("Chúc mừng! Bạn chưa có câu hỏi nào bị sai hoặc tất cả các câu sai đã được bạn ôn luyện làm đúng đủ 3 lần.\n\nHãy làm 'BẮT ĐẦU ĐÁNH GIÁ' để tiếp tục nâng cao kiến thức!");
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

    // Pick 3 questions for practice session instantly with O(3) random picking
    let selected: Question[] = [];
    if (wrongQuestionsForPractice.length >= 3) {
      const selectedIndices = new Set<number>();
      while (selectedIndices.size < 3) {
        const idx = Math.floor(Math.random() * wrongQuestionsForPractice.length);
        if (!selectedIndices.has(idx)) {
          selectedIndices.add(idx);
          selected.push(wrongQuestionsForPractice[idx]);
        }
      }
    } else {
      selected = [...wrongQuestionsForPractice];
      const existingIds = new Set(selected.map(q => q.id));
      const remainingQuestions = questions.filter(q => !existingIds.has(q.id));
      const needed = 3 - selected.length;
      if (remainingQuestions.length > 0) {
        const selectedIndices = new Set<number>();
        while (selectedIndices.size < Math.min(needed, remainingQuestions.length)) {
          const idx = Math.floor(Math.random() * remainingQuestions.length);
          if (!selectedIndices.has(idx)) {
            selectedIndices.add(idx);
            selected.push(remainingQuestions[idx]);
          }
        }
      }
    }

    setCurrentQuizQuestions(selected);
    setQuizStarted(true);
    setIsActionLoading(false);
    setLoadingText(null);
  };

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
    
    // Choose 3 random questions ultra-fast O(3) instead of O(N log N) full array sort
    const selectedIndices = new Set<number>();
    const selected: Question[] = [];
    while (selectedIndices.size < 3) {
      const idx = Math.floor(Math.random() * questions.length);
      if (!selectedIndices.has(idx)) {
        selectedIndices.add(idx);
        selected.push(questions[idx]);
      }
    }

    setCurrentQuizQuestions(selected);
    setQuizStarted(true);
    setIsActionLoading(false);
    setLoadingText(null);
  };

  const handleSelectOption = useCallback((questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => {
      if (prev[questionId] === optionIndex) return prev;
      return {
        ...prev,
        [questionId]: optionIndex
      };
    });
  }, []);

  const [errorState, setErrorState] = useState<string | null>(null);

  // Submit Quiz Action
  const submitQuiz = async () => {
    // Tắt loading overlay lập tức để giao diện hiển thị mượt mà không bị xoay đè
    setIsActionLoading(false);
    setLoadingText(null);

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

    // Cập nhật giao diện lập tức (Optimistic Update) để người dùng thấy điểm ngay lập tức
    setLastQuizResult(newResult);
    setResults(prev => [newResult, ...prev]);
    setAllResults(prev => [newResult, ...prev]);
    setShowResultsReview(true);
    setReviewMode(false);
    setReviewQuestionIndex(0);

    // Lưu kết quả và kiểm tra thăng cấp/kỷ lục ngầm dưới nền để tránh trễ mạng
    (async () => {
      try {
        await databaseService.saveQuizResult(newResult);
        await checkNewRecordOrPromotion(newResult);
      } catch (err: any) {
        console.error("Lỗi ngầm khi lưu kết quả bài thi lên đám mây:", err);
      }
    })();
  };

  // Expanded explanations in practice mode state
  const [expandedPracticeId, setExpandedPracticeId] = useState<string | null>(null);

  // Statistics calculation (Memoized to prevent render delays during quiz)
  const { totalQuizzes, averageScore, passingRate } = useMemo(() => {
    const total = results.length;
    const avg = total > 0 
      ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / total)
      : 0;
    const pass = total > 0
      ? Math.round((results.filter(r => r.score === 30).length / total) * 100)
      : 0;
    return { totalQuizzes: total, averageScore: avg, passingRate: pass };
  }, [results]);

  // Collective stats for department & branch (Memoized to prevent filtering thousands of results on every second tick)
  const {
    myDeptResults,
    deptTotalQuizzes,
    deptAverageScore,
    deptPassingRate,
    deptT1Percent,
    deptT2Percent,
    deptT3Percent,
    deptLeaderboard
  } = useMemo(() => {
    const myDeptRes = allResults.filter(r => r.department === user.department);
    const deptTotal = myDeptRes.length;
    const deptAvg = deptTotal > 0
      ? Math.round((myDeptRes.reduce((acc, curr) => acc + curr.score, 0) / deptTotal) * 10) / 10
      : 0;
    const deptPass = deptTotal > 0
      ? Math.round((myDeptRes.filter(r => r.score === 30).length / deptTotal) * 100)
      : 0;

    let t1Correct = 0, t1Total = 0;
    let t2Correct = 0, t2Total = 0;
    let t3Correct = 0, t3Total = 0;

    myDeptRes.forEach(res => {
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

    const t1Pct = t1Total > 0 ? Math.round((t1Correct / t1Total) * 100) : 88;
    const t2Pct = t2Total > 0 ? Math.round((t2Correct / t2Total) * 100) : 84;
    const t3Pct = t3Total > 0 ? Math.round((t3Correct / t3Total) * 100) : 80;

    const departmentsList = [
      'Phòng Quản Lý Chất Lượng',
      'Phòng Sản Xuất',
      'Phòng Nhân Sự',
      'Phòng Kế Toán',
      'Phòng Kinh Doanh',
      'Phòng Kỹ Thuật',
      'Phòng Kho Vận'
    ];
    const leaderboard = departmentsList.map(dept => {
      const deptRes = allResults.filter(r => r.department === dept);
      const count = deptRes.length;
      const avg = count > 0 ? Math.round((deptRes.reduce((sum, r) => sum + r.score, 0) / count) * 10) / 10 : 0;
      const rate = count > 0 ? Math.round((deptRes.filter(r => r.score === 30).length / count) * 100) : 0;
      return { name: dept, count, avg, rate };
    }).sort((a, b) => b.count - a.count || b.avg - a.avg);

    return {
      myDeptResults: myDeptRes,
      deptTotalQuizzes: deptTotal,
      deptAverageScore: deptAvg,
      deptPassingRate: deptPass,
      deptT1Percent: t1Pct,
      deptT2Percent: t2Pct,
      deptT3Percent: t3Pct,
      deptLeaderboard: leaderboard
    };
  }, [allResults, user.department]);

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
          {onBackToAdmin && user.role !== 'executive' && (
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
            
            {/* Global compact running marquee announcement banner */}
            {systemAnnouncement && systemAnnouncement.trim() ? (
              <div className="sticky top-0 z-45 mx-[-12.5px] mt-[-12.5px] sm:mx-[-16.5px] sm:mt-[-16.5px] mb-2 px-3 bg-transparent text-slate-700 text-[10px] font-bold py-1.5 overflow-hidden shrink-0 flex items-center select-none">
                <div 
                  className="animate-marquee notranslate flex whitespace-nowrap" 
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
                      if (lvlNum === 2) return "bg-blue-50/50 border-blue-200";
                      if (lvlNum === 3) return "bg-emerald-50/30 border-emerald-200";
                      if (lvlNum === 4) return "bg-amber-50/40 border-amber-200";
                      return "bg-rose-50/45 border-rose-200";
                    };

                    const getLevelNumBgClass = (lvlNum: number) => {
                      if (lvlNum === 1) return "bg-slate-200/25 text-slate-400/40";
                      if (lvlNum === 2) return "bg-blue-100/25 text-blue-400/30";
                      if (lvlNum === 3) return "bg-emerald-100/25 text-emerald-400/40";
                      if (lvlNum === 4) return "bg-amber-100/25 text-amber-500/30";
                      return "bg-rose-100/25 text-rose-500/30";
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

                  {/* Elegant bottom spacing to prevent floating button overlapping */}
                  <div className="h-16" />
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
                    {adminMobileTab === 'personal' && renderMobilePersonalPanel()}
                    {adminMobileTab === 'notifications' && renderMobileNotificationsPanel()}
                    {adminMobileTab === 'legends' && renderMobileLegendsPanel()}
                    {adminMobileTab === 'records' && renderMobileRecordsPanel()}
                    {adminMobileTab === 'patience_top' && renderMobilePatiencePanel()}
                    {adminMobileTab === 'details' && renderMobileDetailsPanel()}
                    {adminMobileTab === 'online' && renderMobileOnlinePanel()}
                    {adminMobileTab === 'exchange' && (
                      <div className="flex flex-col flex-1 min-h-0 w-full bg-white rounded-t-2xl shadow-inner border-t border-gray-100 overflow-hidden">
                        <ConversationExchange 
                          user={user} 
                          onBackToHome={() => setAdminMobileTab('home')}
                          isMobileView={true}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  // Landing Screen for Practice Exams
                  <div className="flex flex-col items-center justify-between text-center flex-1 h-full pt-1 pb-0.5 sm:pt-1.5 sm:pb-1 relative">
                    {/* Centered Top & Mid content wrapper to keep them tight together */}
                    <div className="flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 flex-1 w-full shrink-0">
                      
                      {/* Admin rapid action buttons */}
                      {((isAdminReview && (user.role === 'admin' || user.role === 'executive' || user.role === 'approver')) || user.canViewStats) && (
                        <div className="w-full max-w-sm mx-auto bg-slate-50/90 border border-slate-200/60 rounded-xl p-2 shadow-xs mb-4 sm:mb-5 font-sans">
                          <div className="flex flex-row items-center justify-between gap-1 overflow-x-auto no-scrollbar px-3 pt-4 pb-2 mb-1">
                            {(user.role === 'admin' || user.role === 'executive' || user.role === 'approver') && (
                              <button
                                onClick={() => setAdminMobileTab('users')}
                                className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                                title="Phê Duyệt & Phân Quyền"
                              >
                                <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100/60 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0 relative">
                                  <UserCheck className="h-3.5 w-3.5 text-[#1971C2]" />
                                  {pendingUsersCount > 0 && (
                                    <span className="absolute -top-2 -right-1.5 bg-red-600 text-white text-[9.5px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                      {pendingUsersCount}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Phê Duyệt</span>
                              </button>
                            )}

                            {/* Nút Hiển Thị Số Người Đang Online */}
                            <button
                              onClick={() => setAdminMobileTab('online')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                              title="Ai Đang Online"
                            >
                              <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100/60 flex items-center justify-center group-hover:bg-emerald-100 transition-colors shrink-0 relative">
                                <Users className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                                {onlineUsersCount > 0 && (
                                  <span className="absolute -top-2 -right-1.5 bg-emerald-600 text-white text-[9.5px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                    {onlineUsersCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Online ({onlineUsersCount})</span>
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
                                  <span className="absolute -top-1.5 -left-2.5 bg-[#12B886] text-white text-[8px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[15px] leading-none animate-bounce z-10" title="Tổng số lượt làm trong hôm nay">
                                    {attemptsTodayCount}
                                  </span>
                                )}
                                {participantsTodayCount > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-[#1C7ED6] text-white text-[8px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[15px] leading-none animate-bounce z-10" title="Tổng số người tham gia ôn tập trong hôm nay">
                                    {participantsTodayCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Thống Kê</span>
                            </button>

                            {/* Dynamic Notifications Button */}
                            <button
                              onClick={() => {
                                setAdminMobileTab('notifications');
                                const ts = Date.now();
                                localStorage.setItem('3t_last_read_ann_ts', String(ts));
                                setUnreadNotificationsCount(0);
                              }}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0 animate-fadeIn"
                              title="Thông Báo"
                            >
                              <div className="h-7 w-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center group-hover:bg-orange-100 transition-colors shrink-0 relative">
                                <Bell className="h-3.5 w-3.5 text-orange-600" />
                                {unreadNotificationsCount > 0 && (
                                  <span className="absolute -top-2 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                    {unreadNotificationsCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Thông Báo</span>
                            </button>

                            {/* Trao Đổi Support Chat Button */}
                            <button
                              onClick={() => {
                                setAdminMobileTab('exchange');
                              }}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0 animate-fadeIn"
                              title="Chat BQT"
                            >
                              <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0 relative">
                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                                {unreadExchangeCount > 0 && (
                                  <span className="absolute -top-2 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                    {unreadExchangeCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Chat BQT</span>
                            </button>

                            {(user.role === 'admin' || user.role === 'executive') && (
                              <button
                                onClick={() => setAdminMobileTab('personal')}
                                className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-705 font-sans cursor-pointer group shrink-0"
                                title="Tiến độ cá nhân"
                              >
                                <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                                  <UserIcon className="h-3.5 w-3.5 text-indigo-700" />
                                </div>
                                <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-705">Cá Nhân</span>
                              </button>
                            )}

                            {(user.role === 'admin' || user.role === 'executive') && (
                              <button
                                onClick={() => setAdminMobileTab('details')}
                                className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-slate-150/20 active:scale-95 transition-all text-slate-700 font-sans cursor-pointer group shrink-0"
                                title="Lịch sử chi tiết"
                              >
                                <div className="h-7 w-7 rounded-lg bg-yellow-50 border border-yellow-100 flex items-center justify-center group-hover:bg-yellow-100 transition-colors shrink-0">
                                  <ClipboardList className="h-3.5 w-3.5 text-yellow-700" />
                                </div>
                                <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Chi Tiết</span>
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
                                <span className="text-[8.5px] font-bold leading-tight truncate w-full text-center text-gray-700 font-sans">Dữ Liệu</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* CBNV (Nhân viên thường) rapid action buttons */}
                      {!(user.role === 'admin' || user.role === 'executive') && !(user.role === 'approver' || user.canViewStats) && (
                        <div className="w-full max-w-sm mx-auto bg-gradient-to-br from-amber-50/95 via-amber-50/85 to-yellow-50/70 rounded-xl p-2 shadow-xs mb-3 sm:mb-3.5 font-sans relative backdrop-blur-xs">
                          <div className="flex flex-row items-center justify-between gap-1 overflow-x-auto no-scrollbar px-3 pt-4 pb-2 w-full whitespace-nowrap">
                            {/* Tượng đài huyền thoại */}
                            <button
                              onClick={() => setAdminMobileTab('legends')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-violet-50/20 active:scale-95 transition-all text-amber-950 font-sans cursor-pointer group shrink-0"
                              title="Tượng Đài Huyền Thoại"
                            >
                              <div className="h-7 w-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center group-hover:bg-violet-100 transition-colors shrink-0 relative">
                                <Trophy className="h-3.5 w-3.5 text-violet-600" />
                                {monumentLegends.length > 0 && (
                                  <span className="absolute -top-2 -right-1.5 bg-violet-600 text-white text-[9px] font-black h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                    {monumentLegends.length}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-extrabold leading-tight text-center text-amber-950 truncate max-w-[64px]">Tượng Đài</span>
                            </button>
 
                             {/* Kỷ lục 3T */}
                            <button
                              onClick={() => setAdminMobileTab('records')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-amber-50/25 active:scale-95 transition-all text-amber-950 font-sans cursor-pointer group shrink-0"
                              title="Kỷ Lục 3T"
                            >
                              <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center group-hover:bg-amber-100 transition-colors shrink-0 relative animate-fadeIn">
                                <Award className="h-3.5 w-3.5 text-amber-600" />
                                {rotatedRecordBadge && (
                                  <span className="absolute -top-2 -right-1.5 bg-amber-600 text-white text-[8px] font-black h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none transition-all duration-300 transform scale-95" title="Kỷ lục 3T">
                                    {rotatedRecordBadge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-extrabold leading-tight text-center text-amber-950 truncate max-w-[64px]">Kỷ Lục 3T</span>
                            </button>
 
                             {/* Top 5 kiên trì */}
                            <button
                              onClick={() => setAdminMobileTab('patience_top')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-emerald-50/20 active:scale-95 transition-all text-amber-950 font-sans cursor-pointer group shrink-0"
                              title="Top 5 Kiên Trì Hôm Nay"
                            >
                              <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors shrink-0 relative animate-fadeIn">
                                <Zap className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                                {rotatedPatienceBadge && (
                                  <span className="absolute -top-2 -right-1.5 bg-emerald-600 text-white text-[9px] font-black h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none transition-all duration-300 transform scale-95" title="Top Kiên Trì">
                                    {rotatedPatienceBadge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-extrabold leading-tight text-center text-amber-950 truncate max-w-[64px]">Top Kiên Trì</span>
                            </button>

                            {/* Mã QR */}
                            <button
                              onClick={() => setAdminMobileTab('qr')}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-indigo-50/20 active:scale-95 transition-all text-amber-950 font-sans cursor-pointer group shrink-0"
                              title="Mã QR"
                            >
                              <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                                <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                              </div>
                              <span className="text-[8.5px] font-extrabold leading-tight text-center text-amber-950 truncate max-w-[64px]">Mã QR</span>
                            </button>

                            {/* Thông báo */}
                            <button
                              onClick={() => {
                                setAdminMobileTab('notifications');
                                const ts = Date.now();
                                localStorage.setItem('3t_last_read_ann_ts', String(ts));
                                setUnreadNotificationsCount(0);
                              }}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-orange-50/20 active:scale-95 transition-all text-amber-950 font-sans cursor-pointer group shrink-0 relative"
                              title="Thông Báo"
                            >
                              <div className="h-7 w-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center group-hover:bg-orange-100 transition-colors shrink-0 relative">
                                <Bell className="h-3.5 w-3.5 text-orange-600" />
                                {unreadNotificationsCount > 0 && (
                                  <span className="absolute -top-2 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                    {unreadNotificationsCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-extrabold leading-tight text-center text-amber-950 truncate max-w-[64px]">Thông Báo</span>
                            </button>

                            {/* Trao Đổi Support Chat Button */}
                            <button
                              onClick={() => {
                                setAdminMobileTab('exchange');
                              }}
                              className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-blue-50/20 active:scale-95 transition-all text-amber-950 font-sans cursor-pointer group shrink-0"
                              title="Chat BQT"
                            >
                              <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0 relative animate-fadeIn">
                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                                {unreadExchangeCount > 0 && (
                                  <span className="absolute -top-2 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold h-4 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[16px] leading-none animate-bounce">
                                    {unreadExchangeCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8.5px] font-extrabold leading-tight text-center text-amber-950 truncate max-w-[64px]">Chat BQT</span>
                            </button>
                          </div>
                        </div>
                      )}
 
                    {/* 3T Logo replacing Trophy Icon */}
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B3A60] border-2 border-orange-500/50 shadow-md select-none shrink-0 relative overflow-hidden group">
                      {/* Glossy light effect */}
                      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none transform -skew-y-12" />
                      
                      <span translate="no" className="notranslate text-3xl font-black tracking-tighter font-sans select-none relative z-10 flex items-center justify-center">
                        <span className="animate-magic-color-slow">
                          3
                        </span>
                        <span className="text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.6)] -ml-0.5">T</span>
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
                      className="w-full max-w-sm mx-auto bg-gradient-to-r from-blue-50/70 via-slate-50/50 to-orange-50/40 border border-blue-200/60 hover:border-blue-400 py-1.5 px-2.5 rounded-xl flex items-center justify-between text-left shadow-2xs shrink-0 font-sans cursor-pointer hover:shadow-xs active:scale-[0.995] transition-all relative group"
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
                              {difficulty === 5 ? '🏆 Cấp 5: Legend / Huyền thoại' :
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
                              : 'text-slate-600 bg-slate-100 border-slate-200'
                          }`}>
                            {difficultyState.consecutiveMax > 0 
                              ? `🎯 Đạt 30/30: ${difficultyState.consecutiveMax}/5` 
                              : difficultyState.consecutiveLow > 0
                              ? `⚠️ Điểm < 20: ${difficultyState.consecutiveLow}/2`
                              : '🛡️ Bền bỉ Cấp 2'
                            }
                          </span>
                        )}
                        {difficulty === 3 && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${
                            difficultyState.consecutiveLow > 0 
                              ? 'text-rose-755 bg-rose-55 border-rose-250 animate-pulse' 
                              : difficultyState.consecutiveMax > 0
                              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                              : 'text-indigo-750 bg-indigo-55 border-indigo-200'
                          }`}>
                            {difficultyState.consecutiveMax > 0 
                              ? `🎯 Đạt 30/30: ${difficultyState.consecutiveMax}/5` 
                              : difficultyState.consecutiveLow > 0
                              ? `⚠️ Điểm < 26: ${difficultyState.consecutiveLow}/2`
                              : '⚔️ Cấp 3 Thống Lĩnh'
                            }
                          </span>
                        )}
                        {difficulty === 4 && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${
                            difficultyState.consecutiveLow > 0 
                              ? 'text-rose-755 bg-rose-55 border-rose-250 animate-pulse' 
                              : difficultyState.consecutiveMax > 0
                              ? 'text-amber-705 bg-amber-50 border-amber-200'
                              : 'text-orange-755 bg-orange-55 border-orange-200'
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
                            getVietnamDateString() >= '2026-06-17'
                              ? 'text-purple-600 bg-purple-50 border-purple-200'
                              : difficultyState.consecutiveLow > 0 
                              ? 'text-rose-755 bg-rose-55 border-rose-250 animate-pulse' 
                              : 'text-rose-600 bg-rose-50 border-rose-200'
                          }`}>
                            {getVietnamDateString() >= '2026-06-17'
                              ? '🔮 Cấp 5 Huyền Thoại (Quy chế mới)'
                              : difficultyState.consecutiveLow > 0
                              ? `⚠️ Điểm < 28: ${difficultyState.consecutiveLow}/2`
                              : '👑 Cấp 5 Huyền Thoại'
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Condensed responsive grid - Reduced by 0.5pt to be more compact */}
                    <div className="bg-gray-50 border border-gray-150 p-2 sm:p-2.5 rounded-xl w-full max-w-sm grid grid-cols-2 gap-1.5 text-left text-[10.5px] sm:text-[11px] shrink-0 shadow-2xs font-sans">
                      <div className="space-y-0.5">
                        <div className="text-[9.5px] sm:text-[10px] text-gray-455 uppercase tracking-wider font-semibold">Số câu hỏi</div>
                        <div className="font-bold text-[#0B3A60]">
                           <span translate="no" className="notranslate">3 câu (Ngẫu nhiên)</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[9.5px] sm:text-[10px] text-gray-455 uppercase tracking-wider font-semibold">Thời gian tính</div>
                        <div className="font-bold text-gray-850">
                          <span translate="no" className="notranslate font-sans">
                            {difficulty === 5 ? '10 giây / câu' : difficulty === 4 ? '20 giây / câu' : difficulty === 3 ? '30 giây / câu' : difficulty === 2 ? '60 giây / câu' : '90 giây / câu'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[9.5px] sm:text-[10px] text-gray-455 uppercase tracking-wider font-semibold">Tổng điểm tối đa</div>
                        <div className="font-bold text-gray-805">
                          <span translate="no" className="notranslate">30 Điểm (10đ / câu)</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[9.5px] sm:text-[10px] text-gray-455 uppercase tracking-wider font-semibold">Trạng thái</div>
                        <div className="font-bold text-green-600">
                          <span translate="no" className="notranslate font-sans">Đã duyệt học viên</span>
                        </div>
                      </div>
                    </div>

                    {/* High Quality Board of Honor "BẢNG VÀNG VINH DANH" replacing Exam Tips */}
                    <div className="w-full max-w-sm bg-gradient-to-br from-amber-50/70 via-[#FFFDF5]/90 to-amber-50/50 border-2 border-amber-300/60 p-1.5 sm:p-2 rounded-xl text-left text-xs font-sans text-gray-750 space-y-1 shrink-0 shadow-sm relative overflow-hidden flex flex-col justify-between select-none">
                     {/* Animated background highlights to act as congratulatory effects */}
                     <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-300/12 via-transparent to-transparent pointer-events-none" />
                     
                     <motion.div
                       animate={{ rotate: 360 }}
                       transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                       className="absolute -top-6 -right-6 text-amber-500/10 pointer-events-none"
                     >
                       <Sparkles className="w-10 h-10" />
                     </motion.div>

                     <motion.div
                       animate={{ y: [0, -2, 0] }}
                       transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                       className="absolute bottom-0.5 right-0.5 text-yellow-500/10 pointer-events-none"
                     >
                       <Trophy className="w-8 h-8" />
                     </motion.div>

                     {/* Ribbon Header with dynamic category & period indicators */}
                     <div className="flex items-center justify-between gap-1 relative z-10 w-full">
                       <div className="flex items-center gap-1 shrink-0">
                         <span className="text-amber-500 animate-pulse text-[10px]">🏆</span>
                         <span className="font-extrabold uppercase bg-gradient-to-r from-amber-700 to-yellow-600 bg-clip-text text-transparent tracking-wider text-[10px]">
                           <span translate="no" className="notranslate">Bảng Vàng Vinh Danh</span>
                         </span>
                       </div>

                       <span className="text-[7.5px] font-black uppercase text-amber-805 bg-amber-105/50 border border-amber-200/25 px-1.5 py-0.2 rounded font-sans">
                         <span translate="no" className="notranslate">
                           {activeItem?.categoryLabel || 'Tôn Vinh'}
                         </span>
                       </span>
                     </div>

                     {/* Category Label with fallbacks / status details */}
                     <div className="flex justify-between items-center text-[8.5px] font-extrabold text-[#744210] px-0.5 relative z-10 shrink-0">
                       <span className="flex items-center gap-0.5 tracking-wider bg-amber-100/40 px-1.5 py-0.2 rounded-full border border-amber-200/20 font-sans">
                         <span translate="no" className="notranslate">
                           {activeItem?.categoryTitle || '✨ ĐANG TẢI...' }
                         </span>
                       </span>
                       <span className="text-[#099268] flex items-center gap-0.5 text-[7.5px] font-sans">
                         <span className="h-0.5 w-0.5 bg-[#099268] rounded-full animate-ping inline-block" />
                         <span translate="no" className="notranslate">Thời gian thực</span>
                       </span>
                     </div>

                     {/* Elite Candidates Display Area (Strict stable non-jitter height of exactly 58px) */}
                     <div className="w-full relative z-10 font-sans mt-0.5 h-[58px] flex items-center overflow-hidden">
                       <AnimatePresence mode="wait">
                         {!activeItem ? (
                           <motion.div
                             key="empty_placeholder"
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             exit={{ opacity: 0 }}
                             className="w-full flex flex-col items-center justify-center text-center p-1 text-[9px] text-amber-850 italic font-sans"
                           >
                             <span translate="no" className="notranslate">🎯 Đang tải dữ liệu Bảng Vàng vinh danh...</span>
                           </motion.div>
                         ) : (() => {
                           const cand = activeItem;
                           const isCurrentUser = cand.name?.trim().toUpperCase() === user.name?.trim().toUpperCase();

                           return (
                             <motion.div
                               key={cand.uniqueId}
                               initial={{ opacity: 0, x: 6 }}
                               animate={{ opacity: 1, x: 0 }}
                               exit={{ opacity: 0, x: -6 }}
                               transition={{ duration: 0.25, ease: 'easeInOut' }}
                               className="w-full font-sans"
                             >
                               <div 
                                 className={`flex flex-col gap-1 px-2 py-1.5 rounded-lg border transition-all w-full leading-normal ${
                                   isCurrentUser 
                                     ? 'bg-gradient-to-r from-yellow-50 to-amber-100/90 border-amber-300 shadow-3xs scale-101 relative overflow-hidden' 
                                     : 'bg-white border-amber-200/40'
                                 }`}
                               >
                                 {isCurrentUser && (
                                   <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-amber-400/10 pointer-events-none" />
                                 )}

                                 {/* Row 1: Left Badge / Name / Dept vs Right Stats Pill / Title */}
                                 <div className="flex items-center justify-between gap-1.5 w-full">
                                   {/* Left Side Group */}
                                   <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                     <span className="text-[12px] shrink-0 select-none">{cand.leftEmoji}</span>
                                     <div className="flex flex-col min-w-0 flex-1 justify-center text-left">
                                       <span className={`tracking-tight text-[9.7px] uppercase truncate block leading-tight ${
                                         cand.type === 'legend' ? (cand.currentLevel < 5 ? 'text-slate-500 font-bold' : 'text-black font-black') : (isCurrentUser ? 'text-amber-950 font-black underline decoration-amber-400 decoration-1' : 'text-gray-805 font-black')
                                       }`}>
                                         <span translate="no" className="notranslate">
                                            {cand.name}
                                            {cand.type === 'legend' && (
                                              <span className={`text-[8.5px] font-bold normal-case lowercase ml-1 shrink-0 ${
                                                cand.currentLevel < 5 ? 'text-slate-400' : 'text-gray-600'
                                              }`}>
                                                (Vị thế: {cand.daysMaintaining || 1} ngày)
                                              </span>
                                            )}
                                          </span>
                                       </span>
                                       <span className="text-[7.5px] text-gray-400 font-bold leading-none mt-0.5 truncate whitespace-nowrap block max-w-full">
                                         <span translate="no" className="notranslate">
                                           {(() => {
                                             const d = (cand.dept || '').trim();
                                             const b = (cand.branch || '').trim();
                                             if (!d) return b;
                                             if (!b) return d;
                                             const match = b.match(/\(([^)]+)\)/);
                                             if (match) {
                                               return `${d} ${match[0]}`;
                                             }
                                             return `${d} • ${b}`;
                                           })()}
                                         </span>
                                       </span>
                                     </div>
                                   </div>

                                   {/* Right Side Group */}
                                   <div className="flex flex-col items-end shrink-0 justify-center">
                                     <div className="flex items-center font-mono text-[8px] font-bold text-[#b45309] bg-amber-100/35 border border-amber-200/40 px-1 py-0.2 rounded leading-none">
                                       <span translate="no" className="notranslate text-amber-905 font-black">{cand.avgScore}đ</span>
                                       <span className="mx-0.5 text-amber-300/60 font-medium">|</span>
                                       <span translate="no" className="notranslate text-amber-805">{cand.attempts}L</span>
                                       <span className="mx-0.5 text-amber-300/60 font-medium">|</span>
                                       <span translate="no" className="notranslate text-[#92400e]">{cand.avgTimeSpent}s</span>
                                     </div>
                                     <span className="text-[7.5px] font-black text-[#9c5a14] leading-none mt-1 whitespace-nowrap font-sans uppercase">
                                       <span translate="no" className="notranslate">{cand.honorTitle}</span>
                                     </span>
                                   </div>
                                 </div>

                                 {/* Row 2: Proof statement (dashed border separating) */}
                                 <div className="text-[7.5px] text-gray-550 leading-tight italic font-bold pt-0.5 border-t border-dashed border-amber-100/40 font-sans text-left truncate">
                                   📢 <span translate="no" className="notranslate">{cand.proofText}</span>
                                 </div>
                               </div>
                             </motion.div>
                           );
                         })()}
                       </AnimatePresence>
                     </div>
                    </div>



                  {/* Welcome Greeting Box for Employee */}
                  <div className="w-full max-w-sm bg-blue-50/50 border border-blue-100 p-3 rounded-xl text-center shrink-0 shadow-3xs">
                    <p className="text-[10px] sm:text-xs text-[#1971C2] font-semibold uppercase tracking-wider leading-none">Thành Viên Dự Thi</p>
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#0B3A60] mt-1.5 leading-snug">
                      Chào mừng: <span className="text-[#E8590C]">{user.name}</span>
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-455 mt-1 leading-snug">Bộ phận: {user.department}</p>
                    {user.branch && user.branch !== 'Văn Phòng Công Ty (TPP-CTY)' && (
                      <p className="text-[10px] sm:text-xs text-gray-455 mt-0.5 leading-snug">Chi nhánh: {user.branch}</p>
                    )}
                  </div>

                  {/* Elegant PWA Quick Installation Action Button */}
                  <div className="w-full flex justify-center shrink-0">
                    <button
                      onClick={handlePwaInstall}
                      className="w-full max-w-sm flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 hover:text-emerald-950 font-extrabold text-[11px] sm:text-xs rounded-xl shadow-3xs hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                      <span>{pwaPrompt ? "CÀI ĐẶT APP 3T VỀ ĐIỆN THOẠI" : "HƯỚNG DẪN CÀI ĐẶT APP 3T"}</span>
                    </button>
                  </div>

                  {/* Action Buttons Row: ÔN LUYỆN CÂU SAI (left) & BẮT ĐẦU ĐÁNH GIÁ (right) */}
                  <div className="w-full flex items-center justify-center gap-2 sm:gap-3 shrink-0 my-0.5">
                    {/* Left Button: ÔN LUYỆN CÂU SAI */}
                    <button
                      onClick={startWrongQuestionsPractice}
                      className="flex-1 max-w-[190px] sm:max-w-[210px] flex items-center justify-center gap-1.5 py-3 px-2 sm:px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                    >
                      <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 group-hover:-rotate-45 transition-transform text-amber-100" />
                      <span translate="no" className="notranslate whitespace-nowrap">ÔN LUYỆN CÂU SAI</span>
                      {wrongQuestionsForPractice.length > 0 && (
                        <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center shadow-2xs ml-0.5 animate-pulse">
                          {wrongQuestionsForPractice.length}
                        </span>
                      )}
                    </button>

                    {/* Right Button: BẮT ĐẦU ĐÁNH GIÁ */}
                    <button
                      onClick={startQuiz}
                      className="flex-1 max-w-[190px] sm:max-w-[210px] flex items-center justify-center gap-1.5 py-3 px-2 sm:px-3 bg-[#1971C2] hover:bg-opacity-95 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                    >
                      <span translate="no" className="notranslate whitespace-nowrap">BẮT ĐẦU ĐÁNH GIÁ</span>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                  </div>

                  {/* Bottom Navigation Row: Ôn Tập (left), Đăng Xuất (middle) and Phân Tích (right) */}
                  <div className="w-full flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 gap-1 shrink-0 mt-auto pb-5 sm:pb-1">
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
                                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shrink-0">
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
                                          <div className={`h-2.5 w-2.5 rounded-full ${isCorrectOpt ? 'bg-green-600' : 'bg-red-600'}`} />
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
                                : "bg-green-50 border-green-200 text-green-700"
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
                          <div className="flex items-center gap-2 rounded-xl bg-green-50/80 p-3 text-xs sm:text-sm text-green-800 border border-green-200 font-sans text-left shrink-0 animate-pulse">
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
                                      ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                                      : (questionTimes[currentQuestionIndex] || 0) <= 50
                                        ? "text-amber-600 bg-amber-50 border border-amber-200"
                                        : "text-red-600 bg-red-50 border border-red-200 animate-pulse font-extrabold"
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
                                      if (quizInfoMessage) setQuizInfoMessage(null);
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
                              if (quizInfoMessage) setQuizInfoMessage(null);
                            }}
                            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <span translate="no" className="notranslate">Câu Trước</span>
                          </button>

                          {currentQuestionIndex < 2 ? (
                            <button
                              onClick={() => {
                                setCurrentQuestionIndex(prev => prev + 1);
                                if (quizInfoMessage) setQuizInfoMessage(null);
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
          {activeTab === 'practice' && !quizStarted && !showLevelRules && (
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

              {/* Chat BQT Floating Action Button with Red Count Bubble */}
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setActiveTab('quiz');
                  setAdminMobileTab('exchange');
                  scrollToTop();
                }}
                className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 transition-all cursor-pointer group shrink-0 relative animate-fadeIn"
                title="Chat Ban quản trị"
              >
                <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
                {unreadExchangeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold h-4.5 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[17px] leading-none animate-bounce">
                    {unreadExchangeCount}
                  </span>
                )}
              </motion.button>

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
          {activeTab === 'history' && !quizStarted && !showLevelRules && (
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

              {/* Chat BQT Floating Action Button with Red Count Bubble */}
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setActiveTab('quiz');
                  setAdminMobileTab('exchange');
                  scrollToTop();
                }}
                className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 transition-all cursor-pointer group shrink-0 relative animate-fadeIn"
                title="Chat Ban quản trị"
              >
                <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
                {unreadExchangeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold h-4.5 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[17px] leading-none animate-bounce">
                    {unreadExchangeCount}
                  </span>
                )}
              </motion.button>

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
          {activeTab === 'quiz' && adminMobileTab !== 'home' && adminMobileTab !== 'exchange' && !quizStarted && !showLevelRules && (
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

              {/* Chat BQT Floating Action Button with Red Count Bubble */}
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setAdminMobileTab('exchange');
                  scrollToTop();
                }}
                className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 transition-all cursor-pointer group shrink-0 relative animate-fadeIn"
                title="Chat Ban quản trị"
              >
                <MessageSquare className="h-5 w-5 group-hover:scale-110 transition-transform" />
                {unreadExchangeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-extrabold h-4.5 px-1 rounded-full border border-white flex items-center justify-center shadow-md min-w-[17px] leading-none animate-bounce">
                    {unreadExchangeCount}
                  </span>
                )}
              </motion.button>

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

          {/* Special Floating Action Buttons for Quy Chế (Level Rules) Viewport */}
          {showLevelRules && (
            <div className="absolute bottom-6 right-5 z-45 flex flex-col gap-2.5">
              {/* Scroll to Top Button */}
              <AnimatePresence>
                {showScrollTop && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    className="w-11 h-11 bg-[#132d4e] hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/20 transition-all cursor-pointer group shrink-0"
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
                  setShowLevelRules(false);
                  innerViewportRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="w-11 h-11 bg-[#099268] hover:bg-[#087f5b] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl border border-white/10 transition-all cursor-pointer group shrink-0"
                title="Quay về Trang chủ"
              >
                <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </motion.button>
            </div>
          )}

        {/* Centered Processing Loading Overlay (Matching User's Photo) */}
        <AnimatePresence>
          {isActionLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-100 flex items-center justify-center bg-black/25 backdrop-blur-[1.5px] p-4 pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="bg-[#0B3A60] rounded-2xl w-32 h-32 sm:w-36 sm:h-36 shadow-2xl border border-white/10 flex flex-col items-center justify-center p-3 gap-2.5 text-center"
              >
                <TwelveDotSpinner size={42} color="#FFFFFF" />
                {loadingText && (
                  <span className="text-white text-[11px] sm:text-xs font-bold leading-tight px-1 animate-pulse tracking-wide select-none">
                    {loadingText}
                  </span>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
