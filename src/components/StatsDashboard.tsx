import React, { useState, useEffect, useMemo } from 'react';
import { User, QuizResult, BRANCHES, DEPARTMENTS, CompanyMapping, LevelRulesConfig } from '../types';
import { getQuotaStats, databaseService } from '../firebase';
import { 
  Database, Users, Trophy, Award, BarChart3, Clock, 
  Activity, ShieldAlert, Sparkles, RefreshCcw, TrendingUp, 
  Building2, Calendar, ShieldCheck, Zap, Home, Trash2,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { calculateInactivityAugmentedLevel, getVietnamDateString } from '../utils/levelCalculator';

const DEFAULT_LEVEL_RULES: LevelRulesConfig = {
  introduction: "Để khuyến khích thái độ kiên trì luyện tập, tạo phản xạ nhạy bén và nâng cao chuyên môn, hệ thống Quiz 3T Mastery áp dụng cơ chế phân hạng và thay đổi cấp độ tự động.",
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

const formatPromoDate = (ts?: number): string => {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const standardizeDateToDDMMYYYY = (dateStr?: string, timestamp?: number): string => {
  if (!dateStr && timestamp) {
    return formatPromoDate(timestamp);
  }
  if (!dateStr) return '';
  
  // If format is like DD/MM/YY (e.g. 13/06/26 or 13-06-26)
  const regexShortYear = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2})$/;
  const matchShort = dateStr.trim().match(regexShortYear);
  if (matchShort) {
    const day = matchShort[1].padStart(2, '0');
    const month = matchShort[2].padStart(2, '0');
    const year = '20' + matchShort[3]; // Assume 20xx
    return `${day}/${month}/${year}`;
  }

  // If format is like D/M/YYYY or DD/MM/YYYY (e.g. 1/6/2026 or 11/06/2026)
  const regexLongYear = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/;
  const matchLong = dateStr.trim().match(regexLongYear);
  if (matchLong) {
    const day = matchLong[1].padStart(2, '0');
    const month = matchLong[2].padStart(2, '0');
    const year = matchLong[3];
    return `${day}/${month}/${year}`;
  }

  // If it's YYYY-MM-DD
  const regexIso = /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/;
  const matchIso = dateStr.trim().match(regexIso);
  if (matchIso) {
    const year = matchIso[1];
    const month = matchIso[2].padStart(2, '0');
    const day = matchIso[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  if (timestamp) {
    return formatPromoDate(timestamp);
  }

  return dateStr;
};

const getDaysHeld = (dateStr?: string, timestamp?: number): number => {
  if (!dateStr && !timestamp) return 0;
  let targetMs = timestamp || 0;
  const stdDate = standardizeDateToDDMMYYYY(dateStr, timestamp);
  if (stdDate) {
    const parts = stdDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) {
        year += 2000;
      }
      const d = new Date(year, month, day, 0, 0, 0, 0);
      if (!isNaN(d.getTime())) {
        targetMs = d.getTime();
      }
    }
  }
  if (!targetMs) return 1;

  const estDate = new Date(targetMs);
  estDate.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffMs = now.getTime() - estDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays + 1);
};

interface StatsDashboardProps {
  users: User[];
  results: QuizResult[];
  onRefresh: () => Promise<void>;
  onBackToHome?: () => void;
  companyMappings?: CompanyMapping[];
  isAdmin?: boolean;
  isApprover?: boolean;
  allUsers?: User[];
  allResults?: QuizResult[];
}

