# 16. Implementation Observations — Descriptive Only

Ghi nhận dấu hiệu trong mã. **Không phải requirement gap**, không kèm đề xuất.

## 16.1 Partially implemented / placeholder / giả lập trong giao diện

| # | Quan sát | Bằng chứng |
|---|---|---|
| O-01 | `/bao-gia`: "phân tích ảnh đối tác" là `setTimeout` 1,2 s trả tên/giá/thành phần cố định; danh sách sản phẩm rơi về 5 mẫu cứng `SAMPLE_PRODUCTS` khi gọi API lỗi | `src/app/(app)/bao-gia/page.tsx:35,134,162-179` |
| O-02 | `/lich-dang`: khi gọi proxy SocialFlow lỗi, nhánh `catch` đặt bài `published` với URL dựng sẵn và báo "Đã xuất bản thành công" | `src/app/(app)/lich-dang/page.tsx:265-276` |
| O-03 | Báo cáo bài đăng: chỉ số lượt xem/yêu thích/bình luận là "thuật toán mô phỏng (Mock Data)" (ghi ngay trên giao diện) | `src/components/templates/social-publishing/post-status-report-card.tsx:429` |
| O-04 | Bài đã duyệt ở `/noi-dung` không được gửi sang Lịch đăng; `ContentGenerationRepository.markScheduled` không có nơi gọi | `src/app/(app)/noi-dung/page.tsx:283-288`, `src/modules/content-engine/infra/content-generation-repository.ts:116` |
| O-05 | `/tai-anh` hiển thị khối trường mẫu `MOCK_FIELDS_RESULT1_PLACEHOLDER`, `MOCK_COPY_FIELDS_PLACEHOLDER` khi chưa có phân tích/dữ liệu bán hàng thật | `src/app/(app)/tai-anh/page.tsx:138,1196,1631,1848-1869` |
| O-06 | Modal đối soát đối tác hiển thị `SAMPLE_SETTLEMENT_ITEMS` (nơi mở modal không truyền dữ liệu thật) | `src/components/coordinator/partner-settlement-modal.tsx:23,88` |
| O-07 | Bản xem trước template Thẻ chào rơi về `SAMPLE_PRODUCTS` khi bộ sưu tập chưa có sản phẩm; thẻ tải ảnh ở Nghiên cứu thị trường có danh sách `DEMO_FLOWERS` để chọn thử | `src/components/greeting-card/customer/templates/use-catalog-products.ts:7,92`, `src/components/market-intelligence/product-upload-card.tsx:16` |
| O-08 | Thanh tiến độ render video nội suy "mượt" ở client trong lúc worker chạy | `src/components/video-studio/video-rendering-progress.tsx:88` |
| O-09 | `FeaturePicker`: `hasCustomerConsent: false, // TODO: check actual consent` | `src/components/dashboard/FeaturePicker.tsx:99` |
| O-10 | `POST /jobs/batch` tạo được job cho các feature không có worker nào LISTEN: `product.copy.generate` (M01b), `video.generate` (M04c), `customer.reminder` (M09), `catalog.generate` (M06), `landing.generate` (M05); M03/M08/M11 không có trong `MODULE_RUN_CAPABILITY` nên bị chặn. Job `PENDING` không bị script quét treo xử lý (script chỉ xét `PROCESSING`) | `src/lib/feature-catalog.ts:963-976`, `workers/media_ai/jobs/worker.py:455-480`, `src/modules/jobs/domain/job-rules.ts` |
| O-11 | `POST /jobs/batch` tham chiếu mã `P1` (M04b) và `O1` (M07) không có trong catalog → hai module này luôn bị từ chối | `src/app/api/v1/jobs/batch/route.ts` (`MODULE_RUN_CAPABILITY`) |
| O-12 | Luồng mời thành viên: tạo user `password_hash: ""` + membership `INVITED`; không có API/màn nhận lời mời, không gửi email | `src/modules/organization/use-cases/invite-member.ts:46` |
| O-13 | API đổi tổ chức (`POST /session/organization`), yêu cầu nâng cấp (`POST /organizations/current/upgrade-request`), chỉnh mã theo vai (`PATCH /roles/:id/capabilities`), workspace, sửa chi nhánh, thu hồi/sửa catalog link, token tích hợp: có API, không có màn gọi trong repo | [09a](09a-api-a-i.md), [09b](09b-api-j-w.md) |
| O-14 | Trường dữ liệu tự tạo (field-platform) chưa nối vào 17 biểu mẫu | `src/app/(platform)/van-hanh/truong-du-lieu/_components/truong-tu-tao-tab.tsx:5` |
| O-15 | Google Trends: chưa nối luồng related queries/topics | `src/modules/market-intelligence/adapters/google-trends-adapter.ts:221` |
| O-16 | Lead từ catalog công khai được nối vào mảng `leads` trong cột JSON `catalog_links.filters`; không có mã đọc danh sách này | `src/modules/catalog-links/infra/catalog-link-repository.ts:153-171` |
| O-17 | QC điều phối có cột `ai_score`, `ai_critique` nhưng không thấy mã chấm AI ghi vào | `prisma/schema.prisma` (`order_qc_records`) |
| O-18 | Thùng rác "30 ngày": mục quá hạn chỉ bị xoá khi có người mở danh sách thùng rác | `src/modules/storage/infra/trash-repository.ts:44-51,84-91` |
| O-19 | Tiêu đề `/dieu-phoi` gắn nhãn "Đang triển khai" | `src/app/(app)/dieu-phoi/page.tsx` |
| O-20 | 8 tuyến bị thay bằng "Sắp ra mắt" khi `NEXT_PUBLIC_APP_ENV=production`; 9 thẻ hành trình trên trang chủ bị khoá cùng cờ | `src/lib/feature-lock.ts` |
| O-21 | Worker nghiên cứu thị trường không có trong `render.yaml`; lịch `pg_cron` chỉ có trong ảnh Postgres Docker local | `render.yaml`, `docker/pg_cron_market_intelligence.sql` |
| O-22 | `research_runs.PARTIAL_SUCCESS`, `topics.status` ≠ `EMERGING`, `trial_status.EXHAUSTED/EXPIRED`, `membership_status.SUSPENDED` không có mã ghi | [06 §7.9](06-doi-tuong-va-trang-thai.md) |
| O-23 | Không có API/màn tạo voucher (`Q8`) và xuất khách hàng (`Q5`); voucher chỉ được đọc/tiêu thụ/hoàn trả trong Thẻ chào | `src/modules/greeting-card/infra/brochure-{checkout,payment}-repository.ts` |
| O-24 | Đường gọi AI của chat-assistant (Dify/OpenAI/Ollama) và worker Python không đi qua `callCapability` | [11 §11.6](11-tich-hop.md) |

