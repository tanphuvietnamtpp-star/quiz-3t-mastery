import React, { useState, useEffect } from 'react';
import { User, QuizResult, BRANCHES, DEPARTMENTS, CompanyMapping } from '../types';
import { getQuotaStats, databaseService } from '../firebase';
import { 
  Database, Users, Trophy, Award, BarChart3, Clock, 
  Activity, ShieldAlert, Sparkles, RefreshCcw, TrendingUp, 
  Building2, Calendar, ShieldCheck, Zap, Home, Trash2
} from 'lucide-react';
import { motion } from 'motion/react';

interface StatsDashboardProps {
  users: User[];
  results: QuizResult[];
  onRefresh: () => Promise<void>;
  onBackToHome?: () => void;
  companyMappings?: CompanyMapping[];
}

export default function StatsDashboard({ users, results, onRefresh, onBackToHome, companyMappings }: StatsDashboardProps) {
  const [quota, setQuota] = useState(getQuotaStats());
  const [rankingPeriod, setRankingPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listPeriod, setListPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [mappings, setMappings] = useState<CompanyMapping[]>(companyMappings || []);

  useEffect(() => {
    if (companyMappings && companyMappings.length > 0) {
      setMappings(companyMappings);
    } else {
      databaseService.getCompanyMappings().then(m => {
        if (m && m.length > 0) {
          setMappings(m);
        }
      }).catch(err => {
        console.error("Failed to load company mappings in StatsDashboard:", err);
      });
    }
  }, [companyMappings]);

  // Extract unique branches from mappings dynamically, fallback to static if empty
  const activeBranchesList = mappings.length > 0 
    ? Array.from(new Set(mappings.flatMap(co => co.branches.map(b => b.name.trim()))))
    : Array.from(BRANCHES);

  // Helper to extract branch abbreviation
  const getBranchAbbr = (branchName: string): string => {
    if (!branchName) return '';
    const match = branchName.match(/\(([^)]+)\)/);
    if (match) {
      return `(${match[1]})`;
    }
    const shortName = branchName
      .replace(/Chi nhánh/gi, '')
      .replace(/Văn phòng/gi, '')
      .replace(/Văn Phòng/gi, '')
      .replace(/Nhà máy/gi, '')
      .trim();
    return `(${shortName})`;
  };

  const getFullDeptName = (deptName: string, branchName: string): string => {
    const abbr = getBranchAbbr(branchName);
    return abbr ? `${deptName} ${abbr}` : deptName;
  };

  // Extract unique departments from mappings dynamically, fallback to static if empty
  const activeDepartmentsList: string[] = mappings.length > 0
    ? Array.from(new Set(mappings.flatMap(co => co.branches.flatMap(b => b.departments.map(d => getFullDeptName(d.name.trim(), b.name.trim()))))))
    : Array.from(DEPARTMENTS);

  // States for active quota optimization and cleanup
  const [oldResultCount, setOldResultCount] = useState<number | null>(null);
  const [oldResultIds, setOldResultIds] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const runHistoricalAnalysis = async () => {
    setIsAnalyzing(true);
    setCleanMessage(null);
    try {
      // fetchOnlyRecent = false triggers full query audit across all historical items
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

  useEffect(() => {
    setQuota(getQuotaStats());
    runHistoricalAnalysis();
  }, [results]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setQuota(getQuotaStats());
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
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
        text: `Dọn dẹp thành công! Đã xóa vĩnh viễn ${deletedCount} kết quả thi thử cũ từ tháng trước khỏi Cloud Firestore & bộ tạm địa phương.`
      });
      setOldResultCount(0);
      setOldResultIds([]);
      await handleRefresh();
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

  // 1. Quota calculations
  const firebaseQuotaLimits = {
    reads: 50000,
    writes: 20000,
    deletes: 20000
  };

  const readPercent = Math.min(100, parseFloat(((quota.reads / firebaseQuotaLimits.reads) * 100).toFixed(2)));
  const writePercent = Math.min(100, parseFloat(((quota.writes / firebaseQuotaLimits.writes) * 100).toFixed(2)));
  const deletePercent = Math.min(100, parseFloat(((quota.deletes / firebaseQuotaLimits.deletes) * 100).toFixed(2)));

  // Status colors for Quota
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

  // 2. Branch Visitor Statistics
  // Filter registered users (only approved users count as valid sảnh visitors, or we can count all active users)
  const activeUsers = users.filter(u => u.status === 'approved' || u.status === 'APPROVED');
  const totalActiveUsers = activeUsers.length;

  // 3.5 Registration rates (Daily, Weekly, Monthly, Yearly)
  const now = new Date();
  const nowMs = now.getTime();

  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeekMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const startOfMonthMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  const startOfYearMs = nowMs - 365 * 24 * 60 * 60 * 1000;

  const regToday = users.filter(u => u.createdAt && new Date(u.createdAt).getTime() >= startOfTodayMs).length;
  const regThisWeek = users.filter(u => u.createdAt && new Date(u.createdAt).getTime() >= startOfWeekMs).length;
  const regThisMonth = users.filter(u => u.createdAt && new Date(u.createdAt).getTime() >= startOfMonthMs).length;
  const regThisYear = users.filter(u => u.createdAt && new Date(u.createdAt).getTime() >= startOfYearMs).length;

  // 3.6 Participant Detail Breakdown Helper
  const getParticipantsForPeriod = (period: 'day' | 'week' | 'month' | 'year') => {
    let limit = 0;
    if (period === 'day') {
      limit = startOfTodayMs;
    } else if (period === 'week') {
      limit = startOfWeekMs;
    } else if (period === 'month') {
      limit = startOfMonthMs;
    } else {
      limit = startOfYearMs;
    }

    const filtered = results.filter(r => r.timestamp >= limit);
    const grouped: Record<string, {
      userId: string;
      userName: string;
      phone: string;
      employeeId: string;
      department: string;
      branch: string;
      attempts: number;
      bestScore: number;
      totalDuration: number;
      lastAttempt: number;
    }> = {};

    filtered.forEach(res => {
      const key = res.userId || res.userName;
      if (!grouped[key]) {
        const matchedUser = users.find(u => u.id === res.userId || u.name === res.userName);
        grouped[key] = {
          userId: res.userId,
          userName: (res.userName || matchedUser?.name || 'Thành viên ẩn danh').toUpperCase(),
          phone: matchedUser?.phone || 'Lưu trữ cũ',
          employeeId: matchedUser?.employeeId || 'Không rõ',
          department: res.department || matchedUser?.department || 'Hội sở',
          branch: res.branch || matchedUser?.branch || 'Hội sở',
          attempts: 0,
          bestScore: 0,
          totalDuration: 0,
          lastAttempt: 0
        };
      }
      grouped[key].attempts += 1;
      grouped[key].totalDuration += res.duration || 0;
      if (res.score > grouped[key].bestScore) {
        grouped[key].bestScore = res.score;
      }
      if (res.timestamp > grouped[key].lastAttempt) {
        grouped[key].lastAttempt = res.timestamp;
      }
    });

    return Object.values(grouped).sort((a, b) => b.attempts - a.attempts || b.bestScore - a.bestScore);
  };

  const participantsList = getParticipantsForPeriod(listPeriod).filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return p.userName.toLowerCase().includes(q) ||
           p.phone.toLowerCase().includes(q) ||
           p.employeeId.toLowerCase().includes(q) ||
           p.department.toLowerCase().includes(q) ||
           p.branch.toLowerCase().includes(q);
  });

  const branchStats = activeBranchesList.map(branchName => {
    const count = activeUsers.filter(u => u.branch === branchName).length;
    const percentage = totalActiveUsers > 0 ? Math.round((count / totalActiveUsers) * 100) : 0;
    return { name: branchName, count, percentage };
  }).sort((a, b) => b.count - a.count);

  // 3. Department Visitor Statistics
  const departmentStats = activeDepartmentsList.map(fullDeptName => {
    const count = activeUsers.filter(u => {
      if (mappings.length > 0) {
        return getFullDeptName(u.department || '', u.branch || '') === fullDeptName;
      } else {
        return (u.department || '') === fullDeptName;
      }
    }).length;
    const percentage = totalActiveUsers > 0 ? Math.round((count / totalActiveUsers) * 100) : 0;
    return { name: fullDeptName, count, percentage };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // 4. Rankings Filter Helpers
  const getRankings = () => {
    const now = Date.now();
    let timeLimit = 0;

    if (rankingPeriod === 'day') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      timeLimit = startOfToday.getTime();
    } else if (rankingPeriod === 'week') {
      timeLimit = now - 7 * 24 * 60 * 60 * 1000;
    } else {
      timeLimit = now - 30 * 24 * 60 * 60 * 1000;
    }

    const counts: { 
      [userId: string]: { 
        name: string; 
        dept: string; 
        branch: string; 
        attempts: number; 
        maxScore: number; 
        avgDuration: number;
        totalDuration: number;
      } 
    } = {};

    results.forEach(res => {
      // Validate that the result falls into our timeframe
      if (res.timestamp >= timeLimit) {
        const uid = res.userId;
        const isLNT = uid === 'admin_lenhattruong' || (res.userName && res.userName.trim() === 'Lê Nhật Trường');
        if (!counts[uid]) {
          counts[uid] = {
            name: (res.userName || 'Thành viên ẩn danh').toUpperCase(),
            dept: isLNT ? 'Phòng Quản Lý Chất Lượng (QLCL)' : (res.department || 'Bộ phận khác'),
            branch: res.branch || 'Hội sở',
            attempts: 0,
            maxScore: 0,
            avgDuration: 0,
            totalDuration: 0
          };
        }
        counts[uid].attempts += 1;
        counts[uid].totalDuration += res.duration || 0;
        if (res.score > counts[uid].maxScore) {
          counts[uid].maxScore = res.score;
        }
      }
    });

    return Object.values(counts)
      .map(u => ({
        ...u,
        avgDuration: u.attempts > 0 ? Math.round(u.totalDuration / u.attempts) : 0
      }))
      .sort((a, b) => b.attempts - a.attempts || b.maxScore - a.maxScore) // Sort primarily by attempt volume, then score
      .slice(0, 5);
  };

  const topRankings = getRankings();

  return (
    <div className="space-y-6">
      {/* Upper header action inside viewport */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest"><span translate="no" className="notranslate">Hệ Thống Thống Kê & Giám Sát Real-Time</span></h3>
          <p className="text-xs text-gray-400 mt-0.5"><span translate="no" className="notranslate">Giúp ban quản trị theo dõi tài nguyên dữ liệu Firebase và năng lực sảnh học tập của nhân sự.</span></p>
        </div>
        <div className="flex items-center gap-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Home className="h-3.5 w-3.5" />
              <span>MOBILE</span>
            </button>
          )}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 transition-all shadow-3xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang đồng bộ...' : 'Làm mới số liệu'}</span>
          </button>
        </div>
      </div>

      {/* Grid containing Left: Quota Tracker, Right: Interactive rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Column 1 Wrapper */}
        <div className="space-y-5 text-left">
          {/* Section 1: Firebase Quota Tracker */}
          <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4">
            <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
              <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <span>Giói hạn Quota Firebase hàng ngày</span>
              </h4>
              <div className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-[#1971C2] text-[10px] font-extrabold rounded-md uppercase tracking-wider animate-pulse flex items-center gap-1">
                <Zap className="h-3 w-3 fill-current" />
                <span>Spark Plan</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Ứng dụng của doanh nghiệp đang hoạt động trên gói <b>Firestore Enterprise (Spark - Free Tier)</b> miễn phí trọn đời. Hệ thống tự động ghi nhận lượng truy vấn phát sinh để bạn chủ động phòng tránh quá tải.
            </p>

            <div className="space-y-4 pt-2">
              {/* Reads Tracker */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 font-sans">Đọc Dữ Liệu (Reads)</span>
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
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 font-sans">Ghi Dữ Liệu (Writes)</span>
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
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700 font-sans">Xoá Dữ Liệu (Deletes)</span>
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

            <div className="pt-3.5 border-t border-gray-100 bg-gray-50/50 p-3 rounded-lg flex items-start gap-2 text-[10px] md:text-xs text-blue-800 leading-relaxed">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <b>Mẹo tiết kiệm quota:</b> Toàn bộ kết quả và câu hỏi được tối ưu hóa cấu trúc nạp tĩnh và lắng nghe thay đổi thông minh (`onSnapshot`), giúp giảm tối thiểu số lượng đọc dư thừa khi dữ liệu không đổi.
              </div>
            </div>
          </div>

          {/* Section 1.5: Optimizer & Old Results Cleanup Center */}
          <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 relative overflow-hidden font-sans">
            <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
              <h4 className="font-sans font-bold text-sm text-[#3b5bdb] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                <span>Bảo trì & Tối ưu hóa Quota</span>
              </h4>
              <div className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[#3B5BDB] text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-600 shrink-0" />
                <span>Lọc Tự Động</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Hệ thống hiện đã kích hoạt chế độ <b>Tự động Lọc kết quả cũ</b>. Khi nạp dữ liệu ôn tập trên giao diện, Cloud Firestore chỉ đọc các kết quả trong vòng <b>30 ngày gần nhất</b>, giúp bạn tiết kiệm hơn 85% số lượt đọc Firestore mỗi ngày.
            </p>

            {/* Analysis and alert segment */}
            <div className="bg-gray-50/70 border border-gray-150 p-4 rounded-xl space-y-3 relative">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Activity className={`h-4 w-4 text-gray-500 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  Quét dọn dẹp cơ sở kết quả cũ
                </span>
                <span className="text-[9px] text-gray-400 font-mono font-medium">Auto-Audit</span>
              </div>

              {isAnalyzing ? (
                <div className="text-xs font-semibold text-gray-500 italic py-2.5 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  Đang rà quét và phân tích trọng số lịch sử từ Cloud Firestore...
                </div>
              ) : oldResultCount !== null ? (
                <div className="space-y-3">
                  {oldResultCount === 0 ? (
                    <div className="bg-green-50 border border-green-150 p-3 rounded-lg text-xs leading-relaxed text-green-800 font-bold flex items-start gap-2">
                      <ShieldCheck className="h-4.5 w-4.5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        Trạng thái Tối ưu Tuyệt đối! Toàn bộ cơ sở dữ liệu đều sạch sẽ và không có bất kỳ kết quả thi cũ nào vượt qua ngưỡng 30 ngày.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-lg text-xs leading-relaxed text-amber-800 font-bold flex items-start gap-2.5 shadow-3xs">
                        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          Phát hiện <span className="text-sm font-black text-amber-950 font-mono underline">{oldResultCount}</span> kết quả thi thử cũ từ tháng trước (hơn 30 ngày trước).
                          <div className="text-[11px] text-gray-500 font-medium mt-1 leading-normal">
                            Sự hiện diện của dữ liệu này tuy được ẩn đi khỏi giao diện thường nhật nhưng vẫn nằm trong Cloud Firestore. Hãy nhấn nút dưới đây để dọn dẹp toàn bộ, tăng năng suất mượt mà nhất.
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCleanOldResults}
                        disabled={isCleaning}
                        className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-[#1971C2] font-black text-xs rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
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

        {/* Section 2: Gamified Top 5 Practitioners Rankings */}
        <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left flex flex-col">
          <div className="border-b border-gray-150 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <h4 className="font-sans font-bold text-sm text-[#E8590C] uppercase tracking-wider flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Hội Nghị Anh Tài: Top 5 Luyện Tập</span>
            </h4>

            {/* Sub-Period selector */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button 
                onClick={() => setRankingPeriod('day')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  rankingPeriod === 'day' ? 'bg-white text-gray-900 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Hôm Nay
              </button>
              <button 
                onClick={() => setRankingPeriod('week')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  rankingPeriod === 'week' ? 'bg-white text-gray-900 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tuần Này
              </button>
              <button 
                onClick={() => setRankingPeriod('month')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  rankingPeriod === 'month' ? 'bg-white text-gray-900 shadow-3xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tháng Này
              </button>
            </div>
          </div>

          {/* List rank display */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
            {topRankings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-2">
                <Calendar className="h-10 w-10 text-gray-300" />
                <span className="text-xs text-gray-400 font-bold">Chưa có kết quả ôn tập nào ghi nhận trong khoảng thời gian này.</span>
              </div>
            ) : (
              topRankings.map((userStats, idx) => {
                const getPodiumBadge = (rank: number) => {
                  if (rank === 0) return <span className="w-5.5 h-5.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs shadow-3xs border border-yellow-300">1</span>;
                  if (rank === 1) return <span className="w-5.5 h-5.5 rounded-full bg-slate-150 text-slate-700 flex items-center justify-center font-bold text-xs shadow-3xs border border-slate-300">2</span>;
                  if (rank === 2) return <span className="w-5.5 h-5.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shadow-3xs border border-amber-300">3</span>;
                  return <span className="w-5.5 h-5.5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs border border-gray-200">{rank + 1}</span>;
                };

                return (
                  <motion.div 
                    key={userStats.name + idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex justify-between items-center p-2.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-150 rounded-xl transition-all shadow-3xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getPodiumBadge(idx)}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-gray-800 truncate">{userStats.name}</div>
                        <div className="text-[10px] text-gray-400 truncate font-medium">{userStats.dept} • {userStats.branch}</div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="font-bold text-xs text-blue-700 font-mono flex items-center gap-1 justify-end">
                        <Activity className="h-3 w-3 text-blue-500" />
                        <span>{userStats.attempts} lượt thi thử</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">
                        Điểm đỉnh: <b className="text-gray-600 font-mono">{userStats.maxScore}/30</b>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          
          <div className="text-[10px] text-gray-400 font-medium text-center shrink-0 border-t border-gray-100 pt-2 flex justify-center items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
            <span>Xếp hạng cập nhật real-time khi học viên làm bài tập nộp sảnh.</span>
          </div>
        </div>

      </div>

      {/* Breakdown grids: Left: Users by Branch, Right: Users by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Visitors by Branch */}
        <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left">
          <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
            <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-500" />
              <span>CBNV Đã phê duyệt theo Chi Nhánh</span>
            </h4>
            <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold rounded-full">
              {totalActiveUsers} CBNV
            </span>
          </div>

          <div className="space-y-3">
            {branchStats.map((branch, idx) => (
              <div key={branch.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span className="font-semibold text-gray-700">{branch.name}</span>
                  </div>
                  <span className="font-bold text-gray-500 font-mono">{branch.count} người ({branch.percentage}%)</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full border border-gray-100 overflow-hidden">
                  <div 
                    style={{ width: `${branch.percentage}%` }} 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visitors by Department */}
        <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left">
          <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
            <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <span>CBNV Đã phê duyệt theo Phòng Ban</span>
            </h4>
            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-extrabold rounded-full font-sans animate-pulse">
              {activeDepartmentsList.length} phòng ban
            </span>
          </div>

          <div className="space-y-3 max-h-[235px] overflow-y-auto pr-1">
            {departmentStats.map((dept, idx) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-semibold text-gray-700 truncate">{dept.name}</span>
                  </div>
                  <span className="font-bold text-gray-500 font-mono shrink-0 ml-2">{dept.count} người ({dept.percentage}%)</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full border border-gray-100 overflow-hidden">
                  <div 
                    style={{ width: `${dept.percentage}%` }} 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Registration statistics by Timeframe */}
      <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left">
        <div className="border-b border-gray-150 pb-3">
          <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>Thống kê Quy Mô Nhân Sự Đăng Ký Hệ Thống</span>
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">Số lượng tài khoản nhân sự đăng ký mới theo mốc thời gian.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-blue-850 uppercase tracking-wider font-extrabold">Hôm Nay</div>
              <div className="text-2xl font-black text-gray-900 font-mono mt-0.5">{regToday} <span className="text-xs font-semibold text-gray-500">người</span></div>
            </div>
          </div>

          <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-purple-855 uppercase tracking-wider font-extrabold">Tuần Này</div>
              <div className="text-2xl font-black text-gray-900 font-mono mt-0.5">{regThisWeek} <span className="text-xs font-semibold text-gray-500">người</span></div>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-emerald-855 uppercase tracking-wider font-extrabold">Tháng Này</div>
              <div className="text-2xl font-black text-gray-900 font-mono mt-0.5">{regThisMonth} <span className="text-xs font-semibold text-gray-500">người</span></div>
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-amber-855 uppercase tracking-wider font-extrabold">Năm Nay</div>
              <div className="text-2xl font-black text-gray-900 font-mono mt-0.5">{regThisYear} <span className="text-xs font-semibold text-gray-500">người</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Detailed Participants table by Timeframe */}
      <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left">
        <div className="border-b border-gray-150 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="font-sans font-bold text-sm text-[#E8590C] uppercase tracking-wider flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span>Danh Sách Nhân Sự Tham Gia Ôn Luyện</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Danh sách chi tiết học viên nộp sảnh, số lượt và điểm đỉnh tương ứng.</p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-250">
            {(['day', 'week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setListPeriod(period)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  listPeriod === period ? 'bg-white text-gray-950 shadow-3xs border border-gray-200' : 'text-gray-500 hover:text-gray-950'
                }`}
              >
                {period === 'day' ? 'Hôm Nay' : period === 'week' ? 'Tuần Này' : period === 'month' ? 'Tháng Này' : 'Năm Nay'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Filter bar */}
        <div className="w-full">
          <input
            type="text"
            placeholder="Tìm tên nhân sự, SĐT, MSNV, phòng ban, chi nhánh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-sans border border-gray-200 rounded-lg p-2.5 outline-hidden focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-3xs bg-slate-50/50"
          />
        </div>

        {/* Output Table view */}
        <div className="overflow-x-auto border border-gray-150 rounded-lg shadow-3xs bg-white">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-2.5 px-4 text-center w-12">STT</th>
                <th className="py-2.5 px-4 w-52">Nhân sự tham gia</th>
                <th className="py-2.5 px-4 w-60">Thuộc Bộ phận / Chi nhánh</th>
                <th className="py-2.5 px-4 text-center w-28">Số lượt thi</th>
                <th className="py-2.5 px-4 text-center w-28">Điểm số cao nhất</th>
                <th className="py-2.5 px-4 text-center w-36">Thời gian làm bài TB</th>
                <th className="py-2.5 px-4 text-center w-40">Lần thi gần nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participantsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-gray-400 font-semibold bg-gray-50/30">
                    Chưa có nhân sự nào tham gia đạt điều kiện lọc trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                participantsList.map((stat, idx) => {
                  const avgMins = Math.floor(stat.totalDuration / stat.attempts / 60);
                  const avgSecs = Math.round((stat.totalDuration / stat.attempts) % 60);
                  const formattedDuration = avgMins > 0 ? `${avgMins}p ${avgSecs}s` : `${avgSecs}s`;
                  const scoreColor = stat.bestScore === 30 ? 'text-green-600 font-bold bg-green-50 border border-green-100' : 'text-blue-600 font-semibold bg-blue-50/75 border border-blue-100/50';
                  
                  return (
                    <tr key={stat.userId + idx} className="hover:bg-slate-50/50 text-xs transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-semibold text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-800">{stat.userName}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">MS: {stat.employeeId} • SĐT: {stat.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px] leading-relaxed">
                        <div className="font-bold text-gray-650">{stat.department}</div>
                        <div className="text-gray-405 font-medium">{stat.branch}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-extrabold text-[#1971C2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/50">{stat.attempts} lượt</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-mono text-xs px-2.5 py-0.5 rounded-md ${scoreColor}`}>
                          {stat.bestScore} / 30
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-gray-505">{formattedDuration}</td>
                      <td className="py-3 px-4 text-center font-mono text-[10.5px] text-gray-405">
                        {new Date(stat.lastAttempt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
