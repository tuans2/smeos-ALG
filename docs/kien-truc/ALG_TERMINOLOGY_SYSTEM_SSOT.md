# ALG MASTER TERMINOLOGY SYSTEM SSOT
## Hệ Thống Từ Điển & Kiến Trúc Quản Lý Terminology 4 Tầng Toàn Diện

> **Mã văn bản:** `DOC-ARCH-TERMINOLOGY-SSOT-001`  
> **Cấp thẩm quyền:** Level 2 — Architectural SSOT  
> **Ngày phê duyệt:** 27/10/2026  
> **Branch thực thi:** `Chuanhoa_Terminology`  
> **Phạm vi áp dụng:** Toàn bộ hệ thống ALG (Tầng 1 SaaS Mother, Tầng 2 SaaS Ngành, Tầng 3 ChainOS, Tầng 4 StoreOS)

---

## 1. TỔNG QUAN & NGUYÊN TẮC CỐT LÕI (SSOT)

Kiến trúc quản lý Terminology của `ALG` được thiết kế theo nguyên tắc:
**"Tầng SaaS Mother quy định, quản lý & kiểm soát toàn bộ Terminology của 4 tầng; Các tầng dưới kế thừa, tùy biến theo vai trò và ngành nghề nhưng không bao giờ thoát ly khỏi Schema SSOT."**

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              🏛️ TẦNG 1: SAAS MOTHER                                    │
│             (Master Terminology Registry & Governance Authority)                       │
│  - Định nghĩa Terminology Schema & Tier Contracts (TypeScript Typesafe)                │
│  - Quản lý từ vựng chuẩn mực Nền tảng: Tenant, Cloud, Model License, AI Quota, Plan   │
│  - Giám sát toàn vẹn từ điển (Terminology Integrity & Ratchet Audit)                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Ban hành & Áp đặt Schema
             ┌──────────────────────────────┴──────────────────────────────┐
             ▼                                                             ▼
┌────────────────────────────────────────┐        ┌────────────────────────────────────────┐
│         🌐 TẦNG 2: SAAS NGÀNH          │        │            🔗 TẦNG 3: CHAINOS          │
│   (Ngành Hàng & Mạng Lưới Affiliate)   │        │     (Chuỗi Thương Hiệu & Xưởng Mạng)   │
│  - Khái niệm ngành: Thợ, Hành động,    │        │  - Khái niệm Chuỗi: Tổng bộ (HQ),     │
│    Công thức (BOM), Mẫu chuẩn, Ấn phẩm │        │    Tháp điều phối (Control Tower),     │
│  - Mạng lưới: Link bán, Hoa hồng,      │        │    Đơn gia công Chuỗi, Bắn đơn xưởng,  │
│    Auto-Dispatch, Đối soát gia công    │        │    Duyệt chất lượng (QC), Chi nhánh    │
└───────────────────┬────────────────────┘        └───────────────────┬────────────────────┘
                    │                                                 │
                    │ Kế thừa & Hội tụ thuật ngữ theo Ngành + Vai trò │
                    └───────────────────────┬─────────────────────────┘
                                            ▼
                        ┌────────────────────────────────────────┐
                        │            🏪 TẦNG 4: STOREOS          │
                        │    (Điểm Bán Lẻ & Tiếp Nhận Gia Công)  │
                        │  - Nghiệp vụ tiệm: POS, Sổ quỹ, Kho lẻ,│
                        │    Khách quen, Hàng đợi thợ chế tác,   │
                        │    Đơn nhận mạng lưới, Ảnh nghiệm thu  │
                        └────────────────────────────────────────┘
```

---

## 2. MA TRẬN PHÂN ĐỊNH THUẬT NGỮ 4 TẦNG

| Tầng | Mã Tầng | Đối tượng thụ hưởng | Nhóm Thuật Ngữ Trọng Tâm | Ví dụ Chuẩn Hóa SSOT |
| :--- | :--- | :--- | :--- | :--- |
| **Tầng 1: SaaS Mother** | `TIER_1_SAAS` | `platform_admin`, DevOps, Quản trị viên hệ thống | Nền tảng SaaS, Tổ chức (Tenant), Đa chi nhánh, Gói dịch vụ, Cổng AI, Giấy phép mô hình, Hạn ngạch (Quota). | `Tổ chức`, `Gói giải pháp`, `Cổng AI Đơn cuộc`, `Mô hình AI thương mại`, `Hạn mức token`, `Bảo mật đa tenant`. |
| **Tầng 2: SaaS Ngành** | `TIER_2_INDUSTRY` | `industry_admin`, Chuyên gia ngành, Giám đốc mạng lưới | Chuẩn hóa ngành (Taxonomy, Đơn vị, Quy cách, BOM), Mạng lưới Affiliate, Link bán tự động, Bắn đơn gia công, Phí đối tác. | `Mẫu thiết kế/Món/Bó hoa`, `Công thức định lượng`, `Thẻ đính kèm`, `Bắn đơn mạng lưới`, `Hoa hồng đối tác`. |
| **Tầng 3: ChainOS** | `TIER_3_CHAIN` | `flower_network_admin`, `coordinator`, `ceo`, `manager`, `quality_control` | Tổng bộ chuỗi (HQ), Bộ sưu tập chuỗi, Tháp điều phối (Control Tower), Đơn gia công chuỗi, Xưởng chế tác, Kiểm duyệt chất lượng (QC). | `Tổng bộ Chuỗi`, `Tháp điều phối`, `Đơn chuỗi điều phối`, `Trạm chế tác / Chi nhánh`, `Kiểm duyệt thành phẩm`. |
| **Tầng 4: StoreOS** | `TIER_4_STORE` | `store_admin`, `sales`, `florist` (Thợ), `crm` | Vận hành điểm bán: Bán lẻ tại quầy (POS), Khách quen, Hàng đợi thợ, Đơn nhận từ mạng lưới, Sổ quỹ, In ấn phẩm A6. | `Bán tại quầy`, `Hàng đợi chế tác`, `Đơn nhận từ mạng lưới`, `Ảnh nghiệm thu`, `In thẻ kèm`. |

---

## 3. CƠ CHẾ PHÂN GIẢI THUẬT NGỮ (RESOLVER SPECIFICATION)

1. **Hierarchy Fallback**:
   - `StoreOS` resolve thuật ngữ dựa trên `(IndustryKey, RoleKey)`.
   - Nếu thuật ngữ ngành chưa định nghĩa riêng, tự động fallback về Từ điển chung Tiếng Việt (`src/lib/i18n/locales/vi/common.ts`).
2. **Zero Hardcoded Terms**:
   - Toàn bộ giao diện UI của 4 tầng sử dụng hàm `getTierTerminology(tier, context)` hoặc hook `useTierTerminology(tier)`.
   - Cấm hoàn toàn việc viết trực tiếp các từ ngữ kỹ thuật hoặc tên ngành vào các tầng trung lập.
3. **Audit Ratchet**:
   - Mọi từ vựng mới bổ sung phải nằm trong Type Contract có sẵn.
   - Script audit tự động phát hiện vi phạm phân tầng (ví dụ: Tầng Store dùng từ của Tầng SaaS Mother, hoặc Tầng SaaS Ngành dùng từ hardcode của một cửa hàng cụ thể).
