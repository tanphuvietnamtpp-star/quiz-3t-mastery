import React, { useState, useEffect } from 'react';
import { databaseService } from '../firebase';
import { User, Question, QuizResult, BRANCHES, DEPARTMENTS } from '../types';
import { INITIAL_QUESTIONS } from '../data/mockQuestions';
import { 
  Users, HelpCircle, ImagePlus, QrCode, AlertTriangle, 
  Trash2, Plus, Sparkles, LogOut, CheckCircle2, UserCheck, 
  RefreshCcw, UserMinus, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onSimulateEmployee: () => void;
  slogan: string;
  onUpdateSlogan: (slogan: string) => void;
}

export default function AdminDashboard({ user, onLogout, onSimulateEmployee, slogan, onUpdateSlogan }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  
  const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'add_images' | 'qr'>('users');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // States for Editing and Deleting Users
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editRole, setEditRole] = useState<'employee' | 'approver' | 'admin'>('employee');
  const [editStatus, setEditStatus] = useState<'approved' | 'pending' | 'rejected'>('pending');
  const [editPassword, setEditPassword] = useState('');

  // States for Manual Question Form
  const [manualText, setManualText] = useState('');
  const [manualOptions, setManualOptions] = useState(['', '', '', '']);
  const [manualCorrect, setManualCorrect] = useState(0);
  const [manualExp, setManualExp] = useState('');

  // States for Image extraction
  const [selectedImages, setSelectedImages] = useState<{ file: File; compressedBase64: string }[]>([]);
  const [extractedQuestions, setExtractedQuestions] = useState<(Question & { isDuplicate: boolean; duplicateOriginal?: string })[]>([]);
  const [extracting, setExtracting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const allUsers = await databaseService.getUsers();
      setUsers(allUsers);

      const allQs = await databaseService.getQuestions();
      setQuestions(allQs);

      const allRes = await databaseService.getQuizResults();
      setResults(allRes);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu Admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Seed question action
  const handleSeedQuestions = async () => {
    try {
      setLoading(true);
      await databaseService.saveQuestions(INITIAL_QUESTIONS);
      setNotice({ type: 'success', msg: 'Đã khởi tạo bộ đề gốc 07 câu hỏi 3T ban đầu thành công!' });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Khởi tạo bộ đề gốc thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  // User Administration Operations
  const handleToggleRole = async (userId: string, currentRole: 'employee' | 'approver' | 'admin') => {
    const newRole = currentRole === 'employee' ? 'approver' : 'employee';
    try {
      await databaseService.updateUser(userId, { role: newRole });
      setNotice({ type: 'success', msg: `Đã thay đổi quyền tài khoản thành công.` });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật phân quyền.' });
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'approved' });
      setNotice({ type: 'success', msg: 'Đã kích hoạt phê duyệt CBNV thành công.' });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Phê duyệt tài khoản thất bại.' });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await databaseService.updateUser(userId, { status: 'rejected' });
      setNotice({ type: 'success', msg: 'Đã chặn/từ chối CBNV thành công.' });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Chặn tài khoản thất bại.' });
    }
  };

  const handleOpenEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditName(targetUser.name || '');
    setEditPhone(targetUser.phone || '');
    setEditEmployeeId(targetUser.employeeId || '');
    setEditDepartment(targetUser.department || '');
    setEditBranch(targetUser.branch || '');
    setEditRole(targetUser.role || 'employee');
    setEditStatus(targetUser.status || 'pending');
    setEditPassword(targetUser.password || '123');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editPhone.trim()) {
      setNotice({ type: 'error', msg: 'Họ tên và Số điện thoại không được để trống!' });
      return;
    }

    try {
      setLoading(true);
      await databaseService.updateUser(editingUser.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        employeeId: editEmployeeId.trim(),
        department: editDepartment,
        branch: editBranch,
        role: editRole,
        status: editStatus,
        password: editPassword
      });
      setNotice({ type: 'success', msg: `Đã cập nhật thông tin CBNV "${editName}" thành công!` });
      setEditingUser(null);
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi cập nhật thông tin CBNV.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      await databaseService.deleteUser(userId);
      setNotice({ type: 'success', msg: 'Đã xóa tài khoản CBNV khỏi hệ thống thành công!' });
      setUserToDelete(null);
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi xóa tài khoản CBNV.' });
    } finally {
      setLoading(false);
    }
  };

  // Add Manual Question
  const handleAddManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText || manualOptions.some(o => !o) || !manualExp) {
      setNotice({ type: 'error', msg: 'Vui lòng điền hoàn chỉnh nội dung câu hỏi!' });
      return;
    }

    // Duplicate Check
    const isDuplicate = questions.some(q => q.text.trim().toLowerCase() === manualText.trim().toLowerCase());
    if (isDuplicate) {
      setNotice({ type: 'error', msg: 'Câu hỏi này đã tồn tại trong Ngân hàng đề!' });
      return;
    }

    const newQ: Question = {
      id: 'q_admin_' + Math.random().toString(36).substring(2, 9),
      text: manualText.trim(),
      options: manualOptions.map(o => o.trim()),
      correctAnswerIndex: manualCorrect,
      explanation: manualExp.trim()
    };

    try {
      await databaseService.saveQuestion(newQ);
      setNotice({ type: 'success', msg: 'Thêm câu hỏi mới vào ngân hàng đề thành công!' });
      setManualText('');
      setManualOptions(['', '', '', '']);
      setManualExp('');
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Không thể lưu câu hỏi mới.' });
    }
  };

  // Compression helper (Canvas-based Resizer & quality compressor to maintain quotas)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension scaling constraint (e.g. 1024px maximum edge to preserve bandwidth)
          const MAX_SIZE = 1024;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress with high compression quality 0.65 JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            // Extract the pure base64 chunk from Data URL
            const base64Chunk = dataUrl.split(',')[1];
            resolve(base64Chunk);
          } else {
            reject(new Error("Không thể khởi tạo môi trường vẽ canvas."));
          }
        };
        img.onerror = () => reject(new Error("Lỗi khi đọc file ảnh."));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Lỗi khi tải file."));
      reader.readAsDataURL(file);
    });
  };

  // Image Selection Processor
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setNotice(null);
    setLoading(true);

    const promises = Array.from(files).map(async (file: File) => {
      try {
        const compressed = await compressImage(file);
        return { file, compressedBase64: compressed };
      } catch (err) {
        console.error("Compression error:", err);
        return null;
      }
    });

    const results = (await Promise.all(promises)).filter((r): r is { file: File; compressedBase64: string } => r !== null);
    setSelectedImages(prev => [...prev, ...results]);
    setLoading(false);
  };

  // Gemini Extraction & Automatic Duplicate Filter Comparison
  const handleExtractWithAI = async () => {
    if (selectedImages.length === 0) return;
    setNotice(null);
    setExtracting(true);

    try {
      // Map base64 representations
      const imagePayloads = selectedImages.map(img => ({
        mimeType: img.file.type || "image/jpeg",
        data: img.compressedBase64
      }));

      // Post payload to Backend endpoint
      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagePayloads })
      });

      if (!response.ok) {
        const errResult = await response.json();
        throw new Error(errResult.error || "Gặp lỗi trong tiến trình giải mã hình ảnh.");
      }

      const result = await response.json();
      const aiQuestions: Question[] = result.questions || [];

      if (aiQuestions.length === 0) {
        setNotice({ type: 'error', msg: 'Không tìm thấy câu hỏi trắc nghiệm hợp lệ nào trong các hình ảnh đã chọn.' });
        setExtracting(false);
        return;
      }

      // Automatically check for duplication compared to our active questions database (Semantic/Word overlap comparison)
      const formattedWithDuplicates = aiQuestions.map(extracted => {
        // Find if normalized text overlaps or strictly exists
        const normExtracted = extracted.text.replace(/\s+/g, '').toLowerCase();
        
        const duplicateMatch = questions.find(existing => {
          const normExisting = existing.text.replace(/\s+/g, '').toLowerCase();
          // Substring or overlap matching
          return normExisting.includes(normExtracted) || normExtracted.includes(normExisting);
        });

        return {
          ...extracted,
          isDuplicate: !!duplicateMatch,
          duplicateOriginal: duplicateMatch?.text
        };
      });

      setExtractedQuestions(formattedWithDuplicates);
      setNotice({ type: 'success', msg: `Bóc tách thành công ${aiQuestions.length} câu hỏi bằng trí tuệ nhân tạo Gemini!` });

    } catch (err: any) {
      console.error(err);
      setNotice({ type: 'error', msg: err.message || 'Lỗi bóc tác dữ liệu bằng AI. Vui lòng thử lại.' });
    } finally {
      setExtracting(false);
    }
  };

  // Save approved AI extracted questions to global Database
  const handleSaveExtractedQuestions = async () => {
    const validQuestions = extractedQuestions.filter(q => !q.isDuplicate);
    if (validQuestions.length === 0) {
      setNotice({ type: 'error', msg: 'Tất cả câu hỏi bóc tách đều nằm thế trùng lặp. Không có dữ liệu lưu trữ mới.' });
      return;
    }

    try {
      setLoading(true);
      await databaseService.saveQuestions(validQuestions);
      setNotice({ type: 'success', msg: `Đã lưu thành công ${validQuestions.length} câu hỏi mới vào hệ thống!` });
      setExtractedQuestions([]);
      setSelectedImages([]);
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Có lỗi xảy ra khi lưu ngân hàng đề.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi hệ thống rèn luyện?")) return;
    try {
      await databaseService.deleteQuestion(id);
      setNotice({ type: 'success', msg: 'Đã xóa câu hỏi khỏi cơ sở dữ liệu.' });
      await loadData();
    } catch (err) {
      setNotice({ type: 'error', msg: 'Xóa câu hỏi thất bại.' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Bar */}
      <header className="bg-white border-b border-gray-150 py-4 px-6 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-md border border-blue-150">
              <Sparkles className="h-6 w-6 text-[#1971C2]" />
            </span>
            <div>
              <h1 className="text-xl font-sans font-bold text-gray-900 leading-none">
                <span translate="no" className="notranslate">Quản Trị Tối Cao: Lê Nhật Trường</span>
              </h1>
              <p className="text-xs text-[#1971C2] mt-1 font-semibold">
                <span translate="no" className="notranslate">Chủ quản hệ thống học tập tập đoàn 3T rèn luyện</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSimulateEmployee}
              className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 hover:shadow shadow-sm rounded-md py-2 px-3.5 transition-all flex items-center gap-1.5 border border-green-500 font-sans"
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span>Trải nghiệm Học & Thi Thử (CBNV)</span>
            </button>
            <button
              onClick={onLogout}
              className="text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-150 rounded-md py-2 px-3 transition-colors flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span translate="no" className="notranslate">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Work Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Dynamic Slogan Admin Customizer Widget */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span translate="no" className="notranslate text-xs font-bold text-blue-700 uppercase tracking-widest block">Slogan Hiện Tại: Văn Hóa 3T</span>
            <p className="text-sm font-bold text-gray-800">
              <span translate="no" className="notranslate">" {slogan} "</span>
            </p>
          </div>
          <div className="flex w-full md:w-auto items-center gap-2">
            <input 
              type="text" 
              placeholder="Nhập Slogan mới..." 
              id="new-slogan-input"
              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 outline-none focus:border-[#1971C2] bg-white flex-1 md:w-64 font-sans text-gray-800"
              defaultValue={slogan}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.currentTarget;
                  if (target.value.trim()) {
                    onUpdateSlogan(target.value.trim());
                    alert("Cập nhật Slogan mới thành công!");
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.getElementById('new-slogan-input') as HTMLInputElement;
                if (input && input.value.trim()) {
                  onUpdateSlogan(input.value.trim());
                  alert("Cập nhật Slogan mới thành công!");
                }
              }}
              className="px-3.5 py-1.5 bg-[#1971C2] hover:bg-opacity-95 text-white text-xs font-bold rounded-md transition-all whitespace-nowrap shadow-sm font-sans"
            >
              Cập nhật
            </button>
          </div>
        </div>
        
        {/* Dynamic Alerts */}
        {notice && (
          <div className={`p-4 rounded-md border text-sm flex items-center justify-between gap-3 ${
            notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span translate="no" className="notranslate">{notice.msg}</span>
            <button onClick={() => setNotice(null)} className="text-xs font-bold uppercase shrink-0">Đóng</button>
          </div>
        )}

        {/* Workspace Tab Bar */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('users'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'users' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            <span translate="no" className="notranslate">Phê Duyệt & Phân Quyền</span>
          </button>
          <button
            onClick={() => { setActiveTab('questions'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'questions' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span translate="no" className="notranslate">Ngân Hàng Đề Thủ Công</span>
          </button>
          <button
            onClick={() => { setActiveTab('add_images'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'add_images' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ImagePlus className="h-4 w-4" />
            <span translate="no" className="notranslate">Trích xuất Câu Hỏi AI (Hình Ảnh)</span>
          </button>
          <button
            onClick={() => { setActiveTab('qr'); setNotice(null); }}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'qr' ? 'border-[#1971C2] text-[#1971C2] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span translate="no" className="notranslate">Mã QR "Chiến" Ngay</span>
          </button>
        </div>

        {/* Viewport Render panels */}
        <AnimatePresence mode="wait">
          
          {/* User Approval Panel View */}
          {activeTab === 'users' && (
            <motion.div
              key="users_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Danh sách CBNV đăng ký hệ thống</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Với tư cách Admin tối cao, bạn có thể phê duyệt quyền vào sảnh học tập cho CBNV quốc gia.</p>
                  </div>
                  <button 
                    onClick={loadData}
                    className="p-1.5 border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 transition-all"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase border-b border-gray-150">
                        <th className="py-2.5 px-4 font-bold">Họ và Tên / SĐT</th>
                        <th className="py-2.5 px-4 font-bold">Thuộc Bộ Phận / Chi nhánh</th>
                        <th className="py-2.5 px-4 font-bold">Vai trò phân cấp</th>
                        <th className="py-2.5 px-4 font-bold">Phê duyệt trạng thái</th>
                        <th className="py-2.5 px-4 font-bold text-right text-xs">Phân bổ thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-300 italic">Chưa có dữ liệu CBNV đăng ký.</td>
                        </tr>
                      ) : (
                        users.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="py-3 px-4 text-gray-800">
                              <div className="flex flex-wrap items-center gap-2">
                                <span translate="no" className="notranslate font-bold">{item.name}</span>
                                {item.employeeId && (
                                  <span translate="no" className="notranslate text-[10px] uppercase font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 font-mono">
                                    MS: {item.employeeId}
                                  </span>
                                )}
                              </div>
                              <span className="block font-sans text-gray-400 font-normal mt-0.5">{item.phone}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span translate="no" className="notranslate">{item.department}</span>
                              <span className="block font-sans text-gray-450 mt-0.5">{item.branch}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold ${
                                item.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                item.role === 'approver' ? 'bg-yellow-50 text-yellow-700 border border-yellow-105' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                <span translate="no" className="notranslate">{item.role === 'admin' ? 'Chủ Admin' : item.role === 'approver' ? 'Duyệt viên (Trưởng BP)' : 'CBNV'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full font-bold ${
                                item.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                item.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                <span translate="no" className="notranslate">{item.status === 'approved' ? 'Đã hoạt động' : item.status === 'pending' ? 'Chờ kích hoạt' : 'Tạm khóa'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 font-sans">
                                {item.id !== 'admin_lenhattruong' && item.name !== 'Lê Nhật Trường' && (
                                  <>
                                    {/* Edit button */}
                                    <button
                                      onClick={() => handleOpenEdit(item)}
                                      className="px-2 py-0.5 text-xs text-[#1971C2] bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-md font-bold transition-all"
                                      title="Sửa thông tin tài khoản"
                                    >
                                      Sửa
                                    </button>

                                    {/* Toggle role operator */}
                                    <button
                                      onClick={() => handleToggleRole(item.id, item.role)}
                                      className="px-2 py-0.5 text-xs text-gray-650 hover:text-blue-600 bg-white border border-gray-250 rounded-md font-bold transition-all"
                                    >
                                      <span translate="no" className="notranslate">{item.role === 'employee' ? 'Đặt Trưởng BP' : 'Hạ CBNV'}</span>
                                    </button>

                                    {/* Approve / Reject Actions */}
                                    {item.status !== 'approved' ? (
                                      <button
                                        onClick={() => handleApproveUser(item.id)}
                                        className="px-2 py-0.5 text-xs text-white bg-green-650 hover:bg-green-700 rounded-md font-bold transition-all"
                                      >
                                        Duyệt
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleRejectUser(item.id)}
                                        className="px-2 py-0.5 text-xs text-white bg-amber-600 hover:bg-amber-700 rounded-md font-bold transition-all"
                                      >
                                        Khóa
                                      </button>
                                    )}

                                    {/* Delete button */}
                                    <button
                                      onClick={() => setUserToDelete(item)}
                                      className="px-2 py-0.5 text-xs text-white bg-red-650 hover:bg-red-700 rounded-md font-bold transition-all"
                                      title="Xóa vĩnh viễn"
                                    >
                                      Xóa
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Ngân hàng đề thủ công Panel */}
          {activeTab === 'questions' && (
            <motion.div
              key="questions_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Seed controller help */}
              {questions.length === 0 && (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-md flex justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-blue-800 text-sm">Khởi tạo dữ liệu mẫu 3T ban đầu?</h3>
                    <p className="text-xs text-blue-700 mt-1">Hệ thống đang trống. Nhấp vào đây để thêm nhanh 07 câu hỏi huấn luyện 3T chuẩn ban đầu cho anh em CBNV ôn luyện.</p>
                  </div>
                  <button 
                    onClick={handleSeedQuestions}
                    className="flex items-center gap-2 bg-[#1971C2] text-white font-bold text-xs px-4 py-2 rounded-md shadow-sm"
                  >
                    <span translate="no" className="notranslate">Khởi tạo mẫu</span>
                  </button>
                </div>
              )}

              {/* Form add manual question */}
              <div className="bg-white border border-gray-150 rounded-md p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">
                  <span translate="no" className="notranslate">Nhập câu hỏi thủ công mới</span>
                </h3>
                <form onSubmit={handleAddManualQuestion} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nội dung câu hỏi 3T</label>
                    <input 
                      type="text" 
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Nhập câu tự giác/tuân thủ an toàn..."
                      className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {manualOptions.map((opt, oIdx) => (
                      <div key={oIdx}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Lựa chọn {String.fromCharCode(65 + oIdx)}</label>
                        <input 
                          type="text" 
                          value={opt}
                          onChange={(e) => {
                            const updated = [...manualOptions];
                            updated[oIdx] = e.target.value;
                            setManualOptions(updated);
                          }}
                          placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}...`}
                          className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Đáp án đúng chính xác</label>
                      <select
                        value={manualCorrect}
                        onChange={(e) => setManualCorrect(Number(e.target.value))}
                        className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 bg-white outline-none focus:border-blue-500"
                      >
                        <option value={0}>Lựa chọn A</option>
                        <option value={1}>Lựa chọn B</option>
                        <option value={2}>Lựa chọn C</option>
                        <option value={3}>Lựa chọn D</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Lời giải của sếp / cảnh báo ghi nhớ</label>
                      <input 
                        type="text" 
                        value={manualExp}
                        onChange={(e) => setManualExp(e.target.value)}
                        placeholder="Nên dặn: Làm đúng cam kết, không lơ là..."
                        className="w-full text-xs rounded-md border border-gray-250 py-2 px-3 outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2 px-4 rounded-md shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm câu hỏi mới
                  </button>
                </form>
              </div>

              {/* Active list table */}
              <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-105 bg-gray-50">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ngân hàng đề hiện có ({questions.length} câu)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {questions.map((q, qIdx) => (
                        <tr key={q.id} className="hover:bg-gray-50/20">
                          <td className="p-4 space-y-2">
                            <div className="flex justify-between items-start gap-3">
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full uppercase">Câu {qIdx + 1}</span>
                              <button 
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="text-red-600 hover:bg-red-50 p-1 rounded-md transition-all shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm">{q.text}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className={`rounded p-2 border ${
                                  oIdx === q.correctAnswerIndex ? 'bg-green-50/50 border-green-200 text-green-900 font-semibold' : 'bg-gray-50/50 border-gray-100 text-gray-500'
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}. {opt}
                                </div>
                              ))}
                            </div>
                            <div className="bg-blue-50/30 p-2.5 rounded-md text-blue-700 text-[11px] leading-relaxed">
                              <strong>Dặn dò:</strong> {q.explanation}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Question Extractor Tab */}
          {activeTab === 'add_images' && (
            <motion.div
              key="add_images"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Image Input field Box */}
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-md p-8 text-center space-y-4">
                <div className="bg-blue-50 text-blue-600 h-12 w-12 rounded-full flex items-center justify-center mx-auto border border-blue-100">
                  <ImagePlus className="h-6 w-6 text-[#1971C2]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-800">Tải lên loạt hình ảnh chụp đề thi 3T</h3>
                  <p className="text-xs text-gray-500 mt-1">Cơ chế nén tự động tối ưu hóa dung lượng & API Quota sẽ chạy tại chỗ trước khi phân tích qua Gemini AI.</p>
                </div>
                
                <div className="relative inline-block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    disabled={extracting || loading}
                  />
                  <button className="bg-[#1971C2] text-white font-bold text-xs py-2 px-5 rounded-md shadow-sm">
                    {loading ? 'Đang nén ảnh...' : 'Chọn từ máy tính / chụp ảnh'}
                  </button>
                </div>

                {selectedImages.length > 0 && (
                  <div className="pt-4 max-w-sm mx-auto">
                    <div className="text-xs text-gray-450 uppercase mb-2">Hình ảnh đã chọn rèn luyện ({selectedImages.length})</div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {selectedImages.map((img, iIdx) => (
                        <div key={iIdx} className="relative h-14 w-14 rounded-md overflow-hidden bg-gray-100 border border-gray-250">
                          <img 
                            src={`data:image/jpeg;base64,${img.compressedBase64}`} 
                            alt="preview" 
                            className="object-cover h-full w-full" 
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== iIdx))}
                            className="absolute bg-black/60 text-white rounded-full p-0.5 top-0.5 right-0.5 hover:bg-black"
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleExtractWithAI}
                        disabled={extracting || selectedImages.length === 0}
                        className="w-full bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2 px-4 rounded-md shadow-sm"
                      >
                        {extracting ? 'Trí tuệ Nhân tạo Gemini đang bóc tách...' : 'Phân Tích Bóc Tách Đề Bằng AI'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Extract questions table with duplication warnings! */}
              {extractedQuestions.length > 0 && (
                <div className="bg-white border border-gray-150 rounded-md shadow-sm overflow-hidden space-y-4 p-4">
                  <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nội dung câu hỏi AI bóc tách</h3>
                      <p className="text-xs text-red-500 mt-0.5 italic">Hệ thống đã tự động rà quét kiểm tra trùng lặp câu hỏi.</p>
                    </div>
                    <button
                      onClick={handleSaveExtractedQuestions}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2 px-4 rounded-md"
                    >
                      Lưu đề không trùng lặp
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto">
                    {extractedQuestions.map((eq, qIdx) => (
                      <div 
                        key={eq.id}
                        className={`p-4 rounded-md border ${
                          eq.isDuplicate ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded font-bold">CÂU TRÍ TUỆ {qIdx + 1}</span>
                          {eq.isDuplicate ? (
                            <span className="flex items-center gap-1 font-bold text-orange-700 text-xs px-2 py-0.5 bg-orange-100 border border-orange-200 rounded-full">
                              <AlertTriangle className="h-3 w-3" /> TRÙNG LẶP SỐ LIỆU ĐỀ CŨ
                            </span>
                          ) : (
                            <span className="text-green-700 text-xs font-bold px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">HỢP LỆ</span>
                          )}
                        </div>

                        <div className="pt-2">
                          <h4 className="font-bold text-sm text-gray-800">{eq.text}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {eq.options.map((opt, oIdx) => (
                              <div key={oIdx} className={`p-2 rounded text-xs text-gray-600 ${
                                oIdx === eq.correctAnswerIndex ? 'bg-green-50/50 text-green-900 border border-green-200 font-semibold' : 'bg-white border border-gray-150'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-2 text-xs bg-blue-50/50 p-2.5 rounded text-blue-700">
                            <strong>Lời khuyên Sếp:</strong> {eq.explanation}
                          </div>

                          {eq.isDuplicate && (
                            <div className="mt-2 text-[11px] text-orange-850 bg-orange-50 p-2 rounded-md">
                              <strong>Lỗi trùng với đề cũ:</strong> "{eq.duplicateOriginal}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* QR Code Creation View */}
          {activeTab === 'qr' && (
            <motion.div
              key="qr_view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-md mx-auto bg-white border border-gray-150 rounded-md p-8 text-center space-y-6 shadow-sm"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Mã QR Truy Cập Nhanh "Chiến Ngay"</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Lưu trữ hoặc in mã QR này treo ở bảng tin, phòng sản xuất hoặc cửa phòng làm việc để rèn luyện tinh thần 3T hàng ngày.
                </p>
              </div>

              {/* Secure dyn QR generator (using standard open-source Google Charts API) */}
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-md flex justify-center items-center">
                <img 
                  src={`https://chart.googleapis.com/chart?chs=220x220&cht=qr&chl=${encodeURIComponent(window.location.origin)}&choe=UTF-8`} 
                  alt="Văn Hóa 3T QR Code Portal" 
                  className="bg-white border rounded-lg p-2 shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-xs font-mono text-gray-500 bg-gray-100 p-2 rounded break-all border border-gray-200">
                <span translate="no" className="notranslate">{window.location.origin}</span>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-[#1971C2] hover:bg-opacity-95 text-white font-bold text-xs py-2 px-4 rounded-md shadow-sm"
              >
                <FileDown className="h-4 w-4" />
                In / Xuất Bản Mã QR Bảng Tin
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Delete User Modal Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-gray-150 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-655 font-sans">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Xác nhận xóa thành viên</h3>
            </div>
            
            <p className="text-xs text-gray-650 leading-relaxed font-sans font-normal">
              Bạn có chắc chắn muốn xóa tài khoản của thành viên <strong>{userToDelete.name}</strong> (SĐT: {userToDelete.phone}) ra khỏi danh sách quản lý? Hành động này không thể hoàn tác!
            </p>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md text-xs font-bold text-gray-650 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all shadow-xs"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-gray-150 max-w-md w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 font-sans">
              <h3 className="text-base font-bold text-gray-950 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#1971C2]" />
                Sửa Thông Tin CBNV
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold">Họ và Tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-bold">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-700 font-bold">Mã Nhân Sự</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 2018.00281"
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold">Mật khẩu đăng nhập (Mới hoặc cũ)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold">Thuộc Chi nhánh</label>
                <select
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                >
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-750 font-bold">Thuộc Bộ Phận</label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-gray-750 font-bold">Vai trò hệ thống</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                  >
                    <option value="employee">CBNV</option>
                    <option value="approver">Trưởng bộ phận</option>
                    <option value="admin">Quản trị tối cao</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-750 font-bold">Trạng thái tài khoản</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs outline-none focus:border-[#1971C2] bg-white text-gray-800"
                  >
                    <option value="approved">Đã hoạt động</option>
                    <option value="pending">Chờ kích hoạt</option>
                    <option value="rejected">Tạm khóa / Từ chối</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 font-sans">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-150 border border-gray-250 rounded-md font-bold text-gray-650 transition-colors"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1971C2] hover:bg-[#155d9e] text-white rounded-md font-bold transition-all shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
