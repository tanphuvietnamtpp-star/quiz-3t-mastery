import { User, UserRole, UserStatus, QualityReport, Company, Branch, Department, BroadcastNotice, ChatMessage, CatalogProduct, CatalogMold, ProductionRequest, OrderImplementation, ProductionRequestStatus } from "./types";

// Standardize the term "Phòng Quản Lý Chất Lượng"
export const STANDARDIZED_QC_DEPT = "Phòng Quản Lý Chất Lượng";

// Base64 SVGs to act as beautiful, realistic, extremely lightweight factory quality concern photos
const svgManIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'><rect width='100%' height='100%' fill='%23eef2ff'/><text x='50%' y='40%' font-family='sans-serif' font-size='22' font-weight='bold' fill='%234f46e5' text-anchor='middle'>CON NGƯỜI (MAN)</text><text x='50%' y='60%' font-family='sans-serif' font-size='14' fill='%2364748b' text-anchor='middle'>Sản phẩm không dán tem phụ, lỗi lọt sang kho</text><rect x='100' y='180' width='200' height='30' rx='5' fill='%23ef4444'/><text x='50%' y='200' font-family='sans-serif' font-size='12' font-weight='bold' fill='white' text-anchor='middle'>CẢNH BÁO: SAI SÓT HOẠT ĐỘNG</text></svg>";

const svgMaterialIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'><rect width='100%' height='100%' fill='%23fdf4ff'/><text x='50%' y='40%' font-family='sans-serif' font-size='22' font-weight='bold' fill='%23c026d3' text-anchor='middle'>NGUYÊN VẬT LIỆU</text><text x='50%' y='60%' font-family='sans-serif' font-size='14' fill='%2364748b' text-anchor='middle'>Thử nghiệm phôi 670g có tỉ lệ phế phẩm</text><rect x='100' y='180' width='200' height='30' rx='5' fill='%23f59e0b'/><text x='50%' y='200' font-family='sans-serif' font-size='12' font-weight='bold' fill='white' text-anchor='middle'>NGHIÊN CỨU: KHÔNG ĐẠT MÀU</text></svg>";

const svgMachineIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'><rect width='100%' height='100%' fill='%23f0fdf4'/><text x='50%' y='40%' font-family='sans-serif' font-size='22' font-weight='bold' fill='%2316a34a' text-anchor='middle'>MÁY MÓC (MACHINE)</text><text x='50%' y='60%' font-family='sans-serif' font-size='14' fill='%2364748b' text-anchor='middle'>Máy C16 mối dán túi bị kéo sợi zipper</text><rect x='80' y='180' width='240' height='30' rx='5' fill='%23d97706'/><text x='50%' y='200' font-family='sans-serif' font-size='12' font-weight='bold' fill='white' text-anchor='middle'>BẢO TRÌ: ĐIỀU CHỈNH ĐỘ NÓNG</text></svg>";

const svgMethodIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'><rect width='100%' height='100%' fill='%23fffbeb'/><text x='50%' y='40%' font-family='sans-serif' font-size='22' font-weight='bold' fill='%23d97706' text-anchor='middle'>PHƯƠNG PHÁP (METHOD)</text><text x='50%' y='60%' font-family='sans-serif' font-size='14' fill='%2364748b' text-anchor='middle'>Quy định dán nhãn barcode 3 size S-M-L</text></svg>";

const svgEnvIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'><rect width='100%' height='100%' fill='%23f0fdfa'/><text x='50%' y='40%' font-family='sans-serif' font-size='22' font-weight='bold' fill='%230d9488' text-anchor='middle'>MÔI TRƯỜNG (ENV)</text><text x='50%' y='60%' font-family='sans-serif' font-size='14' fill='%2364748b' text-anchor='middle'>Dự án lắp đặt hệ thống điện mặt trời Tasco</text></svg>";

