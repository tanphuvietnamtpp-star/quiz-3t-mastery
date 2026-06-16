import React, { useState, useEffect, useRef } from 'react';
import { databaseService } from '../firebase';
import { User, ChatTopic, ChatMessage, QuizResult, LevelRulesConfig } from '../types';
import { 
  MessageSquare, Send, Plus, Search, ArrowLeft, Home, 
  ArrowUp, Sparkles, Clock, User as UserIcon, CheckCircle2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateInactivityAugmentedLevel } from '../utils/levelCalculator';

const DEFAULT_LEVEL_RULES: LevelRulesConfig = {
  introduction: "Để khuyến khích thái độ kiên trì luyện tập, tạo phản xạ nhạy bén và nâng cao chuyên môn, hệ thống Quiz 3T Mastery áp dụng cơ chế phân hạng và thay đổi cấp độ tự động.",
  inactivityTitle: "Quy Định Duy Trì & Không Hoạt Động",
  levels: [
    { level: 1, name: "Cấp 1: Tân Binh", emoji: "🌱", promotion: "Bắt đầu.", demotion: "", maxTime: "90s/câu", reactionPoints: [] },
    { level: 2, name: "Cấp 2: Chiến Binh", emoji: "⚡", promotion: "10 lượt liên tục", demotion: "Dưới 15 điểm", maxTime: "90s/câu", reactionPoints: [] },
    { level: 3, name: "Cấp 3: Thống Lĩnh", emoji: "🔥", promotion: "15 lượt liên tục", demotion: "Dưới 20 điểm", maxTime: "90s/câu", reactionPoints: [] },
    { level: 4, name: "Cấp 4: Tối Cao", emoji: "👑", promotion: "20 lượt liên tục", demotion: "Dưới 25 điểm", maxTime: "90s/câu", reactionPoints: [] },
    { level: 5, name: "Cấp 5: Huyền Thoại", emoji: "🏆", promotion: "Giữ nguyên", demotion: "Duy trì >=2 lượt/ngày và điểm TB >= 20/30đ (từ 17/06/2026)", maxTime: "90s/câu", reactionPoints: [] }
  ],
  inactivityRule1: "",
  inactivityRule2: ""
};

interface ConversationExchangeProps {
  user: User;
  onBackToHome: () => void;
  isMobileView?: boolean;
}

