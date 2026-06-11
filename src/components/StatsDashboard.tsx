import React, { useState, useEffect, useMemo } from 'react';
import { User, QuizResult, BRANCHES, DEPARTMENTS, CompanyMapping } from '../types';
import { getQuotaStats, databaseService } from '../firebase';
import { 
  Database, Users, Trophy, Award, BarChart3, Clock, 
  Activity, ShieldAlert, Sparkles, RefreshCcw, TrendingUp, 
  Building2, Calendar, ShieldCheck, Zap, Home, Trash2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { motion } from 'motion/react';

interface StatsDashboardProps {
  users: User[];
  results: QuizResult[];
  onRefresh: () => Promise<void>;
  onBackToHome?: () => void;
  companyMappings?: CompanyMapping[];
  isAdmin?: boolean;
}

export default function StatsDashboard({ users: rawUsers, results: rawResults, onRefresh, onBackToHome, companyMappings, isAdmin = false }: StatsDashboardProps) {
  const [quota, setQuota] = useState(getQuotaStats());
  const [rankingPeriod, setRankingPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listPeriod, setListPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [mappings, setMappings] = useState<CompanyMapping[]>(companyMappings || []);

  // Filter users based on companyMappings exclusion
  const users = useMemo(() => {
    return rawUsers.filter(u => {
      const bNameNorm = (u.branch || '').trim().normalize('NFC').toLowerCase();
      const dNameNorm = (u.department || '').trim().normalize('NFC').toLowerCase();
      for (const co of mappings) {
        for (const br of co.branches) {
          if (br.name.trim().normalize('NFC').toLowerCase() === bNameNorm) {
            if (br.excludeFromStats) return false;
            for (const d of br.departments) {
              if (d.name.trim().normalize('NFC').toLowerCase() === dNameNorm) {
                if (d.excludeFromStats) return false;
              }
            }
          }
        }
      }
      return true;
    });
  }, [rawUsers, mappings]);

  // Filter results based on companyMappings exclusion
  const results = useMemo(() => {
    return rawResults.filter(r => {
      const bNameNorm = (r.branch || '').trim().normalize('NFC').toLowerCase();
      const dNameNorm = (r.department || '').trim().normalize('NFC').toLowerCase();
      for (const co of mappings) {
        for (const br of co.branches) {
          if (br.name.trim().normalize('NFC').toLowerCase() === bNameNorm) {
            if (br.excludeFromStats) return false;
            for (const d of br.departments) {
              if (d.name.trim().normalize('NFC').toLowerCase() === dNameNorm) {
                if (d.excludeFromStats) return false;
              }
            }
          }
        }
      }
      return true;
    });
  }, [rawResults, mappings]);
  const [scorecardBranchFilter, setScorecardBranchFilter] = useState('');
  const [scorecardDeptFilter, setScorecardDeptFilter] = useState('');
  const [scorecardSearchQuery, setScorecardSearchQuery] = useState('');
  const [onlineBranchFilter, setOnlineBranchFilter] = useState<string>('ALL');
  const [expandedDeptOnline, setExpandedDeptOnline] = useState<string | null>(null);
  
  // Independent scorecard period and selectable time value states
  const [scorecardPeriod, setScorecardPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedScorecardWeekVal, setSelectedScorecardWeekVal] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const currentMonday = new Date(d.setDate(diff));
    return currentMonday.toISOString().split('T')[0];
  });
  const [selectedScorecardMonthVal, setSelectedScorecardMonthVal] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

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

  // Robust normalization to match department names despite casing, spacing, and trailing branch abbreviations parenthesized / bracketed
  const normalizeDept = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\s*\(.*?\)/g, '') // Remove parenthesized branch codes, e.g. (TPP-CTY)
      .replace(/\s*\[.*?\]/g, '') // Remove bracketed branch codes
      .replace(/\s+/g, ' ')       // Normalize spaces
      .trim();
  };

  // Check and map of evaluation string based on exact point/threshold requirements
  const getEvaluationString = (score: number): string => {
    if (score < 15) return 'Không Đạt';
    if (score >= 15 && score < 20) return 'Đạt 90%';
    if (score >= 20 && score < 24) return 'Đạt 100%';
    if (score >= 24 && score < 27) return 'Đạt 120%';
    return 'Đạt 150%';
  };

  // Extract unique departments from mappings dynamically, fallback to static if empty
  const activeDepartmentsList: string[] = mappings.length > 0
    ? Array.from(new Set(mappings.flatMap(co => co.branches.flatMap(b => b.departments.map(d => getFullDeptName(d.name.trim(), b.name.trim()))))))
    : Array.from(DEPARTMENTS);

  // Helper to extract clean branch code without brackets/parentheses, e.g. "Chi Nhánh Long An [TPP-LAN]" -> "TPP-LAN"
  const getBranchCodeOnly = (branchName: string): string => {
    if (!branchName) return '';
    const squareMatch = branchName.match(/\[([^\]]+)\]/);
    if (squareMatch) return squareMatch[1].trim();
    const roundMatch = branchName.match(/\(([^)]+)\)/);
    if (roundMatch) return roundMatch[1].trim();
    
    // Fallback: If no brackets or parentheses, clean up leading prefix terms
    return branchName
      .replace(/Chi nhánh/gi, '')
      .replace(/Văn phòng/gi, '')
      .replace(/Văn Phòng/gi, '')
      .replace(/Nhà máy/gi, '')
      .trim();
  };

  const availableDepartmentsForSelectedBranch = useMemo(() => {
    if (!scorecardBranchFilter) return [];
    
    if (mappings.length > 0) {
      const matchedDepartments: string[] = [];
      mappings.forEach(co => {
        co.branches.forEach(b => {
          if (b.name.trim() === scorecardBranchFilter.trim()) {
            b.departments.forEach(d => {
              matchedDepartments.push(getFullDeptName(d.name.trim(), b.name.trim()));
            });
          }
        });
      });
      if (matchedDepartments.length > 0) {
        return Array.from(new Set(matchedDepartments));
      }
    }
    
    const abbr = getBranchAbbr(scorecardBranchFilter);
    if (abbr) {
      return activeDepartmentsList.filter(d => d.includes(abbr));
    }
    return activeDepartmentsList;
  }, [scorecardBranchFilter, mappings, activeDepartmentsList]);

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
      totalScore: number;
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
          totalScore: 0,
          totalDuration: 0,
          lastAttempt: 0
        };
      }
      grouped[key].attempts += 1;
      grouped[key].totalDuration += res.duration || 0;
      grouped[key].totalScore += res.score || 0;
      if (res.score > grouped[key].bestScore) {
        grouped[key].bestScore = res.score;
      }
      if (res.timestamp > grouped[key].lastAttempt) {
        grouped[key].lastAttempt = res.timestamp;
      }
    });

    return Object.values(grouped)
      .map(p => {
        // Compute level based on all historical results for this participant
        const userResults = results.filter(r => (p.userId && r.userId === p.userId) || (p.userName && r.userName === p.userName));
        const chronologicalResults = [...userResults].sort((a, b) => a.timestamp - b.timestamp);
        
        let currentLevel = 1;
        let consecutiveMaxAtLevel = 0;
        let consecutiveLowAtLevel = 0;

        for (const res of chronologicalResults) {
          const score = res.score;
          
          if (currentLevel === 1) {
            if (score === 30) {
              consecutiveMaxAtLevel++;
            } else {
              consecutiveMaxAtLevel = 0;
            }
            
            if (consecutiveMaxAtLevel >= 5) {
              currentLevel = 2;
              consecutiveMaxAtLevel = 0;
              consecutiveLowAtLevel = 0;
            }
          } else if (currentLevel === 2) {
            if (score === 30) {
              consecutiveMaxAtLevel++;
              consecutiveLowAtLevel = 0;
            } else if (score < 20) {
              consecutiveLowAtLevel++;
              consecutiveMaxAtLevel = 0;
            } else {
              consecutiveMaxAtLevel = 0;
              consecutiveLowAtLevel = 0;
            }
            
            if (consecutiveMaxAtLevel >= 5) {
              currentLevel = 3;
              consecutiveMaxAtLevel = 0;
              consecutiveLowAtLevel = 0;
            } else if (consecutiveLowAtLevel >= 5) {
              currentLevel = 1;
              consecutiveMaxAtLevel = 0;
              consecutiveLowAtLevel = 0;
            }
          } else if (currentLevel === 3) {
            if (score === 30) {
              consecutiveMaxAtLevel++;
              consecutiveLowAtLevel = 0;
            } else if (score < 20) {
              consecutiveLowAtLevel++;
              consecutiveMaxAtLevel = 0;
            } else {
              consecutiveMaxAtLevel = 0;
              consecutiveLowAtLevel = 0;
            }
            
            if (consecutiveLowAtLevel >= 5) {
              currentLevel = 2;
              consecutiveMaxAtLevel = 0;
              consecutiveLowAtLevel = 0;
            }
          }
        }

        return {
          ...p,
          level: currentLevel,
          avgScore: p.attempts > 0 ? parseFloat((p.totalScore / p.attempts).toFixed(1)) : 0
        };
      })
      .sort((a, b) => b.attempts - a.attempts || b.avgScore - a.avgScore);
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

  // 3.5. Real-Time Online Today Statistics
  const isOnlineToday = (timestamp?: number) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const onlineTodayUsers = activeUsers.filter(u => isOnlineToday(u.lastActive));
  const totalCompanyOnlineToday = onlineTodayUsers.length;

  const onlineTodayByDept = activeDepartmentsList.map(fullDeptName => {
    const onlineInDept = onlineTodayUsers.filter(u => {
      if (mappings.length > 0) {
        return getFullDeptName(u.department || '', u.branch || '') === fullDeptName;
      } else {
        return (u.department || '') === fullDeptName;
      }
    });

    const totalInDept = activeUsers.filter(u => {
      if (mappings.length > 0) {
        return getFullDeptName(u.department || '', u.branch || '') === fullDeptName;
      } else {
        return (u.department || '') === fullDeptName;
      }
    }).length;

    const count = onlineInDept.length;
    const percentage = totalInDept > 0 ? Math.round((count / totalInDept) * 100) : 0;
    return { name: fullDeptName, count, totalInDept, percentage, onlineUsers: onlineInDept };
  }).sort((a, b) => b.count - a.count || b.totalInDept - a.totalInDept || a.name.localeCompare(b.name));

  const filteredOnlineTodayByDept = onlineTodayByDept.filter(dept => {
    if (onlineBranchFilter === 'ALL') return true;
    return dept.name.includes(onlineBranchFilter);
  });

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
        totalScore: number;
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
            totalScore: 0,
            avgDuration: 0,
            totalDuration: 0
          };
        }
        counts[uid].attempts += 1;
        counts[uid].totalDuration += res.duration || 0;
        counts[uid].totalScore += res.score || 0;
        if (res.score > counts[uid].maxScore) {
          counts[uid].maxScore = res.score;
        }
      }
    });

    return Object.values(counts)
      .map(u => {
        const avgScore = u.attempts > 0 ? parseFloat((u.totalScore / u.attempts).toFixed(1)) : 0;
        return {
          ...u,
          avgScore,
          avgDuration: u.attempts > 0 ? Math.round(u.totalDuration / u.attempts) : 0
        };
      })
      .sort((a, b) => b.attempts - a.attempts || b.avgScore - a.avgScore) // Sort primarily by attempt volume, then average score
      .slice(0, 5);
  };

  const topRankings = getRankings();

  // Helper to get daily averages from results list
  interface DailyAverage {
    dateStr: string;
    avgScore: number;
    count: number;
    timestamp: number;
  }

  const getDailyAveragesObj = (fResults: QuizResult[]): DailyAverage[] => {
    const groups: Record<string, { sum: number; count: number; timestamp: number }> = {};
    fResults.forEach(r => {
      const date = new Date(r.timestamp);
      const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      if (!groups[dateStr]) {
        groups[dateStr] = { sum: 0, count: 0, timestamp: dayStart };
      }
      groups[dateStr].sum += r.score;
      groups[dateStr].count += 1;
    });

    return Object.entries(groups)
      .map(([dateStr, data]) => ({
        dateStr,
        avgScore: parseFloat((data.sum / data.count).toFixed(1)),
        count: data.count,
        timestamp: data.timestamp
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  };

  // Generate options for Months (the last 12 calendar months including the current month)
  const nowForOptions = new Date();
  const currentYOpt = nowForOptions.getFullYear();
  const currentMOpt = nowForOptions.getMonth(); // 0-indexed
  
  const monthOptions = useMemo(() => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYOpt, currentMOpt - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = `Tháng ${m + 1}/${y}`;
      const value = `${y}-${String(m + 1).padStart(2, '0')}`;
      list.push({ label, value, year: y, monthIndex: m });
    }
    return list;
  }, [currentYOpt, currentMOpt]);

  // Generate options for Weeks (the last 12 weeks of the year from Monday to Sunday)
  const weekOptions = useMemo(() => {
    const list = [];
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const currentMonday = new Date(d.setDate(diff));
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 12; i++) {
      const start = new Date(currentMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 59 * 59 * 1000 + 999);
      const startStr = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
      const endStr = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`;
      const label = i === 0 
        ? `Tuần này (${startStr} - ${endStr})`
        : i === 1 
          ? `Tuần trước (${startStr} - ${endStr})`
          : `Tuần: ${startStr} - ${endStr}`;
      const value = start.toISOString().split('T')[0];
      list.push({ label, value, start, end });
    }
    return list;
  }, []);

  const [selectedMonthVal, setSelectedMonthVal] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedWeekVal, setSelectedWeekVal] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const currentMonday = new Date(d.setDate(diff));
    return currentMonday.toISOString().split('T')[0];
  });

  const getResultsForPeriod = (period: 'day' | 'week' | 'month' | 'year') => {
    if (period === 'day') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return results.filter(r => r.timestamp >= d.getTime());
    }
    
    if (period === 'week') {
      const matchedWeek = weekOptions.find(w => w.value === selectedWeekVal);
      if (matchedWeek) {
        return results.filter(r => r.timestamp >= matchedWeek.start.getTime() && r.timestamp <= matchedWeek.end.getTime());
      }
      const nowMs = Date.now();
      return results.filter(r => r.timestamp >= nowMs - 7 * 24 * 60 * 60 * 1000);
    }
    
    if (period === 'month') {
      const [yStr, mStr] = selectedMonthVal.split('-');
      if (yStr && mStr) {
        const year = parseInt(yStr);
        const monthZeroBased = parseInt(mStr) - 1;
        const startOfM = new Date(year, monthZeroBased, 1, 0, 0, 0, 0).getTime();
        const endOfM = new Date(year, monthZeroBased + 1, 1, 0, 0, 0, 0).getTime() - 1;
        return results.filter(r => r.timestamp >= startOfM && r.timestamp <= endOfM);
      }
      const nowMs = Date.now();
      return results.filter(r => r.timestamp >= nowMs - 30 * 24 * 60 * 60 * 1000);
    }
    
    const startOfYear = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
    return results.filter(r => r.timestamp >= startOfYear);
  };

  const filteredStatsResults = getResultsForPeriod(statsPeriod);

  // Independent scorecard dataset selector
  const getResultsForScorecardPeriod = (period: 'day' | 'week' | 'month') => {
    if (period === 'day') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return results.filter(r => r.timestamp >= d.getTime());
    }
    
    if (period === 'week') {
      const matchedWeek = weekOptions.find(w => w.value === selectedScorecardWeekVal);
      if (matchedWeek) {
        return results.filter(r => r.timestamp >= matchedWeek.start.getTime() && r.timestamp <= matchedWeek.end.getTime());
      }
      const nowMs = Date.now();
      return results.filter(r => r.timestamp >= nowMs - 7 * 24 * 60 * 60 * 1000);
    }
    
    if (period === 'month') {
      const [yStr, mStr] = selectedScorecardMonthVal.split('-');
      if (yStr && mStr) {
        const year = parseInt(yStr);
        const monthZeroBased = parseInt(mStr) - 1;
        const startOfM = new Date(year, monthZeroBased, 1, 0, 0, 0, 0).getTime();
        const endOfM = new Date(year, monthZeroBased + 1, 1, 0, 0, 0, 0).getTime() - 1;
        return results.filter(r => r.timestamp >= startOfM && r.timestamp <= endOfM);
      }
      const nowMs = Date.now();
      return results.filter(r => r.timestamp >= nowMs - 30 * 24 * 60 * 60 * 1000);
    }
    
    const nowMs = Date.now();
    return results.filter(r => r.timestamp >= nowMs - 30 * 24 * 60 * 60 * 1000);
  };

  const filteredScorecardResults = getResultsForScorecardPeriod(scorecardPeriod);

  // 1. Branch statistics
  const branchAverages = (() => {
    const grouped: Record<string, QuizResult[]> = {};
    filteredStatsResults.forEach(r => {
      const branch = r.branch || 'Hội sở';
      if (!grouped[branch]) {
        grouped[branch] = [];
      }
      grouped[branch].push(r);
    });

    return Object.entries(grouped).map(([branchName, resList]) => {
      const totalScore = resList.reduce((sum, r) => sum + r.score, 0);
      const avgScore = parseFloat((totalScore / resList.length).toFixed(1));
      const daily = getDailyAveragesObj(resList);
      return {
        name: branchName,
        avgScore,
        attempts: resList.length,
        daily
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  })();

  // 2. Department statistics
  const departmentAverages = (() => {
    const grouped: Record<string, QuizResult[]> = {};
    filteredStatsResults.forEach(r => {
      const dept = r.department || 'Bộ phận khác';
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(r);
    });

    return Object.entries(grouped).map(([deptName, resList]) => {
      const totalScore = resList.reduce((sum, r) => sum + r.score, 0);
      const avgScore = parseFloat((totalScore / resList.length).toFixed(1));
      const daily = getDailyAveragesObj(resList);
      
      const branchCodes = Array.from(new Set(resList.map(r => {
        const branchName = r.branch || users.find(u => u.id === r.userId || u.name === r.userName)?.branch || '';
        return getBranchCodeOnly(branchName);
      }).filter(Boolean)));
      const branchSuffix = branchCodes.length > 0 ? ` (${branchCodes.join(', ')})` : '';

      return {
        name: deptName + branchSuffix,
        avgScore,
        attempts: resList.length,
        daily
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  })();

  // 3. Individual statistics
  const individualAverages = (() => {
    const grouped: Record<string, { name: string; dept: string; branch: string; results: QuizResult[] }> = {};
    filteredStatsResults.forEach(r => {
      const key = r.userId || r.userName;
      if (!grouped[key]) {
        const matchedUser = users.find(u => u.id === r.userId || u.name === r.userName);
        grouped[key] = {
          name: (r.userName || matchedUser?.name || 'Thành viên ẩn danh').toUpperCase(),
          dept: r.department || matchedUser?.department || 'Bộ phận khác',
          branch: r.branch || matchedUser?.branch || 'Hội sở',
          results: []
        };
      }
      grouped[key].results.push(r);
    });

    return Object.values(grouped).map(ind => {
      const totalScore = ind.results.reduce((sum, r) => sum + r.score, 0);
      const avgScore = parseFloat((totalScore / ind.results.length).toFixed(1));
      const daily = getDailyAveragesObj(ind.results);
      return {
        name: ind.name,
        dept: ind.dept,
        branch: ind.branch,
        avgScore,
        attempts: ind.results.length,
        daily
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  })();

  // 4. Company-wide overall statistics (TÂN PHÚ VIỆT NAM)
  const companyAverage = useMemo(() => {
    if (filteredStatsResults.length === 0) {
      return { avgScore: 0, attempts: 0, numUsers: 0 };
    }
    const totalScore = filteredStatsResults.reduce((sum, r) => sum + r.score, 0);
    const avgScore = parseFloat((totalScore / filteredStatsResults.length).toFixed(1));
    const uniqueUsersSet = new Set(filteredStatsResults.map(r => r.userId || r.userName));
    return {
      avgScore,
      attempts: filteredStatsResults.length,
      numUsers: uniqueUsersSet.size
    };
  }, [filteredStatsResults]);

  // NEW: Daily Scorecard logic for day/weekly/monthly statistics grouped by Department/Unit
  const scorecardDates = useMemo(() => {
    const dates: { dateObj: Date; dateStr: string }[] = [];
    if (scorecardPeriod === 'day') {
      const d = new Date();
      const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      dates.push({ dateObj: d, dateStr: dStr });
      return dates;
    }

    if (scorecardPeriod === 'week') {
      const matchedWeek = weekOptions.find(w => w.value === selectedScorecardWeekVal);
      if (matchedWeek) {
        for (let i = 0; i < 7; i++) {
          const d = new Date(matchedWeek.start.getTime() + i * 24 * 60 * 60 * 1000);
          const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          dates.push({ dateObj: d, dateStr: dStr });
        }
        return dates;
      }
    }
    
    if (scorecardPeriod === 'month') {
      const [yStr, mStr] = selectedScorecardMonthVal.split('-');
      if (yStr && mStr) {
        const year = parseInt(yStr);
        const monthZeroBased = parseInt(mStr) - 1;
        // Find total days of this month
        const daysInMonth = new Date(year, monthZeroBased + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, monthZeroBased, i);
          const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          dates.push({ dateObj: d, dateStr: dStr });
        }
        return dates;
      }
    }
    
    // Fallback: last 30 days
    const total = scorecardPeriod === 'week' ? 7 : 30;
    for (let i = total - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      dates.push({ dateObj: d, dateStr: dStr });
    }
    return dates;
  }, [scorecardPeriod, selectedScorecardMonthVal, selectedScorecardWeekVal, weekOptions]);

  // Precompute selected branch and department averages for display below the filters
  const selectedBranchAvg = useMemo(() => {
    if (!scorecardBranchFilter) return null;
    const branchResults = filteredScorecardResults.filter(r => (r.branch || 'Hội sở') === scorecardBranchFilter);
    if (branchResults.length === 0) return { avg: 0, count: 0 };
    const total = branchResults.reduce((sum, r) => sum + r.score, 0);
    return {
      avg: parseFloat((total / branchResults.length).toFixed(1)),
      count: branchResults.length
    };
  }, [scorecardBranchFilter, filteredScorecardResults]);

  const selectedDeptAvg = useMemo(() => {
    if (!scorecardDeptFilter) return null;
    const targetNorm = normalizeDept(scorecardDeptFilter);
    const deptResults = filteredScorecardResults.filter(r => {
      const dbDept = r.department || '';
      return normalizeDept(dbDept) === targetNorm;
    });
    if (deptResults.length === 0) return { avg: 0, count: 0 };
    const total = deptResults.reduce((sum, r) => sum + r.score, 0);
    return {
      avg: parseFloat((total / deptResults.length).toFixed(1)),
      count: deptResults.length
    };
  }, [scorecardDeptFilter, filteredScorecardResults]);

  // Precompute score lookup: map[user_key_or_name][date_str] -> avg_score
  const scorecardSumLookup: Record<string, Record<string, number>> = {};
  const scorecardAttemptsLookup: Record<string, Record<string, number>> = {};
  filteredScorecardResults.forEach(r => {
    const userKey = r.userId || r.userName;
    const d = new Date(r.timestamp);
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    if (!scorecardSumLookup[userKey]) {
      scorecardSumLookup[userKey] = {};
    }
    if (!scorecardAttemptsLookup[userKey]) {
      scorecardAttemptsLookup[userKey] = {};
    }
    
    scorecardSumLookup[userKey][dateStr] = (scorecardSumLookup[userKey][dateStr] || 0) + r.score;
    scorecardAttemptsLookup[userKey][dateStr] = (scorecardAttemptsLookup[userKey][dateStr] || 0) + 1;
  });

  // Calculate average scores with 1 decimal digit
  const scorecardLookup: Record<string, Record<string, number>> = {};
  Object.keys(scorecardSumLookup).forEach(userKey => {
    scorecardLookup[userKey] = {};
    Object.keys(scorecardSumLookup[userKey]).forEach(dateStr => {
      const sum = scorecardSumLookup[userKey][dateStr];
      const count = scorecardAttemptsLookup[userKey][dateStr];
      scorecardLookup[userKey][dateStr] = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    });
  });

  // Unique merged personnel records for scorecard
  const scorecardPersonnelRaw: {
    id: string;
    name: string;
    employeeId: string;
    department: string;
    branch: string;
  }[] = [];

  // Add all approved users
  activeUsers.forEach(u => {
    scorecardPersonnelRaw.push({
      id: u.id,
      name: u.name,
      employeeId: u.employeeId || 'Không rõ',
      department: u.department || 'Bộ phận khác',
      branch: u.branch || 'Hội sở'
    });
  });

  // Add remaining users who did tests within this range but aren't listed
  filteredScorecardResults.forEach(r => {
    const alreadyAdded = scorecardPersonnelRaw.some(p => p.id === r.userId || p.name.toUpperCase() === r.userName.toUpperCase());
    if (!alreadyAdded) {
      scorecardPersonnelRaw.push({
        id: r.userId || r.userName,
        name: r.userName,
        employeeId: 'Lưu trữ',
        department: r.department || 'Bộ phận khác',
        branch: r.branch || 'Hội sở'
      });
    }
  });

  // Filter scorecard personnel based on state selectors
  const filteredScorecardPersonnel = scorecardPersonnelRaw.filter(p => {
    if (scorecardBranchFilter && p.branch !== scorecardBranchFilter) {
      return false;
    }
    if (scorecardDeptFilter) {
      const isMatch = normalizeDept(p.department) === normalizeDept(scorecardDeptFilter);
      if (!isMatch) {
        return false;
      }
    }
    if (scorecardSearchQuery) {
      const q = scorecardSearchQuery.toLowerCase().trim();
      return p.name.toLowerCase().includes(q) || 
             p.employeeId.toLowerCase().includes(q) ||
             p.department.toLowerCase().includes(q) ||
             p.branch.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    const deptComp = a.department.localeCompare(b.department);
    if (deptComp !== 0) return deptComp;
    return a.name.localeCompare(b.name);
  });

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
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-250 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 transition-all shadow-3xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Đang cập nhật...' : 'Cập nhật thành tích'}</span>
          </button>
        </div>
      </div>

      {/* Grid containing Left: Quota Tracker or Managed Scope Greeting, Right: Interactive rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Column 1 Wrapper */}
        <div className="space-y-5 text-left">
          {false ? (
            <>
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
                          <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-lg text-xs leading-relaxed text-amber-800 font-bold flex items-start gap-2.5 shadow-3xs font-sans">
                            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                            <div>
                              Phát hiện <span className="text-sm font-black text-amber-950 font-mono underline">{oldResultCount}</span> kết quả thi thử cũ từ tháng trước (hơn 30 ngày trước).
                              <div className="text-[11px] text-gray-500 font-medium mt-1 leading-normal font-sans">
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
            </>
          ) : (
            <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-4 sm:p-5 space-y-3.5 text-left flex flex-col justify-between h-full min-h-[350px] font-sans">
              
              <div className="border-b border-gray-150 pb-3 flex justify-between items-center shrink-0">
                <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2 col-span-2">
                  <Activity className="h-5 w-5 text-blue-500 shrink-0 animate-pulse" />
                  <span>SỐ CBNV ONLINE TRONG NGÀY</span>
                </h4>
                <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-[#1971C2] text-xs font-extrabold rounded-full shadow-2xs font-sans shrink-0">
                  CÔNG TY: {totalCompanyOnlineToday} người
                </span>
              </div>

              {/* Red-circled region filter buttons: TPP-CTY, TPP-BNI, TPP-LAN, TPP-314 */}
              <div className="bg-slate-100/70 border border-slate-200/50 p-1 rounded-lg shrink-0 flex flex-wrap gap-1">
                {(['ALL', 'TPP-CTY', 'TPP-BNI', 'TPP-LAN', 'TPP-314'] as const).map((filterVal) => {
                  const label = filterVal === 'ALL' ? 'TẤT CẢ' : filterVal;
                  const isActive = onlineBranchFilter === filterVal;
                  return (
                    <button
                      key={filterVal}
                      onClick={() => setOnlineBranchFilter(filterVal)}
                      className={`flex-1 min-w-[54px] text-center px-1.5 py-1 text-[9.5px] font-extrabold tracking-tight rounded-md border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1971C2] border-[#1971C2] text-white shadow-3xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable list of departments with online today count - highly dense & optimized to view more rows */}
              <div className="flex-1 overflow-y-auto space-y-1 max-h-[300px] pr-1">
                {filteredOnlineTodayByDept.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 font-medium">
                    Không tìm thấy bộ phận/đơn vị phù hợp
                  </div>
                ) : (
                  filteredOnlineTodayByDept.map((dept) => (
                    <div 
                      key={dept.name} 
                      onClick={() => setExpandedDeptOnline(expandedDeptOnline === dept.name ? null : dept.name)}
                      className="py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 px-1.5 rounded-lg transition-all cursor-pointer select-none group"
                    >
                      <div className="flex justify-between items-center text-xs mb-1.5 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dept.count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                          <span className="font-bold text-gray-750 break-words leading-tight group-hover:text-[#1971C2] transition-colors flex items-center gap-1">
                            {dept.name}
                            {expandedDeptOnline === dept.name ? (
                              <ChevronUp className="h-3 w-3 text-slate-550 inline-block shrink-0 animate-fade-in" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-blue-500 inline-block shrink-0 transition-colors animate-fade-in" />
                            )}
                          </span>
                        </div>
                        <span className="font-bold text-gray-600 font-mono shrink-0 ml-2">
                          {dept.count} <span className="text-gray-400 font-normal font-sans">/</span> {dept.totalInDept} <span className="text-gray-400 font-semibold font-sans">người</span> ({dept.totalInDept > 0 ? Math.round((dept.count / dept.totalInDept) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-50 rounded-full border border-gray-100 overflow-hidden font-sans">
                        <div 
                          style={{ width: `${dept.totalInDept > 0 ? (dept.count / dept.totalInDept) * 100 : 0}%` }} 
                          className={`h-full rounded-full transition-all duration-300 ${dept.count > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                        />
                      </div>

                      {/* Expanded list of online users in this department */}
                      {expandedDeptOnline === dept.name && (
                        <div 
                          className="mt-2.5 pl-3 border-l-2 border-blue-400 space-y-1.5 transition-all text-left animate-fade-in"
                          onClick={(e) => e.stopPropagation()} // Prevent closing when tapping list items
                        >
                          {dept.onlineUsers.length === 0 ? (
                            <div className="text-[10px] text-gray-400 italic py-1 pl-1">
                              Không có ai online hôm nay
                            </div>
                          ) : (
                            dept.onlineUsers.map((u: any) => (
                              <div key={u.id} className="flex items-center justify-between text-[11px] bg-slate-50/70 hover:bg-slate-100/50 border border-slate-100/85 py-1 px-2 rounded-md transition-all">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"></span>
                                  <span className="font-extrabold text-[#0B3A60] truncate">{u.name || 'CBNV ẩn danh'}</span>
                                  {u.employeeId && (
                                    <span className="text-[9px] font-mono text-slate-400 font-medium tracking-tight bg-slate-200/60 px-1 rounded shrink-0">
                                      {u.employeeId}
                                    </span>
                                  )}
                                </div>
                                {u.lastActive && (
                                  <div className="text-[10px] text-gray-500 font-medium font-mono flex items-center gap-1 shrink-0 ml-2">
                                    <Clock className="h-3 w-3 text-slate-450" />
                                    <span>{new Date(u.lastActive).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-gray-150 text-[10px] text-gray-500 flex items-center gap-1.5 leading-relaxed shrink-0 font-sans">
                <Activity className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span>Thống kê hoạt động thực tế của CBNV ghi nhận tự động theo ngày lịch hiện tại.</span>
              </div>
            </div>
          )}
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
                        Điểm trung bình: <b className="text-gray-600 font-mono">{userStats.avgScore}/30</b>
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

          <div className="space-y-1">
            {branchStats.map((branch, idx) => (
              <div key={branch.name} className="py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/30 px-1 rounded-md transition-colors">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="font-bold text-gray-750">{branch.name}</span>
                  </div>
                  <span className="font-bold text-gray-600 font-mono">{branch.count} người ({branch.percentage}%)</span>
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

          <div className="space-y-1 max-h-[235px] overflow-y-auto pr-1">
            {departmentStats.map((dept, idx) => (
              <div key={dept.name} className="py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50/30 px-1 rounded-md transition-colors">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                    <span className="font-bold text-gray-750 break-words leading-tight">{dept.name}</span>
                  </div>
                  <span className="font-bold text-gray-600 font-mono shrink-0 ml-2">{dept.count} người ({dept.percentage}%)</span>
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
        <div className="overflow-auto border border-gray-150 rounded-lg shadow-3xs bg-white max-h-[480px] scrollbar-thin">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="bg-slate-50 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-2.5 px-4 text-center w-12 bg-slate-50">STT</th>
                <th className="py-2.5 px-4 w-52 bg-slate-50">Nhân sự tham gia</th>
                <th className="py-2.5 px-4 w-60 bg-slate-50">Thuộc Bộ phận / Chi nhánh</th>
                <th className="py-2.5 px-4 text-center w-28 bg-slate-50">Số lượt thi</th>
                <th className="py-2.5 px-2 text-center w-28 bg-slate-50 leading-tight">Điểm số<br />trung bình</th>
                <th className="py-2.5 px-2 text-center w-24 bg-slate-50 leading-tight">Thời gian<br />làm bài TB</th>
                <th className="py-2.5 px-4 text-center w-28 bg-slate-50">LEVEL</th>
                <th className="py-2.5 px-4 text-center w-32 bg-slate-50 leading-tight">Lần thi gần nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participantsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-gray-400 font-semibold bg-gray-50/30">
                    Chưa có nhân sự nào tham gia đạt điều kiện lọc trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (
                participantsList.map((stat, idx) => {
                  const avgMins = Math.floor(stat.totalDuration / stat.attempts / 60);
                  const avgSecs = Math.round((stat.totalDuration / stat.attempts) % 60);
                  const formattedDuration = avgMins > 0 ? `${avgMins}p ${avgSecs}s` : `${avgSecs}s`;
                  const statAvgScore = stat.avgScore !== undefined ? stat.avgScore : (stat.attempts > 0 ? parseFloat((stat.totalScore / stat.attempts).toFixed(1)) : 0);
                  const scoreColor = statAvgScore === 30 ? 'text-green-600 font-bold bg-green-50 border border-green-100' : 'text-blue-600 font-semibold bg-blue-50/75 border border-blue-100/50';
                  
                  return (
                    <tr key={stat.userId + idx} className="hover:bg-slate-50/50 text-xs transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-semibold text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-800 line-clamp-1">{stat.userName}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 space-y-0.5">
                          <div>MS: {stat.employeeId}</div>
                          <div className="text-gray-500 font-semibold">SĐT: {stat.phone}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] leading-relaxed">
                        <div className="font-bold text-gray-650">{stat.department}</div>
                        <div className="text-gray-455 font-medium">{stat.branch}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-extrabold text-[#1971C2] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/50">{stat.attempts} lượt</span>
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span className={`font-mono text-xs px-2 px-1 rounded-md whitespace-nowrap inline-block ${scoreColor}`}>
                          {statAvgScore} / 30
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-gray-700 whitespace-nowrap">{formattedDuration}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {stat.level === 3 ? (
                          <span className="font-sans font-black text-[10px] uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-150 shadow-3xs tracking-wider inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span>
                            Cấp 3
                          </span>
                        ) : stat.level === 2 ? (
                          <span className="font-sans font-black text-[10px] uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-150 shadow-3xs tracking-wider inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                            Cấp 2
                          </span>
                        ) : (
                          <span className="font-sans font-black text-[10px] uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-150 shadow-3xs tracking-wider inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            Cấp 1
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[10.5px] text-gray-455 animate-fade-in whitespace-nowrap">
                        <div className="font-bold text-gray-800 text-xs">
                          {new Date(stat.lastAttempt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </div>
                        <div className="text-[10px] text-gray-450 mt-0.5">
                          {new Date(stat.lastAttempt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Advanced Averages & Daily Trend Statistics */}
      <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left">
        <div className="border-b border-gray-150 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="font-sans font-bold text-sm text-[#1971C2] uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span>Thống Kê Điểm Trung Bình & Tiến Trình Thi Đua</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Đánh giá chi tiết điểm thi đua trung bình của từng đơn vị và cá nhân theo mốc thời gian lọc.</p>
          </div>

          {/* Stats Timeframe Selector */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {statsPeriod === 'week' && (
              <select
                value={selectedWeekVal}
                onChange={(e) => setSelectedWeekVal(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg py-1.5 px-3 bg-white cursor-pointer font-bold text-slate-800"
              >
                {weekOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            )}
            {statsPeriod === 'month' && (
              <select
                value={selectedMonthVal}
                onChange={(e) => setSelectedMonthVal(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg py-1.5 px-3 bg-white cursor-pointer font-bold text-slate-800"
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}

            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-250 shrink-0">
              {(['day', 'week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setStatsPeriod(period)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    statsPeriod === period ? 'bg-white text-gray-950 shadow-3xs border border-gray-200' : 'text-gray-500 hover:text-gray-950'
                  }`}
                >
                  {period === 'day' ? 'Hôm Nay' : period === 'week' ? 'Tuần Này' : period === 'month' ? 'Tháng Này' : 'Năm Nay'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3-Column Grid for Branch, Dept, Individual */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* TÂN PHÚ VIỆT NAM (Company Overall Stats) Panel */}
          <div className="border border-gray-150 rounded-xl bg-slate-50/20 p-4 space-y-4 flex flex-col min-h-[400px]">
            <div className="border-b border-gray-150 pb-2 flex justify-between items-center">
              <h5 className="text-xs font-bold text-[#0B3A60] uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-4 w-4 text-[#0B3A60]" />
                <span>TÂN PHÚ VIỆT NAM</span>
              </h5>
              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 animate-pulse">
                Toàn Công Ty
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-between space-y-4">
              {/* Highlight Dashboard Widget */}
              <div className="bg-white border border-[#0B3A60]/15 p-4 rounded-xl shadow-xs text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-12 h-12 bg-[#0B3A60]/5 rounded-bl-full flex items-center justify-center transition-transform group-hover:scale-110">
                  <TrendingUp className="h-4 w-4 text-[#0B3A60]/60" />
                </div>
                
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Điểm Trung Bình Toàn Công Ty</span>
                <span className="text-4xl font-extrabold text-[#0B3A60] font-mono tracking-tight block">
                  {companyAverage.avgScore} <span className="text-xs font-bold text-gray-400">đ/30đ</span>
                </span>
                
                {/* Score Progress Bar */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3 mb-2.5">
                  <div 
                    style={{ width: `${Math.min(100, (companyAverage.avgScore / 30) * 100)}%` }} 
                    className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-sky-500 rounded-full transition-all duration-300"
                  />
                </div>

                <div className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full border mt-1 shadow-3xs transition-colors ${
                  companyAverage.avgScore < 15 
                    ? 'bg-red-50 text-red-600 border-red-100' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${companyAverage.avgScore < 15 ? 'text-red-500' : 'text-emerald-500'}`} />
                  <span>Đánh giá: {getEvaluationString(companyAverage.avgScore)}</span>
                </div>
              </div>

              {/* Statistics Details List */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-150 p-3 rounded-lg text-center shadow-3xs">
                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Tổng lượt làm bài</div>
                  <div className="text-base font-black text-slate-800 font-mono">{companyAverage.attempts}</div>
                  <div className="text-[8px] text-gray-400 mt-0.5">lượt thi trắc nghiệm</div>
                </div>

                <div className="bg-white border border-gray-150 p-3 rounded-lg text-center shadow-3xs">
                  <div className="text-[9px] text-gray-450 font-bold uppercase tracking-wider mb-0.5">Nhân sự tham gia</div>
                  <div className="text-base font-black text-slate-800 font-mono">{companyAverage.numUsers}</div>
                  <div className="text-[8px] text-gray-400 mt-0.5">học viên đã làm</div>
                </div>
              </div>

              {/* Training Status Badge */}
              <div className="bg-[#0B3A60]/5 border border-[#0B3A60]/10 rounded-lg p-3 text-xs text-[#0B3A60] flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <p className="font-medium text-gray-650 leading-relaxed text-[11px]">
                  Chỉ số trung bình của toàn hệ thống dựa trên tất cả các lượt làm bài của mọi chi nhánh và phòng ban trực thuộc. 
                </p>
              </div>
            </div>
          </div>

          {/* A. Branch Averages Panel */}
          <div className="border border-gray-150 rounded-xl bg-slate-50/20 p-4 space-y-3.5 flex flex-col min-h-[400px]">
            <div className="border-b border-gray-150 pb-2 flex justify-between items-center bg-gradient-to-r from-slate-50 to-transparent p-1 rounded-md">
              <h5 className="text-xs font-bold text-[#0B3A60] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-500" />
                <span>Chi Nhánh / VPĐD</span>
              </h5>
              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                {branchAverages.length} đơn vị
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px]">
              {branchAverages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center text-xs text-gray-400 font-bold">
                  Không có dữ liệu trong khoảng thời gian này.
                </div>
              ) : (
                branchAverages.map((item, idx) => (
                  <div key={item.name + idx} className="bg-white border border-gray-150 p-3 rounded-lg shadow-3xs space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-xs text-gray-800 line-clamp-1">{item.name}</div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-xs font-black text-indigo-650">{item.avgScore}đ</span>
                        <div className="text-[9px] text-gray-400 font-medium">({item.attempts} lượt)</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, (item.avgScore / 30) * 100)}%` }} 
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>

                    {/* Evaluation Line replacing Daily Breakdown */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium mt-1 pt-0.5">
                      <span className="text-gray-450 flex items-center gap-1">
                        <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${item.avgScore < 15 ? 'text-red-400' : 'text-indigo-400'}`} />
                        Đánh giá:
                      </span>
                      <span className={`font-bold ${item.avgScore < 15 ? 'text-red-650' : 'text-indigo-600'}`}>{getEvaluationString(item.avgScore)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* B. Department Averages Panel */}
          <div className="border border-gray-150 rounded-xl bg-slate-50/20 p-4 space-y-3.5 flex flex-col min-h-[400px]">
            <div className="border-b border-gray-150 pb-2 flex justify-between items-center bg-gradient-to-r from-slate-50 to-transparent p-1 rounded-md">
              <h5 className="text-xs font-bold text-[#0B3A60] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-500" />
                <span>Bộ Phận / Đơn Vị</span>
              </h5>
              <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                {departmentAverages.length} bộ phận
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px]">
              {departmentAverages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-10 text-center text-xs text-gray-400 font-bold">
                  Không có dữ liệu trong khoảng thời gian này.
                </div>
              ) : (
                departmentAverages.map((item, idx) => (
                  <div key={item.name + idx} className="bg-white border border-gray-150 p-3 rounded-lg shadow-3xs space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-xs text-gray-800 line-clamp-2 break-words">{item.name}</div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-xs font-black text-emerald-650">{item.avgScore}đ</span>
                        <div className="text-[9px] text-gray-400 font-medium">({item.attempts} lượt)</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, (item.avgScore / 30) * 100)}%` }} 
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>

                    {/* Evaluation Line replacing Daily Breakdown */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium mt-1 pt-0.5">
                      <span className="text-gray-450 flex items-center gap-1">
                        <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${item.avgScore < 15 ? 'text-red-400' : 'text-emerald-400'}`} />
                        Đánh giá:
                      </span>
                      <span className={`font-bold ${item.avgScore < 15 ? 'text-red-650' : 'text-emerald-600'}`}>{getEvaluationString(item.avgScore)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 7. Detailed Weekly/Monthly Scorecard Matrix Spreadsheet */}
      <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left">
        <div className="border-b border-gray-150 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="font-sans font-bold text-sm text-[#0B3A60] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-500" />
              <span>Bảng Điểm Chi Tiết Theo Ngày Của Từng Bộ Phận / Đơn Vị</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Để phục vụ công tác giám sát chéo, bảng ma trận thống kê kết quả ôn luyện thực tế theo từng ngày của toàn bộ đội ngũ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {scorecardPeriod === 'week' && (
              <select
                value={selectedScorecardWeekVal}
                onChange={(e) => setSelectedScorecardWeekVal(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg py-1.5 px-3 bg-white cursor-pointer font-bold text-slate-800 shadow-3xs hover:border-sky-400 transition-colors"
              >
                {weekOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            )}
            {scorecardPeriod === 'month' && (
              <select
                value={selectedScorecardMonthVal}
                onChange={(e) => setSelectedScorecardMonthVal(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg py-1.5 px-3 bg-white cursor-pointer font-bold text-slate-800 shadow-3xs hover:border-sky-400 transition-colors"
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}

            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-250 shrink-0">
              {(['day', 'week', 'month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setScorecardPeriod(period)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    scorecardPeriod === period ? 'bg-white text-gray-950 shadow-3xs border border-gray-200' : 'text-gray-500 hover:text-gray-950'
                  }`}
                >
                  {period === 'day' ? 'Hôm Nay' : period === 'week' ? 'Tuần Này' : 'Tháng Này'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50/50 p-4 rounded-lg border border-slate-150 shadow-3xs">
          <div className="flex flex-col gap-1 col-span-12 sm:col-span-6 lg:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase ring-offset-0 tracking-wider">Tìm kiếm nhân sự</label>
            <input
              type="text"
              placeholder="Nhập tên, MSNV..."
              value={scorecardSearchQuery}
              onChange={(e) => setScorecardSearchQuery(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg p-2.5 bg-white outline-hidden focus:border-sky-400 focus:ring-1 focus:ring-sky-450 font-medium placeholder-gray-400 shadow-3xs"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-12 sm:col-span-6 lg:col-span-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lọc theo Chi nhánh</label>
            <select
              value={scorecardBranchFilter}
              onChange={(e) => {
                setScorecardBranchFilter(e.target.value);
                // Reset department filter if not applicable to the selected branch
                setScorecardDeptFilter('');
              }}
              className="text-xs border border-gray-200 rounded-lg p-2.5 bg-white cursor-pointer text-slate-800 font-semibold shadow-3xs hover:border-sky-400 transition-colors"
            >
              <option value="">Tất cả Chi nhánh</option>
              {activeBranchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {selectedBranchAvg !== null && (
              <div className="text-[10px] sm:text-[11px] mt-1 font-sans text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-md border border-sky-100 flex items-center justify-between shadow-3xs animation-fade-in animate-pulse-once">
                <span className="font-medium">Điểm TB Chi nhánh:</span>
                <span className="font-bold text-sky-800 font-mono">{selectedBranchAvg.avg} <span className="text-[9px] text-sky-600 font-normal">({selectedBranchAvg.count} lượt)</span></span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 col-span-12 sm:col-span-12 lg:col-span-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lọc theo Bộ phận / Đơn vị</label>
            <select
              value={scorecardDeptFilter}
              onChange={(e) => setScorecardDeptFilter(e.target.value)}
              disabled={!scorecardBranchFilter}
              className={`text-xs border border-gray-200 rounded-lg p-2.5 bg-white cursor-pointer transition-all shadow-3xs ${
                !scorecardBranchFilter ? 'opacity-65 cursor-not-allowed bg-gray-50 text-gray-400' : 'text-slate-800 font-semibold hover:border-sky-400'
              }`}
            >
              {scorecardBranchFilter ? (
                <>
                  <option value="">Tất cả Bộ phận / Đơn vị (đủ điều kiện)</option>
                  {availableDepartmentsForSelectedBranch.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </>
              ) : (
                <option value="">Vui lòng chọn Chi nhánh trước...</option>
              )}
            </select>
            {selectedDeptAvg !== null && (
              <div className="text-[10px] sm:text-[11px] mt-1 font-sans text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-100 flex items-center justify-between shadow-3xs animation-fade-in animate-pulse-once">
                <span className="font-medium">Điểm TB Bộ phận:</span>
                <span className="font-bold text-emerald-800 font-mono">{selectedDeptAvg.avg} <span className="text-[9px] text-emerald-600 font-normal">({selectedDeptAvg.count} lượt)</span></span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 justify-end col-span-12 sm:col-span-6 lg:col-span-1">
            <label className="text-[10px] font-bold text-transparent select-none uppercase hidden lg:block">Thao tác</label>
            <button
              onClick={() => {
                setScorecardBranchFilter('');
                setScorecardDeptFilter('');
                setScorecardSearchQuery('');
                setScorecardPeriod('month');
                setSelectedScorecardWeekVal(weekOptions[0]?.value || '');
                setSelectedScorecardMonthVal(monthOptions[0]?.value || '');
              }}
              title="Đặt lại bộ lọc về mặc định"
              className="px-3 py-2.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-3xs"
            >
              <RefreshCcw className="h-3.5 w-3.5 text-gray-500 shrink-0" />
              <span className="lg:hidden xl:inline">Đặt lại</span>
            </button>
          </div>
        </div>

        {/* Matrix display container */}
        {!(scorecardPeriod === 'day' || scorecardPeriod === 'week' || scorecardPeriod === 'month') ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-gray-305 bg-slate-50/50">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <div className="text-xs font-bold text-gray-400">Bảng Ma Trận Điểm Chỉ Khả Dụng Với Thống Kê Theo Ngày, Tuần, Hoặc Tháng</div>
          </div>
        ) : (
          <div className="overflow-auto border border-slate-300 rounded-lg shadow-3xs bg-white max-h-[500px] scrollbar-thin">
            <table className="w-full text-left border-collapse table-auto border border-slate-300 min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#59C3FF] text-slate-900 border-b border-slate-300">
                  <th className="py-2.5 px-3 text-center w-12 font-bold border border-slate-300 bg-[#59C3FF] text-xs">STT</th>
                  <th className="py-2.5 px-3 text-left w-36 font-bold border border-slate-300 bg-[#59C3FF] text-xs">Chi nhánh</th>
                  <th className="py-2.5 px-3 text-left w-48 font-bold border border-slate-300 bg-[#59C3FF] text-xs">Tên nhân sự</th>
                  <th className="py-2.5 px-3 text-center w-32 font-bold border border-slate-300 bg-[#59C3FF] text-xs">Mã nhân sự</th>
                  <th className="py-2.5 px-3 text-left w-52 font-bold border border-slate-300 bg-[#59C3FF] text-xs">Phòng ban</th>
                  
                  {/* Generation of the Date Column Headers */}
                  {scorecardDates.map(date => (
                    <th key={date.dateStr} className="py-2.5 px-1.5 text-center w-14 font-bold border border-slate-300 bg-[#59C3FF] text-xs whitespace-nowrap">
                      {date.dateStr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredScorecardPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={5 + scorecardDates.length} className="py-12 text-center text-xs font-bold text-gray-400 bg-slate-50/50 border border-slate-300">
                      Không tìm thấy nhân sự phù hợp điều kiện lọc trong giai đoạn này.
                    </td>
                  </tr>
                ) : (
                  filteredScorecardPersonnel.map((person, idx) => (
                    <tr key={person.id + idx} className="hover:bg-slate-50/50 text-xs transition-colors border-b border-slate-300">
                      <td className="py-2 px-3 text-center font-mono font-semibold text-gray-400 bg-slate-50/10 border border-slate-300">{idx + 1}</td>
                      <td className="py-2 px-3 text-gray-600 font-semibold text-center font-mono text-[11px] border border-slate-300 truncate max-w-[100px]">{getBranchCodeOnly(person.branch)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800 border border-slate-300 truncate max-w-[180px]">{person.name}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500 border border-slate-300">{person.employeeId}</td>
                      <td className="py-2 px-3 text-gray-600 border border-slate-300 truncate max-w-[200px]">{person.department}</td>
                      
                      {/* Generation of the Cells with Daily Scores */}
                      {scorecardDates.map(date => {
                        // Find match
                        const score = scorecardLookup[person.id]?.[date.dateStr] ?? scorecardLookup[person.name]?.[date.dateStr] ?? null;
                        const attempts = scorecardAttemptsLookup[person.id]?.[date.dateStr] ?? scorecardAttemptsLookup[person.name]?.[date.dateStr] ?? 0;
                        
                        let cellClass = "p-0 text-center font-mono text-xs border border-slate-300 relative";
                        if (score === 30) {
                          cellClass += " text-emerald-600 font-black bg-emerald-50/30";
                        } else if (score !== null && score >= 20) {
                          cellClass += " text-blue-600 font-bold bg-blue-50/20";
                        } else if (score !== null) {
                          cellClass += " text-gray-700 font-bold bg-slate-50/10";
                        } else {
                          cellClass += " text-slate-205";
                        }
 
                        return (
                          <td key={date.dateStr} className={cellClass}>
                            {score !== null ? (
                              <div className="relative w-full h-full min-h-[38px] flex items-center justify-center">
                                <span className="font-bold text-xs select-all text-center pr-2 pb-1.5">{score}</span>
                                {attempts > 0 && (
                                  <span 
                                    title={`${attempts} lượt làm bài`}
                                    className="absolute bottom-0 right-[-1px] text-[8px] font-sans font-bold leading-none bg-[#EBF5FF] text-[#0B3A60] px-0.5 py-0.5 rounded-tl-sm border-l border-t border-slate-300 shadow-4xs scale-85 select-none"
                                  >
                                    {attempts}L
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="min-h-[38px]" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
