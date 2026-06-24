import React, { useState, useEffect } from 'react';
import { User, MotivationalSloganBand } from './types';
import Landing from './components/Landing';
import EmployeeDashboard from './components/EmployeeDashboard';
import ApproverDashboard from './components/ApproverDashboard';
import AdminDashboard from './components/AdminDashboard';
import { databaseService } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, KeyRound, Trophy, Sparkles, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulateEmployee, setSimulateEmployee] = useState(false);
  const [slogan, setSlogan] = useState('3T Hội Tụ - Tân Phú Vươn Xa');
  const [difficulty, setDifficulty] = useState(1);
  const [motivationalSlogans, setMotivationalSlogans] = useState<MotivationalSloganBand[]>([]);
  const [congratsNotification, setCongratsNotification] = useState<{ id: string; userName: string; type: 'record_broken' | 'level_5'; detail: string; timestamp: number } | null>(null);

  const [adminInitialTab, setAdminInitialTab] = useState<'users' | 'questions' | 'add_images' | 'qr' | 'stats' | 'encoding' | 'firebase_data'>('users');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [maintenanceObj, setMaintenanceObj] = useState<{ isMaintenance: boolean; message: string }>({ isMaintenance: false, message: '' });
  const [showAdminBypass, setShowAdminBypass] = useState(false);

  // Subscribe to maintenance status
  useEffect(() => {
    const unsubscribe = databaseService.subscribeMaintenanceMode((data) => {
      setMaintenanceObj(data);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time congrats announcements (record shatters / Level 5 promotions)
  useEffect(() => {
    const appOpenedTime = Date.now() - 3000; // Only get announcements published from this moment onwards (allow 3s window)
    const unsubscribe = databaseService.subscribeAnnouncements((announcements: any[]) => {
      if (!announcements || announcements.length === 0) return;
      const recent = announcements
        .filter((a: any) => a.timestamp > appOpenedTime)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      if (recent.length > 0) {
        setCongratsNotification(recent[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-dismiss congratulations toast after 10 seconds
  useEffect(() => {
    if (congratsNotification) {
      const timer = setTimeout(() => {
        setCongratsNotification(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [congratsNotification]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Real-time active presence heartbeat to track online state
  useEffect(() => {
    if (!currentUser?.id) return;

    const updatePresence = async () => {
      try {
        if (databaseService.isConfigured()) {
          await databaseService.updateUser(currentUser.id, { lastActive: Date.now() });
        }
      } catch (err) {
        console.warn('Silent presence update failed (ignoring background error):', err);
      }
    };

    // Run immediately on mount or user shift
    updatePresence();

    const interval = setInterval(() => {
      // Only write presence when page tab is visible to prevent wasting write operations
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updatePresence();
      }
    }, 45000); // Heartbeat every 45 seconds

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Subscribe to real-time current user profile updates (role, status, department, branch, etc.)
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = databaseService.subscribeUser(currentUser.id, (updatedUser) => {
      if (updatedUser) {
        if (updatedUser.status?.toLowerCase() !== 'approved' && currentUser.role !== 'admin') {
          // If the profile gets disapproved and they are not a hardcoded admin, log them out
          handleLogout();
          return;
        }

        setCurrentUser(prevUser => {
          if (!prevUser) return updatedUser;
          // Compare relevant fields to prevent unnecessary state triggers, but sync if changes occurred
          const hasChanged = 
            prevUser.name !== updatedUser.name ||
            prevUser.department !== updatedUser.department ||
            prevUser.branch !== updatedUser.branch ||
            prevUser.role !== updatedUser.role ||
            prevUser.status !== updatedUser.status ||
            prevUser.canViewStats !== updatedUser.canViewStats ||
            prevUser.phone !== updatedUser.phone ||
            prevUser.password !== updatedUser.password;

          if (hasChanged) {
            localStorage.setItem('3t_active_user', JSON.stringify(updatedUser));
            return updatedUser;
          }
          return prevUser;
        });
      } else {
        // If user doc was deleted/removed, log out
        handleLogout();
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Secure Startup Logic: Synchronously clear legacy sessions and check saved states sequentially
  useEffect(() => {
    const loadStartupData = async () => {
      // 1. Force a strict global nuclear reset clean up of ALL sessions to wipe previous auto-logins on scanning phones/tablets
      const hasWiped = localStorage.getItem('3t_nuclear_wipe_v10');
      if (!hasWiped) {
        localStorage.clear();
        localStorage.setItem('3t_nuclear_wipe_v10', 'true');
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        await databaseService.initialize();
      } catch (err) {
        console.warn("Dynamic initialization failed, fallback active:", err);
      }

      try {
        const freshSlogan = await databaseService.getSlogan();
        setSlogan(freshSlogan);
      } catch (err) {
        console.warn("Failed to retrieve live slogan:", err);
      }

      try {
        const freshMotivational = await databaseService.getMotivationalSlogans();
        setMotivationalSlogans(freshMotivational);
      } catch (err) {
        console.warn("Failed to retrieve live motivational slogans:", err);
      }

      try {
        const freshDifficulty = await databaseService.getDifficulty();
        setDifficulty(freshDifficulty);
      } catch (err) {
        console.warn("Failed to retrieve live difficulty:", err);
      }

      // Check production host to strictly enforce showing the Landing/Login page under production domains
      const isProductionDomain = typeof window !== 'undefined' && (
        window.location.hostname === 'quiz3t.netlify.app' || 
        window.location.hostname.includes('netlify.app') ||
        window.location.hostname === 'quiz3t.vercel.app' ||
        window.location.hostname.includes('vercel.app')
      );

      // 2. Read saved user AFTER the wipe check is settled, only if manually logged in explicitly
      const savedUser = localStorage.getItem('3t_active_user');
      const isManual = localStorage.getItem('3t_manual_login') === 'true';
      let activeUser: User | null = null;
      
      if (savedUser && isManual) {
        try {
          const parsed = JSON.parse(savedUser) as User;
          activeUser = parsed;
        } catch {
          // Ignore
        }
      } else {
        // Clear anything parsed by accident if not explicitly manually logged in
        localStorage.removeItem('3t_active_user');
        localStorage.removeItem('3t_is_auto_logged_in');
        localStorage.removeItem('3t_manual_login');
      }

      if (activeUser) {
        // Re-authenticate strictly using full credentials to check user's approval status
        try {
          if (activeUser.phone && activeUser.password && activeUser.employeeId) {
            const freshUser = await databaseService.loginUser(activeUser.phone, activeUser.password, activeUser.employeeId);
            if (freshUser.status?.toLowerCase() === 'approved') {
              activeUser = freshUser;
              localStorage.setItem('3t_active_user', JSON.stringify(freshUser));
            } else {
              localStorage.removeItem('3t_active_user');
              localStorage.removeItem('3t_manual_login');
              activeUser = null;
            }
          } else {
            // Missing credentials, force log out
            localStorage.removeItem('3t_active_user');
            localStorage.removeItem('3t_manual_login');
            activeUser = null;
          }
        } catch {
          // Offline/Network fail fallback - keep current session
        }
      }

      if (activeUser) {
        setCurrentUser(activeUser);
        if (activeUser.role === 'admin') {
          // Chỉ tự động cài chế độ giả lập nếu dùng điện thoại di động (màn hình nhỏ hoặc mobile user agent).
          // Trên máy tính thì mặc định hiển thị luôn bảng điều khiển phê duyệt Admin.
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
          setSimulateEmployee(isMobileDevice);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };
    loadStartupData();
  }, []);

  // Tự động kiểm tra và kích hoạt chế độ toàn màn hình để ẩn thanh địa chỉ trình duyệt khi có tương tác đầu tiên, đồng thời hỗ trợ click đúp (Desktop) hoặc gõ đúp (Mobile) để bật/tắt toàn màn hình
  useEffect(() => {
    const isMobileDevice = window.innerWidth < 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let lastTap = 0;

    const toggleFullscreenOnInteraction = () => {
      const doc = document as any;
      const docEl = document.documentElement as any;
      const isCurrentlyFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      
      if (!isCurrentlyFs) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen({ navigationUI: "hide" });
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } else {
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
    };

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        if (
          target.tagName === "INPUT" || 
          target.tagName === "TEXTAREA" || 
          target.tagName === "BUTTON" || 
          target.tagName === "A" ||
          target.closest(".cursor-zoom-in") || 
          target.closest(".cursor-move") ||
          target.closest("button")
        ) {
          return;
        }
      }
      toggleFullscreenOnInteraction();
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        if (
          target.tagName === "INPUT" || 
          target.tagName === "TEXTAREA" || 
          target.tagName === "BUTTON" || 
          target.tagName === "A" ||
          target.closest(".cursor-zoom-in") || 
          target.closest(".cursor-move") ||
          target.closest("button")
        ) {
          return;
        }
      }

      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (now - lastTap < DOUBLE_TAP_DELAY) {
        if (e.cancelable) {
          e.preventDefault();
        }
        toggleFullscreenOnInteraction();
      }
      lastTap = now;
    };

    // Tự động kích hoạt khi có chạm/click đầu tiên trên di động
    const handleFirstInteraction = () => {
      const doc = document as any;
      const docEl = document.documentElement as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen({ navigationUI: "hide" });
        }
      }
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("click", handleFirstInteraction);
    };

    if (isMobileDevice) {
      window.addEventListener("touchstart", handleFirstInteraction, { passive: true });
      window.addEventListener("click", handleFirstInteraction);
    }

    // Luôn hỗ trợ click đúp (Desktop) và gõ đúp (Mobile) để bật/tắt toàn màn hình
    window.addEventListener("dblclick", handleDblClick);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("dblclick", handleDblClick);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  // Lắng nghe thay đổi trạng thái fullscreen để cập nhật UI đồng bộ
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
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
        console.warn("Manual fullscreen failed:", err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      } catch (err) {
        console.warn("Exit fullscreen failed:", err);
      }
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('3t_active_user', JSON.stringify(user));
    localStorage.removeItem('3t_is_auto_logged_in');
    localStorage.setItem('3t_manual_login', 'true');
    
    if (user.role === 'admin') {
      // Chỉ tự động cài chế độ giả lập nếu dùng điện thoại di động (màn hình nhỏ hoặc mobile user agent).
      // Trên máy tính thì mặc định hiển thị luôn bảng điều khiển phê duyệt Admin.
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setSimulateEmployee(isMobileDevice);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('3t_active_user');
    localStorage.removeItem('3t_is_auto_logged_in');
    localStorage.removeItem('3t_manual_login');
  };

  const handleUpdateSlogan = async (newSlogan: string) => {
    try {
      await databaseService.saveSlogan(newSlogan);
      setSlogan(newSlogan);
    } catch (err) {
      console.error("Lỗi khi cập nhật Slogan:", err);
    }
  };

  const handleUpdateDifficulty = async (newLevel: number) => {
    try {
      await databaseService.saveDifficulty(newLevel);
      setDifficulty(newLevel);
    } catch (err) {
      console.error("Lỗi khi cập nhật Độ khó:", err);
    }
  };

  const handleUpdateMotivationalSlogans = async (newValue: MotivationalSloganBand[]) => {
    try {
      await databaseService.saveMotivationalSlogans(newValue);
      setMotivationalSlogans(newValue);
    } catch (err) {
      console.error("Lỗi khi cập nhật danh sách slogan truyền động lực:", err);
    }
  };


  const handleUpdateMaintenance = async (isMaintenance: boolean, message: string) => {
    try {
      await databaseService.saveMaintenanceMode(isMaintenance, message);
      setMaintenanceObj({ isMaintenance, message });
    } catch (err) {
      console.error("Lỗi khi cập nhật Chế độ Bảo trì:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-150 border-t-4 border-t-blue-600 rounded-full animate-spin"></div>
          <span translate="no" className="notranslate text-xs font-semibold text-gray-500 uppercase tracking-widest animate-pulse">
            Đang đồng bộ dữ liệu 3T...
          </span>
        </div>
      </div>
    );
  }

  const hasBypassParam = typeof window !== 'undefined' && window.location.search.includes('bypass=true');
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.phone === '0907767304';
  const isSystemMaintenance = maintenanceObj.isMaintenance && !isAdminUser && (!currentUser ? !hasBypassParam : true);

  if (isSystemMaintenance) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white select-text">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-6 md:p-8 shadow-2xl relative overflow-hidden transition-all duration-300 animate-fade-in animate-once">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500 animate-pulse"></div>
          
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20 text-amber-500 animate-pulse">
              <Wrench className="h-12 w-12" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-none">
                Tạm Khóa Bảo Trì
              </h1>
              <p className="text-xs font-mono text-amber-500 uppercase tracking-widest">
                SYSTEM UNDER MAINTENANCE / FIREBASE PROTECT
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/50 text-sm text-slate-300 font-medium leading-relaxed shadow-inner w-full text-justify whitespace-pre-wrap">
              {maintenanceObj.message || 'Hệ thống đang tạm khóa để bảo trì phần cứng và đồng bộ cấu trúc dữ liệu mới. Vui lòng quay lại sau ít phút!'}
            </div>
            
            <div className="w-full text-xs text-slate-400 space-y-2">
              <div className="font-bold uppercase text-[10px] tracking-wider text-slate-500 text-left">Bộ phận hỗ trợ kỹ thuật:</div>
              <div className="flex justify-between items-center bg-slate-900/50 py-2 px-3 rounded-md border border-slate-700/20">
                <span>Trưởng Phòng QLCL:</span>
                <span className="font-semibold text-white">0907.767.304 (Mr. Trường)</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/50 w-full">
              <button 
                onClick={() => {
                  const pass = prompt("Nhập mật mã xác thực quản trị viên để mở cổng sơ cứu:");
                  if (pass === '111222') {
                    window.location.search = '?bypass=true';
                  } else if (pass !== null) {
                    alert("Mật mã quản trị viên không chính xác!");
                  }
                }}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-98 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-600 shadow-sm font-sans uppercase tracking-wider"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Cổng Sơ Cứu Khẩn Cấp (Admin Bypass)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${currentUser?.role === 'admin' ? 'select-text' : 'select-none'}`}>
      {/* 🎉 REAL-TIME GLOBAL CONGRATULATORY BANNER 🎉 */}
      <AnimatePresence>
        {congratsNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-2rem)] bg-slate-900 text-white rounded-2xl shadow-2xl border border-amber-500/40 p-5 overflow-hidden font-sans border-l-4 border-l-amber-500"
          >
            <div className="flex items-start gap-3.5 pl-1 relative">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400 shrink-0 select-none">
                <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-[10px] font-sans font-black tracking-widest text-amber-400 uppercase leading-none flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
                  <span>Vinh Danh Đỉnh Cao 3T</span>
                </h4>
                <p className="text-[13px] font-sans font-bold text-gray-100 mt-1.5 leading-snug">
                  Chiến binh <span translate="no" className="text-yellow-405 font-black uppercase text-amber-305 notranslate">{congratsNotification.userName}</span> <span translate="no" className="notranslate">{congratsNotification.detail}</span>
                </p>
                <div className="text-[9px] text-gray-400 font-bold mt-2 font-mono">
                  {new Date(congratsNotification.timestamp).toLocaleTimeString('vi-VN')} - REAL-TIME BROADCAST
                </div>
              </div>
              
              <button 
                onClick={() => setCongratsNotification(null)}
                className="absolute top-0 right-0 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {maintenanceObj.isMaintenance && currentUser?.role !== 'admin' && (showAdminBypass || hasBypassParam) && (
        <div className="bg-amber-600 text-white text-[11px] font-bold py-2 px-4 text-center animate-pulse flex justify-between items-center gap-4 shrink-0 shadow-md font-sans">
          <span>⚠️ HỆ THỐNG ĐANG TẠM KHÓA BẢO TRÌ. ĐĂNG NHẬP CHỈ DÀNH CHO ADMIN KHẨN CẤP!</span>
          <button 
            onClick={() => {
              window.location.href = window.location.pathname; // Clear the search bypass query
            }}
            className="bg-black/40 hover:bg-black/60 text-white font-sans text-[10px] uppercase font-black py-1 px-3 rounded transition-all active:scale-95 border border-white/20 whitespace-nowrap"
          >
            Quay lại thông báo
          </button>
        </div>
      )}
      <div className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div
              key="landing_view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <Landing onLoginSuccess={handleLoginSuccess} slogan={slogan} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard_view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              {currentUser.role === 'admin' ? (
                simulateEmployee ? (
                  <EmployeeDashboard 
                    user={currentUser} 
                    onLogout={handleLogout} 
                    isAdminReview={true}
                    onBackToAdmin={(tab) => {
                      if (tab) {
                        setAdminInitialTab(tab);
                      }
                      setSimulateEmployee(false);
                    }}
                    slogan={slogan}
                    difficulty={difficulty}
                    onUpdateDifficulty={handleUpdateDifficulty}
                    motivationalSlogans={motivationalSlogans}
                  />
                ) : (
                  <AdminDashboard 
                    user={currentUser} 
                    onLogout={handleLogout} 
                    onSimulateEmployee={() => {
                      setAdminInitialTab('users');
                      setSimulateEmployee(true);
                    }}
                    slogan={slogan}
                    onUpdateSlogan={handleUpdateSlogan}
                    difficulty={difficulty}
                    onUpdateDifficulty={handleUpdateDifficulty}
                    initialTab={adminInitialTab}
                    maintenanceObj={maintenanceObj}
                    onUpdateMaintenance={handleUpdateMaintenance}
                    motivationalSlogans={motivationalSlogans}
                    onUpdateMotivationalSlogans={handleUpdateMotivationalSlogans}
                  />
                )
              ) : currentUser.role === 'approver' ? (
                <EmployeeDashboard user={currentUser} onLogout={handleLogout} slogan={slogan} difficulty={difficulty} onUpdateDifficulty={handleUpdateDifficulty} motivationalSlogans={motivationalSlogans} />
              ) : currentUser.role === 'executive' ? (
                <EmployeeDashboard user={currentUser} onLogout={handleLogout} slogan={slogan} difficulty={difficulty} onUpdateDifficulty={handleUpdateDifficulty} isAdminReview={true} motivationalSlogans={motivationalSlogans} />
              ) : (
                <EmployeeDashboard user={currentUser} onLogout={handleLogout} slogan={slogan} difficulty={difficulty} onUpdateDifficulty={handleUpdateDifficulty} isAdminReview={false} motivationalSlogans={motivationalSlogans} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