const svgInfoIcon = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'><rect width='100%' height='100%' fill='%23f8fafc'/><text x='50%' y='40%' font-family='sans-serif' font-size='22' font-weight='bold' fill='%23475569' text-anchor='middle'>THÔNG TIN (INFO)</text><text x='50%' y='60%' font-family='sans-serif' font-size='14' fill='%2364748b' text-anchor='middle'>Đón đoàn đánh giá tiêu chuẩn BRC xưởng sạch</text></svg>";

export const initialCompanies: Company[] = [
  { id: "TPP-Group", name: "TÂN PHÚ VIỆT NAM" }
];

export const initialBranches: Branch[] = [
  { id: "TPP-CTY", name: "Văn Phòng Công Ty (TPP-CTY)", companyId: "TPP-Group", isScoring: true },
  { id: "TPP-BNI", name: "Chi Nhánh Bắc Ninh (TPP-BNI)", companyId: "TPP-Group", isScoring: true },
  { id: "TPP-LAN", name: "Chi Nhánh Long An (TPP-LAN)", companyId: "TPP-Group", isScoring: true },
  { id: "TPP-314", name: "Nhà máy 314 (TPP-314)", companyId: "TPP-Group", isScoring: true }
];

export const initialDepartments: Department[] = [
  // Văn Phòng Công Ty (TPP-CTY)
  { id: "cty-1", name: "Ban Tổng Giám Đốc (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-2", name: "Kênh Bán lẻ (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-3", name: "Kênh Dự án (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-4", name: "Kênh GT (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-5", name: "Kênh MT (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-6", name: "Khối quản lý chuỗi cung ứng (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-7", name: "Phòng Hành chính nhân sự (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-8", name: "Phòng Kế hoạch và dự báo (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-9", name: "Phòng kinh doanh công nghiệp (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-10", name: "Phòng Kinh doanh quốc tế (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-11", name: "Phòng Kinh doanh quốc tế 2 (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-12", name: "Phòng Kinh doanh quốc tế BBM (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-13", name: "Phòng Marketing - Truyền thông (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-14", name: "Phòng Mua hàng (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-15", name: "Phòng Nghiên cứu và phát triển sản phẩm (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-16", name: "Phòng phân phối (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-17", name: "Phòng Quản Lý Chất Lượng (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-18", name: "Phòng Tài chính Kế toán (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-19", name: "Phòng Thiết kế kỹ thuật (TPP-CTY)", branchId: "TPP-CTY" },
  { id: "cty-20", name: "Ban trợ lý + KSTC (TPP-CTY)", branchId: "TPP-CTY" },

  // Chi Nhánh Bắc Ninh (TPP-BNI)
  { id: "bn-1", name: "Ban Giám đốc (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-2", name: "Ban Quản đốc (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-3", name: "Dây chuyền nước (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-4", name: "Phòng Hành chính nhân sự (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-5", name: "Phòng Kế hoạch sản xuất (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-6", name: "Phòng Kho vận (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-7", name: "Phòng Kỹ Thuật (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-8", name: "Phòng Quản Lý Chất Lượng (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-9", name: "Phòng Tài chính Kế toán (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-10", name: "Sản xuất (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-11", name: "Tổ bốc xếp (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-12", name: "Tổ lái xe tải (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-13", name: "Tổ Xay trộn (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-14", name: "Xưởng GMP (TPP-BNI)", branchId: "TPP-BNI" },
  { id: "bn-15", name: "Xưởng Pet (TPP-BNI)", branchId: "TPP-BNI" },

  // Chi Nhánh Long An (TPP-LAN)
  { id: "la-1", name: "Ban Giám đốc (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-2", name: "Ban Quản đốc (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-3", name: "Phân Xưởng 1 (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-4", name: "Phân xưởng 2 (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-5", name: "Phòng Hành chính nhân sự (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-6", name: "Phòng Kế hoạch vật tư (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-7", name: "Phòng Kho vận (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-8", name: "Phòng Kỹ Thuật (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-9", name: "Phòng Quản Lý Chất Lượng (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-10", name: "Phòng Tài chính Kế toán (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-11", name: "Tổ hoàn tất (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-12", name: "Tổ Xay trộn (TPP-LAN)", branchId: "TPP-LAN" },
  { id: "la-13", name: "Xưởng Cơ khí (TPP-LAN)", branchId: "TPP-LAN" },

  // Nhà máy 314 (TPP-314)
  { id: "nm-1", name: "Phân xưởng sản xuất (TPP-314)", branchId: "TPP-314" },
  { id: "nm-2", name: "Phòng Tài chính Kế toán (TPP-314)", branchId: "TPP-314" }
];

