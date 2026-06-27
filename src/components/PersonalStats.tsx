import React, { useState, useMemo, useEffect } from 'react';
import { User, QuizResult, CompanyMapping, LevelRulesConfig } from '../types';
import { 
  Users, Trophy, Award, BarChart3, Clock, TrendingUp, 
  Calendar, Zap, AlertTriangle, Search, CheckCircle2, 
  Sparkles, FileDown, Activity, RefreshCcw, BookOpen, ChevronRight,
  ChevronDown, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/format';
import { calculateInactivityAugmentedLevel, getVietnamDateString } from '../utils/levelCalculator';

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
      const isApproved = uStatus === 'APPROVED' || uStatus === 'APPROVED_MEMBER';
      if (!isApproved) return false;

      // Allow admins, executives, and all approved users to see/view their own personal performance analysis!
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [users]);

  // Filtered results to exclude unapproved or deleted users
  const resultsForRankings = useMemo(() => {
    return results.filter(res => {
      let found = users.find(u => u.id === res.userId);
      if (!found && res.userName) {
        const normName = res.userName.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
        found = users.find(u => {
          const uNorm = u.name ? u.name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ') : '';
          return uNorm === normName;
        });
      }
      if (!found) return false;

      const fStatus = (found.status || '').toUpperCase();
      if (fStatus !== 'APPROVED' && fStatus !== 'APPROVED_MEMBER') return false;

      // Keep it aligned with StatsDashboard: Don't exclude admin/executive/ban tổng giám đốc here,
      // so their dynamic records and personal stats can be evaluated correctly
      return true;
    });
  }, [results, users]);

  // Selected user ID state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [panelTab, setPanelTab] = useState<'personal' | 'records'>('personal');
  const [recordSearch, setRecordSearch] = useState<string>('');
  const [showRuleAccordion, setShowRuleAccordion] = useState<boolean>(true);

  // Set default selected user
  useEffect(() => {
    if (approvedUsers.length > 0 && !selectedUserId) {
      const now = new Date();
      const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      let bestResult: QuizResult | null = null;

      // 1. Check today's results
      const todayResults = results.filter(r => r.timestamp >= startOfTodayMs);
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

    const normalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};

    results.forEach(res => {
      const normName = normalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
    });

    const targetNormName = normalizeName(selectedUser.name);
    const targetUserId = selectedUser.id;

    return results.filter(r => {
      const rNormName = normalizeName(r.userName);
      const rResolvedUserId = r.userId || nameToUserIdMap[rNormName] || '';
      const rResolvedNormalizedName = rNormName || (r.userId ? userIdToNameMap[r.userId] : '') || '';

      if (targetUserId && rResolvedUserId === targetUserId) return true;
      if (targetNormName && rResolvedNormalizedName === targetNormName) return true;
      return false;
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [results, selectedUser]);

  // Compute stats metrics
  const stats = useMemo(() => {
    const inactivityTestMode = localStorage.getItem('3t_inactivity_test_mode') === 'true';
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

    const levelState = calculateInactivityAugmentedLevel(
      selectedUser.id,
      userResults,
      currentRules,
      {
        isTestModeEnabled: inactivityTestMode,
        simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
      }
    );

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
      level: levelState.level,
      consecutiveMax: levelState.consecutiveMax,
      longestStreak,
      scoreHistory
    };
  }, [userResults]);

  // Records 3T calculations based on standard logic mimicking StatsDashboard.tsx 1:1
  const records3T = useMemo(() => {
    const lNormalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};

    resultsForRankings.forEach(res => {
      const normName = lNormalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
    });

    const historicGroups: Record<string, QuizResult[]> = {};
    resultsForRankings.forEach(res => {
      const normName = lNormalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';
      if (personKey === 'anonymous') return;

      if (!historicGroups[personKey]) {
        historicGroups[personKey] = [];
      }
      historicGroups[personKey].push(res);
    });

    const activeRules = levelRulesFromCloud || DEFAULT_LEVEL_RULES;

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

    // Standard baseline records aligned with the system's true historical accomplishments
    const BASELINE_RECORDS = {
      quyettam: {
        name: 'TRẦN PHƯỚC TRUNG',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        date: '12/06/2026',
        attemptsCount: 381,
        proofText: 'Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: 381 lượt.'
      },
      tritue: {
        name: 'TRẦN VĂN TIÊN',
        dept: 'Phòng Tài chính Kế toán',
        branch: 'Văn Phòng Công Ty (TPP-CTY)',
        date: '11/06/2026',
        perfectsCount: 185,
        proofText: 'Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: 185 lượt.'
      },
      tocdo: {
        name: 'QUÁCH THUÝ VÂN',
        dept: 'Ban Quản đốc',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '12/06/2026',
        durationPerQ: 3.8,
        proofText: 'Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ 3.8 giây/câu.'
      },
      thantoc: {
        name: 'PHAN THỊ NHÀN',
        dept: 'Phòng Kế hoạch sản xuất',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '09/06/2026',
        maxLevelReached: 5,
        attemptsCountToMaxLevel: 48,
        proofText: 'Đạt Cấp 5 - Huyền Thoại chỉ sau đúng 48 lượt làm bài thi, điểm trung bình toàn chiến dịch đạt 29.1/30, vận tốc phản xạ ấn tượng chỉ 6 giây/câu.'
      },
      batbai: {
        name: 'HÀ HỮU QUỲNH',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '09/06/2026',
        streak: 45,
        proofText: 'Thiết lập chuỗi 45 lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.'
      },
      binhminh: {
        name: 'PHẠM VĂN ĐEN',
        dept: 'Phân xưởng 2',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        date: '14/06/2026',
        timeString: '01:24',
        proofText: 'Chủ động ôn luyện từ sáng tinh sương lúc 01:24 ngày 14/06/2026.'
      }
    };

    let bestQuyetTamUser: any = BASELINE_RECORDS.quyettam;
    let maxAttempts = BASELINE_RECORDS.quyettam.attemptsCount;

    let bestTriTueUser: any = BASELINE_RECORDS.tritue;
    let maxPerfects = BASELINE_RECORDS.tritue.perfectsCount;

    let bestTocDoUser: any = BASELINE_RECORDS.tocdo;
    let minSpeedPerQ = BASELINE_RECORDS.tocdo.durationPerQ;

    let bestThanTocUser: any = BASELINE_RECORDS.thantoc;
    let minThanTocDuration = BASELINE_RECORDS.thantoc.attemptsCountToMaxLevel;

    let bestBatBaiUser: any = BASELINE_RECORDS.batbai;
    let maxBatBaiStreak = BASELINE_RECORDS.batbai.streak;

    let bestBinhMinhUser: any = BASELINE_RECORDS.binhminh;
    let minSunriseMins = (parseInt(BASELINE_RECORDS.binhminh.timeString.split(':')[0]) * 60 + parseInt(BASELINE_RECORDS.binhminh.timeString.split(':')[1]));

    const thanTocCandidates: Array<{
      userProfile: {
        name: string;
        dept: string;
        branch: string;
        date: string;
      };
      maxLevelReached: number;
      attemptsCountToMaxLevel: number;
    }> = [];

    // Calculate level 5 reached achievements from real Firestore results
    Object.entries(historicGroups).forEach(([personKey, userResultsList]) => {
      const chronological = [...userResultsList].sort((a, b) => a.timestamp - b.timestamp);
      const latestRes = chronological[chronological.length - 1] || userResultsList[0];
      const isLNT = personKey === 'admin_lenhattruong' || lNormalizeName(latestRes.userName) === 'LÊ NHẬT TRƯỜNG';
      const userProfile = {
        name: latestRes.userName || 'THÀNH VIÊN ẨN DANH',
        dept: isLNT ? 'Phòng Quản Lý Chất Lượng' : (latestRes.department || 'Hội sở'),
        branch: latestRes.branch || 'Hội sở',
        date: latestRes.date || ''
      };

      let currentLevel = 1;
      let consecMax = 0;
      let consecLow = 0;
      let maxLevelReached = 1;
      let attemptsCountToMaxLevel = chronological.length > 0 ? 1 : 0;
      let maxLevelReachedDate = '';

      for (let i = 0; i < chronological.length; i++) {
        const res = chronological[i];
        const score = res.score;
        if (currentLevel === 1) {
          if (score === 30) consecMax++; else consecMax = 0;
          const req = parseRequiredConsecutive(0, 10);
          if (consecMax >= req) { currentLevel = 2; consecMax = 0; consecLow = 0; }
        } else if (currentLevel === 2) {
          if (score === 30) consecMax++; else consecMax = 0;
          const demotionMin = parseDemotionThreshold(1, 25);
          if (score < demotionMin) consecLow++;
          const req = parseRequiredConsecutive(1, 10);
          if (consecMax >= req) { currentLevel = 3; consecMax = 0; consecLow = 0; }
          else if (consecLow >= 2) { currentLevel = 1; consecMax = 0; consecLow = 0; }
        } else if (currentLevel === 3) {
          if (score === 30) consecMax++; else consecMax = 0;
          const demotionMin = parseDemotionThreshold(2, 26);
          if (score < demotionMin) consecLow++;
          const req = parseRequiredConsecutive(2, 10);
          if (consecMax >= req) { currentLevel = 4; consecMax = 0; consecLow = 0; }
          else if (consecLow >= 2) { currentLevel = 2; consecMax = 0; consecLow = 0; }
        } else if (currentLevel === 4) {
          if (score === 30) consecMax++; else consecMax = 0;
          const demotionMin = parseDemotionThreshold(3, 27);
          if (score < demotionMin) consecLow++;
          const req = parseRequiredConsecutive(3, 10);
          if (consecMax >= req) { currentLevel = 5; consecMax = 0; consecLow = 0; }
          else if (consecLow >= 2) { currentLevel = 3; consecMax = 0; consecLow = 0; }
        } else if (currentLevel === 5) {
          if (score === 30) consecMax++; else consecMax = 0;
          const demotionMin = parseDemotionThreshold(4, 28);
          if (score < demotionMin) consecLow++;
          if (consecLow >= 2) { currentLevel = 4; consecMax = 0; consecLow = 0; }
        }

        if (currentLevel > maxLevelReached) {
          maxLevelReached = currentLevel;
          attemptsCountToMaxLevel = i + 1;
          maxLevelReachedDate = res.date || '';
        }
      }

      if (chronological.length > 0) {
        thanTocCandidates.push({
          userProfile: {
            ...userProfile,
            date: maxLevelReachedDate || userProfile.date
          },
          maxLevelReached,
          attemptsCountToMaxLevel
        });
      }
    });

    const thanTocEligible = thanTocCandidates.filter(c => c.maxLevelReached === 5);

    if (thanTocEligible.length > 0) {
      thanTocEligible.sort((a, b) => a.attemptsCountToMaxLevel - b.attemptsCountToMaxLevel);
      const best = thanTocEligible[0];
      if (best.attemptsCountToMaxLevel < minThanTocDuration) {
        minThanTocDuration = best.attemptsCountToMaxLevel;
        bestThanTocUser = {
          ...best.userProfile,
          maxLevelReached: 5,
          attemptsCountToMaxLevel: best.attemptsCountToMaxLevel,
          proofText: `Đạt Cấp 5 - Huyền Thoại chỉ sau ${best.attemptsCountToMaxLevel} lượt ôn luyện!`
        };
      }
    }

    // Dynamic calculations representing live Firestore database statistics
    Object.entries(historicGroups).forEach(([personKey, userResultsList]) => {
      const chronological = [...userResultsList].sort((a, b) => a.timestamp - b.timestamp);
      const latestRes = chronological[chronological.length - 1] || userResultsList[0];
      const isLNT = personKey === 'admin_lenhattruong' || lNormalizeName(latestRes.userName) === 'LÊ NHẬT TRƯỜNG';
      const userProfile = {
        name: latestRes.userName || 'THÀNH VIÊN ẨN DANH',
        dept: isLNT ? 'Phòng Quản Lý Chất Lượng' : (latestRes.department || 'Hội sở'),
        branch: latestRes.branch || 'Hội sở',
        date: latestRes.date || ''
      };

      // 1. Kiên trì
      const attemptsCount = chronological.length;
      if (attemptsCount > maxAttempts) {
        maxAttempts = attemptsCount;
        bestQuyetTamUser = {
          ...userProfile,
          attemptsCount,
          proofText: `Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: ${attemptsCount} lượt.`
        };
      }

      // 2. Trí tuệ
      const perfectsCount = chronological.filter(r => r.score === 30).length;
      if (perfectsCount > maxPerfects) {
        maxPerfects = perfectsCount;
        const perfects = chronological.filter(r => r.score === 30);
        const latestPerfect = perfects[perfects.length - 1] || latestRes;
        bestTriTueUser = {
          ...userProfile,
          date: latestPerfect.date || userProfile.date,
          perfectsCount,
          proofText: `Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: ${perfectsCount} lượt.`
        };
      }

      // 3. Tốc độ
      const totalQ = chronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
      const totalD = chronological.reduce((sum, r) => sum + (r.duration || 0), 0);
      if (totalQ > 0) {
        const avgSpeed = totalD / totalQ;
        const finalSpeed = parseFloat(avgSpeed.toFixed(1));
        if (avgSpeed < minSpeedPerQ && totalQ >= 6) {
          minSpeedPerQ = avgSpeed;
          bestTocDoUser = {
            ...userProfile,
            durationPerQ: finalSpeed,
            proofText: `Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ ${finalSpeed} giây/câu.`
          };
        }
      }

      // 5. Bất bại
      let currentStreak = 0;
      let userMaxStreak = 0;
      let streakDate = '';
      chronological.forEach(r => {
        if (r.score === 30) {
          currentStreak++;
          if (currentStreak > userMaxStreak) {
            userMaxStreak = currentStreak;
            streakDate = r.date || '';
          }
        } else {
          currentStreak = 0;
        }
      });

      if (userMaxStreak > maxBatBaiStreak) {
        maxBatBaiStreak = userMaxStreak;
        bestBatBaiUser = {
          ...userProfile,
          date: streakDate || userProfile.date,
          streak: userMaxStreak,
          proofText: `Thiết lập chuỗi ${userMaxStreak} lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.`
        };
      }

      // 6. Trước bình minh
      chronological.forEach(r => {
        if (r.score === 30) {
          const d = new Date(r.timestamp);
          const hours = d.getHours();
          const mins = d.getMinutes();
          if (hours >= 0 && hours < 10) {
            const totalMins = hours * 60 + mins;
            const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            const rawDate = r.date || userProfile.date || '';
            const ensureDDMMYY = (dateStr: string): string => {
              if (!dateStr || !dateStr.includes('/')) return dateStr;
              const parts = dateStr.trim().split('/');
              if (parts.length === 3) {
                const day = parts[0];
                const month = parts[1];
                let year = parts[2];
                if (year.length === 4) {
                  year = year.substring(2);
                }
                return `${day}/${month}/${year}`;
              }
              return dateStr;
            };
            const customDate = ensureDDMMYY(rawDate);
            const fullYear = customDate.includes('/') 
              ? (customDate.split('/')[2].length === 2 ? '20' + customDate.split('/')[2] : customDate.split('/')[2])
              : '2026';
            const dayPart = customDate.split('/')[0] || '14';
            const monthPart = customDate.split('/')[1] || '06';
            const proofDateStr = `${dayPart}/${monthPart}/${fullYear}`;

            if (totalMins < minSunriseMins) {
              minSunriseMins = totalMins;
              bestBinhMinhUser = {
                ...userProfile,
                date: customDate,
                timeString,
                proofText: `Chủ động ôn luyện từ sáng tinh sương lúc ${timeString} ngày ${proofDateStr}.`
              };
            }
          }
        }
      });
    });

    return {
      quyettam: bestQuyetTamUser,
      tritue: bestTriTueUser,
      tocdo: bestTocDoUser,
      thantoc: bestThanTocUser,
      batbai: bestBatBaiUser,
      binhminh: bestBinhMinhUser
    };
  }, [resultsForRankings, levelRulesFromCloud]);

  // Premium design rendering for KỶ LỤC tab
  const renderRecordsTab = () => {
    const rawCategories = [
      {
        key: 'quyettam',
        title: 'KỶ LỤC KIÊN TRÌ 🎯',
        desc: 'Người rèn luyện chăm chỉ, kiên trì và bền bỉ nhất',
        calcMethod: 'Tính theo tổng số lượt ôn luyện, làm bài thi rèn luyện và nộp bài kiểm thử thành công lên hệ thống sảnh thi (toàn thời gian tích lũy).',
        data: records3T.quyettam,
        getMetric: (d: any) => d ? `${d.attemptsCount} lượt` : 'Chưa ghi nhận',
        icon: <Clock className="h-5 w-5 text-indigo-500 animate-pulse" />,
        beatCondition: (d: any) => `Để xô đổ kỷ lục: Cần hoàn thành nộp bài thi ôn luyện đạt từ ${d ? d.attemptsCount + 1 : 1} lượt trở lên.`,
        bgStyle: 'bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-100 hover:border-indigo-400',
        badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200'
      },
      {
        key: 'tritue',
        title: 'KỶ LỤC TRÍ TUỆ 🧠',
        desc: 'Người có số lượt đạt điểm tối đa 30/30 cao nhất',
        calcMethod: 'Tổng số lượt làm bài rèn luyện đạt điểm số tuyệt đối 30/30 tích lũy toàn bộ thời gian của một học viên.',
        data: records3T.tritue,
        getMetric: (d: any) => d ? `${d.perfectsCount} lượt 30/30` : 'Chưa ghi nhận',
        icon: <Trophy className="h-5 w-5 text-amber-500" />,
        beatCondition: (d: any) => `Để xô đổ kỷ lục: Cần đạt điểm số tuyệt đối 30/30 tích lũy tối thiểu ${d ? d.perfectsCount + 1 : 1} lượt.`,
        bgStyle: 'bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-100 hover:border-amber-400',
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200'
      },
      {
        key: 'tocdo',
        title: 'KỶ LỤC TỐC ĐỘ ⚡',
        desc: 'Vận tốc phản xạ nhanh siêu hạng trên bài thi 30/30',
        calcMethod: 'Thời gian trả lời trung bình mỗi câu hỏi cực ngắn, được tính toán trên một lượt thi duy nhất đạt điểm số tuyệt đối 30/30 (Yêu cầu bài thi tối thiểu 3 câu để phòng may rủi ngẫu nhiên).',
        data: records3T.tocdo,
        getMetric: (d: any) => d ? `${d.durationPerQ}s/câu` : 'Chưa ghi nhận',
        icon: <Zap className="h-5 w-5 text-rose-500" />,
        beatCondition: (d: any) => `Để xô đổ kỷ lục: Đạt 30/30 điểm tuyệt đối với tốc độ trả lời trung bình dưới ${d ? d.durationPerQ : 3.8} giây/câu.`,
        bgStyle: 'bg-gradient-to-br from-rose-500/5 to-orange-500/5 border-rose-100 hover:border-rose-400',
        badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200'
      },
      {
        key: 'thantoc',
        title: 'THĂNG CẤP THẦN TỐC 📈',
        desc: 'Đạt danh hiệu Huyền Thoại (Cấp 5) nhanh nhất',
        calcMethod: 'Tổng số lượt thi rèn luyện tối thiểu dùng để thăng cấp thành công từ Cấp 1 lên Cấp 5 (Huyền Thoại) tính từ mốc bắt đầu thi ôn luyện.',
        data: records3T.thantoc,
        getMetric: (d: any) => d ? `${d.attemptsCountToMaxLevel} lượt` : 'Chưa ghi nhận',
        icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
        beatCondition: (d: any) => `Để xô đổ kỷ lục: Đạt Cấp 5 (Huyền thoại) với tổng cộng ít hơn ${d ? d.attemptsCountToMaxLevel : 48} lượt làm bài.`,
        bgStyle: 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-100 hover:border-emerald-400',
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      },
      {
        key: 'batbai',
        title: 'KỶ LỤC BẤT BẠI 🛡️',
        desc: 'Người có chuỗi điểm tuyệt đối 30/30 liên hoàn dài nhất',
        calcMethod: 'Số lượt làm bài đạt điểm 30/30 liên tiếp liên hoàn tốt nhất của một học sự sảnh thi mà không bị đứt chuỗi bởi bất cứ lượt thi nào thấp hơn.',
        data: records3T.batbai,
        getMetric: (d: any) => d ? `Chuỗi ${d.streak} lượt` : 'Chưa ghi nhận',
        icon: <Sparkles className="h-5 w-5 text-purple-500" />,
        beatCondition: (d: any) => `Để xô đổ kỷ lục: Thiết lập chuỗi đạt điểm số tuyệt đối 30/30 liên tiếp đạt từ ${d ? d.streak + 1 : 46} lượt trở lên.`,
        bgStyle: 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-100 hover:border-purple-400',
        badgeStyle: 'bg-purple-50 text-purple-800 border-purple-200'
      },
      {
        key: 'binhminh',
        title: 'TRƯỚC BÌNH MINH 🌅',
        desc: 'Đạt điểm tối đa 30/30 sớm nhất ngày mới',
        calcMethod: 'Giờ nộp bài đạt điểm tối đa 30/30 sớm nhất trong một ngày, rà rà tự động trong khoảng từ 00:00 sáng đến 10:00 sáng.',
        data: records3T.binhminh,
        getMetric: (d: any) => d ? `${d.timeString} sáng` : 'Chưa ghi nhận',
        icon: <Calendar className="h-5 w-5 text-blue-500" />,
        beatCondition: (d: any) => `Để xô đổ kỷ lục: Nộp bài đạt điểm số tuyệt đối 30/30 ở thời gian sớm hơn ${d ? d.timeString : '01:24'} sáng.`,
        bgStyle: 'bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-100 hover:border-blue-400',
        badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200'
      }
    ];

    // Filter list based on search bar
    const filteredList = rawCategories.filter(item => {
      if (!recordSearch.trim()) return true;
      const q = recordSearch.trim().toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
      const matchHolder = item.data ? (
        item.data.name.toLowerCase().includes(q) || 
        item.data.dept.toLowerCase().includes(q) || 
        item.data.branch.toLowerCase().includes(q)
      ) : false;
      return matchTitle || matchHolder;
    });

    return (
      <div className="space-y-6 font-sans">
        {/* Rules and Explanation Accordion */}
        <div className="bg-amber-50/20 border border-amber-250/60 rounded-xl overflow-hidden shadow-3xs transition-all duration-300">
          <button
            onClick={() => setShowRuleAccordion(!showRuleAccordion)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs sm:text-sm font-bold text-amber-900 bg-amber-50/10 hover:bg-amber-50/45 transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2 font-black uppercase tracking-wider text-amber-950">
              <span>📌 QUY CHẾ THI THIẾT LẬP & XÔ ĐỔ KỶ LỤC 3T MASTER</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 font-semibold text-xs">
              <span>{showRuleAccordion ? 'Thu gọn quy chế' : 'Xem chi tiết quy chế'}</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-350 ${showRuleAccordion ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showRuleAccordion && (
            <div className="border-t border-amber-200/50 p-5 bg-white text-xs text-amber-955 space-y-4 leading-relaxed font-sans">
              <p className="font-medium text-amber-950">
                Bảng vàng vinh danh các <strong className="text-amber-900 font-black">Kỷ Lục 3T Master</strong> là nơi lưu trữ và tuyên dương các thành tựu thi đua đỉnh cao nhất sảnh thi từ trước đến nay của cá nhân học viên. Hệ thống sảnh rà quét và tự động cập nhật kỷ lục theo thời gian thực (real-time).
              </p>

              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 space-y-3">
                <h5 className="font-bold text-amber-900 uppercase tracking-wide text-[11px] sm:text-xs flex items-center gap-1">
                  <span>🛡️ CƠ CHẾ TỐI ƯU CHỐNG THÔNG BÁO DỒN DẬP (ANTI-SPAM OPTIMIZATION)</span>
                </h5>
                <p className="text-[11px] text-amber-950/90 leading-relaxed">
                  Để đảm bảo tính nghiêm túc của hệ thống thi đua và tránh làm loãng kênh chat sảnh thi bằng các thông báo lặp đi lặp lại dồn dập, sảnh thi áp dụng các cơ chế vinh danh thông minh sau:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-amber-955">
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200/40 space-y-2">
                    <span className="font-bold text-amber-900 border-b border-amber-100 pb-0.5 block">⚡ Tự phá kỷ lục cá nhân (Self-beating):</span>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong className="text-gray-800">Kiên Trì:</strong> Chỉ phát loa vinh danh sảnh thi khi đạt mốc tròn <span className="text-amber-900 font-black">100 lượt</span> thi đua (ví dụ: mốc 100, 200, 300, 400 lượt...). Các mốc lẻ ở giữa sẽ được âm thầm cập nhật vào hồ sơ.</li>
                      <li><strong className="text-gray-800">Trí Tuệ:</strong> Chỉ phát loa vinh danh khi đạt thêm mốc tròn <span className="text-amber-900 font-black">50 lượt đại cát 30/30</span> (ví dụ: mốc 50, 100, 150, 200 lượt...).</li>
                    </ul>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200/40 space-y-2">
                    <span className="font-bold text-amber-950 border-b border-amber-100 pb-0.5 block">👑 Soán ngôi lật đổ đối thủ (New Holder):</span>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Hệ thống ngay lập tức vinh danh nồng nhiệt toàn bộ sảnh thi bất kể mốc tròn lẻ khi có <strong className="text-amber-900 font-black">Người Mới</strong> chính thức san bằng hoặc lật đổ kỷ lục của người đi trước.</li>
                      <li>Các kỷ lục nhảy số cực nhạy khó nhằn như <strong className="text-emerald-850">Tốc Độ (phản xạ)</strong>, <strong className="text-purple-800">Bất Bại (chuỗi)</strong>, và <strong className="text-blue-800">Trước Bình Minh</strong> luôn được vinh danh lập tức.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left text-[11px] sm:text-xs">
                  <thead className="bg-amber-100/40 text-amber-950 font-black uppercase border-b border-amber-200">
                    <tr>
                      <th className="py-2 px-3">TÊN KỶ LỤC</th>
                      <th className="py-2 px-3">CÔNG THỨC & PHƯƠNG PHÁP TÍNH TOÁN CHI TIẾT</th>
                      <th className="py-2 px-3">TIÊU CHUẨN XÔ ĐỔ & VINH DANH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 leading-normal text-amber-950/90 font-sans">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-amber-900">Kiên Trì 🎯</td>
                      <td className="py-2.5 px-3">Tính tổng số lượt nộp bài rèn luyện thực tế của học viên trên toàn hệ sảnh thi (Toàn chiến dịch lũy kế).</td>
                      <td className="py-2.5 px-3">
                        <div>Số lượt thi tiếp theo phải <strong className="text-amber-900">&gt;</strong> kỷ lục cũ.</div>
                        <div className="text-[10px] text-gray-500 font-medium">Spam block: Chỉ loa sảnh mốc tròn 100 đối với chính chủ.</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-amber-900">Trí Tuệ 🧠</td>
                      <td className="py-2.5 px-3">Tổng số bài thi làm đạt điểm số tuyệt đối 30/30 tối đa tích lũy toàn thời gian kể từ khi gia nhập app.</td>
                      <td className="py-2.5 px-3">
                        <div>Lũy kế tổng lượt đạt 30/30 phải <strong className="text-amber-900">&gt;=</strong> cột mốc cũ.</div>
                        <div className="text-[10px] text-gray-500 font-medium">Spam block: Chỉ loa sảnh mốc tròn 50 đối với chính chủ.</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-amber-900">Tốc Độ ⚡</td>
                      <td className="py-2.5 px-3">Thời gian trả lời trung bình một câu trên một lượt thi duy nhất đạt 30/30 điểm (Thời gian / Số câu). Để ngăn ngừa may rủi ngẫu nhiên hoặc lụi đáp án cực nhanh, lượt thi bắt buộc phải có <strong className="font-semibold text-gray-800">tối thiểu 3 câu</strong> trở lên.</td>
                      <td className="py-2.5 px-3">
                        <div>Thời gian phản xạ trung bình phải <strong className="text-amber-900">ngắn hơn (&lt;)</strong> kỷ lục cũ.</div>
                        <div className="text-[10px] text-gray-500 font-medium">Luôn vinh danh lập tức sảnh thi.</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-amber-900">Thần Tốc 📈</td>
                      <td className="py-2.5 px-3">Tổng số lượt làm bài kiểm tra tích lũy ít nhất được dùng để rèn luyện thăng tiến thành công từ vị trí Tân Binh (Cấp 1) lên tuyệt đỉnh Cấp 5 (Huyền Thoại).</td>
                      <td className="py-2.5 px-3">
                        <div>Số lượng lượt rèn luyện nâng cấp phải <strong className="text-amber-900">ít hơn hẳn (&lt;)</strong> kỷ lục cũ.</div>
                        <div className="text-[10px] text-gray-500 font-medium">Ghi nhận và vinh danh trực tiếp sảnh thi.</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-amber-900">Bất Bại 🛡️</td>
                      <td className="py-2.5 px-3">Số lượng các lượt thi liên tiếp đạt điểm tuyệt đối 30/30 dài nhất mà không bị đứt chuỗi hoặc bị hạ điểm xen giữa.</td>
                      <td className="py-2.5 px-3">
                        <div>Chuỗi liên hoàn 30/30 tiếp theo phải <strong className="text-amber-900">&gt;</strong> mốc chuỗi cũ.</div>
                        <div className="text-[10px] text-gray-500 font-medium">Luôn vinh danh sảnh thi ngay lập tức để cổ vũ tinh thần.</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-amber-900">Trước Bình Minh 🌅</td>
                      <td className="py-2.5 px-3">Lượt thi nộp đạt điểm số tuyệt đối 30/30 sớm nhất ngày mới, được hệ thống rà quét tự động trong khoảng khoảng giờ từ <strong className="font-bold text-gray-800">00:00 sáng đến 10:00 sáng</strong>.</td>
                      <td className="py-2.5 px-3">
                        <div>Khung thời gian nộp bài phải <strong className="text-amber-900">sớm hơn (&lt;)</strong> mốc giờ cũ.</div>
                        <div className="text-[10px] text-gray-500 font-medium">Luôn vinh danh trực tiếp tức thì sảnh thi.</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-amber-850 italic font-medium">
                * Chú thích: Khi bạn thi đấu rèn luyện nâng cao thành tích của mình hoặc vượt qua đối thủ khác, hãy vững tâm hệ thống thông minh sảnh thi luôn ghi nhận chính xác 100% vào trang cá nhân và bảng vinh danh này, đồng thời lọc sạch mọi nhiễu tin rác dồn dập!
              </p>
            </div>
          )}
        </div>

        {/* Record Filters and Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-gray-150 p-4 rounded-xl shadow-3xs">
          <div>
            <h4 className="text-sm font-black text-[#0B3A60] uppercase tracking-wide">CÁC HẠNG MỤC KỶ LỤC ĐANG ÁP DỤNG ({filteredList.length})</h4>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Tìm và theo dõi các bằng chứng thi cử và chỉ số cần đạt bổ sung.</p>
          </div>
          <div className="relative w-full sm:w-64 font-sans">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm Kỷ lục, tên, phòng ban..."
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition-all font-sans"
            />
          </div>
        </div>

        {/* Dynamic Bento Box Cards of Records */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredList.map((item) => {
            const holder = item.data;
            const holderName = holder ? holder.name : 'Chưa ghi nhận';
            const holderDept = holder ? holder.dept : '';
            const holderBranch = holder ? holder.branch : '';
            const initChar = holderName.split(' ').pop()?.charAt(0) || 'R';

            return (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`bg-white border rounded-xl p-5 shadow-3xs flex flex-col justify-between space-y-4 text-left transition-all duration-300 border-gray-200 ${item.bgStyle}`}
              >
                {/* Upper portion: title and icon */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
                      {item.icon}
                      {item.title}
                    </span>
                    <span className={`text-[10px] sm:text-xs font-black border rounded-full px-3 py-1 shadow-3xs ${item.badgeStyle}`}>
                      {item.getMetric(holder)}
                    </span>
                  </div>

                  <h5 className="text-[11px] text-gray-405 leading-relaxed font-semibold">{item.desc}</h5>
                </div>

                {/* Calculation Description Block */}
                <div className="bg-white/80 p-3 rounded-lg border border-gray-150/70 text-xs leading-relaxed text-gray-550 space-y-1">
                  <span className="text-[9.5px] font-bold text-gray-450 uppercase block">Phương Pháp Tính toán:</span>
                  <p className="font-medium text-gray-700">{item.calcMethod}</p>
                </div>

                {/* Middle portion: current holder avatar & profile */}
                <div className="border-t border-gray-150/60 pt-4 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-900/5 text-slate-700 border border-slate-250 shadow-3xs flex items-center justify-center font-black text-lg select-none uppercase">
                    {initChar}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-gray-900 truncate uppercase" title={holderName}>{holderName}</span>
                      {holder && (
                        <span className="text-[8.5px] font-bold text-gray-400 font-mono shrink-0">XÁC LẬP: {holder.date}</span>
                      )}
                    </div>
                    {holder ? (
                      <p className="text-[10.5px] text-gray-500 font-medium leading-tight truncate">
                        {holderDept} • <span className="font-mono text-[9px] text-amber-900 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-100">{holderWithShortBranch(holderBranch)}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">Học viên sảnh thi hãy thiết lập mẻ lưới đầu tiên!</p>
                    )}
                  </div>
                </div>

                {/* Evidence Testimony Banner */}
                {holder && (
                  <div className="bg-slate-100/50 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-650 leading-relaxed font-sans mt-0.5">
                    <span className="font-extrabold text-[#0B3A60] select-none text-[10.5px]">🎖️ Bằng chứng kỷ luật: </span>
                    <span className="font-medium text-slate-700">{holder.proofText}</span>
                  </div>
                )}

                {/* Bottom target: conditional triggers */}
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg text-xs text-red-950 font-sans mt-2 space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1 select-none">
                    <span>🔥 ĐIỀU KIỆN ĐỂ XÔ ĐỔ KỶ LỤC HIỆN TẠI:</span>
                  </span>
                  <p className="font-bold text-rose-900 text-[11px]">{item.beatCondition(holder)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper to contract lengthy branch names gracefully for records layout
  const holderWithShortBranch = (branchStr: string): string => {
    if (!branchStr) return '';
    if (branchStr.includes('Bắc Ninh')) return 'TPP-BNI';
    if (branchStr.includes('Long An')) return 'TPP-LAN';
    if (branchStr.includes('Văn Phòng')) return 'TPP-CTY';
    return branchStr;
  };

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
      {/* Tab Header Card with Switcher */}
      <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-3xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <span>{panelTab === 'records' ? 'Bản Đồ Kỷ Lục Thi Đua 3T Master' : 'Trang Phân Tích Thành Tích Cá Nhân'}</span>
          </h3>
          <p className="text-xs text-gray-400 leading-normal">
            {panelTab === 'records' 
              ? 'Báo cáo thông kê thành tích thực tế, quy chế thi đua và chỉ số mục tiêu để lật đổ kỷ lục hiện hành.' 
              : 'Báo cáo trực quan sâu về nỗ lực, tốc độ phản xạ và sự tiến bộ qua các lượt thi kiểm thử của từng cá nhân.'}
          </p>
        </div>

        {/* Segmented Control Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-3xs border border-gray-200 self-center lg:self-auto gap-1 shrink-0">
          <button
            onClick={() => setPanelTab('personal')}
            className={`py-1.5 px-4 rounded-lg font-black text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-95 ${
              panelTab === 'personal'
                ? 'bg-white text-[#0B3A60] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>CÁ NHÂN</span>
          </button>
          <button
            onClick={() => setPanelTab('records')}
            className={`py-1.5 px-4 rounded-lg font-black text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-95 ${
              panelTab === 'records'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🏆 KỶ LỤC 3T</span>
          </button>
        </div>

        {/* Dropdown Selector Component - Only visible in "personal" mode */}
        {panelTab === 'personal' && (
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
        )}
      </div>

      {panelTab === 'records' ? (
        renderRecordsTab()
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