## 16.2 Referenced but not implemented

- **83/151 mã năng lực** không được kiểm ở đâu (toàn bộ nhóm thu hoạch `A`–`E` trừ `A3`,`B6`,`C23`; cùng `J3`,`J4`,`J6`,`U4`,`K1`,`K2`,`R8`,`Q5`,`Q8`,`V3`) — [02 §2.7](02-vai-tro-va-quyen.md).
- **Mã nền tảng** `N2`, `N3`, `N7`, `N8` khai nhưng không có nơi kiểm.
- **`role_capabilities.scope`** lưu nhưng không dùng để cắt quyền/dữ liệu.
- **6 khuôn vai trải nghiệm `IN_DEVELOPMENT`** (`ceo`, `manager`, `quality_control`, `partner_manager`, `finance_accounting`, `florist`).
- **Bảng chỉ có lược đồ**: `order_info_requests`, `order_change_requests`, `journey_runs` (không có mã đọc/ghi); `product_inventory` (chỉ thùng rác chạm), `product_variants` (chỉ seed dev + thùng rác).
- **Gói thương mại** (`EXPERIENCE/STARTER/PRO/FLOWER_NETWORK/ENTERPRISE`) khai trong `entitlement-service.ts`, không có nơi gọi; `organizations.credit_plan` có cột.
- Chú thích trong catalog nhắc `GET /crm/customers/export` "(chưa xây)" (`src/core/rbac/capability-catalog.ts:238`).

## 16.3 Dead / unused code (dò import tĩnh — chỉ test import hoặc không ai import)

`src/core/entitlements/entitlement-service.ts`, `src/core/templates/golden-templates.ts`, `src/core/templates/domain/interpolation-engine.ts`, `src/lib/api.ts`, `src/modules/greeting-card/feature-flags.ts` (`isGreetingCardEnabled`), `src/modules/organization/domain/{self-approval-policy,role-compatibility}.ts`, `src/modules/journey/use-cases/{evaluate-readiness,get-journey-catalog}.ts`, `src/modules/journey/domain/{ai-journey-suggest,next-actions-registry,workflow-composer}.ts`, `src/modules/audio-studio/adapters/tts-router-adapter.ts`, `src/modules/creative-production/adapters/narrative-ai-adapter.ts`, `src/modules/creative-production/infra/creative-production-repository.ts`, `src/modules/creative-production/contracts/conformance.ts`, `src/modules/coordinator/domain/master-index-adapter.ts`, `src/modules/field-platform/domain/project-for-audience.ts`, `src/modules/market-intelligence/domain/{tenant-schedule-settings,topic-entity}.ts`, `src/modules/media/domain/{pipeline-route-rules,studio-prompt-compiler}.ts`, `src/modules/products/domain/pricing-input.ts`, `src/modules/profiles/adapters/business-profile-fact-reader.ts`, các tệp barrel `index.ts` của `coordinator/{connectors,contracts}`, `creative-production/contracts`, `journey/{adapters,infra}`, `components/templates{,/coordinator}`; 15 component ở [08 §8.4](08-man-hinh.md); `ExperienceGrid` được import nhưng không render. Endpoint `POST /media/background-removal` giữ lại nhưng luôn trả 409.

