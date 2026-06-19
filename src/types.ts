export enum UserRole {
  ADMIN = "CHỦ ADMIN",
  REVIEWER = "DUYỆT VIÊN",
  STAFF = "NHÂN VIÊN"
}

export enum UserStatus {
  ACTIVE = "Đã hoạt động",
  PENDING = "Chờ phê duyệt",
  LOCKED = "Đã khóa",
  REJECTED = "Bị từ chối"
}

export interface User {
  id: string; // Mã nhân sự
  fullName: string;
  phone: string;
  department: string;
  branch: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  isOnline?: boolean;
  company?: string;
  canSpeciallyEditDelete?: boolean;
}

export type Category4M1E1I = 
  | "CON NGƯỜI" 
  | "NGUYÊN VẬT LIỆU" 
  | "MÁY MÓC" 
  | "PHƯƠNG PHÁP" 
  | "MÔI TRƯỜNG" 
  | "THÔNG TIN";

export interface QualityReportDirective {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface QualityReport {
  id: string;
  factory: string;
  timestamp: string;
  category: Category4M1E1I;
  content: string;
  imageUrl: string; // Base64 of compressed WebP
  imageUrls?: string[]; // Array of up to 3 compressed image Base64s
  compressedSizeKb: number;
  originalSizeKb: number;
  uploaderName: string;
  uploaderPhone: string;
  uploaderId: string;
  uploaderDepartment: string;
  notes?: string;
  isAbnormal: boolean; // Is abnormal/alert report
  googleDrivePath?: string;
  directives?: QualityReportDirective[];
  likedBy?: string[];
  sharedBy?: string[];
  updatedAt?: string;
  updateLogs?: string[];
}

export interface Company {
  id: string;
  name: string;
}

export interface Branch {
  id: string;
  name: string;
  companyId: string;
  isScoring?: boolean; // Tính điểm
}

export interface Department {
  id: string;
  name: string;
  branchId: string;
  isScoring?: boolean; // Tính điểm
}

export interface BroadcastNotice {
  id: string;
  type: string; // e.g. "Quản trị viên phát sóng", "Thông báo đỏ"
  content: string;
  sender: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  senderPhone: string;
  message: string;
  timestamp: string;
  reportRefId?: string; // Reference to a quality report
}

export interface OfflineQueueItem {
  id: string;
  reportData: Omit<QualityReport, "id" | "googleDrivePath">;
  queuedAt: string;
}

export interface CatalogProduct {
  code: string;
  barcode: string;
  name: string;
  unit: string;
}

export interface CatalogMold {
  code: string;
  name: string;
  description: string;
}

export interface ProductionRequestItem {
  id: string; // unique item id
  productCode: string;
  barcode: string;
  productName: string;
  unit: string;
  quantity: number;
  notes: string;
  imageUrl?: string; // illustration image
  imageAnnotations?: string; // annotated guidelines on image
}

export enum ProductionRequestStatus {
  PENDING = "Chờ xem xét",
  BALANCED = "Đã cân đối (Chuẩn bị triển khai)",
  IMPLEMENTED = "Đã triển khai",
  REJECTED = "Từ chối"
}

export interface ProductionRequest {
  id: string;
  requestNo: string; // BM01-QT.01/KD ...
  requestDate: string; // Ngày yêu cầu
  targetBranch: string; // Kính gửi (CN Bắc Ninh, CN Long An...)
  contact: string; // Liên hệ
  department: string; // Phòng kinh doanh yêu cầu (Kênh dự án, Kênh lẻ...)
  items?: ProductionRequestItem[];
  uploaderName: string;
  uploaderPhone: string;
  uploaderId: string;
  status: ProductionRequestStatus;
  balanceNotes?: string; // Ghi chú cân đối tồn kho / hàng hóa của SC
  inventoryChecked?: boolean; // Đã kiểm tra tồn kho
  implementationId?: string; // Reference to OrderImplementation if created
}

export interface OrderImplementation {
  id: string;
  requestId: string; // Refer to ProductionRequest
  requestNo: string;
  productName: string;
  customerName: string; // Tên khách hàng (Hùng Cường - Nutricare,...)
  
  // Mold Requirements
  moldOption: "MỚI" | "SỬA_KHUÔN" | "NHƯ_INOCHI";
  moldDetail: string; // Mô tả sửa khuôn / insert logo
  
  // Plastic Formula
  formulaOption: "MỚI" | "NHƯ_INOCHI";
  formulaDetail: string; // Mô tả phế xoay vòng, kháng khuẩn...
  
  // Product Color
  colorOption: "MÀU_MỚI" | "NHƯ_INOCHI";
  colorPantone1: string;
  colorPantone2: string;
  colorName1: string;
  colorName2: string;
  
  // Printing on product
  printOption: "CÓ_IN" | "KHÔNG_IN";
  printDetail: string; // File đính kèm, pantone
  
  // Packaging Spec
  packagingOption: "MỚI" | "NHƯ_INOCHI";
  packagingDetail: string; // SP/túi, hộp x số túi...
  
  // Packings (Bao bì)
  pkgMaterialOption: "MỚI" | "NHƯ_INOCHI";
  pkgMaterialDetail: string; // tem nhãn, thùng C2, màng PET,...
  
  // Sample production
  sampleOption: "KD_TỰ_TÌM" | "NHÀ_MÁY_TRIỂN_KHAI";
  sampleDetail: string; // loại bao bì
  
  // Sample Approval
  approvalOption: "TRỰC_TIẾP_NCC" | "ONLINE_KÝ_MẪU_SAU" | "CHỊU_CHI_PHÍ";
  approvalDetail: string;
  
  // Quality Standards - Appearance
  qcStandardOption: "TIÊU_CHUẨN_KHÁCH_HÀNG" | "THEO_TIÊU_CHUẨN_TÂN_PHÚ";
  qcStandardDetail: string; // vb bụi bẩn, côn trùng...
  
  // Quality Standards - Safety
  safetyStandardOption: "TIÊU_CHUẨN_KHÁCH_HÀNG" | "THEO_TIÊU_CHUẨN_INOCHI";
  safetyStandardDetail: string; // FDA, EU...
  
  creatorName: string; // uploader từ Khối SCM (TPP-CTY)
  createdAt: string; 
}