export const defaultAdmin: User = {
  id: "2018.00281",
  fullName: "Lê Nhật Trường",
  phone: "0907767304",
  department: "Phòng Quản Lý Chất Lượng (TPP-CTY)",
  branch: "Văn Phòng Công Ty (TPP-CTY)",
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  password: "111222",
  isOnline: true
};

export const initialUsers: User[] = [
  defaultAdmin,
  {
    id: "2021.00126",
    fullName: "Trần Đức Huy",
    phone: "0901123456",
    department: "Ban Tổng Giám Đốc (TPP-CTY)",
    branch: "Văn Phòng Công Ty (TPP-CTY)",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2025.01840",
    fullName: "Phan Anh Tuấn",
    phone: "0945482999",
    department: "Ban Tổng Giám Đốc (TPP-CTY)",
    branch: "Văn Phòng Công Ty (TPP-CTY)",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2025.01841",
    fullName: "Ngô Đức Trung",
    phone: "0913885674",
    department: "Ban Tổng Giám Đốc (TPP-CTY)",
    branch: "Văn Phòng Công Ty (TPP-CTY)",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2025.01842",
    fullName: "Nguyễn Thị Thoại",
    phone: "0932153993",
    department: "Ban Tổng Giám Đốc (TPP-CTY)",
    branch: "Văn Phòng Công Ty (TPP-CTY)",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2025.01857",
    fullName: "Lương Xuân Cường",
    phone: "0933782622",
    department: "Ban Giám đốc (TPP-BNI)",
    branch: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    role: UserRole.REVIEWER,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2011.00134",
    fullName: "Nguyễn Đức Thắng",
    phone: "0988090398",
    department: "Ban Giám đốc (TPP-BNI)",
    branch: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    role: UserRole.REVIEWER,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2020.00354",
    fullName: "Quách Thuỷ Vân",
    phone: "0968020386",
    department: "Ban Quản đốc (TPP-BNI)",
    branch: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    role: UserRole.REVIEWER,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2022.00129",
    fullName: "Trương Thị Thanh Thiện",
    phone: "0907123456",
    department: "Phòng Quản Lý Chất Lượng (TPP-LAN)",
    branch: "Chi Nhánh Long An (TPP-LAN)",
    role: UserRole.STAFF,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2023.00481",
    fullName: "Bùi Thanh Dung",
    phone: "0908877665",
    department: "Phòng Quản Lý Chất Lượng (TPP-BNI)",
    branch: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    role: UserRole.STAFF,
    status: UserStatus.ACTIVE,
    password: "123456"
  },
  {
    id: "2024.00912",
    fullName: "Kim Thị Bích Tuyền",
    phone: "0919922883",
    department: "Phòng Tài chính Kế toán (TPP-314)",
    branch: "Nhà máy 314 (TPP-314)",
    role: UserRole.REVIEWER,
    status: UserStatus.ACTIVE,
    password: "123456"
  }
];

