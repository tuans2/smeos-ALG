# CONTEXT.md — Bối cảnh sản phẩm ALG

Bản đồ nghiệp vụ một trang: ALG là gì, phục vụ ai, gồm những khối nào, và đọc ở đâu khi cần chi tiết.
Quy tắc làm việc nằm ở `CLAUDE.md` và `.agents/AGENT_RULES.md`; quy ước, lệnh, bẫy nằm ở `AGENTS.md`. Tệp này không lặp lại các quy tắc đó.

## 1. Sản phẩm

ALG là nền tảng SaaS đa tenant, đa ngành, dùng để quản trị và vận hành doanh nghiệp vừa và nhỏ: sản phẩm, ảnh và video marketing, catalog bán hàng, khách hàng, đơn hàng, điều phối sản xuất và giao hàng, nội dung và hội thoại đa kênh.

- **Gốc:** ALG, hệ điều hành cho tiệm hoa. Ngành hoa vẫn là ngành có nghiệp vụ đầy đủ nhất (tính giá, quy ước đếm cành, từ điển từ cấm nội dung).
- **Đa ngành:** mỗi ngành là một Industry Plugin trong `src/modules/organization/domain/industries/`: `floral`, `fashion`, `fnb`, `homestay`, `craft-gift`, `retail-general`, `services`. Logic và nhãn khác nhau theo ngành đi qua contract plugin, không rẽ nhánh theo `industryKey`.
- **Khách hàng tham chiếu:** AVI GIFT, nạp dữ liệu từ FloraOS v1 qua `src/modules/avi-gift-import/`.
- **Người dùng cuối:** người Việt; mọi chữ trên giao diện là tiếng Việt tự nhiên.

## 2. Mô hình bốn tầng

| Tầng | Vai trò | Hiện thực trong mã |
|---|---|---|
| SaaS Mother | Người vận hành nền tảng, xuyên tổ chức | Console Vận hành `/van-hanh`, route group `(platform)`, `src/core/platform/`, bảng `platform_operators` |
| SaaS Ngành | Cấu hình theo ngành | Industry Plugin (chỉ là mã, không phải dữ liệu) |
| ChainOS | Chuỗi / đối tác quản lý nhiều cửa hàng | `organization_links` (cạnh chuỗi) ở trạng thái ACTIVE, `src/layers/chain-os/`, `src/modules/chain-partnership/` |
| StoreOS | Một tổ chức (cửa hàng) và các chi nhánh | `organization_id` trên mọi bảng thuộc tenant |

Quyết định của tầng trên khoá tầng dưới theo thứ tự: khoá dựng sẵn → Mẹ → Chuỗi → cửa hàng. Lõi giải quyết dùng chung: `src/core/governance/layered-resolver.ts`. Ba trục độc lập:

- **RBAC:** mã năng lực, `src/core/rbac/`
- **Entitlement:** gói dịch vụ, khoá công cụ, `src/core/entitlements/`
- **Governance:** ma trận quản trị, `src/modules/organization/domain/governance-decisions.ts`

Chi tiết: skill `tier-governance`, `.agents/standards/smeos/01-tier-governance.md`.

## 3. Kiến trúc tổng thể

```
src/       Next.js 16 + TypeScript — giao diện và API /api/v1
workers/   Python — vision (phân tích ảnh), media_ai (ảnh, biến thể, video, âm thanh)
prisma/    lược đồ Postgres dùng chung
```

- Web và worker nối nhau qua bảng `generation_jobs` (`SKIP LOCKED` + `LISTEN/NOTIFY`), không qua HTTP hay tiến trình con.
- Mỗi module trong `src/modules/<tên>/` có bốn lớp: `domain/` (luật thuần) · `use-cases/` · `infra/` (Prisma) · `adapters/` (SDK nhà cung cấp).
- Mọi lời gọi AI đi qua cổng `callCapability` (`src/core/ai/gateway.ts`). Nền tảng giữ khoá nhà cung cấp và tính credit theo tổ chức (`src/modules/usage/`).
- Cổng ra ngoài là các port ở `src/core/ports/` (Vision, LLM, Storage, Queue, Publisher, Image, Video, Speech, Embedding, Segmentation).

## 4. Các khối nghiệp vụ

