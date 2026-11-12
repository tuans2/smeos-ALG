# HIẾN PHÁP QUẢN TRỊ TÀI LIỆU ALG-CORE
## (ALG-CORE DOCUMENTATION CONSTITUTION)

> **Mã định danh:** `DOC-00-CONSTITUTION`  
> **Trạng thái:** `CANONICAL` — Có hiệu lực vĩnh viễn và bắt buộc tuân thủ 100% đối với mọi Kỹ sư và AI Coding Agent (Claude Code, Google Antigravity, Copilot).  
> **Ngày phê duyệt:** 23/09/2026 bởi Chủ sản phẩm (Product Owner).  
> **Tài liệu máy đọc đi kèm:** [`docs/00-DOCUMENTATION-REGISTRY.yaml`](00-DOCUMENTATION-REGISTRY.yaml)

---

## 1. MỤC ĐÍCH & TÔN CHỈ (PURPOSE)

Hệ thống quản trị tài liệu ALG-Core được thiết lập nhằm:
1. **Chống trôi dạt tài liệu (Documentation Drift):** Đảm bảo tài liệu đặc tả luôn phản ánh chính xác 100% mã nguồn thực tế và ngược lại.
2. **Một nguồn sự thật duy nhất (One Source of Truth - OSOT):** Mỗi chủ đề, phân hệ, hợp đồng API hay bảng dữ liệu chỉ có **DUY NHẤT MỘT** tài liệu nắm quyền phát ngôn chính thức.
3. **Kiểm soát vòng đời tài liệu:** Không để các bản nháp (Draft), bản kiểm toán cũ (Audit Logs) hay tài liệu lịch sử (Historical) làm nhiễu loạn việc ra quyết định.
4. **Hành lang an toàn cho AI Coding Agent:** Cung cấp chỉ giới rõ ràng về quyền hạn: AI được phép sửa gì, không được tự ý phát minh điều gì, và khi nào bắt buộc phải dừng lại hỏi Người dùng/PO.

---

## 2. PHÂN TẦNG THẨM QUYỀN (HIERARCHY OF AUTHORITY)

Mọi xung đột thông tin giữa các tài liệu hoặc giữa tài liệu và mã nguồn phải tuân thủ nghiêm ngặt **5 Tầng Thẩm quyền**:

```
[LEVEL 1: MASTER STRATEGY & SYSTEM ARCHITECTURE]
ALG_SAAS_TARGET_ARCHITECTURE_V2.md | TRANG_THAI.md
(Định hướng chiến lược, ranh giới 13 module, sở hữu repo, trạng thái hệ thống)
       │
       ▼
[LEVEL 2: SYSTEM PRD & FOUNDATION SPEC]
00-PRD.md | 01-technical-requirements.md | UNIFIED_SHELL.md
(Phạm vi sản phẩm, phi chức năng, Tenant Isolation, Reverse Proxy & SSO)
       │
       ▼
[LEVEL 3: MODULE SPECIFICATIONS & UI/UX]
02-08 Specs | M01-M11 Module Specs | ALG_TEMPLATE_SYSTEM_SSOT.md
(Hợp đồng API REST, CSDL ERD, RBAC, AI Routing, 5 Họ Template UI)
       │
       ▼
[LEVEL 4: CODEBASE AS IMPLEMENTATION SSOT]
prisma/schema.prisma | capability-catalog.ts | route.ts | tests/
(Thực tế mã nguồn làm SSOT cao nhất cho kiểu dữ liệu, endpoint, enum, test)
       │
       ▼
[LEVEL 5: OPERATIONAL & AUDIT LOGS]
Checklist_Thuc_Thi.md | TECHNICAL_DEBT.md | QUYET_DINH_RS_18_09.md
(Nhật ký tiến độ thi công P0-P26, Sổ nợ kỹ thuật, Biên bản phán quyết)
```

### Quy tắc Phán xử Xung đột (Conflict Resolution Rules):
1. **Quy tắc Ý định Nghiệp vụ (Top-Down Intent Rule):** Tầng cao hơn thắng tầng thấp hơn về mục tiêu sản phẩm, phân định sở hữu module và ranh giới hệ sinh thái.
2. **Quy tắc Chi tiết Thi công (Bottom-Up Implementation Rule):** Đối với các chi tiết kỹ thuật cụ thể (tên bảng trong DB, tên trường, kiểu dữ liệu, HTTP path, HTTP method, giá trị enum, mã capability): **Mã nguồn thực tế (Level 4) là SSOT thi công cao nhất**. Nếu tài liệu Level 3 diễn giải khác với Level 4, tài liệu Level 3 phải được cập nhật lại theo Level 4 (sau khi đã xác nhận mã nguồn không vi phạm kiến trúc Level 1/Level 2).
3. **Quy tắc Không Tự Đoán (Zero Guessing Rule):** Khi hai tài liệu cùng cấp mâu thuẫn nhau mà không có biên bản phán quyết, Agent **CẤM** tự chọn phương án. Phải dừng lại và yêu cầu phán quyết từ PO.

