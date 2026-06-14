import React, { useState, useEffect } from 'react';
import { databaseService } from '../firebase';
import { User, QuizResult } from '../types';
import { ShieldCheck, UserCheck, UserX, Search, Landmark, Calendar, RefreshCcw, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApproverDashboardProps {
  user: User;
  onLogout: () => void;
  slogan?: string;
}

export default function ApproverDashboard({ user, onLogout, slogan = '3T Hội Tụ - Tân Phú Vươn Xa' }: ApproverDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const allUsers = await databaseService.getUsers();
      const allResults = await databaseService.getQuizResults(false);

      // Filter: ONLY show users and results belonging to THIS approver's Specific branch and department!
      const filteredUsers = allUsers.filter(u => u.branch === user.branch && u.department === user.department);
      setUsers(filteredUsers);

      const filteredResults = allResults.filter(r => r.branch === user.branch && r.department === user.department);
      setResults(filteredResults);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu duyệt bộ phận:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.branch, user.department]);

  // Handle Approving a user
  const handleApproveUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'approved', approvedAt: new Date().toISOString() });
      await loadData();
    } catch (err) {
      console.error("Lỗi khi duyệt nhân viên:", err);
    }
  };

  // Handle Rejecting / Blocking a user
  const handleRejectUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'rejected' });
      await loadData();
    } catch (err) {
      console.error("Lỗi khi từ chối nhân viên:", err);
    }
  };

  // Divide users into: pending and approved list
  const pendingUsers = users.filter(u => u.status?.toLowerCase() === 'pending');
  const approvedUsers = users.filter(u => u.status?.toLowerCase() === 'approved');

  // Filter approved users by search value
  const filteredApprovedList = approvedUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone.includes(searchTerm)
  );

  // Helper: calculate employee statistics
  const getEmployeeStats = (empId: string) => {
    const empQuizResults = results.filter(r => r.userId === empId);
    const count = empQuizResults.length;
    const avg = count > 0 
      ? Math.round(empQuizResults.reduce((acc, curr) => acc + curr.score, 0) / count)
      : 0;
    
    // Evaluation rules (e.g. compliance class based on average score and participation)
    let evaluationClass = 'CHƯA THI';
    let style = 'bg-gray-100 text-gray-500 border border-gray-200';

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Upper Navigation Bar */}
      <header className="bg-[#FAF9F6] border-b border-[#D0BFFF] py-4 px-6 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-md border border-purple-100">
              <ShieldCheck className="h-6 w-6 text-purple-600" />
            </span>
            <div>
              <h1 className="text-xl font-sans font-bold text-gray-900 leading-none">
                <span translate="no" className="notranslate">Duyệt Viên: Trưởng Bộ Phận</span>
              </h1>
              <p className="text-xs text-purple-600 mt-1 font-semibold flex flex-col gap-0.5">
                <span translate="no" className="notranslate">⚡ Bộ phận: {user.department}</span>
                <span translate="no" className="notranslate">📍 Chi nhánh: {user.branch}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-md transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onLogout}
              className="text-xs font-bold text-gray-500 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-100 rounded-md py-2 px-3 transition-colors"
            >
              <span translate="no" className="notranslate">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-8">
        {/* Approvals section */}
        <div className="bg-white border border-[#D0BFFF] p-6 rounded-md shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              <span translate="no" className="notranslate">Yêu cầu đăng ký chờ duyệt ({pendingUsers.length})</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              <span translate="no" className="notranslate">Các cán bộ công nhân viên thuộc Bộ phận của bạn đăng ký tài khoản cần bạn phê duyệt để bắt đầu học và thi.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout animate">
              {pendingUsers.length === 0 ? (
                <div className="md:col-span-2 py-8 text-center bg-gray-50 rounded-md border border-dashed border-gray-200 text-gray-400 text-xs italic">
                  <span translate="no" className="notranslate">Không có hồ sơ đăng ký nào đang chờ duyệt.</span>
                </div>
              ) : (
                pendingUsers.map((pUser) => (
                  <motion.div
                    key={pUser.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-purple-50/20 border border-purple-100/50 rounded-md flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-gray-900">
                        <span translate="no" className="notranslate">{pUser.name}</span>
                        {pUser.employeeId && (
                          <span translate="no" className="notranslate text-[10px] uppercase font-mono px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-150 rounded">
                            Mã: {pUser.employeeId}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-gray-500">
                        <span translate="no" className="notranslate">SĐT: {pUser.phone}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveUser(pUser.id)}
                        className="text-xs font-bold bg-[#1971C2] hover:bg-opacity-95 text-white py-1.5 px-3 rounded-md shadow-sm"
                      >
                        <span translate="no" className="notranslate">Duyệt</span>
                      </button>
                      <button
                        onClick={() => handleRejectUser(pUser.id)}
                        className="text-xs font-bold bg-white text-red-600 hover:bg-red-50 border border-red-100 py-1.5 px-3 rounded-md"
                      >
                        <span translate="no" className="notranslate">Từ chối</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Team Analytics / Progress Tracker */}
        <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span translate="no" className="notranslate">Bảng Theo Dõi Học Tập & Đánh Giá CB.CNV năm 2026</span>
              </h3>
              <p className="text-xs text-gray-400">
                <span translate="no" className="notranslate">Tổng hợp điểm số, số ca thi thử và phân loại quy chuẩn học lực.</span>
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tên hoặc SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs rounded-md border border-gray-200 py-2 pl-9 pr-4 bg-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-150">
                  <th className="py-3 px-4 font-bold"><span translate="no" className="notranslate">Họ và Tên Nhân Viên</span></th>
                  <th className="py-3 px-4 font-bold"><span translate="no" className="notranslate">Số ca Thi thử</span></th>
                  <th className="py-3 px-4 font-bold"><span translate="no" className="notranslate">Điểm số trung bình</span></th>
                  <th className="py-3 px-4 font-bold text-right"><span translate="no" className="notranslate">Phân loại Đánh giá</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredApprovedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                      <span translate="no" className="notranslate">Không tìm thấy hoặc chưa có thành viên nào hoạt động.</span>
                    </td>
                  </tr>
                ) : (
                  filteredApprovedList.map((emp) => {
                    const stats = getEmployeeStats(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/30">
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span translate="no" className="notranslate">{emp.name}</span>
                            {emp.employeeId && (
                              <span translate="no" className="notranslate text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded">
                                MS: {emp.employeeId}
                              </span>
                            )}
                          </div>
                          <span className="block font-mono text-gray-400 font-normal mt-0.5">{emp.phone}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold font-mono text-gray-700">
                          <span translate="no" className="notranslate">{stats.quizzesTaken} lần</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold font-mono text-blue-600">
                          <span translate="no" className="notranslate">{stats.average} / 30</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stats.style}`}>
                            <span translate="no" className="notranslate">{stats.evaluation}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
