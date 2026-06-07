import React, { useState, useEffect } from 'react';
import { databaseService } from '../firebase';
import { User, CompanyMapping } from '../types';
import { Sparkles, Shield, UserCheck, AlertCircle, Phone, Lock, User as UserIcon, Landmark, Briefcase, Building, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingProps {
  onLoginSuccess: (user: User) => void;
  slogan?: string;
}

export default function Landing({ onLoginSuccess, slogan }: LandingProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('3t_remember_me') === 'true';
  });
  const [employeeId, setEmployeeId] = useState(() => {
    const isRemembered = localStorage.getItem('3t_remember_me') === 'true';
    return isRemembered ? (localStorage.getItem('3t_saved_employee_id') || '') : '';
  });
  const [phone, setPhone] = useState(() => {
    const isRemembered = localStorage.getItem('3t_remember_me') === 'true';
    return isRemembered ? (localStorage.getItem('3t_saved_phone') || '') : '';
  });
  const [password, setPassword] = useState(() => {
    const isRemembered = localStorage.getItem('3t_remember_me') === 'true';
    return isRemembered ? (localStorage.getItem('3t_saved_password') || '') : '';
  });
  const [name, setName] = useState('');
  
  const [mappings, setMappings] = useState<CompanyMapping[]>([]);
  const [company, setCompany] = useState('TÂN PHÚ VIỆT NAM');
  const [branch, setBranch] = useState('Văn Phòng Nam Kỳ');
  const [department, setDepartment] = useState('Phòng Quản Lý Chất Lượng (P.QLCL)');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [approvalNotification, setApprovalNotification] = useState<{
    type: 'pending' | 'approved';
    employeeId: string;
    phone: string;
  } | null>(null);

  // Use a ref to capture the current state of phone/employeeId without stale closures or trigger deps
  const inputsRef = React.useRef({ employeeId, phone });
  inputsRef.current = { employeeId, phone };

  const [isFullscreen, setIsFullscreen] = useState(false);

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
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement) {
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

  // Check the approval status of a previously registered employee
  useEffect(() => {
    const checkApprovalStatus = async () => {
      const storedEmpId = localStorage.getItem('3t_registered_employee_id');
      const storedPhone = localStorage.getItem('3t_registered_phone');
      if (!storedEmpId) {
        setApprovalNotification(null);
        return;
      }

      try {
        const user = await databaseService.getUserByEmployeeId(storedEmpId);
        if (user) {
          const status = user.status?.toLowerCase() || 'pending';
          if (status === 'pending') {
            setApprovalNotification({
              type: 'pending',
              employeeId: storedEmpId,
              phone: storedPhone || user.phone || ''
            });
          } else if (status === 'approved' || status === 'active') {
            setApprovalNotification({
              type: 'approved',
              employeeId: storedEmpId,
              phone: storedPhone || user.phone || ''
            });
            // Auto fill fields for quick login if they are currently blank
            if (!inputsRef.current.employeeId && !inputsRef.current.phone) {
              setEmployeeId(storedEmpId);
              setPhone(storedPhone || user.phone || '');
            }
          } else {
            setApprovalNotification(null);
          }
        } else {
          setApprovalNotification(null);
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra trạng thái duyệt:", err);
      }
    };

    checkApprovalStatus();
    const interval = setInterval(checkApprovalStatus, 8000); // Poll status every 8 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const data = await databaseService.getCompanyMappings();
        setMappings(data);
        
        // Match default values if they exist
        const hasTPVN = data.find(m => m.name === 'TÂN PHÚ VIỆT NAM');
        if (hasTPVN) {
          setCompany('TÂN PHÚ VIỆT NAM');
          const hasNamKy = hasTPVN.branches.find(b => b.name === 'Văn Phòng Nam Kỳ');
          if (hasNamKy) {
            setBranch('Văn Phòng Nam Kỳ');
            const hasQLCL = hasNamKy.departments.find(d => d.name === 'Phòng Quản Lý Chất Lượng (P.QLCL)');
            if (hasQLCL) {
              setDepartment('Phòng Quản Lý Chất Lượng (P.QLCL)');
            } else if (hasNamKy.departments.length > 0) {
              setDepartment(hasNamKy.departments[0].name);
            }
          } else if (hasTPVN.branches.length > 0) {
            setBranch(hasTPVN.branches[0].name);
            const firstBr = hasTPVN.branches[0];
            if (firstBr.departments.length > 0) {
              setDepartment(firstBr.departments[0].name);
            }
          }
        } else if (data.length > 0) {
          const firstCo = data[0];
          setCompany(firstCo.name);
          if (firstCo.branches.length > 0) {
            const firstBr = firstCo.branches[0];
            setBranch(firstBr.name);
            if (firstBr.departments.length > 0) {
              setDepartment(firstBr.departments[0].name);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin công ty:", err);
      }
    };
    fetchMappings();
  }, []);

  const handleCompanyChange = (newCoName: string) => {
    setCompany(newCoName);
    const co = mappings.find(m => m.name === newCoName);
    if (co && co.branches && co.branches.length > 0) {
      const firstBranch = co.branches[0];
      setBranch(firstBranch.name);
      if (firstBranch.departments && firstBranch.departments.length > 0) {
        setDepartment(firstBranch.departments[0].name);
      } else {
        setDepartment('');
      }
    } else {
      setBranch('');
      setDepartment('');
    }
  };

  const handleBranchChange = (newBranchName: string) => {
    setBranch(newBranchName);
    const co = mappings.find(m => m.name === company);
    if (co) {
      const br = co.branches.find(b => b.name === newBranchName);
      if (br && br.departments && br.departments.length > 0) {
        setDepartment(br.departments[0].name);
      } else {
        setDepartment('');
      }
    }
  };

  const resetForm = () => {
    setPhone('');
    setPassword('');
    setName('');
    setEmployeeId('');
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !employeeId) {
      setError('Vui lòng điền đầy đủ số điện thoại, mã nhân sự và mật khẩu. Nếu không đăng nhập được thì liên hệ Admin: 0907767304.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const user = await databaseService.loginUser(phone, password, employeeId);
      const normalizedStatus = user.status?.toLowerCase();
      if (normalizedStatus === 'pending') {
        setError('Tài khoản của bạn đang chờ được duyệt bởi Trưởng Bộ phận / Ban quản trị. Vui lòng liên hệ quản lý để được kích hoạt. Nếu không đăng nhập được thì liên hệ Admin: 0907767304.');
        setLoading(false);
        return;
      }
      if (normalizedStatus === 'rejected') {
        setError('Tài khoản của bạn đã bị từ chối truy cập. Vui lòng liên hệ Admin Lê Nhật Trường (SĐT: 0907767304).');
        setLoading(false);
        return;
      }

      // Handle remember me storage
      if (rememberMe) {
        localStorage.setItem('3t_remember_me', 'true');
        localStorage.setItem('3t_saved_employee_id', employeeId.trim());
        localStorage.setItem('3t_saved_phone', phone.trim());
        localStorage.setItem('3t_saved_password', password);
      } else {
        localStorage.setItem('3t_remember_me', 'false');
        localStorage.removeItem('3t_saved_employee_id');
        localStorage.removeItem('3t_saved_phone');
        localStorage.removeItem('3t_saved_password');
      }

      // Successful login - clear local stored registration tracking so the approved banner goes away permanently
      localStorage.removeItem('3t_registered_employee_id');
      localStorage.removeItem('3t_registered_phone');
      setApprovalNotification(null);

      onLoginSuccess(user);
    } catch (err: any) {
      setError((err.message || 'Lỗi đăng nhập') + '. Nếu không đăng nhập được thì liên hệ Admin: 0907767304.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !name || !employeeId) {
      setError('Vui lòng điền đầy đủ tất cả các trường bao gồm mã nhân sự.');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Filter name Lê Nhật Trường to auto-admin
    const isLNT = name.trim() === 'Lê Nhật Trường';

    try {
      const newUser = await databaseService.registerUser({
        name: name.trim(),
        phone: phone.trim(),
        password: password,
        company: isLNT ? 'TÂN PHÚ VIỆT NAM' : company,
        branch: isLNT ? 'Văn Phòng Nam Kỳ' : branch,
        department: isLNT ? 'Phòng Quản Lý Chất Lượng (P.QLCL)' : department,
        employeeId: employeeId.trim()
      });

      if (isLNT) {
        setSuccess('Đăng ký tài khoản Admin tối cao Lê Nhật Trường thành công! Bạn có thể chọn đăng nhập ngay.');
        setPassword('');
      } else {
        // Save tracking information
        const trimmedEmpId = employeeId.trim();
        const trimmedPhone = phone.trim();
        localStorage.setItem('3t_registered_employee_id', trimmedEmpId);
        localStorage.setItem('3t_registered_phone', trimmedPhone);

        // Pre-configure notification state
        setApprovalNotification({
          type: 'pending',
          employeeId: trimmedEmpId,
          phone: trimmedPhone
        });

        resetForm();
        setSuccess('Đăng ký thành công! Đang chờ phê duyệt. Bạn chưa thể đăng nhập ngay được.');
        setIsRegister(false);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng ký tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 relative">
      {/* Nút Toàn Màn Hình nổi ở góc trên bên phải */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-full text-[11px] font-extrabold tracking-wide cursor-pointer shadow-sm transition-all active:scale-95 text-[#1971C2]"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5 text-blue-600 animate-pulse" />}
          <span>{isFullscreen ? "THOÁT TOÀN MÀN HÌNH" : "BUNG TOÀN MÀN HÌNH (ẨN ĐỊA CHỈ)"}</span>
        </button>
      </div>

      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-md shadow-sm border border-gray-100">
        <div className="text-center">
          {/* Logo container */}
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#07243c] via-[#0B3A60] to-[#1d5985] border-2 border-blue-400/20 shadow-md ring-4 ring-blue-950/10 select-none shrink-0 relative overflow-hidden">
            {/* Glossy light effect */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none transform -skew-y-12" />
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#E8590C]/20 rounded-full blur-md pointer-events-none" />
            <span translate="no" className="notranslate text-4xl font-black tracking-tighter font-sans relative z-10 flex items-center justify-center">
              <span className="text-[#E8590C] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">3</span>
              <span className="text-white -ml-0.5 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.35)]">T</span>
            </span>
          </div>
          <h2 className="mt-6 text-3xl font-sans font-bold tracking-tight text-gray-900">
            <span translate="no" className="notranslate">Văn Hóa 3T Portal</span>
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-sans">
            <span translate="no" className="notranslate">{slogan || '3T Hội Tụ - Tân Phú Vươn Xa'}</span>
          </p>
        </div>

        {/* Notices */}
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span translate="no" className="notranslate">{error}</span>
          </div>
        )}

        {success && !approvalNotification && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-100">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span translate="no" className="notranslate">{success}</span>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50 p-1 rounded-md">
            <button
              onClick={() => { 
                setIsRegister(false); 
                setError(null); 
                const isRemembered = localStorage.getItem('3t_remember_me') === 'true';
                if (isRemembered) {
                  setEmployeeId(localStorage.getItem('3t_saved_employee_id') || '');
                  setPhone(localStorage.getItem('3t_saved_phone') || '');
                  setPassword(localStorage.getItem('3t_saved_password') || '');
                } else {
                  setEmployeeId('');
                  setPhone('');
                  setPassword('');
                }
              }}
              className={`w-full py-2 text-sm font-medium rounded-md transition-all ${!isRegister ? 'bg-white shadow-sm text-gray-900 font-bold border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span translate="no" className="notranslate">Đăng Nhập</span>
            </button>
            <button
              onClick={() => { 
                setIsRegister(true); 
                setError(null); 
                setEmployeeId('');
                setPhone('');
                setPassword('');
              }}
              className={`w-full py-2 text-sm font-medium rounded-md transition-all ${isRegister ? 'bg-white shadow-sm text-gray-900 font-bold border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span translate="no" className="notranslate">Đăng Ký</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!isRegister ? (
              <motion.form 
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleLogin} 
                className="space-y-4"
              >
                {approvalNotification && (
                  <div className={`p-3.5 rounded-md border flex gap-3 text-xs leading-relaxed transition-all duration-300 ${
                    approvalNotification.type === 'pending'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-[#0F766E]'
                  }`}>
                    <div className="shrink-0 mt-0.5">
                      {approvalNotification.type === 'pending' ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse mt-0.5" />
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-bounce mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-bold">
                        {approvalNotification.type === 'pending' 
                          ? 'Đăng ký thành công! Đang chờ phê duyệt. Bạn chưa thể đăng nhập ngay được'
                          : 'Tài khoản đã được duyệt, đăng nhập sử dụng ngay'
                        }
                      </p>
                      <div className="text-[10px] opacity-80 flex flex-wrap gap-x-2">
                        <span>Mã NS: {approvalNotification.employeeId}</span>
                        <span>•</span>
                        <span>SĐT: {approvalNotification.phone}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Mã Nhân Sự</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Nhập mã nhân sự..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Số điện thoại</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Nhập số điện thoại..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Mật khẩu</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-350 text-[#1971C2] focus:ring-[#1971C2] cursor-pointer"
                    />
                    <span className="text-xs text-gray-600 font-medium select-none">Nhớ thông tin đăng nhập</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-bold text-white bg-[#1971C2] hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1971C2] shadow-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <span translate="no" className="notranslate">Đang đăng nhập...</span>
                    ) : (
                      <span translate="no" className="notranslate">Vào lớp học</span>
                    )}
                  </button>
                </div>

                <div className="pt-1 text-[11.5px] text-gray-500/95 text-center bg-gray-50/80 rounded border border-gray-150 p-2.5 leading-relaxed font-sans">
                  Nếu không đăng nhập được thì liên hệ Admin: <a href="tel:0907767304" className="text-[#1971C2] font-semibold hover:underline">0907767304</a>.
                </div>
              </motion.form>
            ) : (
              <motion.form 
                key="register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleRegister} 
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Họ và Tên</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập họ tên đầy đủ..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-450 italic">
                    <span translate="no" className="notranslate">* Lưu ý: Điền chính xác "Lê Nhật Trường" nếu là quản trị viên tối cao.</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Mã Nhân Sự</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Nhập mã nhân sự mới..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Số điện thoại</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Vị trí đăng ký liên hệ..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Mật khẩu</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tạo mật khẩu đăng nhập..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Công Ty Thành Viên</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <select
                      value={company}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 bg-white text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                    >
                      {mappings.map((co) => (
                        <option key={co.id} value={co.name}>{co.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Chi nhánh/ Văn Phòng Đại Diện</span>
                  </label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <select
                      value={branch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 bg-white text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                    >
                      {(mappings.find(m => m.name === company)?.branches || []).map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Bộ phận/ Đơn Vị</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 bg-white text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                    >
                      {(mappings.find(m => m.name === company)?.branches.find(b => b.name === branch)?.departments || []).map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-bold text-white bg-[#1971C2] hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1971C2] shadow-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <span translate="no" className="notranslate">Đang xử lý đăng ký...</span>
                    ) : (
                      <span translate="no" className="notranslate">Đăng Ký Tài Khoản</span>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