export default function StatsDashboard({ 
  users: rawUsers, 
  results: rawResults, 
  onRefresh, 
  onBackToHome, 
  companyMappings, 
  isAdmin = false,
  isApprover = false,
  allUsers,
  allResults
}: StatsDashboardProps) {
  const [quota, setQuota] = useState(getQuotaStats());
  const [rankingPeriod, setRankingPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [monumentPeriod, setMonumentPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listPeriod, setListPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [monumentSearch, setMonumentSearch] = useState('');
  const [expandedLegend, setExpandedLegend] = useState<string | null>(null);
  const [selectedCoronation, setSelectedCoronation] = useState<Record<string, number>>({});
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [recordSearch, setRecordSearch] = useState('');
  const [mappings, setMappings] = useState<CompanyMapping[]>(companyMappings || []);
  const [showRule3T, setShowRule3T] = useState(false);

  // Filter users based on companyMappings exclusion
  const users = useMemo(() => {
    const excludedBranches = new Set<string>();
    const excludedDepartments = new Set<string>(); // key format: "branch_name|dept_name"
    
    mappings.forEach(co => {
      co.branches.forEach(br => {
        const brNameNorm = br.name.trim().normalize('NFC').toLowerCase();
        if (br.excludeFromStats) {
          excludedBranches.add(brNameNorm);
        }
        br.departments.forEach(d => {
          const dNameNorm = d.name.trim().normalize('NFC').toLowerCase();
          if (d.excludeFromStats) {
            excludedDepartments.add(`${brNameNorm}|${dNameNorm}`);
          }
        });
      });
    });

    return rawUsers.filter(u => {
      const uStatus = (u.status || '').toUpperCase();
      if (uStatus !== 'APPROVED' && uStatus !== 'APPROVED_MEMBER') return false;

      const bNameNorm = (u.branch || '').trim().normalize('NFC').toLowerCase();
      if (excludedBranches.has(bNameNorm)) return false;

      const dNameNorm = (u.department || '').trim().normalize('NFC').toLowerCase();
      if (excludedDepartments.has(`${bNameNorm}|${dNameNorm}`)) return false;

      return true;
    });
  }, [rawUsers, mappings]);

  // Filter results based on companyMappings exclusion
  const results = useMemo(() => {
    // 1. Create maps for O(1) user lookup
    const userByIdMap = new Map<string, User>();
    const userByNameMap = new Map<string, User>();
    
    rawUsers.forEach(u => {
      if (u.id) {
        userByIdMap.set(u.id, u);
      }
      if (u.name) {
        const uNorm = u.name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
        if (uNorm) {
          userByNameMap.set(uNorm, u);
        }
      }
    });

    // 2. Pre-normalize mappings check for fast lookup
    const excludedBranches = new Set<string>();
    const excludedDepartments = new Set<string>(); // key format: "branch_name|dept_name"
    
    mappings.forEach(co => {
      co.branches.forEach(br => {
        const brNameNorm = br.name.trim().normalize('NFC').toLowerCase();
        if (br.excludeFromStats) {
          excludedBranches.add(brNameNorm);
        }
        br.departments.forEach(d => {
          const dNameNorm = d.name.trim().normalize('NFC').toLowerCase();
          if (d.excludeFromStats) {
            excludedDepartments.add(`${brNameNorm}|${dNameNorm}`);
          }
        });
      });
    });

    return rawResults.filter(r => {
      let foundUser: User | undefined;
      if (r.userId) {
        foundUser = userByIdMap.get(r.userId);
      } else if (r.userName) {
        const normName = r.userName.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
        foundUser = userByNameMap.get(normName);
      }

      if (!foundUser) return false;

      const uStatus = (foundUser.status || '').toUpperCase();
      if (uStatus !== 'APPROVED' && uStatus !== 'APPROVED_MEMBER') return false;

      const bNameNorm = (r.branch || '').trim().normalize('NFC').toLowerCase();
      if (excludedBranches.has(bNameNorm)) return false;

      const dNameNorm = (r.department || '').trim().normalize('NFC').toLowerCase();
      if (excludedDepartments.has(`${bNameNorm}|${dNameNorm}`)) return false;

      return true;
    });
  }, [rawResults, rawUsers, mappings]);

  // System-wide results for Monument Legends to sync across devices/roles
  const globalResultsForMonument = useMemo(() => {
    const srcResults = allResults || rawResults;
    const srcUsers = allUsers || rawUsers;

    // 1. Create maps for O(1) user lookup
    const userByIdMap = new Map<string, User>();
    const userByNameMap = new Map<string, User>();
    
    srcUsers.forEach(u => {
      if (u.id) {
        userByIdMap.set(u.id, u);
      }
      if (u.name) {
        const uNorm = u.name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
        if (uNorm) {
          userByNameMap.set(uNorm, u);
        }
      }
    });

    // 2. Pre-normalize mappings check for fast lookup
    const excludedBranches = new Set<string>();
    const excludedDepartments = new Set<string>(); // key format: "branch_name|dept_name"
    
    mappings.forEach(co => {
      co.branches.forEach(br => {
        const brNameNorm = br.name.trim().normalize('NFC').toLowerCase();
        if (br.excludeFromStats) {
          excludedBranches.add(brNameNorm);
        }
        br.departments.forEach(d => {
          const dNameNorm = d.name.trim().normalize('NFC').toLowerCase();
          if (d.excludeFromStats) {
            excludedDepartments.add(`${brNameNorm}|${dNameNorm}`);
          }
        });
      });
    });

    return srcResults.filter(r => {
      let foundUser: User | undefined;
      if (r.userId) {
        foundUser = userByIdMap.get(r.userId);
      } else if (r.userName) {
        const normName = r.userName.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
        foundUser = userByNameMap.get(normName);
      }

      if (!foundUser) return false;

      const uStatus = (foundUser.status || '').toUpperCase();
      if (uStatus !== 'APPROVED' && uStatus !== 'APPROVED_MEMBER') return false;

      const bNameNorm = (r.branch || '').trim().normalize('NFC').toLowerCase();
      if (excludedBranches.has(bNameNorm)) return false;

      const dNameNorm = (r.department || '').trim().normalize('NFC').toLowerCase();
      if (excludedDepartments.has(`${bNameNorm}|${dNameNorm}`)) return false;

      return true;
    });
  }, [allResults, rawResults, allUsers, rawUsers, mappings]);

  const [scorecardBranchFilter, setScorecardBranchFilter] = useState('');
  const [scorecardDeptFilter, setScorecardDeptFilter] = useState('');
  const [scorecardSearchQuery, setScorecardSearchQuery] = useState('');
  const [onlineBranchFilter, setOnlineBranchFilter] = useState<string>('ALL');
  const [expandedDeptOnline, setExpandedDeptOnline] = useState<string | null>(null);
  const [levelRules, setLevelRules] = useState<LevelRulesConfig | null>(null);

  useEffect(() => {
    databaseService.getLevelRules().then(rules => {
      if (rules) {
        setLevelRules(rules);
      }
    }).catch(err => {
      console.error("Lỗi khi tải quy chế trong StatsDashboard :", err);
    });
  }, []);
  
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
      lastActive: number;
    }> = {};

    const normalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};

    rawResults.forEach(res => {
      const normName = normalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
    });

    filtered.forEach(res => {
      const normName = normalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';

      if (personKey === 'anonymous') return;

      if (!grouped[personKey]) {
        const matchedUser = users.find(u => u.id === resolvedUserId || normalizeName(u.name) === resolvedNormalizedName);
        grouped[personKey] = {
          userId: resolvedUserId,
          userName: matchedUser?.name || resolvedNormalizedName || 'Thành viên ẩn danh',
          phone: matchedUser?.phone || 'Lưu trữ cũ',
          employeeId: matchedUser?.employeeId || 'Không rõ',
          department: matchedUser?.department || res.department || 'Hội sở',
          branch: matchedUser?.branch || res.branch || 'Hội sở',
          attempts: 0,
          bestScore: 0,
          totalScore: 0,
          totalDuration: 0,
          lastAttempt: 0,
          lastActive: matchedUser?.lastActive || 0
        };
      }
      
      const p = grouped[personKey];
      p.attempts += 1;
      p.totalDuration += res.duration || 0;
      p.totalScore += res.score || 0;
      if (res.score > p.bestScore) {
        p.bestScore = res.score;
      }
      if (res.timestamp > p.lastAttempt) {
        p.lastAttempt = res.timestamp;
      }
      if (res.department) p.department = res.department;
      if (res.branch) p.branch = res.branch;
    });

    const activeRules = levelRules || DEFAULT_LEVEL_RULES;

    const parseRequiredConsecutive = (lvlIdx: number, defaultVal: number = 10): number => {
      const promotionText = activeRules.levels[lvlIdx]?.promotion;
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
      const demotionText = activeRules.levels[lvlIdx]?.demotion;
      if (!demotionText) return defaultVal;
      const match = demotionText.match(/dưới\s+(\d+)\s+điểm/i) || 
                    demotionText.match(/dưới\s+(\d+)/i) || 
                    demotionText.match(/<\s*(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      return defaultVal;
    };

    return Object.entries(grouped)
      .map(([personKey, p]) => {
        // Compute level based on all historical results for this participant from rawResults
        const userResults = rawResults.filter(r => {
          const rNormName = normalizeName(r.userName);
          const rResolvedUserId = r.userId || nameToUserIdMap[rNormName] || '';
          const rResolvedNormalizedName = rNormName || (r.userId ? userIdToNameMap[r.userId] : '') || '';
          const rKey = rResolvedUserId || rResolvedNormalizedName;
          return rKey && rKey === personKey;
        });
        const chronologicalResults = [...userResults].sort((a, b) => a.timestamp - b.timestamp);
        
        const inactivityTestMode = localStorage.getItem('3t_inactivity_test_mode') === 'true';
        const calc = calculateInactivityAugmentedLevel(
          personKey,
          chronologicalResults,
          activeRules,
          {
            isTestModeEnabled: inactivityTestMode,
            simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
          }
        );

        return {
          ...p,
          level: calc.level,
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
    let timeLimit: number;
    if (rankingPeriod === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);
      timeLimit = oneWeekAgo.getTime();
    } else if (rankingPeriod === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      oneMonthAgo.setHours(0, 0, 0, 0);
      timeLimit = oneMonthAgo.getTime();
    } else {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      timeLimit = startOfToday.getTime();
    }

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

    const counts: { 
      [personKey: string]: { 
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

    // Offline Top 5 patience baseline from specified table
    const baseline = [
      {
        name: 'TRẦN VĂN TIÊN',
        dept: 'Phòng Tài chính Kế toán',
        branch: 'Văn Phòng Công Ty (TPP-CTY)',
        attempts: 183,
        maxScore: 30,
        totalScore: Math.round(183 * 26.3),
        totalDuration: 183 * 15
      },
      {
        name: 'TRAN PHUOC TRUNG',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        attempts: 82,
        maxScore: 30,
        totalScore: Math.round(82 * 26.7),
        totalDuration: 82 * 12
      },
      {
        name: 'NGUYEN DUC THANG',
        dept: 'Ban Giám đốc',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        attempts: 62,
        maxScore: 30,
        totalScore: Math.round(62 * 28.2),
        totalDuration: 62 * 10
      },
      {
        name: 'TRẦN CÔNG HANH',
        dept: 'Phân xưởng 2',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        attempts: 25,
        maxScore: 30,
        totalScore: Math.round(25 * 29.0),
        totalDuration: 25 * 14
      },
      {
        name: 'NGUYỄN ĐỨC TOÀN',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        attempts: 25,
        maxScore: 30,
        totalScore: Math.round(25 * 26.4),
        totalDuration: 25 * 15
      }
    ];

    // Baseline is historical offline data, so it should only apply to the longest time-range ('month') filter to keep 'day' (Today) and 'week' (This week) rankings completely accurate to live attempts.
    if (rankingPeriod === 'month') {
      baseline.forEach(b => {
        const pKey = normalizeName(b.name);
        counts[pKey] = {
          name: b.name,
          dept: b.dept,
          branch: b.branch,
          attempts: b.attempts,
          maxScore: b.maxScore,
          totalScore: b.totalScore,
          avgDuration: 0,
          totalDuration: b.totalDuration
        };
      });
    }

    results.forEach(res => {
      // Validate that the result falls into our timeframe
      if (res.timestamp >= timeLimit) {
        const normName = normalizeName(res.userName);
        const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
        const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
        const personKey = resolvedNormalizedName || resolvedUserId || 'anonymous';

        if (personKey === 'anonymous') return;

        const isLNT = resolvedUserId === 'admin_lenhattruong' || resolvedNormalizedName === 'LÊ NHẬT TRƯỜNG';
        const matchedUser = users.find(u => u.id === resolvedUserId || normalizeName(u.name) === resolvedNormalizedName);
        if (!counts[personKey]) {
          counts[personKey] = {
            name: matchedUser?.name || resolvedNormalizedName || 'THÀNH VIÊN ẨN DANH',
            dept: isLNT ? 'Phòng Quản Lý Chất Lượng' : (matchedUser?.department || res.department || 'Hội sở'),
            branch: matchedUser?.branch || res.branch || 'Hội sở',
            attempts: 0,
            maxScore: 0,
            totalScore: 0,
            avgDuration: 0,
            totalDuration: 0
          };
        }
        counts[personKey].attempts += 1;
        counts[personKey].totalDuration += res.duration || 0;
        counts[personKey].totalScore += res.score || 0;
        if (res.score > counts[personKey].maxScore) {
          counts[personKey].maxScore = res.score;
        }
        // Keep department and branch updated
        if (matchedUser?.department) {
          counts[personKey].dept = isLNT ? 'Phòng Quản Lý Chất Lượng' : matchedUser.department;
        } else if (res.department) {
          counts[personKey].dept = isLNT ? 'Phòng Quản Lý Chất Lượng' : res.department;
        }
        if (matchedUser?.branch) {
          counts[personKey].branch = matchedUser.branch;
        } else if (res.branch) {
          counts[personKey].branch = res.branch;
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

  // ==========================================
  // TƯỢNG ĐÀI HUYỀN THOẠI calculations
  // ==========================================
  const legendMonumentData = useMemo(() => {
    const normalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};

    globalResultsForMonument.forEach(res => {
      const normName = normalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
    });

    const grouped: Record<string, QuizResult[]> = {};
    globalResultsForMonument.forEach(res => {
      const normName = normalizeName(res.userName);
      const resolvedUserId = res.userId || nameToUserIdMap[normName] || '';
      const resolvedNormalizedName = normName || (res.userId ? userIdToNameMap[res.userId] : '') || '';
      const personKey = resolvedUserId || resolvedNormalizedName || 'anonymous';
      
      if (personKey === 'anonymous') return;
      if (!grouped[personKey]) {
        grouped[personKey] = [];
      }
      grouped[personKey].push(res);
    });

    const activeRules = levelRules || DEFAULT_LEVEL_RULES;

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

    const baselineLegends: Array<{
      userId: string;
      userName: string;
      dept: string;
      branch: string;
      avgScoreAtFirstLegend: number;
      overallAvgDurationPerAttempt: number;
      overallAvgDurationPerQuestion: number;
      level5Attempts: Array<{ timestamp: number; dateStr: string }>;
      totalAttempts: number;
      totalScore: number;
      totalDuration: number;
      totalQuestions: number;
      promoTimestamp: number;
      daysMaintaining: number;
      coronations: Array<{
        coronationIdx: number;
        promoTimestamp: number;
        fromLevel: number;
        avgScoreAtCoronation: number;
        totalAttemptsAtCoronation: number;
        overallAvgDurationPerAttempt: number;
        overallAvgDurationPerQuestion: number;
        dateStr: string;
        transitions: Array<{
          fromLevel: number;
          toLevel: number;
          timestamp: number;
          attemptsCount: number;
          dateStr: string;
        }>;
      }>;
    }> = [];

    const legendsList: Array<{
      userId: string;
      userName: string;
      dept: string;
      branch: string;
      avgScoreAtFirstLegend: number;
      overallAvgDurationPerAttempt: number;
      overallAvgDurationPerQuestion: number;
      level5Attempts: Array<{
        timestamp: number;
        dateStr: string;
      }>;
      coronations: Array<{
        coronationIdx: number;
        promoTimestamp: number;
        fromLevel: number;
        avgScoreAtCoronation: number;
        totalAttemptsAtCoronation: number;
        overallAvgDurationPerAttempt: number;
        overallAvgDurationPerQuestion: number;
        dateStr: string;
        transitions: Array<{
          fromLevel: number;
          toLevel: number;
          timestamp: number;
          attemptsCount: number;
          dateStr: string;
        }>;
      }>;
      totalAttempts: number;
      totalScore: number;
      totalDuration: number;
      totalQuestions: number;
      promoTimestamp?: number;
      daysMaintaining?: number;
      currentLevel?: number;
    }> = [...baselineLegends];

    Object.entries(grouped).forEach(([personKey, userResultsList]) => {
      const chronological = [...userResultsList].sort((a, b) => a.timestamp - b.timestamp);
      
      let currentLevel = 1;
      let consecutiveMaxAtLevel = 0;
      let consecutiveLowAtLevel = 0;
      let firstLegendIdx = -1;
      const scoresUpToFirstLegend: number[] = [];

      const level5Attempts: Array<{ timestamp: number; dateStr: string }> = [];
      const allTransitions: Array<{
        fromLevel: number;
        toLevel: number;
        timestamp: number;
        attemptsCount: number;
        dateStr: string;
      }> = [];
      let lastLevelChangeIdx = -1;

      const coronations: Array<{
        coronationIdx: number;
        promoTimestamp: number;
        fromLevel: number;
        avgScoreAtCoronation: number;
        totalAttemptsAtCoronation: number;
        overallAvgDurationPerAttempt: number;
        overallAvgDurationPerQuestion: number;
        dateStr: string;
        transitions: Array<{
          fromLevel: number;
          toLevel: number;
          timestamp: number;
          attemptsCount: number;
          dateStr: string;
        }>;
      }> = [];

      chronological.forEach((res, idx) => {
        const score = res.score;
        if (firstLegendIdx === -1) {
          scoresUpToFirstLegend.push(score);
        }

        const previousLevel = currentLevel;

        // Apply Level Rules
        if (currentLevel === 1) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(0, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 2; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 2) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(1, 20);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(1, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 3; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 1; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 3) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(2, 26);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(2, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 4; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 2; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 4) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(3, 27);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          const reqConsecutive = parseRequiredConsecutive(3, 10);
          if (consecutiveMaxAtLevel >= reqConsecutive) {
            currentLevel = 5; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          } else if (consecutiveLowAtLevel >= 2) {
            currentLevel = 3; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        } else if (currentLevel === 5) {
          if (score === 30) consecutiveMaxAtLevel++; else consecutiveMaxAtLevel = 0;
          const demotionMin = parseDemotionThreshold(4, 28);
          if (score < demotionMin) consecutiveLowAtLevel++; else consecutiveLowAtLevel = 0;
          if (consecutiveLowAtLevel >= 2) {
            currentLevel = 4; consecutiveMaxAtLevel = 0; consecutiveLowAtLevel = 0;
          }
        }

        if (currentLevel === 5) {
          if (firstLegendIdx === -1) {
            firstLegendIdx = idx;
          }
          const d = new Date(res.timestamp);
          const dateStr = d.toISOString().split('T')[0];
          level5Attempts.push({ timestamp: res.timestamp, dateStr });
        }

        // Record any level transition
        if (previousLevel !== currentLevel) {
          const attemptsCount = idx - lastLevelChangeIdx;
          allTransitions.push({
            fromLevel: previousLevel,
            toLevel: currentLevel,
            timestamp: res.timestamp,
            attemptsCount,
            dateStr: formatPromoDate(res.timestamp)
          });
          lastLevelChangeIdx = idx;
        }

        // Detect coronations (transition from any level < 5 up to 5)
        if (previousLevel < 5 && currentLevel === 5) {
          const coronationIdx = idx;
          const promoTimestamp = res.timestamp;
          const fromLevel = previousLevel;

          const coronationAttempts = chronological.slice(0, coronationIdx + 1);
          const totalAtCoronation = coronationAttempts.length;
          const totalDur = coronationAttempts.reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalSc = coronationAttempts.reduce((sum, r) => sum + r.score, 0);
          const totalQs = coronationAttempts.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);

          const avgScore = totalAtCoronation > 0
            ? parseFloat((totalSc / totalAtCoronation).toFixed(1))
            : 0;

          const durationPerAttempt = totalAtCoronation > 0
            ? parseFloat((totalDur / totalAtCoronation).toFixed(1))
            : 0;

          const durationPerQuestion = totalQs > 0
            ? parseFloat((totalDur / totalQs).toFixed(1))
            : 0;

          const d = new Date(promoTimestamp);
          const dateStr = d.toISOString().split('T')[0];

          // Compute transitions leading into this coronation
          const prevCoronationCount = coronations.reduce((sum, c) => sum + c.transitions.length, 0);
          const currentCoronationTransitions = allTransitions.slice(prevCoronationCount);

          coronations.push({
            coronationIdx,
            promoTimestamp,
            fromLevel,
            avgScoreAtCoronation: avgScore,
            totalAttemptsAtCoronation: totalAtCoronation,
            overallAvgDurationPerAttempt: durationPerAttempt,
            overallAvgDurationPerQuestion: durationPerQuestion,
            dateStr,
            transitions: currentCoronationTransitions
          });
        }
      });

      if (firstLegendIdx !== -1) {
        const lastResult = chronological[chronological.length - 1];
        const lastPromoTimestamp = lastResult.timestamp;

        // Fallback coronation if somehow coronations list is empty
        if (coronations.length === 0) {
          const coronationAttempts = chronological.slice(0, firstLegendIdx + 1);
          const totalAtCoronation = coronationAttempts.length;
          const totalDur = coronationAttempts.reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalSc = coronationAttempts.reduce((sum, r) => sum + r.score, 0);
          const totalQs = coronationAttempts.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);

          const avgScore = totalAtCoronation > 0
            ? parseFloat((totalSc / totalAtCoronation).toFixed(1))
            : 0;

          const durationPerAttempt = totalAtCoronation > 0
            ? parseFloat((totalDur / totalAtCoronation).toFixed(1))
            : 0;

          const durationPerQuestion = totalQs > 0
            ? parseFloat((totalDur / totalQs).toFixed(1))
            : 0;

          const d = new Date(chronological[firstLegendIdx].timestamp);
          const dateStr = d.toISOString().split('T')[0];

          let fallbackTransitions = [...allTransitions];
          if (fallbackTransitions.length === 0) {
            const countPerLevel = Math.max(1, Math.floor(totalAtCoronation / 4));
            fallbackTransitions = [
              { fromLevel: 1, toLevel: 2, timestamp: lastPromoTimestamp - 3 * 86400000, attemptsCount: countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp - 3 * 86400000) },
              { fromLevel: 2, toLevel: 3, timestamp: lastPromoTimestamp - 2 * 86400000, attemptsCount: countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp - 2 * 86400000) },
              { fromLevel: 3, toLevel: 4, timestamp: lastPromoTimestamp - 1 * 86400000, attemptsCount: countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp - 1 * 86400000) },
              { fromLevel: 4, toLevel: 5, timestamp: lastPromoTimestamp, attemptsCount: totalAtCoronation - 3 * countPerLevel, dateStr: formatPromoDate(lastPromoTimestamp) }
            ];
          }

          coronations.push({
            coronationIdx: firstLegendIdx,
            promoTimestamp: chronological[firstLegendIdx].timestamp,
            fromLevel: 4,
            avgScoreAtCoronation: avgScore,
            totalAttemptsAtCoronation: totalAtCoronation,
            overallAvgDurationPerAttempt: durationPerAttempt,
            overallAvgDurationPerQuestion: durationPerQuestion,
            dateStr,
            transitions: fallbackTransitions
          });
        }

        const isLNT = lastResult.userId === 'admin_lenhattruong' || normalizeName(lastResult.userName) === 'LÊ NHẬT TRƯỜNG';
        
        const totalAttempts = chronological.length;
        const totalDuration = chronological.reduce((sum, r) => sum + (r.duration || 0), 0);
        const totalScore = chronological.reduce((sum, r) => sum + r.score, 0);
        const totalQuestions = chronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);

        const avgScoreAtFirstLegend = scoresUpToFirstLegend.length > 0 
          ? parseFloat((scoresUpToFirstLegend.reduce((sum, s) => sum + s, 0) / scoresUpToFirstLegend.length).toFixed(1)) 
          : 0;

        const overallAvgDurationPerAttempt = totalAttempts > 0 
          ? parseFloat((totalDuration / totalAttempts).toFixed(1)) 
          : 0;

        const overallAvgDurationPerQuestion = totalQuestions > 0 
          ? parseFloat((totalDuration / totalQuestions).toFixed(1)) 
          : 0;

        const uniqueDaysMaintaining = Array.from(new Set(level5Attempts.map(att => att.dateStr))).length;

        const inactivityTestMode = localStorage.getItem('3t_inactivity_test_mode') === 'true';
        const calcRes = calculateInactivityAugmentedLevel(
          personKey,
          chronological,
          activeRules,
          {
            isTestModeEnabled: inactivityTestMode,
            simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
          }
        );
        const finalComputedLevel = calcRes.level;

        const rName = lastResult.userName || 'THÀNH VIÊN ẨN DANH';
        const normName = normalizeName(rName);

        const existingIdx = legendsList.findIndex(l => normalizeName(l.userName) === normName);

        const newItem = {
          userId: lastResult.userId || lastResult.userName,
          userName: rName,
          dept: isLNT ? 'Phòng Quản Lý Chất Lượng' : (lastResult.department || 'Hội sở'),
          branch: lastResult.branch || 'Hội sở',
          avgScoreAtFirstLegend: coronations[coronations.length - 1].avgScoreAtCoronation,
          overallAvgDurationPerAttempt: coronations[coronations.length - 1].overallAvgDurationPerAttempt,
          overallAvgDurationPerQuestion: coronations[coronations.length - 1].overallAvgDurationPerQuestion,
          level5Attempts,
          coronations,
          totalAttempts,
          totalScore,
          totalDuration,
          totalQuestions,
          promoTimestamp: coronations[coronations.length - 1].promoTimestamp,
          daysMaintaining: uniqueDaysMaintaining,
          currentLevel: finalComputedLevel
        };

        if (existingIdx !== -1) {
          const existing = legendsList[existingIdx];
          legendsList[existingIdx] = {
            ...newItem,
            currentLevel: newItem.currentLevel,
            promoTimestamp: newItem.promoTimestamp || existing.promoTimestamp,
            daysMaintaining: Math.max(newItem.daysMaintaining || 1, existing.daysMaintaining || 1),
            coronations: newItem.coronations.length > 0 ? newItem.coronations : existing.coronations
          };
        } else {
          legendsList.push(newItem);
        }
      }
    });

    // Ensure manually promoted level 5 users from rawUsers are included
    const targetPromoUsers = allUsers || rawUsers;
    if (Array.isArray(targetPromoUsers)) {
      targetPromoUsers.forEach(u => {
        const uStatus = (u.status || '').toUpperCase();
        if (uStatus !== 'APPROVED' && uStatus !== 'APPROVED_MEMBER') return;
        if (u.role === 'admin' || u.role === 'executive') return;

        const uLvl = (u as any).level || (u as any).currentLevel || 1;
        if (uLvl === 5) {
          const normName = normalizeName(u.name || (u as any).userName);
          const exists = legendsList.some(l => normalizeName(l.userName) === normName || l.userId === u.id);
          if (!exists) {
            const userResultsList = grouped[u.id] || grouped[normName] || [];
            const totalAttempts = userResultsList.length;
            const totalScore = userResultsList.reduce((sum, r) => sum + r.score, 0);
            const totalDuration = userResultsList.reduce((sum, r) => sum + (r.duration || 0), 0);
            const totalQuestions = userResultsList.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
            
            const avgScore = totalAttempts > 0 ? parseFloat((totalScore / totalAttempts).toFixed(1)) : 30;
            const durationPerAttempt = totalAttempts > 0 ? parseFloat((totalDuration / totalAttempts).toFixed(1)) : 10;
            const durationPerQuestion = totalQuestions > 0 ? parseFloat((totalDuration / totalQuestions).toFixed(1)) : 3;

            const promoTs = u.createdAt ? new Date(u.createdAt).getTime() : Date.now();
            const d = new Date(promoTs);
            const dateStr = d.toISOString().split('T')[0];

            legendsList.push({
              userId: u.id || normName,
              userName: u.name || (u as any).userName || normName,
              dept: u.department || 'Hội sở',
              branch: u.branch || 'Hội sở',
              avgScoreAtFirstLegend: avgScore,
              overallAvgDurationPerAttempt: durationPerAttempt,
              overallAvgDurationPerQuestion: durationPerQuestion,
              level5Attempts: userResultsList.map(r => ({ timestamp: r.timestamp, dateStr: r.date || new Date(r.timestamp).toISOString().split('T')[0] })),
              coronations: [{
                coronationIdx: 0,
                promoTimestamp: promoTs,
                fromLevel: 4,
                avgScoreAtCoronation: avgScore,
                totalAttemptsAtCoronation: totalAttempts || 1,
                overallAvgDurationPerAttempt: durationPerAttempt,
                overallAvgDurationPerQuestion: durationPerQuestion,
                dateStr,
                transitions: []
              }],
              totalAttempts,
              totalScore,
              totalDuration,
              totalQuestions,
              promoTimestamp: promoTs,
              daysMaintaining: 1,
              currentLevel: 5,
              level: 5,
              maxLevelReached: 5,
              attempts: totalAttempts,
              avgScore,
              avgTimeSpent: Math.round(durationPerQuestion),
              bestScore: userResultsList.length > 0 ? Math.max(...userResultsList.map(r => r.score), 30) : 30
            } as any);
          }
        }
      });
    }

    // Ensure EVERY legend has their currentLevel evaluated correctly using calculateInactivityAugmentedLevel
    legendsList.forEach(l => {
      const normName = normalizeName(l.userName);
      const userResultsList = grouped[l.userId] || grouped[normName] || [];
      const inactivityTestMode = localStorage.getItem('3t_inactivity_test_mode') === 'true';
      const calcRes = calculateInactivityAugmentedLevel(
        l.userId,
        userResultsList,
        activeRules,
        {
          isTestModeEnabled: inactivityTestMode,
          simulatedToday: inactivityTestMode ? '2026-06-14' : getVietnamDateString()
        }
      );
      // If the user's computed level is less than 5, but they are Level 5 in their user profile (manually promoted), preserve Level 5!
      const userProfile = (allUsers || rawUsers)?.find(u => u.id === l.userId || normalizeName(u.name || (u as any).userName) === normName);
      const profileLvl = (userProfile as any)?.level || (userProfile as any)?.currentLevel || 1;
      
      l.currentLevel = profileLvl === 5 ? 5 : calcRes.level;
    });

    return legendsList;
  }, [globalResultsForMonument, levelRules, allUsers, rawUsers]);

  // Compute stats for current active periods of legend monument
  const legendMonumentToday = useMemo(() => {
    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return legendMonumentData.filter(l => 
      l.level5Attempts.some(att => att.timestamp >= startOfTodayMs)
    ).map(l => {
      const activeAttempts = l.level5Attempts.filter(att => att.timestamp >= startOfTodayMs);
      const uniqueDays = Array.from(new Set(activeAttempts.map(att => att.dateStr))).length;
      return { ...l, daysMaintaining: uniqueDays };
    }).sort((a, b) => b.totalAttempts - a.totalAttempts || b.userName.localeCompare(a.userName));
  }, [legendMonumentData]);

  const legendMonumentWeek = useMemo(() => {
    const now = new Date();
    const startOfWeekMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    
    return legendMonumentData.filter(l => 
      l.level5Attempts.some(att => att.timestamp >= startOfWeekMs)
    ).map(l => {
      const activeAttempts = l.level5Attempts.filter(att => att.timestamp >= startOfWeekMs);
      const uniqueDays = Array.from(new Set(activeAttempts.map(att => att.dateStr))).length;
      return { ...l, daysMaintaining: uniqueDays };
    }).sort((a, b) => b.daysMaintaining - a.daysMaintaining || b.totalAttempts - a.totalAttempts);
  }, [legendMonumentData]);

  const legendMonumentMonth = useMemo(() => {
    const now = new Date();
    const startOfMonthMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    
    return legendMonumentData.filter(l => 
      l.level5Attempts.some(att => att.timestamp >= startOfMonthMs)
    ).map(l => {
      const activeAttempts = l.level5Attempts.filter(att => att.timestamp >= startOfMonthMs);
      const uniqueDays = Array.from(new Set(activeAttempts.map(att => att.dateStr))).length;
      return { ...l, daysMaintaining: uniqueDays };
    }).sort((a, b) => b.daysMaintaining - a.daysMaintaining || b.totalAttempts - a.totalAttempts);
  }, [legendMonumentData]);

  // Combined selector helper for active records and display list
  const activeMonumentLegends = useMemo(() => {
    if (monumentPeriod === 'day') return legendMonumentToday;
    if (monumentPeriod === 'week') return legendMonumentWeek;
    return legendMonumentMonth;
  }, [monumentPeriod, legendMonumentToday, legendMonumentWeek, legendMonumentMonth]);

  // Search and filter list of all legends
  const filteredMonumentLegends = useMemo(() => {
    let sortedLegends = [...legendMonumentData];
    // Sort by daysMaintaining descending, then promoTimestamp ascending
    sortedLegends.sort((a, b) => {
      const aDays = a.daysMaintaining || 0;
      const bDays = b.daysMaintaining || 0;
      if (bDays !== aDays) {
        return bDays - aDays;
      }
      const aTime = a.promoTimestamp || Infinity;
      const bTime = b.promoTimestamp || Infinity;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.totalAttempts - b.totalAttempts;
    });
    
    const q = monumentSearch.toLowerCase().trim();
    if (!q) return sortedLegends;
    return sortedLegends.filter(l => 
      l.userName.toLowerCase().includes(q) || 
      (l.dept && l.dept.toLowerCase().includes(q)) || 
      (l.branch && l.branch.toLowerCase().includes(q))
    );
  }, [legendMonumentData, monumentSearch]);

  // Compute Records
  const monumentRecords = useMemo(() => {
    if (activeMonumentLegends.length === 0) return { persistence: null, highestScore: null, fastest: null };

    // 1. Duy trì phong độ bền bỉ nhất (max daysMaintaining, if tied, max total attempts)
    const persistence = [...activeMonumentLegends].sort((a, b) => 
      b.daysMaintaining - a.daysMaintaining || b.totalAttempts - a.totalAttempts
    )[0];

    // 2. Điểm trung bình khi đạt mốc Huyền thoại đầu tiên cao nhất
    const highestScore = [...activeMonumentLegends].sort((a, b) => 
      b.avgScoreAtFirstLegend - a.avgScoreAtFirstLegend || b.totalScore - a.totalScore
    )[0];

    // 3. Thời gian trả lời nhanh nhất (lowest overallAvgDurationPerQuestion)
    const fastest = [...activeMonumentLegends]
      .filter(l => l.overallAvgDurationPerQuestion > 0)
      .sort((a, b) => a.overallAvgDurationPerQuestion - b.overallAvgDurationPerQuestion)[0];

    return { persistence, highestScore, fastest };
  }, [activeMonumentLegends]);

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
        employeeId: 'Lưu trữ / Khách',
        department: r.department || 'Chưa xếp bộ phận / Khách',
        branch: r.branch || 'Hội sở'
      });
    }
  });

  const scorecardPersonnel = useMemo(() => {
    return scorecardPersonnelRaw.sort((a, b) => {
      const deptComp = a.department.localeCompare(b.department);
      if (deptComp !== 0) return deptComp;
      return a.name.localeCompare(b.name);
    });
  }, [scorecardPersonnelRaw]);

  const filteredScorecardPersonnel = useMemo(() => {
    return scorecardPersonnel.filter(p => {
      if (scorecardBranchFilter && p.branch !== scorecardBranchFilter) return false;
      if (scorecardDeptFilter && p.department !== scorecardDeptFilter) return false;
      if (scorecardSearchQuery) {
        const query = scorecardSearchQuery.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.employeeId.toLowerCase().includes(query) ||
          p.department.toLowerCase().includes(query) ||
          p.branch.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [scorecardPersonnel, scorecardBranchFilter, scorecardDeptFilter, scorecardSearchQuery]);

  const records3T = useMemo(() => {
    const lNormalizeName = (name: string | undefined | null): string => {
      if (!name) return '';
      return name.trim().toUpperCase().replace(/\s+/g, ' ');
    };

    const nameToUserIdMap: Record<string, string> = {};
    const userIdToNameMap: Record<string, string> = {};

    results.forEach(res => {
      const normName = lNormalizeName(res.userName);
      if (res.userId && normName) {
        nameToUserIdMap[normName] = res.userId;
        userIdToNameMap[res.userId] = normName;
      }
    });

    // Historic groups (all-time)
    const historicGroups: Record<string, QuizResult[]> = {};
    results.forEach(res => {
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

    const historicGroupsSorted = Object.entries(historicGroups).map(([personKey, userResultsList]) => {
      const chronological = [...userResultsList].sort((a, b) => a.timestamp - b.timestamp);
      const latestRes = chronological[chronological.length - 1] || userResultsList[0];
      const isLNT = personKey === 'admin_lenhattruong' || lNormalizeName(latestRes.userName) === 'LÊ NHẬT TRƯỜNG';
      const userProfile = {
        name: latestRes.userName || 'THÀNH VIÊN ẨN DANH',
        dept: isLNT ? 'Phòng Quản Lý Chất Lượng' : (latestRes.department || 'Hội sở'),
        branch: latestRes.branch || 'Hội sở',
        date: latestRes.date || ''
      };
      return { personKey, userProfile, chronological };
    });


    const activeRules = levelRules || DEFAULT_LEVEL_RULES;

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

    // Record holders baseline standards (Yardstick)
    const showBaseline = true;

    const BASELINE_RECORDS = {
      quyettam: showBaseline ? {
        name: 'TRAN PHUOC TRUNG',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        date: '12/06/2026',
        attemptsCount: 381,
        proofText: 'Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: 381 lượt.'
      } : null,
      tritue: showBaseline ? {
        name: 'TRẦN VĂN TIÊN',
        dept: 'Phòng Tài chính Kế toán',
        branch: 'Văn Phòng Công Ty (TPP-CTY)',
        date: '11/06/2026',
        perfectsCount: 185,
        proofText: 'Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: 185 lượt.'
      } : null,
      tocdo: showBaseline ? {
        name: 'QUÁCH THUÝ VÂN',
        dept: 'Ban Quản đốc',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '12/06/2026',
        durationPerQ: 3.8,
        proofText: 'Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ 3.8 giây/câu.'
      } : null,
      thantoc: showBaseline ? {
        name: 'PHAN THỊ NHÀN',
        dept: 'Phòng Kế hoạch sản xuất',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '09/06/2026',
        maxLevelReached: 5,
        attemptsCountToMaxLevel: 48,
        proofText: 'Đạt Cấp 5 - Huyền Thoại chỉ sau 48 lượt ôn luyện!'
      } : null,
      batbai: showBaseline ? {
        name: 'HA HUU QUYNH',
        dept: 'Phòng Kỹ Thuật',
        branch: 'Chi Nhánh Bắc Ninh (TPP-BNI)',
        date: '09/06/2026',
        streak: 45,
        proofText: 'Thiết lập chuỗi 45 lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.'
      } : null,
      binhminh: showBaseline ? {
        name: 'PHẠM VĂN ĐEN',
        dept: 'Phân xưởng 2',
        branch: 'Chi Nhánh Long An (TPP-LAN)',
        date: '14/06/26',
        timeString: '01:24',
        proofText: 'Chủ động ôn luyện từ sáng tinh sương lúc 01:24 ngày 14/06/2026.'
      } : null
    };

    let bestQuyetTamUser: any = BASELINE_RECORDS.quyettam ? { ...BASELINE_RECORDS.quyettam, holders: [BASELINE_RECORDS.quyettam] } : null;
    let maxAttempts = BASELINE_RECORDS.quyettam ? BASELINE_RECORDS.quyettam.attemptsCount : 0;

    let bestTriTueUser: any = BASELINE_RECORDS.tritue ? { ...BASELINE_RECORDS.tritue, holders: [BASELINE_RECORDS.tritue] } : null;
    let maxPerfects = BASELINE_RECORDS.tritue ? BASELINE_RECORDS.tritue.perfectsCount : 0;

    let bestTocDoUser: any = BASELINE_RECORDS.tocdo ? { ...BASELINE_RECORDS.tocdo, holders: [BASELINE_RECORDS.tocdo] } : null;
    let minSpeedPerQ = BASELINE_RECORDS.tocdo ? BASELINE_RECORDS.tocdo.durationPerQ : 999.0;

    let bestThanTocUser: any = BASELINE_RECORDS.thantoc ? { ...BASELINE_RECORDS.thantoc, holders: [BASELINE_RECORDS.thantoc] } : null;
    let minThanTocDuration = BASELINE_RECORDS.thantoc ? BASELINE_RECORDS.thantoc.attemptsCountToMaxLevel : 999;

    let bestBatBaiUser: any = BASELINE_RECORDS.batbai ? { ...BASELINE_RECORDS.batbai, holders: [BASELINE_RECORDS.batbai] } : null;
    let maxBatBaiStreak = BASELINE_RECORDS.batbai ? BASELINE_RECORDS.batbai.streak : 0;

    let bestBinhMinhUser: any = BASELINE_RECORDS.binhminh ? { ...BASELINE_RECORDS.binhminh, holders: [BASELINE_RECORDS.binhminh] } : null;
    let minSunriseMins = BASELINE_RECORDS.binhminh ? (parseInt(BASELINE_RECORDS.binhminh.timeString.split(':')[0]) * 60 + parseInt(BASELINE_RECORDS.binhminh.timeString.split(':')[1])) : 600; // 10:00 -> 10 * 60 = 600 minutes

    // 4. Kỷ lục Thăng Cấp Thần Tốc (Calculated on historic groups)
    const thanTocCandidates: Array<{
      userProfile: {
        name: string;
        dept: string;
        branch: string;
        date: string;
      };
      maxLevelReached: number;
      attemptsCountToMaxLevel: number;
      maxLevelReachedTimestamp?: number;
    }> = [];

    historicGroupsSorted.forEach(({ userProfile, chronological }) => {
      let currentLevel = 1;
      let consecMax = 0;
      let consecLow = 0;
      let maxLevelReached = 1;
      let attemptsCountToMaxLevel = chronological.length > 0 ? 1 : 0;
      let maxLevelReachedDate = '';
      let maxLevelReachedTimestamp = 0;

      for (let i = 0; i < chronological.length; i++) {
        const res = chronological[i];
        const score = res.score;
        if (currentLevel === 1) {
          if (score === 30) consecMax++; else consecMax = 0;
          const req = parseRequiredConsecutive(0, 10);
          if (consecMax >= req) { currentLevel = 2; consecMax = 0; consecLow = 0; }
        } else if (currentLevel === 2) {
          if (score === 30) consecMax++; else consecMax = 0;
          const demotionMin = parseDemotionThreshold(1, 20);
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
          maxLevelReachedTimestamp = res.timestamp;
        }
      }

      if (chronological.length > 0) {
        thanTocCandidates.push({
          userProfile: {
            ...userProfile,
            date: maxLevelReachedDate || userProfile.date
          },
          maxLevelReached,
          attemptsCountToMaxLevel,
          maxLevelReachedTimestamp
        });
      }
    });

    const thanTocEligible = thanTocCandidates.filter(c => c.maxLevelReached === 5);

    if (thanTocEligible.length > 0) {
      thanTocEligible.sort((a, b) => a.attemptsCountToMaxLevel - b.attemptsCountToMaxLevel);

      const minVal = thanTocEligible[0].attemptsCountToMaxLevel;
      if (minVal < minThanTocDuration) {
        minThanTocDuration = minVal;
        const bestCandidates = thanTocEligible.filter(c => c.attemptsCountToMaxLevel === minVal);
        const newHolders = bestCandidates.map(best => ({
          ...best.userProfile,
          maxLevelReached: 5,
          attemptsCountToMaxLevel: best.attemptsCountToMaxLevel,
          proofText: `Đạt Cấp 5 - Huyền Thoại chỉ sau ${best.attemptsCountToMaxLevel} lượt ôn luyện!`
        }));
        bestThanTocUser = { ...newHolders[0], holders: newHolders };
      } else if (minVal === minThanTocDuration) {
        const bestCandidates = thanTocEligible.filter(c => c.attemptsCountToMaxLevel === minVal);
        bestCandidates.forEach(best => {
          const normName = lNormalizeName(best.userProfile.name);
          const exists = bestThanTocUser.holders?.some((h: any) => lNormalizeName(h.name) === normName);
          if (!exists) {
            bestThanTocUser.holders.push({
              ...best.userProfile,
              maxLevelReached: 5,
              attemptsCountToMaxLevel: best.attemptsCountToMaxLevel,
              proofText: `Đạt Cấp 5 - Huyền Thoại chỉ sau ${best.attemptsCountToMaxLevel} lượt ôn luyện!`
            });
          }
        });
      }
    }

    // All-time specific calculations
    const isBaselineHolder = (nameStr: string): boolean => {
      const norm = nameStr.trim().normalize('NFC').toUpperCase().replace(/\s+/g, ' ');
      return [
        'TRAN PHUOC TRUNG',
        'TRẦN VĂN TIÊN',
        'QUÁCH THUÝ VÂN',
        'PHAN THỊ NHÀN',
        'HA HUU QUYNH',
        'PHẠM VĂN ĐEN'
      ].includes(norm);
    };

    historicGroupsSorted.forEach(({ userProfile, chronological }) => {
      // 1. Quyết Tâm
      const attemptsCount = chronological.length;
      if (attemptsCount > maxAttempts) {
        maxAttempts = attemptsCount;
        const newH = {
          ...userProfile,
          attemptsCount,
          proofText: `Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: ${attemptsCount} lượt.`
        };
        bestQuyetTamUser = { ...newH, holders: [newH] };
      } else if (attemptsCount === maxAttempts) {
        const normName = lNormalizeName(userProfile.name);
        const exists = bestQuyetTamUser.holders?.some((h: any) => lNormalizeName(h.name) === normName);
        if (!exists) {
          const onlyBaseline = bestQuyetTamUser.holders?.every((h: any) => isBaselineHolder(h.name));
          const newH = {
            ...userProfile,
            attemptsCount,
            proofText: `Chinh phục số lượt ôn luyện bền bỉ cao nhất hệ thống: ${attemptsCount} lượt.`
          };
          if (onlyBaseline) {
            bestQuyetTamUser = { ...newH, holders: [newH] };
          } else {
            bestQuyetTamUser.holders.push(newH);
          }
        }
      }

      // 2. Trí Tuệ
      const perfects = chronological.filter(r => r.score === 30);
      const perfectsCount = perfects.length;
      if (perfectsCount > maxPerfects) {
        maxPerfects = perfectsCount;
        const latestPerfect = perfects[perfects.length - 1] || chronological[chronological.length - 1];
        const newH = {
          ...userProfile,
          date: latestPerfect.date || userProfile.date,
          perfectsCount,
          proofText: `Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: ${perfectsCount} lượt.`
        };
        bestTriTueUser = { ...newH, holders: [newH] };
      } else if (perfectsCount === maxPerfects && perfectsCount > 0) {
        const latestPerfect = perfects[perfects.length - 1] || chronological[chronological.length - 1];
        const normName = lNormalizeName(userProfile.name);
        const exists = bestTriTueUser.holders?.some((h: any) => lNormalizeName(h.name) === normName);
        if (!exists) {
          const onlyBaseline = bestTriTueUser.holders?.every((h: any) => isBaselineHolder(h.name));
          const newH = {
            ...userProfile,
            date: latestPerfect.date || userProfile.date,
            perfectsCount,
            proofText: `Chinh phục điểm số tuyệt đối 30/30 cao nhất hệ thống: ${perfectsCount} lượt.`
          };
          if (onlyBaseline) {
            bestTriTueUser = { ...newH, holders: [newH] };
          } else {
            bestTriTueUser.holders.push(newH);
          }
        }
      }

      // 3. Kỷ lục Tốc Độ
      const totalQ = chronological.reduce((sum, r) => sum + (r.totalQuestions || 3), 0);
      const totalD = chronological.reduce((sum, r) => sum + (r.duration || 0), 0);
      if (totalQ > 0) {
        const avgSpeed = totalD / totalQ;
        const finalSpeed = parseFloat(avgSpeed.toFixed(1));
        if (avgSpeed < minSpeedPerQ && totalQ >= 6) {
          minSpeedPerQ = avgSpeed;
          const newH = {
            ...userProfile,
            durationPerQ: finalSpeed,
            proofText: `Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ ${finalSpeed} giây/câu.`
          };
          bestTocDoUser = { ...newH, holders: [newH] };
        } else if (avgSpeed > 0 && finalSpeed === parseFloat(minSpeedPerQ.toFixed(1)) && totalQ >= 6) {
          const normName = lNormalizeName(userProfile.name);
          const exists = bestTocDoUser.holders?.some((h: any) => lNormalizeName(h.name) === normName);
          if (!exists) {
            const onlyBaseline = bestTocDoUser.holders?.every((h: any) => isBaselineHolder(h.name));
            const newH = {
              ...userProfile,
              durationPerQ: finalSpeed,
              proofText: `Phản xạ phán đoán siêu hạng với thời gian trả lời trung bình chỉ ${finalSpeed} giây/câu.`
            };
            if (onlyBaseline) {
              bestTocDoUser = { ...newH, holders: [newH] };
            } else {
              bestTocDoUser.holders.push(newH);
            }
          }
        }
      }

      // 5. Kỷ lục Bất Bại
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
        const newH = {
          ...userProfile,
          date: streakDate || userProfile.date,
          streak: userMaxStreak,
          proofText: `Thiết lập chuỗi ${userMaxStreak} lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.`
        };
        bestBatBaiUser = { ...newH, holders: [newH] };
      } else if (userMaxStreak === maxBatBaiStreak && userMaxStreak > 0) {
        const normName = lNormalizeName(userProfile.name);
        const exists = bestBatBaiUser.holders?.some((h: any) => lNormalizeName(h.name) === normName);
        if (!exists) {
          const onlyBaseline = bestBatBaiUser.holders?.every((h: any) => isBaselineHolder(h.name));
          const newH = {
            ...userProfile,
            date: streakDate || userProfile.date,
            streak: userMaxStreak,
            proofText: `Thiết lập chuỗi ${userMaxStreak} lượt liên tục đạt điểm số tối đa 30/30 và không hề nếm mùi thất bại.`
          };
          if (onlyBaseline) {
            bestBatBaiUser = { ...newH, holders: [newH] };
          } else {
            bestBatBaiUser.holders.push(newH);
          }
        }
      }

      // 6. Kỷ lục Bình Minh (Early Morning Quiz 00:00 - 10:00)
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
              const newH = {
                ...userProfile,
                date: customDate,
                timeString,
                proofText: `Chủ động ôn luyện từ sáng tinh sương lúc ${timeString} ngày ${proofDateStr}.`
              };
              bestBinhMinhUser = { ...newH, holders: [newH] };
            } else if (totalMins === minSunriseMins) {
              const normName = lNormalizeName(userProfile.name);
              const exists = bestBinhMinhUser.holders?.some((h: any) => lNormalizeName(h.name) === normName);
              if (!exists) {
                const onlyBaseline = bestBinhMinhUser.holders?.every((h: any) => isBaselineHolder(h.name));
                const newH = {
                  ...userProfile,
                  date: customDate,
                  timeString,
                  proofText: `Chủ động ôn luyện từ sáng tinh sương lúc ${timeString} ngày ${proofDateStr}.`
                };
                if (onlyBaseline) {
                  bestBinhMinhUser = { ...newH, holders: [newH] };
                } else {
                  bestBinhMinhUser.holders.push(newH);
                }
              }
            }
          }
        }
      });
    });

    const getTimestampFromDDMMYYYY = (dateStr?: string): number => {
      if (!dateStr) return 0;
      const parts = dateStr.trim().split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day, 0, 0, 0, 0).getTime();
      }
      return 0;
    };

    const finalRecords = {
      quyettam: bestQuyetTamUser,
      tritue: bestTriTueUser,
      tocdo: bestTocDoUser,
      thantoc: bestThanTocUser,
      batbai: bestBatBaiUser,
      binhminh: bestBinhMinhUser
    };

    return finalRecords;
  }, [results, levelRules]);

  const recordCategories = useMemo(() => {
    const list = [
      {
        key: 'quyettam',
        title: 'Kỷ lục Kiên Trì',
        desc: 'Người làm nhiều lượt nhất',
        calcMethod: 'Tổng số lượt ôn luyện và tự đánh giá (nộp bài thành công) tích lũy toàn thời gian từ trước đến nay của cá nhân.',
        data: records3T.quyettam,
        getMetric: (d: any) => d ? `${d.attemptsCount} lượt` : 'Chưa ghi nhận',
        icon: <Clock className="h-3.5 w-3.5 text-gray-500" />
      },
      {
        key: 'tritue',
        title: 'Kỷ lục Trí Tuệ',
        desc: 'Người có nhiều lượt 30/30 nhất',
        calcMethod: 'Tổng số lượt làm bài đạt điểm tuyệt đối 30/30 tích lũy toàn thời gian (khác biệt với danh sách luyện tập hôm nay chỉ thống kê riêng trong ngày).',
        data: records3T.tritue,
        getMetric: (d: any) => d ? `${d.perfectsCount} lượt` : 'Chưa ghi nhận',
        icon: <Trophy className="h-3.5 w-3.5 text-gray-500" />
      },
      {
        key: 'tocdo',
        title: 'Kỷ lục Tốc Độ',
        desc: 'Thời gian trả lời trung bình/câu thấp nhất',
        calcMethod: 'Thời gian phản xạ và trả lời trung bình mỗi câu hỏi cực ngắn, được ghi nhận trên một lượt đạt điểm tối đa 30/30.',
        data: records3T.tocdo,
        getMetric: (d: any) => d ? `${d.durationPerQ}s/câu` : 'Chưa ghi nhận',
        icon: <Zap className="h-3.5 w-3.5 text-gray-500" />
      },
      {
        key: 'thantoc',
        title: 'Kỷ lục Thăng Cấp Thần Tốc',
        desc: 'Số lượt đánh giá, ôn tập thấp nhất mà đạt được cấp độ cao nhất',
        calcMethod: 'Tổng số lượt làm bài ít nhất được dùng để rèn luyện thăng tiến thành công từ vị trí Cấp 1 lên Cấp 5 (Huyền thoại).',
        data: records3T.thantoc,
        getMetric: (d: any) => d ? `${d.attemptsCountToMaxLevel} lượt` : 'Chưa ghi nhận',
        icon: <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
      },
      {
        key: 'batbai',
        title: 'Kỷ lục Bất Bại',
        desc: 'Người có chuỗi thắng (streak) 30/30 dài nhất',
        calcMethod: 'Số lượt đạt điểm tuyệt đối 30/30 liên tiếp dài nhất của một cá nhân mà không bị ngắt quãng bởi bất kỳ lượt điểm nào thấp hơn.',
        data: records3T.batbai,
        getMetric: (d: any) => d ? `${d.streak} chuỗi` : 'Chưa ghi nhận',
        icon: <ShieldCheck className="h-3.5 w-3.5 text-gray-500" />
      },
      {
        key: 'binhminh',
        title: 'Kỷ lục Trước Bình Minh',
        desc: 'Người làm Quiz 3T sớm nhất buổi sáng',
        calcMethod: 'Khung giờ nộp bài đạt điểm tối đa 30/30 sớm nhất trong ngày, được hệ thống rà soát tự động trong khoảng từ 00:00 đến 10:00 sáng.',
        data: records3T.binhminh,
        getMetric: (d: any) => d ? d.timeString : 'Chưa ghi nhận',
        icon: <Calendar className="h-3.5 w-3.5 text-gray-500" />
      }
    ];

    if (!recordSearch.trim()) return list;
    const query = recordSearch.trim().toLowerCase();
    return list.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(query);
      if (!item.data) return matchTitle;
      
      const holders = item.data.holders && item.data.holders.length > 0 ? item.data.holders : [item.data];
      const matchName = holders.some((h: any) => h.name.toLowerCase().includes(query));
      const matchDept = holders.some((h: any) => h.dept.toLowerCase().includes(query));
      return matchTitle || matchName || matchDept;
    });
  }, [records3T, recordSearch]);

  return (
    <div className="space-y-6">
      {/* Upper header action inside viewport */}
      {!isApprover && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest"><span translate="no" className="notranslate">Hệ Thống Thống Kê & Giám Sát Real-Time</span></h3>
            <p className="text-xs text-gray-405 mt-0.5"><span translate="no" className="notranslate">Giúp ban quản trị theo dõi tài nguyên dữ liệu Firebase và năng lực sảnh học tập của nhân sự.</span></p>
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
      )}

      {/* 🏆 TỔ HỢP VINH DANH & KỶ LỤC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-6 space-y-4 text-left flex flex-col justify-start">
          <div className="space-y-4 flex-1 flex flex-col justify-start">
            <div className="border-b border-gray-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <h4 className="font-sans font-extrabold text-base text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <span>🏆 TƯỢNG ĐÀI HUYỀN THOẠI ({filteredMonumentLegends.length})</span>
                </h4>
                <p className="text-xs text-gray-405">Bảng vinh danh những nhân tài rèn luyện xuất chúng đạt cấp bậc Huyền Thoại.</p>
              </div>

              {/* Ô TÌM KIẾM CHÂN PHƯƠNG */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm kiếm Tên..."
                  value={monumentSearch}
                  onChange={(e) => setMonumentSearch(e.target.value)}
                  className="w-28 focus:w-44 sm:w-32 focus:sm:w-48 pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 font-sans transition-all duration-300"
                />
              </div>
            </div>

            {/* List of active players on Monument */}
            <div className="overflow-y-auto space-y-1 pr-1 max-h-[550px] min-h-[180px] flex-1 mt-2">
              {filteredMonumentLegends.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-2 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex-1">
                  <span className="text-xs text-gray-400 font-bold font-sans">Không tìm thấy Huyền Thoại nào phù hợp.</span>
                </div>
              ) : (
                <div className="space-y-1 px-0.5 font-sans">
                  {/* Header của bảng */}
                  <div className="hidden md:grid grid-cols-12 gap-1 sm:gap-2 pb-2 mb-1 border-b border-gray-200 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider font-sans px-2 sticky top-0 bg-white z-10">
                    <div className="col-span-4">HỌ VÀ TÊN</div>
                    <div className="col-span-3 text-center">Thăng Cấp</div>
                    <div className="col-span-2 text-center">Vị Thế</div>
                    <div className="col-span-3 text-right font-sans">Chỉ số</div>
                  </div>

                  {filteredMonumentLegends.map((userStats, idx) => {
                    const isExpanded = expandedLegend === userStats.userId;
                    const coronations = userStats.coronations || [];
                    const activeCoronationIdx = selectedCoronation[userStats.userId] !== undefined
                      ? selectedCoronation[userStats.userId]
                      : coronations.length - 1; // Default to latest coronation
                    
                    const activeCoro = coronations[activeCoronationIdx] || coronations[coronations.length - 1] || coronations[0] || {
                      fromLevel: 4,
                      avgScoreAtCoronation: userStats.avgScoreAtFirstLegend,
                      totalAttemptsAtCoronation: userStats.totalAttempts,
                      overallAvgDurationPerAttempt: userStats.overallAvgDurationPerAttempt,
                      overallAvgDurationPerQuestion: userStats.overallAvgDurationPerQuestion,
                      promoTimestamp: userStats.promoTimestamp,
                      dateStr: formatPromoDate(userStats.promoTimestamp)
                    };

                    const userLevel = userStats.currentLevel !== undefined ? userStats.currentLevel : 5;
                    const isDemoted = userLevel < 5;

                    return (
                      <div key={userStats.userId + idx} className="border-b border-gray-100 last:border-none py-1">
                        {/* Desktop grid layout */}
                        <div 
                          onClick={() => setExpandedLegend(isExpanded ? null : userStats.userId)}
                          className="hidden md:grid grid-cols-12 gap-1 sm:gap-2 items-center py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-all cursor-pointer select-none"
                        >
                          {/* Cột Tên kèm STT và bong bóng số thăng hạng */}
                          <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                            <span className="text-amber-500 font-mono text-[11px] font-bold shrink-0 font-sans">
                              {idx + 1}.
                            </span>
                            <div className="relative inline-flex items-center min-w-0 pr-4 shrink-0">
                              <span className="font-extrabold text-[11px] sm:text-xs uppercase text-gray-800 tracking-wide font-sans truncate" title={userStats.userName}>
                                {userStats.userName}
                              </span>
                              {/* Bong bóng số đếm thăng hạng nằm ở góc trái bên trên sát cuối tên */}
                              <span 
                                className={`absolute -top-1.5 right-0 translate-x-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full ${
                                  isDemoted 
                                    ? "bg-gradient-to-tr from-gray-600 via-gray-500 to-slate-400" 
                                    : "bg-gradient-to-tr from-emerald-600 via-emerald-500 to-green-400"
                                } text-white font-sans text-[9px] font-extrabold border border-white shadow-sm shrink-0`}
                                title={isDemoted ? `Đã bị hạ cấp xuống Cấp ${userLevel} (Đã từng thăng hạng Cấp 5: ${coronations.length} lần)` : `Đã đạt cấp 5: ${coronations.length} lần`}
                              >
                                {coronations.length || 1}
                              </span>
                            </div>
                          </div>
                          
                          {/* Cột Ngày Thăng Cấp */}
                          <div className="col-span-3 text-center text-[10px] sm:text-xs font-bold text-gray-650 font-mono">
                            {formatPromoDate(userStats.promoTimestamp)}
                          </div>
                          
                          {/* Cột Vị Thế */}
                          <div className="col-span-2 text-center">
                            {isDemoted ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60 whitespace-nowrap" title="Hạ cấp: Vị thế tạm dừng tính cho đến khi thăng cấp 5 trở lại">
                                {userStats.daysMaintaining} ngày ⏸️
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100/50 whitespace-nowrap">
                                {userStats.daysMaintaining} ngày
                              </span>
                            )}
                          </div>
                          
                          {/* Cột Các Chỉ Số Luyện Tập */}
                          <div className="col-span-3 text-right">
                            <div className="bg-[#FAF9F6] hover:bg-[#F3F2EE] border border-amber-200/50 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono text-amber-950 font-bold inline-block transition-colors shrink-0 whitespace-nowrap">
                              <span>{userStats.avgScoreAtFirstLegend}</span>
                              <span className="mx-0.5 text-amber-200">|</span>
                              <span>{userStats.totalAttempts}L</span>
                              <span className="mx-0.5 text-amber-200">|</span>
                              <span>{Math.round(userStats.overallAvgDurationPerQuestion)}s</span>
                            </div>
                          </div>
                        </div>

                        {/* Mobile block/card layout */}
                        <div 
                          onClick={() => setExpandedLegend(isExpanded ? null : userStats.userId)}
                          className="flex flex-col md:hidden py-2.5 px-3 hover:bg-gray-55/80 border border-gray-100 rounded-xl mb-1.5 bg-white shadow-3xs cursor-pointer select-none transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-amber-500 font-mono text-[11px] font-bold shrink-0">#{idx + 1}</span>
                              <span className="font-extrabold text-xs uppercase text-gray-950 font-sans truncate" title={userStats.userName}>
                                {userStats.userName}
                              </span>
                              {/* Coronation Counter Badge */}
                              <span 
                                className={`inline-flex items-center justify-center px-1.5 py-0.5 h-4 rounded-full ${
                                  isDemoted 
                                    ? "bg-slate-100 text-slate-500" 
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-100/80"
                                } font-sans text-[8.5px] font-black shrink-0`}
                                title={isDemoted ? `Đã từng thăng cấp 5: ${coronations.length} lần` : `Lượt thăng cấp 5: ${coronations.length} lần`}
                              >
                                👑 {coronations.length || 1}
                              </span>
                            </div>
                            
                            {/* Maintaining Status days */}
                            <div className="shrink-0">
                              {isDemoted ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-50 text-slate-450 border border-slate-150 whitespace-nowrap">
                                  {userStats.daysMaintaining}n ⏸️
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200/55 whitespace-nowrap">
                                  {userStats.daysMaintaining} ngày
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-gray-100/70 text-[10px] text-gray-500 font-sans">
                            <div className="flex items-center gap-1">
                              <span>Thăng cấp:</span>
                              <span className="text-gray-800 font-bold font-mono">{formatPromoDate(userStats.promoTimestamp)}</span>
                            </div>

                            {/* Exercises stat badge */}
                            <div className="shrink-0 bg-[#FAF9F6] border border-amber-200/40 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-amber-950 font-bold whitespace-nowrap">
                              <span>{userStats.avgScoreAtFirstLegend}đ</span>
                              <span className="mx-1 text-amber-200">|</span>
                              <span>{userStats.totalAttempts}L</span>
                              <span className="mx-1 text-amber-200">|</span>
                              <span>{Math.round(userStats.overallAvgDurationPerQuestion)}s/c</span>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible section xổ ra như một hộp thông tin cụ thể (chân phương) */}
                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="my-1.5 mx-1 p-3 bg-white border border-gray-255 rounded-xl text-[11px] text-gray-700 space-y-2.5 shadow-3xs overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 font-sans">
                              {/* Bộ phận & Chi nhánh */}
                              <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-left flex-wrap">
                                <span className="text-gray-400 font-bold shrink-0">🏢 Bộ phận:</span>
                                <span className="font-extrabold text-gray-800 leading-snug">{userStats.dept}</span>
                              </div>
                              <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-left flex-wrap">
                                <span className="text-gray-400 font-bold shrink-0">📍 Chi nhánh:</span>
                                <span className="font-extrabold text-gray-800 leading-snug">{userStats.branch}</span>
                              </div>

                              {/* Bộ chọn các lượt đăng quang/thăng cấp nếu thăng cấp nhiều hơn 1 lần */}
                              {coronations.length > 1 && (
                                <div className="col-span-1 sm:col-span-2 flex flex-col gap-1 border-t border-b border-gray-100 py-2 my-1">
                                  <span className="text-amber-800 font-bold font-sans text-[10px] uppercase tracking-wider">Lịch sử thăng hạng ({coronations.length} lần đạt Legend):</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {coronations.map((coro, cIdx) => (
                                      <button
                                        key={cIdx}
                                        onClick={() => setSelectedCoronation(prev => ({ ...prev, [userStats.userId]: cIdx }))}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                          activeCoronationIdx === cIdx
                                            ? 'bg-amber-600 border-amber-600 text-white'
                                            : 'bg-amber-50/40 border-amber-100 hover:bg-amber-100/20 text-amber-900'
                                        }`}
                                      >
                                        Lần {cIdx + 1} ({formatPromoDate(coro.promoTimestamp)})
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Thống kê chi tiết & Lộ trình của lượt thăng cấp được chọn */}
                              <div className="col-span-1 sm:col-span-2 bg-amber-50/35 border border-amber-100 p-2.5 rounded-lg flex flex-col gap-2 text-[11px] font-sans">
                                <div className="flex items-center gap-1.5 border-b border-amber-100/50 pb-1.5">
                                  <span className="text-amber-800 font-extrabold shrink-0">📈 Trình tự thăng hạng:</span>
                                  <span className="font-extrabold text-amber-950">Từ Cấp {activeCoro.fromLevel || 4} lên Cấp 5 (Huyền Thoại)</span>
                                </div>
                                
                                <div className="space-y-1.5 pl-1.5 border-l-2 border-amber-200">
                                  {activeCoro.transitions && activeCoro.transitions.length > 0 ? (
                                    activeCoro.transitions.map((t, tIdx) => {
                                      const isPromotion = t.toLevel > t.fromLevel;
                                      const styleClass = isPromotion ? 'text-emerald-800' : 'text-rose-800';
                                      const directionWord = isPromotion ? 'lên' : 'xuống';
                                      
                                      return (
                                        <div key={tIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] leading-tight font-sans">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[9px]">{isPromotion ? '🟢' : '🔴'}</span>
                                            <span className={`font-semibold ${styleClass}`}>
                                              Từ cấp {t.fromLevel} {directionWord} cấp {t.toLevel}
                                            </span>
                                          </div>
                                          <div className="text-right text-amber-900/80 font-mono text-[10px] sm:pl-4">
                                            <span>Ngày <strong className="font-semibold text-amber-955">{t.dateStr}</strong></span>
                                            <span className="mx-1 text-amber-300">|</span>
                                            <span className="italic">{t.attemptsCount} lượt</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-gray-400 italic text-[10px]">Chưa ghi nhận dữ liệu chi tiết của lần này.</div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 border-t border-amber-100/50 pt-1.5 text-[10px] text-amber-800/80">
                                  <span className="font-bold shrink-0">📆 Ngày Đăng Quang:</span>
                                  <span className="font-extrabold text-amber-900 font-mono">{formatPromoDate(activeCoro.promoTimestamp)}</span>
                                </div>
                              </div>

                              {/* 4 Chỉ tiêu thành tích của lần thăng cấp được chọn */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400 font-bold shrink-0">🎯 Điểm số trung bình:</span>
                                <span className="font-extrabold text-gray-800 font-mono">{activeCoro.avgScoreAtCoronation} / 30</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400 font-bold shrink-0">🔥 Tổng lượt ôn tập:</span>
                                <span className="font-extrabold text-gray-800 font-mono">{activeCoro.totalAttemptsAtCoronation} lượt</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400 font-bold shrink-0">⏱️ TB / lượt:</span>
                                <span className="font-extrabold text-gray-800 font-mono">{activeCoro.overallAvgDurationPerAttempt}s</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-400 font-bold shrink-0">⚡ Phản xạ / câu:</span>
                                <span className="font-extrabold text-gray-800 font-mono">{activeCoro.overallAvgDurationPerQuestion}s</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT THỨ HẠNG 2: 🎯 KỶ LỤC 3T */}
        <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-6 space-y-4 text-left flex flex-col justify-between">
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="border-b border-gray-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <h4 className="font-sans font-extrabold text-base text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <span>🎯 KỶ LỤC 3T ({recordCategories.length})</span>
                </h4>
                <p className="text-xs text-gray-405">Bảng vàng vinh danh kỷ lục toàn thời gian (lũy kế) & Thước đo rèn luyện đỉnh cao.</p>
              </div>

              {/* Ô TÌM KIẾM CHÂN PHƯƠNG */}
              <div className="relative font-sans">
                <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  className="w-28 focus:w-44 sm:w-32 focus:sm:w-48 pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 transition-all duration-300 font-sans"
                />
              </div>
            </div>

            {/* Quy chế kỷ lục với Toggle Accordion để không chiếm diện tích */}
            <div className="border border-amber-200/60 bg-amber-50/20 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setShowRule3T(!showRule3T)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-amber-900 hover:bg-amber-50/50 active:bg-amber-50/80 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-amber-955">
                  <span>📌 QUY CHẾ & MẸO TRÁNH SPAM THÔNG BÁO</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="text-[9px] font-normal">{showRule3T ? 'Thu gọn' : 'Xem chi tiết'}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-250 ${showRule3T ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              {showRule3T && (
                <div className="px-3 pb-2.5 pt-1.5 text-[10.5px] text-amber-950/90 leading-relaxed font-sans border-t border-amber-100/50 bg-amber-50/10 space-y-2">
                  <p>
                    Tất cả kỷ lục hiện tại được đặt làm <strong className="text-amber-900 font-bold">thước đo tiêu chuẩn (benchmark)</strong>. Kỷ lục mới ghi nhận khi <strong className="text-amber-900 font-bold">&gt;=</strong> mốc cũ.
                  </p>
                  <div className="space-y-1 block bg-white p-2 rounded border border-amber-200/40 text-[10px]">
                    <span className="font-bold text-amber-900">🛡️ Cơ chế lọc Spam (Thông báo dồn dập):</span>
                    <ul className="list-disc pl-3.5 space-y-0.5">
                      <li><strong>Người mới:</strong> Luôn nổ thông báo vinh danh tức thì toàn sảnh thi khi soán ngôi thành công đối thủ cũ.</li>
                      <li><strong>Kiên Trì (Tự bứt phá):</strong> Đối với chính chủ, sảnh thi chỉ loa truyền đạt khi chạm đúng <strong className="text-gray-900 font-extrabold">mốc tròn 100 lượt</strong> (ví dụ: mốc 100, 200, 300, 400 lượt...).</li>
                      <li><strong>Trí Tuệ (Tự bứt phá):</strong> Đối với chính chủ, sảnh thi chỉ loa truyền đạt mỗi khi tích lũy thêm <strong className="text-gray-900 font-extrabold">mốc tròn 50 lượt 30/30</strong> (ví dụ: mốc 50, 100, 150, 200 lượt...).</li>
                      <li><strong>Tốc Độ / Bất Bại / Trước Bình Minh:</strong> Luôn phát thông báo trực tiếp toàn sảnh để tôn vinh sự nỗ lực bứt phá siêu hạng ngày đêm.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* List of 3T Records - Chân phương, không màu sắc */}
            <div className="overflow-y-auto space-y-1 pr-1 max-h-[550px] min-h-[180px] flex-1 mt-2">
              {recordCategories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-2 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex-1">
                  <span className="text-xs text-gray-400 font-bold font-sans">Không tìm thấy Kỷ Lục nào phù hợp.</span>
                </div>
              ) : (
                <div className="space-y-1 px-0.5">
                  {/* Header của bảng */}
                  <div className="hidden md:grid grid-cols-12 gap-1 sm:gap-2 pb-2 mb-1 border-b border-gray-200 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider font-sans px-2 sticky top-0 bg-white z-10">
                    <div className="col-span-5">KỶ LỤC</div>
                    <div className="col-span-2 text-center">XÁC LẬP</div>
                    <div className="col-span-2 text-center">VỊ THẾ</div>
                    <div className="col-span-3 text-right font-sans">CHỈ SỐ</div>
                  </div>

                  {recordCategories.map((item, idx) => {
                    const isExpanded = expandedRecord === item.key;
                    const holderName = item.data 
                      ? (item.data.holders && item.data.holders.length > 1 
                        ? item.data.holders.map((h: any) => h.name).join(' & ') 
                        : item.data.name)
                      : 'Chưa ghi nhận';
                    const metricStr = item.getMetric(item.data);
                    return (
                      <div key={item.key + idx} className="border-b border-gray-100 last:border-none py-1">
                        {/* Desktop layout */}
                        <div 
                          onClick={() => item.data && setExpandedRecord(isExpanded ? null : item.key)}
                          className={`hidden md:grid grid-cols-12 gap-1 sm:gap-2 items-center py-1.5 px-2 hover:bg-gray-55 rounded-lg transition-all select-none ${item.data ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                        >
                          {/* Cột KỶ LỤC kèm icon & Tên đầy đủ */}
                          <div className="col-span-5 flex flex-col min-w-0 justify-center font-sans">
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <span className="text-amber-500 text-[11px] font-bold shrink-0 font-sans">
                                {item.icon}
                              </span>
                              <span className="font-extrabold text-[11px] sm:text-xs uppercase text-gray-800 tracking-wide font-sans truncate" title={item.title}>
                                <span translate="no" className="notranslate">{item.title.toUpperCase()}</span>
                              </span>
                            </div>
                            <span className="text-[11px] sm:text-xs text-blue-900 font-extrabold font-sans mt-0.5 pl-4 sm:pl-5 uppercase truncate" title={holderName}>
                              <span translate="no" className="notranslate">{holderName}</span>
                            </span>
                          </div>
                          
                          {/* Cột XÁC LẬP (Date) */}
                          <div className="col-span-2 text-center text-[10px] sm:text-xs font-bold text-gray-650 font-mono">
                            {item.data && item.data.date ? (
                              <span className="whitespace-nowrap">{standardizeDateToDDMMYYYY(item.data.date, item.data.timestamp)}</span>
                            ) : (
                              <span className="text-gray-300 font-bold">—</span>
                            )}
                          </div>
                          
                          {/* Cột VỊ THẾ (Số ngày nắm giữ kỷ lục) */}
                          <div className="col-span-2 text-center font-sans">
                            {item.data ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100/50 whitespace-nowrap font-sans">
                                {getDaysHeld(item.data.date, item.data.timestamp)} ngày
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-gray-300 font-bold">—</span>
                            )}
                          </div>
                          
                          {/* Cột CHỈ SỐ */}
                          <div className="col-span-3 text-right">
                            <div className="bg-[#FAF9F6] hover:bg-[#F3F2EE] border border-amber-200/50 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono text-amber-955 font-bold inline-block transition-colors shrink-0 whitespace-nowrap">
                              {metricStr}
                            </div>
                          </div>
                        </div>

                        {/* Mobile block/card layout */}
                        <div 
                          onClick={() => item.data && setExpandedRecord(isExpanded ? null : item.key)}
                          className={`flex flex-col md:hidden py-2.5 px-3 hover:bg-gray-55/80 border border-gray-100 rounded-xl mb-1.5 bg-white shadow-3xs select-none transition-all ${item.data ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                        >
                          {/* Row 1: Icon + Title [Left] & Days [Right] */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-amber-500 text-xs font-bold shrink-0">{item.icon}</span>
                              <span className="font-extrabold text-[11px] uppercase text-gray-900 tracking-wide font-sans truncate">
                                {item.title}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {item.data ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200/55 whitespace-nowrap">
                                  {getDaysHeld(item.data.date, item.data.timestamp)} ngày
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono text-gray-350 font-bold">—</span>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Holder name [Left] & Metric [Right] */}
                          <div className="flex items-center justify-between gap-2 mt-2 px-0.5">
                            <div className="min-w-0">
                              <span className="text-xs text-blue-950 font-black font-sans uppercase truncate block">
                                {holderName}
                              </span>
                            </div>
                            <div className="shrink-0">
                              <span className="bg-[#FAF9F6] border border-amber-200/40 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-amber-955 font-bold inline-block">
                                {metricStr}
                              </span>
                            </div>
                          </div>

                          {/* Row 3: Setup Record date */}
                          {item.data && item.data.date && (
                            <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-gray-100/70 text-[10px] text-gray-500 font-sans font-medium">
                              <span>Ngày xác lập:</span>
                              <span className="text-gray-805 font-bold font-mono">{standardizeDateToDDMMYYYY(item.data.date, item.data.timestamp)}</span>
                            </div>
                          )}
                        </div>

                        {/* Collapsible section xổ ra bằng chứng kỷ lục (chân phương) */}
                        {isExpanded && item.data && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="my-1.5 mx-1 p-3 bg-white border border-gray-200 rounded-xl text-[11px] text-gray-700 space-y-2 shadow-3xs overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                              <div>
                                <div className="text-gray-400 uppercase text-[9px] font-extrabold tracking-wider">Mô tả hạng mục:</div>
                                <div className="text-gray-800 font-semibold mt-0.5 text-xs leading-relaxed">{item.desc}</div>
                              </div>
                              <div className="bg-amber-50/20 border border-amber-200/30 rounded-lg p-2 flex flex-col justify-center">
                                <div className="text-amber-850 uppercase text-[8.5px] font-extrabold tracking-wider">Mốc tiêu chuẩn để phá:</div>
                                <div className="text-amber-950 font-black mt-0.5 text-xs font-mono">
                                  {item.key === 'quyettam' && `≥ ${item.data ? item.data.attemptsCount : 381} lượt ôn tập`}
                                  {item.key === 'tritue' && `≥ ${item.data ? item.data.perfectsCount : 185} lượt đạt 30/30`}
                                  {item.key === 'tocdo' && `≤ ${item.data ? item.data.durationPerQ : 3.8}s/câu trung bình`}
                                  {item.key === 'thantoc' && `≤ ${item.data ? item.data.attemptsCountToMaxLevel : 48} lượt (đạt Cấp 5)`}
                                  {item.key === 'batbai' && `≥ ${item.data ? item.data.streak : 45} chuỗi thắng 30/30`}
                                  {item.key === 'binhminh' && (() => {
                                    const timeStr = item.data ? item.data.timeString : '01:22';
                                    let count30 = 0;
                                    try {
                                      const parts = timeStr.split(':');
                                      const limitHours = parseInt(parts[0], 10);
                                      const limitMins = parseInt(parts[1], 10);
                                      const limitTotal = limitHours * 60 + limitMins;
                                      count30 = results.filter(r => {
                                        if (r.score !== 30) return false;
                                        const rd = new Date(r.timestamp);
                                        const rh = rd.getHours();
                                        const rm = rd.getMinutes();
                                        const rTotal = rh * 60 + rm;
                                        return rTotal >= 0 && rTotal <= limitTotal;
                                      }).length;
                                    } catch (e) {
                                      count30 = 0;
                                    }
                                    return (
                                      <span className="font-sans font-medium text-[11px] block text-amber-950 leading-relaxed">
                                        Sớm hơn hoặc bằng <span translate="no" className="font-extrabold notranslate font-mono text-xs">{timeStr}</span> sáng (đạt điểm tối đa <span translate="no" className="font-extrabold notranslate font-mono text-xs">30/30</span>)<br />
                                        <span className="text-gray-500 font-bold select-none">• Hiện có: </span>
                                        <span translate="no" className="font-extrabold text-amber-900 notranslate font-mono text-xs">{count30} lượt</span> đạt điểm tối đa <span translate="no" className="font-bold notranslate font-mono text-[11px]">30/30</span> trong khoảng từ <span className="font-bold font-mono text-[11px]">00:00</span> đến <span translate="no" className="font-bold notranslate font-mono text-[11px]">{timeStr}</span> sáng.<br />
                                        <span className="text-rose-800 font-extrabold select-none">• Điều kiện xô đổ kỷ lục: </span>
                                        Thời gian sớm hơn kỷ lục hiện tại (<span translate="no" className="font-bold notranslate font-mono text-[11px]">&lt; {timeStr}</span>) và số lượt đạt điểm <span className="font-bold">30/30</span> nhiều hơn (hiện tại có <span translate="no" className="font-extrabold notranslate font-mono text-[11px]">{count30} lượt</span>).
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-y-1.5 font-sans pt-1.5 border-t border-gray-100/55">
                              {(() => {
                                const holders = item.data.holders && item.data.holders.length > 0 ? item.data.holders : [item.data];
                                return holders.map((holder: any, hIdx: number) => (
                                  <div key={hIdx} className={`pb-2 ${holders.length > 1 && hIdx < holders.length - 1 ? 'border-b border-gray-150/40 mb-1' : ''}`}>
                                    {holders.length > 1 && (
                                      <div className="text-[9px] font-black text-amber-700 bg-amber-50 rounded border border-amber-200 inline-block px-1.5 py-0.5 mb-1.5 uppercase tracking-wider">
                                        ĐỒNG GIỮ KỶ LỤC #{hIdx + 1}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-left flex-wrap">
                                      <span className="text-gray-400 font-bold shrink-0">👤 Người giữ kỷ lục:</span>
                                      <span translate="no" className="font-extrabold text-gray-800 notranslate">{holder.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-left flex-wrap">
                                      <span className="text-gray-400 font-bold shrink-0">🏢 Bộ phận:</span>
                                      <span translate="no" className="font-extrabold text-gray-800 leading-snug notranslate">{holder.dept}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-left flex-wrap">
                                      <span className="text-gray-400 font-bold shrink-0">📍 Chi nhánh:</span>
                                      <span translate="no" className="font-extrabold text-[#2F3E46] leading-snug notranslate">{holder.branch}</span>
                                    </div>
                                    {holder.date && (
                                      <div className="flex items-center gap-1.5 text-left flex-wrap">
                                        <span className="text-gray-400 font-bold shrink-0">📅 Ngày xác lập:</span>
                                        <span translate="no" className="font-extrabold text-gray-800 font-mono notranslate">{standardizeDateToDDMMYYYY(holder.date, holder.timestamp)}</span>
                                      </div>
                                    )}
                                  </div>
                                ));
                              })()}
                            </div>

                            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-amber-900 mt-2 text-xs font-sans">
                              <div className="text-[10px] font-black uppercase text-amber-950">Bằng chứng Kỷ lục:</div>
                              <div className="font-bold mt-1 text-gray-850 leading-relaxed italic">
                                "<span translate="no" className="notranslate">{item.data.proofText}</span>"
                              </div>
                            </div>

                            {item.calcMethod && (
                              <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-150">
                                <div className="text-amber-800 uppercase text-[8.5px] font-extrabold tracking-wider flex items-center gap-1 select-none">
                                  <span>⚙️</span> CÁCH TÍNH CHỈ SỐ:
                                </div>
                                <div className="text-gray-500 font-semibold text-[10px] leading-relaxed mt-1 italic pl-1 border-l-2 border-amber-250/70 select-none">
                                  {item.key === 'binhminh' ? (
                                    (() => {
                                      const timeStr = item.data ? item.data.timeString : '01:22';
                                      return (
                                        <>
                                          Khung giờ nộp bài đạt điểm tối đa 30/30 sớm nhất trong ngày, được hệ thống rà soát tự động trong khoảng từ <span className="font-bold">00:00</span> đến <span className="font-bold notranslate" translate="no">{timeStr}</span> sáng (mốc kỷ lục hiện tại đã xác lập).
                                        </>
                                      );
                                    })()
                                  ) : item.calcMethod}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-[10px] text-gray-400 font-semibold text-center shrink-0 border-t border-gray-100 pt-2.5 mt-3 flex justify-center items-center gap-1.5 font-sans">
              <span>Hệ thống tự động vinh danh và lưu trữ các kỷ lục thi đua chuyên nghiệp 3T.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid containing Left: Quota Tracker or Managed Scope Greeting, Right: Interactive rankings */}
      <div className={isApprover ? "w-full text-left" : "grid grid-cols-1 lg:grid-cols-2 gap-5"}>
        
        {/* Column 1 Wrapper */}
        {!isApprover && (
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
        )}

        {/* Section 2: Gamified Top 5 Practitioners Rankings (Hội nghị Anh tài) */}
        <div className="bg-white border border-gray-150 rounded-xl shadow-3xs p-5 space-y-4 text-left flex flex-col">
          <div className="border-b border-gray-150 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <h4 className="font-sans font-bold text-sm text-[#E8590C] uppercase tracking-wider flex items-center gap-2">
              <span>🔥 TOP 5 KIÊN TRÌ LUYỆN TẬP</span>
            </h4>

            {/* Dynamic Period Filters - Hôm Nay, Tuần, Tháng */}
            <div className="flex bg-orange-50/70 border border-orange-200/40 p-0.5 rounded-lg shrink-0 gap-1" id="patience-rank-filters">
              {(['day', 'week', 'month'] as const).map((p) => {
                const label = p === 'day' ? 'Hôm Nay' : p === 'week' ? 'Tuần' : 'Tháng';
                const isActive = rankingPeriod === p;
                return (
                  <button
                    id={`btn-filter-rank-${p}`}
                    key={p}
                    onClick={() => setRankingPeriod(p)}
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#E8590C] text-white shadow-2xs font-bold'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-orange-100/30'
                    }`}
                  >
                    <span translate="no" className="notranslate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List rank display */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
            {topRankings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-2 border border-dashed border-gray-200 rounded-xl bg-gray-50/20">
                <Calendar className="h-10 w-10 text-gray-300 animate-bounce" />
                <span className="text-xs text-gray-400 font-bold">Chưa có kết quả ôn tập nào ghi nhận trong khoảng thời gian này.</span>
              </div>
            ) : (
              topRankings.map((userStats, idx) => {
                const getPodiumBadge = (rank: number) => {
                  if (rank === 0) return <span className="w-5.5 h-5.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs shadow-3xs border border-yellow-300">1</span>;
                  if (rank === 1) return <span className="w-5.5 h-5.5 rounded-full bg-slate-150 text-slate-700 flex items-center justify-center font-bold text-xs shadow-3xs border border-slate-300">2</span>;
                  if (rank === 2) return <span className="w-5.5 h-5.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shadow-3xs border border-amber-300">3</span>;
                  return <span className="w-5.5 h-5.5 rounded-full bg-gray-100 text-gray-605 flex items-center justify-center font-bold text-xs border border-gray-200">{rank + 1}</span>;
                };

                return (
                  <motion.div 
                    key={userStats.name + idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex justify-between items-center p-3.5 bg-[#FAF9F6] border border-gray-150 rounded-xl hover:bg-gray-100/70 transition-all shadow-3xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getPodiumBadge(idx)}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-gray-800 truncate">{userStats.name}</div>
                        <div className="text-[10px] text-gray-400 truncate font-semibold">{userStats.dept} • {userStats.branch}</div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#1971C2] text-xs font-mono flex items-center gap-1 justify-end">
                        <Activity className="h-3 w-3 text-[#1971C2]" />
                        <span>{userStats.attempts} lượt thi thử</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold font-sans">
                        Điểm trung bình: <b className="text-gray-650 font-mono font-bold">{userStats.avgScore}/30</b>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          
          <div className="text-[10px] text-gray-400 font-semibold text-center shrink-0 border-t border-gray-100 pt-2.5 flex justify-center items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
            <span>Mời toàn thể CBNV tích cực tham gia rèn luyện nâng cao tỷ lệ hoàn thành mục tiêu.</span>
          </div>
        </div>

      </div>

      {!isApprover && (
        <>
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
                        <div className="font-bold text-gray-800 whitespace-normal break-words leading-tight">{stat.userName}</div>
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
                        {(() => {
                          const currentRules = levelRules || DEFAULT_LEVEL_RULES;
                          const uLvl = stat.level || 1;
                          const lvlConfig = currentRules.levels.find(l => l.level === uLvl) || DEFAULT_LEVEL_RULES.levels[uLvl - 1] || { name: `Cấp ${uLvl}`, emoji: '🌱' };
                          const cleanLvlName = getCleanLevelName(lvlConfig.name, uLvl);
                          const isOnlineNow = stat.lastActive ? Math.abs(Date.now() - stat.lastActive) <= 240000 : false;
                          
                          let badgeColors = 'bg-emerald-50 text-emerald-700 border-emerald-150';
                          if (uLvl === 2) badgeColors = 'bg-blue-50 text-blue-700 border-blue-150';
                          else if (uLvl === 3) badgeColors = 'bg-amber-50 text-amber-700 border-amber-150';
                          else if (uLvl === 4) badgeColors = 'bg-purple-50 text-purple-700 border-purple-150';
                          else if (uLvl === 5) badgeColors = 'bg-rose-50 text-rose-700 border-rose-150';

                          return (
                            <div className="inline-flex flex-col items-center justify-center text-center">
                              <span className={`relative font-sans px-3 py-1 rounded-lg border shadow-3xs font-black tracking-wide flex flex-col items-center justify-center min-w-[95px] ${badgeColors} ${isOnlineNow ? 'animate-pulse' : ''}`}>
                                <span className="text-[10px] uppercase opacity-75 font-mono">Cấp {uLvl}</span>
                                <span className="text-[11px] font-bold mt-0.5 whitespace-normal leading-tight">{cleanLvlName}</span>
                                {isOnlineNow && (
                                  <>
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border border-white animate-ping"></span>
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                                  </>
                                )}
                              </span>
                            </div>
                          );
                        })()}
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
        </>
      )}

    </div>
  );
}
