import React, { useState, useEffect } from "react";
import {
  Users,
  Settings,
  BarChart4,
  Database,
  FileSpreadsheet,
  AlertOctagon,
  MessageSquare,
  UserCheck,
  Building,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  FileX,
  Sliders,
  Download,
  CloudLightning,
  UserMinus,
  Check,
  X,
  Zap,
  Lock,
  Unlock,
  Send,
  Bell,
  Sparkles,
  Search,
  Eye,
  Package,
  ShoppingCart,
  FileText,
  CheckSquare,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { T } from "./TranslateText";
import {
  User,
  UserRole,
  UserStatus,
  QualityReport,
  Category4M1E1I,
  Company,
  Branch,
  Department,
  BroadcastNotice,
  ChatMessage,
  ProductionRequest,
  OrderImplementation,
  CatalogProduct,
  CatalogMold,
  ProductionRequestStatus,
  ProductionRequestItem
} from "../types";
import { STANDARDIZED_QC_DEPT } from "../data";
import { generateDailyReportPDF } from "../utils/pdfGenerator";
import OrderPipeline from "./OrderPipeline";

interface DashboardDesktopProps {
  currentUser: User;
  users: User[];
  reports: QualityReport[];
  companies: Company[];
  branches: Branch[];
  departments: Department[];
  broadcasts: BroadcastNotice[];
  chats: ChatMessage[];
  offlineMode: boolean;
  onUpdateUserStatus: (id: string, status: UserStatus) => void;
  onUpdateUserRole: (id: string, role: UserRole) => void;
  onAddUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onAddCompany: (c: Company) => void;
  onAddBranch: (b: Branch) => void;
  onAddDepartment: (d: Department) => void;
  onUpdateCompany?: (oldId: string, c: Company) => void;
  onUpdateBranch?: (oldId: string, b: Branch) => void;
  onUpdateDepartment?: (oldId: string, d: Department) => void;
  onDeleteCompany: (id: string) => void;
  onDeleteBranch: (id: string) => void;
  onDeleteDepartment: (id: string) => void;
  onAddBroadcast: (notice: string, type: string) => void;
  onAddChatMessage: (msg: string) => void;
  onLogout: () => void;
  onToggleMobilePreview: () => void;

  // SCM pipeline props
  productionRequests: ProductionRequest[];
  setProductionRequests: React.Dispatch<React.SetStateAction<ProductionRequest[]>>;
  productionRequestItemsMap: Record<string, ProductionRequestItem[]>;
  setProductionRequestItemsMap: React.Dispatch<React.SetStateAction<Record<string, ProductionRequestItem[]>>>;
  orderImplementations: OrderImplementation[];
  setOrderImplementations: React.Dispatch<React.SetStateAction<OrderImplementation[]>>;
  productsCatalog: CatalogProduct[];
  setProductsCatalog: React.Dispatch<React.SetStateAction<CatalogProduct[]>>;
  moldsCatalog: CatalogMold[];
  setMoldsCatalog: React.Dispatch<React.SetStateAction<CatalogMold[]>>;
  onUpdateReport?: (report: QualityReport) => void;
  onUpdateUser?: (updatedUser: User) => void;
}

interface DesktopThumbnailSliderProps {
  imageUrls?: string[];
  fallbackUrl: string;
}

function DesktopThumbnailSlider({ imageUrls, fallbackUrl }: DesktopThumbnailSliderProps) {
  const list = imageUrls && imageUrls.length > 0 ? imageUrls : [fallbackUrl];
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (list.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % list.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [list]);

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        className="inline-block border border-slate-200 rounded p-0.5 bg-slate-50 relative group overflow-hidden focus:outline-none hover:border-blue-500"
      >
        <div className="w-10 h-8 relative overflow-hidden">
          {list.map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt="Thumb"
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover rounded cursor-zoom-in group-hover:scale-110 transition-all duration-1000 ${
                i === index ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0"
              }`}
            />
          ))}
        </div>
        {list.length > 1 && (
          <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[8px] font-black px-1 rounded-tl leading-none scale-90 z-20">
            {list.length}
          </span>
        )}
      </button>

      {/* Elegant lightbox Zoom overlay modal */}
      {zoomOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center text-sm font-bold z-50 shadow"
            >
              ✕
            </button>
            <div className="flex-1 overflow-hidden h-96 relative rounded-2xl bg-slate-900 flex items-center justify-center">
              <img
                src={list[index]}
                alt="Zoomed"
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain"
              />
              {/* Inner overlay dot indicators */}
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 bg-black/55 px-2 py-1 rounded-full z-10">
                {list.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === index ? "bg-white scale-110" : "bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center px-1">
              <span className="text-xs text-slate-500 font-medium">
                <T>Hình ảnh</T> {index + 1} / {list.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev - 1 + list.length) % list.length)}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded"
                >
                  <T>◀ Trước</T>
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev + 1) % list.length)}
                  className="px-2.5 py-1 bg-[#1e3a8a] text-white hover:bg-[#152862] text-xs font-bold rounded"
                >
                  <T>Tiếp ▶</T>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardDesktop({
  currentUser,
  users,
  reports,
  companies,
  branches,
  departments,
  broadcasts,
  chats,
  offlineMode,
  onUpdateUserStatus,
  onUpdateUserRole,
  onAddUser,
  onDeleteUser,
  onAddCompany,
  onAddBranch,
  onAddDepartment,
  onUpdateCompany,
  onUpdateBranch,
  onUpdateDepartment,
  onDeleteCompany,
  onDeleteBranch,
  onDeleteDepartment,
  onAddBroadcast,
  onAddChatMessage,
  onLogout,
  onToggleMobilePreview,

  productionRequests,
  setProductionRequests,
  productionRequestItemsMap,
  setProductionRequestItemsMap,
  orderImplementations,
  setOrderImplementations,
  productsCatalog,
  setProductsCatalog,
  moldsCatalog,
  setMoldsCatalog,
  onUpdateReport,
  onUpdateUser
}: DashboardDesktopProps) {
  const [activeTab, setActiveTab] = useState<
    "PHÊ_DUYỆT" | "MÃ_HÓA" | "THỐNG_KÊ" | "DỮ_LIỆU" | "QUY_CHẾ" | "CÁ_NHÂN" | "THÔNG_BÁO" | "TRAO_ĐỔI" | "TRIỂN_KHAI"
  >("PHÊ_DUYỆT");

  // Local entry inputs for Mã hóa lookup creation
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchId, setNewBranchId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptId, setNewDeptId] = useState("");

  // States for hierarchical company-branch-department mapping
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("TPP-Group");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("TPP-CTY");

  // Editing states for company, branch, and department
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState<string>("");
  const [editingCompanyIdInput, setEditingCompanyIdInput] = useState<string>("");
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState<string>("");
  const [editingBranchIdInput, setEditingBranchIdInput] = useState<string>("");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<string>("");
  const [editingDeptIdInput, setEditingDeptIdInput] = useState<string>("");

  const [companyIdConfirmDlt, setCompanyIdConfirmDlt] = useState<string | null>(null);
  const [userIdConfirmDlt, setUserIdConfirmDlt] = useState<string | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editRole, setEditRole] = useState<UserRole>(UserRole.STAFF);
  const [editStatus, setEditStatus] = useState<UserStatus>(UserStatus.PENDING);
  const [editPassword, setEditPassword] = useState("");
  const [editCompany, setEditCompany] = useState("");

  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setEditFullName(u.fullName);
    setEditPhone(u.phone);
    setEditDepartment(u.department);
    setEditBranch(u.branch);

    // Find representing company based on the user's branch
    const userBranch = branches.find((b) => b.name === u.branch);
    const userCompany = userBranch ? companies.find((c) => c.id === userBranch.companyId) : null;
    const initialCompanyVal = u.company || (userCompany ? userCompany.name : (companies[0]?.name || "TÂN PHÚ VIỆT NAM"));
    setEditCompany(initialCompanyVal);
    setEditPassword(u.password || "123456");

    setEditRole(u.role);
    setEditStatus(u.status);
  };

  // Cascade link: Company -> Branch -> Department
  useEffect(() => {
    if (editingUser && editCompany) {
      const selectedC = companies.find((c) => c.name === editCompany);
      if (selectedC) {
        const companyBranches = branches.filter((b) => b.companyId === selectedC.id);
        if (companyBranches.length > 0) {
          const hasCurrentBranch = companyBranches.some((b) => b.name === editBranch);
          if (!hasCurrentBranch) {
            setEditBranch(companyBranches[0].name);
          }
        } else {
          setEditBranch("");
        }
      }
    }
  }, [editCompany, companies, branches, editingUser]);

  useEffect(() => {
    if (editingUser && editBranch) {
      const selectedB = branches.find((b) => b.name === editBranch);
      if (selectedB) {
        const branchDepts = departments.filter((d) => d.branchId === selectedB.id);
        if (branchDepts.length > 0) {
          const hasCurrentDept = branchDepts.some((d) => d.name === editDepartment);
          if (!hasCurrentDept) {
            setEditDepartment(branchDepts[0].name);
          }
        } else {
          setEditDepartment("");
        }
      }
    }
  }, [editBranch, branches, departments, editingUser]);

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updatedUser: User = {
      ...editingUser,
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      department: editDepartment,
      branch: editBranch,
      role: editRole,
      status: editStatus,
      password: editPassword,
      company: editCompany,
    };
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
    setEditingUser(null);
  };

  const getLocalBranchCodeSuffix = (branchId: string) => {
    const activeBranch = branches.find((b) => b.id === branchId);
    if (!activeBranch) return "";
    const brName = activeBranch.name;
    const match = brName.match(/\(([^)]+)\)/);
    let code = match ? match[1] : "";
    if (!code) {
      const nameWithoutAccents = brName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z40-9\s]/g, "");
      const words = nameWithoutAccents.split(/\s+/).filter(Boolean);
      const lastWord = words[words.length - 1];
      if (lastWord && lastWord === lastWord.toUpperCase() && lastWord.length >= 2) {
        code = lastWord;
      } else {
        code = words.map(w => w[0]?.toUpperCase()).join("");
      }
    }
    if (!code || code.startsWith("BRANCH-") || code.startsWith("DEPT-") || code.length > 10) {
      return "";
    }
    return ` (${code})`;
  };

  const handleSelectCompany = (compId: string) => {
    setSelectedCompanyId(compId);
    const relatedBranches = branches.filter(b => b.companyId === compId);
    if (relatedBranches.length > 0) {
      setSelectedBranchId(relatedBranches[0].id);
    } else {
      setSelectedBranchId("");
    }
  };

  const activeCompanyBranches = branches.filter((b) => b.companyId === selectedCompanyId);
  const isSelectedBranchValid = activeCompanyBranches.some((b) => b.id === selectedBranchId);
  const activeBranchId = isSelectedBranchValid 
    ? selectedBranchId 
    : (activeCompanyBranches[0]?.id || "");

  const activeBranchDepartments = departments.filter((d) => d.branchId === activeBranchId);

  // Broadcast creators state
  const [newNoticeContent, setNewNoticeContent] = useState("");
  const [noticeType, setNoticeType] = useState("Quản trị viên phát sóng");

  // Chat input
  const [chatInput, setChatInput] = useState("");

  // PDF controls
  const [selectedReportFactory, setSelectedReportFactory] = useState("Tất cả nhà máy");
  const [selectedReportDate, setSelectedReportDate] = useState("17/06/2026");
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [driveSyncLogs, setDriveSyncLogs] = useState<string[]>([]);

  // Logs filters state
  const [logsSearch, setLogsSearch] = useState("");
  const [logsFactory, setLogsFactory] = useState("Tất cả");
  const [logsCategory, setLogsCategory] = useState("Tất cả");
  const [logsAbnormalOnly, setLogsAbnormalOnly] = useState(false);

  // Stats calculation
  const totalReportsCount = reports.length;
  const abnormalReportsCount = reports.filter((r) => r.isAbnormal).length;
  const safeReportsCount = totalReportsCount - abnormalReportsCount;
  const activeStaffCount = users.filter((u) => u.status === UserStatus.ACTIVE).length;
  const pendingApprovalsCount = users.filter((u) => u.status === UserStatus.PENDING).length;

  // Pie chart variables
  const colorMap: Record<Category4M1E1I, string> = {
    "CON NGƯỜI": "#4f46e5",
    "MÁY MÓC": "#10b981",
    "NGUYÊN VẬT LIỆU": "#d946ef",
    "PHƯƠNG PHÁP": "#f59e0b",
    "MÔI TRƯỜNG": "#0d9488",
    "THÔNG TIN": "#64748b"
  };

  const getCategoryStats = () => {
    const counts: Record<Category4M1E1I, number> = {
      "CON NGƯỜI": 0,
      "NGUYÊN VẬT LIỆU": 0,
      "MÁY MÓC": 0,
      "PHƯƠNG PHÁP": 0,
      "MÔI TRƯỜNG": 0,
      "THÔNG TIN": 0
    };
    reports.forEach((r) => {
      if (counts[r.category] !== undefined) counts[r.category]++;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key as Category4M1E1I]
    }));
  };

  const getFactoryStats = () => {
    const map: Record<string, { total: number; abnormal: number }> = {};
    branches.forEach((b) => {
      if (b.isScoring) {
        map[b.name] = { total: 0, abnormal: 0 };
      }
    });

    reports.forEach((r) => {
      if (map[r.factory]) {
        map[r.factory].total++;
        if (r.isAbnormal) map[r.factory].abnormal++;
      }
    });

    return Object.keys(map).map((name) => ({
      name: name.replace("Chi Nhánh ", "").replace("Nhà máy ", ""),
      "Tổng Biến Động": map[name].total,
      "Sự Cố Bất Thường": map[name].abnormal
    }));
  };

  // Handler to export daily reports and simulate uploading file to Drive
  const handleExportPDF = async () => {
    setDriveSyncLogs([]);
    setPdfProgress("Chuẩn bị biên dịch báo cáo chất lượng...");
    
    // Simulate steps
    const steps = [
      "Bộ vi xử lý: Tổng hợp dữ liệu thô...",
      "Đang tối ưu hóa tài nguyên hình ảnh WebP đính kèm...",
      "Đang kết xuất sơ đồ thống kê chi tiết từng nhà máy...",
      "Đang lập tệp PDF chữ ký số Phòng Quản Lý Chất Lượng...",
      "Khởi chạy tải xuống hệ thống..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPdfProgress(steps[i]);
    }

    try {
      // Filter reports by selected factory
      const filtered = reports.filter((r) => {
        const matchesFactory =
          selectedReportFactory === "Tất cả nhà máy" ? true : r.factory === selectedReportFactory;
        // In real cases comparing logs by selected date if matched
        return matchesFactory;
      });

      const { fileName } = await generateDailyReportPDF({
        factoryName: selectedReportFactory,
        dateString: selectedReportDate,
        reports: filtered,
        authorName: currentUser.fullName
      });

      setPdfProgress("Bản PDF đã tải xuống phần cứng thành công!");

      // Start Google Drive Auto-Storage Simulation
      setDriveSyncLogs((prev) => [
        ...prev,
        "🔄 Bắt đầu đồng bộ lưu trữ đám mây tự động...",
        `🔗 Kết nối máy chủ Google Drive xác thực tài khoản Tân Phú...`,
        `📂 Đang tìm kiếm thư mực: "My Drive > 4M1E1I Reports > Thống kê ngày ${selectedReportDate}"`,
        "⚠️ Thư mục trống. Đang tạo mới đường dẫn lưu trữ...",
        `📤 Đang truyền tải tệp tin: ${fileName} lên Drive...`
      ]);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setDriveSyncLogs((prev) => [
        ...prev,
        `✅ Đồng bộ thành công 100%!`,
        `🔗 File đã được lưu trữ tuyệt đối an toàn tại: My Drive > 4M1E1I Reports > ${selectedReportDate} > ${fileName}`
      ]);
    } catch (e) {
      setPdfProgress("Gặp sự cố phát sinh trong quá trình xuất PDF.");
    }
  };

  return (
    <div className="flex-1 bg-[#F7F9FC] text-slate-800 flex flex-col min-h-0 font-sans">
      {/* Upper Main Broadcast Marquee Bar with specific ticker text */}
      <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 border-b border-amber-600 flex items-center select-none overflow-hidden shrink-0">
        <div className="bg-red-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded mr-3 uppercase tracking-wider animate-pulse flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white block" />
          <T>BẢNG TIN NÓNG (TICKER):</T>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-marquee whitespace-nowrap text-xs flex gap-12 font-mono">
            {broadcasts.length > 0 ? (
              broadcasts.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  <span className="text-red-700 font-extrabold">✦</span>
                  <T className="font-semibold">{b.type}: {b.content}</T>
                  <T className="text-[10px] text-slate-700 font-bold">({b.sender} - {b.timestamp})</T>
                </div>
              ))
            ) : (
              <T>Hệ thống Quản lý Biến động chất lượng Tân Phú Việt Nam đang chạy an toàn.</T>
            )}
          </div>
        </div>
        {/* Connection status indicator */}
        <div className="flex items-center gap-2 ml-4 shrink-0 bg-[#1E293B] text-white rounded-full px-3 py-0.5 text-[10px] font-bold">
          <span className={`w-2 h-2 rounded-full ${offlineMode ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
          <T>{offlineMode ? "MẤT KẾT NỐI (LƯU LỌC COIL)" : "ĐANG TRỰC TUYẾN"}</T>
        </div>
      </div>

      {/* Main Admin Header Panel */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm text-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-md tracking-wider">
              <T>TÂN PHÚ 4M1E1I</T>
            </div>
            <T className="text-xs text-slate-500 font-bold tracking-wide uppercase">HỆ THỐNG KIỂM SOÁT THAY ĐỔI THEO THỜI GIAN THỰC</T>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1.5 flex items-center gap-2">
            <T>Trang Quản Trị Hệ Thống Tân Phú Group</T>
            <span className="text-xs font-medium text-slate-400 block">v4.1.3</span>
          </h1>
        </div>

        {/* Corporate Header Info Credentials */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <T>Quản trị tối cao: Lê Nhật Trường</T>
            </div>
            <T className="text-[10px] text-slate-500 block font-semibold mt-0.5">
              Bộ phận: {STANDARDIZED_QC_DEPT}
            </T>
          </div>
          <div className="border-l border-slate-300 h-8 self-center" />
          <button
            onClick={onToggleMobilePreview}
            className="px-3.5 py-2 bg-blue-650 text-white rounded-lg text-xs font-sans font-black bg-blue-600 hover:bg-blue-600 active:scale-95 transition-all text-center flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <T>XEM MOBILE LIVE</T>
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <T>Đăng xuất</T>
          </button>
        </div>
      </header>

      {/* Main Admin Workspace Container */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Navigation panel */}
        <nav className="w-full md:w-64 bg-[#1E293B] border-r border-[#1E293B] p-4 shrink-0 overflow-y-auto select-none space-y-2 text-white">
          <T className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest pl-3 block mb-3">PANEL ĐIỀU HÀNH</T>
          {[
            { id: "PHÊ_DUYỆT", label: "Phê duyệt nhân sự", icon: UserCheck, count: pendingApprovalsCount, color: "text-amber-400" },
            { id: "MÃ_HÓA", label: "Khai báo mã hóa", icon: Sliders, color: "text-purple-400" },
            { id: "TRIỂN_KHAI", label: "Triển khai đơn hàng", icon: Package, color: "text-rose-400" },
            { id: "THỐNG_KÊ", label: "Báo cáo thống kê", icon: BarChart4, color: "text-emerald-400" },
            { id: "DỮ_LỆU", label: "Nhật ký dữ liệu & PDF", icon: Database, color: "text-blue-450" },
            { id: "THÔNG_BÁO", label: "Phát sóng & Ticker", icon: Bell, color: "text-yellow-400" },
            { id: "TRAO_ĐỔI", label: "Trao đổi diễn đàn", icon: MessageSquare, color: "text-pink-400" },
            { id: "QUY_CHẾ", label: "Quy chế & Quy trình", icon: FileSpreadsheet, color: "text-teal-400" },
            { id: "CÁ_NHÂN", label: "Thông tin cá nhân", icon: Users, color: "text-slate-300" }
          ].map((item) => {
            const isSel = activeTab === item.id || (item.id === "DỮ_LỆU" && activeTab === "DỮ_LIỆU");
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isSel
                    ? "bg-[#0F172A] text-blue-400 font-bold border-l-4 border-blue-500 shadow-inner"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <T>{item.label}</T>
                </div>
                {item.count && item.count > 0 ? (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full block animate-bounce">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="pt-6 border-t border-slate-800/60">
            <div className="bg-[#0F172A] p-3.5 rounded-xl border border-slate-800/80">
              <T className="text-xs font-bold text-white block">Tóm tắt số liệu 4M1E1I</T>
              <div className="grid grid-cols-2 gap-2 mt-2 select-none">
                <div className="bg-[#1E293B] p-2 rounded border border-slate-700 text-center">
                  <T className="text-[10px] text-slate-400 block font-bold leading-none uppercase">Đóng góp</T>
                  <T className="text-base font-bold text-blue-400 block mt-1">{totalReportsCount}</T>
                </div>
                <div className="bg-[#1E293B] p-2 rounded border border-slate-700 text-center">
                  <T className="text-[10px] text-red-400 block font-bold leading-none uppercase">Bất thường</T>
                  <T className="text-base font-bold text-red-400 block mt-1">{abnormalReportsCount}</T>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Dynamic workspace container */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#F7F9FC]">
          {/* TAB 1: PHÊ DUYỆT (Personnel management) */}
          {activeTab === "PHÊ_DUYỆT" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-500" />
                    <T>Phê duyệt hoạt động Nhân viên</T>
                  </h2>
                  <T className="text-xs text-slate-500 mt-1 block">Quản lý duyệt cấp phép truy cập, chỉnh sửa phân quyền và kích hoạt tài khoản của nhân viên các xưởng.</T>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                        <th className="p-4"><T>Họ tên nhân viên / SĐT</T></th>
                        <th className="p-4"><T>Thuộc bộ phận / Chi nhánh</T></th>
                        <th className="p-4"><T>Vai trò phân cấp</T></th>
                        <th className="p-4"><T>Phê duyệt trạng thái</T></th>
                        <th className="p-4 text-center"><T>Phân bổ thao tác</T></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {(() => {
                        let filteredUsers = [...users];
                        // If current user is REVIEWER (approver/Trưởng nhóm), only show users in their branch
                        if (currentUser.role === UserRole.REVIEWER) {
                          filteredUsers = filteredUsers.filter((u) => u.branch === currentUser.branch);
                        }
                        
                        if (filteredUsers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold select-none">
                                <T>Không tìm thấy danh sách nhân sự cần thao tác thuộc chi nhánh của bạn.</T>
                              </td>
                            </tr>
                          );
                        }

                        return filteredUsers.map((u) => {
                          const isSelf = u.id === currentUser.id;
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 select-none border border-slate-200">
                                    {u.fullName.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <T className="font-extrabold text-slate-800 text-[12px] uppercase">{u.fullName}</T>
                                      <span className="bg-blue-50 text-blue-600 border border-blue-150 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider">
                                        MS: {u.id}
                                      </span>
                                      {isSelf && (
                                        <span className="bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase">
                                          <T>Bạn</T>
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-slate-400 font-mono text-[11px] mt-0.5 block">
                                      {u.phone}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 leading-relaxed">
                                <div className="text-slate-800 font-extrabold text-[11.5px]">{u.department}</div>
                                <div className="text-slate-400 text-[10.5px] font-medium">{u.branch}</div>
                              </td>
                              <td className="p-4 select-none">
                                <select
                                  value={u.role}
                                  disabled={isSelf}
                                  onChange={(e) => onUpdateUserRole(u.id, e.target.value as UserRole)}
                                  className={`px-2 py-1 rounded text-[10px] font-extrabold cursor-pointer border ${
                                    u.role === UserRole.ADMIN
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : u.role === UserRole.REVIEWER
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  } focus:outline-none`}
                                >
                                  <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                                  <option value={UserRole.REVIEWER}>{UserRole.REVIEWER}</option>
                                  <option value={UserRole.STAFF}>{UserRole.STAFF}</option>
                                </select>
                              </td>
                              <td className="p-4 select-none">
                                {u.status === UserStatus.ACTIVE ? (
                                  <span className="bg-[#DEF7EC] text-[#03543F] text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-100 inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" />
                                    <T>{UserStatus.ACTIVE}</T>
                                  </span>
                                ) : u.status === UserStatus.PENDING ? (
                                  <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-2 py-1 rounded-full border border-amber-150 inline-flex items-center gap-1.5 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block" />
                                    <T>{UserStatus.PENDING}</T>
                                  </span>
                                ) : u.status === UserStatus.REJECTED ? (
                                  <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full border border-red-150 inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />
                                    <T>{UserStatus.REJECTED}</T>
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-full border border-slate-200 inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 block" />
                                    <T>{UserStatus.LOCKED}</T>
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center items-center gap-1.5 select-none">
                                  {/* Button 1: Đặc cách (Zap) */}
                                  {u.role !== UserRole.ADMIN && onUpdateUser && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateUser({
                                          ...u,
                                          canSpeciallyEditDelete: !u.canSpeciallyEditDelete
                                        });
                                      }}
                                      className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                                        u.canSpeciallyEditDelete
                                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100/80"
                                          : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-indigo-600"
                                      }`}
                                      title={u.canSpeciallyEditDelete ? "Hủy đặt cách Sửa/Xóa bản tin chi nhánh" : "Đặt cách Sửa/Xóa bản tin chi nhánh"}
                                    >
                                      <Zap className={`w-3.5 h-3.5 ${u.canSpeciallyEditDelete ? "fill-indigo-600 font-extrabold text-indigo-700" : ""}`} />
                                    </button>
                                  )}

                                  {/* Button 2: Khóa/Mở khóa (Lock/Unlock) */}
                                  {u.status === UserStatus.ACTIVE && !isSelf && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateUserStatus(u.id, UserStatus.LOCKED)}
                                      className="p-1.5 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-500 hover:text-amber-600 transition-all cursor-pointer shadow-xs active:scale-95"
                                      title="Khóa tài khoản thành viên"
                                    >
                                      <Unlock className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {u.status === UserStatus.LOCKED && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateUserStatus(u.id, UserStatus.ACTIVE)}
                                      className="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-100 transition-all cursor-pointer shadow-xs active:scale-95"
                                      title="Mở khóa kích hoạt tài khoản"
                                    >
                                      <Lock className="w-3.5 h-3.5 fill-amber-500/10 text-amber-600" />
                                    </button>
                                  )}

                                  {/* Button 3: Kích hoạt (Check) & Từ chối (X) when PENDING */}
                                  {u.status === UserStatus.PENDING && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateUserStatus(u.id, UserStatus.ACTIVE)}
                                        className="p-1.5 bg-[#DEF7EC] text-[#03543F] border border-emerald-250 hover:bg-emerald-100 rounded-lg cursor-pointer transition-all shadow-xs active:scale-95 flex items-center justify-center animate-bounce"
                                        title="Phê duyệt kích hoạt tài khoản ngay"
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateUserStatus(u.id, UserStatus.REJECTED)}
                                        className="p-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg cursor-pointer transition-all shadow-xs active:scale-95 flex items-center justify-center"
                                        title="Từ chối yêu cầu đăng ký"
                                      >
                                        <X className="w-3.5 h-3.5 stroke-[3px]" />
                                      </button>
                                    </>
                                  )}

                                  {/* Active re-trigger for rejected users */}
                                  {u.status === UserStatus.REJECTED && (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateUserStatus(u.id, UserStatus.ACTIVE)}
                                      className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-150 rounded-lg cursor-pointer transition-all shadow-xs active:scale-95 flex items-center justify-center"
                                      title="Phê duyệt tái kích hoạt tài khoản"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                    </button>
                                  )}

                                  {/* Button 4: Sửa thành viên (Edit) */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditUser(u)}
                                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-blue-300 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer transition-all shadow-xs active:scale-95 flex items-center justify-center"
                                    title="Chỉnh sửa thông tin thành viên"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                {/* Button 5: Xóa thành viên (Delete/Trash) */}
                                {!isSelf && (
                                  userIdConfirmDlt === u.id ? (
                                    <div className="flex items-center gap-1 select-none shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteUser(u.id);
                                          setUserIdConfirmDlt(null);
                                        }}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] px-2 py-1 rounded-md transition-all cursor-pointer uppercase shadow-xs shrink-0"
                                      >
                                        <T>Xóa</T>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setUserIdConfirmDlt(null)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] px-2 py-1 rounded-md transition-all cursor-pointer uppercase shadow-xs shrink-0"
                                      >
                                        <T>Hủy</T>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUserIdConfirmDlt(u.id);
                                      }}
                                      className="p-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-250 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-all shadow-xs active:scale-95 flex items-center justify-center"
                                      title="Xóa nhân sự khỏi hệ thống"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit User Modal */}
              {editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] transition-all">
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full relative">
                    <button
                      onClick={() => setEditingUser(null)}
                      className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                      title="Đóng"
                    >
                      ✕
                    </button>

                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <Edit className="w-4 h-4 text-[#1e3a8a]" />
                      <T>CHỈNH SỬA THÔNG TIN NHÂN VIÊN</T>
                    </h3>

                    <form onSubmit={handleSaveEditedUser} className="space-y-4">
                      {/* Họ và Tên */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                          <T>Họ và Tên</T>
                        </label>
                        <input
                          type="text"
                          required
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Số Điện Thoại & Mã Nhân Sự */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                            <T>Số Điện Thoại</T>
                          </label>
                          <input
                            type="text"
                            required
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                            <T>Mã Nhân Sự</T>
                          </label>
                          <input
                            type="text"
                            disabled
                            value={editingUser.id}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-400 bg-slate-100 select-none cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Mật khẩu đăng nhập */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                          <T>Mật khẩu đăng nhập (Mới hoặc cũ)</T>
                        </label>
                        <input
                          type="text"
                          required
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Công Ty Thành Viên */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                          <T>Công Ty Thành Viên</T>
                        </label>
                        <select
                          value={editCompany}
                          onChange={(e) => setEditCompany(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* CHI NHÁNH/ VĂN PHÒNG ĐẠI DIỆN */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                          <T>CHI NHÁNH/ VĂN PHÒNG ĐẠI DIỆN</T>
                        </label>
                        <select
                          value={editBranch}
                          onChange={(e) => setEditBranch(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
                        >
                          {(() => {
                            const selectedC = companies.find((c) => c.name === editCompany);
                            const companyBranches = selectedC
                              ? branches.filter((b) => b.companyId === selectedC.id)
                              : [];
                            if (companyBranches.length === 0) {
                              return <option value="">Chưa có chi nhánh</option>;
                            }
                            return companyBranches.map((br) => (
                              <option key={br.id} value={br.name}>
                                {br.name}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      {/* BỘ PHẬN/ ĐƠN VỊ */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                          <T>BỘ PHẬN/ ĐƠN VỊ</T>
                        </label>
                        <select
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
                        >
                          {(() => {
                            const selectedB = branches.find((b) => b.name === editBranch);
                            const filteredDepts = selectedB
                              ? departments.filter((d) => d.branchId === selectedB.id)
                              : [];
                            if (filteredDepts.length === 0) {
                              return <option value="">Chưa có bộ phận</option>;
                            }
                            return filteredDepts.map((dept) => (
                              <option key={dept.id} value={dept.name}>
                                {dept.name}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      {/* Vai trò hệ thống & Trạng thái tài khoản */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                            <T>Vai trò hệ thống</T>
                          </label>
                          <select
                            value={editRole}
                            disabled={editingUser.id === currentUser.id}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
                          >
                            <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                            <option value={UserRole.REVIEWER}>{UserRole.REVIEWER}</option>
                            <option value={UserRole.STAFF}>{UserRole.STAFF}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                            <T>Trạng thái tài khoản</T>
                          </label>
                          <select
                            value={editStatus}
                            disabled={editingUser.id === currentUser.id}
                            onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
                          >
                            <option value={UserStatus.ACTIVE}>{UserStatus.ACTIVE}</option>
                            <option value={UserStatus.PENDING}>{UserStatus.PENDING}</option>
                            <option value={UserStatus.LOCKED}>{UserStatus.LOCKED}</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingUser(null)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer uppercase"
                        >
                          <T>HỦY BỎ</T>
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#152862] text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer uppercase flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <T>CẬP NHẬT</T>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MÃ HÓA (Encoding structural registries) */}
          {activeTab === "MÃ_HÓA" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-500" />
                  <span translate="no" className="notranslate">Khai báo và Mã hóa Dữ liệu Đồng bộ</span>
                </h2>
                <div className="mt-2 bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 leading-relaxed font-medium">
                  <span translate="no" className="notranslate">
                    {"Cấu trúc danh mục gồm 3 Cấp (Cột 1: Công ty -> Cột 2: Chi nhánh/VPĐD -> Cột 3: Bộ phận/Đơn vị) đã được cập nhật hoàn chỉnh, đồng bộ trực tiếp lên Cloud Firestore (config/company_mappings) và bộ nhớ đệm localStorage của trình duyệt:"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. CÔNG TY THÀNH VIÊN CARD BOARD */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-purple-500" />
                      <span translate="no" className="notranslate font-bold text-xs uppercase tracking-wider text-purple-700">1. Công ty thành viên</span>
                    </div>
                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold font-mono">
                      {companies.length}
                    </span>
                  </div>

                  <div className="flex-1 mt-4 space-y-2.5 overflow-y-auto pr-1">
                    {companies.map((c) => {
                      const isSelected = selectedCompanyId === c.id;
                      const isEditing = editingCompanyId === c.id;

                      return (
                        <div
                          key={c.id}
                          onClick={() => !isEditing && handleSelectCompany(c.id)}
                          className={`p-3 rounded-lg flex justify-between items-center border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-50 border-purple-300 shadow-sm font-bold text-purple-900"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-2 flex-1 w-full p-2 bg-white rounded border border-purple-200" onClick={(e) => e.stopPropagation()}>
                              <div>
                                <label className="text-[10px] text-purple-700 font-bold block mb-1">TÊN CÔNG TY</label>
                                <input
                                  type="text"
                                  value={editingCompanyName}
                                  onChange={(e) => setEditingCompanyName(e.target.value)}
                                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-purple-500 font-normal animate-none"
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-purple-700 font-bold block mb-1">MÃ ID CÔNG TY</label>
                                <input
                                  type="text"
                                  value={editingCompanyIdInput}
                                  onChange={(e) => setEditingCompanyIdInput(e.target.value.replace(/\s+/g, ""))}
                                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-purple-500 font-normal font-mono"
                                />
                              </div>
                              <div className="flex gap-2 justify-end mt-1">
                                <button
                                  onClick={() => {
                                    if (!editingCompanyName.trim()) return;
                                    const finalId = editingCompanyIdInput.trim() || c.id;
                                    if (onUpdateCompany) {
                                      onUpdateCompany(c.id, { id: finalId, name: editingCompanyName.trim() });
                                    }
                                    setEditingCompanyId(null);
                                  }}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                >
                                  <span translate="no" className="notranslate">Lưu</span>
                                </button>
                                <button
                                  onClick={() => setEditingCompanyId(null)}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                >
                                  <span translate="no" className="notranslate">Hủy</span>
                                </button>
                              </div>
                            </div>
                          ) : companyIdConfirmDlt === c.id ? (
                            <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5 min-w-0 mr-1.5">
                                <span className="text-[10px] text-rose-600 font-extrabold select-none uppercase tracking-wider">
                                  <span translate="no" className="notranslate">Xác nhận xóa?</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    onDeleteCompany(c.id);
                                    if (selectedCompanyId === c.id) {
                                      const remaining = companies.filter(item => item.id !== c.id);
                                      if (remaining.length > 0) {
                                        handleSelectCompany(remaining[0].id);
                                      } else {
                                        setSelectedCompanyId("");
                                        setSelectedBranchId("");
                                      }
                                    }
                                    setCompanyIdConfirmDlt(null);
                                  }}
                                  className="bg-rose-650 hover:bg-rose-700 text-white font-extrabold text-[9px] px-2 py-1 rounded transition-colors cursor-pointer uppercase shrink-0"
                                >
                                  <span translate="no" className="notranslate">Xóa</span>
                                </button>
                                <button
                                  onClick={() => setCompanyIdConfirmDlt(null)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] px-2 py-1 rounded transition-colors cursor-pointer uppercase shrink-0"
                                >
                                  <span translate="no" className="notranslate">Hủy</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 min-w-0 mr-2">
                                {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                                <span translate="no" className="notranslate text-xs font-bold leading-normal truncate block">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <span translate="no" className="notranslate text-[9px] text-slate-400 font-mono">ID: {c.id}</span>
                                <button
                                  onClick={() => {
                                    setEditingCompanyId(c.id);
                                    setEditingCompanyName(c.name);
                                    setEditingCompanyIdInput(c.id);
                                  }}
                                  className="text-slate-400 hover:text-purple-650 p-1 rounded hover:bg-slate-200/50 transition-colors cursor-pointer"
                                  title="Chỉnh sửa tên và ID Công ty"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setCompanyIdConfirmDlt(c.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-650 p-1 rounded hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
                                  title="Xóa vĩnh viễn Công ty"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Tên Công ty..."
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm"
                      />
                      <input
                        type="text"
                        placeholder="Mã ID (tùy chọn)..."
                        value={newCompanyId}
                        onChange={(e) => setNewCompanyId(e.target.value.replace(/\s+/g, ""))}
                        className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm font-mono"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!newCompanyName.trim()) return;
                        const finalId = newCompanyId.trim() || `COMP-${Date.now()}`;
                        onAddCompany({ id: finalId, name: newCompanyName.trim() });
                        setSelectedCompanyId(finalId);
                        setNewCompanyName("");
                        setNewCompanyId("");
                      }}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span translate="no" className="notranslate">Thêm Công ty</span>
                    </button>
                  </div>
                </div>

                {/* 2. CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN CARD BOARD */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-500" />
                      <span translate="no" className="notranslate font-bold text-xs uppercase tracking-wider text-emerald-700">2. Chi nhánh / VPĐD</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-mono">
                      {activeCompanyBranches.length}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium mt-2 leading-relaxed">
                    <span translate="no" className="notranslate">
                      * Nhấp chọn chi nhánh dưới đây để xem các bộ phận trực thuộc ở Cột 3.
                    </span>
                  </div>

                  <div className="flex-1 mt-2 space-y-2.5 overflow-y-auto pr-1">
                    {activeCompanyBranches.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs font-medium">
                        <span translate="no" className="notranslate">Chưa có chi nhánh nào thuộc công ty này.</span>
                      </div>
                    ) : (
                      activeCompanyBranches.map((b) => {
                        const isSelected = activeBranchId === b.id;
                        const isEditing = editingBranchId === b.id;

                        return (
                          <div
                            key={b.id}
                            onClick={() => !isEditing && setSelectedBranchId(b.id)}
                            className={`p-3 rounded-lg flex justify-between items-center border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-50 border-emerald-300 shadow-sm font-bold text-emerald-900"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex flex-col gap-2 flex-1 w-full p-2 bg-white rounded border border-emerald-200" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="text-[10px] text-emerald-700 font-bold block mb-1">TÊN CHI NHÁNH / VPĐD</label>
                                  <input
                                    type="text"
                                    value={editingBranchName}
                                    onChange={(e) => setEditingBranchName(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal"
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-emerald-700 font-bold block mb-1">MÃ ID CHI NHÁNH</label>
                                  <input
                                    type="text"
                                    value={editingBranchIdInput}
                                    onChange={(e) => setEditingBranchIdInput(e.target.value.replace(/\s+/g, ""))}
                                    className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 font-normal font-mono"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end mt-1">
                                  <button
                                    onClick={() => {
                                      if (!editingBranchName.trim()) return;
                                      const finalId = editingBranchIdInput.trim() || b.id;
                                      if (onUpdateBranch) {
                                        onUpdateBranch(b.id, { ...b, id: finalId, name: editingBranchName.trim() });
                                      }
                                      setEditingBranchId(null);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                  >
                                    <span translate="no" className="notranslate">Lưu</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingBranchId(null)}
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                  >
                                    <span translate="no" className="notranslate">Hủy</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                    <span translate="no" className="notranslate text-xs font-bold text-slate-800 block truncate leading-normal">
                                      {b.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 select-none">
                                    <span translate="no" className="notranslate text-[9px] text-slate-400 font-mono font-medium">ID: {b.id}</span>
                                    {b.isScoring && (
                                      <span translate="no" className="notranslate text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-1 rounded uppercase tracking-wide">
                                        ĐÁNH GIÁ 4M1E1I
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      if (onUpdateBranch) {
                                        onUpdateBranch(b.id, { ...b, isScoring: !b.isScoring });
                                      }
                                    }}
                                    className={`p-1.5 rounded hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0 ${
                                      b.isScoring ? "text-rose-600 hover:text-rose-700" : "text-slate-400 hover:text-emerald-600"
                                    }`}
                                    title={b.isScoring ? "Tắt Đánh Giá 4M1E1I" : "Bật Đánh Giá 4M1E1I"}
                                  >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingBranchId(b.id);
                                      setEditingBranchName(b.name);
                                      setEditingBranchIdInput(b.id);
                                    }}
                                    className="text-slate-400 hover:text-emerald-650 p-1.5 rounded hover:bg-slate-200/50 transition-colors cursor-pointer"
                                    title="Chỉnh sửa Chi nhánh"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      onDeleteBranch(b.id);
                                    }}
                                    className="text-slate-400 hover:text-rose-650 p-1.5 rounded hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Tên Chi nhánh..."
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                      />
                      <input
                        type="text"
                        placeholder="Mã ID (tùy chọn)..."
                        value={newBranchId}
                        onChange={(e) => setNewBranchId(e.target.value.replace(/\s+/g, ""))}
                        className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm font-mono"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!newBranchName.trim()) return;
                        const finalId = newBranchId.trim() || `BRANCH-${Date.now()}`;
                        onAddBranch({
                           id: finalId,
                           name: newBranchName.trim(),
                           companyId: selectedCompanyId,
                           isScoring: true
                        });
                        setSelectedBranchId(finalId);
                        setNewBranchName("");
                        setNewBranchId("");
                      }}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span translate="no" className="notranslate">Thêm Chi nhánh</span>
                    </button>
                  </div>
                </div>

                {/* 3. BỘ PHẬN / ĐƠN VỊ CARD BOARD */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-500" />
                      <span translate="no" className="notranslate font-bold text-xs uppercase tracking-wider text-amber-700">3. Bộ phận / Đơn vị</span>
                    </div>
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold font-mono">
                      {activeBranchDepartments.length}
                    </span>
                  </div>

                  <div className="flex-1 mt-4 space-y-2.5 overflow-y-auto pr-1 max-h-[480px]">
                    {activeBranchId === "" ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-medium">
                        <span translate="no" className="notranslate">Vui lòng nhấp chọn một chi nhánh ở Cột 2.</span>
                      </div>
                    ) : activeBranchDepartments.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-medium">
                        <span translate="no" className="notranslate">Chưa có bộ phận nào thuộc chi nhánh này.</span>
                      </div>
                    ) : (
                      activeBranchDepartments.map((d) => {
                        const isEditing = editingDeptId === d.id;
                        return (
                          <div key={d.id} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg flex justify-between items-center border border-slate-200">
                            {isEditing ? (
                              <div className="flex flex-col gap-2 flex-1 w-full p-2 bg-white rounded border border-amber-200" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="text-[10px] text-amber-700 font-bold block mb-1">TÊN BỘ PHẬN / ĐƠN VỊ</label>
                                  <input
                                    type="text"
                                    value={editingDeptName}
                                    onChange={(e) => setEditingDeptName(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 font-normal"
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-amber-700 font-bold block mb-1">MÃ ID BỘ PHẬN</label>
                                  <input
                                    type="text"
                                    value={editingDeptIdInput}
                                    onChange={(e) => setEditingDeptIdInput(e.target.value.replace(/\s+/g, ""))}
                                    className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 font-normal font-mono"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end mt-1">
                                  <button
                                    onClick={() => {
                                      if (!editingDeptName.trim()) return;
                                      let cleanName = editingDeptName.trim();
                                      const suffix = getLocalBranchCodeSuffix(d.branchId);
                                      if (!cleanName.endsWith(suffix)) {
                                        cleanName = cleanName.replace(/\s\([A-Z0-9-]+\)$/, "").trim();
                                        cleanName = `${cleanName}${suffix}`;
                                      }
                                      const finalId = editingDeptIdInput.trim() || d.id;
                                      if (onUpdateDepartment) {
                                        onUpdateDepartment(d.id, { ...d, id: finalId, name: cleanName });
                                      }
                                      setEditingDeptId(null);
                                    }}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                  >
                                    <span translate="no" className="notranslate">Lưu</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingDeptId(null)}
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                                  >
                                    <span translate="no" className="notranslate">Hủy</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="min-w-0 flex-1 pr-2">
                                  <span translate="no" className="notranslate text-xs font-bold text-slate-800 block leading-normal break-words">{d.name}</span>
                                  <div className="flex items-center gap-1.5 mt-1 select-none flex-wrap">
                                    <span translate="no" className="notranslate text-[9px] text-slate-400 font-mono font-medium">ID: {d.id}</span>
                                    {d.name.startsWith(STANDARDIZED_QC_DEPT) && (
                                      <span translate="no" className="notranslate text-[8px] bg-blue-50 text-blue-700 px-1 py-[0.5px] rounded border border-blue-200 tracking-wider font-mono font-bold">
                                        BP TIÊU CHUẨN
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      const suffix = getLocalBranchCodeSuffix(d.branchId);
                                      let displayName = d.name;
                                      if (displayName.endsWith(suffix)) {
                                        displayName = displayName.substring(0, displayName.length - suffix.length);
                                      } else {
                                        displayName = displayName.replace(/\s\([A-Z0-9-]+\)$/, "").trim();
                                      }
                                      setEditingDeptId(d.id);
                                      setEditingDeptName(displayName);
                                      setEditingDeptIdInput(d.id);
                                    }}
                                    className="text-slate-400 hover:text-amber-650 p-1.5 rounded hover:bg-slate-200/50 transition-colors cursor-pointer"
                                    title="Chỉnh sửa Bộ phận"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteDepartment(d.id)}
                                    className="text-slate-400 hover:text-rose-650 p-1.5 rounded hover:bg-slate-200/50 transition-colors cursor-pointer shrink-0"
                                    disabled={d.name.startsWith(STANDARDIZED_QC_DEPT)} // Cannot delete default standardized
                                  >
                                    <Trash2 className="w-3.5 h-3.5 disabled:opacity-30" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nhập tên Bộ phận..."
                        value={newDeptName}
                        disabled={activeBranchId === ""}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm disabled:opacity-55"
                      />
                      <input
                        type="text"
                        placeholder="Mã ID (tùy chọn)..."
                        value={newDeptId}
                        disabled={activeBranchId === ""}
                        onChange={(e) => setNewDeptId(e.target.value.replace(/\s+/g, ""))}
                        className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm font-mono disabled:opacity-55"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!newDeptName.trim() || activeBranchId === "") return;
                        const finalId = newDeptId.trim() || `DEPT-${Date.now()}`;
                        onAddDepartment({
                          id: finalId,
                          name: newDeptName.trim(),
                          branchId: activeBranchId
                        });
                        setNewDeptName("");
                        setNewDeptId("");
                      }}
                      disabled={activeBranchId === ""}
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1 disabled:opacity-55"
                    >
                      <Plus className="w-4 h-4" />
                      <span translate="no" className="notranslate">Thêm Bộ phận</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "TRIỂN_KHAI" && (
            <OrderPipeline
              currentUser={currentUser}
              branches={branches}
              departments={departments}
              productionRequests={productionRequests}
              setProductionRequests={setProductionRequests}
              productionRequestItemsMap={productionRequestItemsMap}
              setProductionRequestItemsMap={setProductionRequestItemsMap}
              orderImplementations={orderImplementations}
              setOrderImplementations={setOrderImplementations}
              productsCatalog={productsCatalog}
              setProductsCatalog={setProductsCatalog}
              moldsCatalog={moldsCatalog}
              setMoldsCatalog={setMoldsCatalog}
            />
          )}

          {/* TAB 3: THỐNG KÊ (Business Analytics) */}
          {activeTab === "THỐNG_KÊ" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                  <BarChart4 className="w-5 h-5 text-emerald-500" />
                  <T>Trung tâm Thống kê Phân tích Chất lượng</T>
                </h2>
                <T className="text-xs text-slate-500 mt-1 block">Biểu đồ hóa các yếu tố biến động theo phân loại 4M1E1I, tỷ lệ sự cố tại 4 nhà máy và lượng lưu trữ WebP tiết kiệm.</T>
              </div>

              {/* Status numerical board */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <T className="text-[10px] text-slate-500 block font-bold uppercase tracking-wide">TỔNG SỐ BIẾN ĐỘNG</T>
                  <T className="text-2xl font-bold block text-blue-600 mt-1">{totalReportsCount}</T>
                  <T className="text-[9px] text-slate-450 block">Ổn định tích lũy 30 ngày qua</T>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-red-650">
                  <T className="text-[10px] text-red-500 block font-bold uppercase tracking-wide">SỰ CỐ BẤT THƯỜNG</T>
                  <T className="text-2xl font-extrabold block mt-1">{abnormalReportsCount}</T>
                  <T className="text-[9px] text-slate-450 block">Yêu cầu can thiệp khẩn cấp</T>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-emerald-650">
                  <T className="text-[10px] text-emerald-600 block font-bold uppercase tracking-wide">VẬN HÀNH AN TOÀN</T>
                  <T className="text-2xl font-bold block mt-1">{safeReportsCount}</T>
                  <T className="text-[9px] text-slate-450 block">Được phê duyệt bởi QC</T>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-purple-650">
                  <T className="text-[10px] text-purple-650 block font-bold uppercase tracking-wide">TIẾT KIỆM BĂNG THÔNG</T>
                  <T className="text-2xl font-bold block mt-1">74%</T>
                  <T className="text-[9px] text-slate-450 block">Nhờ động cơ ảnh nén WebP</T>
                </div>
              </div>

              {/* Vector charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Categorized Proportion Chart (4M1E1I Proportion) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <T className="text-xs font-extrabold uppercase tracking-widest text-emerald-650 pb-3 border-b border-slate-100 block mb-4">
                    Tỉ Lệ Đóng Góp 4M1E1I Chất Lượng
                  </T>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                           data={getCategoryStats()}
                           cx="50%"
                           cy="50%"
                           outerRadius={80}
                           paddingAngle={3}
                           dataKey="value"
                        >
                          {getCategoryStats().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colorMap[entry.name as Category4M1E1I] || "#64748b"} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Defect abnormal rates across 4 factories */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <T className="text-xs font-extrabold uppercase tracking-widest text-blue-650 pb-3 border-b border-slate-100 block mb-4">
                    Phân Tích Biến Động Theo Từng Nhà Máy (4 Xưởng)
                  </T>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getFactoryStats()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "10px" }} />
                        <YAxis stroke="#64748b" style={{ fontSize: "10px" }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="Tổng Biến Động" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Sự Cố Bất Thường" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DỮ LIỆU (Database history & PDF exports) */}
          {activeTab === "DỮ_LỆU" && (
            <div className="space-y-6">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    <T>Sổ nhật ký Biến động & Trực quan PDF</T>
                  </h2>
                  <T className="text-xs text-slate-500 mt-1 block">Khung rà soát dữ liệu sự cố toàn cục, xuất báo cáo ngày PDF tự động lưu trữ lên thư mục Drive.</T>
                </div>

                {/* PDF compilation controls */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  <div className="select-none">
                    <label className="text-[9px] text-slate-550 font-bold block uppercase mb-1"><T>Chọn Nhà máy xuất PDF:</T></label>
                    <select
                      value={selectedReportFactory}
                      onChange={(e) => setSelectedReportFactory(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded p-1.5 focus:outline-none w-36 select-none shadow-sm"
                    >
                      <option value="Tất cả nhà máy">Tất cả nhà máy</option>
                      {branches.filter((b) => b.isScoring).map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="select-none">
                    <label className="text-[9px] text-slate-550 font-bold block uppercase mb-1"><T>Ngày báo cáo:</T></label>
                    <input
                      type="text"
                      value={selectedReportDate}
                      onChange={(e) => setSelectedReportDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded p-1.5 focus:outline-none w-28 text-center font-mono shadow-sm"
                    />
                  </div>

                  <button
                    onClick={handleExportPDF}
                    className="self-end px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto xl:ml-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <T>XUẤT REPORT NGAY & DRIVE</T>
                  </button>
                </div>
              </div>

              {/* Progress feedback for compiled reports */}
              {pdfProgress && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-sm animate-fade-in space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                    <T className="text-xs font-bold text-blue-800 block">{pdfProgress}</T>
                  </div>

                  {driveSyncLogs.length > 0 && (
                    <div className="bg-slate-50 rounded p-3 font-mono text-[10px] text-slate-700 space-y-1 block border border-slate-200">
                      {driveSyncLogs.map((log, index) => (
                        <div key={index}>
                          <T>{log}</T>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Filter controls panel */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <label className="text-[9px] text-slate-555 font-extrabold uppercase block mb-1">Từ khóa tìm kiếm:</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nội dung, người ghi..."
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded px-8 py-1.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="select-none">
                  <label className="text-[9px] text-slate-555 font-extrabold uppercase block mb-1">Xưởng/Nhà máy:</label>
                  <select
                    value={logsFactory}
                    onChange={(e) => setLogsFactory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded p-1.5 text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Tất cả">Tất cả</option>
                    {branches.filter((b) => b.isScoring).map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="select-none">
                  <label className="text-[9px] text-slate-555 font-extrabold uppercase block mb-1">Yếu tố 4M1E1I:</label>
                  <select
                    value={logsCategory}
                    onChange={(e) => setLogsCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded p-1.5 text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Tất cả">Tất cả</option>
                    <option value="CON NGƯỜI">CON NGƯỜI</option>
                    <option value="MÁY MÓC">MÁY MÓC</option>
                    <option value="NGUYÊN VẬT LIỆU">NGUYÊN VẬT LIỆU</option>
                    <option value="PHƯƠNG PHÁP">PHƯƠNG PHÁP</option>
                    <option value="MÔI TRƯỜNG">MÔI TRƯỜNG</option>
                    <option value="THÔNG TIN">THÔNG TIN</option>
                  </select>
                </div>

                <div className="flex items-center h-full pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={logsAbnormalOnly}
                      onChange={(e) => setLogsAbnormalOnly(e.target.checked)}
                      className="rounded border-slate-300 bg-slate-50 accent-red-650 block"
                    />
                    <T className="text-xs font-bold text-red-600">CHỈ XEM BẤT THƯỜNG (RED)</T>
                  </label>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                        <th className="p-4 w-12 text-center">STT</th>
                        <th className="p-4">Thời gian</th>
                        <th className="p-4">Nhà máy / Xưởng</th>
                        <th className="p-4 text-center">Phân tố.</th>
                        <th className="p-4 w-[40%]">Nội dung chi tiết</th>
                        <th className="p-4">Người ghi / SĐT</th>
                        <th className="p-4 text-center">Người Thích</th>
                        <th className="p-4 text-center">BP/ĐV Tiếp Nhận</th>
                        <th className="p-4 text-center">Hình ảnh</th>
                        <th className="p-4 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {reports
                        .filter((r) => {
                          const s = logsSearch.toLowerCase();
                          const matchesSearch =
                            r.uploaderName.toLowerCase().includes(s) ||
                            r.content.toLowerCase().includes(s) ||
                            r.category.toLowerCase().includes(s);

                          const matchesFactory = logsFactory === "Tất cả" ? true : r.factory === logsFactory;
                          const matchesCategory = logsCategory === "Tất cả" ? true : r.category === logsCategory;
                          const matchesAbnormal = logsAbnormalOnly ? r.isAbnormal : true;

                          return matchesSearch && matchesFactory && matchesCategory && matchesAbnormal;
                        })
                        .map((r, index) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-center font-mono text-slate-400">{index + 1}</td>
                            <td className="p-4 font-mono font-semibold text-slate-500 whitespace-nowrap">{r.timestamp}</td>
                            <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{r.factory}</td>
                            <td className="p-4 text-center select-none whitespace-nowrap">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase text-white block"
                                style={{ backgroundColor: colorMap[r.category] }}
                              >
                                <T>{r.category}</T>
                              </span>
                            </td>
                            <td className="p-4 leading-relaxed text-slate-700 max-w-sm">
                              <T>{r.content}</T>
                              {r.notes && (
                                <div className="mt-1 text-[10px] text-slate-500 italic block border-l-2 border-emerald-500 pl-1.5">
                                  <T>Ghi chú: {r.notes}</T>
                                </div>
                              )}

                              {/* Display directives history in Nhật ký table row */}
                              {r.directives && r.directives.length > 0 && (
                                <div className="mt-2 space-y-1 block border-l-2 border-amber-500 pl-1.5 bg-amber-50/50 p-1.5 rounded">
                                  <div className="text-[9px] font-extrabold text-[#78350f] uppercase flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <T>Chỉ đạo / Điều hành:</T>
                                  </div>
                                  {r.directives.map((dir) => (
                                    <div key={dir.id} className="text-[10px] text-amber-800 leading-tight">
                                      <T>• {dir.text}</T> <span className="text-[9px] text-slate-400 font-mono">({dir.author} - {dir.timestamp})</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Simple mini-form to input direct directive right inside the log table cell for leaders! */}
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const form = e.currentTarget;
                                  const input = form.elements.namedItem("desktopDirectiveInput") as HTMLInputElement;
                                  const text = input.value.trim();
                                  if (!text) return;

                                  const dateObj = new Date();
                                  const currentSingaporeTime = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() + 420) * 60000);
                                  const yy = String(currentSingaporeTime.getFullYear()).slice(-2);
                                  const mm = String(currentSingaporeTime.getMonth() + 1).padStart(2, '0');
                                  const dd = String(currentSingaporeTime.getDate()).padStart(2, '0');
                                  const timeStr = currentSingaporeTime.toTimeString().split(' ')[0];
                                  const stamp = `${timeStr} ${dd}/${mm}/${yy}`;

                                  const newDir = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    text,
                                    author: currentUser?.fullName || "Cấp quản lý",
                                    timestamp: stamp
                                  };

                                  const updatedReport = {
                                    ...r,
                                    directives: [...(r.directives || []), newDir]
                                  };

                                  if (onUpdateReport) {
                                    onUpdateReport(updatedReport);
                                  }
                                  input.value = "";
                                }}
                                className="mt-2 flex gap-1 items-center"
                              >
                                <input
                                  type="text"
                                  name="desktopDirectiveInput"
                                  placeholder="Chỉ đạo (mặc định ghi mờ bên trong ô)..."
                                  className="flex-1 bg-slate-50 border border-slate-200 text-[10px] rounded px-2 py-1 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all select-text"
                                />
                                <button
                                  type="submit"
                                  className="bg-amber-500 hover:bg-amber-600 px-2 py-1 text-[9px] text-white font-extrabold rounded uppercase cursor-pointer"
                                >
                                  <T>Gửi</T>
                                </button>
                              </form>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <T className="font-semibold block text-slate-800">{r.uploaderName}</T>
                              <T className="text-[10px] text-slate-400 block font-mono">{r.uploaderPhone}</T>
                            </td>
                            {/* Two new columns tracking likes and shares */}
                            <td className="p-4 min-w-[120px]">
                              {r.likedBy && r.likedBy.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto max-w-[140px]">
                                  {r.likedBy.map((name, i) => (
                                    <span key={i} className="bg-rose-50 text-rose-700 text-[9px] px-1.5 py-0.5 rounded border border-rose-100 font-bold whitespace-nowrap">
                                      <T>{name}</T>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic"><T>Chưa có</T></span>
                              )}
                            </td>
                            <td className="p-4 min-w-[120px]">
                              {r.sharedBy && r.sharedBy.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto max-w-[145px]">
                                  {r.sharedBy.map((name, i) => (
                                    <span key={i} className="bg-sky-50 text-sky-800 text-[9px] px-1.5 py-0.5 rounded border border-sky-100 font-bold whitespace-nowrap">
                                      <T>{name}</T>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic"><T>Chưa tiếp nhận</T></span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {r.imageUrl ? (
                                <DesktopThumbnailSlider imageUrls={r.imageUrls} fallbackUrl={r.imageUrl} />
                              ) : (
                                <T className="text-slate-400 text-[10px]">Trống</T>
                              )}
                            </td>
                            <td className="p-4 text-center select-none whitespace-nowrap">
                              {r.isAbnormal ? (
                                <T className="bg-red-50 text-red-700 border border-red-200 font-extrabold text-[9px] px-2 py-0.5 rounded uppercase block">
                                  BẤT THƯỜNG
                                </T>
                              ) : (
                                <T className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px] px-2 py-0.5 rounded uppercase block">
                                  BÌNH THƯỜNG
                                </T>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QUY CHẾ (Guidelines bylaws) */}
          {activeTab === "QUY_CHẾ" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-500" />
                  <T>Quy chế và Quy trình Vận hành 4M1E1I</T>
                </h2>
                <T className="text-xs text-slate-500 mt-1 block">Tài liệu chỉ đạo nghiệp vụ chính thức từ Phòng Quản Lý Chất Lượng Tân Phú Group về quy ước quản lý biến động chất lượng xưởng.</T>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 leading-relaxed text-sm text-slate-700 shadow-sm">
                <div className="border-b border-slate-100 pb-4 text-center">
                  <T className="text-base font-extrabold text-[#03543F] block">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</T>
                  <T className="text-xs font-bold text-slate-400 block mt-1">Độc lập - Tự do - Hạnh phúc</T>
                  <div className="w-24 h-px bg-slate-200 mx-auto mt-2" />
                </div>

                <div className="space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-l-2 border-emerald-500 pl-2">
                    <T>Mục Tiêu Chỉ Đạo Vận Hành</T>
                  </h3>
                  <T className="block text-justify text-xs text-slate-655 leading-relaxed">
                    Để đáp ứng nghiêm ngặt các chứng chỉ chất lượng quốc tế lớn gồm BRC, ISO 9001, và ISO 22000, ban giám đốc phê chuẩn quy chế bắt buộc thu thập, kiểm duyệt, và đối sánh dữ liệu biến động hàng ngày tại 4 nhà máy (Bắc Ninh, Long An, Đất Đỏ BBM, Đất Đỏ BBC) bao gồm:
                  </T>

                  {/* 4M1E1I definitions list */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium pt-2">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <T className="font-extrabold text-blue-750 uppercase tracking-wide block">1. CON NGƯỜI (Man)</T>
                      <T className="text-slate-550 block mt-1">Biến động về năng suất, số lượng lao động ca kíp nghỉ việc đột ngột hoặc lỗi do thao tác viên không tuân thủ quy tắc.</T>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <T className="font-extrabold text-purple-750 uppercase tracking-wide block">2. NGUYÊN VẬT LIỆU (Material)</T>
                      <T className="text-slate-555 block mt-1">Sự khác chủng loại vật tư, thử nghiệm thành phẩm thô thay đổi hoặc phế phẩm tái chế có dấu hiệu sai khác.</T>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <T className="font-extrabold text-emerald-750 uppercase tracking-wide block">3. MÁY MÓC (Machine)</T>
                      <T className="text-slate-555 block mt-1">Lỗi nung bồn nhiệt, mối bọc zipper kéo sợi, vệt xước phôi chai sấy hoặc mòn vỡ linh kiện máy thổi.</T>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <T className="font-extrabold text-amber-750 uppercase tracking-wide block">4. PHƯƠNG PHÁP (Method)</T>
                      <T className="text-slate-555 block mt-1">Thay đổi quy chuẩn barcode 3 kích thước S-M-L, quy ước dán nhãn phụ hoặc cải tạo chuỗi quy trình.</T>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <T className="font-extrabold text-teal-750 uppercase tracking-wide block">5. MÔI TRƯỜNG (Environment)</T>
                      <T className="text-slate-555 block mt-1">Nhiệt độ độ ẩm xưởng thay đổi, lắp đặt hệ thống năng lượng Tasco áp mái hoặc sửa đổi điều kiện vệ sinh.</T>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <T className="font-extrabold text-slate-700 uppercase tracking-wide block">6. THÔNG TIN (Information)</T>
                      <T className="text-slate-555 block mt-1">Thay đổi yêu cầu đóng gói hàng, tiếp đón thanh kiểm tra BRC của cổ đông hoặc thông báo chất lượng nội bộ.</T>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide border-l-2 border-emerald-500 pl-2 pt-2">
                    <T>Yêu cầu kỹ thuật thu ảnh hiện trường</T>
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-500">
                    <li><T>Nhân viên chụp ảnh kiểm chứng phải nén WebP tự động chất lượng bảo đảm giữ nguyên sọc chi tiết (100Kb - 200Kb).</T></li>
                    <li><T>Mã nhân sự của người cập nhật bắt buộc đúng định dạng dấu chấm như: 2018.00281 để bảo mật hành chính.</T></li>
                    <li><T>Các biến động ghi nhận hệ thống sẽ kết xuất tự động báo cáo PDF hằng ngày lưu trực tiếp lên Google Drive tại đúng quy chuẩn.</T></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CÁ NHÂN (User profile) */}
          {activeTab === "CÁ_NHÂN" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-500" />
                  <T>Thông tin Hồ sơ Cá nhân</T>
                </h2>
                <T className="text-xs text-slate-550 mt-1 block">Chi tiết danh tính đăng nhập và chi nhánh quyền quản trị của tài khoản đang hoạt động.</T>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div>
                    <T className="text-lg font-bold text-slate-800 block">{currentUser.fullName}</T>
                    <T className="text-xs text-emerald-800 bg-[#DEF7EC] px-2.5 py-0.5 rounded border border-emerald-200 font-bold inline-block mt-1 uppercase tracking-wider">
                      {currentUser.role}
                    </T>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-5 text-xs font-semibold">
                  <div>
                    <T className="text-slate-500 block uppercase text-[10px]">Mã nhân sự quản lý</T>
                    <T className="text-slate-800 block mt-1 font-mono text-sm font-bold">{currentUser.id}</T>
                  </div>
                  <div>
                    <T className="text-slate-500 block uppercase text-[10px]">Số điện thoại đăng ký</T>
                    <T className="text-slate-800 block mt-1 font-mono text-sm font-bold">{currentUser.phone}</T>
                  </div>
                  <div>
                    <T className="text-slate-500 block uppercase text-[10px]">Bộ phận tiêu chuẩn</T>
                    <T className="text-slate-800 block mt-1 text-sm font-bold">{currentUser.department || STANDARDIZED_QC_DEPT}</T>
                  </div>
                  <div>
                    <T className="text-slate-500 block uppercase text-[10px]">Tập đoàn chủ quản và Chi nhánh</T>
                    <T className="text-slate-800 block mt-1 text-sm font-bold">{currentUser.branch}</T>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: THÔNG BÁO (Broadcast ticker manager & bulletin board creator) */}
          {activeTab === "THÔNG_BÁO" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-yellow-500" />
                  <T>Trung tâm Phát sóng & Ticker Thông báo</T>
                </h2>
                <T className="text-xs text-slate-500 mt-1 block">Thiết lập ticker (chữ chạy) khẩn cấp trên đỉnh hệ thống và tạo mới các tin nhắn chỉ đạo cho Nhật ký bảng tin.</T>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* News broadcaster form */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <T className="font-extrabold text-xs uppercase text-slate-500 tracking-wider block pb-2 border-b border-slate-100">
                    Kích hoạt thông cáo chỉ thị
                  </T>

                  <div className="select-none">
                    <label className="text-[10px] text-slate-500 block font-bold uppercase mb-1">Kiểu phát sóng:</label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded p-2 focus:outline-none w-full shadow-sm"
                    >
                      <option value="Quản trị viên phát sóng">Quản trị viên phát sóng</option>
                      <option value="Hệ thống tự động">Hệ thống tự động</option>
                      <option value="🔴 CHỈ THỊ KHẨN">🔴 CHỈ THỊ KHẨN</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block font-bold uppercase mb-1">Nội dung thông cáo:</label>
                    <textarea
                      rows={3}
                      value={newNoticeContent}
                      onChange={(e) => setNewNoticeContent(e.target.value)}
                      placeholder="Nhập dòng chữ chạy phát sóng hoặc tin nhắn hiển thị tại bảng tin nóng..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-none shadow-sm"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!newNoticeContent.trim()) return;
                      onAddBroadcast(newNoticeContent, noticeType);
                      setNewNoticeContent("");
                    }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <T>PHÁT SÓNG NGAY TỨC THÌ</T>
                  </button>
                </div>

                {/* Bulletin Logs list representing snapshot */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[320px]">
                  <T className="font-extrabold text-xs uppercase text-slate-500 tracking-wider block pb-2 border-b border-slate-100">
                    Nhật ký bảng tin hiện sống
                  </T>

                  <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1 font-mono text-[11px]">
                    {broadcasts.map((b) => (
                      <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex justify-between font-bold text-[10px]">
                          <T className="text-emerald-700">{b.type}</T>
                          <T className="text-slate-400">{b.timestamp}</T>
                        </div>
                        <T className="text-slate-700 block mt-1.5 leading-relaxed font-sans">{b.content}</T>
                        <T className="text-[9px] text-slate-400 block text-right mt-1 font-sans">— Chỉ đạo bởi: {b.sender}</T>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: TRAO ĐỔI (Live Forum) */}
          {activeTab === "TRAO_ĐỔI" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-pink-500" />
                  <T>Diễn đàn Trao đổi & Định hướng Chất lượng</T>
                </h2>
                <T className="text-xs text-slate-500 mt-1 block">Nơi trao đổi ý kiến, đề xuất khắc phục lỗi cơ khí và cập nhật năng suất lao động giữa các QC xưởng.</T>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-[520px] shadow-sm">
                {/* Chat items scroll */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 p-1">
                  {chats.map((c) => {
                    const isSelfMsg = c.senderPhone === currentUser.phone;
                    return (
                      <div
                        key={c.id}
                        className={`flex gap-3 max-w-xl ${isSelfMsg ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold flex items-center justify-center shrink-0">
                          {c.senderName.charAt(0)}
                        </div>
                        <div>
                          <div className={`flex items-center gap-2 ${isSelfMsg ? "justify-end" : ""}`}>
                            <T className="text-[10px] font-bold text-slate-500">{c.senderName}</T>
                            <T className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-[1px] rounded border border-slate-200">
                              {c.senderRole}
                            </T>
                            <T className="text-[8px] text-slate-400">{c.timestamp.split(" ")[1] || c.timestamp}</T>
                          </div>
                          <div
                            className={`mt-1.5 p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${
                              isSelfMsg
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-right rounded-tr-none"
                                : "bg-slate-50 rounded-tl-none border border-slate-200 text-slate-700"
                            }`}
                          >
                            <T>{c.message}</T>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Form submit messaging */}
                <div className="pt-4 border-t border-slate-100 mt-4 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatInput.trim()) {
                        onAddChatMessage(chatInput);
                        setChatInput("");
                      }
                    }}
                    placeholder="Mời nhập nội dung trao đổi hoặc báo cáo khẩn đến kíp trực..."
                    className="flex-1 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none shadow-sm"
                  />
                  <button
                    onClick={() => {
                      if (!chatInput.trim()) return;
                      onAddChatMessage(chatInput);
                      setChatInput("");
                    }}
                    className="px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <T>GỬI</T>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
