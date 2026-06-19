# THIẾT QUÂN LUẬT CHO AI CODING AGENT (STRICT CODING DIRECTIVES)

> **CRITICAL RULE:** Dự án này sử dụng duy nhất dự án Firebase có tên **quiz-3t-mastery**. Nghiêm cấm tuyệt đối mọi hành vi thay đổi dự án, tạo cấu hình giả lập, hoặc đổi sang dự án Firebase khác.

---

## 1. THỦ THỂ CẤU HÌNH (CONFIG STATE & TARGETS)

Tất cả các tệp cấu hình Firebase trong toàn bộ hệ thống phải đồng bộ và trỏ chính xác về:
*   **Firebase Project ID:** `quiz-3t-mastery`
*   **Firestore Database ID:** `(default)`
*   **Auth Domain:** `quiz-3t-mastery.firebaseapp.com`
*   **Storage Bucket:** `quiz-3t-mastery.firebasestorage.app`

### Các tệp nguồn cấu hình cố định:
1.  `/firebase-applet-config.json`
2.  `/src/firebase-applet-config.json` (nếu có bản sao trực tiếp)

⚠️ **CẤM HOÀN TOÀN** việc chạy lại lệnh thiết lập khởi tạo Firebase (`set_up_firebase`) trừ khi được yêu cầu trực tiếp từ người dùng bằng văn bản, vì hành vi này có thể sinh ra mã cấu hình mới hoặc đổi thuộc tính mặc định làm gián đoạn liên kết dữ liệu thực tế.

---

## 2. NGUYÊN TẮC PHÁT TRIỂN & VIẾT CODE (DEVELOPMENT PRINCIPLES)

1.  **Firebase & Firestore Sync:**
    *   Giữ nguyên kết nối thực tế tới `quiz-3t-mastery`.
    *   Tuyệt đối KHÔNG giả lập dữ liệu (No mock data) hoặc sử dụng các biến môi trường trống rỗng để bypass tính năng. Hệ thống phải thực hiện các truy vấn thực tế lên Firestore.
    *   Đảm bảo mã khởi tạo Firestore luôn truyền chính xác thuộc tính `firestoreDatabaseId` từ config:
        ```typescript
        const app = initializeApp(firebaseConfig);
        export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Bắt buộc
        ```

2.  **Duy trì Log Xác Thực:**
    *   Giữ lại thông báo log xác thực kết nối thành công để kiểm tra tính toàn vẹn của dự án:
        ```typescript
        console.log("[SUCCESS] ĐÃ KẾT NỐI ĐÚNG VÀO DỰ ÁN: quiz-3t-mastery");
        ```

3.  **Firestore Security Rules (`firestore.rules`):**
    *   Tất cả thay đổi cấu trúc dữ liệu trong `firebase-blueprint.json` phải được đồng bộ sang `firestore.rules`.
    *   Sau mỗi lần chỉnh sửa `firestore.rules`, bắt buộc chạy công cụ phân tích và kiểm tra bảo mật (Lint & Red Team Audit) để loại bỏ hoàn toàn các lỗi bảo mật.

4.  **Bảo toàn Tên & Cấu Trúc:**
    *   Không tự ý đổi tên ứng dụng trong `metadata.json` hoặc định nghĩa lại các logic nghiệp vụ lõi (Quiz và trắc nghiệm 3T Mastery) ngoài phạm vi yêu cầu của người dùng.

---

## ENGLISH VERSION (FOR MULTI-LANGUAGE AGENTS)

*   **Designated Firebase Project:** `quiz-3t-mastery`
*   **Under NO circumstances** should you change the project ID, substitute configurations, or initialize a different Firebase environment.
*   Keep the console affirmation: `console.log("[SUCCESS] ĐÃ KẾT NỐI ĐÚNG VÀO DỰ ÁN: quiz-3t-mastery");` intact inside the Firebase initialization code.
*   Enforce Firestore rules sync and always run local project audits before deploying rules.