(`src/lib/maChucNang.ts` không được import ở production nhưng là tệp thu hoạch được `npm run test:harvest` và test catalog dùng làm nguồn đối chiếu.)

## 16.4 Mâu thuẫn giữa nguồn (ghi nhận, không chọn bên đúng)

| # | Nguồn A | Nguồn B | Nội dung lệch |
|---|---|---|---|
| C-01 | `README.md` mục "Trạng thái": "P1 xong… Hạng mục kế tiếp là P2" | Mã: có module của các pha sau (P3–P27: job, vision, media, video, điều phối, Thẻ chào, console nền tảng…) | Trạng thái dự án |
| C-02 | `README.md`, `prisma/seed.ts`, `ensure-system-roles.ts`: "bốn vai hệ thống" | `SYSTEM_ROLES` có 8 vai | Số vai hệ thống |
| C-03 | `src/core/rbac/README.md`: "31 mã có trần cứng"; header `capability-catalog.ts`: "76 + 38 mã"; `TRANG_THAI.md` §4: "CAPABILITIES (146 mã)" | Catalog thực có 151 mã, 43 mã có trần cứng | Quy mô catalog quyền |
| C-04 | Header `role-ux-catalog.ts`: "Danh mục 14 vai" | Mảng `ROLE_UX_CATALOG` có 16 khuôn | Số vai trải nghiệm |
| C-05 | `workers/README.md`: "Hai worker", lệnh `python -m media_ai.worker`; `README.md`: worker "xử lý ảnh (M01, M04a)" | `package.json`/`render.yaml`: `media_ai.jobs.worker`, thêm `media_ai.video.video_worker`; worker còn xử lý biến thể, video, âm thanh, nhân bản giọng | Phạm vi & lệnh chạy worker |
| C-06 | `docs/00-DOCUMENTATION-CONSTITUTION.md` §5 D13 (23/09): xoá dữ liệu khách = soft-delete/ẩn danh, không hard-delete | Mã: `prisma.customers.delete` (xoá cứng); `TRANG_THAI.md` §5 vẫn liệt kê D13 là "còn mở" | Xử lý dữ liệu cá nhân (và hai tài liệu lệch nhau) |
| C-07 | Hiến pháp §5 D14 (23/09): giai đoạn dev 0 credit cho GPU nặng | `src/modules/usage/domain/pricing.ts` bảng giá v1 (25/09): `video.render` 5, `audio.voice_clone` 5, `content.generate` 2…; `TRANG_THAI.md` §5 ghi D14 "CHỐT v1 25/09" | Bảng giá credit |
| C-08 | `tests/unit/architecture/route-capability-guard.test.ts`: webhook chat "xác thực bằng chữ ký" | Route `POST` Facebook/Zalo không kiểm chữ ký | Cơ chế xác thực webhook |
| C-09 | Chú thích đầu `src/app/(app)/page.tsx`: workspace trải nghiệm → lưới thẻ chức năng | `DashboardPage` không đọc `workspace.kind`; `ExperienceGrid` không được render | Trang chủ tài khoản trải nghiệm |
| C-10 | `TRANG_THAI.md` §6 mục 0: còn phải `git rm` `src/lib/variant-compositor.ts`, `scripts/media/process_m04b_variants.py`, xoá `media/variants/_probe/depth-probe.txt` | Các đường dẫn này không còn trong repo; chỉ còn route `media/background-removal` | Việc dọn dẹp đã/ chưa làm |
| C-11 | `docs/kien-truc/FLORAOS_TEMPLATE_SYSTEM_SSOT.md` (theo chú thích trong `kho-templates/page.tsx`): màn Analytics là `/bao-cao` | Route thật: `/so-lieu` | Tên tuyến |
| C-12 | `docs/00-DOCUMENTATION-REGISTRY.yaml`: `total_documents: 67` | Tệp có 69 mục `- id:` tại commit `9b4a54b` (70 sau khi thêm mục của tài liệu này; trường đếm không sửa) | Đếm registry |
| C-13 | `scripts/check-docs.mjs` (`SCHEMA_ONLY_CHUA_NOI`): `vouchers` "chỉ có đọc lồng qua customers" | Thẻ chào đọc và cập nhật `vouchers.is_used` khi đặt/huỷ đơn | Đường dùng bảng voucher |
| C-14 | `CLAUDE.md`: "Known leftover: 78 old ESLint errors" | Không chạy ESLint trong lượt này | NOT VERIFIED |

`node scripts/check-docs.mjs` (đối chiếu đặc tả 06/07 với route, model, enum, test cách ly) chạy trong lượt phân tích này: **"✓ Tài liệu khớp mã."**