export const initialReports: QualityReport[] = [
  {
    id: "R-1",
    factory: "Chi Nhánh Long An (TPP-LAN)",
    timestamp: "15:05:34 27/05/2026",
    category: "THÔNG TIN",
    content: "Tiếp đoàn khách hàng Ngọc Tùng tham quan nhà máy.",
    imageUrl: svgInfoIcon,
    compressedSizeKb: 135,
    originalSizeKb: 340,
    uploaderName: "Trương Thị Thanh Thiện",
    uploaderPhone: "0907123456",
    uploaderId: "2022.00129",
    uploaderDepartment: STANDARDIZED_QC_DEPT,
    isAbnormal: false,
    notes: "Đoàn khách đánh giá cao khâu vệ sinh 5S."
  },
  {
    id: "R-2",
    factory: "Nhà máy Đất Đỏ (BBM)",
    timestamp: "20:38:53 27/05/2026",
    category: "CON NGƯỜI",
    content: "CÔNG NHÂN TỰ Ý TĂNG TÚI (Vượt định mức quy định 21/20 túi). Không tuân thủ hướng dẫn kỹ thuật trên máy.",
    imageUrl: svgManIcon,
    compressedSizeKb: 142,
    originalSizeKb: 412,
    uploaderName: "Trương Thị Thanh Thiện",
    uploaderPhone: "0907123456",
    uploaderId: "2022.00129",
    uploaderDepartment: STANDARDIZED_QC_DEPT,
    isAbnormal: true,
    notes: "Lập biên bản chấn chỉnh khẩn cấp tổ sản xuất."
  },
  {
    id: "R-3",
    factory: "Nhà máy Đất Đỏ (BBM)",
    timestamp: "11:11:19 29/05/2026",
    category: "PHƯƠNG PHÁP",
    content: "Chuẩn hóa quy trình dán nhãn Barcode cho 3 size S-M-L trên cuộn bao gói ngoài.",
    imageUrl: svgMethodIcon,
    compressedSizeKb: 110,
    originalSizeKb: 280,
    uploaderName: "Kim Thị Bích Tuyền",
    uploaderPhone: "0919922883",
    uploaderId: "2024.00912",
    uploaderDepartment: STANDARDIZED_QC_DEPT,
    isAbnormal: false,
    notes: "Đã truyền thông cho toàn bộ tổ trưởng sản xuất."
  },
  {
    id: "R-4",
    factory: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    timestamp: "15:46:41 06/06/2026",
    category: "MÔI TRƯỜNG",
    content: "Khảo sát và làm việc với nhà thầu năng lượng Tasco về dự án lắp đặt điện mặt trời.",
    imageUrl: svgEnvIcon,
    compressedSizeKb: 124,
    originalSizeKb: 310,
    uploaderName: "Bùi Thanh Dung",
    uploaderPhone: "0908877665",
    uploaderId: "2023.00481",
    uploaderDepartment: STANDARDIZED_QC_DEPT,
    isAbnormal: false,
    notes: "Chuẩn bị mặt bằng thi công xưởng chính."
  },
  {
    id: "R-5",
    factory: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    timestamp: "15:57:21 06/06/2026",
    category: "MÁY MÓC",
    content: "Bảo dưỡng khẩn cấp các đầu cắm phôi máy thổi phích chai TĐ04 phát hiện bám bụi bẩn.",
    imageUrl: svgMachineIcon,
    compressedSizeKb: 153,
    originalSizeKb: 395,
    uploaderName: "Bùi Thanh Dung",
    uploaderPhone: "0908877665",
    uploaderId: "2023.00481",
    uploaderDepartment: STANDARDIZED_QC_DEPT,
    isAbnormal: true,
    notes: "Phát hiện gioăng bị mòn nhẹ, đề xuất thay thế tuần tới."
  },
  {
    id: "R-6",
    factory: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    timestamp: "16:01:11 06/06/2026",
    category: "CON NGƯỜI",
    content: "Báo cáo lao động: Nhân sự chính thức nghỉ 6 người, thời vụ nghỉ 1 người khiến chuyền bị thiếu lao động vận hành.",
    imageUrl: svgManIcon,
    compressedSizeKb: 148,
    originalSizeKb: 388,
    uploaderName: "Bùi Thanh Dung",
    uploaderPhone: "0908877665",
    uploaderId: "2023.00481",
    uploaderDepartment: STANDARDIZED_QC_DEPT,
    isAbnormal: true,
    notes: "Điều chuyển nhân lực từ bộ phận bọc màng bù đắp tạm thời."
  },
  {
    id: "R-7",
    factory: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    timestamp: "16:00:38 06/06/2026",
    category: "NGUYÊN VẬT LIỆU",
    content: "Thử nghiệm phôi 670g có pha thêm 3% hạt nhựa tái sinh PET xanh làm mẫu bình ra lò bị đục màu hơn chuẩn.",
    imageUrl: svgMaterialIcon,
    compressedSizeKb: 122,
    originalSizeKb: 298,
    uploaderName: "Bùi Thanh Dung",
    uploaderPhone: "0908877665",
    uploaderId: "2023.00481",
    uploaderDepartment: STANDARDIZED_QC_DEPT,
    isAbnormal: true,
    notes: "Mẫu không đạt chất lượng kiểm định ngoại quan ngoại quan bình."
  }
];

