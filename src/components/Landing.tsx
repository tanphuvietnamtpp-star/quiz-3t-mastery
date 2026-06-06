import React, { useState } from 'react';
import { databaseService } from '../firebase';
import { User, BRANCHES, DEPARTMENTS } from '../types';
import { Sparkles, Shield, UserCheck, AlertCircle, Phone, Lock, User as UserIcon, Landmark, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingProps {
  onLoginSuccess: (user: User) => void;
  slogan?: string;
}

export default function Landing({ onLoginSuccess, slogan }: LandingProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError('Vui lòng điền đầy đủ số điện thoại, mã nhân sự và mật khẩu.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const user = await databaseService.loginUser(phone, password, employeeId);
      if (user.status === 'pending') {
        setError('Tài khoản của bạn đang chờ được duyệt bởi Trưởng Bộ phận / Ban quản trị. Vui lòng liên hệ quản lý để được kích hoạt.');
        setLoading(false);
        return;
      }
      if (user.status === 'rejected') {
        setError('Tài khoản của bạn đã bị từ chối truy cập. Vui lòng liên hệ admin Lê Nhật Trường.');
        setLoading(false);
        return;
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng nhập');
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
        branch,
        department: isLNT ? 'Ban Giám Đốc' : department,
        employeeId: employeeId.trim()
      });

      if (isLNT) {
        setSuccess('Đăng ký tài khoản Admin tối cao Lê Nhật Trường thành công! Bạn có thể chọn đăng nhập ngay.');
        setPassword('');
      } else {
        setSuccess('Đăng ký tài khoản CBNV thành công! Vui lòng chờ Trưởng Bộ phận phê duyệt trước khi đăng nhập.');
        resetForm();
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-[#0B3A60] border border-blue-900 shadow-sm select-none">
            <span translate="no" className="notranslate text-white text-3xl font-black tracking-tight">3T</span>
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

        {success && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-100">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span translate="no" className="notranslate">{success}</span>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50 p-1 rounded-md">
            <button
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`w-full py-2 text-sm font-medium rounded-md transition-all ${!isRegister ? 'bg-white shadow-sm text-gray-900 font-bold border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span translate="no" className="notranslate">Đăng Nhập</span>
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(null); }}
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
                    <span translate="no" className="notranslate">Chi nhánh</span>
                  </label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 bg-white text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">
                    <span translate="no" className="notranslate">Bộ phận</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-md border border-gray-250 py-2 pl-10 pr-4 bg-white text-sm outline-none focus:border-[#1971C2] focus:ring-1 focus:ring-[#1971C2]"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
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
