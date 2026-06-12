import React, { useState, useMemo, useEffect } from 'react';
import { User, QuizResult, CompanyMapping, LevelRulesConfig } from '../types';
import { 
  Users, Trophy, Award, BarChart3, Clock, TrendingUp, 
  Calendar, Zap, AlertTriangle, Search, CheckCircle2, 
  Sparkles, FileDown, Activity, RefreshCcw, BookOpen, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/format';

const DEFAULT_LEVEL_RULES: LevelRulesConfig = {
  introduction: "Hệ thống Quiz 3T Mastery áp dụng cơ chế phân hạng và thay đổi cấp độ tự động dựa trên thành tích luyện tập thực tế.",
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

const getCleanLevelName = (fullName: string, levelNum: number): string => {
  if (!fullName) return '';
  const regex = new RegExp(`^c[ấa]p\\s*${levelNum}\\s*[:\\-]?\\s*`, 'i');
  return fullName.replace(regex, '').trim();
};

interface PersonalStatsProps {
  users: User[];
  results: QuizResult[];
  levelRulesFromCloud?: LevelRulesConfig | null;
}

export default function PersonalStats({ users, results, levelRulesFromCloud }: PersonalStatsProps) {
  const currentRules = levelRulesFromCloud || DEFAULT_LEVEL_RULES;

  // Active users only (approved status)
  const approvedUsers = useMemo(() => {
    return users.filter(u => {
      const uStatus = (u.status || '').toUpperCase();
      return uStatus === 'APPROVED' || uStatus === 'APPROVED_MEMBER';
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [users]);

  // Selected user ID state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Set default selected user
  useEffect(() => {
    if (approvedUsers.length > 0 && !selectedUserId) {
      const todayStr = formatDate(new Date());
      let bestResult: QuizResult | null = null;

      // 1. Check today's results
      const todayResults = results.filter(r => r.date === todayStr);
      if (todayResults.length > 0) {
        bestResult = todayResults.reduce((best, curr) => {
          if (!best) return curr;
          if (curr.score > best.score) return curr;
          if (curr.score === best.score) {
            const currDuration = curr.duration || 99999;
            const bestDuration = best.duration || 99999;
            return currDuration < bestDuration ? curr : best;
          }
          return best;
        }, null as QuizResult | null);
      } else {
        // 2. Walk backward: take the most recent date with records
        const sortedResults = [...results].sort((a, b) => b.timestamp - a.timestamp);
        if (sortedResults.length > 0) {
          const mostRecentDate = sortedResults[0].date;
          const mostRecentResults = results.filter(r => r.date === mostRecentDate);
          bestResult = mostRecentResults.reduce((best, curr) => {
            if (!best) return curr;
            if (curr.score > best.score) return curr;
            if (curr.score === best.score) {
              const currDuration = curr.duration || 99999;
              const bestDuration = best.duration || 99999;
              return currDuration < bestDuration ? curr : best;
            }
            return best;
          }, null as QuizResult | null);
        }
      }

      if (bestResult) {
        const foundUser = approvedUsers.find(u => 
          u.id === bestResult!.userId || 
          u.name.trim().toLowerCase() === bestResult!.userName.trim().toLowerCase()
        );
        if (foundUser) {
          setSelectedUserId(foundUser.id);
          return;
        }
      }

      setSelectedUserId(approvedUsers[0].id);
    }
  }, [approvedUsers, selectedUserId, results]);

  // Filter dynamic dropdown items based on query
  const filteredUsersForDropdown = useMemo(() => {
    if (!searchQuery) return approvedUsers;
    const lower = searchQuery.toLowerCase();
    return approvedUsers.filter(u => 
      u.name.toLowerCase().includes(lower) || 
      (u.employeeId && u.employeeId.toLowerCase().includes(lower)) || 
      (u.phone && u.phone.includes(lower)) ||
      (u.department && u.department.toLowerCase().includes(lower))
    );
  }, [approvedUsers, searchQuery]);

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // User results history filtered & sorted chronologically
  const userResults = useMemo(() => {
    if (!selectedUser) return [];
    return results.filter(r => 
      r.userId === selectedUser.id || 
      (r.userName && r.userName.trim().toLowerCase() === selectedUser.name.trim().toLowerCase() && r.department === selectedUser.department)
    ).sort((a, b) => a.timestamp - b.timestamp);
  }, [results, selectedUser]);

  // Compute stats metrics
  const stats = useMemo(() => {
    if (userResults.length === 0) {
      return {
        totalAttempts: 0,
        bestScore: 0,
        avgScore: 0,
        avgDuration: 0,
        level: 1,
        consecutiveMax: 0,
        longestStreak: 0,
        scoreHistory: [] as any[]
      };
    }

    let bestScore = 0;
    let totalScore = 0;
    let totalDuration = 0;
    
    // Level calculation precisely mimicking standard game rules
    let currentLevel = 1;
    let consecutiveMaxAtLevel = 0;
    let consecutiveLowAtLevel = 0;
    let longestStreak = 0;
    let currentStreak = 0;

    const parseRequiredConsecutive = (lvlIdx: number, defaultVal: number = 10): number => {
      const promotionText = currentRules.levels[lvlIdx]?.promotion;
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
      const demotionText = currentRules.levels[lvlIdx]?.demotion;
      if (!demotionText) return defaultVal;
      const match = demotionText.match(/dưới\s+(\d+)\s+điểm/i) || 
                    demotionText.match(/dưới\s+(\d+)/i) || 
                    demotionText.match(/<\s*(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      return defaultVal;
    };

    const scoreHistory = userResults.map((res, index) => {
      const score = res.score;
      totalScore += score;
      totalDuration += res.duration || 0;
      if (score > bestScore) {
        bestScore = score;
      }

      // Update streaks of perfect scores 30/30
      if (score === 30) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }

      // Compute level progress incrementally
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

      return {
        stt: index + 1,
        date: res.date || '',
        timestamp: res.timestamp,
        score: score,
        duration: res.duration || 0,
        levelAtThisTime: currentLevel,
        isPerfect: score === 30
      };
    });

    return {
      totalAttempts: userResults.length,
      bestScore,
      avgScore: Number((totalScore / userResults.length).toFixed(1)),
      avgDuration: Number((totalDuration / userResults.length).toFixed(0)),
      level: currentLevel,
      consecutiveMax: consecutiveMaxAtLevel,
      longestStreak,
      scoreHistory
    };
  }, [userResults]);

  // Is selection online?
  const isOnlineNow = useMemo(() => {
    if (!selectedUser || !selectedUser.lastActive) return false;
    return Math.abs(Date.now() - selectedUser.lastActive) <= 240000;
  }, [selectedUser]);

  // Export reports to Excel helper
  const handleExportExcel = () => {
    if (!selectedUser) return;
    const dataToExport = stats.scoreHistory.map(item => ({
      'STT': item.stt,
      'Ngày thi': item.date,
      'Điểm số (Tối đa 30/30)': item.score,
      'Thời gian làm bài (Phút:Giây)': `${Math.floor(item.duration / 60)}m ${item.duration % 60}s`,
      'Cấp độ học tập': `Cấp ${item.levelAtThisTime}`,
      'Kết quả tuyệt đối': item.isPerfect ? 'Đạt 30/30' : 'Bình thường'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Thống kê cá nhân");
    XLSX.writeFile(wb, `ThongKe_CaNhan_${selectedUser.name.replace(/\s+/g, '_')}_3T_Mastery.xlsx`);
  };

  // Pre-configured CSS designs matching levels of company
  const levelUIConfig = useMemo(() => {
    const uLvl = stats.level;
    const lvlItem = currentRules.levels.find(l => l.level === uLvl) || DEFAULT_LEVEL_RULES.levels[uLvl - 1] || { name: `Cấp ${uLvl}`, emoji: '🌱', maxTime: '90s/câu', level: uLvl, promotion: '', demotion: '', reactionPoints: [] };
    const name = getCleanLevelName(lvlItem.name, uLvl);
    
    let colors = {
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      text: 'text-emerald-700',
      iconColor: 'text-emerald-500',
      gradient: 'from-emerald-500/10 to-teal-500/5',
      glow: 'shadow-emerald-100'
    };
    if (uLvl === 2) {
      colors = {
        badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
        text: 'text-blue-700',
        iconColor: 'text-blue-500',
        gradient: 'from-blue-500/10 to-indigo-500/5',
        glow: 'shadow-blue-100'
      };
    } else if (uLvl === 3) {
      colors = {
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
        text: 'text-amber-700',
        iconColor: 'text-amber-600',
        gradient: 'from-amber-500/10 to-orange-500/5',
        glow: 'shadow-amber-100'
      };
    } else if (uLvl === 4) {
      colors = {
        badgeBg: 'bg-purple-50 border-purple-200 text-purple-800',
        text: 'text-purple-700',
        iconColor: 'text-purple-500',
        gradient: 'from-purple-500/10 to-fuchsia-500/5',
        glow: 'shadow-purple-100'
      };
    } else if (uLvl === 5) {
      colors = {
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
        text: 'text-rose-700',
        iconColor: 'text-rose-500',
        gradient: 'from-rose-500/10 to-red-500/5',
        glow: 'shadow-rose-100'
      };
    }
    return { name, emoji: lvlItem.emoji, maxTime: lvlItem.maxTime, ...colors };
  }, [stats.level, currentRules]);

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Tab Header Card */}
      <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <span>Trang Phân Tích Thành Tích Cá Nhân</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-normal">
            Báo cáo trực quan sâu về nỗ lực, tốc độ phản xạ và sự tiến bộ qua các lượt thi kiểm thử của từng cá nhân cán bộ nhân viên.
          </p>
        </div>

        {/* Dropdown Selector Component */}
        <div className="w-full md:w-80 relative">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2 gap-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Gõ tên, MSNV, phòng ban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:outline-none font-medium leading-none p-0"
            />
          </div>

          {/* List selection helper */}
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 z-25 bg-white border border-gray-150 rounded-lg max-h-52 overflow-y-auto mt-1 shadow-lg text-xs leading-relaxed">
              {filteredUsersForDropdown.length === 0 ? (
                <div className="p-3 text-gray-400 text-center">Không tìm thấy thành viên phù hợp</div>
              ) : (
                filteredUsersForDropdown.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 hover:bg-slate-50 flex justify-between items-center border-b border-gray-100 last:border-b-0 cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-gray-800">{u.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium">MS: {u.employeeId || 'Chưa cung cấp'} • {u.department}</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {!selectedUser ? (
        <div className="bg-slate-50 border border-dashed border-gray-250 p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-3">
          <Users className="h-10 w-10 text-gray-300 animate-pulse" />
          <p className="text-xs text-gray-400 font-medium">Vui lòng tìm kiếm và chọn một nhân sự bên trên để xem phân tích dữ liệu chuyên sâu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT PANEL: User Information & Level Details Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 relative overflow-hidden flex flex-col h-full justify-between">
              {/* Background gradient style decoration */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${levelUIConfig.gradient.replace('from-', 'from-').replace('to-', 'to-')}`} />

              <div className="space-y-5">
                {/* Header Profile Info */}
                <div className="flex items-start gap-3.5 pt-1">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-slate-900/5 text-slate-700 border border-slate-200 shadow-3xs font-black text-xl flex items-center justify-center leading-none select-none uppercase">
                      {selectedUser.name ? selectedUser.name.charAt(0) : 'U'}
                    </div>
                    {isOnlineNow ? (
                      <>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-400 rounded-full border-2 border-white animate-ping" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                      </>
                    ) : (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-300 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-gray-800 truncate max-w-[140px]" title={selectedUser.name}>{selectedUser.name}</h4>
                      {isOnlineNow && (
                        <span className="text-[8px] font-black uppercase text-red-500 bg-red-50 border border-red-150 px-1 py-0.2 rounded leading-none shrink-0 animate-pulse">Online</span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono font-bold text-gray-400 leading-none">MS: {selectedUser.employeeId || '202X.XXXXX'}</p>
                    <p className="text-[10.5px] text-gray-500 font-bold leading-normal truncate max-w-[170px]" title={selectedUser.department}>{selectedUser.department}</p>
                    <p className="text-[9.5px] text-gray-455 font-semibold leading-none truncate max-w-[170px]" title={selectedUser.branch}>{selectedUser.branch}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Thông tin liên kết</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-gray-150 shadow-3xs">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Số điện thoại:</span>
                      <span className="font-mono font-bold text-gray-700">{selectedUser.phone || 'Chưa định nghĩa'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-gray-150 shadow-3xs">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Vai trò điều hành:</span>
                      <span className="font-bold text-[#1971C2] uppercase text-[10px]">{selectedUser.role === 'admin' ? 'QTV Tối Cao' : selectedUser.role === 'approver' ? 'Trưởng Bộ Phận' : 'Cán Bộ Nhân Viên'}</span>
                    </div>
                  </div>
                </div>

                {/* Level Detail Box */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 backdrop-blur-3xl shadow-xs ${levelUIConfig.badgeBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl leading-none">{levelUIConfig.emoji}</span>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">Hạng Học Lập Hiện Tại</span>
                        <span className="text-xs font-black uppercase tracking-wide leading-none select-none">Cấp {stats.level}: {levelUIConfig.name}</span>
                      </div>
                    </div>
                    <Trophy className={`h-5 w-5 ${levelUIConfig.iconColor}`} />
                  </div>

                  <div className="text-[10.5px] leading-relaxed border-t border-gray-200/50 pt-2.5 space-y-1 bg-white/20 p-2 rounded-lg">
                    <div className="flex justify-between font-medium">
                      <span>Thời gian khống chế tối đa:</span>
                      <span className="font-mono font-bold text-gray-800">{levelUIConfig.maxTime || 'unlimited'}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Cống hiến hoàn hảo (30/30):</span>
                      <span className="font-mono font-bold text-gray-800">{stats.longestStreak} lượt liên tục</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={stats.totalAttempts === 0}
                  className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-750 font-bold text-[11px] text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  <span>XUẤT BẢN FILE EXCEL</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Stats Overview & Charts and table */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* KPI Cards section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Box 1: Lượt thi */}
              <div className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-3xs text-left">
                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest block mb-1">Số Lượt Ôn Luyện</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0B3A60]">{stats.totalAttempts}</span>
                  <span className="text-[9.5px] font-bold text-gray-400">lượt thi</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>Tự động cập nhật</span>
                </div>
              </div>

              {/* Box 2: Điểm cao nhất */}
              <div className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-3xs text-left">
                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest block mb-1">Điểm Cao Nhất</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0B3A60]">{stats.bestScore}</span>
                  <span className="text-[9.5px] font-semibold text-gray-400">/ 30 điểm</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-purple-600">
                  <Award className="h-3 w-3" />
                  <span>{stats.bestScore === 30 ? 'Điểm Xuất Sắc 100%' : 'Chưa chạm đỉnh 30'}</span>
                </div>
              </div>

              {/* Box 3: Điểm trung bình */}
              <div className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-3xs text-left">
                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest block mb-1">Điểm Trung Bình</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0B3A60]">{stats.avgScore}</span>
                  <span className="text-[9.5px] font-semibold text-gray-400">/ 30 điểm</span>
                </div>
                <span className={`inline-block text-[9px] font-bold uppercase tracking-wide mt-1 px-1.5 py-0.2 rounded ${
                  stats.avgScore >= 27 ? 'bg-purple-50 text-purple-700' : stats.avgScore >= 20 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                }`}>
                  {stats.avgScore >= 27 ? 'Giỏi / Xuất Sắc' : stats.avgScore >= 20 ? 'Phong độ Khá' : 'Cần cố gắng thêm'}
                </span>
              </div>

              {/* Box 4: Thời gian trung bình */}
              <div className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-3xs text-left">
                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest block mb-1">Phản Xạ Trung Bình</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[#0B3A60]">{stats.avgDuration}</span>
                  <span className="text-[9.5px] font-semibold text-gray-400">giây / lượt</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-indigo-600">
                  <Clock className="h-3 w-3" />
                  <span>Khoảng {parseFloat((stats.avgDuration / 3).toFixed(1))} giây/câu</span>
                </div>
              </div>
            </div>

            {/* Recharts Graphical Visuals */}
            <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-3xs text-left space-y-4">
              <h4 className="text-xs font-black text-[#0B3A60] uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                <span>Biểu Đồ Tiến Trình & Phong Độ Điểm Số Gần Nhất</span>
              </h4>

              {stats.totalAttempts === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-xs text-gray-400 leading-normal">
                  <BookOpen className="h-8 w-8 text-slate-300 mb-1" />
                  Chưa ghi nhận kết quả lượt thi mẫu nào cho nhân viên này.
                </div>
              ) : (
                <div className="h-56 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.scoreHistory.slice(-15)} // Show up to last 15 attempts
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1971C2" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#1971C2" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="stt" 
                        stroke="#AEB2B9" 
                        fontSize={9.5} 
                        fontWeight="bold"
                        tickLine={false}
                        label={{ value: 'Lượt thi', position: 'insideBottom', offset: -5, fontSize: 9, fill: '#AEB2B9' }}
                      />
                      <YAxis 
                        domain={[0, 30]} 
                        ticks={[0, 10, 15, 20, 25, 30]}
                        stroke="#AEB2B9" 
                        fontSize={9.5} 
                        fontWeight="bold"
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '8px' }}
                        formatter={(value) => [`${value} Điểm`, 'Điểm số']}
                        labelFormatter={(label) => `Lượt thi thứ: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#1971C2" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#scoreColor)" 
                        dot={{ r: 4, fill: '#1971C2', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Detailed table list of attempts */}
            <div className="bg-white border border-gray-150 rounded-xl shadow-3xs overflow-hidden text-left">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h4 className="text-xs font-black text-[#0B3A60] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  <span>Sổ Log Lịch Sử Luyện Lập Chi Tiết</span>
                </h4>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Hiển thị {stats.scoreHistory.length} lượt</span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#0B3A60]/5 text-[#0B3A60] font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-white">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12 border-b border-gray-150">STT</th>
                      <th className="py-2.5 px-4 text-left border-b border-gray-150">Ngày Thi</th>
                      <th className="py-2.5 px-3 text-center border-b border-gray-150">Điểm số</th>
                      <th className="py-2.5 px-3 text-center border-b border-gray-150">Thời Gian</th>
                      <th className="py-2.5 px-3 text-center border-b border-gray-150">Cấp Độ Đạt</th>
                      <th className="py-2.5 px-4 text-center border-b border-gray-150">Đánh giá Quy đổi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.scoreHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">Cá nhân này chưa tham gia nộp sảnh thi thử nào.</td>
                      </tr>
                    ) : (
                      [...stats.scoreHistory].reverse().map((item, index) => {
                        let scoreBadgeColor = 'bg-red-50 text-red-700 border-red-150';
                        if (item.score === 30) scoreBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-250 font-black';
                        else if (item.score >= 26) scoreBadgeColor = 'bg-semibold bg-emerald-50 text-emerald-700 border-emerald-150';
                        else if (item.score >= 20) scoreBadgeColor = 'bg-blue-50 text-blue-700 border-blue-150';

                        const formatSpent = `${Math.floor(item.duration / 60)}m ${item.duration % 60}s`;
                        
                        let reactionText = '';
                        let reactionColor = '';
                        const score = item.score;
                        
                        if (score >= 27) {
                          reactionText = 'Đạt 150% 🏆';
                          reactionColor = 'text-indigo-700 bg-indigo-50 border-indigo-200 font-extrabold';
                        } else if (score >= 24) {
                          reactionText = 'Đạt 120% ⭐';
                          reactionColor = 'text-purple-700 bg-purple-50 border-purple-200 font-bold';
                        } else if (score >= 20) {
                          reactionText = 'Đạt 100% ✅';
                          reactionColor = 'text-emerald-700 bg-emerald-50 border-emerald-250 font-bold';
                        } else if (score >= 15) {
                          reactionText = 'Đạt 90% 🎯';
                          reactionColor = 'text-blue-700 bg-blue-50 border-blue-200';
                        } else {
                          reactionText = 'Không Đạt ⚠️';
                          reactionColor = 'text-rose-600 bg-rose-50 border-rose-150';
                        }

                        return (
                          <tr key={item.stt} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-gray-400">{stats.scoreHistory.length - index}</td>
                            <td className="py-2.5 px-4 font-mono text-gray-650 font-medium">{item.date}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block font-sans border text-[10.5px] px-2 py-0.5 rounded-md ${scoreBadgeColor}`}>
                                {item.score} / 30
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-600">{formatSpent}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.2 rounded">
                                Cấp {item.levelAtThisTime}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-block text-[10px] font-bold border rounded-md px-2.5 py-1 ${reactionColor}`}>
                                {reactionText}
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

          </div>
        </div>
      )}
    </div>
  );
}
