import React, { useState, useEffect } from 'react';
import { User } from './types';
import Landing from './components/Landing';
import EmployeeDashboard from './components/EmployeeDashboard';
import ApproverDashboard from './components/ApproverDashboard';
import AdminDashboard from './components/AdminDashboard';
import { databaseService } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulateEmployee, setSimulateEmployee] = useState(false);
  const [slogan, setSlogan] = useState('3T Hội Tụ - Tân Phú Vươn Xa');
  const [adminInitialTab, setAdminInitialTab] = useState<'users' | 'questions' | 'add_images' | 'qr' | 'stats' | 'encoding'>('users');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

      // Check Netlify host to strictly enforce showing the Landing/Login page under Netlify domain
      const isNetlifyDomain = typeof window !== 'undefined' && (
        window.location.hostname === 'quiz3t.netlify.app' || 
        window.location.hostname.includes('netlify.app')
      );

      if (isNetlifyDomain) {
        // Clear anything that bypasses login immediately on Netlify domain
        localStorage.removeItem('3t_active_user');
        localStorage.removeItem('3t_manual_login');
        localStorage.removeItem('3t_is_auto_logged_in');
      }

      // 2. Read saved user AFTER the wipe check is settled, only if manually logged in explicitly
      const savedUser = isNetlifyDomain ? null : localStorage.getItem('3t_active_user');
      const isManual = isNetlifyDomain ? false : localStorage.getItem('3t_manual_login') === 'true';
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
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };
    loadStartupData();
  }, []);

  // Tự động kiểm tra và kích hoạt chế độ toàn màn hình để ẩn thanh địa chỉ trình duyệt khi có tương tác đầu tiên bất kỳ đâu trên ứng dụng
  useEffect(() => {
    const autoFullscreenOnAnyInteraction = () => {
      const isMobileOrTablet = window.innerWidth < 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobileOrTablet && !document.fullscreenElement) {
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
      window.removeEventListener('click', autoFullscreenOnAnyInteraction);
      window.removeEventListener('touchstart', autoFullscreenOnAnyInteraction);
    };

    window.addEventListener('click', autoFullscreenOnAnyInteraction);
    window.addEventListener('touchstart', autoFullscreenOnAnyInteraction);
    return () => {
      window.removeEventListener('click', autoFullscreenOnAnyInteraction);
      window.removeEventListener('touchstart', autoFullscreenOnAnyInteraction);
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

  return (
    <div className={`min-h-screen bg-gray-50 ${currentUser?.role === 'admin' ? 'select-text' : 'select-none'}`}>
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
                  initialTab={adminInitialTab}
                />
              )
            ) : currentUser.role === 'approver' ? (
              <EmployeeDashboard user={currentUser} onLogout={handleLogout} slogan={slogan} />
            ) : (
              <EmployeeDashboard user={currentUser} onLogout={handleLogout} slogan={slogan} isAdminReview={false} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