export const initialBroadcastNotice: BroadcastNotice[] = [
  {
    id: "B-1",
    type: "Quản trị viên phát sóng",
    content: "Yêu cầu tất cả ca kíp cập nhật đầy đủ thông tin thay đổi thông số máy trước 17h00 hàng ngày.",
    sender: "Lê Nhật Trường",
    timestamp: "17/06/2026"
  },
  {
    id: "B-2",
    type: "Hệ thống",
    content: "Tự hào hoàn thành đánh giá thực địa tiêu chuẩn xưởng sạch BRC tại Nhà Máy Đất Đỏ.",
    sender: "Hệ thống",
    timestamp: "16/06/2026"
  }
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: "C-1",
    senderName: "Bùi Thanh Dung",
    senderRole: "Nhân viên QC",
    senderPhone: "0908877665",
    message: "Hôm nay phôi PET xanh về Bắc Ninh bị trễ 2 tiếng, chúng em đang theo dõi kỹ quy trình sấy phôi.",
    timestamp: "17/06/2026 09:12:00"
  },
  {
    id: "C-2",
    senderName: "Lê Nhật Trường",
    senderRole: "Chủ Admin",
    senderPhone: "0907767304",
    message: "Dung bám sát nhiệt độ sấy nhé. Tuyệt đối không để xảy ra bọt khí trên thân sản phẩm.",
    timestamp: "17/06/2026 09:30:15"
  }
];

// Initial Products Catalog (Khai báo mã hóa)
export const initialProductsCatalog: CatalogProduct[] = [
  { code: "HIN.TRCQ.0027HHC", barcode: "8935275213218", name: "Bộ thau rổ có quai xách Yoko 27cm - Hồng nhạt", unit: "Bộ" },
  { code: "HIN.TRCQ.0027OHC", barcode: "8935275213218", name: "Bộ thau rổ có quai xách Yoko 27cm - Xanh bơ", unit: "Bộ" },
  { code: "HIN.TRCQ.0027GHC", barcode: "8935275213218", name: "Bộ thau rổ có quai xách Yoko 27cm - Ghi sữa", unit: "Bộ" },
  { code: "HIN.KEDD.TOKYGHC", barcode: "8935275200065", name: "Kệ di động Tokyo - Ghi sữa", unit: "Cái" },
  { code: "HIN.KEDD.TOKYTHC", barcode: "8935275200065", name: "Kệ di động Tokyo - Trắng", unit: "Cái" },
  { code: "HIN.CHAB.YOKO30", barcode: "8935275200112", name: "Chậu tắm bé Yoko 30L", unit: "Cái" },
  { code: "HIN.HOCH.YOKO50", barcode: "8935275200256", name: "Hộp đựng thực phẩm Yoko 500ml", unit: "Cái" }
];

// Initial Molds Catalog (Danh mục khuôn mẫu)
export const initialMoldsCatalog: CatalogMold[] = [
  { code: "MOLD-YOKO27-TRCQ", name: "Khuôn Thau Rổ Yoko 27cm", description: "Khuôn cốt đúc 2 lòng rời, ép quai xách" },
  { code: "MOLD-TOKYO-KEDD", name: "Khuôn Kệ Di Động Tokyo", description: "Khuôn dập khung chân di động đa năng" },
  { code: "MOLD-CHAB-YOKO30", name: "Khuôn Chậu Tắm Bé Yoko", description: "Khuôn siêu trường ép nhựa PP nguyên sinh" }
];

