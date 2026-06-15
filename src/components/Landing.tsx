import React, { useState, useEffect } from 'react';
import { databaseService } from '../firebase';
import { User, CompanyMapping } from '../types';
import { Sparkles, Shield, UserCheck, AlertCircle, Phone, Lock, User as UserIcon, Landmark, Briefcase, Building } from 'lucide-react';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [mappings, setMappings] = useState<CompanyMapping[]>([]);
  const [company, setCompany] = useState('TÂN PHÚ VIỆT NAM');
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmployeeIdChange = (value: string, previousValue: string, setFn: (val: string) => void) => {
    let val = value.replace(/\s+/g, ''); // Trim all whitespace
    val = val.replace(/[^0-9.]/g, ''); // Only allow digits and dots
    
    if (val.length > 10) {
      val = val.substring(0, 10); // Limit to maximum 10 characters
    }
    
    // Automatically insert dot if user is typing forward and reaches 4 digits
    if (val.length > previousValue.length) {
      if (/^\d{4}$/.test(val)) {
        val = val + '.';
      }
    }
    setFn(val);
  };

  const isEmployeeIdValid = (id: string) => {
    return /^\d{4}\.\d{5}$/.test(id);
  };

  const isPhoneValid = (p: string) => {
    const digits = p.replace(/\s+/g, '');
    return digits.length === 10 && digits.startsWith('0');
  };

  const handlePhoneChange = (value: string) => {
    // Chỉ nhận số: Tuyệt đối không cho gõ chữ hoặc ký tự đặc biệt
    const digits = value.replace(/\D/g, '').slice(0, 10);
    
    // Tự động định dạng: 0907 767 304
    let formatted = '';
    if (digits.length <= 4) {
      formatted = digits;
    } else if (digits.length <= 7) {
      formatted = `${digits.slice(0, 4)} ${digits.slice(4)}`;
    } else {
      formatted = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    setPhone(formatted);
  };

  const [approvalNotification, setApprovalNotification] = useState<{
    type: 'pending' | 'approved';
    employeeId: string;
    phone: string;
  } | null>(null);

  // Use a ref to capture the current state of phone/employeeId without stale closures or trigger deps
  const inputsRef = React.useRef({ employeeId, phone });
  inputsRef.current = { employeeId, phone };

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
        } else if (data.length > 0) {
          const firstCo = data[0];
          setCompany(firstCo.name);
        }
        setBranch('');
        setDepartment('');
      } catch (err) {
        console.error("Lỗi lấy thông tin công ty:", err);
      }
    };
    fetchMappings();
  }, []);

  const handleCompanyChange = (newCoName: string) => {
    setCompany(newCoName);
    setBranch('');
    setDepartment('');
  };

  const handleBranchChange = (newBranchName: string) => {
    setBranch(newBranchName);
    setDepartment('');
  };

  const resetForm = () => {
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setEmployeeId('');
    setBranch('');
    setDepartment('');
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
    if (!phone || !password || !confirmPassword || !name || !employeeId) {
      setError('Vui lòng điền đầy đủ tất cả các trường thông tin.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp! Vui lòng kiểm tra lại chính xác.');
      return;
    }

    // Filter name Lê Nhật Trường to auto-admin
    const isLNT = name.trim().toUpperCase() === 'LÊ NHẬT TRƯỜNG';

    if (!isLNT && !branch) {
      setError('Vui lòng chủ động chọn Chi nhánh/ Văn phòng Đại diện.');
      return;
    }
    if (!isLNT && !department) {
      setError('Vui lòng chủ động chọn Bộ phận/ Đơn vị làm việc.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const newUser = await databaseService.registerUser({
        name: name.trim().toUpperCase(),
        phone: phone.trim(),
        password: password,
        company: isLNT ? 'TÂN PHÚ VIỆT NAM' : company,
        branch: isLNT ? 'Văn Phòng Công Ty (TPP-CTY)' : branch,
        department: isLNT ? 'Phòng Quản Lý Chất Lượng (TPP-CTY)' : department,
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-md shadow-sm border border-gray-100">
        <div className="text-center">
          {/* Logo container */}
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#07243c] via-[#0B3A60] to-[#1d5985] border-2 border-[#FFE066]/30 shadow-md ring-4 ring-blue-950/10 select-none shrink-0 relative overflow-hidden">
            {/* Glossy light effect */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none transform -skew-y-12" />
            <span translate="no" className="notranslate text-4xl font-black tracking-tighter font-sans relative z-10 flex items-center justify-center">
              <span className="animate-magic-color-slow">
                3
              </span>
              <span className="text-white -ml-0.5 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.6)]">T</span>
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
                    <span translate="no" className="notranslate">MÃ NHÂN SỰ</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => handleEmployeeIdChange(e.target.value, employeeId, setEmployeeId)}
                      placeholder="Ví dụ: 2026.00001"
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                  {employeeId && !isEmployeeIdValid(employeeId) && (
                    <div className="mt-1">
                      <span translate="no" className="notranslate text-red-500 text-[10px]">Mã nhân sự phải đúng định dạng YYYY.XXXXX (10 ký tự)</span>
                    </div>
                  )}
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
                      <span translate="no" className="notranslate">Vào Học Tập</span>
                    )}
                  </button>
                </div>

                <div className="pt-1 text-[11.5px] text-gray-500/95 text-center bg-gray-50/80 rounded border border-gray-150 p-2.5 leading-relaxed font-sans">
                  Nếu không đăng nhập được, liên hệ Admin:
                  <div className="mt-0.5">
                    <a href="tel:0907767304" className="text-[#1971C2] font-semibold hover:underline">0907767304</a> (Mr. Trường)
                  </div>
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
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      placeholder="Nhập họ tên đầy đủ..."
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">MÃ NHÂN SỰ</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => handleEmployeeIdChange(e.target.value, employeeId, setEmployeeId)}
                      placeholder="Ví dụ: 2026.00001"
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    />
                  </div>
                  {employeeId && !isEmployeeIdValid(employeeId) && (
                    <div className="mt-1">
                      <span translate="no" className="notranslate text-red-500 text-[10px]">Mã nhân sự phải đúng định dạng YYYY.XXXXX (10 ký tự)</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">SỐ ĐIỆN THOẠI</span>
                  </label>
                  <span translate="no" className="notranslate text-blue-600 text-[9px] italic block mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis" title="Lưu ý: Vui lòng nhập chính xác SĐT của anh/chị để hệ thống kiểm tra phê duyệt">Lưu ý: Vui lòng nhập chính xác SĐT của anh/chị để hệ thống kiểm tra phê duyệt</span>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Ví dụ: 0907 767 304"
                      className={`w-full rounded-md border py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 transition-all ${
                        phone.length > 0 && !isPhoneValid(phone)
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500 ring-1 ring-red-500 bg-red-50/25'
                          : 'border-gray-250 focus:border-[#1971C2] focus:ring-[#1971C2]'
                      }`}
                      required
                    />
                  </div>
                  {phone.length > 0 && !isPhoneValid(phone) && (
                    <div className="mt-1">
                      <span translate="no" className="notranslate text-red-500 text-[10px]">Vui lòng nhập đúng SĐT cá nhân gồm 10 chữ số (bắt đầu bằng số 0)</span>
                    </div>
                  )}
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
                    <span translate="no" className="notranslate">Xác nhận mật khẩu</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu để xác nhận..."
                      className={`w-full rounded-md border py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 transition-all ${
                        confirmPassword.length > 0 && password !== confirmPassword
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500 ring-1 ring-red-500 bg-red-50/25'
                          : 'border-gray-250 focus:border-[#1971C2] focus:ring-[#1971C2]'
                      }`}
                      required
                    />
                  </div>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <div className="mt-1">
                      <span translate="no" className="notranslate text-red-500 text-[10px]">Mật khẩu nhập lại không trùng khớp!</span>
                    </div>
                  )}
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
                    <span translate="no" className="notranslate text-emerald-700 font-semibold">CHI NHÁNH/ VĂN PHÒNG ĐẠI DIỆN *</span>
                  </label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                    <select
                      value={branch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full rounded-md border border-emerald-300 py-2 pl-10 pr-4 bg-white text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      required
                    >
                      <option value="">--- Chọn Chi nhánh/ Văn Phòng đại diện ---</option>
                      {(mappings.find(m => m.name === company)?.branches || []).map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate text-emerald-700 font-semibold">BỘ PHẬN/ ĐƠN VỊ *</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-md border border-emerald-300 py-2 pl-10 pr-4 bg-white text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                      disabled={!branch}
                      required
                    >
                      <option value="">--- Chọn Bộ phận/ Đơn vị làm việc ---</option>
                      {(mappings.find(m => m.name === company)?.branches.find(b => b.name === branch)?.departments || []).map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isEmployeeIdValid(employeeId) || !isPhoneValid(phone) || !branch || !department || !password || password !== confirmPassword}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-bold text-white bg-[#1971C2] hover:bg-opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1971C2] shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
