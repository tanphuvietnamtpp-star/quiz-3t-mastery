import React, { useState, useEffect, useRef } from "react";
import { Search, RotateCw, Plus, Users, Cpu, FileText, Settings, Heart, BellOff, Bell, Info, ArrowLeft, Camera, Trash2, Edit, Maximize, Minimize, ArrowUp, Share2, Copy, ExternalLink, MessageSquare, Check, X, LogOut } from "lucide-react";
import { QualityReport, Category4M1E1I, User, UserRole, Branch } from "../types";
import { T } from "./TranslateText";

interface AutoImageSliderProps {
  imageUrls?: string[];
  fallbackUrl: string;
  isAbnormal?: boolean;
}

export function AutoImageSlider({ imageUrls, fallbackUrl, isAbnormal }: AutoImageSliderProps) {
  const list = imageUrls && imageUrls.length > 0 ? imageUrls : [fallbackUrl];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % list.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [list]);

  return (
    <div className="relative group bg-slate-900 border-b border-slate-100 flex items-center justify-center overflow-hidden h-44 w-full select-none">
      {list.map((url, i) => (
        <img
          key={url + i}
          src={url}
          alt={`Slide ${i}`}
          referrerPolicy="no-referrer"
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
            i === index ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0"
          }`}
        />
      ))}
      
      {/* Indicator Dots */}
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20 bg-black/60 px-2 py-1 rounded-full">
          {list.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === index ? "bg-white scale-110" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {isAbnormal && (
        <div className="absolute top-0 inset-x-0 bg-red-600 bg-opacity-85 text-white py-1px px-3 flex items-center gap-1.5 z-20 py-1">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse block shrink-0" />
          <T className="text-[10px] font-bold block uppercase tracking-wide leading-none select-none">
            PHÁT HIỆN BIẾN ĐỘNG BẤT THƯỜNG
          </T>
        </div>
      )}
    </div>
  );
}

interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "new_report" | "new_directive" | "update_report";
  targetReportId: string;
  authorName: string;
  factoryName: string;
}

interface MobileFrameProps {
  reports: QualityReport[];
  currentUserId: string;
  onOpenReportForm: () => void;
  onDeleteReport: (id: string) => void;
  onEditReport: (report: QualityReport) => void;
  offlineMode: boolean;
  currentUser?: User | null;
  onUpdateReport?: (report: QualityReport) => void;
  mobileUIConfig?: {
    displayRule?: "clean" | "full" | "custom";
    columns?: number;
    padding?: "compact" | "normal" | "spacious";
    colorTheme?: "blue" | "indigo" | "emerald" | "amber" | "rose" | "slate";
    fontSize?: "xs" | "sm" | "base";
    customAliases?: Record<string, string>;
  };
  onUpdateMobileUIConfig?: (config: any) => void;
  onLogout?: () => void;
  branches?: Branch[];
}

export default function MobileFrame({
  reports,
  currentUserId,
  onOpenReportForm,
  onDeleteReport,
  onEditReport,
  offlineMode,
  currentUser,
  onUpdateReport,
  mobileUIConfig,
  onUpdateMobileUIConfig,
  onLogout,
  branches
}: MobileFrameProps) {
  const config = mobileUIConfig || {};
  const displayRule = config.displayRule || "clean";
  const customAliases = config.customAliases || {};

  const getThemeClasses = (themeId: string | undefined) => {
    switch (themeId) {
      case "indigo":
        return {
          bg: "bg-[#4f46e5]",
          text: "text-[#4f46e5]",
          border: "border-[#4f46e5]",
          ring: "ring-indigo-150",
          hoverBg: "hover:bg-[#4338ca] bg-[#4f46e5]",
          lightBg: "bg-[#f5f3ff]",
          lightText: "text-[#312e81]"
        };
      case "emerald":
        return {
          bg: "bg-[#0d9488]",
          text: "text-[#0d9488]",
          border: "border-[#0d9488]",
          ring: "ring-emerald-150",
          hoverBg: "hover:bg-[#0f766e] bg-[#0d9488]",
          lightBg: "bg-[#f0fdf4]",
          lightText: "text-[#064e3b]"
        };
      case "amber":
        return {
          bg: "bg-[#f59e0b]",
          text: "text-[#f59e0b]",
          border: "border-[#f59e0b]",
          ring: "ring-amber-150",
          hoverBg: "hover:bg-[#d97706] bg-[#f59e0b]",
          lightBg: "bg-[#fffbeb]",
          lightText: "text-[#78350f]"
        };
      case "rose":
        return {
          bg: "bg-[#e11d48]",
          text: "text-[#e11d48]",
          border: "border-[#e11d48]",
          ring: "ring-rose-150",
          hoverBg: "hover:bg-[#be123c] bg-[#e11d48]",
          lightBg: "bg-[#fff1f2]",
          lightText: "text-[#4c0519]"
        };
      case "slate":
        return {
          bg: "bg-[#475569]",
          text: "text-[#475569]",
          border: "border-[#475569]",
          ring: "ring-slate-150",
          hoverBg: "hover:bg-[#334155] bg-[#475569]",
          lightBg: "bg-[#f8fafc]",
          lightText: "text-[#0f172a]"
        };
      case "blue":
      default:
        return {
          bg: "bg-[#1e3a8a]",
          text: "text-[#1e3a8a]",
          border: "border-[#1e3a8a]",
          ring: "ring-blue-150",
          hoverBg: "hover:bg-[#1a306c] bg-[#1e3a8a]",
          lightBg: "bg-[#f0f9ff]",
          lightText: "text-[#1e3a5f]"
        };
    }
  };

  const getFontSizeClass = (size: string | undefined) => {
    switch (size) {
      case "sm": return "text-xs";
      case "base": return "text-sm";
      case "xs":
      default:
        return "text-[10px]";
    }
  };

  const getContentFontSizeClass = (size: string | undefined) => {
    switch (size) {
      case "sm": return "text-xs";
      case "base": return "text-sm";
      case "xs":
      default:
        return "text-[11px]";
    }
  };

  const theme = getThemeClasses(config.colorTheme);
  const fontSizeClass = getFontSizeClass(config.fontSize);
  const contentFontSizeClass = getContentFontSizeClass(config.fontSize);

  const getFactoryDisplayName = (factoryName: string) => {
    const match = factoryName.match(/\(((?:TPP|BBM)-[^)]+)\)/i);
    const branchId = match ? match[1].toUpperCase() : null;

    if (displayRule === "custom" && branchId && customAliases[branchId]) {
      return customAliases[branchId];
    }

    const cleanPrefix = factoryName.replace("Chi Nhánh ", "").replace("Nhà máy ", "").replace("Văn Phòng ", "");
    if (displayRule === "clean") {
      return cleanPrefix.replace(/\s*\(((?:TPP|BBM)-[^)]+)\)/i, "");
    }
    return factoryName;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedFactoryFilter, setSelectedFactoryFilter] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showLocalConfigPanel, setShowLocalConfigPanel] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const lastScrollTopRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Notification states
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("4m1e1i_read_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("4m1e1i_read_notifications", JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  const [likedReports, setLikedReports] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("4m1e1i_liked_reports");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shareModalReport, setShareModalReport] = useState<QualityReport | null>(null);

  useEffect(() => {
    localStorage.setItem("4m1e1i_liked_reports", JSON.stringify(likedReports));
  }, [likedReports]);

  const toggleLike = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const likerName = currentUser?.fullName || "Kiểm soát viên";
    const currentLikes = report.likedBy || [];
    const isNowLiked = !currentLikes.includes(likerName);

    let updatedLikes: string[];
    if (isNowLiked) {
      updatedLikes = [...currentLikes, likerName];
    } else {
      updatedLikes = currentLikes.filter((name) => name !== likerName);
    }

    const updatedReport: QualityReport = {
      ...report,
      likedBy: updatedLikes,
    };

    if (onUpdateReport) {
      onUpdateReport(updatedReport);
    }

    setLikedReports((prev) => ({
      ...prev,
      [reportId]: isNowLiked
    }));

    showToast(isNowLiked ? "Đã thích báo cáo này! ❤️" : "Đã bỏ thích báo cáo! 💔");
  };

  const toggleAcknowledge = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const userName = currentUser?.fullName || "Kiểm soát viên";
    const userDept = currentUser?.department || "BP Liên Quan";
    const label = `${userName} (${userDept})`;

    const currentShares = report.sharedBy || [];
    const isNowAcknowledged = !currentShares.some(name => name.startsWith(userName));

    let updatedShares: string[];
    if (isNowAcknowledged) {
      updatedShares = [...currentShares, label];
    } else {
      updatedShares = currentShares.filter((name) => !name.startsWith(userName));
    }

    const updatedReport: QualityReport = {
      ...report,
      sharedBy: updatedShares,
    };

    if (onUpdateReport) {
      onUpdateReport(updatedReport);
    }

    showToast(isNowAcknowledged ? "Đã xác nhận tiếp nhận thông tin! ✅" : "Đã hủy xác nhận tiếp nhận! ↩️");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => current === msg ? null : current);
    }, 2500);
  };

  const handleShare = async (report: QualityReport) => {
    const sharerName = currentUser?.fullName || "Kiểm soát viên";
    const currentShares = report.sharedBy || [];
    
    const updatedShares = currentShares.includes(sharerName)
      ? currentShares
      : [...currentShares, sharerName];

    const updatedReport: QualityReport = {
      ...report,
      sharedBy: updatedShares,
    };

    if (onUpdateReport) {
      onUpdateReport(updatedReport);
    }

    const shareText = `🔔 BÁO CÁO THAY ĐỔI 4M1E1I - TÂN PHÚ
---------------------------------
📍 Chi nhánh/Nhà máy: ${report.factory}
🕒 Thời gian: ${report.timestamp}
👤 Người đăng: ${report.uploaderName}
📂 Loại biến động: ${report.category}
📝 Nội dung: ${report.content}
${report.notes ? `✍️ Ghi chú: ${report.notes}\n` : ""}${report.imageUrl ? `📷 Hình ảnh minh chứng: ${report.imageUrl}\n` : ""}
App Link: ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Phần mềm 4M1E1I - Báo cáo từ ${report.uploaderName}`,
          text: shareText,
          url: window.location.href,
        });
        showToast("Chia sẻ thành công! 🚀");
      } catch (err) {
        console.log("Error sharing:", err);
        try {
          await navigator.clipboard.writeText(shareText);
          showToast("Đã sao chép! Bạn có thể gửi Zalo 📋");
        } catch (clipErr) {
          showToast("Không thể chia sẻ báo cáo.");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        showToast("Đã sao chép! Bạn có thể dán đăng lên Zalo 📋");
      } catch (err) {
        showToast("Có lỗi xảy ra khi sao chép thông tin!");
      }
    }
  };

  const executeShareAction = (type: "copy_zalo_web" | "copy_zalo_app" | "zalo_inline" | "copy_only" | "native") => {
    if (!shareModalReport) return;
    const report = shareModalReport;

    const sharerName = currentUser?.fullName || "Kiểm soát viên";
    const currentShares = report.sharedBy || [];
    const updatedShares = currentShares.includes(sharerName)
      ? currentShares
      : [...currentShares, sharerName];

    const updatedReport: QualityReport = {
      ...report,
      sharedBy: updatedShares,
    };

    if (onUpdateReport) {
      onUpdateReport(updatedReport);
    }

    const shareText = `🔔 BÁO CÁO THAY ĐỔI 4M1E1I - TÂN PHÚ
---------------------------------
📍 Chi nhánh/Nhà máy: ${report.factory}
🕒 Thời gian: ${report.timestamp}
👤 Người đăng: ${report.uploaderName}
📂 Loại biến động: ${report.category}
📝 Nội dung: ${report.content}
${report.notes ? `✍️ Ghi chú: ${report.notes}\n` : ""}${report.imageUrl ? `📷 Hình ảnh minh chứng: ${report.imageUrl}\n` : ""}
App Link: ${window.location.origin}`;

    const reportUrl = `${window.location.origin}?reportId=${report.id}`;

    if (type === "copy_zalo_web") {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast("Đã sao chép báo cáo! Đang chuyển tiếp sang Zalo Web... 💬");
        setTimeout(() => {
          window.open("https://chat.zalo.me", "_blank");
        }, 1000);
      }).catch(() => {
        showToast("Không thể sao chép tự động.");
      });
    } else if (type === "copy_zalo_app") {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast("Đã sao chép báo cáo! Đang mở ứng dụng Zalo... 📱");
        setTimeout(() => {
          window.open("zalo://", "_blank");
        }, 1000);
      }).catch(() => {
        showToast("Không thể sao chép tự động.");
      });
    } else if (type === "zalo_inline") {
      showToast("Đang mở hộp thoại chia sẻ Zalo... 🔗");
      setTimeout(() => {
        window.open(`https://sp.zalo.me/share_inline?url=${encodeURIComponent(reportUrl)}`, "_blank");
      }, 800);
    } else if (type === "copy_only") {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast("Đã sao chép toàn bộ thông tin báo cáo! 📋");
      }).catch(() => {
        showToast("Lỗi sao chép.");
      });
    } else if (type === "native") {
      if (navigator.share) {
        navigator.share({
          title: `Phần mềm 4M1E1I - Báo cáo từ ${report.uploaderName}`,
          text: shareText,
          url: reportUrl,
        }).then(() => {
          showToast("Chia sẻ thành công! 🚀");
        }).catch((err) => {
          console.log(err);
          navigator.clipboard.writeText(shareText).then(() => {
            showToast("Đã sao chép báo cáo! Bạn có thể dán Zalo 📋");
          });
        });
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          showToast("Đã sao chép báo cáo! Bạn có thể dán Zalo 📋");
        });
      }
    }

    setShareModalReport(null);
  };

  const parseReportTimestamp = (ts: string): Date => {
    try {
      if (!ts) return new Date();
      if (ts.includes("T") && ts.includes("-")) {
        return new Date(ts);
      }
      
      const parts = ts.trim().split(/\s+/);
      if (parts.length < 2) return new Date(ts);
      
      const timePart = parts[0]; // "HH:mm:ss"
      const datePart = parts[1]; // "DD/MM/YYYY"
      
      const timeSubparts = timePart.split(":");
      const dateSubparts = datePart.split("/");
      
      if (timeSubparts.length >= 2 && dateSubparts.length === 3) {
        const day = parseInt(dateSubparts[0], 10);
        const month = parseInt(dateSubparts[1], 10) - 1;
        const yearStr = dateSubparts[2].trim();
        const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
        
        const hours = parseInt(timeSubparts[0], 10);
        const minutes = parseInt(timeSubparts[1], 10);
        const seconds = timeSubparts[2] ? parseInt(timeSubparts[2], 10) : 0;
        
        return new Date(year, month, day, hours, minutes, seconds);
      }
    } catch (e) {
      console.error("Error parsing timestamp:", ts, e);
    }
    return new Date();
  };

  const isDeleteAllowed = (report: QualityReport): boolean => {
    if (!currentUser) return false;
    
    // 1. Admin luôn được quyền xóa mọi thứ
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    // 2. Duyệt viên (Reviewer) chỉ có quyền xóa đối với các bản tin thuộc đúng chi nhánh của mình
    if (currentUser.role === UserRole.REVIEWER) {
      return currentUser.branch === report.factory;
    }

    // 3. Đặc cách cho Nhân viên / Duyệt viên (canSpeciallyEditDelete) của chi nhánh hiện tại
    if (currentUser.canSpeciallyEditDelete && currentUser.branch === report.factory) {
      return true;
    }
    
    // 4. Người đăng tin (uploader) chỉ được xóa bài của chính mình trong vòng 5 phút kể từ khi đăng
    if (report.uploaderId === currentUser.id) {
      const reportDate = parseReportTimestamp(report.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - reportDate.getTime();
      const diffMin = diffMs / (1000 * 60);
      return diffMin >= 0 && diffMin <= 5; // Hợp lệ dưới 5 phút
    }
    
    return false;
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      setShowScrollTop(scrollTop > 100);

      // Hide filters when scrolling down, show filters when scrolling up or near the top
      if (scrollTop > lastScrollTopRef.current && scrollTop > 60) {
        setShowFilters(false);
      } else if (scrollTop < lastScrollTopRef.current || scrollTop <= 15) {
        setShowFilters(true);
      }
      lastScrollTopRef.current = scrollTop;
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen({ navigationUI: "hide" });
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      const doc = document as any;
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  // Helper to match selected factory abbreviation to actual database names
  const matchSelectedFactory = (factoryName: string, filterKey: string): boolean => {
    const norm = factoryName.toLowerCase();
    
    // 1. Check if the report's factory name contains the filter key (e.g. "(TPP-BNI)" contains "tpp-bni")
    if (norm.includes(filterKey.toLowerCase())) return true;
    
    // 2. Lookup branch mapping to match full name
    if (branches) {
      const matchBranch = branches.find(b => b.id === filterKey);
      if (matchBranch && norm.includes(matchBranch.name.toLowerCase())) {
        return true;
      }
    }

    if (filterKey === "TPP-BNI") return norm.includes("bắc ninh") || norm.includes("tpp-bni");
    if (filterKey === "TPP-LAN") return norm.includes("long an") || norm.includes("tpp-lan");
    if (filterKey === "TPP-CTY") return norm.includes("văn phòng") || norm.includes("tpp-cty");
    if (filterKey === "TPP-314") return norm.includes("314") || norm.includes("tpp-314");
    if (filterKey === "DNP") return norm.includes("dnp");
    return false;
  };

  // Filter items based on uploader or factory search or description search
  const filteredReports = reports.filter((r) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      r.factory.toLowerCase().includes(s) ||
      r.uploaderName.toLowerCase().includes(s) ||
      r.content.toLowerCase().includes(s) ||
      r.category.toLowerCase().includes(s);

    const matchesCategory = selectedCategory ? r.category === selectedCategory : true;
    const matchesFactoryFilter = selectedFactoryFilter ? matchSelectedFactory(r.factory, selectedFactoryFilter) : true;
    
    return matchesSearch && matchesCategory && matchesFactoryFilter;
  });

  // Sort reports according to the prioritized layout:
  // 1. New reports (posted <= 5 minutes ago) are at the absolute top.
  // 2. Previously posted reports with updates (age > 5 mins, and has updates) automatically jump up next.
  // 3. Normal reports are ordered by original time descending at the bottom.
  const sortedReports = [...filteredReports].sort((a, b) => {
    const now = new Date().getTime();
    const aCreated = parseReportTimestamp(a.timestamp).getTime();
    const bCreated = parseReportTimestamp(b.timestamp).getTime();
    const aUpdated = a.updatedAt ? parseReportTimestamp(a.updatedAt).getTime() : 0;
    const bUpdated = b.updatedAt ? parseReportTimestamp(b.updatedAt).getTime() : 0;

    const ageA_Min = (now - aCreated) / (1000 * 60);
    const ageB_Min = (now - bCreated) / (1000 * 60);

    const isA_New = ageA_Min >= 0 && ageA_Min <= 5;
    const isB_New = ageB_Min >= 0 && ageB_Min <= 5;

    // "Tin đã đăng có cập nhật" means it's older than 5 mins (or not considered "new" anymore) but has updates
    const isA_Updated = !isA_New && !!a.updatedAt;
    const isB_Updated = !isB_New && !!b.updatedAt;

    // Rule 1: New posts (isNew) on top
    if (isA_New && !isB_New) return -1;
    if (!isA_New && isB_New) return 1;
    if (isA_New && isB_New) {
      // Both are new -> sort by creation time descending (newest first)
      return bCreated - aCreated;
    }

    // Rule 2: Updated older posts go next
    if (isA_Updated && !isB_Updated) return -1;
    if (!isA_Updated && isB_Updated) return 1;
    if (isA_Updated && isB_Updated) {
      // Both are updated -> sort by the latest update time descending
      return bUpdated - aUpdated;
    }

    // Rule 3: Ordinary older posts sorted by creation time descending
    return bCreated - aCreated;
  });

  const isEditAllowed = (report: QualityReport): boolean => {
    if (!currentUser) return false;
    
    // 1. Chỉ Admin mới được quyền chỉnh sửa mặc định mọi bản tin
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    // 2. Duyệt viên (Reviewer) chỉ có quyền chỉnh sửa đối với các bản tin thuộc đúng chi nhánh của mình
    if (currentUser.role === UserRole.REVIEWER) {
      return currentUser.branch === report.factory;
    }

    // 3. Đặc cách cho Nhân viên / Duyệt viên (canSpeciallyEditDelete) của chi nhánh hiện tại
    if (currentUser.canSpeciallyEditDelete && currentUser.branch === report.factory) {
      return true;
    }

    // 4. Người đăng tin (uploader) chỉ được sửa bài của chính mình trong vòng 5 phút kể từ khi đăng
    if (report.uploaderId === currentUser.id) {
      const reportDate = parseReportTimestamp(report.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - reportDate.getTime();
      const diffMin = diffMs / (1000 * 60);
      return diffMin >= 0 && diffMin <= 5; // Hợp lệ dưới 5 phút
    }
    
    return false;
  };

  const generateNotifications = (): AppNotification[] => {
    const list: AppNotification[] = [];
    
    reports.forEach((report) => {
      // 1. Report post notification
      list.push({
        id: `report-${report.id}`,
        title: "Bản tin 4M1E1I mới",
        description: `Đăng bởi ${report.uploaderName} tại ${report.factory}. Nội dung: "${report.content.substring(0, 45)}..."`,
        timestamp: report.timestamp,
        type: "new_report",
        targetReportId: report.id,
        authorName: report.uploaderName,
        factoryName: report.factory
      });

      // 2. Report edited / updated notification
      if (report.updatedAt) {
        list.push({
          id: `update-${report.id}`,
          title: "Bản tin cập nhật",
          description: `Bản tin của ${report.uploaderName} tại ${report.factory} vừa thay đổi thông tin.`,
          timestamp: report.updatedAt,
          type: "update_report",
          targetReportId: report.id,
          authorName: report.uploaderName,
          factoryName: report.factory
        });
      }

      // 3. Directives notifications
      if (report.directives && report.directives.length > 0) {
        report.directives.forEach((dir, idx) => {
          list.push({
            id: `directive-${report.id}-${idx}`,
            title: "Chỉ đạo chất lượng mới",
            description: `${dir.author} chỉ đạo: "${dir.text.substring(0, 45)}..."`,
            timestamp: dir.timestamp,
            type: "new_directive",
            targetReportId: report.id,
            authorName: dir.author,
            factoryName: report.factory
          });
        });
      }
    });

    // Sort notifications chronologically descending (newest first)
    return list.sort((a, b) => {
      const tA = parseReportTimestamp(a.timestamp).getTime();
      const tB = parseReportTimestamp(b.timestamp).getTime();
      return tB - tA;
    });
  };

  const notifications = generateNotifications();
  const unreadNotifications = notifications.filter((n) => !readNotifIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = (notif: AppNotification) => {
    if (!readNotifIds.includes(notif.id)) {
      setReadNotifIds((prev) => [...prev, notif.id]);
    }
    setSearchTerm("");
    setSelectedCategory(null);
    setShowNotifDrawer(false);

    setTimeout(() => {
      const el = document.getElementById(`report-card-${notif.targetReportId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-4", "ring-[#1e3a8a]", "ring-offset-2");
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-[#1e3a8a]", "ring-offset-2");
        }, 3000);
      }
    }, 450);
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
  };

  // Category Icon Resolver
  const getCategoryIcon = (cat: Category4M1E1I) => {
    switch (cat) {
      case "CON NGƯỜI":
        return <Users className="w-4 h-4 mr-2 text-indigo-600" />;
      case "MÁY MÓC":
        return <Cpu className="w-4 h-4 mr-2 text-green-600" />;
      case "NGUYÊN VẬT LIỆU":
        return <Settings className="w-4 h-4 mr-2 text-fuchsia-600" />;
      case "PHƯƠNG PHÁP":
        return <FileText className="w-4 h-4 mr-2 text-amber-600" />;
      case "MÔI TRƯỜNG":
        return <Heart className="w-4 h-4 mr-2 text-teal-600" />;
      case "THÔNG TIN":
        return <Info className="w-4 h-4 mr-2 text-slate-600" />;
    }
  };

  return (
    <div id="mobile-viewport" className="w-full h-[100dvh] max-w-[440px] lg:w-[375px] lg:h-[780px] bg-slate-100 rounded-[18px] lg:rounded-[36px] border-[3px] lg:border-8 border-slate-950 shadow-2xl overflow-hidden flex flex-col relative">
      {/* Main Appsheet Blue Title Bar */}
      <div className={`text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0 select-none ${theme.bg}`}>
        <div className="flex items-center gap-2">
          {/* TANPHU simulated logo block */}
          <div className="bg-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center justify-center font-sans tracking-tighter" style={{ color: "var(--color-primary, #1e3a8a)" }}>
            <T>TANPHU</T>
          </div>
          <T className="font-bold text-sm tracking-wide">4M1E1I REPORT</T>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifDrawer(true)}
            className="relative hover:scale-115 active:scale-95 transition-transform p-1 cursor-pointer"
            title="Thông báo hệ thống"
          >
            <Bell className="w-[19px] h-[19px] text-white" />
            {unreadCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 bg-rose-600 text-[8px] text-white font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border ${theme.border} animate-pulse`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="hover:scale-115 active:scale-95 transition-transform"
            title={isFullscreen ? "Thoát toàn màn hình" : "Bung toàn màn hình"}
          >
            {isFullscreen ? (
              <Minimize className="w-[18px] h-[18px] text-white" />
            ) : (
              <Maximize className="w-[18px] h-[18px] text-white" />
            )}
          </button>
          <button 
            onClick={() => { setSelectedCategory(null); setSearchTerm(""); }} 
            className="hover:scale-115 active:scale-95 transition-transform"
            title="Tải lại dữ liệu"
          >
            <RotateCw className="w-[18px] h-[18px] text-white" />
          </button>
          {/* Settings gear trigger for real mobile phones - Admin only */}
          {currentUser?.role === UserRole.ADMIN && (
            <button 
              type="button"
              onClick={() => setShowLocalConfigPanel(true)}
              className="hover:scale-115 active:scale-95 transition-transform cursor-pointer border-none bg-transparent"
              title="Cấu hình di động"
            >
              <Settings className="w-[18px] h-[18px] text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Internal layout controls (Search inputs) */}
      <div className={`transition-all duration-300 overflow-hidden shrink-0 ${
        showFilters ? "max-h-[160px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      }`}>
        <div className="bg-white px-3 py-2 border-b border-slate-200 shadow-sm flex flex-col gap-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhà máy, người đăng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 rounded-full text-xs focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400 text-slate-700 font-medium"
            />
          </div>
          {/* Factory/Branch quick filter chips */}
          <div className="flex py-0.5 gap-1.5 overflow-x-auto no-scrollbar scroll-smooth border-b border-slate-100 pb-1.5" id="factory-filter-chips">
            <button
              onClick={() => setSelectedFactoryFilter(null)}
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 transition-all ${
                selectedFactoryFilter === null
                  ? `${theme.bg} text-white shadow`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span translate="no" className="notranslate">TẤT CẢ ĐV</span>
            </button>
            {(() => {
              const activeFactoryChips = branches && branches.length > 0
                ? branches
                    .filter((b) => b.isScoring)
                    .map((b) => ({ key: b.id, label: b.id }))
                : [
                    { key: "TPP-BNI", label: "TPP-BNI" },
                    { key: "TPP-LAN", label: "TPP-LAN" },
                    { key: "TPP-CTY", label: "TPP-CTY" },
                    { key: "TPP-314", label: "TPP-314" }
                  ];
              return activeFactoryChips.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelectedFactoryFilter(item.key)}
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 transition-all ${
                    selectedFactoryFilter === item.key
                      ? "bg-sky-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span translate="no" className="notranslate">{item.label}</span>
                </button>
              ));
            })()}
          </div>
          {/* Rapid filter chips */}
          <div className="flex py-0.5 gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase shrink-0 transition-all ${
                selectedCategory === null
                  ? `${theme.bg} text-white shadow-sm`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <T>TẤT CẢ</T>
            </button>
            {(["CON NGƯỜI", "MÁY MÓC", "NGUYÊN VẬT LIỆU", "PHƯƠNG PHÁP", "MÔI TRƯỜNG", "THÔNG TIN"] as Category4M1E1I[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase shrink-0 transition-all ${
                  selectedCategory === cat
                    ? `${theme.bg} text-white shadow-sm`
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <T>{cat}</T>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Offline Alert Sticky Banner */}
      {offlineMode && (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-800 text-[10px] px-3 py-1.5 font-bold flex items-center justify-between shrink-0 select-none">
          <T>⚠️ Đang chạy Offline - Lưu báo cáo vào hàng chờ</T>
        </div>
      )}

      {/* Main card list scroll area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-3.5 bg-slate-50 relative"
      >
        {sortedReports.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200 bg-opacity-70">
            <T className="text-slate-400 text-xs font-semibold">Không tìm thấy báo cáo nào phù hợp.</T>
          </div>
        ) : (
          sortedReports.map((report) => {
            const isUploader = report.uploaderId === currentUserId;
             return (
              <div
                id={`report-card-${report.id}`}
                key={report.id}
                className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
                  report.isAbnormal ? "border-red-400" : "border-blue-500"
                }`}
              >
                {/* Header card info */}
                <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                  <div>
                    <T className={`font-bold block leading-tight ${theme.text} ${fontSizeClass}`}>{getFactoryDisplayName(report.factory)}</T>
                    <T className="text-[9px] text-slate-400 block mt-0.5">{report.timestamp}</T>
                  </div>
                  {report.isAbnormal && (
                    <T className="bg-red-500 text-white font-black text-[7px] px-1.5 py-0.5 rounded tracking-wider uppercase block">
                      CẢNH BÁO
                    </T>
                  )}
                </div>

                {/* Update Information Sub-bar (Hidden in UI as requested, but still recorded in data) */}
                {/* 
                {report.updatedAt && (
                  <div className="bg-emerald-50 border-b border-emerald-100 px-3 py-1.5 text-[9px] text-[#065f46]" id={`update-bar-${report.id}`}>
                    <div className="flex items-center gap-1 font-bold">
                      <span>🔄</span>
                      <T>Đã cập nhật lúc:</T>
                      <span translate="no" className="font-mono text-[10px] text-emerald-800 ml-0.5 font-black">{report.updatedAt}</span>
                    </div>
                    {report.updateLogs && report.updateLogs.length > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5 pl-3 border-l-2 border-emerald-200">
                        {report.updateLogs.map((log, idx) => (
                          <div key={idx} translate="no" className="text-[8px] text-emerald-700 leading-normal font-medium">
                            • {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                */}

                {/* Report Image */}
                {report.imageUrl && (
                  <AutoImageSlider
                    imageUrls={report.imageUrls}
                    fallbackUrl={report.imageUrl}
                    isAbnormal={report.isAbnormal}
                  />
                )}

                {/* Card Info Section */}
                <div className="p-3 bg-white">
                  {/* Category marker with standard styling */}
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div className={`flex items-center font-bold text-xs uppercase select-none ${theme.text}`}>
                      {getCategoryIcon(report.category)}
                      <T>{report.category}</T>
                    </div>
                    {/* Personnel tags */}
                    <div className="text-right">
                      <T className="text-[10px] text-slate-500 font-semibold block">{report.uploaderName}</T>
                    </div>
                  </div>

                  {/* Body description text */}
                  <div className={`pt-2 font-medium leading-relaxed text-slate-705 ${contentFontSizeClass}`}>
                    <T>{report.content}</T>
                  </div>

                  {report.notes && (
                    <div className="mt-2 bg-slate-50 rounded p-2 text-[10px] text-slate-500 italic border-l-2 border-blue-400">
                      <T>Ghi chú: {report.notes}</T>
                    </div>
                  )}

                  {/* Dynamic manager instructions/directives */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 block select-text">
                    {/* List of existing instructions */}
                    {report.directives && report.directives.length > 0 && (
                      <div className="space-y-2 mb-2.5 w-full block">
                        <div className="text-[10px] text-amber-700 font-extrabold flex items-center gap-1 uppercase select-none">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <T>Bộ Chỉ Huy / Chỉ Đạo:</T>
                        </div>
                        <div className="space-y-1.5 block max-h-36 overflow-y-auto pr-1">
                          {report.directives.map((dir) => (
                            <div key={dir.id} className="bg-amber-50 border border-amber-100 rounded p-2 block text-[11px] leading-relaxed text-amber-900 shadow-3xs">
                              <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1 select-none">
                                <span className="text-amber-800 font-extrabold flex items-center gap-0.5">
                                  <span>🛡️</span>
                                  <T>{dir.author}</T>
                                </span>
                                <span>{dir.timestamp}</span>
                              </div>
                              <T className="block font-medium">{dir.text}</T>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Input form to submit a new directive */}
                    {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.REVIEWER) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const input = form.elements.namedItem("directiveInput") as HTMLTextAreaElement;
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
                            ...report,
                            directives: [...(report.directives || []), newDir]
                          };

                          if (onUpdateReport) {
                            onUpdateReport(updatedReport);
                          }
                          input.value = "";
                          input.style.height = "32px";
                          showToast("Ghi nhận chỉ đạo điều hành thành công! 📑");
                        }}
                        className="flex gap-2 items-end"
                      >
                        <textarea
                          name="directiveInput"
                          placeholder="Chỉ đạo"
                          rows={1}
                          style={{ height: '32px', minHeight: '32px', maxHeight: '72px', resize: 'none' }}
                          onInput={(e) => {
                            const target = e.currentTarget;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 72)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              e.currentTarget.form?.requestSubmit();
                            }
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 text-[11px] rounded-lg px-2.5 py-2 text-slate-800 placeholder-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all select-text overflow-y-auto thin-scrollbar"
                        />
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-600 px-3 py-2 text-[10px] text-white font-extrabold items-center justify-center rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer uppercase shrink-0 h-[32px]"
                        >
                          <T>Gửi</T>
                        </button>
                      </form>
                    )}
                    {/* BP/ĐV TIẾP NHẬN list display */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5" id={`receivers-section-${report.id}`}>
                      <div className="flex items-center gap-1 text-[10px] font-extrabold text-sky-700 uppercase">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        <span translate="no" className="notranslate">BP/ĐV TIẾP NHẬN:</span>
                      </div>
                      {report.sharedBy && report.sharedBy.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {report.sharedBy.map((item, i) => (
                            <span key={i} className="bg-sky-50 text-sky-800 text-[9px] px-2 py-0.5 rounded border border-sky-100 font-bold block max-w-full truncate">
                              <T>{item}</T>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[9px] italic select-none">
                          <span translate="no" className="notranslate">Chưa có bộ phận nào tiếp nhận</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer buttons of card (Xóa/Sửa/Like/BP Tiếp Nhận) only for managers or the author */}
                <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 flex justify-between items-center select-none text-[10px] font-semibold text-slate-600">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const isUploader = currentUser?.id === report.uploaderId;
                      const isSpeciallyAuthorized = currentUser?.canSpeciallyEditDelete && currentUser?.branch === report.factory;
                      const isReviewerAtMyBranch = currentUser?.role === UserRole.REVIEWER && currentUser?.branch === report.factory;
                      const isAdmin = currentUser?.role === UserRole.ADMIN;
                      const shouldShow = isUploader || isSpeciallyAuthorized || isReviewerAtMyBranch || isAdmin;

                      if (!shouldShow) return null;

                      const allowed = isDeleteAllowed(report);
                      if (allowed) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Bạn có chắc chắn muốn xóa bản tin này không? Hành động này không thể hoàn tác.")) {
                                onDeleteReport(report.id);
                              }
                            }}
                            className="flex items-center justify-center p-1 cursor-pointer transition-all hover:scale-110 active:scale-90 text-rose-600 hover:text-rose-800 border-none bg-transparent"
                            title="Xóa bản tin"
                          >
                            <Trash2 className="w-[18px] h-[18px] stroke-[2.2px]" />
                          </button>
                        );
                      } else {
                        return (
                          <button
                            type="button"
                            disabled
                            className="flex items-center justify-center p-1 text-slate-350 opacity-40 cursor-not-allowed select-none border-none bg-transparent"
                            title="Nút xóa đã bị vô hiệu hóa (quá 5 phút)"
                          >
                            <Trash2 className="w-[18px] h-[18px] stroke-[1.8px] text-slate-350" />
                          </button>
                        );
                      }
                    })()}

                    {(() => {
                      const isUploader = currentUser?.id === report.uploaderId;
                      const isSpeciallyAuthorized = currentUser?.canSpeciallyEditDelete && currentUser?.branch === report.factory;
                      const isReviewerAtMyBranch = currentUser?.role === UserRole.REVIEWER && currentUser?.branch === report.factory;
                      const isAdmin = currentUser?.role === UserRole.ADMIN;
                      const shouldShow = isUploader || isSpeciallyAuthorized || isReviewerAtMyBranch || isAdmin;

                      if (!shouldShow) return null;

                      const allowed = isEditAllowed(report);
                      if (allowed) {
                        return (
                          <button
                            type="button"
                            onClick={() => onEditReport(report)}
                            className="flex items-center justify-center p-1 cursor-pointer transition-all hover:scale-110 active:scale-90 text-blue-600 hover:text-blue-800 border-none bg-transparent"
                            title="Chỉnh sửa bản tin"
                          >
                            <Edit className="w-[18px] h-[18px] stroke-[2.2px]" />
                          </button>
                        );
                      } else {
                        return (
                          <button
                            type="button"
                            disabled
                            className="flex items-center justify-center p-1 text-slate-350 opacity-40 cursor-not-allowed select-none border-none bg-transparent"
                            title="Nút chỉnh sửa đã bị vô hiệu hóa (quá 5 phút)"
                          >
                            <Edit className="w-[18px] h-[18px] stroke-[1.8px] text-slate-350" />
                          </button>
                        );
                      }
                    })()}
                  </div>

                  <div className="flex items-center gap-4">
                    {(() => {
                      const isReportLiked = report.likedBy?.includes(currentUser?.fullName || "Kiểm soát viên") || likedReports[report.id];
                      return (
                        <button
                          type="button"
                          onClick={() => toggleLike(report.id)}
                          className={`flex items-center justify-center p-1 transition-all hover:scale-110 active:scale-95 cursor-pointer border-none bg-transparent ${
                            isReportLiked ? "text-rose-600" : "text-slate-400 hover:text-rose-500"
                          }`}
                          title={isReportLiked ? "Bỏ thích" : "Thích"}
                        >
                          <Heart className={`w-[18px] h-[18px] stroke-[2.2px] ${isReportLiked ? "fill-rose-500 text-rose-600" : ""}`} />
                        </button>
                      );
                    })()}
                    {(() => {
                      const isAcknowledged = report.sharedBy?.some(name => name.startsWith(currentUser?.fullName || "Kiểm soát viên")) || false;
                      return (
                        <button
                          type="button"
                          onClick={() => toggleAcknowledge(report.id)}
                          className={`flex items-center justify-center p-1 transition-all hover:scale-110 active:scale-95 cursor-pointer border-none bg-transparent ${
                            isAcknowledged ? "text-sky-700 animate-pulse" : "text-slate-400 hover:text-sky-600"
                          }`}
                          title={isAcknowledged ? "Đã tiếp nhận" : "Tiếp nhận"}
                        >
                          <Check className={`w-[18px] h-[18px] ${isAcknowledged ? "stroke-[3.2px] text-sky-700" : "stroke-[2.2px]"}`} />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Scroll to Top floating button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="absolute bottom-36 right-5 w-10 h-10 bg-blue-600 hover:bg-blue-700 active:scale-90 text-white rounded-xl flex items-center justify-center shadow-lg transition-all z-20 cursor-pointer"
          title="Lên đầu trang"
        >
          <ArrowUp className="w-5 h-5 text-white stroke-[2.5px]" />
        </button>
      )}

      {/* Blue Circular float creation trigger */}
      <button
        onClick={onOpenReportForm}
        className={`absolute bottom-20 right-5 w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-transform z-20 ${theme.hoverBg}`}
      >
        <Plus className="w-5 h-5 text-white stroke-[2.5px]" />
      </button>

      {/* Mock navigation bottom bar on appsheet */}
      <div className="bg-slate-50 border-t border-slate-200 grid grid-cols-3 py-2 text-center text-slate-400 text-[10px] font-semibold select-none shrink-0 font-sans shadow-inner">
        <div className="flex flex-col items-center justify-center py-0.5">
          <Heart className="w-4 h-4 mx-auto mb-0.5 text-slate-400" />
          <T>Đóng Góp</T>
        </div>
        <div className={`flex flex-col items-center justify-center py-0.5 ${theme.text}`}>
          <FileText className="w-4 h-4 mx-auto mb-0.5" />
          <T>Báo Cáo</T>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex flex-col items-center justify-center py-0.5 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer select-none border-none bg-transparent"
        >
          <LogOut className="w-4 h-4 mx-auto mb-0.5 text-slate-500 hover:text-rose-600" />
          <T>Đăng Xuất</T>
        </button>
      </div>

      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-[#065f46] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-[11px] font-bold z-50 tracking-wide min-w-[280px] justify-center text-center border-2 border-white select-none animate-fadeIn">
          <T>{toastMessage}</T>
        </div>
      )}

      {shareModalReport && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center z-50 select-none">
          <div className="bg-white rounded-t-3xl w-full max-h-[85%] overflow-y-auto p-5 pb-8 flex flex-col shadow-2xl border-t border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center pb-3.5 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">💬</span>
                <span className="font-extrabold text-[13px] text-slate-800 tracking-tight uppercase">
                  <T>Chia sẻ Zalo & Hệ thống</T>
                </span>
              </div>
              <button
                onClick={() => setShareModalReport(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            {/* Explanation box */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-[10px] leading-relaxed text-amber-900 shadow-3xs font-medium shrink-0">
              <span className="font-extrabold text-[#78350f] block mb-1">
                💡 <T>Giải thích hiển thị Zalo</T>
              </span>
              <T>
                Hệ điều hành của bạn không tự động tích hợp Zalo vào danh sách chia sẻ của trình duyệt/Windows. Tân Phú đã thiết kế sẵn tính năng chuyển tiếp tiện dụng dưới đây:
              </T>
            </div>

            {/* Preview text */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 block select-text">
              <div className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider select-none">
                <T>Bản xem trước nội dung sẽ copy:</T>
              </div>
              <div className="text-[10px] text-slate-700 font-mono leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto bg-white p-2 rounded border border-slate-200/60">
                {`🔔 BÁO CÁO THAY ĐỔI 4M1E1I - TÂN PHÚ
---------------------------------
📍 Chi nhánh/Nhà máy: ${shareModalReport.factory}
🕒 Thời gian: ${shareModalReport.timestamp}
👤 Người đăng: ${shareModalReport.uploaderName}
📂 Loại biến động: ${shareModalReport.category}
📝 Nội dung: ${shareModalReport.content}
${shareModalReport.notes ? `✍️ Ghi chú: ${shareModalReport.notes}\n` : ""}${shareModalReport.imageUrl ? `📷 Hình ảnh minh chứng: ${shareModalReport.imageUrl}\n` : ""}
App Link: ${window.location.origin}`}
              </div>
            </div>

            {/* Share action grid */}
            <div className="space-y-2.5 shrink-0">
              {/* Option 1: Zalo Web */}
              <button
                onClick={() => executeShareAction("copy_zalo_web")}
                className="w-full flex items-center gap-3 bg-sky-50 hover:bg-sky-100 border border-sky-150 p-2.5 rounded-xl transition-all active:scale-98 cursor-pointer group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                  ZW
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[11px] text-sky-900 flex items-center gap-1.5">
                    <T>Sao chép & Gửi Zalo Web</T>
                    <span className="bg-sky-200 text-sky-800 text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider scale-90 origin-left shrink-0"><T>Khuyên dùng</T></span>
                  </div>
                  <div className="text-[9px] text-sky-700 font-medium truncate">
                    <T>Tự động copy tin nhắn & chuyển sang Zalo Web chat dán vào.</T>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-sky-500 shrink-0 opacity-80" />
              </button>

              {/* Option 2: Zalo App */}
              <button
                onClick={() => executeShareAction("copy_zalo_app")}
                className="w-full flex items-center gap-3 bg-blue-50 hover:bg-blue-100 border border-blue-150 p-2.5 rounded-xl transition-all active:scale-98 cursor-pointer group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                  ZA
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[11px] text-blue-900">
                    <T>Mở phần mềm Zalo trên máy</T>
                  </div>
                  <div className="text-[9px] text-blue-700 font-medium truncate">
                    <T>Copy tin nhắn & mở ứng dụng Zalo đang cài đặt để gửi.</T>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0 opacity-80" />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Option 3: Copy only */}
                <button
                  onClick={() => executeShareAction("copy_only")}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl transition-all active:scale-98 cursor-pointer flex flex-col items-center justify-center text-center gap-1 shadow-3xs"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span className="font-extrabold text-[10px] text-slate-800"><T>Chỉ copy tin nhắn</T></span>
                  <span className="text-[8px] text-slate-400 font-medium"><T>Lưu clipboard</T></span>
                </button>

                {/* Option 4: Official Zalo Share Inline */}
                <button
                  onClick={() => executeShareAction("zalo_inline")}
                  className="bg-[#e0f2fe] hover:bg-[#bae6fd] border border-[#bae6fd] p-2.5 rounded-xl transition-all active:scale-98 cursor-pointer flex flex-col items-center justify-center text-center gap-1 shadow-3xs"
                >
                  <Share2 className="w-4 h-4 text-sky-600" />
                  <span className="font-extrabold text-[10px] text-sky-850"><T>Gửi liên kết Web</T></span>
                  <span className="text-[8px] text-sky-600 font-medium"><T>Hộp thoại share Zalo</T></span>
                </button>
              </div>

              {/* Option 5: Native OS share */}
              <button
                onClick={() => executeShareAction("native")}
                className="w-full flex items-center justify-center gap-1.5 bg-slate-150 hover:bg-slate-200 text-slate-600 font-extrabold text-[10px] py-2.5 rounded-xl transition-all active:scale-98 cursor-pointer border border-slate-250 uppercase"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <T>Chia sẻ qua app khác mặc định</T>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Notifications System Drawer Overlay */}
      {showNotifDrawer && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center z-50 select-none animate-fadeIn">
          <div className="bg-white rounded-t-3xl w-full max-h-[85%] overflow-hidden flex flex-col shadow-2xl border-t border-slate-100 animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-4 border-b border-slate-100 shrink-0 bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#1e3a8a] animate-bounce" />
                <span className="font-extrabold text-[13px] text-[#1e3a8a] tracking-tight uppercase">
                  <T>THÔNG BÁO HỆ THỐNG</T>
                </span>
                {unreadCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                    <T>MỚI</T> <span translate="no" className="font-mono">{unreadCount}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-blue-600 hover:text-blue-800 text-[10px] font-extrabold transition-colors cursor-pointer mr-1"
                  >
                    <T>ĐỌC TẤT CẢ</T>
                  </button>
                )}
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notifications scroll list */}
            <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50/50 space-y-2 pb-8">
              {notifications.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <BellOff className="w-7 h-7" />
                  </div>
                  <div className="text-slate-400 text-xs font-bold"><T>Chưa có thông báo nào!</T></div>
                  <div className="text-slate-300 text-[10px] font-medium leading-relaxed max-w-[210px] mx-auto">
                    <T>Mọi thay đổi về bản tin hoặc ý kiến chỉ đạo sẽ xuất hiện tại đây.</T>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !readNotifIds.includes(notif.id);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 rounded-xl border transition-all active:scale-99 cursor-pointer flex gap-3 relative select-none text-left ${
                        isUnread
                          ? "bg-blue-50/75 border-blue-200 hover:bg-blue-50"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {/* Left Side Icon Indicator */}
                      <div className="shrink-0">
                        {notif.type === "new_report" && (
                          <div className="w-8.5 h-8.5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                            📝
                          </div>
                        )}
                        {notif.type === "new_directive" && (
                          <div className="w-8.5 h-8.5 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                            💬
                          </div>
                        )}
                        {notif.type === "update_report" && (
                          <div className="w-8.5 h-8.5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                            🔄
                          </div>
                        )}
                      </div>

                      {/* Right Side Info */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex justify-between items-start gap-1.5 flex-wrap">
                          <span className={`text-[10px] tracking-wide block uppercase ${
                            isUnread ? "font-black text-blue-900" : "font-extrabold text-slate-700"
                          }`}>
                            <T>{notif.title}</T>
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold shrink-0 font-mono" translate="no">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className={`text-[10px] mt-1 leading-normal ${
                          isUnread ? "font-bold text-blue-800" : "font-medium text-slate-500"
                        }`}>
                          <T>{notif.description}</T>
                        </p>
                        {isUnread && (
                          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showLocalConfigPanel && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center z-50 select-none animate-fadeIn">
          <div className="bg-white rounded-t-3xl w-full max-h-[85%] overflow-y-auto p-5 pb-8 flex flex-col shadow-2xl border-t border-slate-100 animate-slideUp">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base">⚙️</span>
                <span className="font-extrabold text-[13px] text-slate-800 tracking-tight uppercase">
                  <span translate="no" className="notranslate"><T>Cấu hình hiển thị</T></span>
                </span>
              </div>
              <button
                onClick={() => setShowLocalConfigPanel(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Columns Selector */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-wider">
                  <span translate="no" className="notranslate"><T>Số cột hiển thị</T></span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateMobileUIConfig && onUpdateMobileUIConfig({ ...config, columns: 1 })}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      (config.columns ?? 2) === 1
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    1 <span translate="no" className="notranslate"><T>Cột (Dọc)</T></span>
                  </button>
                  <button
                    onClick={() => onUpdateMobileUIConfig && onUpdateMobileUIConfig({ ...config, columns: 2 })}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      (config.columns ?? 2) === 2
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    2 <span translate="no" className="notranslate"><T>Cột (Giao diện lưới)</T></span>
                  </button>
                </div>
              </div>

              {/* Theme Color Selector */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-wider">
                  <span translate="no" className="notranslate"><T>Màu sắc chủ đạo (Theme)</T></span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "blue", label: "Xanh biển", bg: "bg-blue-650" },
                    { id: "indigo", label: "Chàm tối", bg: "bg-[#4f46e5]" },
                    { id: "emerald", label: "Ngọc bích", bg: "bg-[#0d9488]" },
                    { id: "amber", label: "Hổ phách", bg: "bg-[#f59e0b]" },
                    { id: "rose", label: "Hồng đào", bg: "bg-[#e11d48]" },
                    { id: "slate", label: "Than mộc", bg: "bg-[#475569]" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onUpdateMobileUIConfig && onUpdateMobileUIConfig({ ...config, colorTheme: t.id })}
                      className={`px-2 py-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        (config.colorTheme || "blue") === t.id
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${t.bg}`}></span>
                      <T>{t.label}</T>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-wider">
                  <span translate="no" className="notranslate"><T>Cỡ chữ nội dung</T></span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "xs", label: "Cực nhỏ" },
                    { id: "sm", label: "Vừa phải" },
                    { id: "base", label: "Lớn" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onUpdateMobileUIConfig && onUpdateMobileUIConfig({ ...config, fontSize: f.id })}
                      className={`px-2 py-1.5 rounded-xl border text-[10px] font-bold transition-all ${
                        (config.fontSize || "xs") === f.id
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <T>{f.label}</T>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Display Rule */}
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1.5 tracking-wider">
                  <span translate="no" className="notranslate"><T>Quy tắc hiển thị tên cơ sở</T></span>
                </label>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => onUpdateMobileUIConfig && onUpdateMobileUIConfig({ ...config, displayRule: "clean" })}
                    className={`px-3 py-1.5 rounded-xl text-left text-[11px] font-bold border transition-all flex flex-col justify-center ${
                      displayRule === "clean"
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span translate="no" className="notranslate"><T>Chỉ giữ Tên tinh gọn</T></span>
                    <span className={`text-[9px] mt-0.5 font-normal ${displayRule === "clean" ? "text-slate-300" : "text-slate-400"}`}>
                      Ví dũ: "Bắc Ninh" thay vì "Chi Nhánh Bắc Ninh (TPP-BNI)"
                    </span>
                  </button>
                  <button
                    onClick={() => onUpdateMobileUIConfig && onUpdateMobileUIConfig({ ...config, displayRule: "full" })}
                    className={`px-3 py-1.5 rounded-xl text-left text-[11px] font-bold border transition-all flex flex-col justify-center ${
                      displayRule === "full"
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span translate="no" className="notranslate"><T>Tên Đầy đủ nguyên bản</T></span>
                    <span className={`text-[9px] mt-0.5 font-normal ${displayRule === "full" ? "text-slate-300" : "text-slate-400"}`}>
                      Ví dụ: "Chi Nhánh Bắc Ninh (TPP-BNI)"
                    </span>
                  </button>
                  <button
                    onClick={() => onUpdateMobileUIConfig && onUpdateMobileUIConfig({ ...config, displayRule: "custom" })}
                    className={`px-3 py-1.5 rounded-xl text-left text-[11px] font-bold border transition-all flex flex-col justify-center ${
                      displayRule === "custom"
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span translate="no" className="notranslate"><T>Tên Viết tắt tùy chỉnh</T></span>
                    <span className={`text-[9px] mt-0.5 font-normal ${displayRule === "custom" ? "text-slate-300" : "text-slate-400"}`}>
                      Hiển thị theo bí danh quy định ở cài đặt máy tính
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] select-none animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-[280px] p-5 shadow-2xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <LogOut className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="font-extrabold text-[13px] text-slate-800 tracking-tight uppercase mb-1.5">
              <T>Xác nhận Đăng Xuất</T>
            </h3>
            <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed mb-4">
              <T>Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng chất lượng 4M1E1I?</T>
            </p>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] py-2 rounded-xl transition-all cursor-pointer uppercase border-none"
              >
                <T>Quay Lại</T>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) {
                    onLogout();
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] py-2 rounded-xl shadow-md cursor-pointer transition-all uppercase border-none"
              >
                <T>Đăng Xuất</T>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
