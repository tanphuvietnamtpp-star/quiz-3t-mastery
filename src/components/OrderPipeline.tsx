import React, { useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  Package,
  ShoppingCart,
  CheckSquare,
  Info,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  User,
  Sliders,
  Building,
  Calendar,
  Sparkles,
  ClipboardList,
  ChevronRight,
  Eye,
  Settings,
  Pencil
} from "lucide-react";
import { T } from "./TranslateText";
import {
  User as UserType,
  Branch,
  Department,
  ProductionRequest,
  ProductionRequestItem,
  OrderImplementation,
  CatalogProduct,
  CatalogMold,
  ProductionRequestStatus
} from "../types";

const formatDateToShort = (d: Date = new Date()): string => {
  const date = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${date}/${month}/${year}`;
};

// Design SVGs to act as high-fidelity diagram presets for the Sales and PMC team
const drawYokoThauRo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='100' viewBox='0 0 150 100'><rect width='100%' height='100%' fill='%23fee2e2'/><ellipse cx='75' cy='50' rx='50' ry='25' fill='none' stroke='%23dc2626' stroke-width='2'/><ellipse cx='75' cy='55' rx='35' ry='15' fill='none' stroke='%23fca5a5' stroke-dasharray='3'/><path d='M25,50 L25,40 M125,50 L125,40' stroke='%23dc2626' stroke-width='2'/><text x='75' y='25' font-family='sans-serif' font-size='8' font-weight='bold' fill='%237f1d1d' text-anchor='middle'>SƠ ĐỒ THAU RỔ YOKO</text><text x='75' y='60' font-family='sans-serif' font-size='6' fill='%23991b1b' text-anchor='middle'>Vị trí dán Decal cách miệng 4cm</text></svg>";

const drawKeTokyo = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='100' viewBox='0 0 150 100'><rect width='100%' height='100%' fill='%23f1f5f9'/><rect x='45' y='15' width='60' height='10' rx='2' fill='none' stroke='%23475569' stroke-width='1.5'/><rect x='45' y='40' width='60' height='10' rx='2' fill='none' stroke='%23475569' stroke-width='1.5'/><rect x='45' y='65' width='60' height='10' rx='2' fill='none' stroke='%23475569' stroke-width='1.5'/><line x1='40' y1='10' x2='40' y2='90' stroke='%231e293b' stroke-width='2'/><line x1='110' y1='10' x2='110' y2='90' stroke='%231e293b' stroke-width='2'/><circle cx='50' cy='30' r='3' fill='%233b82f6'/><text x='75' y='33' font-family='sans-serif' font-size='6' fill='%231e3a8a' text-anchor='middle'>Decal dán sát quai 5x1.47cm</text><text x='75' y='90' font-family='sans-serif' font-size='8' font-weight='bold' fill='%231e293b' text-anchor='middle'>KỆ ĐỒ TOKYO 3 TẦNG</text></svg>";

const drawChauTamYoko = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='100' viewBox='0 0 150 100'><rect width='100%' height='100%' fill='%23e0f2fe'/><path d='M20,30 C40,90 110,90 130,30 Z' fill='none' stroke='%230284c7' stroke-width='2'/><ellipse cx='30' cy='35' rx='6' ry='3' fill='none' stroke='%230369a1' stroke-width='1.5'/><text x='75' y='20' font-family='sans-serif' font-size='8' font-weight='bold' fill='%230c4a6e' text-anchor='middle'>CHẬU TẮM YOKO 30L</text><text x='75' y='55' font-family='sans-serif' font-size='6' fill='%230369a1' text-anchor='middle'>In lụa Logo Enfa đối xứng</text></svg>";

interface OrderPipelineProps {
  currentUser: UserType;
  branches: Branch[];
  departments: Department[];
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
}

export default function OrderPipeline({
  currentUser,
  branches,
  departments,
  productionRequests,
  setProductionRequests,
  productionRequestItemsMap,
  setProductionRequestItemsMap,
  orderImplementations,
  setOrderImplementations,
  productsCatalog,
  setProductsCatalog,
  moldsCatalog,
  setMoldsCatalog
}: OrderPipelineProps) {
  const [activeSubTab, setActiveSubTab] = useState<"PR_LIST" | "OI_LIST" | "CATALOG">("PR_LIST");

  // Selection states for managing active items inside SCM workspace
  const [selectedPrId, setSelectedPrId] = useState<string>("PR-20251217-01");
  const [selectedOiId, setSelectedOiId] = useState<string>("OI-20251217-01");

  // Toggle flags for modals/wizards
  const [showCreatePrModal, setShowCreatePrModal] = useState(false);
  const [showCreateOiWizard, setShowCreateOiWizard] = useState(false);
  const [selectedPrForOi, setSelectedPrForOi] = useState<ProductionRequest | null>(null);

  // States for adding New items in Catalog directly
  const [catCode, setCatCode] = useState("");
  const [catBarcode, setCatBarcode] = useState("");
  const [catName, setCatName] = useState("");
  const [catUnit, setCatUnit] = useState("Cái");
  const [catSuccess, setCatSuccess] = useState("");

  const [moldCode, setMoldCode] = useState("");
  const [moldName, setMoldName] = useState("");
  const [moldDesc, setMoldDesc] = useState("");
  const [moldSuccess, setMoldSuccess] = useState("");

  // States for Wizard 1: Create New "Phiếu Yêu Cầu Sản Xuất" (Sales Form)
  const [newPrNo, setNewPrNo] = useState(() => `PR-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}${String(new Date().getDate()).padStart(2,"0")}-${String(Math.floor(100 + Math.random() * 900))}`);
  const [newPrBranch, setNewPrBranch] = useState("Chi Nhánh Bắc Ninh (TPP-BNI)");
  const [newPrContact, setNewPrContact] = useState("BGĐ Chi Nhánh");
  const [newPrDept, setNewPrDept] = useState("Kênh Dự án (TPP-CTY)");
  const [prFormItems, setPrFormItems] = useState<ProductionRequestItem[]>([]);

  // States for Editing an existing "Phiếu Yêu Cầu Sản Xuất"
  const [showEditPrModal, setShowEditPrModal] = useState(false);
  const [editingPrId, setEditingPrId] = useState<string | null>(null);
  const [editPrNo, setEditPrNo] = useState("");
  const [editPrBranch, setEditPrBranch] = useState("");
  const [editPrContact, setEditPrContact] = useState("");
  const [editPrDept, setEditPrDept] = useState("");
  const [editPrItems, setEditPrItems] = useState<ProductionRequestItem[]>([]);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);

  // Temp states for adding single item line to the active list
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [chosenProductCode, setChosenProductCode] = useState("");
  const [customProductCode, setCustomProductCode] = useState("");
  const [customProductBarcode, setCustomProductBarcode] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [customProductUnit, setCustomProductUnit] = useState("Bộ");
  const [itemQuantity, setItemQuantity] = useState<number>(1000);
  const [itemNotes, setItemNotes] = useState("");
  const [itemDrawingPreset, setItemDrawingPreset] = useState("none");
  const [customUploadedImage, setCustomUploadedImage] = useState<string>("");
  const [itemAnnotations, setItemAnnotations] = useState("");

  // States for PMC review / balancing
  const [scmNotes, setScmNotes] = useState("");
  const [inventoryIsChecked, setInventoryIsChecked] = useState(false);

  // States for Wizard 2: Create New "Phiếu yêu cầu triển khai đơn hàng Kênh dự án" (PMC Form)
  const [oiMoldOption, setOiMoldOption] = useState<"MỚI" | "SỬA_KHUÔN" | "NHƯ_INOCHI">("NHƯ_INOCHI");
  const [oiMoldDetail, setOiMoldDetail] = useState("");
  const [isCustomMold, setIsCustomMold] = useState(false);
  const [selectedMoldCode, setSelectedMoldCode] = useState("");
  const [customMoldCode, setCustomMoldCode] = useState("");
  const [customMoldName, setCustomMoldName] = useState("");
  const [customMoldDesc, setCustomMoldDesc] = useState("");

  const [oiFormulaOption, setOiFormulaOption] = useState<"MỚI" | "NHƯ_INOCHI">("NHƯ_INOCHI");
  const [oiFormulaDetail, setOiFormulaDetail] = useState("");

  const [oiColorOption, setOiColorOption] = useState<"MÀU_MỚI" | "NHƯ_INOCHI">("NHƯ_INOCHI");
  const [oiColorPantone1, setOiColorPantone1] = useState("");
  const [oiColorPantone2, setOiColorPantone2] = useState("");
  const [oiColorName1, setOiColorName1] = useState("");
  const [oiColorName2, setOiColorName2] = useState("");

  const [oiPrintOption, setOiPrintOption] = useState<"CÓ_IN" | "KHÔNG_IN">("KHÔNG_IN");
  const [oiPrintDetail, setOiPrintDetail] = useState("");

  const [oiPkgOption, setOiPkgOption] = useState<"MỚI" | "NHƯ_INOCHI">("NHƯ_INOCHI");
  const [oiPkgDetail, setOiPkgDetail] = useState("");

  const [oiPkgMatOption, setOiPkgMatOption] = useState<"MỚI" | "NHƯ_INOCHI">("NHƯ_INOCHI");
  const [oiPkgMatDetail, setOiPkgMatDetail] = useState("");

  const [oiSampleOption, setOiSampleOption] = useState<"KD_TỰ_TÌM" | "NHÀ_MÁY_TRIỂN_KHAI">("NHÀ_MÁY_TRIỂN_KHAI");
  const [oiSampleDetail, setOiSampleDetail] = useState("");

  const [oiApprovalOption, setOiApprovalOption] = useState<"TRỰC_TIẾP_NCC" | "ONLINE_KÝ_MẪU_SAU" | "CHỊU_CHI_PHÍ">("ONLINE_KÝ_MẪU_SAU");
  const [oiApprovalDetail, setOiApprovalDetail] = useState("");

  const [oiQcStandardOption, setOiQcStandardOption] = useState<"TIÊU_CHUẨN_KHÁCH_HÀNG" | "THEO_TIÊU_CHUẨN_TÂN_PHÚ">("THEO_TIÊU_CHUẨN_TÂN_PHÚ");
  const [oiQcStandardDetail, setOiQcStandardDetail] = useState("");

  const [oiSafetyStandardOption, setOiSafetyStandardOption] = useState<"TIÊU_CHUẨN_KHÁCH_HÀNG" | "THEO_TIÊU_CHUẨN_INOCHI">("THEO_TIÊU_CHUẨN_INOCHI");
  const [oiSafetyStandardDetail, setOiSafetyStandardDetail] = useState("");

  // Handlers for adding newly declared products / moulds to catalogs
  const handleAddProductToCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catCode.trim() || !catName.trim()) return;

    if (productsCatalog.some(p => p.code === catCode.trim())) {
      alert("Mã hàng hóa đã tồn tại trong danh mục!");
      return;
    }

    const newItem: CatalogProduct = {
      code: catCode.trim().toUpperCase(),
      barcode: catBarcode.trim() || "8935275000000",
      name: catName.trim(),
      unit: catUnit
    };

    setProductsCatalog(prev => [...prev, newItem]);
    setCatCode("");
    setCatBarcode("");
    setCatName("");
    setCatSuccess("Đã lưu mã hàng hóa mới thành công!");
    setTimeout(() => setCatSuccess(""), 4000);
  };

  const handleAddMoldToCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moldCode.trim() || !moldName.trim()) return;

    if (moldsCatalog.some(m => m.code === moldCode.trim())) {
      alert("Mã khuôn này đã tồn tại!");
      return;
    }

    const newItem: CatalogMold = {
      code: moldCode.trim().toUpperCase(),
      name: moldName.trim(),
      description: moldDesc.trim()
    };

    setMoldsCatalog(prev => [...prev, newItem]);
    setMoldCode("");
    setMoldName("");
    setMoldDesc("");
    setMoldSuccess("Đã lưu mã khuôn mới thành công!");
    setTimeout(() => setMoldSuccess(""), 4000);
  };

  // Start editing a specific product item line inside a form modal (pre-populates all inputs)
  const handleStartEditLineItem = (item: ProductionRequestItem) => {
    setEditingLineItemId(item.id);

    // Determine if it is a standard catalog item or a custom input
    const existsInCatalog = productsCatalog.some(p => p.code === item.productCode);
    if (existsInCatalog) {
      setIsCustomProduct(false);
      setChosenProductCode(item.productCode);
    } else {
      setIsCustomProduct(true);
      setCustomProductCode(item.productCode);
      setCustomProductBarcode(item.barcode || "");
      setCustomProductName(item.productName);
      setCustomProductUnit(item.unit);
    }

    setItemQuantity(item.quantity);
    setItemNotes(item.notes || "");

    // Find preset image matching its URL
    if (item.imageUrl === drawYokoThauRo) {
      setItemDrawingPreset("yoko");
      setCustomUploadedImage("");
    } else if (item.imageUrl === drawKeTokyo) {
      setItemDrawingPreset("tokyo");
      setCustomUploadedImage("");
    } else if (item.imageUrl === drawChauTamYoko) {
      setItemDrawingPreset("chau");
      setCustomUploadedImage("");
    } else if (item.imageUrl) {
      setItemDrawingPreset("custom");
      setCustomUploadedImage(item.imageUrl);
    } else {
      setItemDrawingPreset("none");
      setCustomUploadedImage("");
    }

    setItemAnnotations(item.imageAnnotations || "");
  };

  // Cancel/reset the single line item editing state
  const handleCancelEditLineItem = () => {
    setEditingLineItemId(null);
    setCustomProductCode("");
    setCustomProductBarcode("");
    setCustomProductName("");
    setItemNotes("");
    setItemAnnotations("");
    setItemDrawingPreset("none");
    setCustomUploadedImage("");
    setChosenProductCode("");
    setIsCustomProduct(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước file ảnh quá lớn. Vui lòng tải ảnh dưới 2MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add or update items list locally in the Sales submission form
  const handleAddLineItemToPrForm = () => {
    let pCode = "";
    let pBarcode = "";
    let pName = "";
    let pUnit = "";

    if (isCustomProduct) {
      if (!customProductCode.trim() || !customProductName.trim()) {
        alert("Vui lòng điền mã và tên hàng hóa khai báo mới!");
        return;
      }
      pCode = customProductCode.trim().toUpperCase();
      pBarcode = customProductBarcode.trim() || "8935275000000";
      pName = customProductName.trim();
      pUnit = customProductUnit;

      // Add to catalogs as well dynamically to prevent losing
      const isExistPr = productsCatalog.some(p => p.code === pCode);
      if (!isExistPr) {
        setProductsCatalog(prev => [...prev, { code: pCode, name: pName, barcode: pBarcode, unit: pUnit }]);
      }
    } else {
      const match = productsCatalog.find(p => p.code === chosenProductCode);
      if (!match) {
        alert("Vui lòng chọn một mặt hàng từ danh mục hoặc đánh dấu khai báo mới!");
        return;
      }
      pCode = match.code;
      pBarcode = match.barcode;
      pName = match.name;
      pUnit = match.unit;
    }

    let imgUrlPreset: string | undefined = undefined;
    if (itemDrawingPreset === "yoko") imgUrlPreset = drawYokoThauRo;
    else if (itemDrawingPreset === "tokyo") imgUrlPreset = drawKeTokyo;
    else if (itemDrawingPreset === "chau") imgUrlPreset = drawChauTamYoko;
    else if (itemDrawingPreset === "custom") imgUrlPreset = customUploadedImage;

    if (editingLineItemId) {
      // Inline update item
      setPrFormItems(prev => prev.map(item => {
        if (item.id === editingLineItemId) {
          return {
            ...item,
            productCode: pCode,
            barcode: pBarcode,
            productName: pName,
            unit: pUnit,
            quantity: itemQuantity,
            notes: itemNotes.trim(),
            imageUrl: imgUrlPreset,
            imageAnnotations: itemAnnotations.trim()
          };
        }
        return item;
      }));
    } else {
      // Append new item
      const newItem: ProductionRequestItem = {
        id: `PRI-FORM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productCode: pCode,
        barcode: pBarcode,
        productName: pName,
        unit: pUnit,
        quantity: itemQuantity,
        notes: itemNotes.trim(),
        imageUrl: imgUrlPreset,
        imageAnnotations: itemAnnotations.trim()
      };
      setPrFormItems(prev => [...prev, newItem]);
    }

    handleCancelEditLineItem();
  };

  const removeItemLineFromPrForm = (lineId: string) => {
    setPrFormItems(prev => prev.filter(item => item.id !== lineId));
  };

  // Submit the formal Production Request
  const handleSubmitPr = () => {
    if (prFormItems.length === 0) {
      alert("Phiếu yêu cầu cần có ít nhất 1 dòng mặt hàng sản phẩm!");
      return;
    }

    const newPrId = `PR-${Date.now()}`;
    const cleanNo = newPrNo.trim() || `BM01-${Date.now()}`;

    const newPr: ProductionRequest = {
      id: newPrId,
      requestNo: cleanNo,
      requestDate: formatDateToShort(),
      targetBranch: newPrBranch,
      contact: newPrContact,
      department: newPrDept,
      uploaderName: currentUser.fullName,
      uploaderPhone: currentUser.phone,
      uploaderId: currentUser.id,
      status: ProductionRequestStatus.PENDING,
      inventoryChecked: false
    };

    setProductionRequests(prev => [newPr, ...prev]);
    setProductionRequestItemsMap(prev => ({
      ...prev,
      [newPrId]: prFormItems
    }));

    // Reset form states
    setPrFormItems([]);
    setShowCreatePrModal(false);
    setSelectedPrId(newPrId); // highlight new request
    setNewPrNo(`PR-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}${String(new Date().getDate()).padStart(2,"0")}-${String(Math.floor(100 + Math.random() * 900))}`);
  };

  // Start editing a production request
  const handleStartEditPr = (pr: ProductionRequest) => {
    setEditingPrId(pr.id);
    setEditPrNo(pr.requestNo);
    setEditPrBranch(pr.targetBranch);
    setEditPrContact(pr.contact);
    setEditPrDept(pr.department);
    setEditPrItems(productionRequestItemsMap[pr.id] || []);
    setShowEditPrModal(true);
  };

  // Delete a production request completely
  const handleDeletePr = (prId: string) => {
    if (confirm("Kiểm soát: Bạn có thực sự muốn xóa hoàn toàn Phiếu yêu cầu sản xuất này cùng tất cả hàng hóa liên quan? Hành động này không thể hoàn tác!")) {
      setProductionRequests(prev => prev.filter(pr => pr.id !== prId));
      setProductionRequestItemsMap(prev => {
        const copy = { ...prev };
        delete copy[prId];
        return copy;
      });
      if (selectedPrId === prId) {
        setSelectedPrId(null);
      }
      alert("Đã xóa phiếu yêu cầu sản xuất thành công!");
    }
  };

  // Submit edits
  const handleSubmitEditPr = () => {
    if (editPrItems.length === 0) {
      alert("Phiếu yêu cầu cần có ít nhất 1 dòng mặt hàng sản phẩm!");
      return;
    }
    if (!editPrNo.trim()) {
      alert("Vui lòng điền mã hiệu số phiếu!");
      return;
    }

    setProductionRequests(prev => prev.map(pr => {
      if (pr.id === editingPrId) {
        return {
          ...pr,
          requestNo: editPrNo.trim(),
          targetBranch: editPrBranch,
          contact: editPrContact,
          department: editPrDept
        };
      }
      return pr;
    }));

    setProductionRequestItemsMap(prev => ({
      ...prev,
      [editingPrId!]: editPrItems
    }));

    setShowEditPrModal(false);
    setEditingPrId(null);
    alert("Đã cập nhật Phiếu yêu cầu sản xuất thành công!");
  };

  // Add or update item line in edit modal
  const handleAddLineItemToEditPrForm = () => {
    let pCode = "";
    let pBarcode = "";
    let pName = "";
    let pUnit = "";

    if (isCustomProduct) {
      if (!customProductCode.trim() || !customProductName.trim()) {
        alert("Vui lòng điền mã và tên hàng hóa khai báo mới!");
        return;
      }
      pCode = customProductCode.trim().toUpperCase();
      pBarcode = customProductBarcode.trim() || "8935275000000";
      pName = customProductName.trim();
      pUnit = customProductUnit;

      const isExistPr = productsCatalog.some(p => p.code === pCode);
      if (!isExistPr) {
        setProductsCatalog(prev => [...prev, { code: pCode, name: pName, barcode: pBarcode, unit: pUnit }]);
      }
    } else {
      const match = productsCatalog.find(p => p.code === chosenProductCode);
      if (!match) {
        alert("Vui lòng chọn một mặt hàng từ danh mục hoặc đánh dấu khai báo mới!");
        return;
      }
      pCode = match.code;
      pBarcode = match.barcode;
      pName = match.name;
      pUnit = match.unit;
    }

    let imgUrlPreset: string | undefined = undefined;
    if (itemDrawingPreset === "yoko") imgUrlPreset = drawYokoThauRo;
    else if (itemDrawingPreset === "tokyo") imgUrlPreset = drawKeTokyo;
    else if (itemDrawingPreset === "chau") imgUrlPreset = drawChauTamYoko;
    else if (itemDrawingPreset === "custom") imgUrlPreset = customUploadedImage;

    if (editingLineItemId) {
      // Inline update item inside the edited list
      setEditPrItems(prev => prev.map(item => {
        if (item.id === editingLineItemId) {
          return {
            ...item,
            productCode: pCode,
            barcode: pBarcode,
            productName: pName,
            unit: pUnit,
            quantity: itemQuantity,
            notes: itemNotes.trim(),
            imageUrl: imgUrlPreset,
            imageAnnotations: itemAnnotations.trim()
          };
        }
        return item;
      }));
    } else {
      // Create new line item
      const newItem: ProductionRequestItem = {
        id: `PRI-FORM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productCode: pCode,
        barcode: pBarcode,
        productName: pName,
        unit: pUnit,
        quantity: itemQuantity,
        notes: itemNotes.trim(),
        imageUrl: imgUrlPreset,
        imageAnnotations: itemAnnotations.trim()
      };
      setEditPrItems(prev => [...prev, newItem]);
    }

    handleCancelEditLineItem();
  };

  const removeLineItemFromEditPrForm = (lineId: string) => {
    setEditPrItems(prev => prev.filter(item => item.id !== lineId));
  };

  // SCM: Approve balancing logic
  const handleApproveScmBalancing = (prId: string) => {
    setProductionRequests(prev => prev.map(pr => {
      if (pr.id === prId) {
        return {
          ...pr,
          status: ProductionRequestStatus.BALANCED,
          balanceNotes: scmNotes.trim() || "Đã cân đối hàng hóa từ các sale của phòng ban, các nhà máy liên tục chạy chuyền đảm bảo tiến độ.",
          inventoryChecked: inventoryIsChecked
        };
      }
      return pr;
    }));
    setScmNotes("");
    setInventoryIsChecked(false);
  };

  // SCM: Reject PR request logic
  const handleRejectScmRequest = (prId: string) => {
    const reason = prompt("Lý do từ chối phiếu yêu cầu này:");
    if (reason === null) return;
    setProductionRequests(prev => prev.map(pr => {
      if (pr.id === prId) {
        return {
          ...pr,
          status: ProductionRequestStatus.REJECTED,
          balanceNotes: `Từ chối cấp phép. Lý do: ${reason}`
        };
      }
      return pr;
    }));
  };

  // PMC: Launch wizard to draft Order Implementation request
  const handleOpenOiWizardForPr = (pr: ProductionRequest) => {
    setSelectedPrForOi(pr);
    const firstItemName = productionRequestItemsMap[pr.id]?.[0]?.productName || "Sản phẩm dự án";
    setOiMoldDetail(`Sử dụng và sửa đổi khuôn ${firstItemName}`);
    setOiFormulaDetail("Theo tiêu chuẩn chất lượng Inochi của Tân Phú");
    setOiColorPantone1("Pantone 365C");
    setOiColorName1("Xanh dưỡng");
    setOiPrintDetail("In nổi nhãn khách hàng sắc nét");
    setOiPkgDetail("Đóng gói PE, xếp thùng carton dày dặn");
    setOiPkgMatDetail("Thùng C2 theo maket");
    setOiSampleDetail("Mẫu chuẩn do nhà máy Bắc Ninh cung cấp");
    setOiApprovalDetail("Khách hàng ký mẫu thực tế trực tiếp");
    setOiQcStandardDetail("Không bụi bẩn, không kéo sợi nhựa dính khuôn");
    setOiSafetyStandardDetail("Tiêu chuẩn nhựa an toàn FDA và SGS test");

    setShowCreateOiWizard(true);
  };

  const handleFinishOiWizard = () => {
    if (!selectedPrForOi) return;

    // Handle custom mold declaration if checked
    let finalMoldDesc = oiMoldDetail;
    if (oiMoldOption === "MỚI" && isCustomMold) {
      if (customMoldCode.trim() && customMoldName.trim()) {
        const mCode = customMoldCode.trim().toUpperCase();
        const mName = customMoldName.trim();
        const mDesc = customMoldDesc.trim() || "Khuôn mới ép dự án";
        // save to mold catalog
        const isExistM = moldsCatalog.some(m => m.code === mCode);
        if (!isExistM) {
          setMoldsCatalog(prev => [...prev, { code: mCode, name: mName, description: mDesc }]);
        }
        finalMoldDesc = `Khuôn mới: [${mCode}] ${mName} - ${mDesc}. ${oiMoldDetail}`;
      }
    }

    const newOiId = `OI-${Date.now()}`;
    const prItems = productionRequestItemsMap[selectedPrForOi.id] || [];
    const prodNamesCombined = prItems.map(i => i.productName).join(" & ");

    const newOi: OrderImplementation = {
      id: newOiId,
      requestId: selectedPrForOi.id,
      requestNo: selectedPrForOi.requestNo,
      productName: prodNamesCombined || "Sản phẩm Dự án Tổng hợp",
      customerName: selectedPrForOi.contact || "Khách hàng dự án doanh nghiệp",
      
      moldOption: oiMoldOption,
      moldDetail: finalMoldDesc,
      
      formulaOption: oiFormulaOption,
      formulaDetail: oiFormulaDetail,
      
      colorOption: oiColorOption,
      colorPantone1: oiColorPantone1,
      colorPantone2: oiColorPantone2,
      colorName1: oiColorName1,
      colorName2: oiColorName2,
      
      printOption: oiPrintOption,
      printDetail: oiPrintDetail,
      
      packagingOption: oiPkgOption,
      packagingDetail: oiPkgDetail,
      
      pkgMaterialOption: oiPkgMatOption,
      pkgMaterialDetail: oiPkgMatDetail,
      
      sampleOption: oiSampleOption,
      sampleDetail: oiSampleDetail,
      
      approvalOption: oiApprovalOption,
      approvalDetail: oiApprovalDetail,
      
      qcStandardOption: oiQcStandardOption,
      qcStandardDetail: oiQcStandardDetail,
      
      safetyStandardOption: oiSafetyStandardOption,
      safetyStandardDetail: oiSafetyStandardDetail,
      
      creatorName: `${currentUser.fullName} (PMC SCM)`,
      createdAt: formatDateToShort()
    };

    // Append to list & update parent request link
    setOrderImplementations(prev => [newOi, ...prev]);
    setProductionRequests(prev => prev.map(pr => {
      if (pr.id === selectedPrForOi.id) {
        return {
          ...pr,
          status: ProductionRequestStatus.IMPLEMENTED,
          implementationId: newOiId
        };
      }
      return pr;
    }));

    setShowCreateOiWizard(false);
    setSelectedPrForOi(null);
    setActiveSubTab("OI_LIST");
    setSelectedOiId(newOiId); // select the newly created implementation
  };

  // Find linked request and items
  const activePr = productionRequests.find(pr => pr.id === selectedPrId);
  const activePrItems = activePr ? (productionRequestItemsMap[activePr.id] || []) : [];

  const activeOi = orderImplementations.find(oi => oi.id === selectedOiId);
  const activeOiLinkedPr = activeOi ? productionRequests.find(pr => pr.id === activeOi.requestId) : null;
  const activeOiLinkedItems = activeOiLinkedPr ? (productionRequestItemsMap[activeOiLinkedPr.id] || []) : [];

  return (
    <div className="space-y-6" id="scm-order-pipeline-root">
      {/* Upper Tab Header Info Panel */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm select-none">
        <div>
          <h2 className="text-xl font-black text-slate-850 flex items-center gap-2 tracking-tight">
            <ShoppingCart className="w-5 h-5 text-rose-500" />
            <T>Quy Trình Triển Khai Đơn Hàng Dự Án & Sản Xuất</T>
          </h2>
          <T className="text-xs text-slate-500 mt-1 block leading-relaxed">
            Hợp tác khép kín từ khâu tiếp nhận Sales đặt hàng <b>(BM01 - Yêu cầu sản xuất)</b> đến Khối CPM SCM phân bổ kiểm tra tồn kho và ban hành <b>(BM02 - Triển khai kỹ thuật đơn hàng)</b>.
          </T>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              // Pre-fill default code based on timestamp to avoid duplicate validation errors
              setNewPrNo(`PR-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}${String(new Date().getDate()).padStart(2,"0")}-${String(Math.floor(100 + Math.random() * 900))}`);
              setPrFormItems([]);
              setShowCreatePrModal(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer uppercase"
          >
            <Plus className="w-4 h-4" />
            <T>Lập phiếu BM01 (Sales Đặt hàng)</T>
          </button>
        </div>
      </div>

      {/* Statistics board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl text-center shadow-sm">
          <T className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tổng số phiếu BM01</T>
          <T className="text-2xl font-black text-slate-800 block mt-1">{productionRequests.length}</T>
        </div>
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl text-center shadow-sm">
          <T className="text-[10px] text-amber-500 font-black uppercase tracking-wider block">Chờ SCM Phân bổ (Pending)</T>
          <T className="text-2xl font-black text-amber-600 block mt-1">
            {productionRequests.filter(pr => pr.status === ProductionRequestStatus.PENDING).length}
          </T>
        </div>
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl text-center shadow-sm">
          <T className="text-[10px] text-blue-500 font-black uppercase tracking-wider block">Đã đối soát tồn (PMC Balanced)</T>
          <T className="text-2xl font-black text-blue-600 block mt-1">
            {productionRequests.filter(pr => pr.status === ProductionRequestStatus.BALANCED).length}
          </T>
        </div>
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl text-center shadow-sm">
          <T className="text-[10px] text-emerald-500 font-black uppercase tracking-wider block">Đã Ban hành BM02 (Deployed)</T>
          <T className="text-2xl font-black text-emerald-600 block mt-1">{orderImplementations.length}</T>
        </div>
      </div>

      {/* Sub tabs selector */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl border select-none">
        <button
          onClick={() => setActiveSubTab("PR_LIST")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === "PR_LIST"
              ? "bg-slate-900 text-white shadow-md font-extrabold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <T>📋 DS Yêu Cầu Sản Xuất (BM01-Sales)</T>
        </button>
        <button
          onClick={() => setActiveSubTab("OI_LIST")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === "OI_LIST"
              ? "bg-slate-900 text-white shadow-md font-extrabold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <T>📐 Phiếu Triển Khai Kỹ Thuật (BM02-SCM)</T>
        </button>
        <button
          onClick={() => setActiveSubTab("CATALOG")}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === "CATALOG"
              ? "bg-slate-900 text-white shadow-md font-extrabold"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Package className="w-4 h-4" />
          <T>📦 Kho Danh mục Mã hàng & Khuôn mẫu</T>
        </button>
      </div>

      {/* SUB-TAB 1: PRODUCTION REQUEST LIST & DETAILS (BM01) */}
      {activeSubTab === "PR_LIST" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Requests table listing */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <T className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Phiếu yêu cầu chờ CPM xử lý</T>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] flex-1">
              {productionRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <T className="text-xs">Chưa có phiếu yêu cầu sản xuất nào được khởi tạo.</T>
                </div>
              ) : (
                productionRequests.map(pr => {
                  const itemsCount = productionRequestItemsMap[pr.id]?.length || 0;
                  const isSelected = selectedPrId === pr.id;
                  return (
                    <div
                      key={pr.id}
                      onClick={() => setSelectedPrId(pr.id)}
                      className={`p-4 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 border-l-4 border-blue-600"
                          : "hover:bg-slate-50 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-blue-800 font-mono tracking-tight">{pr.requestNo}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          pr.status === ProductionRequestStatus.PENDING
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : pr.status === ProductionRequestStatus.BALANCED
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : pr.status === ProductionRequestStatus.IMPLEMENTED
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {pr.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-700">
                        <p className="font-semibold">{pr.department} &rarr; {pr.targetBranch}</p>
                        <p className="text-[10px] text-slate-505 mt-1">Người gửi: {pr.uploaderName} ({pr.requestDate})</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100/60 pt-2 font-semibold">
                        <span>Số dòng mặt hàng: {itemsCount} mã sản phẩm</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Request layout rendered exactly like PDF 1 */}
          <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col">
            {activePr ? (
              <div className="space-y-6">
                {/* Action Bar for Active Request (Edit, Delete, PDF Download, etc.) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-700 tracking-tight">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
                    <span>Mã yêu cầu BM01: <span className="font-mono text-blue-700 text-[13px]">{activePr.requestNo}</span></span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleStartEditPr(activePr)}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 hover:border-amber-400 text-amber-900 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-800" />
                      <span>SỬA PHIẾU BM01</span>
                    </button>
                    <button
                      onClick={() => handleDeletePr(activePr.id)}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-350 text-rose-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-800" />
                      <span>XÓA SẠCH BM01</span>
                    </button>
                  </div>
                </div>

                {/* PDF 1 Layout Simulation */}
                <div className="border border-slate-300 rounded-xl p-5 bg-white relative font-sans overflow-x-auto text-slate-800">
                  {/* PDF header block */}
                  <div className="grid grid-cols-12 border-b border-slate-300 pb-3 items-center gap-4">
                    <div className="col-span-3 flex flex-col justify-center items-center border-r border-slate-300 pr-3">
                      <span className="text-blue-700 font-black text-lg tracking-widest uppercase">TANPHU</span>
                      <span className="text-[7px] text-slate-450 tracking-wider">A Member of Tasco</span>
                    </div>

                    <div className="col-span-6 text-center px-2">
                      <h1 className="text-sm font-black tracking-tight text-slate-900uppercase"><T>PHIẾU YÊU CẦU SẢN XUẤT</T></h1>
                      <span className="text-[9px] text-slate-500 font-mono italic block mt-0.5">Ngày {activePr.requestDate}</span>
                    </div>

                    <div className="col-span-3 text-[8px] space-y-1 text-left border-l border-slate-300 pl-3">
                      <p className="font-mono"><b>Mã hiệu:</b> BM01-QT.01/KD</p>
                      <p className="font-mono"><b>Lần ban hành:</b> 1</p>
                      <p className="font-mono"><b>Ngày ban hành:</b> 15/01/2017</p>
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] space-y-1.5 select-text border-b border-slate-200 pb-4">
                    <p><b>Số phiếu:</b> <span className="font-mono font-bold text-blue-700 block md:inline">{activePr.requestNo}</span></p>
                    <p><b>Kính gửi:</b> CÔNG TY TÂN PHÚ VIỆT NAM – <span className="font-bold uppercase">{activePr.targetBranch.replace("Chi Nhánh ", "").replace("Nhà máy ", "")}</span></p>
                    <p><b>Liên hệ phê duyệt:</b> {activePr.contact}</p>
                    <p><b>Phòng ban yêu cầu:</b> {activePr.department}</p>
                    <p className="text-slate-500 italic">P.Kinh doanh yêu cầu sản xuất chủng loại hàng hóa và số lượng cụ thể như sau:</p>
                  </div>

                  {/* Items Table styled exactly like screenshot */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-[11px] border border-slate-300 border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <th className="p-2 border-r border-slate-300 text-center font-bold w-10">TT</th>
                          <th className="p-2 border-r border-slate-300 font-bold">Mã hàng / Barcode</th>
                          <th className="p-2 border-r border-slate-300 font-bold">Tên sản phẩm</th>
                          <th className="p-2 border-r border-slate-300 text-center font-bold w-14">ĐVT</th>
                          <th className="p-2 border-r border-slate-300 text-right font-bold w-20">SL Yêu Cầu</th>
                          <th className="p-2 font-bold w-44">Chỉ dẫn kỹ thuật / Quy cách tem dán</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {activePrItems.map((item, idx) => (
                          <tr key={item.id} className="align-top hover:bg-slate-50/40">
                            <td className="p-2 border-r border-slate-300 text-center font-medium">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-300 font-mono tracking-tight text-[10px]">
                              <p className="font-bold text-slate-900">{item.productCode}</p>
                              <p className="text-slate-450 mt-1">{item.barcode}</p>
                            </td>
                            <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                              {item.productName}
                              {item.imageUrl && (
                                <div className="mt-2.5 border border-slate-200/65 rounded p-1 bg-slate-50 max-w-[150px]">
                                  <img src={item.imageUrl} alt="Preset Diagram" className="w-full rounded" />
                                  {item.imageAnnotations && (
                                    <span className="text-[7px] text-red-650 bg-red-50 py-0.5 px-1 rounded block mt-1 leading-normal font-mono">
                                      {item.imageAnnotations}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-center">{item.unit}</td>
                            <td className="p-2 border-r border-slate-300 text-right font-bold font-mono text-indigo-750">
                              {item.quantity.toLocaleString("vi-VN")}
                            </td>
                            <td className="p-2 text-slate-655 text-[10px] leading-relaxed whitespace-pre-line select-text">
                              {item.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-8 flex justify-between items-center text-[11px] pt-4 border-t border-dashed border-slate-350">
                    <div className="text-center">
                      <p className="text-slate-400">TP.HCM, {activePr.requestDate}</p>
                      <p className="font-bold text-slate-800 mt-0.5">Người lập yêu cầu</p>
                      <div className="h-10" />
                      <p className="font-bold underline text-blue-900">{activePr.uploaderName}</p>
                    </div>
                    <div className="text-center w-48">
                      <p className="text-slate-400 italic">Trưởng phòng phê chuẩn</p>
                      <div className="h-12" />
                      <div className="border-t border-slate-300 w-full pt-1 text-slate-450 text-[9px]">(Ký / Xác nhận số hóa)</div>
                    </div>
                  </div>
                </div>

                {/* SCM PMC action dashboard for Pending/Balanced orders */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-600" />
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Phê duyệt & Điều hành PMC/SCM</h3>
                  </div>

                  {activePr.status === ProductionRequestStatus.PENDING ? (
                    <div className="space-y-3">
                      <T className="text-xs text-slate-600 block">
                        Thay mặt khối <b>Khối quản lý chuỗi cung ứng (TPP-CTY)</b>, hãy nhập ghi chú cân đối tồn kho sản phẩm, đánh giá năng lực sản xuất của chi nhánh trước khi cấp phép hoặc tạo bản vẽ.
                      </T>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ghi chú cân đối hàng hóa (Tồn kho & Máy móc)*</label>
                        <textarea
                          placeholder="Mô tả mức tồn kho thực tế, điều chuyển khuôn ép, cam kết kế hoạch chạy chuyền..."
                          value={scmNotes}
                          onChange={(e) => setScmNotes(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none min-h-[75px]"
                        />
                      </div>
                      <div className="flex items-center gap-2 select-none py-1">
                        <input
                          type="checkbox"
                          id="chk-inv-check"
                          checked={inventoryIsChecked}
                          onChange={(e) => setInventoryIsChecked(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 w-4 h-4 focus:ring-blue-500"
                        />
                        <label htmlFor="chk-inv-check" className="text-xs text-slate-700 font-semibold cursor-pointer">
                          <T>Tôi đã kiểm tra đối chiếu tồn kho thực tế tại kho tổng công ty & chi nhánh chính</T>
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApproveScmBalancing(activePr.id)}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 uppercase cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <T>Duyệt: Xác nhận đã cân đối</T>
                        </button>
                        <button
                          onClick={() => handleRejectScmRequest(activePr.id)}
                          className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 text-rose-500" />
                          <T>Từ chối</T>
                        </button>
                      </div>
                    </div>
                  ) : activePr.status === ProductionRequestStatus.BALANCED ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed space-y-1">
                        <p><b>Trạng thái:</b> Đã hoàn thành cân đối và đối soát tồn kho.</p>
                        <p><b>PMC ghi nhận:</b> {activePr.balanceNotes}</p>
                      </div>
                      <T className="text-xs text-slate-600 block font-semibold">
                        Phiếu đã sẵn sàng để ban hành chi tiết yêu cầu triển khai kỹ thuật khuôn, bao bì và quy trình đóng gói.
                      </T>
                      <button
                        onClick={() => handleOpenOiWizardForPr(activePr)}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Sliders className="w-4.5 h-4.5 text-white" />
                        <T>📐 Lập Phiếu BM02: Triển Khai Kỹ Thuật Đơn Hàng dự án</T>
                      </button>
                    </div>
                  ) : activePr.status === ProductionRequestStatus.IMPLEMENTED ? (
                    <div className="space-y-2">
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1 select-text">
                        <p><b>Trạng thái:</b> Đã ban hành phiếu triển khai đơn hàng dự án (BM02)!</p>
                        <p><b>SCM PMC Ghi nhận:</b> {activePr.balanceNotes}</p>
                      </div>
                      {activePr.implementationId && (
                        <button
                          onClick={() => {
                            setActiveSubTab("OI_LIST");
                            setSelectedOiId(activePr.implementationId!);
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer mt-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <T>XEM PHIẾU BM02 ĐÃ LẬP</T>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 select-text">
                      <p className="font-bold">Đã từ chối phiếu yêu cầu sản xuất này.</p>
                      <p className="mt-1">{activePr.balanceNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <T className="text-xs">Vui lòng chọn một phiếu yêu cầu sản xuất ở cột bên trái để xem nội dung.</T>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ORDER IMPLEMENTATION PROJECT DEPLOYMENT (BM02) */}
      {activeSubTab === "OI_LIST" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Implementations table list */}
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <T className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Phiếu BM02 đã ban hành</T>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] flex-1">
              {orderImplementations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <T className="text-xs">Chưa có phiếu triển khai kỹ thuật BM02 nào được lập.</T>
                </div>
              ) : (
                orderImplementations.map(oi => {
                  const isSelected = selectedOiId === oi.id;
                  return (
                    <div
                      key={oi.id}
                      onClick={() => setSelectedOiId(oi.id)}
                      className={`p-4 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-rose-50/70 border-l-4 border-rose-600"
                          : "hover:bg-slate-50 border-l-4 border-transparent"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tight block">Mã BM02: {oi.id}</span>
                      <p className="text-xs font-black text-rose-800 mt-1 font-mono">{oi.requestNo}</p>
                      <div className="mt-2 text-xs text-slate-800 font-semibold leading-snug">
                        {oi.productName}
                      </div>
                      <div className="mt-1.5 flex justify-between items-center text-[10px] text-slate-500">
                        <span>KH: {oi.customerName}</span>
                        <span>{oi.createdAt}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SCM BM02 PDF Document Template Side */}
          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col">
            {activeOi ? (
              <div className="space-y-6">
                <div className="border-2 border-slate-400 bg-white p-6 rounded-xl font-sans tracking-tight text-slate-800 leading-normal select-text">
                  {/* PDF header details */}
                  <div className="flex justify-between items-center border-b-2 border-slate-400 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center text-white font-extrabold text-sm tracking-widest">
                        TÂNPHÚ
                      </div>
                      <div>
                        <span className="text-xs font-black block tracking-tight text-slate-900">TÂN PHÚ VIỆT NAM</span>
                        <span className="text-[8px] text-slate-400 block tracking-wider uppercase font-mono">2.QT46.KDDA-F01 Phiên bản 01</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <h1 className="text-xs md:text-sm font-black tracking-tight text-slate-900 uppercase">PHIẾU YÊU CẦU TRIỂN KHAI ĐƠN HÀNG KÊNH DỰ ÁN</h1>
                      <span className="text-[9px] text-slate-450 block font-mono italic">Mã liên kết BM01: {activeOi.requestNo}</span>
                    </div>
                  </div>

                  {/* Body Content exact structured sections as 2.QT46.KDDA-F01 */}
                  <div className="mt-5 space-y-5 text-xs">
                    {/* Part 1: General Info */}
                    <div className="border border-slate-350 p-3 rounded-lg bg-slate-50/50 space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        1. Thông Tin Chung
                      </h4>
                      <p><b>Tên sản phẩm triển khai Kênh dự án:</b> <span className="font-bold underline text-slate-850">{activeOi.productName}</span></p>
                      <p><b>Tên đối tác / khách hàng doanh nghiệp:</b> <span className="font-bold underline text-indigo-750">{activeOi.customerName}</span></p>
                    </div>

                    {/* Part 2: Technical specifications */}
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wide border-b border-slate-205 pb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        2. Yêu Cầu Kỹ Thuật Chi Tiết
                      </h4>

                      {/* 2.1 Product specification */}
                      <div className="border border-slate-300 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-2 border-b border-slate-300 text-[10px] font-extrabold text-slate-700 uppercase">
                          2.1 Sản phẩm
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="p-3 font-bold bg-slate-50/40 w-1/4 border-r border-slate-200">Khuôn sản phẩm</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase text-[9px] mr-2">
                                  {activeOi.moldOption}
                                </span>
                                <span className="select-text">{activeOi.moldDetail}</span>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-3 font-bold bg-slate-50/40 border-r border-slate-200">Công thức nhựa</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-800 border border-purple-200 uppercase text-[9px] mr-2">
                                  {activeOi.formulaOption}
                                </span>
                                <span className="select-text">{activeOi.formulaDetail}</span>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-3 font-bold bg-slate-50/40 border-r border-slate-200">Màu sản phẩm</td>
                              <td className="p-3 space-y-1 select-text">
                                <p><b>Dạng phối màu:</b> {activeOi.colorOption === "MÀU_MỚI" ? "Khai báo tông màu mới theo Pantone" : "Sử dụng màu Inochi tiêu chuẩn"}</p>
                                <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[10px]">
                                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                                    <span className="block font-bold">Pantone Màu 1:</span>
                                    <span>{activeOi.colorPantone1 || "Trống"} ({activeOi.colorName1 || "Trống"})</span>
                                  </div>
                                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                                    <span className="block font-bold">Pantone Màu 2:</span>
                                    <span>{activeOi.colorPantone2 || "N/A"} ({activeOi.colorName2 || "N/A"})</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold bg-slate-50/40 border-r border-slate-200">In ấn trên sản phẩm</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase text-[9px] mr-2">
                                  {activeOi.printOption}
                                </span>
                                <span className="select-text">{activeOi.printDetail}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 2.2 Packaging specification */}
                      <div className="border border-slate-300 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-2 border-b border-slate-300 text-[10px] font-extrabold text-slate-700 uppercase">
                          2.2 Bao bì
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="p-3 font-bold bg-slate-50/40 w-1/4 border-r border-slate-200">Quy cách đóng gói</td>
                              <td className="p-3 select-text">
                                <p className="font-bold">{activeOi.packagingOption === "MỚI" ? "Dùng quy quy chuẩn đóng gói mới" : "Như hàng Inochi chuẩn"}</p>
                                <p className="text-slate-505 mt-1">{activeOi.packagingDetail}</p>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-3 font-bold bg-slate-50/40 border-r border-slate-200">Chất liệu bao bì</td>
                              <td className="p-3 select-text">
                                <p className="font-bold">{activeOi.pkgMaterialOption === "MỚI" ? "Sử dụng tem nhãn mác, thùng hộp Carton maket mới" : "Bao bì Inochi tiêu chuẩn"}</p>
                                <p className="text-slate-505 mt-1">{activeOi.pkgMaterialDetail}</p>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="p-3 font-bold bg-slate-50/40 border-r border-slate-200">Làm mẫu bao bì</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800 border border-slate-300 uppercase text-[9px] mr-2">
                                  {activeOi.sampleOption}
                                </span>
                                <span className="select-text">{activeOi.sampleDetail}</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-bold bg-slate-50/40 border-r border-slate-200">Hình thức duyệt bao bì</td>
                              <td className="p-3 select-text">
                                <p className="font-bold uppercase text-indigo-700 text-[10px]">{activeOi.approvalOption.replace(/_/g," ")}</p>
                                <p className="text-slate-505 mt-1">{activeOi.approvalDetail}</p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Part 3: Quality Standard */}
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wide border-b border-slate-205 pb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        3. Tiêu Chuẩn Chất Lượng Đơn Hàng Dự Án
                      </h4>
                      <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <td className="p-3 font-bold bg-slate-50/40 w-1/3 border-r border-slate-200">Tiêu chuẩn Ngoại Quan & Kỹ thuật</td>
                            <td className="p-3 select-text">
                              <span className="font-bold block text-[10px] text-teal-800">{activeOi.qcStandardOption.replace(/_/g," ")}</span>
                              <p className="mt-1">{activeOi.qcStandardDetail}</p>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold bg-slate-50/40 border-r border-slate-200">Tiêu chuẩn An Toàn sản phẩm</td>
                            <td className="p-3 select-text">
                              <span className="font-bold block text-[10px] text-indigo-800">{activeOi.safetyStandardOption.replace(/_/g," ")}</span>
                              <p className="mt-1">{activeOi.safetyStandardDetail}</p>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signatures block */}
                  <div className="mt-8 grid grid-cols-3 text-center text-[10px] border-t border-slate-300 pt-5 gap-4">
                    <div>
                      <p className="font-black text-slate-750">Người lập phiếu BM02</p>
                      <div className="h-12" />
                      <p className="font-bold underline text-slate-850">{activeOi.creatorName.split(" ")[0]} ...</p>
                    </div>
                    <div>
                      <p className="font-black text-slate-750">Khối Chuỗi cung ứng SCM</p>
                      <div className="h-12" />
                      <p className="text-slate-400 italic">(Đã ký số duyệt)</p>
                    </div>
                    <div>
                      <p className="font-black text-slate-755">Khối Sản xuất / Chất lượng</p>
                      <div className="h-12" />
                      <p className="text-slate-400 italic">(Đã phân lưu nhiệm vụ)</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      alert("Đang xuất lệnh in ấn kỹ thuật sang nhà máy Bắc Ninh / Long An qua hệ thống đồng bộ.");
                    }}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <T>Xuất bản in / Lưu PDF nghiệp vụ</T>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <T className="text-xs">Chưa có bản ghi phiếu triển khai kĩ thuật nào được lựa chọn.</T>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: THE CATALOG MANAGMENT FOR PRODUCTS AND MOLDS */}
      {activeSubTab === "CATALOG" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-text">
          {/* Products lookup catalog */}
          <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col space-y-4 shadow-sm">
            <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase">
                <ShoppingCart className="w-4 h-4 text-emerald-500" />
                <T>Danh mục Mã hàng hóa & Barcode</T>
              </h3>
              <span className="text-[10px] b-grey shadow-inner p-1.5 rounded font-mono font-bold text-slate-500">
                Lượng quy chuẩn: {productsCatalog.length} mã
              </span>
            </div>

            {/* Quick Add Product Form */}
            <form onSubmit={handleAddProductToCatalog} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Khai báo mã hàng hóa mới</span>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Mã sản phẩm*</label>
                  <input
                    type="text"
                    required
                    placeholder="HIN.TRCQ.0027..."
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Barcode*</label>
                  <input
                    type="text"
                    required
                    placeholder="8935275..."
                    value={catBarcode}
                    onChange={(e) => setCatBarcode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3.5">
                <div className="col-span-2">
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Tên sản phẩm*</label>
                  <input
                    type="text"
                    required
                    placeholder="Bộ thau rổ có quai xách..."
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">ĐVT*</label>
                  <select
                    value={catUnit}
                    onChange={(e) => setCatUnit(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="Bộ">Bộ</option>
                    <option value="Cái">Cái</option>
                    <option value="Túi">Túi</option>
                    <option value="Cuộn">Cuộn</option>
                    <option value="Chiếc">Chiếc</option>
                  </select>
                </div>
              </div>

              {catSuccess && (
                <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-250 font-bold">
                  {catSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <T>Lưu mã hàng hóa vào danh mục</T>
              </button>
            </form>

            <div className="overflow-y-auto max-h-[300px] border border-slate-250 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 border-r border-slate-200 font-black">Mã sản phẩm</th>
                    <th className="p-3 border-r border-slate-200 font-black">Barcode</th>
                    <th className="p-3 font-black">Tên sản phẩm</th>
                    <th className="p-3 font-black text-center">ĐVT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {productsCatalog.map(p => (
                    <tr key={p.code} className="hover:bg-slate-50/50">
                      <td className="p-3 border-r border-slate-200 font-mono text-[10px] font-bold text-slate-900">{p.code}</td>
                      <td className="p-3 border-r border-slate-200 font-mono text-[10px] text-slate-500">{p.barcode}</td>
                      <td className="p-3 font-bold text-slate-840">{p.name}</td>
                      <td className="p-3 text-center">{p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Molds Lookup catalog */}
          <div className="bg-white p-5 border border-slate-200 rounded-2xl flex flex-col space-y-4 shadow-sm">
            <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <T>Danh mục các Khuôn mẫu kỹ thuật</T>
              </h3>
              <span className="text-[10px] b-grey shadow-inner p-1.5 rounded font-mono font-bold text-slate-500">
                Sở hữu: {moldsCatalog.length} mẫu khuôn
              </span>
            </div>

            {/* Quick Add Mold Form */}
            <form onSubmit={handleAddMoldToCatalog} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Đăng ký khuôn mẫu mới</span>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Mã khuôn kỹ thuật*</label>
                  <input
                    type="text"
                    required
                    placeholder="MOLD-YOKO-..."
                    value={moldCode}
                    onChange={(e) => setMoldCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Tên khuôn mẫu sản phẩm*</label>
                  <input
                    type="text"
                    required
                    placeholder="Khuôn ráp cốt..."
                    value={moldName}
                    onChange={(e) => setMoldName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Mô tả cấu trúc khuôn*</label>
                <input
                  type="text"
                  required
                  placeholder="Ép nguyên sinh, 2 cốt lồng rãnh đẩy..."
                  value={moldDesc}
                  onChange={(e) => setMoldDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>

              {moldSuccess && (
                <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-250 font-bold">
                  {moldSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <T>Lưu khuôn mẫu vào hệ thống</T>
              </button>
            </form>

            <div className="overflow-y-auto max-h-[300px] border border-slate-250 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 border-r border-slate-200 font-black">Mã khuôn</th>
                    <th className="p-3 border-r border-slate-200 font-black">Tên khuôn mẫu</th>
                    <th className="p-3 font-black">Mô tả đặc tính kỹ thuật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {moldsCatalog.map(m => (
                    <tr key={m.code} className="hover:bg-slate-50/50">
                      <td className="p-3 border-r border-slate-200 font-mono text-[10px] font-bold text-slate-900">{m.code}</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-840">{m.name}</td>
                      <td className="p-3 text-slate-600 font-semibold">{m.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD OVERLAY MODAL 1b: EDIT PRODUCTION REQUEST (BM01 EDIT FORM) */}
      {showEditPrModal && (
        <div className="fixed inset-0 bg-[#0F172A]/85 z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-sans">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col my-auto max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Pencil className="w-4.5 h-4.5 text-amber-400" />
                  <T>Cập nhật Phiếu yêu cầu sản xuất - BM01</T>
                </h3>
                <T className="text-[10px] text-slate-400 block mt-0.5">Sửa cấu trúc thông tin kính gửi, liên hệ, kênh bán lẻ hoặc dòng sản phẩm đã lập trong phiếu.</T>
              </div>
              <button
                onClick={() => {
                  setShowEditPrModal(false);
                  setEditingPrId(null);
                }}
                className="text-slate-450 hover:text-white font-bold p-1 rounded hover:bg-slate-800 text-xs tracking-wider cursor-pointer"
              >
                [ THOÁT ]
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
              {/* Form Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Mã hiệu phiếu*</label>
                  <input
                    type="text"
                    required
                    value={editPrNo}
                    onChange={(e) => setEditPrNo(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Kính gửi (Chi nhánh)*</label>
                  <select
                    value={editPrBranch}
                    onChange={(e) => setEditPrBranch(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Người nhận liên hệ*</label>
                  <input
                    type="text"
                    required
                    value={editPrContact}
                    onChange={(e) => setEditPrContact(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Kênh của Sale yêu cầu*</label>
                  <select
                    value={editPrDept}
                    onChange={(e) => setEditPrDept(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="Kênh Dự án (TPP-CTY)">Kênh Dự án (TPP-CTY)</option>
                    <option value="Kênh Bán lẻ (TPP-CTY)">Kênh Bán lẻ (TPP-CTY)</option>
                    <option value="Kênh GT (TPP-CTY)">Kênh GT (TPP-CTY)</option>
                    <option value="Phòng kinh doanh công nghiệp (TPP-CTY)">Phòng KD Công nghiệp</option>
                  </select>
                </div>
              </div>

              {/* Sub-block to add individual item lines */}
              <div className="border border-indigo-250 p-5 rounded-2xl bg-indigo-50/20 space-y-4">
                <span className="block text-xs font-black text-indigo-900 uppercase tracking-wide">
                  ➕ Thêm sản phẩm muốn đặt sản xuất vào phiếu sửa
                </span>

                <div className="flex items-center gap-4 select-none">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="edit-prod-mode"
                      checked={!isCustomProduct}
                      onChange={() => setIsCustomProduct(false)}
                      className="text-indigo-650 w-4 h-4"
                    />
                    <span>Chọn mã hàng hóa chuẩn có sẵn</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="edit-prod-mode"
                      checked={isCustomProduct}
                      onChange={() => setIsCustomProduct(true)}
                      className="text-indigo-650 w-4 h-4"
                    />
                    <span className="text-indigo-700">Khai báo mã hàng/barcode MỚI &rarr;</span>
                  </label>
                </div>

                {!isCustomProduct ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Chọn từ danh mục*</label>
                      <select
                        value={chosenProductCode}
                        onChange={(e) => setChosenProductCode(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none font-bold"
                      >
                        <option value="">-- Vui lòng chọn --</option>
                        {productsCatalog.map(p => (
                          <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Số lượng đặt sản xuất*</label>
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Number(e.target.value))}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-white p-4 rounded-xl border border-indigo-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Mã sản phẩm mới*</label>
                        <input
                          type="text"
                          placeholder="HIN.TRCQ.0028HHC"
                          value={customProductCode}
                          onChange={(e) => setCustomProductCode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Mã vạch Barcode mới*</label>
                        <input
                          type="text"
                          placeholder="8935275..."
                          value={customProductBarcode}
                          onChange={(e) => setCustomProductBarcode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Đơn vị tính*</label>
                        <select
                          value={customProductUnit}
                          onChange={(e) => setCustomProductUnit(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="Bộ">Bộ</option>
                          <option value="Cái">Cái</option>
                          <option value="Túi">Túi</option>
                          <option value="Chiếc">Chiếc</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Tên sản phẩm mới*</label>
                        <input
                          type="text"
                          placeholder="Bộ thau rổ có quai xách màu hổ phách..."
                          value={customProductName}
                          onChange={(e) => setCustomProductName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Số lượng đặt sản xuất*</label>
                        <input
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Chỉ dẫn kỹ thuật của đối tác (Tem nhãn / Decal dán quai / Decal dán ngoài)*</label>
                    <textarea
                      placeholder="Không dùng đai quấn. Decal nổi dán chính giữa thau... Quy cách như hàng Inochi..."
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs min-h-[60px] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        <T>Sơ đồ minh họa kỹ thuật đính kèm</T>
                      </label>
                      <select
                        value={itemDrawingPreset}
                        onChange={(e) => setItemDrawingPreset(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="none">[ Không đính kèm ảnh vẽ ]</option>
                        <option value="yoko">Sơ đồ dán Decal thau rổ Yoko (Mẫu chuẩn)</option>
                        <option value="tokyo">Sơ đồ dán Decal Kệ Tokyo 3 tầng (Mẫu chuẩn)</option>
                        <option value="chau">Sơ đồ in lụa chậu tắm bé Yoko 30L (Mẫu chuẩn)</option>
                        <option value="custom">📁 Tải lên sơ đồ / ảnh vẽ kỹ thuật mới...</option>
                      </select>
                    </div>

                    {itemDrawingPreset === "custom" && (
                      <div className="bg-amber-50/50 border border-dashed border-amber-300 rounded-lg p-2.5 mt-1">
                        <label className="block text-[9px] text-amber-800 font-bold uppercase mb-1 animate-pulse">
                          <T>Chọn tệp ảnh từ điện thoại/máy tính:*</T>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          id="pr-drawing-custom-file-upload"
                          className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                        />
                        {customUploadedImage && (
                          <div className="mt-2 flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded">
                            <img src={customUploadedImage} alt="Preview thumbnail" className="h-10 w-10 object-contain rounded bg-slate-50 border border-slate-200" />
                            <div className="text-[9px] text-slate-500 truncate max-w-[200px]">
                              <span className="font-bold text-emerald-600 block">
                                <T>✓ Đã lưu ảnh tự chọn</T>
                              </span>
                              <T>Sẵn sàng đính kèm</T>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {itemDrawingPreset !== "none" && (
                      <div>
                        <label className="block text-[10px] text-red-650 font-bold uppercase mb-1">
                          <T>Nhãn ghim ghi chú trên ảnh vẽ (Annotations)</T>
                        </label>
                        <input
                          type="text"
                          placeholder="Khoảng cách 4cm;Decal 70x20.8mm;..."
                          value={itemAnnotations}
                          onChange={(e) => setItemAnnotations(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs text-red-750 font-bold focus:outline-none focus:border-red-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {editingLineItemId && (
                  <div className="flex justify-between items-center bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs">
                    <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping inline-block" />
                      ⚡ ĐANG CHỈNH SỬA DÒNG SẢN PHẨM SỐ {editPrItems.findIndex(x => x.id === editingLineItemId) + 1}: <span className="font-mono text-indigo-900 bg-white px-2 py-0.5 rounded border border-amber-300">{editPrItems.find(x => x.id === editingLineItemId)?.productCode}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelEditLineItem}
                      className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black rounded-lg uppercase cursor-pointer"
                    >
                      Hủy Sửa Dòng
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddLineItemToEditPrForm}
                    className={`w-full py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                      editingLineItemId 
                        ? "bg-amber-600 hover:bg-amber-750 shadow-md ring-2 ring-amber-400" 
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {editingLineItemId ? (
                      <T>💾 XÁC NHẬN CẬP NHẬT DÒNG SẢN PHẨM NÀY</T>
                    ) : (
                      <T>+ ĐỒNG Ý THÊM DÒNG SẢN PHẨM NÀY VÀO PHIẾU ĐANG SỬA</T>
                    )}
                  </button>
                  {editingLineItemId && (
                    <button
                      type="button"
                      onClick={handleCancelEditLineItem}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      HỦY
                    </button>
                  )}
                </div>
              </div>

              {/* Realtime Live List in Edit Form */}
              <div className="space-y-2">
                <span className="block text-xs font-black text-slate-800 uppercase tracking-widest">
                  Danh sách sản phẩm trong phiếu đang sửa: {editPrItems.length} dòng
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs bg-white">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-bold w-12 text-center">STT</th>
                        <th className="p-3 font-bold">Mã sản phẩm / Barcode</th>
                        <th className="p-3 font-bold text-right w-24">Số lượng</th>
                        <th className="p-3 font-bold">Yêu cầu / Bản vẽ thiết kế</th>
                        <th className="p-3 text-center w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editPrItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic">Vui lòng thêm sản phẩm ở trên!</td>
                        </tr>
                      ) : (
                        editPrItems.map((item, idx) => (
                          <tr key={item.id} className={`align-top transition-colors ${editingLineItemId === item.id ? "bg-amber-50/40" : ""}`}>
                            <td className="p-3 text-center font-bold">{idx + 1}</td>
                            <td className="p-3 font-mono">
                              <p className="font-extrabold text-indigo-900">{item.productCode}</p>
                              <p className="text-slate-400 text-[10px]">{item.barcode}</p>
                            </td>
                            <td className="p-3 text-right font-bold tracking-tight text-slate-850">
                              {item.quantity.toLocaleString("vi-VN")} {item.unit}
                            </td>
                            <td className="p-3 space-y-2">
                              <p className="font-bold text-slate-800">{item.productName}</p>
                              <p className="text-[11px] text-slate-505 italic">{item.notes}</p>
                              {item.imageUrl && (
                                <div className="border border-slate-200 rounded p-1 bg-slate-50 max-w-[120px] flex flex-col">
                                  <img src={item.imageUrl} alt="Draw" className="w-full" />
                                  <span className="text-[7.5px] text-red-650 block mt-1 leading-tight">{item.imageAnnotations}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 matches-box">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditLineItem(item)}
                                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-1.5 rounded-lg transition-all cursor-pointer"
                                  title="Chỉnh sửa dòng sản phẩm này"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLineItemFromEditPrForm(item.id)}
                                  className="text-rose-550 hover:text-rose-700 hover:bg-rose-100 p-1.5 rounded-lg transition-all cursor-pointer"
                                  title="Xóa dòng này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowEditPrModal(false);
                  setEditingPrId(null);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer uppercase"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitEditPr}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md cursor-pointer uppercase flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <T>LƯU CẬP NHẬT PHIẾU BM01 &rarr;</T>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD OVERLAY MODAL 1: CREATE NEW PRODUCTION REQUEST (BM01 FORM FOR SALES) */}
      {showCreatePrModal && (
        <div className="fixed inset-0 bg-[#0F172A]/85 z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-sans">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col my-auto max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="w-4.5 h-4.5 text-emerald-400" />
                  <T>Thiết lập Phiếu yêu cầu sản xuất mới - BM01</T>
                </h3>
                <T className="text-[10px] text-slate-400 block mt-0.5">Khởi tạo nhanh danh sách cần chạy chuyền để gửi sang CPM SCM đối soát tồn kho.</T>
              </div>
              <button
                onClick={() => setShowCreatePrModal(false)}
                className="text-slate-450 hover:text-white font-bold p-1 rounded hover:bg-slate-800 text-xs tracking-wider cursor-pointer"
              >
                [ ĐÓNG ]
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
              {/* Form Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Mã hiệu phiếu*</label>
                  <input
                    type="text"
                    required
                    value={newPrNo}
                    onChange={(e) => setNewPrNo(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Kính gửi (Chi nhánh)*</label>
                  <select
                    value={newPrBranch}
                    onChange={(e) => setNewPrBranch(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Người nhận liên hệ*</label>
                  <input
                    type="text"
                    required
                    placeholder="Lương Xuân Cường..."
                    value={newPrContact}
                    onChange={(e) => setNewPrContact(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Kênh của Sale yêu cầu*</label>
                  <select
                    value={newPrDept}
                    onChange={(e) => setNewPrDept(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="Kênh Dự án (TPP-CTY)">Kênh Dự án (TPP-CTY)</option>
                    <option value="Kênh Bán lẻ (TPP-CTY)">Kênh Bán lẻ (TPP-CTY)</option>
                    <option value="Kênh GT (TPP-CTY)">Kênh GT (TPP-CTY)</option>
                    <option value="Phòng kinh doanh công nghiệp (TPP-CTY)">Phòng KD Công nghiệp</option>
                  </select>
                </div>
              </div>

              {/* Sub-block to add individual item lines */}
              <div className="border border-indigo-250 p-5 rounded-2xl bg-indigo-50/20 space-y-4">
                <span className="block text-xs font-black text-indigo-900 uppercase tracking-wide">
                  ➕ Thêm sản phẩm muốn đặt sản xuất
                </span>

                <div className="flex items-center gap-4 select-none">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="prod-mode"
                      checked={!isCustomProduct}
                      onChange={() => setIsCustomProduct(false)}
                      className="text-indigo-650 w-4 h-4"
                    />
                    <span>Chọn mã hàng hóa chuẩn có sẵn</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="prod-mode"
                      checked={isCustomProduct}
                      onChange={() => setIsCustomProduct(true)}
                      className="text-indigo-650 w-4 h-4"
                    />
                    <span className="text-indigo-700">Khai báo mã hàng/barcode MỚI &rarr;</span>
                  </label>
                </div>

                {!isCustomProduct ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Chọn từ danh mục*</label>
                      <select
                        value={chosenProductCode}
                        onChange={(e) => setChosenProductCode(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none font-bold"
                      >
                        <option value="">-- Vui lòng chọn --</option>
                        {productsCatalog.map(p => (
                          <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Số lượng đặt sản xuất*</label>
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Number(e.target.value))}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-white p-4 rounded-xl border border-indigo-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Mã sản phẩm mới*</label>
                        <input
                          type="text"
                          placeholder="HIN.TRCQ.0028HHC"
                          value={customProductCode}
                          onChange={(e) => setCustomProductCode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Mã vạch Barcode mới*</label>
                        <input
                          type="text"
                          placeholder="8935275..."
                          value={customProductBarcode}
                          onChange={(e) => setCustomProductBarcode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Đơn vị tính*</label>
                        <select
                          value={customProductUnit}
                          onChange={(e) => setCustomProductUnit(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="Bộ">Bộ</option>
                          <option value="Cái">Cái</option>
                          <option value="Túi">Túi</option>
                          <option value="Chiếc">Chiếc</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-indigo-700 font-bold uppercase mb-1">Tên sản phẩm mới*</label>
                        <input
                          type="text"
                          placeholder="Bộ thau rổ có quai xách màu hổ phách..."
                          value={customProductName}
                          onChange={(e) => setCustomProductName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Số lượng đặt sản xuất*</label>
                        <input
                          type="number"
                          min="1"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold focus:outline-none text-right"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Chỉ dẫn kỹ thuật của đối tác (Tem nhãn / Decal dán quai / Decal dán ngoài)*</label>
                    <textarea
                      placeholder="Không dùng đai quấn. Decal nổi dán chính giữa thau... Quy cách như hàng Inochi..."
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs min-h-[60px] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">
                        <T>Sơ đồ minh họa kỹ thuật đính kèm</T>
                      </label>
                      <select
                        value={itemDrawingPreset}
                        onChange={(e) => setItemDrawingPreset(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="none">[ Không đính kèm ảnh vẽ ]</option>
                        <option value="yoko">Sơ đồ dán Decal thau rổ Yoko (Mẫu chuẩn)</option>
                        <option value="tokyo">Sơ đồ dán Decal Kệ Tokyo 3 tầng (Mẫu chuẩn)</option>
                        <option value="chau">Sơ đồ in lụa chậu tắm bé Yoko 30L (Mẫu chuẩn)</option>
                        <option value="custom">📁 Tải lên sơ đồ / ảnh vẽ kỹ thuật mới...</option>
                      </select>
                    </div>

                    {itemDrawingPreset === "custom" && (
                      <div className="bg-amber-50/50 border border-dashed border-amber-300 rounded-lg p-2.5 mt-1">
                        <label className="block text-[9px] text-amber-800 font-bold uppercase mb-1 animate-pulse">
                          <T>Chọn tệp ảnh từ điện thoại/máy tính:*</T>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          id="pr-drawing-custom-file-upload-create"
                          className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                        />
                        {customUploadedImage && (
                          <div className="mt-2 flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded">
                            <img src={customUploadedImage} alt="Preview thumbnail" className="h-10 w-10 object-contain rounded bg-slate-50 border border-slate-200" />
                            <div className="text-[9px] text-slate-500 truncate max-w-[200px]">
                              <span className="font-bold text-emerald-600 block">
                                <T>✓ Đã lưu ảnh tự chọn</T>
                              </span>
                              <T>Sẵn sàng đính kèm</T>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {itemDrawingPreset !== "none" && (
                      <div>
                        <label className="block text-[10px] text-red-650 font-bold uppercase mb-1">
                          <T>Nhãn ghim ghi chú trên ảnh vẽ (Annotations)</T>
                        </label>
                        <input
                          type="text"
                          placeholder="Khoảng cách 4cm;Decal 70x20.8mm;..."
                          value={itemAnnotations}
                          onChange={(e) => setItemAnnotations(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg p-2 text-xs text-red-750 font-bold focus:outline-none focus:border-red-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {editingLineItemId && (
                  <div className="flex justify-between items-center bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs">
                    <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping inline-block" />
                      ⚡ ĐANG CHỈNH SỬA DÒNG SẢN PHẨM SỐ {prFormItems.findIndex(x => x.id === editingLineItemId) + 1}: <span className="font-mono text-indigo-900 bg-white px-2 py-0.5 rounded border border-amber-300">{prFormItems.find(x => x.id === editingLineItemId)?.productCode}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelEditLineItem}
                      className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-black rounded-lg uppercase cursor-pointer"
                    >
                      Hủy Sửa Dòng
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddLineItemToPrForm}
                    className={`w-full py-2 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                      editingLineItemId 
                        ? "bg-amber-600 hover:bg-amber-750 shadow-md ring-2 ring-amber-400" 
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {editingLineItemId ? (
                      <T>💾 XÁC NHẬN CẬP NHẬT DÒNG SẢN PHẨM NÀY</T>
                    ) : (
                      <T>+ ĐỒNG Ý THÊM DÒNG SẢN PHẨM NÀY VÀO PHIẾU YÊU CẦU SẢN XUẤT</T>
                    )}
                  </button>
                  {editingLineItemId && (
                    <button
                      type="button"
                      onClick={handleCancelEditLineItem}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      HỦY
                    </button>
                  )}
                </div>
              </div>

              {/* Realtime Live List in Form */}
              <div className="space-y-2">
                <span className="block text-xs font-black text-slate-800 uppercase tracking-widest font-sans">
                  Danh sách sản phẩm trong phiếu yêu cầu: {prFormItems.length} dòng
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs bg-white">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-bold w-12 text-center">STT</th>
                        <th className="p-3 font-bold">Mã sản phẩm / Barcode</th>
                        <th className="p-3 font-bold text-right w-24">Số lượng</th>
                        <th className="p-3 font-bold">Yêu cầu / Bản vẽ thiết kế</th>
                        <th className="p-3 text-center w-24">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prFormItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 italic">Vui lòng thêm sản phẩm ở trên!</td>
                        </tr>
                      ) : (
                        prFormItems.map((item, idx) => (
                          <tr key={item.id} className={`align-top transition-colors ${editingLineItemId === item.id ? "bg-amber-50/40" : ""}`}>
                            <td className="p-3 text-center font-bold">{idx + 1}</td>
                            <td className="p-3 font-mono">
                              <p className="font-extrabold text-indigo-900">{item.productCode}</p>
                              <p className="text-slate-400 text-[10px]">{item.barcode}</p>
                            </td>
                            <td className="p-3 text-right font-bold tracking-tight text-slate-850">
                              {item.quantity.toLocaleString("vi-VN")} {item.unit}
                            </td>
                            <td className="p-3 space-y-2">
                              <p className="font-bold text-slate-800">{item.productName}</p>
                              <p className="text-[11px] text-slate-505 italic">{item.notes}</p>
                              {item.imageUrl && (
                                <div className="border border-slate-200 rounded p-1 bg-slate-50 max-w-[120px] flex flex-col">
                                  <img src={item.imageUrl} alt="Draw" className="w-full" />
                                  <span className="text-[7.5px] text-red-600 block mt-1 leading-tight">{item.imageAnnotations}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 matches-box">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditLineItem(item)}
                                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-1.5 rounded-lg transition-all cursor-pointer"
                                  title="Chỉnh sửa dòng sản phẩm này"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItemLineFromPrForm(item.id)}
                                  className="text-rose-555 hover:text-rose-700 hover:bg-rose-100 p-1.5 rounded-lg transition-all cursor-pointer"
                                  title="Xóa dòng này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-between gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreatePrModal(false)}
                className="px-4 py-3 border border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <T>Quay lại</T>
              </button>
              <button
                type="button"
                onClick={handleSubmitPr}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                <T>Gửi phê duyệt Phiếu yêu cầu BM01 &rarr;</T>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIZARD OVERLAY MODAL 2: PMC/SCM HIGH FIDELITY ORDERS DEPLOYMENT CREATOR (BM02 FORM WIZARD) */}
      {showCreateOiWizard && selectedPrForOi && (
        <div className="fixed inset-0 bg-[#0F172A]/85 z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center font-sans select-text">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col my-auto max-h-[90vh]">
            <div className="bg-rose-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4.5 h-4.5 text-rose-405" />
                  <T>Khởi tạo thiết kế triển khai Kỹ thuật - BM02 (2.QT46.KDDA-F01)</T>
                </h3>
                <T className="text-[10px] text-slate-300 block mt-0.5">Liên kết phiếu yêu cầu: {selectedPrForOi.requestNo} của {selectedPrForOi.uploaderName}.</T>
              </div>
              <button
                onClick={() => {
                  setShowCreateOiWizard(false);
                  setSelectedPrForOi(null);
                }}
                className="text-slate-205 hover:text-white font-bold p-1 rounded hover:bg-rose-850 text-xs tracking-wider cursor-pointer"
              >
                [ ĐÓNG WIZARD ]
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs select-text">
              <div className="p-4.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <p className="font-extrabold text-[12px] text-rose-900">Thông tin liên kết chính thức</p>
                <p><b>Sản phẩm đã duyệt sản xuất:</b> {selectedPrForOi.department} &rarr; {productionRequestItemsMap[selectedPrForOi.id]?.map(i=>i.productName).join(", ")}</p>
                <p><b>Đối tác giao hàng:</b> {selectedPrForOi.contact}</p>
              </div>

              {/* Module 1: Molds specs including mold addition */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="block font-black uppercase tracking-wider text-slate-800">1. Đặc tính khuôn mẫu</span>
                <div className="flex gap-4 select-none mb-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="oi-mold" checked={oiMoldOption === "NHƯ_INOCHI"} onChange={() => setOiMoldOption("NHƯ_INOCHI")} />
                    <span>Dùng khuôn Inochi hiện hữu</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="oi-mold" checked={oiMoldOption === "SỬA_KHUÔN"} onChange={() => setOiMoldOption("SỬA_KHUÔN")} />
                    <span>Hành vi: Sửa đổi khuôn</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="oi-mold" checked={oiMoldOption === "MỚI"} onChange={() => {
                      setOiMoldOption("MỚI");
                      setIsCustomMold(true);
                    }} />
                    <span className="text-rose-750 font-bold">Lập khuôn ép MỚI hoàn toàn &rarr;</span>
                  </label>
                </div>

                {oiMoldOption === "MỚI" && isCustomMold && (
                  <div className="bg-white p-3.5 border border-rose-250 rounded-lg space-y-2 mb-2">
                    <p className="font-bold text-rose-900 text-[10px] uppercase">Khai báo mã khuôn kỹ thuật mới cho SCM</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-slate-450 font-bold uppercase mb-1">Mã khuôn mới*</label>
                        <input
                          type="text"
                          required
                          placeholder="MOLD-YOKO-SUB..."
                          value={customMoldCode}
                          onChange={(e) => setCustomMoldCode(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-450 font-bold uppercase mb-1">Tên khuôn mới*</label>
                        <input
                          type="text"
                          required
                          placeholder="Khuôn dập khay Yoko mới..."
                          value={customMoldName}
                          onChange={(e) => setCustomMoldName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-450 font-bold uppercase mb-1">Đặc tính kỹ thuật lòng khuôn</label>
                      <input
                        type="text"
                        placeholder="Thép SKD61, đúc 1 lòng nóng..."
                        value={customMoldDesc}
                        onChange={(e) => setCustomMoldDesc(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Chi tiết chỉnh sửa khuôn (vị trí dán tem, chèn logo thương hiệu)*</label>
                  <textarea
                    value={oiMoldDetail}
                    onChange={(e) => setOiMoldDetail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Module 2: Formula & Color */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <span className="block font-black uppercase tracking-wider text-slate-800">2. Công thức nhựa & Phế xoay vòng</span>
                  <div className="flex gap-4 select-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiFormulaOption === "NHƯ_INOCHI"} onChange={() => setOiFormulaOption("NHƯ_INOCHI")} />
                      <span>Như công thức của Inochi</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiFormulaOption === "MỚI"} onChange={() => setOiFormulaOption("MỚI")} />
                      <span>Nhựa biến tính mới</span>
                    </label>
                  </div>
                  <div>
                    <label className="block mb-1 font-bold text-[9px] uppercase text-slate-450">Chi tiết công thức pha tỉ lệ hạt / xử lý phôi</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded p-1.5"
                      value={oiFormulaDetail}
                      onChange={(e) => setOiFormulaDetail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="block font-black uppercase tracking-wider text-slate-800">3. Phối Màu sản phẩm mẫu</span>
                  <div className="flex gap-4 select-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiColorOption === "NHƯ_INOCHI"} onChange={() => setOiColorOption("NHƯ_INOCHI")} />
                      <span>Màu Inochi chuẩn</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiColorOption === "MÀU_MỚI"} onChange={() => setOiColorOption("MÀU_MỚI")} />
                      <span className="text-teal-700">Màu mới phối</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Pantone 1 màu (e.g. 2365C)"
                      className="bg-white border border-slate-300 rounded p-1 text-[10px]"
                      value={oiColorPantone1}
                      onChange={(e) => setOiColorPantone1(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Tên màu tương ứng 1 (e.g. Hồng)"
                      className="bg-white border border-slate-300 rounded p-1 text-[10px]"
                      value={oiColorName1}
                      onChange={(e) => setOiColorName1(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Module 3: Print spec & packaging */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <span className="block font-black uppercase tracking-wider text-slate-800">4. In ấn đối tác</span>
                  <div className="flex gap-4 select-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiPrintOption === "KHÔNG_IN"} onChange={() => setOiPrintOption("KHÔNG_IN")} />
                      <span>Không in dập</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiPrintOption === "CÓ_IN"} onChange={() => setOiPrintOption("CÓ_IN")} />
                      <span>Có in lụa/In decal nhiệt</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Mô tả chỉ định in pantone, vị trí trên quai vịn..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5"
                    value={oiPrintDetail}
                    onChange={(e) => setOiPrintDetail(e.target.value)}
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <span className="block font-black uppercase tracking-wider text-slate-800">5. Thể thức Đóng gói bao màng</span>
                  <div className="flex gap-4 select-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiPkgOption === "NHƯ_INOCHI"} onChange={() => setOiPkgOption("NHƯ_INOCHI")} />
                      <span>Nhự quy cách Inochi</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiPkgOption === "MỚI"} onChange={() => setOiPkgOption("MỚI")} />
                      <span>Quy cách đóng gói mới</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Số lượng sản phẩm/túi PE, số túi xếp/thùng..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5"
                    value={oiPkgDetail}
                    onChange={(e) => setOiPkgDetail(e.target.value)}
                  />
                </div>
              </div>

              {/* Module 4: Materials & Sample approval */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <span className="block font-black uppercase tracking-wider text-slate-800">6. Maket bao bì & Thùng Carton (C2)</span>
                  <div className="flex gap-4 select-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiPkgMatOption === "NHƯ_INOCHI"} onChange={() => setOiPkgMatOption("NHƯ_INOCHI")} />
                      <span>Dùng bao bì/tem phụ Inochi</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiPkgMatOption === "MỚI"} onChange={() => setOiPkgMatOption("MỚI")} />
                      <span>In ấn maket thương hiệu khách</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Hộp C1, Maket thùng C2, màng co PET..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5"
                    value={oiPkgMatDetail}
                    onChange={(e) => setOiPkgMatDetail(e.target.value)}
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <span className="block font-black uppercase tracking-wider text-slate-800">7. Làm mẫu bao bì & can màng</span>
                  <div className="flex gap-4 select-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiSampleOption === "KD_TỰ_TÌM"} onChange={() => setOiSampleOption("KD_TỰ_TÌM")} />
                      <span>Kinh doanh (Sale) tự lo NCC ngoài</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked={oiSampleOption === "NHÀ_MÁY_TRIỂN_KHAI"} onChange={() => setOiSampleOption("NHÀ_MÁY_TRIỂN_KHAI")} />
                      <span>Chi nhánh Nhà máy triển khai chế tạo</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Loại bao màng thử mẫu, dập test..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5"
                    value={oiSampleDetail}
                    onChange={(e) => setOiSampleDetail(e.target.value)}
                  />
                </div>
              </div>

              {/* Module 5: Quality & safety standards exactly as PDF */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <span className="block font-black uppercase tracking-wider text-slate-800">8. Tiêu Chuẩn Chất Lượng Đơn hàng</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Ngoại quan & Kĩ thuật</label>
                    <select
                      value={oiQcStandardOption}
                      onChange={(e) => setOiQcStandardOption(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs mb-2"
                    >
                      <option value="THEO_TIÊU_CHUẨN_TÂN_PHÚ">Theo tiêu chuẩn và thỏa thuận của Tân Phú</option>
                      <option value="TIÊU_CHUẨN_KHÁCH_HÀNG">Yêu cầu khắt khe đặc biệt của Khách hàng</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Mô tả tiêu chuẩn hạt bẩn, bụi bặm, tơ xước 0%..."
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                      value={oiQcStandardDetail}
                      onChange={(e) => setOiQcStandardDetail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1">Tiêu chuẩn An Toàn sản phẩm</label>
                    <select
                      value={oiSafetyStandardOption}
                      onChange={(e) => setOiSafetyStandardOption(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs mb-2"
                    >
                      <option value="THEO_TIÊU_CHUẨN_INOCHI">Theo tiêu chuẩn an toàn của Inochi</option>
                      <option value="TIÊU_CHUẨN_KHÁCH_HÀNG">Đăng ký chứng nhận khách tự chỉ định (SGS, FDA...)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="FDA, EU chứng nhận..."
                      className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                      value={oiSafetyStandardDetail}
                      onChange={(e) => setOiSafetyStandardDetail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-between gap-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreateOiWizard(false);
                  setSelectedPrForOi(null);
                }}
                className="px-4 py-3 border border-slate-300 bg-white rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <T>Quay lại</T>
              </button>
              <button
                type="button"
                onClick={handleFinishOiWizard}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                <T>Hoàn tất & Ban hành BM02 &rarr;</T>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
