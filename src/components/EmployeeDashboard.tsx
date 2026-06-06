import React, { useState, useEffect } from 'react';
import { databaseService } from '../firebase';
import { User, Question, QuizResult } from '../types';
import { formatDate, formatTimeInSeconds } from '../utils/format';
import { BookOpen, Trophy, Award, BarChart3, ChevronRight, CheckCircle2, XCircle, ArrowRight, RotateCcw, HelpCircle, GraduationCap, AlertCircle, Users, TrendingUp, Building2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
  isAdminReview?: boolean;
  onBackToAdmin?: () => void;
  slogan?: string;
}

export default function EmployeeDashboard({ user, onLogout, isAdminReview = false, onBackToAdmin, slogan = '3T Hội Tụ - Tân Phú Vươn Xa' }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<'practice' | 'quiz' | 'history'>('quiz');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  
  // States of Active Quiz
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizTimer, setQuizTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);
  
  const [backChanceUsed, setBackChanceUsed] = useState(false);
  const [backClicksCount, setBackClicksCount] = useState(0);
  const [quizInfoMessage, setQuizInfoMessage] = useState<string | null>(null);
  
  const [showResultsReview, setShowResultsReview] = useState(false);
  const [lastQuizResult, setLastQuizResult] = useState<QuizResult | null>(null);

  // States for Mistakes reviewing and Analysis
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);
  const [analysisScope, setAnalysisScope] = useState<'personal' | 'collective'>('personal');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const qs = await databaseService.getQuestions();
        setQuestions(qs);
        
        const allRes = await databaseService.getQuizResults();
        setAllResults(allRes);
        
        // Filter result for this user
        const userResults = allRes
          .filter(r => r.userId === user.id)
          .sort((a, b) => b.timestamp - a.timestamp);
        setResults(userResults);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu nhân viên:", err);
      }
    };
    loadData();
  }, [user.id]);

  // Handle Timer
  useEffect(() => {
    if (quizStarted && !showResultsReview) {
      const interval = setInterval(() => {
        setQuizTimer(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    }
  }, [quizStarted, showResultsReview]);

  // Start the 3T Daily Mock Quiz (3 random questions)
  const startQuiz = () => {
    if (questions.length < 3) {
      alert("Ngân hàng câu hỏi hiện có ít hơn 3 câu, không thể thi thử. Vui lòng nhờ admin Lê Nhật Trường seed thêm dữ liệu.");
      return;
    }
    setErrorState(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizTimer(0);
    setBackChanceUsed(false);
    setBackClicksCount(0);
    setQuizInfoMessage(null);
    setShowResultsReview(false);
    
    // Choose 3 random questions
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    setCurrentQuizQuestions(selected);
    setQuizStarted(true);
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const [errorState, setErrorState] = useState<string | null>(null);

  // Submit Quiz Action
  const submitQuiz = async () => {
    // Check if answered all questions
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < 3) {
      setErrorState("Vui lòng trả lời đầy đủ cả 3 câu hỏi trước khi nộp bài.");
      return;
    }

    setErrorState(null);
    let correctCount = 0;
    const answerLog = currentQuizQuestions.map(q => {
      const isCorrect = selectedAnswers[q.id] === q.correctAnswerIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        selectedIndex: selectedAnswers[q.id],
        correct: isCorrect
      };
    });

    const finalScore = correctCount * 10; // 10 points per question, max 30

    const newResult: QuizResult = {
      id: 'res_' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      userName: user.name,
      department: user.department,
      branch: user.branch,
      score: finalScore,
      totalQuestions: 3,
      date: formatDate(new Date()),
      timestamp: Date.now(),
      answers: answerLog,
      duration: quizTimer
    };

    try {
      await databaseService.saveQuizResult(newResult);
      setLastQuizResult(newResult);
      setResults(prev => [newResult, ...prev]);
      setAllResults(prev => [newResult, ...prev]);
      setShowResultsReview(true);
      setReviewMode(false);
      setReviewQuestionIndex(0);
    } catch (err) {
      console.error("Lỗi khi lưu kết quả bài thi:", err);
    }
  };

  // Expanded explanations in practice mode state
  const [expandedPracticeId, setExpandedPracticeId] = useState<string | null>(null);

  // Statistics calculation
  const totalQuizzes = results.length;
  const averageScore = totalQuizzes > 0 
    ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / totalQuizzes)
    : 0;
  const passingRate = totalQuizzes > 0
    ? Math.round((results.filter(r => r.score === 30).length / totalQuizzes) * 100)
    : 0;

  // Collective stats for department & branch (e.g., P. QLCL)
  const myDeptResults = allResults.filter(r => r.department === user.department);
  const deptTotalQuizzes = myDeptResults.length;
  const deptAverageScore = deptTotalQuizzes > 0
    ? Math.round((myDeptResults.reduce((acc, curr) => acc + curr.score, 0) / deptTotalQuizzes) * 10) / 10
    : 0;
  const deptPassingRate = deptTotalQuizzes > 0
    ? Math.round((myDeptResults.filter(r => r.score === 30).length / deptTotalQuizzes) * 100)
    : 0;

  // 3T values detailed evaluation for the user's department
  // T1: Trọng tâm khách hàng (indices % 3 === 0)
  // T2: Tinh gọn (indices % 3 === 1)
  // T3: Tốc độ quyết liệt (indices % 3 === 2)
  let t1Correct = 0, t1Total = 0;
  let t2Correct = 0, t2Total = 0;
  let t3Correct = 0, t3Total = 0;

  myDeptResults.forEach(res => {
    res.answers.forEach((ans, idx) => {
      if (idx % 3 === 0) {
        t1Total++;
        if (ans.correct) t1Correct++;
      } else if (idx % 3 === 1) {
        t2Total++;
        if (ans.correct) t2Correct++;
      } else {
        t3Total++;
        if (ans.correct) t3Correct++;
      }
    });
  });

  const deptT1Percent = t1Total > 0 ? Math.round((t1Correct / t1Total) * 100) : 88;
  const deptT2Percent = t2Total > 0 ? Math.round((t2Correct / t2Total) * 100) : 84;
  const deptT3Percent = t3Total > 0 ? Math.round((t3Correct / t3Total) * 100) : 80;

  // Ranked list of active department participation
  const departmentsList = [
    'Phòng Quản Lý Chất Lượng (QLCL)',
    'Phòng Sản Xuất',
    'Phòng Nhân Sự',
    'Phòng Kế Toán',
    'Phòng Kinh Doanh',
    'Phòng Kỹ Thuật',
    'Phòng Kho Vận'
  ];
  const deptLeaderboard = departmentsList.map(dept => {
    const deptRes = allResults.filter(r => r.department === dept);
    const count = deptRes.length;
    const avg = count > 0 ? Math.round((deptRes.reduce((sum, r) => sum + r.score, 0) / count) * 10) / 10 : 0;
    const rate = count > 0 ? Math.round((deptRes.filter(r => r.score === 30).length / count) * 100) : 0;
    return { name: dept, count, avg, rate };
  }).sort((a, b) => b.count - a.count || b.avg - a.avg);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simulation preview banner */}
      {isAdminReview && (
        <div className="bg-amber-500 text-white px-6 py-2.5 flex flex-col sm:flex-row justify-between items-center text-xs md:text-sm font-bold shadow-md z-50 gap-2">
          <div className="flex items-center gap-2">
            <span translate="no" className="notranslate bg-amber-700 px-2.5 py-1 rounded text-[10px] text-white tracking-widest shrink-0 uppercase">Chế độ xem thử</span>
            <span translate="no" className="notranslate">Anh/Chị đang trải nghiệm giao diện CBNV để trực tiếp kiểm duyệt Thi thử, Học từ sai và Phân tích 3T!</span>
          </div>
          <button 
            onClick={onBackToAdmin}
            className="bg-white text-gray-900 hover:bg-gray-100 transition-all font-bold px-4 py-1.5 rounded-lg shadow-sm font-sans shrink-0"
          >
            <span translate="no" className="notranslate">Quay lại trang Quản trị</span>
          </button>
        </div>
      )}

      {/* Main Area containing Structured Smartphone Mockup with Auto-Detection */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 bg-gradient-to-b from-gray-50 to-gray-100 max-h-screen overflow-hidden">
        
        {/* Smartphone Frame Outer Shell with 50% thinner borders, scaled corner radius for phone frame */}
        <div className="w-full sm:max-w-[415px] h-[95vh] sm:h-[810px] max-h-[920px] bg-[#0F1C2E] sm:rounded-[32px] p-1 sm:p-1.5 pb-2 shadow-2xl relative sm:border-[6px] sm:border-slate-800 ring-4 ring-slate-900/5 transition-all text-gray-800 flex flex-col my-1 shrink-0">
          
          {/* Physical Phone Top Notch / Speaker Deco element simulating phone layout */}
          <div className="hidden sm:flex absolute -top-0.5 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-slate-800 rounded-b-md z-20 items-center justify-center">
            <div className="w-8 h-0.5 bg-slate-900 rounded-full"></div>
          </div>
          
          {/* Screen Inner Viewport (Auto-co giãn, scrollable elegantly like a native application) */}
          <div className="bg-white w-full h-full rounded-[14px] sm:rounded-[26px] overflow-hidden flex flex-col shadow-inner relative border border-gray-150 p-3 sm:p-4 overflow-y-auto style-scrollbar flex-1">
            
            {/* Dynamic Inner Panel Viewports */}
            <AnimatePresence mode="wait">
              {/* Practice Tab Viewport */}
              {activeTab === 'practice' && !quizStarted && (
                <motion.div
                  key="practice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Elegant top-back button bar to transition back safely */}
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="p-1 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      &larr; Trang Chủ
                    </button>
                    <span className="text-xs font-bold text-gray-450 uppercase tracking-wider">Tài liệu ôn tập</span>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-105 p-3.5 rounded-xl">
                    <h3 className="text-xs font-bold text-yellow-800 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      <span translate="no" className="notranslate">Hướng dẫn Ôn tập</span>
                    </h3>
                    <p className="text-[11px] text-yellow-700 mt-1 leading-relaxed">
                      <span translate="no" className="notranslate">
                        Dưới đây là ngân hàng đề câu hỏi an toàn lao động và tinh thần tuân thủ 3T được ban quản trị biên soạn. 
                        Nhân viên hãy nghiên cứu kỹ đáp án chính xác kèm theo các lời nhắn dặn dò để rèn luyện vững vàng trước khi bước vào kỳ thi thực tế.
                      </span>
                    </p>
                  </div>

              <div className="grid grid-cols-1 gap-3">
                {questions.map((q, idx) => (
                  <div 
                    key={q.id}
                    className="bg-white border border-gray-150 rounded-md p-4 shadow-sm hover:border-gray-300 transition-all cursor-pointer"
                    onClick={() => setExpandedPracticeId(expandedPracticeId === q.id ? null : q.id)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                          <span translate="no" className="notranslate">Câu số {idx + 1}</span>
                        </span>
                        <h4 className="text-sm font-bold text-gray-800 pt-1">
                          <span translate="no" className="notranslate">{q.text}</span>
                        </h4>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform shrink-0 ${expandedPracticeId === q.id ? 'rotate-90' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {expandedPracticeId === q.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pt-4 mt-3 border-t border-gray-100 space-y-3"
                          onClick={(e) => e.stopPropagation()} // Stop bubbling
                        >
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === q.correctAnswerIndex;
                              return (
                                <div 
                                  key={oIdx}
                                  className={`rounded-md p-3 text-xs flex items-center justify-between border ${
                                    isCorrect 
                                    ? 'bg-green-50 border-green-200 text-green-900 font-medium' 
                                    : 'bg-gray-50 border-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span translate="no" className="notranslate">{opt}</span>
                                  {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          <div className="bg-blue-50/50 rounded-md p-3 border border-blue-50 text-xs">
                            <h5 className="font-bold text-blue-800">
                              <span translate="no" className="notranslate">Giải thích và Ghi nhớ:</span>
                            </h5>
                            <p className="text-blue-700 mt-1 leading-relaxed">
                              <span translate="no" className="notranslate">{q.explanation}</span>
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* History Tab Viewport */}
          {activeTab === 'history' && !quizStarted && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Elegant top-back button bar to transition back safely */}
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <button
                  onClick={() => setActiveTab('quiz')}
                  className="p-1 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  &larr; Trang Chủ
                </button>
                <span className="text-xs font-bold text-gray-450 uppercase tracking-wider">Phân tích tiến độ</span>
              </div>

              {/* Analytics Tab Switcher Pills */}
              <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setAnalysisScope('personal')}
                  className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                    analysisScope === 'personal'
                      ? 'bg-white text-gray-950 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Users className="h-4 w-4 text-blue-500" />
                  <span translate="no" className="notranslate">Tiến độ cá nhân</span>
                </button>
                <button
                  onClick={() => setAnalysisScope('collective')}
                  className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                    analysisScope === 'collective'
                      ? 'bg-white text-gray-950 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Building2 className="h-4 w-4 text-[#1971C2]" />
                  <span translate="no" className="notranslate">Bộ phận & Chi nhánh</span>
                </button>
              </div>

              {analysisScope === 'personal' ? (
                // =============== A. TIẾN ĐỘ CÁ NHÂN ===============
                <div className="space-y-6">
                  {/* Analytics summary row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Kỳ thi đã thử</span>
                      </div>
                      <div className="text-3xl font-extrabold text-gray-950 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{totalQuizzes}</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Điểm số trung bình</span>
                      </div>
                      <div className="text-3xl font-extrabold text-blue-600 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{averageScore} / 30</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Tỉ lệ Đạt tối đa (30 điểm)</span>
                      </div>
                      <div className="text-3xl font-extrabold text-green-600 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{passingRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Graphical progress */}
                  {results.length > 0 && (
                    <div className="bg-white border border-gray-150 p-5 rounded-xl shadow-xs">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span translate="no" className="notranslate">Biểu đồ tiến độ điểm số cá nhân gần nhất</span>
                      </h3>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[...results].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1971C2" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#1971C2" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tickStyle={{ fontSize: '10px' }} />
                            <YAxis domain={[0, 30]} tickCount={4} tickStyle={{ fontSize: '10px' }} />
                            <Tooltip contentStyle={{ fontSize: '12px' }} />
                            <Area type="monotone" dataKey="score" stroke="#1971C2" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* History Table list */}
                  <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
                      <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wider">
                        <span translate="no" className="notranslate">Danh sách kết quả học tập rèn luyện cá nhân</span>
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Ngày thi</span></th>
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Điểm đạt được</span></th>
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Thời gian làm bài</span></th>
                            <th className="py-3 px-5 font-bold text-right"><span translate="no" className="notranslate">Đánh giá</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {results.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-gray-400 text-xs italic">
                                <span translate="no" className="notranslate">Bạn chưa tham gia bất kỳ đợt thi thử nào.</span>
                              </td>
                            </tr>
                          ) : (
                            results.map((res) => (
                              <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3.5 px-5 font-mono text-xs text-gray-600">{res.date}</td>
                                <td className="py-3.5 px-5">
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    res.score === 30 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    <span translate="no" className="notranslate">{res.score}/30</span>
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-xs font-mono text-gray-500">
                                  <span translate="no" className="notranslate">{formatTimeInSeconds(res.duration)}</span>
                                </td>
                                <td className="py-3.5 px-5 text-right text-xs">
                                  {res.score === 30 ? (
                                    <span translate="no" className="notranslate text-green-600 font-extrabold uppercase tracking-wide">Xuất sắc (Đạt 100%)</span>
                                  ) : (
                                    <span translate="no" className="notranslate text-amber-600 font-extrabold uppercase tracking-wide">Chưa tối đa</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // =============== B. PHÂN TÍCH TẬP THỂ (BỘ PHẬN & CHI NHÁNH) ===============
                <div className="space-y-6">
                  {/* Department Name Callout */}
                  <div className="bg-blue-50 border border-blue-150 p-5 rounded-xl shadow-xs text-left">
                    <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#1971C2]" />
                      <span translate="no" className="notranslate">Không gian thi đua: {user.department}</span>
                    </h3>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      <span translate="no" className="notranslate">Phân tích quá trình học tập rèn luyện 3T của toàn thể nhân sự thuộc phòng <strong>{user.department}</strong> tại <strong>{user.branch}</strong>. Lãnh đạo và tập thể cùng chung tay hoàn thành xuất sắc mục tiêu 100%!</span>
                    </p>
                  </div>

                  {/* Collective summary stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Lập thành tích (Lượt thi bộ phận)</span>
                      </div>
                      <div className="text-3xl font-extrabold text-gray-950 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{deptTotalQuizzes} lượt</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Điểm trung bình bộ phận</span>
                      </div>
                      <div className="text-3xl font-extrabold text-[#1971C2] mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{deptAverageScore} / 30</span>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-150 p-5 rounded-xl text-center shadow-xs">
                      <div className="text-xs text-gray-455 font-semibold uppercase tracking-wider">
                        <span translate="no" className="notranslate">Tỷ lệ hoàn thành xuất sắc</span>
                      </div>
                      <div className="text-3xl font-extrabold text-green-600 mt-1.5 font-sans">
                        <span translate="no" className="notranslate">{deptPassingRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 3T Core Strength Analysis */}
                  <div className="bg-white border border-gray-150 p-6 rounded-xl shadow-xs space-y-6 text-left">
                    <div className="border-b border-gray-100 pb-3">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
                        <span translate="no" className="notranslate">Mức Độ Hoàn Thành 3 Giá Trị Cốt Lõi (3T)</span>
                      </h4>
                      <p className="text-xs text-gray-450 mt-1"><span translate="no" className="notranslate">Sức mạnh tập thể phản ánh qua tỉ lệ trả lời đúng cấu trúc câu hỏi 3T tại bộ phận của bạn.</span></p>
                    </div>

                    <div className="space-y-5">
                      {/* T1 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-bold">
                          <span translate="no" className="notranslate text-[#1971C2]">T1 - TRỌNG TÂM KHÁCH HÀNG</span>
                          <span translate="no" className="notranslate text-[#1971C2]">{deptT1Percent}%</span>
                        </div>
                        <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
                          <div style={{ width: `${deptT1Percent}%` }} className="bg-[#1971C2] h-full rounded-full transition-all duration-1000" />
                        </div>
                        <p className="text-[11px] text-gray-500 italic"><span translate="no" className="notranslate">Thấu hiểu nhu cầu của khách hàng nội bộ và khách hàng bên ngoài để phục vụ xuất sắc.</span></p>
                      </div>

                      {/* T2 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-bold">
                          <span translate="no" className="notranslate text-emerald-600">T2 - TINH GỌN (KAIZEN)</span>
                          <span translate="no" className="notranslate text-emerald-600">{deptT2Percent}%</span>
                        </div>
                        <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
                          <div style={{ width: `${deptT2Percent}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-1000" />
                        </div>
                        <p className="text-[11px] text-gray-500 italic"><span translate="no" className="notranslate">Làm đúng ngay từ đầu, giảm thiểu lãng phí và không ngừng cải tiến năng suất.</span></p>
                      </div>

                      {/* T3 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-bold">
                          <span translate="no" className="notranslate text-orange-600">T3 - TỐC ĐỘ QUYẾT LIỆT</span>
                          <span translate="no" className="notranslate text-orange-600">{deptT3Percent}%</span>
                        </div>
                        <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden">
                          <div style={{ width: `${deptT3Percent}%` }} className="bg-orange-500 h-full rounded-full transition-all duration-1000" />
                        </div>
                        <p className="text-[11px] text-gray-500 italic"><span translate="no" className="notranslate">Quyết liệt trong tư duy hành động, nhanh chóng giải quyết triệt để vấn đề.</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Inter-departmental Leaderboard */}
                  <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden text-left">
                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-150">
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-500" />
                        <span translate="no" className="notranslate">Bảng Xếp Hạng Thi Đua Học Tập Các Bộ Phận</span>
                      </h4>
                      <p className="text-xs text-gray-450 mt-1"><span translate="no" className="notranslate">Đánh giá thứ hạng dựa trên tổng điểm thi đua tích lũy và số lượt CBNV tham gia.</span></p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                            <th className="py-3 px-5 font-bold text-center w-16"><span translate="no" className="notranslate">Hạng</span></th>
                            <th className="py-3 px-5 font-bold"><span translate="no" className="notranslate">Bộ phận</span></th>
                            <th className="py-3 px-5 font-bold text-center"><span translate="no" className="notranslate"> CBNV tham gia (Lượt)</span></th>
                            <th className="py-3 px-5 font-bold text-center"><span translate="no" className="notranslate">Điểm trung bình</span></th>
                            <th className="py-3 px-5 font-bold text-center"><span translate="no" className="notranslate">Chọn xuất sắc (30đ)</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {deptLeaderboard.map((item, idx) => {
                            const isMyDept = item.name === user.department;
                            return (
                              <tr key={item.name} className={`hover:bg-gray-50/50 transition-colors ${isMyDept ? 'bg-blue-50/40 text-[#1971C2] font-semibold' : ''}`}>
                                <td className="py-4 px-5 text-center">
                                  {idx === 0 ? (
                                    <span translate="no" className="notranslate inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 font-bold font-mono">1</span>
                                  ) : idx === 1 ? (
                                    <span translate="no" className="notranslate inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-150 text-gray-800 font-bold font-mono">2</span>
                                  ) : idx === 2 ? (
                                    <span translate="no" className="notranslate inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 font-bold font-mono">3</span>
                                  ) : (
                                    <span translate="no" className="notranslate text-gray-500 font-mono">{idx + 1}</span>
                                  )}
                                </td>
                                <td className="py-4 px-5 font-sans leading-tight">
                                  <span translate="no" className="notranslate">{item.name}</span>
                                  {isMyDept && (
                                    <span translate="no" className="notranslate ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">Bộ phận của bạn</span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-center font-mono font-semibold"><span translate="no" className="notranslate">{item.count} lượt</span></td>
                                <td className="py-4 px-5 text-center font-mono text-[#1971C2] font-bold"><span translate="no" className="notranslate">{item.avg} / 30</span></td>
                                <td className="py-4 px-5 text-center font-mono font-semibold text-green-600"><span translate="no" className="notranslate">{item.rate}%</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Core Mock Interactive Quiz Section */}
          {activeTab === 'quiz' && (
            <motion.div
              key="quiz_portal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col h-full"
            >
              {!quizStarted ? (
                // Landing Screen for Practice Exams
                <div className="flex flex-col items-center justify-between text-center space-y-4 flex-1 h-full py-1 relative">
                  {/* 3T Logo replacing Trophy Icon */}
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B3A60] border border-blue-900 shadow-md select-none shrink-0">
                    <span translate="no" className="notranslate text-white text-2xl font-black tracking-tight font-sans">3T</span>
                  </div>

                  {/* VĂN HÓA 3T styled logo block */}
                  <div className="space-y-0.5 w-full text-center shrink-0 animate-fade-in">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-sans">
                      <span className="text-[#0B3A60] translate-no notranslate">VĂN HÓA </span>
                      <span className="text-[#E8590C] translate-no notranslate">3T</span>
                    </h1>
                    <h3 className="text-[9px] sm:text-[10px] font-semibold tracking-[0.1em] text-gray-400 font-sans uppercase mt-0.5">
                      <span translate="no" className="notranslate">{slogan}</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 max-w-xs mx-auto mt-1 leading-normal">
                      <span translate="no" className="notranslate">
                        Ứng Dụng Ôn Tập Quiz 3T Hàng Ngày
                      </span>
                    </p>
                  </div>

                  {/* Condensed responsive grid */}
                  <div className="bg-gray-50 border border-gray-150 p-2 rounded-xl w-full max-w-sm grid grid-cols-2 gap-2 text-left text-[10px] sm:text-xs shrink-0">
                    <div className="space-y-0.5">
                      <div className="text-[9px] text-gray-450 uppercase tracking-wider">Số câu hỏi</div>
                      <div className="font-bold text-gray-800">
                        <span translate="no" className="notranslate">03 câu (Ngẫu nhiên)</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] text-gray-455 uppercase tracking-wider">Thời gian tính</div>
                      <div className="font-bold text-gray-800">
                        <span translate="no" className="notranslate font-sans">Tự do rèn luyện</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] text-gray-455 uppercase tracking-wider">Tổng điểm tối đa</div>
                      <div className="font-bold text-gray-800">
                        <span translate="no" className="notranslate">30 Điểm (10đ / câu)</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] text-gray-455 uppercase tracking-wider">Trạng thái</div>
                      <div className="font-bold text-green-600">
                        <span translate="no" className="notranslate">Đã duyệt học viên</span>
                      </div>
                    </div>
                  </div>

                  {/* High Quality Exam Tips section */}
                  <div className="w-full max-w-sm bg-blue-50/30 border border-blue-50 p-2 rounded-xl text-left text-[10px] sm:text-[11px] font-sans text-gray-650 space-y-0.5 shrink-0">
                    <div className="font-semibold text-[#1971C2] flex items-center gap-1">
                      <span translate="no" className="notranslate">💡 Mẹo làm bài hiệu quả:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 leading-snug">
                      <li>
                        <span translate="no" className="notranslate">Đọc kỹ giải thích chi tiết đáp án để khắc cốt ghi tâm.</span>
                      </li>
                      <li>
                        <span translate="no" className="notranslate">Chủ động rèn luyện tình huống thực tế an toàn lao động.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Welcome Greeting Box for Employee */}
                  <div className="w-full max-w-sm bg-blue-50/50 border border-blue-100 p-2 rounded-xl text-center shrink-0">
                    <p className="text-[9px] text-[#1971C2] font-bold uppercase tracking-wider leading-none">Thành Viên Dự Thi</p>
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#0B3A60] mt-1 leading-snug">
                      Chào mừng: <span className="text-[#E8590C]">{user.name}</span>
                    </h4>
                    <p className="text-[9px] text-gray-450 mt-0.5">Bộ phận: {user.department}</p>
                  </div>

                  {/* Big Primary Start Button */}
                  <div className="w-full flex justify-center shrink-0">
                    <button
                      onClick={startQuiz}
                      className="w-full max-w-sm flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span translate="no" className="notranslate">Bắt Đầu Làm Bài Đánh Giá</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                  </div>

                  {/* Bottom Navigation Row: Ôn Tập (left), Đăng Xuất (middle) and Phân Tích (right) */}
                  <div className="w-full flex items-center justify-between pt-2 border-t border-gray-100 gap-1 sm:gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setActiveTab('practice');
                        setExpandedPracticeId(null);
                      }}
                      className="flex items-center gap-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer text-[10px] sm:text-xs font-bold"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>ÔN TẬP</span>
                    </button>

                    <button
                      onClick={onLogout}
                      className="flex items-center gap-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer text-[10px] sm:text-xs font-bold font-sans"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      <span>ĐĂNG XUẤT</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('history');
                        setAnalysisScope('personal');
                      }}
                      className="flex items-center gap-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer text-[10px] sm:text-xs font-bold"
                    >
                      <span>PHÂN TÍCH</span>
                      <BarChart3 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    </button>
                  </div>
                </div>
              ) : (
                // Active Quiz Form
                <div className="max-w-2xl mx-auto space-y-6">
                  {showResultsReview && lastQuizResult ? (
                    // Quiz Completed - Circular score percentage / Học từ sai Screen!
                    <div className="space-y-6">
                      {!reviewMode ? (
                        // 1. HIGH-FIDELITY RESULT SCREEN
                        <div className="bg-white border border-gray-150 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
                          <h2 className="text-lg font-bold text-gray-900 font-sans tracking-wide">
                            <span translate="no" className="notranslate">Kết quả</span>
                          </h2>

                          {/* Circular Score percentage ring drawing */}
                          <div className="relative h-44 w-44 flex items-center justify-center">
                            <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                              {/* Track */}
                              <circle 
                                cx="50" cy="50" r="40" 
                                stroke="#f1f5f9" strokeWidth="7" fill="transparent" 
                              />
                              {/* Score fill */}
                              <circle 
                                cx="50" cy="50" r="40" 
                                stroke="#1971C2" 
                                strokeWidth="7" fill="transparent" 
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={`${2 * Math.PI * 40 * (1 - lastQuizResult.score / 30)}`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            <div className="text-center z-10 flex flex-col items-center">
                              <span translate="no" className="notranslate text-4xl font-extrabold text-gray-950 block font-sans tracking-tight">
                                {lastQuizResult.score === 30 ? '30/30' : lastQuizResult.score === 20 ? '20/30' : lastQuizResult.score === 10 ? '10/30' : '0/30'}
                              </span>
                              <span translate="no" className="notranslate text-xs text-gray-400 font-medium block mt-1 tracking-wider uppercase">
                                Điểm số
                              </span>
                            </div>
                          </div>

                          {/* Badge Đạt yêu cầu */}
                          <div className="flex justify-center -mt-2">
                            <span className="px-4 py-1 border border-green-200 bg-green-50 text-green-700 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 shadow-sm">
                              Đạt yêu cầu
                            </span>
                          </div>

                          {/* Stat Grid (4 blocks matching exactly) */}
                          <div className="grid grid-cols-2 gap-4 w-full">
                            {/* Câu đúng */}
                            <div className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-gray-100 shadow-xs text-left">
                              <div className="w-11 h-11 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
                                <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                              </div>
                              <div>
                                <div className="text-xl font-bold text-gray-900 font-mono leading-tight">
                                  {String(lastQuizResult.score / 10).padStart(2, '0')}
                                </div>
                                <div className="text-xs text-gray-450 font-medium">Câu đúng</div>
                              </div>
                            </div>

                            {/* Câu sai */}
                            <div className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-gray-100 shadow-xs text-left">
                              <div className="w-11 h-11 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                                <XCircle className="h-5 w-5 stroke-[2.5]" />
                              </div>
                              <div>
                                <div className="text-xl font-bold text-gray-900 font-mono leading-tight">
                                  {String(3 - lastQuizResult.score / 10).padStart(2, '0')}
                                </div>
                                <div className="text-xs text-gray-450 font-medium">Câu sai</div>
                              </div>
                            </div>

                            {/* Bỏ qua */}
                            <div className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-gray-100 shadow-xs text-left">
                              <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
                                <div className="font-bold text-lg select-none">-</div>
                              </div>
                              <div>
                                <div className="text-xl font-bold text-gray-900 font-mono leading-tight">0</div>
                                <div className="text-xs text-gray-450 font-medium">Bỏ qua</div>
                              </div>
                            </div>

                            {/* Thời gian */}
                            <div className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-gray-100 shadow-xs text-left">
                              <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 stroke-[2.3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-base font-bold text-gray-900 font-mono leading-tight">
                                  {formatTimeInSeconds(lastQuizResult.duration)}
                                </div>
                                <div className="text-xs text-gray-450 font-medium">Thời gian</div>
                              </div>
                            </div>
                          </div>

                          {/* Accuracy block */}
                          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-xs w-full space-y-3 text-left">
                            <div className="flex justify-between items-center text-xs font-semibold text-gray-450 uppercase tracking-wider">
                              <span>Độ chính xác</span>
                              <span className="font-bold text-gray-900 font-mono text-sm">{Math.round((lastQuizResult.score / 30) * 100)}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                              <div style={{ width: `${(lastQuizResult.score / 30) * 100}%` }} className="bg-[#4ade80] h-full transition-all duration-500" />
                              <div style={{ width: `${((30 - lastQuizResult.score) / 30) * 100}%` }} className="bg-[#f87171] h-full transition-all duration-500" />
                            </div>
                            <div className="flex justify-center items-center gap-6 pt-1 text-xs text-gray-500 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4ade80]"></span>
                                <span>Đúng</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f87171]"></span>
                                <span>Sai</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#fbbf24]"></span>
                                <span>Bỏ qua</span>
                              </div>
                            </div>
                          </div>

                          {/* Control action buttons */}
                          <div className="flex gap-4 w-full pt-2">
                            <button
                              onClick={() => { setQuizStarted(false); setShowResultsReview(false); setReviewMode(false); }}
                              className="flex-1 py-3 px-4 bg-white border border-[#1971C2] text-[#1971C2] hover:bg-blue-50 font-bold rounded-lg text-xs md:text-sm shadow-xs transition-all active:scale-[0.98]"
                            >
                              Về trang chủ
                            </button>
                            <button
                              onClick={() => { setReviewMode(true); setReviewQuestionIndex(0); }}
                              className="flex-1 py-3 px-4 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold rounded-lg text-xs md:text-sm shadow-md transition-all active:scale-[0.98]"
                            >
                              Xem câu trả lời
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 2. HIGH-FIDELITY REVIEW SCREEN (HỌC TỪ SAI)
                        <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-6 max-w-lg mx-auto">
                          {/* Upper Header Review Title */}
                          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <button 
                              onClick={() => setReviewMode(false)}
                              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-700 transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <h2 className="text-lg font-bold text-gray-900 font-sans tracking-wide">
                              Câu trả lời
                            </h2>
                            <div className="w-9 h-9"></div> {/* Spacer balance */}
                          </div>

                          {currentQuizQuestions.length > 0 && (
                            <div className="space-y-4">
                              <div className="text-left space-y-1">
                                <span className="text-xs font-bold text-gray-400 font-mono block">CÂU HỎI {reviewQuestionIndex + 1}</span>
                                <h3 className="text-base font-sans font-bold text-gray-800 leading-snug">
                                  {currentQuizQuestions[reviewQuestionIndex].text}
                                </h3>
                              </div>

                              {currentQuizQuestions[reviewQuestionIndex].imageUrl && (
                                <div className="rounded-md overflow-hidden max-h-56 border border-gray-100 flex justify-center bg-gray-50">
                                  <img 
                                    src={currentQuizQuestions[reviewQuestionIndex].imageUrl} 
                                    alt="Sơ đồ minh hoạ" 
                                    className="object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                              {/* Interactive Answer Options List (High Fidelity Option Highlight) */}
                              <div className="grid grid-cols-1 gap-2.5 pt-2">
                                {currentQuizQuestions[reviewQuestionIndex].options.map((opt, oIdx) => {
                                  const question = currentQuizQuestions[reviewQuestionIndex];
                                  const selectedIdx = selectedAnswers[question.id];
                                  const isCorrectOpt = oIdx === question.correctAnswerIndex;
                                  const isSelected = selectedIdx === oIdx;

                                  let containerStyle = "border-gray-200 bg-white hover:bg-gray-50/50";
                                  let textStyle = "text-gray-700 font-medium";
                                  let radioShapeStyle = "border-gray-300 text-gray-400";
                                  let radioActiveDot = false;

                                  if (isCorrectOpt) {
                                    containerStyle = "border-[#4ade80] bg-[#f0fdf4] text-green-900 font-medium shadow-2xs ring-1 ring-[#48bb78]";
                                    textStyle = "text-green-800 font-semibold";
                                    radioShapeStyle = "border-green-600 text-green-600 bg-green-50";
                                    radioActiveDot = true;
                                  } else if (isSelected) {
                                    containerStyle = "border-red-300 bg-red-50/50 text-red-900 font-medium ring-1 ring-red-400";
                                    textStyle = "text-red-800 font-semibold";
                                    radioShapeStyle = "border-red-600 text-red-600 bg-red-50";
                                    radioActiveDot = true;
                                  }

                                  return (
                                    <div 
                                      key={oIdx} 
                                      className={`w-full p-4 text-xs md:text-sm rounded-xl border flex items-center gap-3 transition-all ${containerStyle}`}
                                    >
                                      {/* Radio dot element */}
                                      <div className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center border ${radioShapeStyle}`}>
                                        {radioActiveDot && (
                                          <div className={`h-2.5 w-2.5 rounded-full ${isCorrectOpt ? 'bg-green-600' : 'bg-red-600'}`} />
                                        )}
                                      </div>
                                      <div className={`flex-1 text-xs md:text-sm ${textStyle}`}>
                                        {opt}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Custom failure warning banner / explanation */}
                              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-xl text-xs md:text-sm text-orange-950 mt-4 leading-relaxed">
                                <h5 className="font-bold text-orange-850 flex items-center gap-1.5 mb-1">
                                  <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                                  <span>Dặn dò & Giải thích lãnh đạo:</span>
                                </h5>
                                <p className="font-semibold italic">
                                  "Anh/Chị nhớ nhé: {currentQuizQuestions[reviewQuestionIndex].explanation}"
                                </p>
                              </div>

                              {/* Footer Action controls */}
                              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <button
                                  disabled={reviewQuestionIndex === 0}
                                  onClick={() => setReviewQuestionIndex(prev => prev - 1)}
                                  className="px-5 py-2.5 bg-white border border-[#1971C2] text-[#1971C2] rounded-lg text-xs md:text-sm font-bold disabled:opacity-40 transition-colors"
                                >
                                  Câu trước
                                </button>

                                {reviewQuestionIndex < 2 ? (
                                  <button
                                    onClick={() => setReviewQuestionIndex(prev => prev + 1)}
                                    className="px-5 py-2.5 bg-[#1971C2] hover:bg-opacity-95 text-white rounded-lg text-xs md:text-sm font-bold transition-colors shadow-xs"
                                  >
                                    Câu tiếp theo
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setReviewMode(false)}
                                    className="px-5 py-2.5 bg-[#1971C2] hover:bg-opacity-95 text-white rounded-lg text-xs md:text-sm font-bold transition-colors shadow-xs"
                                  >
                                    Kết thúc
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Quiz in Progress - Active Screen with Company App Bar layout
                    <div className="flex flex-col justify-between flex-1 h-full space-y-2.5">
                      {/* Company App style Header bar with Back button < */}
                      <div className="bg-white border border-gray-150 rounded-xl py-2 px-3 flex items-center justify-between shadow-xs shrink-0 z-10 select-none">
                        <button
                          type="button"
                          onClick={() => {
                            const newClicks = backClicksCount + 1;
                            setBackClicksCount(newClicks);

                            // Pressed 2 or more times -> goes straight back to landing dashboard
                            if (newClicks >= 2) {
                              setQuizStarted(false);
                              setShowResultsReview(false);
                              setReviewMode(false);
                              setBackClicksCount(0);
                              setErrorState(null);
                              setQuizInfoMessage(null);
                              return;
                            }

                            if (currentQuestionIndex === 0) {
                              setQuizInfoMessage(null);
                              setErrorState("Anh/Chị đang ở câu hỏi 1. Ấn BACK lần 2 sẽ quay về trang chủ. Hoặc hãy sang câu 2, câu 3 mới có thể làm lại câu 1.");
                              return;
                            }
                            if (backChanceUsed) {
                              setQuizInfoMessage(null);
                              setErrorState("Anh/Chị đã sử dụng cơ hội quay lại làm lại duy nhất trong đợt thi này! Ấn BACK lần 2 sẽ quay về trang chủ.");
                              return;
                            }
                            
                            // Successful activation of one-time back retry!
                            if (questions.length >= 3) {
                              const shuffled = [...questions].sort(() => 0.5 - Math.random());
                              const selected = shuffled.slice(0, 3);
                              setCurrentQuizQuestions(selected);
                            }
                            setSelectedAnswers({}); // Xóa sạch các câu đã chọn để làm lại mới hoàn toàn
                            setCurrentQuestionIndex(0); // Quay lại làm lại từ đầu từ câu 1
                            setBackChanceUsed(true);
                            setErrorState(null);
                            setQuizInfoMessage("Chúc mừng! Anh/Chị đã kích hoạt Quyền Làm Lại duy nhất. Hệ thống đã đổi bộ câu hỏi ngẫu nhiên mới và đưa Anh/Chị về lại câu số 1! (Ấn BACK một lần nữa sẽ quay về trang chủ)");
                          }}
                          className="p-1 px-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors flex items-center justify-center border border-gray-200 shadow-2xs focus:outline-none"
                          title="Quay lại làm lại hoặc quay về trang chủ"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-[3] text-[#0B3A60]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className="text-center flex-1">
                          <h2 className="text-xs sm:text-sm font-extrabold text-gray-905 font-sans tracking-tight">
                            <span translate="no" className="notranslate">Bài đánh giá</span>
                          </h2>
                          <p className="text-[9px] text-[#E8590C] font-extrabold uppercase tracking-wide">
                            <span translate="no" className="notranslate">{slogan}</span>
                          </p>
                        </div>
                        
                        {/* Right Pill for Back Opportunity */}
                        <div className="flex items-center shrink-0">
                          {!backChanceUsed ? (
                            <span className="bg-green-100 text-green-800 border border-green-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-3xs">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              <span translate="no" className="notranslate">Sẵn sàng BACK (1)</span>
                            </span>
                          ) : (
                            <span className="bg-gray-105 text-gray-400 border border-gray-150 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                              <span translate="no" className="notranslate">Hết quyền BACK</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main quiz interface - cardless for maximum compact layout */}
                      <div className="flex-1 flex flex-col justify-between space-y-2.5">
                        
                        {/* Progress display and countdown timer on same row */}
                        <div className="space-y-1 shrink-0">
                          <div className="flex justify-between items-center text-[10px] sm:text-xs font-semibold text-gray-500">
                            <div>
                               <span translate="no" className="notranslate">{currentQuestionIndex + 1}/3 câu hỏi</span>
                            </div>
                            <div className="bg-green-50 border border-green-100 text-green-700 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 text-[10px] sm:text-xs">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span translate="no" className="notranslate">{formatTimeInSeconds(quizTimer)}</span>
                            </div>
                          </div>
                          
                          {/* Continuous progress line exactly like company app bar */}
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#1971C2] h-full transition-all duration-300 rounded-full" 
                              style={{ width: `${((currentQuestionIndex + 1) / 3) * 100}%` }} 
                            />
                          </div>
                        </div>

                        {/* Ultra-compact micro-notice for BACK advice - addressing screenshot red arrow comment! */}
                        <div className="bg-blue-50/50 border border-blue-100 px-2 py-1.5 rounded-lg text-left shrink-0">
                          <p className="text-[10px] sm:text-[11px] text-blue-800 leading-normal font-sans">
                            💡 <b>Mẹo sửa sai:</b> Nếu chọn nhầm, ấn nút <b>BACK (&larr;)</b> ở góc trên cùng để đổi đề và làm lại từ câu 1 (duy nhất 1 lần).
                          </p>
                        </div>

                        {/* Notice messages / Success or Warning */}
                        {quizInfoMessage && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-green-50/80 p-2 text-xs text-green-800 border border-green-150 font-sans text-left shrink-0 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></span>
                            <span translate="no" className="notranslate font-semibold">{quizInfoMessage}</span>
                          </div>
                        )}

                        {errorState && (
                          <div className="flex items-start gap-1.5 rounded-lg bg-red-50/80 p-2 text-xs text-red-700 border border-red-155 font-sans text-left shrink-0">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                            <span translate="no" className="notranslate">{errorState}</span>
                          </div>
                        )}

                        {/* Question display */}
                        {currentQuizQuestions.length > 0 && (
                          <div className="flex-1 flex flex-col justify-center space-y-2.5 text-left font-sans">
                            <div className="text-[9px] font-bold text-gray-400 tracking-wide uppercase shrink-0">
                              <span translate="no" className="notranslate">CÂU HỎI {currentQuestionIndex + 1}</span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-sans font-extrabold text-gray-950 leading-snug shrink-0">
                              <span translate="no" className="notranslate">{currentQuizQuestions[currentQuestionIndex].text}</span>
                            </h3>

                            {/* Image illustration if present */}
                            {currentQuizQuestions[currentQuestionIndex].imageUrl && (
                              <div className="rounded-lg overflow-hidden max-h-[105px] sm:max-h-[145px] border border-gray-100 flex justify-center bg-gray-50 my-1 shrink-0">
                                <img 
                                  src={currentQuizQuestions[currentQuestionIndex].imageUrl} 
                                  alt="Sơ đồ câu hỏi" 
                                  className="object-contain h-full"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {/* Options list styling matching Company visual system */}
                            <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                              {currentQuizQuestions[currentQuestionIndex].options.map((opt, oIdx) => {
                                const qId = currentQuizQuestions[currentQuestionIndex].id;
                                const isSelected = selectedAnswers[qId] === oIdx;
                                
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => {
                                      handleSelectOption(qId, oIdx);
                                      // Clear temporary success messages when selecting
                                      setQuizInfoMessage(null);
                                    }}
                                    className={`w-full text-left p-2.5 sm:p-3 text-xs rounded-xl border transition-all flex items-center gap-2 active:scale-[0.99] group ${
                                      isSelected 
                                      ? 'bg-blue-50 border-[#1971C2] text-[#1971C2] font-bold ring-1 ring-[#1971C2]' 
                                      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                                    }`}
                                  >
                                    <div className={`h-4.5 w-4.5 rounded-full shrink-0 flex items-center justify-center border font-sans text-[10px] font-bold transition-all ${
                                      isSelected 
                                      ? 'bg-[#1971C2] text-white border-[#1971C2]' 
                                      : 'border-gray-200 text-gray-450'
                                    }`}>
                                      {String.fromCharCode(65 + oIdx)}
                                    </div>
                                    <div className="flex-1 text-[11px] sm:text-xs">
                                      <span translate="no" className="notranslate">{opt}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Slide/Submit buttons styled explicitly matching the custom design */}
                        <div className="flex justify-between items-center pt-2 sm:pt-2.5 border-t border-gray-100 gap-3 font-sans shrink-0">
                          <button
                            disabled={currentQuestionIndex === 0}
                            onClick={() => {
                              setCurrentQuestionIndex(prev => prev - 1);
                              setQuizInfoMessage(null);
                            }}
                            className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <span translate="no" className="notranslate">Câu Trước</span>
                          </button>

                          {currentQuestionIndex < 2 ? (
                            <button
                              onClick={() => {
                                setCurrentQuestionIndex(prev => prev + 1);
                                setQuizInfoMessage(null);
                              }}
                              className="px-5 py-2 bg-[#0B3A60] hover:bg-[#0B3A60]/90 border border-transparent text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                            >
                              <span translate="no" className="notranslate">Tiếp Theo</span>
                            </button>
                          ) : (
                            <button
                              onClick={submitQuiz}
                              className="px-5 py-2 bg-green-600 hover:bg-green-700 border border-transparent text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                            >
                              <span translate="no" className="notranslate">Nộp Bài Thi</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
