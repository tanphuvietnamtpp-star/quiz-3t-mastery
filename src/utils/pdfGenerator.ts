import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { QualityReport } from "../types";
import { STANDARDIZED_QC_DEPT } from "../data";

export interface PDFExportOptions {
  factoryName: string; // Specific factory or "Tất cả nhà máy"
  dateString: string;
  reports: QualityReport[];
  authorName: string;
}

/**
 * Creates and downloads a fully styled formal daily PDF report.
 * It builds an absolute structural layout in the DOM, compiles it to Canvas,
 * outputs a high-definition PDF using jsPDF, and simulates a Drive upload background process.
 */
export async function generateDailyReportPDF(options: PDFExportOptions): Promise<{
  fileBlob: Blob;
  fileName: string;
}> {
  const { factoryName, dateString, reports, authorName } = options;

  // Create temporary offscreen element for professional report rendering
  const reportContainer = document.createElement("div");
  reportContainer.style.position = "absolute";
  reportContainer.style.left = "-9999px";
  reportContainer.style.top = "-9999px";
  reportContainer.style.width = "800px";
  reportContainer.style.padding = "40px";
  reportContainer.style.background = "#ffffff";
  reportContainer.style.fontFamily = "sans-serif";
  reportContainer.style.color = "#1e293b";

  // Build high-integrity styling markup
  const headerHtml = `
    <div style="border-bottom: 3px double #1e3a8a; padding-bottom: 20px; margin-bottom: 25px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 60%; vertical-align: top;">
            <div style="font-weight: bold; font-size: 18px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">CÔNG TY CỔ PHẦN TÂN PHÚ VIỆT NAM</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Hệ Thống Trực Quan Hóa Quản Lý Chất Lượng 4M1E1I</div>
            <div style="font-size: 11px; color: #475569; font-weight: bold; margin-top: 2px;">BP quản lý: ${STANDARDIZED_QC_DEPT}</div>
          </td>
          <td style="width: 40%; text-align: right; vertical-align: top;">
            <div style="font-size: 12px; font-weight: bold; color: #0f172a;">BÁO CÁO TỔNG HỢP BIẾN ĐỘNG</div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">Ngày lập: ${dateString}</div>
            <div style="font-size: 11px; color: #64748b;">Mã tài liệu: RP-4M1E1I-${dateString.replace(/\//g, "")}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 20px; color: #0f172a; margin: 0; text-transform: uppercase;">BÁO CÁO BIẾN ĐỘNG CHẤT LƯỢNG HÀNG NGÀY</h1>
      <div style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin-top: 8px; text-transform: uppercase;">BỘ PHẬN: ${factoryName}</div>
    </div>
  `;

  // Summary Metrics Widgets
  const summaryAbnormalCount = reports.filter((r) => r.isAbnormal).length;
  const summaryStatsHtml = `
    <div style="display: flex; gap: 15px; margin-bottom: 30px;">
      <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center; background-color: #f8fafc;">
        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Tổng số biến động ghi nhận</div>
        <div style="font-size: 22px; font-weight: bold; color: #1e3a8a; margin-top: 4px;">${reports.length}</div>
      </div>
      <div style="flex: 1; border: 1px solid #fee2e2; border-radius: 6px; padding: 12px; text-align: center; background-color: #fef2f2;">
        <div style="font-size: 10px; color: #b91c1c; text-transform: uppercase; font-weight: bold;">Sự cố bất thường (Abnormal)</div>
        <div style="font-size: 22px; font-weight: bold; color: #ef4444; margin-top: 4px;">${summaryAbnormalCount}</div>
      </div>
      <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center; background-color: #f8fafc;">
        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Tỷ lệ an toàn hoạt động</div>
        <div style="font-size: 22px; font-weight: bold; color: #16a34a; margin-top: 4px;">
          ${reports.length > 0 ? Math.round(((reports.length - summaryAbnormalCount) / reports.length) * 100) : 100}%
        </div>
      </div>
    </div>
  `;

  // Build reports table
  let tableRows = "";
  if (reports.length === 0) {
    tableRows = `
      <tr>
        <td colspan="5" style="padding: 30px; text-align: center; color: #94a3b8; font-size: 13px;">
          Không ghi nhận sự thay đổi biến động nào trong ngày tại nhà máy này.
        </td>
      </tr>
    `;
  } else {
    reports.forEach((report, index) => {
      const categoryBadgeColor = 
        report.category === "CON NGƯỜI" ? "#4f46e5" :
        report.category === "NGUYÊN VẬT LIỆU" ? "#c026d3" :
        report.category === "MÁY MÓC" ? "#16a34a" :
        report.category === "PHƯƠNG PHÁP" ? "#d97706" :
        report.category === "MÔI TRƯỜNG" ? "#0d9488" : "#475569";

      const statusBadge = report.isAbnormal
        ? `<span style="background-color: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">BẤT THƯỜNG</span>`
        : `<span style="background-color: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase;">BÌNH THƯỜNG</span>`;

      tableRows += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-size: 11px; text-align: center; vertical-align: top; color: #64748b;">${index + 1}</td>
          <td style="padding: 12px; font-size: 11px; vertical-align: top;">
            <div style="font-weight: bold; color: #0f172a;">${report.factory}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 3px;">Thời gian: ${report.timestamp}</div>
            <div style="color: #64748b; font-size: 10px;">Bởi: ${report.uploaderName} (${report.uploaderDepartment})</div>
          </td>
          <td style="padding: 12px; vertical-align: top; text-align: center;">
            <span style="background-color: ${categoryBadgeColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block;">
              ${report.category}
            </span>
          </td>
          <td style="padding: 12px; font-size: 11px; vertical-align: top; line-height: 1.5; color: #334155;">
            <div style="font-weight: 500;">${report.content}</div>
            ${report.notes ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px; font-style: italic;">Ghi chú: ${report.notes}</div>` : ""}
          </td>
          <td style="padding: 12px; vertical-align: top; text-align: center;">
            <div style="margin-bottom: 6px;">${statusBadge}</div>
            ${report.imageUrl ? `
              <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; display: inline-block; background-color: #f8fafc;">
                <img src="${report.imageUrl}" style="width: 70px; height: auto; max-height: 55px; border-radius: 2px; object-fit: contain;" />
                <div style="font-size: 8px; color: #94a3b8; margin-top: 1px;">Compressed (${report.compressedSizeKb}KB)</div>
              </div>
            ` : `<span style="font-size: 10px; color: #94a3b8;">Không hình ảnh</span>`}
          </td>
        </tr>
      `;
    });
  }

  const reportsTableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; border: 1px solid #e2e8f0;">
      <thead>
        <tr style="background-color: #0f172a; color: white; text-align: left; border-bottom: 2px solid #e2e8f0;">
          <th style="padding: 12px; font-size: 11px; text-transform: uppercase; text-align: center; width: 6%;">STT</th>
          <th style="padding: 12px; font-size: 11px; text-transform: uppercase; width: 30%;">Chi nhánh / Nhân viên</th>
          <th style="padding: 12px; font-size: 11px; text-transform: uppercase; text-align: center; width: 18%;">Hạng mục (4M1E1I)</th>
          <th style="padding: 12px; font-size: 11px; text-transform: uppercase; width: 30%;">Nội dung chất lượng chi tiết</th>
          <th style="padding: 12px; font-size: 11px; text-transform: uppercase; text-align: center; width: 16%;">Trạng thái / Hình ảnh</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  const footerHtml = `
    <div style="margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; vertical-align: top; font-size: 11px; color: #64748b;">
            Để tra cứu trực tuyến, hãy truy cập hệ thống Tân Phú 4M1E1I trong mạng xưởng.<br/>
            Bản báo cáo PDF được sinh tự động và cam kết tính bất biến.
          </td>
          <td style="width: 50%; text-align: right; vertical-align: top;">
            <div style="font-size: 11px; font-weight: bold; color: #334155;">NGƯỜI LẬP BÁO CÁO CÔNG TÁC</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 30px; font-weight: bold; text-decoration: underline;">${authorName}</div>
            <div style="font-size: 10px; color: #94a3b8;">Xác thư pháp danh Phòng QL Chất Lượng</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  // Attach complete markup
  reportContainer.innerHTML = `
    ${headerHtml}
    ${summaryStatsHtml}
    ${reportsTableHtml}
    ${footerHtml}
  `;

  document.body.appendChild(reportContainer);

  // Compile HTML element to visual Canvas representation
  const canvasElement = await html2canvas(reportContainer, {
    scale: 2, // Perfect crisp rendering
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false
  });

  document.body.removeChild(reportContainer);

  // Convert canvas to jsPDF document standard
  const imgData = canvasElement.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const imgWidth = 210; // A4 dimension wide
  const pageHeight = 295; // A4 dimension high
  const imgHeight = (canvasElement.height * imgWidth) / canvasElement.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Multi-page capability loop if the table spans a lot
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const cleanFactoryName = factoryName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");
  const fileName = `DailyReport_4M1E1I_${cleanFactoryName}_${dateString.replace(/\//g, "-")}.pdf`;
  const fileBlob = pdf.output("blob");

  // Save the record
  pdf.save(fileName);

  return {
    fileBlob,
    fileName
  };
}