export default function ConversationExchange({ 
  user, 
  onBackToHome,
  isMobileView = false 
}: ConversationExchangeProps) {
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<ChatTopic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [topicToDeleteId, setTopicToDeleteId] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // States for Personnel (Tab switching for Admin view)
  const [activeTab, setActiveTab] = useState<'users' | 'topics'>('topics');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [levelRules, setLevelRules] = useState<LevelRulesConfig | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  // Loading indicator states
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);

  // Scroll references
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user.role === 'admin' || user.role === 'executive';

  // 1. Subscribe to Chat Topics
  useEffect(() => {
    setIsLoadingTopics(true);
    const unsubscribe = databaseService.subscribeChatTopics((allTopics) => {
      // Automatically detect and delete empty chat rooms (excluding the active one)
      const emptyTopics = allTopics.filter(t => {
        const isEmptyText = t.lastMessageText === 'Chưa có cuộc hội thoại nào.' || t.lastMessageText === 'Chưa gửi tin nhắn' || !t.lastMessageText;
        // Only auto-delete if it's not the active one
        return isEmptyText && selectedTopic?.id !== t.id;
      });

      if (emptyTopics.length > 0) {
        emptyTopics.forEach(t => {
          databaseService.deleteChatTopic(t.id).catch(err => {
            console.error("Error auto-deleting empty topic:", t.id, err);
          });
        });
      }

      // Filter topics based on identity: Admin sees all, employee only sees their own
      // Also filter out empty ones so the UI looks instantly clean
      const filtered = (isAdmin ? allTopics : allTopics.filter(t => t.createdBy === user.id))
        .filter(t => {
          if (selectedTopic?.id === t.id) return true;
          const isEmptyText = t.lastMessageText === 'Chưa có cuộc hội thoại nào.' || t.lastMessageText === 'Chưa gửi tin nhắn' || !t.lastMessageText;
          return !isEmptyText;
        });

      setTopics(filtered);
      setIsLoadingTopics(false);

      // Keep selected topic details synchronized in real-time
      if (selectedTopic) {
        const updated = filtered.find(t => t.id === selectedTopic.id);
        if (updated) {
          setSelectedTopic(updated);
        }
      }
    });

    return () => unsubscribe();
  }, [user.id, isAdmin, selectedTopic?.id]);

  // 2. Subscribe to Chat Messages when topic is selected
  useEffect(() => {
    if (!selectedTopic) {
      setMessages([]);
      return;
    }

    // Mark current topic as read
    databaseService.markTopicAsRead(selectedTopic.id, isAdmin);

    const unsubscribe = databaseService.subscribeChatMessages(selectedTopic.id, (msgs) => {
      setMessages(msgs);
      // Auto-scroll to bottom of conversation
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [selectedTopic?.id, isAdmin]);

  // Scroll to bottom helper
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Load and sync Registered Personnel lists + results + rules for level calculations
  useEffect(() => {
    if (!isAdmin) return;

    setIsLoadingUsers(true);
    databaseService.getUsers().then(vals => {
      if (vals) setUsers(vals);
    }).catch(err => console.error("Error loading users for exchange:", err))
      .finally(() => setIsLoadingUsers(false));

    // Subscribe to real-time scores output
    const unsubscribeResults = databaseService.subscribeQuizResults((allResults) => {
      setQuizResults(allResults || []);
    });

    // Load active Level rules
    databaseService.getLevelRules().then(rules => {
      if (rules) setLevelRules(rules);
    }).catch(err => console.error("Error fetching rules for exchange lists:", err));

    return () => {
      unsubscribeResults();
    };
  }, [isAdmin]);

  // Route to or create a discussion topic with selected user profile
  const handleSelectUser = async (targetUser: User) => {
    // Find existing topics created by or related to this user
    const existingTopics = topics.filter(t => t.createdBy === targetUser.id);

    if (existingTopics.length > 0) {
      // Sort and pick most recent
      const sorted = [...existingTopics].sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime()
      );
      setSelectedTopic(sorted[0]);
      setActiveTab('topics'); // Redirect back to topics pane to view the thread
    } else {
      // Lazy construct fresh private conversation room with target employee
      const topicId = 'topic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newTopic: ChatTopic = {
        id: topicId,
        title: `Trao đổi với ${targetUser.name}`,
        createdBy: targetUser.id,
        createdByName: targetUser.name,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        lastMessageText: 'Chưa có cuộc hội thoại nào.',
        unreadForAdmin: false,
        unreadForUser: false
      };

      try {
        await databaseService.saveChatTopic(newTopic);
        // Avoid wait delay, prepopulate locally
        setTopics(prev => [newTopic, ...prev]);
        setSelectedTopic(newTopic);
        setActiveTab('topics'); // Focus topics view to see thread active
      } catch (err) {
        console.error('Lỗi khi khởi tạo kênh chat với nhân sự:', err);
      }
    }
  };

  // Handle detection of scrolling for float buttons
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 300) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 3. Create a New Exchange Topic (Chủ đề mới)
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrimmed = newTopicTitle.trim();
    if (!titleTrimmed) return;

    const newTopic: ChatTopic = {
      id: 'topic_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: titleTrimmed,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      lastMessageText: 'Chưa có cuộc hội thoại nào.',
      unreadForAdmin: true,
      unreadForUser: false
    };

    try {
      await databaseService.saveChatTopic(newTopic);
      setNewTopicTitle('');
      setShowCreateModal(false);
      
      // Auto-select newly created topic
      setSelectedTopic(newTopic);
    } catch (err) {
      console.error('Error creating chat topic:', err);
    }
  };

  // Delete a chat topic
  const handleDeleteTopic = (topicId: string) => {
    if (!isAdmin) return;
    setTopicToDeleteId(topicId);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDeleteId) return;
    try {
      await databaseService.deleteChatTopic(topicToDeleteId);
      if (selectedTopic?.id === topicToDeleteId) {
        setSelectedTopic(null);
      }
      setTopics(prev => prev.filter(t => t.id !== topicToDeleteId));
    } catch (err) {
      console.error("Lỗi khi xóa cuộc hội thoại:", err);
    } finally {
      setTopicToDeleteId(null);
    }
  };

  // 4. Send a Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const msgText = newMessageText.trim();
    if (!msgText || !selectedTopic) return;

    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newMsg: ChatMessage = {
      id: messageId,
      topicId: selectedTopic.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: msgText,
      createdAt: new Date().toISOString()
    };

    try {
      setNewMessageText('');
      await databaseService.saveChatMessage(newMsg);
      // Ensure local read-state marked active
      databaseService.markTopicAsRead(selectedTopic.id, isAdmin);
    } catch (err) {
      console.error('Error saving chat message:', err);
    }
  };

  // Helper to format Vietnamese readable date and time
  const formatMsgDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString().substring(2)}`;
      const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return `${dateStr} ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  // Filter topics based on search term
  const filteredTopics = topics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.createdByName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter registered users based on search term (excluding current admin themselves)
  const filteredUsers = users.filter(u => {
    if (u.id === user.id) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.branch && u.branch.toLowerCase().includes(q))
    );
  });

  // Render Mobile Layout: either shows Topic List OR Active Chat Pane
  const renderMobileExchange = () => {
    if (selectedTopic) {
      // 1. Mobile Active Conversation Screen
      return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 font-sans relative">
          {/* Active Chat Header */}
          <div className="h-12 bg-white border-b border-gray-150 flex items-center px-3 justify-between shrink-0 shadow-3xs">
            <button 
              onClick={() => setSelectedTopic(null)}
              className="flex items-center gap-1 text-slate-650 hover:text-slate-900 font-extrabold text-xs py-1"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Quay lại</span>
            </button>
            <div className="text-center flex-1 mx-2 min-w-0">
              <h4 className="text-[11px] font-black uppercase text-slate-800 truncate leading-tight">
                {selectedTopic.title}
              </h4>
              <p className="text-[9px] text-[#E67E22] font-semibold truncate leading-none mt-0.5 animate-pulse">
                {isAdmin ? `CBNV: ${selectedTopic.createdByName}` : 'Trao đổi với Ban quản trị'}
              </p>
            </div>
            {isAdmin ? (
              <button
                onClick={() => handleDeleteTopic(selectedTopic.id)}
                className="text-red-500 hover:text-red-700 p-2 rounded-md transition-all active:scale-95 cursor-pointer shrink-0"
                title="Xóa cuộc trò chuyện"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-8"></div>
            )}
          </div>

          {/* Chat Messages Stream */}
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3.5 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4">
                <div className="h-12 w-12 rounded-full bg-[#1971C2]/5 flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-[#1a73e8] animate-bounce" />
                </div>
                <h5 className="text-xs font-bold text-gray-700">Bắt đầu cuộc trao đổi</h5>
                <p className="text-[10px] text-gray-500 mt-1 leading-snug max-w-xs">
                  Nhập tin nhắn bên dưới để phản hồi, giải quyết sự cố hoặc chia sẻ vấn đề phát sinh của bạn.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMsgSenderAdmin = msg.senderRole === 'admin' || msg.senderRole === 'executive';
                // User rules:
                // - Admin message is solid blue (bg-blue-600) with white text.
                // - CBNV message is white (bg-white) with dark text.
                const bubbleStyle = isMsgSenderAdmin
                  ? "bg-[#1A73E8] text-white rounded-2xl rounded-tr-none ml-auto"
                  : "bg-white text-slate-800 border border-gray-150 rounded-2xl rounded-tl-none mr-auto shadow-4xs";

                const dateDisplay = formatMsgDate(msg.createdAt);
                const isLNT = msg.senderName.trim().toUpperCase() === 'LÊ NHẬT TRƯỜNG' || msg.senderName.trim().toUpperCase() === 'LE NHAT TRUONG';
                const senderDisplay = isMsgSenderAdmin 
                  ? (isLNT ? 'BAN QUẢN TRỊ (ADMIN)' : 'TÔI (ADMIN)') 
                  : msg.senderName;

                return (
                  <div key={msg.id} className="flex flex-col w-full">
                    {/* Header: Sender name and timestamp */}
                    <div className={`flex items-center gap-1.5 text-[9px] mb-1 px-1 font-sans ${isMsgSenderAdmin ? 'justify-end text-slate-550' : 'justify-start text-gray-500'}`}>
                      <span className="font-extrabold">{senderDisplay}</span>
                      <span className="text-gray-400">•</span>
                      <span>{dateDisplay}</span>
                    </div>

                    {/* Chat Bubble */}
                    <div className={`max-w-[85%] px-3 py-2 text-xs leading-normal font-medium whitespace-pre-wrap break-words ${bubbleStyle}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat text Input panel */}
          <form 
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white border-t border-gray-150 flex items-center gap-2 shrink-0 shadow-3xs"
          >
            <input 
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 bg-slate-50 border border-gray-250 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#1971C2] focus:border-[#1971C2] text-slate-800 leading-normal"
              placeholder="Nhập nội dung trao đổi..."
            />
            <button
              type="submit"
              disabled={!newMessageText.trim()}
              className="h-9 w-9 bg-[#1A73E8] hover:bg-opacity-95 text-white rounded-xl flex items-center justify-center shrink-0 cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <Send className="h-4 w-4 shrink-0" />
            </button>
          </form>

          {/* Mobile Chat Floating Action Buttons (Scroll top & Home) */}
          <div className="absolute bottom-16 right-4 z-40 flex flex-col gap-2.5">
            <AnimatePresence>
              {showScrollTop && (
                <motion.button
                  key="mob_top_btn"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={scrollToTop}
                  className="w-10 h-10 bg-[#0B3A60]/95 text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 cursor-pointer shrink-0"
                  title="Cuộn lên đầu dòng"
                >
                  <ArrowUp className="h-5 w-5" />
                </motion.button>
              )}
            </AnimatePresence>

            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={onBackToHome}
              className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg border border-white/10 cursor-pointer shrink-0 animate-pulse-slow"
              title="Quay về Trang chủ"
            >
              <Home className="h-4.5 w-4.5" />
            </motion.button>
          </div>
        </div>
      );
    }

    // 2. Mobile Topic Selection Screen
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 font-sans relative">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-gray-150 p-3 bg-white shrink-0 shadow-3xs">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 py-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sảnh chính</span>
          </button>
          <span className="text-[13px] font-extrabold text-[#1971C2] uppercase tracking-wide flex items-center gap-1">
            <MessageSquare className="h-4 w-4 text-[#1971C2] animate-pulse" />
            TRAO ĐỔI HỖ TRỢ
          </span>
          <div className="text-[10px] text-[#0B3A60] font-black uppercase text-right shrink-0">
            {activeTab === 'users' ? `${filteredUsers.length} nhân sự` : `${filteredTopics.length} chủ đề`}
          </div>
        </div>

        {/* Toggle Switch for Mobile (Only for Admin to select Personnel vs Topics) */}
        {isAdmin && (
          <div className="px-3 py-2 bg-white border-b border-gray-100 shrink-0 flex justify-center">
            <div className="bg-slate-100 p-0.5 rounded-full flex w-full relative border border-slate-180">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  setSearchQuery('');
                }}
                className={`flex-1 text-center py-1.5 text-xs font-bold rounded-full transition-all relative z-10 ${
                  activeTab === 'users' ? 'text-[#1971C2]' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {activeTab === 'users' && (
                  <motion.div
                    layoutId="activePillMobile"
                    className="absolute inset-0 bg-white rounded-full shadow-xs border border-gray-200"
                    transition={{ type: 'spring', duration: 0.3 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1">
                  <UserIcon className="h-3.5 w-3.5" />
                  Nhân sự
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('topics');
                  setSearchQuery('');
                }}
                className={`flex-1 text-center py-1.5 text-xs font-bold rounded-full transition-all relative z-10 ${
                  activeTab === 'topics' ? 'text-[#1971C2]' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {activeTab === 'topics' && (
                  <motion.div
                    layoutId="activePillMobile"
                    className="absolute inset-0 bg-white rounded-full shadow-xs border border-gray-200"
                    transition={{ type: 'spring', duration: 0.3 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chủ đề
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Searching and New Topic button bar */}
        <div className="p-2 bg-white border-b border-gray-150 flex gap-2 shrink-0 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 border border-gray-250 rounded-lg text-xs bg-slate-50 text-slate-800 font-sans leading-normal focus:ring-1 focus:ring-[#1971C2]"
              placeholder={activeTab === 'users' ? "Tìm theo tên, SĐT, mã NV..." : "Tìm kiếm chủ đề..."}
            />
          </div>
          {activeTab === 'topics' && !isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#1971C2] hover:bg-opacity-95 text-white text-[10px] font-black px-2.5 py-2.5 sm:py-2 rounded-lg flex items-center gap-1 cursor-pointer shrink-0 uppercase border-b-2 border-[#125899] active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo Mới</span>
            </button>
          )}
        </div>

        {/* Topics/Users List view */}
        <div 
          ref={listContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-2.5 space-y-2"
        >
          {activeTab === 'users' ? (
            isLoadingUsers ? (
              <div className="text-center py-12 text-slate-400 font-bold text-xs">
                <div className="animate-spin h-5 w-5 border-2 border-[#1971C2] border-t-transparent rounded-full mx-auto mb-3" />
                Đang tải danh sách nhân sự...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs bg-white rounded-xl p-4 border border-gray-150">
                Không tìm thấy nhân sự phù hợp.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const empResults = quizResults.filter(r => 
                  (r.userId && r.userId === u.id) || 
                  (u.phone && r.userId === u.phone) || 
                  (r.userName && r.userName.toLowerCase().trim() === u.name.toLowerCase().trim())
                );
                const state = calculateInactivityAugmentedLevel(u.id, empResults, levelRules || DEFAULT_LEVEL_RULES);
                
                return (
                  <div 
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="p-3 border border-gray-150 rounded-xl bg-white hover:bg-gray-50 flex items-center justify-between gap-3 shadow-4xs cursor-pointer text-left transition-all hover:scale-[1.01]"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[11.5px] font-black text-slate-900 leading-snug flex items-center gap-1.5 truncate">
                        <span>{u.name}</span>
                        {u.employeeId && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-1 rounded font-bold shrink-0">
                            {u.employeeId}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate uppercase font-semibold">
                        {u.department} • {u.branch}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-500 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{empResults.length} lượt thi</span>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] font-black px-2 mt-0.5 py-0.5 rounded-full flex items-center gap-0.5 border shrink-0 ${
                      state.level === 5 ? 'bg-amber-50 border-amber-300 text-amber-800' :
                      state.level === 4 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                      state.level === 3 ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
                      state.level === 2 ? 'bg-blue-50 border-blue-250 text-blue-700' :
                      'bg-zinc-50 border-zinc-200 text-zinc-650'
                    }`}>
                      Cấp {state.level}
                    </span>
                  </div>
                );
              })
            )
          ) : (
            isLoadingTopics ? (
              <div className="text-center py-12 text-slate-400 font-bold text-xs">
                <div className="animate-spin h-5 w-5 border-2 border-[#1971C2] border-t-transparent rounded-full mx-auto mb-3" />
                Đang tải danh sách trao đổi...
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs bg-white rounded-xl p-4 border border-gray-150">
                Chưa có chủ đề trao đổi nào phù hợp. 
                {!isAdmin && " Nhấn 'Tạo mới' để bắt đầu trao đổi với Ban quản trị!"}
              </div>
            ) : (
              filteredTopics.map((topic) => {
                const isUnread = isAdmin ? topic.unreadForAdmin : topic.unreadForUser;
                return (
                  <div 
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer bg-white relative hover:scale-[1.01] active:scale-99 ${
                      isUnread 
                        ? 'border-[#1971C2] ring-1 ring-[#1971C2]/15 bg-blue-50/5' 
                        : 'border-slate-150 shadow-4xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-[11.5px] font-extrabold text-slate-800 leading-snug line-clamp-2">
                        {topic.title}
                      </h5>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnread && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 animate-pulse uppercase">
                            MỚI
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTopic(topic.id);
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                            title="Xóa cuộc trò chuyện"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-1 leading-normal italic font-medium">
                      {topic.lastMessageText || 'Chưa có tin nhắn'}
                    </p>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 mt-2 text-[9px] text-gray-400 font-sans">
                      <div className="flex items-center gap-1 text-slate-600 font-semibold truncate max-w-[150px]">
                        <UserIcon className="h-3 w-3 text-[#1971C2] shrink-0" />
                        <span>{topic.createdByName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 font-mono shrink-0">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        <span>{formatMsgDate(topic.lastMessageAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Float buttons in lists */}
        <div className="absolute bottom-6 right-4 z-45 flex flex-col gap-2.5">
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={onBackToHome}
            className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg border border-white/10 cursor-pointer shrink-0 animate-pulse-slow"
            title="Quay về Trang chủ"
          >
            <Home className="h-4.5 w-4.5" />
          </motion.button>
        </div>

        {/* Mobile New Topic Create Dialog Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-150 flex flex-col"
              >
                <div className="p-4 bg-[#1971C2] text-white shrink-0 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Tạo cuộc thảo luận mới
                  </h3>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="text-white hover:text-red-200 text-xs font-black p-1 shrink-0"
                  >
                    Đóng
                  </button>
                </div>

                <form onSubmit={handleCreateTopic} className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      Vấn đề cần trao đổi
                    </label>
                    <textarea
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      required
                      placeholder="Nhập tên chủ đề cần thảo luận (ví dụ: Sự cố câu hỏi 386 của bộ môn, Thắc mắc quy chế điểm...)"
                      rows={3}
                      className="w-full border border-gray-250 rounded-xl p-2.5 text-xs bg-slate-50 text-slate-800 font-sans focus:ring-1 focus:ring-[#1971C2]"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-2.5 rounded-xl text-[10px] leading-snug text-yellow-800 font-sans-medium">
                    📍 Khi bạn tạo chủ đề, thông báo sẽ lập tức truyền tới các quản trị viên tối cao của sảnh học để tiếp quản giải đáp khúc mắc kịp thời!
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1971C2] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer border-b-2 border-[#155e9e] active:scale-[0.98]"
                  >
                    🚀 Bắt đầu cuộc trao đổi
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Render Full Screen Desktop Layout: beautiful split layout (left topics sidebar, right chat frame)
  const renderDesktopExchange = () => {
    return (
      <div className="flex-1 flex bg-white border border-gray-150 rounded-md shadow-sm h-[680px] overflow-hidden font-sans">
        
        {/* Left Column - Topics/Users Sidebar list */}
        <div className="w-[340px] border-r border-gray-150 flex flex-col shrink-0 bg-[#F8FAFC]">
          
          {/* Sidebar Header Title banner */}
          <div className="p-4 bg-white border-b border-gray-150 shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <MessageSquare className="h-4 w-4 text-[#1971C2]" />
                Room Thảo Luận
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5"> CBNV liên hệ Ban Quản Trị </p>
            </div>
            
            {!isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-2.5 py-1.5 bg-[#1971C2] hover:bg-opacity-95 text-white text-[10px] font-black rounded-md flex items-center gap-1 cursor-pointer uppercase border-b-2 border-[#125899] active:scale-95 shadow-3xs"
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span>Tạo Mới</span>
              </button>
            )}
          </div>

          {/* Toggle Switch for Desktop (Only for Admin to select Personnel vs Topics) */}
          {isAdmin && (
            <div className="p-3 bg-white border-b border-gray-100 shrink-0">
              <div className="bg-slate-100 p-0.5 rounded-md flex relative border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('users');
                    setSearchQuery('');
                  }}
                  className={`flex-1 text-center py-1.5 text-xs font-black rounded-md transition-all relative z-10 ${
                    activeTab === 'users' ? 'text-[#1971C2]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {activeTab === 'users' && (
                    <motion.div
                      layoutId="activePillDesktop"
                      className="absolute inset-0 bg-white rounded-md shadow-xs border border-gray-250"
                      transition={{ type: 'spring', duration: 0.3 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1">
                    <UserIcon className="h-3.5 w-3.5" />
                    Nhân Sự
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('topics');
                    setSearchQuery('');
                  }}
                  className={`flex-1 text-center py-1.5 text-xs font-black rounded-md transition-all relative z-10 ${
                    activeTab === 'topics' ? 'text-[#1971C2]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {activeTab === 'topics' && (
                    <motion.div
                      layoutId="activePillDesktop"
                      className="absolute inset-0 bg-white rounded-md shadow-xs border border-gray-250"
                      transition={{ type: 'spring', duration: 0.3 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chủ Đề
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Search box block */}
          <div className="p-3 bg-white border-b border-gray-150 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 rounded-md text-xs bg-slate-50 text-slate-800 font-sans leading-normal focus:ring-1 focus:ring-[#1971C2]"
                placeholder={activeTab === 'users' ? "Tìm theo tên, SĐT, mã NV..." : "Tìm kiếm chủ đề hoặc tên..."}
              />
            </div>
          </div>

          {/* Topics/Users Scroll lists */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {activeTab === 'users' ? (
              isLoadingUsers ? (
                <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                  <div className="animate-spin h-5 w-5 border-2 border-[#1971C2] border-t-transparent rounded-full mx-auto mb-3" />
                  Đang tải danh sách nhân sự...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-gray-450 text-xs">
                  Không tìm thấy nhân sự phù hợp.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const empResults = quizResults.filter(r => 
                    (r.userId && r.userId === u.id) || 
                    (u.phone && r.userId === u.phone) || 
                    (r.userName && r.userName.toLowerCase().trim() === u.name.toLowerCase().trim())
                  );
                  const state = calculateInactivityAugmentedLevel(u.id, empResults, levelRules || DEFAULT_LEVEL_RULES);
                  
                  return (
                    <div 
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="p-3.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-between gap-3 shadow-4xs cursor-pointer text-left transition-all hover:scale-[1.01]"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[12px] font-black text-slate-900 leading-snug flex items-center gap-1.5 truncate">
                          <span>{u.name}</span>
                          {u.employeeId && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-1 rounded font-bold shrink-0">
                              {u.employeeId}
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate uppercase font-semibold">
                          {u.department} • {u.branch}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-500 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{empResults.length} lượt thi</span>
                        </div>
                      </div>
                      
                      <span className={`text-[10px] font-black px-2 mt-0.5 py-0.5 rounded-full flex items-center gap-0.5 border shrink-0 ${
                        state.level === 5 ? 'bg-amber-50 border-amber-300 text-amber-800' :
                        state.level === 4 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                        state.level === 3 ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
                        state.level === 2 ? 'bg-blue-50 border-blue-250 text-blue-700' :
                        'bg-zinc-50 border-zinc-200 text-zinc-650'
                      }`}>
                        Cấp {state.level}
                      </span>
                    </div>
                  );
                })
              )
            ) : (
              isLoadingTopics ? (
                <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                  <div className="animate-spin h-5 w-5 border-2 border-[#1971C2] border-t-transparent rounded-full mx-auto mb-3" />
                  Đang tải dữ liệu...
                </div>
              ) : filteredTopics.length === 0 ? (
                <div className="text-center py-16 text-gray-450 text-xs">
                  {searchQuery ? "Không tìm thấy chủ đề nào." : "Chưa có cuộc thảo luận hỗ trợ nào được tạo."}
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const isSelected = selectedTopic?.id === topic.id;
                  const isUnread = isAdmin ? topic.unreadForAdmin : topic.unreadForUser;
                  return (
                    <div 
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer text-left relative ${
                        isSelected 
                          ? 'border-[#1971C2] bg-blue-50/20 ring-1 ring-[#1971C2]/30 shadow-3xs' 
                          : isUnread 
                            ? 'border-[#FFE066] bg-amber-50/10 shadow-3xs'
                            : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-[12.5px] font-black text-slate-900 leading-snug line-clamp-2">
                          {topic.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          {isUnread && (
                            <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0">
                              MỚI
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTopic(topic.id);
                              }}
                              className="text-red-500 hover:text-red-700 p-1 rounded-md transition-all hover:bg-neutral-100 cursor-pointer"
                              title="Xóa cuộc trò chuyện"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic font-medium">
                        {topic.lastMessageText || 'Chưa gửi tin nhắn'}
                      </p>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2.5 text-[10px] text-gray-400 font-sans">
                        <div className="flex items-center gap-1 font-bold text-slate-700 truncate max-w-[160px]">
                          <UserIcon className="h-3 w-3 text-indigo-600 shrink-0" />
                          <span>{topic.createdByName}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatMsgDate(topic.lastMessageAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right Column - Conversation bubble dialog frame */}
        <div className="flex-1 flex flex-col bg-[#F1F3F5] min-w-0 relative">
          {selectedTopic ? (
            <>
              {/* Chat panel header */}
              <div className="p-3 bg-white border-b border-gray-150 shrink-0 flex items-center justify-between px-4 shadow-3xs">
                <div className="text-left min-w-0">
                  <h2 className="text-xs font-black uppercase text-[#1971C2] tracking-wider leading-snug truncate">
                    {selectedTopic.title}
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-none">
                    Mã chủ đề: <span className="font-mono text-slate-700">{selectedTopic.id}</span> • Tạo bởi: <strong className="text-slate-800">{selectedTopic.createdByName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 border border-blue-150 px-2 py-1 rounded-md text-[9px] font-black text-[#1A73E8] uppercase select-none">
                    Kênh Trực Tuyến
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTopic(selectedTopic.id)}
                      className="bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-md text-[9px] font-black text-red-600 uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0"
                      title="Xóa cuộc trò chuyện"
                    >
                      <Trash2 className="h-3 w-3" />
                      Xóa cuộc trò chuyện
                    </button>
                  )}
                </div>
              </div>

              {/* Chat bubble body stream */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 text-left"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
                    <MessageSquare className="h-10 w-10 text-slate-300 animate-pulse mb-2" />
                    <h5 className="text-xs font-bold text-slate-500">Chưa có tin nhắn trong chủ đề này</h5>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-sm">
                      Sử dụng khung phía dưới để viết tin nhắn đầu tiên. Mỗi người viết ra là một giải pháp trực tiếp!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMsgSenderAdmin = msg.senderRole === 'admin' || msg.senderRole === 'executive';
                    const bubbleStyle = isMsgSenderAdmin
                      ? "bg-[#1A73E8] text-white rounded-2xl rounded-tr-none ml-auto"
                      : "bg-white text-slate-800 border border-gray-200 shadow-4xs rounded-2xl rounded-tl-none mr-auto";

                    const dateDisplay = formatMsgDate(msg.createdAt);
                    const isLNT = msg.senderName.trim().toUpperCase() === 'LÊ NHẬT TRƯỜNG' || msg.senderName.trim().toUpperCase() === 'LE NHAT TRUONG';
                    const senderDisplay = isMsgSenderAdmin 
                      ? (isLNT ? 'BAN QUẢN TRỊ' : 'TÔI (ADMIN)') 
                      : msg.senderName;

                    return (
                      <div key={msg.id} className="flex flex-col w-full relative">
                        {/* Meta header name & hour */}
                        <div className={`flex items-center gap-1.5 text-[10px] mb-1 px-1.5 font-sans ${isMsgSenderAdmin ? 'justify-end text-slate-550' : 'justify-start text-gray-400 font-medium'}`}>
                          <span className="font-extrabold">{senderDisplay}</span>
                          <span className="text-gray-300">•</span>
                          <span className="font-mono text-[9px]">{dateDisplay}</span>
                        </div>

                        {/* Content text block box */}
                        <div className={`max-w-[70%] px-4 py-2.5 text-xs text-left leading-relaxed font-sans font-medium whitespace-pre-wrap break-words ${bubbleStyle}`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Send Area form input */}
              <form 
                onSubmit={handleSendMessage}
                className="p-3.5 bg-white border-t border-gray-200 shrink-0 flex items-center gap-2.5 shadow-3xs"
              >
                <input 
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-[#1971C2] focus:border-[#1971C2] text-slate-800 leading-normal"
                  placeholder="Gửi tin nhắn hoặc ý kiến phản hồi..."
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="h-9 px-4 bg-[#1A73E8] hover:bg-opacity-95 text-white rounded-xl flex items-center gap-1 justify-center shrink-0 cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all text-xs font-bold"
                >
                  <Send className="h-4 w-4 shrink-0" />
                  <span>Gửi tin nhắn</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
              <div className="h-16 w-16 bg-[#1971C2]/5 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-[#1971C2]" />
              </div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-4xs">
                Chưa Chọn Cuộc Thảo Luận
              </h3>
              <p className="text-[11px] text-gray-500 mt-2 max-w-sm leading-relaxed">
                {isAdmin 
                  ? "Hãy nhấp chuột vào một trong các chủ đề phản hồi từ CBNV ở cột bên trái để trả lời và giúp giải đáp sự cố." 
                  : "Chọn một cuộc thảo luận hỗ trợ ở danh sách bên trái để tiếp tục chat, hoặc nhấn nút 'Tạo mới' để mở vấn đề hỗ trợ mới."}
              </p>
            </div>
          )}
        </div>

        {/* Global Desktop Modal Dialog */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 flex flex-col"
              >
                <div className="p-4 bg-[#1971C2] text-white shrink-0 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Tạo cuộc ý kiến trao đổi mới
                  </h3>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="text-white hover:text-red-200 text-xs font-black p-1 shrink-0"
                  >
                    Đóng
                  </button>
                </div>

                <form onSubmit={handleCreateTopic} className="p-5 space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      Vấn đề/Sự cố thảo luận
                    </label>
                    <textarea
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      required
                      placeholder="Nhập tên chủ đề cần trao đổi hỗ trợ của bạn..."
                      rows={3}
                      className="w-full border border-gray-250 rounded-xl p-2.5 text-xs bg-slate-50 text-slate-800 font-sans focus:ring-1 focus:ring-[#1971C2]"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-[10px] leading-relaxed text-yellow-850 font-sans">
                    📍 Khi bạn tạo chủ đề này, tin nhắn sẽ lập cập báo tới các quản trị viên của Ban điều hành. Bạn có thể trao đổi bất kỳ vấn đề phát sinh nào tại đây.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1971C2] hover:bg-opacity-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer border-b-2 border-[#155e9e] active:scale-[0.98] text-center"
                  >
                    🚀 Bắt đầu trao đổi
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <>
      {isMobileView ? renderMobileExchange() : renderDesktopExchange()}

      {/* Delete Topic Global Confirmation Dialog Modal */}
      <AnimatePresence>
        {topicToDeleteId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-red-200 flex flex-col text-left"
            >
              <div className="p-4 bg-red-600 text-white shrink-0 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4 text-white" />
                  Xác nhận xóa cuộc trò chuyện
                </h3>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Mọi tin nhắn và nội dung trao đổi thuộc chủ đề này sẽ bị xóa vĩnh viễn khỏi hệ thống và không thể phục hồi.
                </p>
                <p className="text-xs text-slate-800 font-extrabold">
                  Bạn có chắc chắn muốn thực hiện hành động này?
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setTopicToDeleteId(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteTopic}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer text-center"
                  >
                    Chắc chắn xóa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