---

## 3. VÒNG ĐỜI TÀI LIỆU (DOCUMENT LIFECYCLE)

Mọi tệp tài liệu trong repository bắt buộc phải mang một trong các trạng thái sau trong [`00-DOCUMENTATION-REGISTRY.yaml`](00-DOCUMENTATION-REGISTRY.yaml):

| Trạng thái | Định nghĩa | Quyền uy | Vị trí khuyến nghị |
|---|---|---|---|
| **`CANONICAL`** | Tài liệu chuẩn mực chính thức của hệ thống đang có hiệu lực thi hành. | **Toàn quyền SSOT** cho phân hệ tương ứng | `docs/`, `docs/dac-ta/`, `docs/kien-truc/` |
| **`SUPPORTING`** | Tài liệu hướng dẫn phụ trợ, checklist chi tiết hoặc phụ lục mở rộng. | Tham chiếu bổ sung, không được mâu thuẫn với Canonical | `docs/dac-ta/`, `docs/kien-truc/` |
| **`DRAFT`** | Bản phác thảo, ý tưởng đề xuất chưa qua nghiệm thu. | **KHÔNG CÓ QUYỀN UY**. Cấm dùng làm căn cứ lập trình | `docs/archive/drafts/` |
| **`HISTORICAL`** | Tài liệu của các phiên bản cũ đã được thay thế (v1.0 specs, kế hoạch harvest). | Chỉ dùng tra cứu lịch sử và bài học kinh nghiệm | `docs/archive/historical/` |
| **`ARCHIVED`** | Tài liệu đã hợp nhất vào tệp khác hoặc các bản snapshot audit theo mốc thời gian. | Lưu trữ bất biến để truy vết, không sửa đổi | `docs/archive/` hoặc `docs/archive/audit-logs/` |

---

## 4. QUY TẮC QUẢN LÝ THAY ĐỔI (CHANGE MANAGEMENT)

Mọi thay đổi liên quan đến cấu trúc hệ thống phải tuân thủ chu trình 6 bước:
```
Yêu cầu Thay đổi
      ↓
1. Tra cứu 00-DOCUMENTATION-REGISTRY.yaml để tìm đúng Canonical SSOT
      ↓
2. Cập nhật Tài liệu SSOT tương ứng (Chỉ sửa tối thiểu)
      ↓
3. Cập nhật Mã nguồn / Schema / API Routes khớp với SSOT
      ↓
4. Chạy kiểm thử tự động: node scripts/check-docs.mjs && npm run test:tenant && npm test
      ↓
5. Cập nhật các tài liệu phụ thuộc (Dependencies) và Nhật ký trạng thái (TRANG_THAI.md)
      ↓
6. Review Git Diff & Báo cáo kết quả
```

---

## 5. PHÁN QUYẾT CHIẾN LƯỢC ĐÃ CHỐT CỦA PRODUCT OWNER (PO DECISIONS)

Dưới đây là các quyết định pháp lý và kỹ thuật chính thức do Chủ sản phẩm phê duyệt ngày 23/09/2026, có giá trị thi hành vĩnh viễn:

1. **Quyết định D13 (Consent & Xóa Dữ liệu Cá nhân Khách hàng PII):**
   * **Phương án phê chuẩn:** **SOFT-DELETE (Anonymize/Soft-delete)**.
   * **Nội dung:** Khi khách hàng cuối yêu cầu xóa dữ liệu, hệ thống ẩn/nặc danh hóa các trường PII (tên, SĐT, địa chỉ chi tiết) trên hồ sơ khách hàng và lịch sử đơn hàng, đồng thời ghi nhận audit log sự đồng ý (Consent Audit Log). Tuyệt đối **không hard-delete** làm gãy số liệu thống kê đơn hàng và doanh thu kế toán của tiệm hoa.
2. **Quyết định D14 (Bảng giá Credit GPU nặng — Video M04c, Biến thể M04b, Nội dung M07):**
   * **Phương án phê chuẩn:** **GIAI ĐOÀN DEV ĐỂ THOẢI MÁI (Permissive / 0 credit)**.
   * **Nội dung:** Trong giai đoạn phát triển, hệ thống không áp đặt chặn chặt chi phí GPU để tạo điều kiện kiểm thử thuận lợi. Biểu giá `cost_credit` chính thức sẽ được ban hành sau khi đo lường chi phí hạ tầng thực tế trước mốc thương mại hóa.
