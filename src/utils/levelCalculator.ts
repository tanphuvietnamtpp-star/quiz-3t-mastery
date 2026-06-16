import { QuizResult, LevelRulesConfig } from '../types';

export interface LevelState {
  level: number;
  consecutiveMax: number;
  consecutiveLow: number;
  demotionsApplied: number; // Số lần bị hạ cấp do không hoạt động (inactivity)
  inactiveDaysWarning: boolean; // Có đang bị cảnh báo hạ cấp cho ngày hôm nay không
  attemptsToday: number; // Số lượt thi trong ngày hôm nay
  quizDatesAttempted: Record<string, number>; // Số lượt thi theo từng ngày
  maxLevelReached?: number; // Cấp độ cao nhất từng đạt được
}

// Helper to convert DD/MM/YY or DD/MM/YYYY into a standardized YYYY-MM-DD
export function normalizeDateString(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

// Convert YYYY-MM-DD to DD/MM/YY
export function formatDateToDDMMYY(yyyyMmDd: string): string {
  if (!yyyyMmDd || !yyyyMmDd.includes('-')) return yyyyMmDd;
  const parts = yyyyMmDd.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
}

export function removeVNAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export const PRE_SEEDED_LEGEND_DATES: Record<string, string> = {};

export function getVietnamDateString(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const vnTime = new Date(utc + (3600000 * 7)); // Indochina/Vietnam Time is UTC+7
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function calculateInactivityAugmentedLevel(
  userIdOrNormalizedName: string,
  userResults: QuizResult[],
  levelRules: LevelRulesConfig,
  options: {
    inactivityStartDate?: string; // e.g. "2026-06-14"
    simulatedToday?: string; // e.g. "2026-06-14" to test June 14
    isTestModeEnabled?: boolean;
  } = {}
): LevelState {
  const activeRules = levelRules;
  const chronologicalResults = [...userResults].sort((a, b) => a.timestamp - b.timestamp);

  // Inactivity start configuration
  // Direct user rule: start at 00:00 June 14, 2026
  let policyStartDateStr = options.inactivityStartDate || '2026-06-14'; 
  
  // Simulated today (defaults to local clock date)
  // Let's find today's date in local Vietnam/system time (YYYY-MM-DD)
  let todayStr = options.simulatedToday || getVietnamDateString();

  // If test mode is enabled but no custom simulated today was provided, let's treat simulated today as the startDate
  if (options.isTestModeEnabled && !options.simulatedToday) {
    todayStr = policyStartDateStr; 
  }

  // Pre-seeded Level 5 date mapping
  let preSeededDate = PRE_SEEDED_LEGEND_DATES[removeVNAccents(userIdOrNormalizedName)] || PRE_SEEDED_LEGEND_DATES[userIdOrNormalizedName];
  if (!preSeededDate && userResults.length > 0) {
    for (const res of userResults) {
      if (res.userName) {
        const normResName = removeVNAccents(res.userName);
        if (PRE_SEEDED_LEGEND_DATES[normResName]) {
          preSeededDate = PRE_SEEDED_LEGEND_DATES[normResName];
          break;
        }
      }
    }
  }

  // Parse rule attributes
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

  // Group quiz results by formatted date YYYY-MM-DD
  const attemptsByDate: Record<string, number> = {};
  const resultsByDate: Record<string, QuizResult[]> = {};

  chronologicalResults.forEach(res => {
    const normDate = normalizeDateString(res.date);
    if (normDate) {
      attemptsByDate[normDate] = (attemptsByDate[normDate] || 0) + 1;
      if (!resultsByDate[normDate]) {
        resultsByDate[normDate] = [];
      }
      resultsByDate[normDate].push(res);
    }
  });

  // Calculate day-by-day level history starting from the user's first quiz date up to simulated today
  let currentLevel = 1;
  let maxLevel = 1;
  let consecutiveMax = 0;
  let consecutiveLow = 0;
  let demotionsApplied = 0;

  // Let's list all relevant dates in order to evaluate them day-by-day
  // Find the earliest date of activity or standard date
  const allDates = Object.keys(attemptsByDate).sort();
  let firstActiveDateStr = allDates.length > 0 ? allDates[0] : '2026-06-08';
  if (firstActiveDateStr > policyStartDateStr) {
    firstActiveDateStr = policyStartDateStr;
  }
  if (preSeededDate && firstActiveDateStr > preSeededDate) {
    firstActiveDateStr = preSeededDate;
  }

  // Generate sequence of dates from firstActiveDateStr to todayStr inclusive
  const dateSequence: string[] = [];
  const parseSafeDate = (dStr: string) => {
    const [y, m, d] = dStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  };

  let runner = parseSafeDate(firstActiveDateStr);
  const endLimit = parseSafeDate(todayStr);

  // Safety break max 365 days
  let protection = 0;
  while (runner <= endLimit && protection < 365) {
    const yyyy = runner.getUTCFullYear();
    const mm = String(runner.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(runner.getUTCDate()).padStart(2, '0');
    dateSequence.push(`${yyyy}-${mm}-${dd}`);
    runner.setUTCDate(runner.getUTCDate() + 1);
    protection++;
  }

  // Evaluate chronologically day-by-day
  dateSequence.forEach((dateStr, idx) => {
    // Force pre-seeded level if this date matches their legendary pre-seed date
    if (preSeededDate && dateStr === preSeededDate) {
      currentLevel = 5;
      consecutiveMax = 0;
      consecutiveLow = 0;
    }

    // 1. Process inactivity penalty from the PREVIOUS day if the policy is active
    // The policy starts on policyStartDateStr. So the first day that can have a penalty based on
    // previous day's inactivity is the day AFTER policyStartDateStr.
    if (idx > 0) {
      const prevDateStr = dateSequence[idx - 1];
      // Only apply inactivity penalty if prevDateStr is on or after the policy start date
      if (prevDateStr >= policyStartDateStr) {
        const attemptsPrev = attemptsByDate[prevDateStr] || 0;
        const isLvl5AndNewRule = (currentLevel === 5 && prevDateStr >= '2026-06-17');

        let failedMaintenance = false;
        if (isLvl5AndNewRule) {
          // For level 5, starting from 2026-06-17:
          // maintenance requires: at least 2 attempts AND average score >= 20/30
          const prevRes = resultsByDate[prevDateStr] || [];
          const avgScorePrev = prevRes.length > 0 
            ? prevRes.reduce((sum, r) => sum + r.score, 0) / prevRes.length 
            : 0;

          if (attemptsPrev < 2 || avgScorePrev < 20) {
            failedMaintenance = true;
          }
        } else {
          // Standard inactivity: less than 2 attempts
          if (attemptsPrev < 2) {
            failedMaintenance = true;
          }
        }

        if (failedMaintenance) {
          // Demote level by 1 for inactivity / failure to maintain
          if (currentLevel > 1) {
            currentLevel -= 1;
            demotionsApplied += 1;
            // Reset consecutive achievements upon demotion
            consecutiveMax = 0;
            consecutiveLow = 0;
          }
        }
      }
    }

    // 2. Process all quiz results submitted on THIS day (in history order)
    const dayResults = resultsByDate[dateStr] || [];
    dayResults.forEach(res => {
      const score = res.score;

      if (currentLevel === 1) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        const req = parseRequiredConsecutive(0, 10);
        if (consecutiveMax >= req) {
          currentLevel = 2;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 2) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        const demotionMin = parseDemotionThreshold(1, 20);
        if (score < demotionMin) {
          consecutiveLow++;
        } else {
          consecutiveLow = 0;
        }
        const req = parseRequiredConsecutive(1, 10);
        if (consecutiveMax >= req) {
          currentLevel = 3;
          consecutiveMax = 0;
          consecutiveLow = 0;
        } else if (consecutiveLow >= 2) {
          currentLevel = 1;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 3) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        const demotionMin = parseDemotionThreshold(2, 26);
        if (score < demotionMin) {
          consecutiveLow++;
        } else {
          consecutiveLow = 0;
        }
        const req = parseRequiredConsecutive(2, 10);
        if (consecutiveMax >= req) {
          currentLevel = 4;
          consecutiveMax = 0;
          consecutiveLow = 0;
        } else if (consecutiveLow >= 2) {
          currentLevel = 2;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 4) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        const demotionMin = parseDemotionThreshold(3, 27);
        if (score < demotionMin) {
          consecutiveLow++;
        } else {
          consecutiveLow = 0;
        }
        const req = parseRequiredConsecutive(3, 10);
        if (consecutiveMax >= req) {
          currentLevel = 5;
          consecutiveMax = 0;
          consecutiveLow = 0;
        } else if (consecutiveLow >= 2) {
          currentLevel = 3;
          consecutiveMax = 0;
          consecutiveLow = 0;
        }
      } else if (currentLevel === 5) {
        if (score === 30) {
          consecutiveMax++;
        } else {
          consecutiveMax = 0;
        }
        // From 17/06/2026, Level 5 does not get demoted due to single score drops
        const isNewRuleActive = (dateStr >= '2026-06-17');
        if (!isNewRuleActive) {
          const demotionMin = parseDemotionThreshold(4, 28);
          if (score < demotionMin) {
            consecutiveLow++;
          } else {
            consecutiveLow = 0;
          }
          if (consecutiveLow >= 2) {
            currentLevel = 4;
            consecutiveMax = 0;
            consecutiveLow = 0;
          }
        } else {
          consecutiveLow = 0;
        }
      }
      maxLevel = Math.max(maxLevel, currentLevel);
    });
    maxLevel = Math.max(maxLevel, currentLevel);
  });

  // Check if today satisfies the maintenance criteria (at least 2 quizzes)
  const attemptsToday = attemptsByDate[todayStr] || 0;
  const isRuleActiveForToday = todayStr >= policyStartDateStr;

  let inactiveDaysWarning = false;
  if (isRuleActiveForToday && currentLevel > 1) {
    if (currentLevel === 5 && todayStr >= '2026-06-17') {
      const todayRes = resultsByDate[todayStr] || [];
      const avgScoreToday = todayRes.length > 0 
        ? todayRes.reduce((sum, r) => sum + r.score, 0) / todayRes.length 
        : 0;

      if (attemptsToday < 2 || avgScoreToday < 20) {
        inactiveDaysWarning = true;
      }
    } else {
      if (attemptsToday < 2) {
        inactiveDaysWarning = true;
      }
    }
  }

  return {
    level: currentLevel,
    consecutiveMax,
    consecutiveLow,
    demotionsApplied,
    inactiveDaysWarning,
    attemptsToday,
    quizDatesAttempted: attemptsByDate,
    maxLevelReached: maxLevel
  };
}