// Initial Production Requests (Phiếu Yêu Cầu Sản Xuất)
export const initialProductionRequests: ProductionRequest[] = [
  {
    id: "PR-20251217-01",
    requestNo: "05-12NGU/KDGD/CNBN",
    requestDate: "17/12/2025",
    targetBranch: "Chi Nhánh Bắc Ninh (TPP-BNI)",
    contact: "Lương Xuân Cường (BGĐ Chi nhánh)",
    department: "Kênh Dự án (TPP-CTY)",
    uploaderName: "Võ Thị Hồng Sương",
    uploaderPhone: "0907123456",
    uploaderId: "2022.00129", // simulated salesperson id
    status: ProductionRequestStatus.IMPLEMENTED,
    balanceNotes: "Khối SCM đã kiểm tra tồn kho: Tồn kho Yoko 27cm trống, Kệ Tokyo trống. Chuyền ép sẵn sàng phục vụ. Chuyển giao kế hoạch sản xuất Bắc Ninh chuẩn bị.",
    inventoryChecked: true,
    implementationId: "OI-20251217-01"
  },
  {
    id: "PR-20260618-02",
    requestNo: "06-18DA/KDD/CNLA",
    requestDate: "18/06/2026",
    targetBranch: "Chi Nhánh Long An (TPP-LAN)",
    contact: "Trần Giám Đốc",
    department: "Kênh Dự án (TPP-CTY)",
    uploaderName: "Vũ Văn Minh",
    uploaderPhone: "0901234567",
    uploaderId: "2023.00481",
    status: ProductionRequestStatus.PENDING,
    inventoryChecked: false
  }
];

// Initial Production Request Items
export const initialProductionRequestItemsMap: Record<string, any[]> = {
  "PR-20251217-01": [
    {
      id: "PRI-01",
      productCode: "HIN.TRCQ.0027HHC",
      barcode: "8935275213218",
      productName: "Bộ thau rổ có quai xách Yoko 27cm - Hồng nhạt (Hùng Cường - Nutricare)",
      unit: "Bộ",
      quantity: 4660,
      notes: "Không dùng đai quấn. Dùng tem dán ngoài thau và tem phụ. Decal nổi logo khách: ngang 70 x cao 20.8mm dán ngoài thau chính giữa cạnh không vướng quai cách miệng 4cm. Đóng gói & quy cách: như hàng Inochi. TG giao: 10/01/2026."
    },
    {
      id: "PRI-02",
      productCode: "HIN.TRCQ.0027OHC",
      barcode: "8935275213218",
      productName: "Bộ thau rổ có quai xách Yoko 27cm - Xanh bơ (Hùng Cường - Nutricare)",
      unit: "Bộ",
      quantity: 4660,
      notes: "Không dùng đai quấn. Dùng tem dán ngoài thau và tem phụ. Decal nổi logo khách: ngang 70 x cao 20.8mm dán ngoài thau chính giữa cạnh không vướng quai cách miệng 4cm. Đóng gói & quy cách: như hàng Inochi. TG giao: 10/01/2026."
    },
    {
      id: "PRI-03",
      productCode: "HIN.TRCQ.0027GHC",
      barcode: "8935275213218",
      productName: "Bộ thau rổ có quai xách Yoko 27cm - Ghi sữa (Hùng Cường - Nutricare)",
      unit: "Bộ",
      quantity: 4640,
      notes: "Không dùng đai quấn. Dùng tem dán ngoài thau và tem phụ. Decal nổi logo khách dán chính giữa cạnh không vướng quai xách cách miệng thau 4cm."
    },
    {
      id: "PRI-04",
      productCode: "HIN.KEDD.TOKYGHC",
      barcode: "8935275200065",
      productName: "Kệ di động Tokyo - Ghi sữa (Hùng Cường - Nutricare)",
      unit: "Cái",
      quantity: 2140,
      notes: "Hàng theo tiêu chuẩn Inochi. Dán thêm decal nổi logo khách: ngang 50 x cao 14.7mm sát tay cầm. Đóng gói: 1 cái/túi PE/thùng. TG giao: 10/01/2026."
    },
    {
      id: "PRI-05",
      productCode: "HIN.KEDD.TOKYTHC",
      barcode: "8935275200065",
      productName: "Kệ di động Tokyo - Trắng (Hùng Cường - Nutricare)",
      unit: "Cái",
      quantity: 2147,
      notes: "Dán nhãn decal nổi logo ngang 50 x cao 14.7mm. Đóng gói 1 cái/túi PE. TG giao: 10/01/2026."
    }
  ],
  "PR-20260618-02": [
    {
      id: "PRI-06",
      productCode: "HIN.CHAB.YOKO30",
      barcode: "8935275200112",
      productName: "Chậu tắm bé Yoko 30L - Xanh dương",
      unit: "Cái",
      quantity: 1500,
      notes: "Thêm in lụa logo đối tác sữa tắm Enfa ở quai chậu. Đóng gói 5 cái/thùng."
    }
  ]
};