| Khối | Module | Màn chính |
|---|---|---|
| Tổ chức, thành viên, vai, chi nhánh | `organization`, `profiles`, `sso` | `/cai-dat`, `/vai-tro`, `/ho-so` |
| Sản phẩm, phân tích ảnh, giá | `products`, `product-copies`, `product-image-set`, `costing`, `promotions` | `/san-pham`, `/tai-anh`, `/gia`, `/tinh-gia`, `/uu-dai` |
| Sáng tạo ảnh và video | `creative-production`, `product-photo-studio`, `media`, `video-studio`, `audio-studio`, `ad-banner-poster` | `/creative-studio`, `/video` |
| Catalog và trang bán hàng | `catalog-links`, `catalog-studio`, `landing-page`, `shop-reviews` | `/catalog`, `/landing-page`, trang công khai `/c/[slug]` |
| Khách hàng (CRM) | `crm`, `acquisition` | `/khach-hang`, `/thu-hut-khach` |
| Đơn hàng và điều phối | `orders`, `coordinator`, `availability`, `field-platform` | `/don-hang`, `/dieu-phoi` |
| Thẻ chào | `greeting-card` | `/the-chao` |
| Nội dung và đăng bài | `content-engine`, `templates` | `/noi-dung`, `/lich-dang`, `/kho-templates` |
| Hội thoại và trợ lý AI | `chat-assistant`, `internal-chat` | `/hoi-thoai`, `/tin-nhan`, `/noi-bo` |
| Tích hợp | `integration`, `integration-hub` | `/tich-hop`, `/ket-noi` |
| Kho tệp | `assets`, `storage` | `/kho-du-lieu` |
| Thông báo | `notification` | trong ứng dụng, email, Telegram |
| Quản trị AI | `ai-governance` | `/cai-dat-ai` |
| Nhật ký, công việc, sử dụng | `audit`, `jobs`, `usage` | `/audit`, `/job`, `/so-lieu` |
| Thị trường | `market-intelligence` | `/market-intelligence` |

Bảng này là bản đồ định hướng. Trạng thái thật của từng tính năng: `docs/kien-truc/BO_TINH_NANG_HIEN_TRANG.md` và `docs/production-feature-map/`.

## 5. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Tổ chức / tenant | Một doanh nghiệp khách hàng; khoá cách ly là `organization_id` |
| Năng lực (capability) | Mã quyền thao tác (`I1`, `R11`, `N1`…); phân quyền theo mã, không theo tên vai |
| Trần cứng | Năng lực không vai nào vượt được, kể cả khi tổ chức ghi đè |
| Năng lực AI (`AIC-xx`) | Một loại việc AI; mô hình được chọn sau, theo bộ định tuyến |
| Identity Guard | Kiểm tra ảnh do AI tạo giữ đúng sản phẩm gốc; job bị từ chối được hoàn credit |
| Ảnh vàng | Bộ ảnh có đáp án do người gán nhãn, dùng nghiệm thu phân tích ảnh |
| Luồng kép / First-Wins | Việc tự động và việc người làm cùng chạy; bên chốt trước thắng (`AGENTS.md`, mục Kiến trúc Luồng Kép) |
| Thu hoạch (harvest) | Mã chuyển từ FloraOS / LocalBudd / SocialFlow, xếp hạng REUSE/EXTEND/ADAPTER/BUILD |
| M01…M11, P0…P27 | Mã module và mã giai đoạn trong tài liệu; không hiển thị trên giao diện |

## 6. Hệ sinh thái repo

| Repo | Vai trò |
|---|---|
| `ALG` (repo này) | Lõi: tổ chức, RBAC, sản phẩm, tệp, job, khách hàng, đơn hàng, sáng tạo, catalog, hội thoại |
| `FloraOS` | Bản v1, đóng băng tính năng; nguồn thu hoạch |
| `LocalBudd` | Landing page, catalog (bản song song) |
| `SocialFlow` | Đăng bài mạng xã hội, số liệu nền tảng |

## 7. Đọc ở đâu khi cần chi tiết

| Cần biết | Nguồn | Cách đọc |
|---|---|---|
| Tài liệu gốc (SSOT) của một mảng | `docs/00-DOCUMENTATION-REGISTRY.yaml` | `grep` |
| Đang ở đâu, quyết định đã chốt, việc kế tiếp | `docs/kien-truc/TRANG_THAI.md` | chỉ §4–6, phần còn lại `grep` |
| Kiến trúc đích | `docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` | `grep -n "^## "` rồi đọc mục cần |
| Đặc tả sản phẩm, API, CSDL, UX | `docs/dac-ta/` | theo tệp |
| Chuẩn kiến trúc đối chiếu mã (10 mảng) | `.agents/standards/README.md`, `.agents/standards/smeos/` | theo mảng |
| Quy ước mã, bản đồ mã, bẫy | `AGENTS.md` | `grep` theo mục |
| Luật cấm và lỗi lặp lại | `.agents/AGENT_RULES.md` | theo mục |
| Nguyên tắc UX | `docs/dac-ta/ux-patterns/OPERATING_PRINCIPLES.md` | trước mọi việc giao diện |

Khi các nguồn mâu thuẫn, thứ tự ưu tiên theo `CLAUDE.md` (mục "Before coding"). Khi mô tả ở đây khác mã thật, tin mã và cập nhật tệp này.
