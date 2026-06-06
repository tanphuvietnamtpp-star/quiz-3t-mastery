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

  // Check saved session in LocalStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('3t_active_user');
    const loadStartupData = async () => {
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

      let activeUser: User | null = null;
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as User;
          activeUser = parsed;
        } catch {
          // Ignore
        }
      }

      // Auto-Sign In to supreme admin Lê Nhật Trường on the preview window to avoid needing manual login credentials info
      if (!activeUser) {
        try {
          const defaultAdminUser = await databaseService.loginUser('0907767304', '111222');
          activeUser = defaultAdminUser;
          localStorage.setItem('3t_active_user', JSON.stringify(defaultAdminUser));
        } catch (err) {
          console.warn("Auto-login to supreme admin failed:", err);
        }
      } else {
        // Re-authenticate silently against current database state to check if status was updated (e.g. approved)
        try {
          const freshUser = await databaseService.loginUser(activeUser.phone);
          if (freshUser.status?.toLowerCase() === 'approved') {
            activeUser = freshUser;
            localStorage.setItem('3t_active_user', JSON.stringify(freshUser));
          } else {
            // Status changed to pending or rejected
            localStorage.removeItem('3t_active_user');
            activeUser = null;
          }
        } catch {
          // Offline fallback
        }
      }

      if (activeUser) {
        setCurrentUser(activeUser);
      }
      setLoading(false);
    };
    loadStartupData();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('3t_active_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('3t_active_user');
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
                  onBackToAdmin={() => setSimulateEmployee(false)}
                  slogan={slogan}
                />
              ) : (
                <AdminDashboard 
                  user={currentUser} 
                  onLogout={handleLogout} 
                  onSimulateEmployee={() => setSimulateEmployee(true)}
                  slogan={slogan}
                  onUpdateSlogan={handleUpdateSlogan}
                />
              )
            ) : currentUser.role === 'approver' ? (
              <ApproverDashboard user={currentUser} onLogout={handleLogout} slogan={slogan} />
            ) : (
              <EmployeeDashboard user={currentUser} onLogout={handleLogout} slogan={slogan} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