// Initial Projects Implementation Order Requests (Phiếu yêu cầu triển khai đơn hàng Kênh dự án)
export const initialOrderImplementations: OrderImplementation[] = [
  {
    id: "OI-20251217-01",
    requestId: "PR-20251217-01",
    requestNo: "05-12NGU/KDGD/CNBN",
    productName: "Bộ thau rổ Yoko 27cm & Kệ di động Tokyo",
    customerName: "Hùng Cường - Nutricare",
    
    moldOption: "SỬA_KHUÔN",
    moldDetail: "Sửa khuôn/ insert thêm logo khách hàng ngang 70 x cao 20.8mm dán ngoài thau chính giữa cạnh không vướng quai cách miệng thau 4cm.",
    
    formulaOption: "NHƯ_INOCHI",
    formulaDetail: "Nhựa nguyên sinh PP không phế phẩm, bảo đảm màu sắc đồng đều.",
    
    colorOption: "MÀU_MỚI",
    colorPantone1: "Pantone 2365C (Hồng nhạt)",
    colorPantone2: "Pantone 365C (Xanh bơ)",
    colorName1: "Hồng nhạt",
    colorName2: "Xanh bơ & Ghi sữa",
    
    printOption: "CÓ_IN",
    printDetail: "In nổi logo bạc phủ bảo vệ cao cấp chống bay màu dán trên tay vịn và thau chính giữa.",
    
    packagingOption: "MỚI",
    packagingDetail: "Lồng chặt bộ thau vào rổ gập quai xách xuống, dán tem phụ ngoài đáy thau và tem ngoài rổ.",
    
    pkgMaterialOption: "MỚI",
    pkgMaterialDetail: "Tìm mua thùng carton C2 sóng dày, phủ chống thấm ẩm theo tiêu chuẩn xuất khẩu, in ấn thương hiệu Nutricare.",
    
    sampleOption: "NHÀ_MÁY_TRIỂN_KHAI",
    sampleDetail: "Nhà máy Bắc Ninh triển khai vật tư bao gói, túi PE đục lỗ hơi thoát nước tránh ẩm mốc sản phẩm.",
    
    approvalOption: "ONLINE_KÝ_MẪU_SAU",
    approvalDetail: "Sản xuất trước 5 bộ mẫu gửi qua bưu điện cho Sales kiểm duyệt trực quan và phản hồi ký trực tuyến.",
    
    qcStandardOption: "TIÊU_CHUẨN_KHÁCH_HÀNG",
    qcStandardDetail: "Yêu cầu nghiêm ngặt 0% bụi bẩn, không dính hạt nhựa thừa xước tay cầm, ngoại quan bóng bẩy, quai xách chắc chắn chịu tải 5kg.",
    
    safetyStandardOption: "THEO_TIÊU_CHUẨN_INOCHI",
    safetyStandardDetail: "Bảo đảm tiêu chuẩn vệ sinh an toàn thực phẩm, nhựa PP nguyên sinh không hóa chất Bisphenol-A (BPA Free).",
    
    creatorName: "Lê Nhật Trường (Khối SCM)",
    createdAt: "18/12/2025"
  }
];