3. **Quyết định D20 (Ngưỡng AI Benchmark & Bộ ảnh vàng):**
   * **Phương án phê chuẩn:** **BỘ ẢNH VÀNG 8 ẢNH CHUẨN LÀ ĐỦ ĐỂ BENCHMARK**.
   * **Nội dung:** Bộ 8 ảnh vàng gán nhãn người thật của AVI GIFT đạt chuẩn nghiệm thu tối thiểu là cơ sở SSOT duy nhất để benchmark tất cả AI Capabilities. **Loại bỏ tuyệt đối yêu cầu 100 ảnh vàng**, đóng vĩnh viễn các nợ kỹ thuật liên quan (#19, #20, #24).

---

## 6. 11 NGUYÊN TẮC VÀNG CHO AI CODING AGENT (AI AGENT RULES)

Mọi Agent (Claude Code, Google Antigravity, v.v.) làm việc trong repo bắt buộc tuân thủ:
1. **Đọc Hiến pháp trước:** Luôn đọc file này trước khi tiến hành sửa đổi tài liệu lớn.
2. **Tra cứu Registry trước khi tạo file mới:** Luôn kiểm tra `docs/00-DOCUMENTATION-REGISTRY.yaml`. Cấm tự ý tạo thêm file đặc tả mới nếu phân hệ đó đã có tài liệu Canonical.
3. **Xác định đúng SSOT trước khi sửa:** Sửa đúng file gốc, không sửa ở file phái sinh rồi để file gốc lệch pha.
4. **Cấm coi Draft / Archive là thẩm quyền:** Tuyệt đối không trích dẫn nội dung từ thư mục `archive/` làm căn cứ bác bỏ code hiện tại.
5. **Cấm tự phát minh (Zero Guessing):** Không tự bịa quyết định kinh doanh, pháp lý, mô hình giá hoặc kiến trúc. Khi thiếu thông tin, phải dừng lại hỏi người dùng.
6. **Đối chiếu với thực tế Repo:** Không tin mù quáng vào tài liệu phân tích bên ngoài. Luôn kiểm tra thực tế bằng lệnh `git status`, đọc `prisma/schema.prisma` và `route.ts`.
7. **Bảo vệ tuyệt đối Cách ly Tenant (Tenant Isolation - P0):** Mọi bảng dữ liệu thuộc tenant bắt buộc có `organization_id`, phải nằm trong `TENANT_TABLES` tại `tests/helpers/database.ts` và test `npm run test:tenant` phải xanh.
8. **Tuân thủ SRP & Phạm vi Tối thiểu (Zero Scope Creep):** Chỉ sửa các dòng code/docs trực tiếp phục vụ nhiệm vụ được giao. Không tiện tay refactor code không liên quan.
9. **Chạy kiểm thử thật, báo cáo thật:** Không bao giờ tuyên bố "đã test xong" nếu chưa chạy lệnh. Sử dụng `node scripts/check-docs.mjs` để kiểm tra độ khớp giữa Docs và Code.
10. **Dừng lại khi có xung đột chặn (Stop Conditions):** Nếu phát hiện 2 tài liệu Level 1/Level 2 mâu thuẫn trực tiếp hoặc yêu cầu destructive migration, phải dừng lại và báo cáo.
11. **Ghi nhận nợ kỹ thuật minh bạch:** Nếu buộc phải dùng giải pháp tạm thời, phải đánh dấu chú thích `// DEBUG-TEMP:` hoặc ghi mục mới vào `docs/dac-ta/TECHNICAL_DEBT.md`.

---

## 7. BỘ CÔNG CỤ KIỂM TRA TỰ ĐỘNG (GOVERNANCE VALIDATION TOOLS)

Dự án duy trì các cổng kiểm soát tự động bắt buộc phải xanh trước mọi commit:

```bash
# 1. Kiểm tra đối chiếu tự động giữa Đặc tả API/DB và Code thật (CI Gate)
node scripts/check-docs.mjs

# 2. Kiểm tra tính toàn vẹn của Hệ thống Template SSOT
npm run check:template-ssot

# 3. Kiểm tra cách ly dữ liệu khách thuê (Bắt buộc 100% xanh)
npm run test:tenant

# 4. Kiểm tra toàn bộ Unit Tests
npm test

# 5. Kiểm tra sạch lỗi TypeScript
npx tsc --noEmit
```
