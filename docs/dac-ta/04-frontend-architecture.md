# 04 — Kiến trúc phía giao diện

## 1. Nền công nghệ

Theo `LocalBudd`, để hai repo dùng chung được component và người làm không phải học hai bộ.

| Lớp | Chọn | Vì sao |
|---|---|---|
| Khung | Next.js 16, App Router | Cả `LocalBudd` và `ALG` đang dùng |
| Giao diện | React 19 | Server Components mặc định |
| Kiểu dáng | Tailwind CSS 4 | Token ngữ nghĩa tập trung |
| Component | Base UI (`@base-ui/react` 1.9.0) | Chuẩn hoá theo ADR-011, không phụ thuộc Radix |
| Biểu tượng | Phosphor Icons (`@phosphor-icons/react`) | Bọc theo từng icon trong `@/components/ui/icon-set/<ten>`, import trực tiếp tệp icon (barrel `@/components/ui/icons` chỉ còn cho vùng khoá và tệp lớn chờ tách); cấm import `lucide-react` (ADR-011 D-UI-06) |
| Kiểm dữ liệu | `zod` | Dùng chung một lược đồ cho cả client và máy chủ |
| ORM | **Prisma 7** | Bản mới, chuẩn snake_case CSDL |
| Test đầu cuối | Playwright | E2E, Visual Regression 390/1280px, Axe-core a11y |

Prisma là điểm duy nhất core cố tình lệch khỏi `LocalBudd`. Ghi lại ở đây để khi P7 nối hai repo thì biết chỗ nào cần nâng.

Không thêm thư viện quản lý trạng thái toàn cục. Lý do ở mục 4.

## 2. Bố cục

```
src/
├── app/
│   ├── (auth)/                  đăng nhập, đăng ký
│   ├── (app)/                   StoreOS & ChainOS (sau đăng nhập)
│   │   ├── layout.tsx           giải phiên app, nạp năng lực, dựng AppShell
│   │   ├── page.tsx             dashboard theo vai
│   │   ├── don-hang/            quản lý đơn hàng
│   │   ├── san-pham/            quản lý sản phẩm, định lượng BOM
│   │   ├── khach-hang/          CRM, chăm sóc khách hàng
│   │   ├── dieu-phoi/           ChainOS — trung tâm điều phối chuỗi & đối tác
│   │   ├── cong-cu/             10 công cụ kinh doanh (ảnh, video, thiệp, in ấn...)
│   │   ├── the-chao/            thẻ chào & bộ sưu tập mẫu
│   │   ├── cai-dat/             hồ sơ cửa hàng, chính sách, nhận diện
│   │   └── job/[id]/            tiến trình xử lý bất đồng bộ
│   ├── (platform)/              SaaS Mother Console (/van-hanh) — chỉ platform_operators
│   │   ├── layout.tsx           giải phiên platform, UI Studio xem trước
│   │   └── van-hanh/            vận hành nền tảng, tổ chức, hạ tầng AI
│   ├── (public)/                các tuyến khách xem (/b, /s, /c, /chia-se...)
│   └── api/v1/                  route handlers (API RESTful)
├── components/
│   ├── ui/                      Design System primitives (@base-ui/react, icons Phosphor)
│   ├── layout/                  AppShell, DesktopNav, MobileNav, PageHeader, PageLayout
│   └── <module>/                components nghiệp vụ chuyên biệt
├── styles/
│   └── tokens/                  CSS Design Tokens SSOT (color, typography, radius, shadow...)
└── lib/
    ├── ui-system/               Theme resolver máy chủ & metadata preset
    ├── session.ts               Context phiên & kiểm tra năng lực
    └── i18n/                    từ điển đa ngôn ngữ SSOT
```

Đường dẫn URL tiếng Việt không dấu, khớp cách người dùng gọi tên màn hình. Mã nguồn bên trong vẫn tiếng Anh.

## 3. Lấy dữ liệu

**Server Component là mặc định.** Màn hình đọc dữ liệu ngay ở phía máy chủ, qua use-case, cùng đường mã mà API dùng. Không gọi vòng qua HTTP để lấy dữ liệu của chính mình.

Client Component chỉ dùng cho ba việc: nhận thao tác người dùng, giữ trạng thái tạm của một màn hình, và đọc luồng sự kiện job.

> [!NOTE] Nợ kỹ thuật (UI-A-01, audit 01/11/2026)
> Hiện có 76/105 `page.tsx` đang dùng `"use client"` do lịch sử phát triển nhanh. Kế hoạch `ui-enterprise-upgrade.md` (Giai đoạn 4) sẽ đưa các trang này dần trở lại chuẩn Server Component khi di trú sang Screen Contract v2.

Ghi dữ liệu đi qua Server Action hoặc `fetch` tới `/api/v1/`. Chọn cái nào thì nhất quán trong một module, không trộn.

## 4. Trạng thái

Ba loại, ba cách, không gộp:

| Loại | Ví dụ | Cách giữ |
|---|---|---|
| Dữ liệu máy chủ | Danh sách sản phẩm, kết quả phân tích | Server Component, `revalidate` sau khi ghi |
| Trạng thái màn hình | Tab đang mở, ảnh đang chọn, form đang nhập | `useState` trong chính màn hình |
| Trạng thái phiên | Người dùng, tổ chức, danh sách năng lực | Một Context duy nhất, nạp ở `(app)/layout.tsx` |

Không có kho trạng thái toàn cục. Phần lớn dữ liệu ở đây là dữ liệu máy chủ, và giữ bản sao thứ hai của nó trên client là tạo ra hai nguồn sự thật sẽ lệch nhau.

## 5. Kiểm năng lực phía client

`GET /auth/me` trả danh sách mã năng lực đã tính sẵn. Context giữ nó dưới dạng `Set`.

```tsx
const { can } = useSession()
{can('I2') && <ApproveButton …/>}
```

**Đây là việc ẩn hiện giao diện, không phải phép kiểm quyền.** Máy chủ kiểm lại ở mọi endpoint. Client không bao giờ tự suy quyền từ vai — nó chỉ đọc danh sách máy chủ gửi xuống.

Không hard-code `role === 'dieu_hanh'` ở bất kỳ đâu trong giao diện.

## 6. Theo dõi job

`use-job-stream.ts` mở `EventSource` tới `/api/v1/jobs/:id/events`, gom hai loại sự kiện:

```ts
type JobStream = {
  status: JobStatus
  stage: string | null
  result: string | null
  logs: { seq: number; text: string; at: string }[]
}
```

- `stage` dẫn checklist tiến trình. Danh sách bước lấy từ hằng theo `feature`, không đoán từ nhật ký.
- `logs` cộng dồn, xếp theo `seq`. Mất kết nối thì mở lại kèm `Last-Event-ID` bằng `seq` cuối cùng và nối tiếp, không tải lại từ đầu.
- `done` đóng luồng và kích hoạt `revalidate` cho màn hình đang mở.

Rời màn hình không huỷ job. Quay lại thì nhật ký hiện đủ từ đầu, vì nó nằm ở cơ sở dữ liệu chứ không ở bộ nhớ trình duyệt.

## 7. Biểu mẫu

Một lược đồ `zod` cho một biểu mẫu, đặt ở nơi cả client và route handler cùng import. Kiểm ở client để báo sớm; kiểm lại ở máy chủ vì client kiểm không phải là kiểm.

Lỗi từ máy chủ trả về theo hình dạng ở tài liệu 06 mục 2, gắn vào đúng trường qua `error.details`.

## 8. Ảnh

- Nén phía client trước khi tải lên: cạnh dài tối đa 2.048 điểm ảnh, JPEG chất lượng 0,85. Bản gốc trên máy người dùng không bị đụng tới.
- Tải thẳng lên kho bằng URL ký sẵn từ `POST /assets/upload-url`. Ảnh không đi qua máy chủ ứng dụng.
- Hiện ảnh thu nhỏ ngay khi chọn, trước khi tải xong, bằng `URL.createObjectURL`.
- Nhiều ảnh thì tải song song tối đa ba luồng — điện thoại ở cửa hàng thường dùng mạng di động.
- Mọi thẻ ảnh khai sẵn `width` và `height` để bố cục không nhảy.

## 9. Điện thoại trước

- Điểm ngắt: mặc định là màn hẹp; `md` trở lên mới thêm cột và bảng.
- Điều hướng chính là thanh dưới trên điện thoại, thanh bên trên máy tính. Cùng một danh sách mục, hai cách bày.
- Bảng dữ liệu trên màn hẹp render thành danh sách thẻ, không cuộn ngang.
- Vùng bấm tối thiểu 44 điểm ảnh.
- Nút hành động chính nằm ở nửa dưới màn hình.

## 10. Hiệu năng

| Mục | Ngưỡng |
|---|---|
| Tải lần đầu trên 4G | Nội dung chính hiện trong 3 giây |
| Chuyển màn hình | Dưới 300 mili giây |
| Gói JavaScript mỗi tuyến | Dưới 200 KB sau nén |

Component nặng — thanh trượt so sánh trước sau, trình xem nhật ký — nạp trễ. Danh sách dài dùng phân trang con trỏ theo `next_cursor`, không tải hết rồi lọc ở client.

## 11. Test

| Loại | Công cụ | Phủ gì |
|---|---|---|
| Component | Vitest | Logic hiển thị theo năng lực, định dạng số và tiền |
| Đầu cuối | Playwright | Bốn luồng ở tài liệu 03: trải nghiệm, phân tích, tối ưu, duyệt |
| Quyền trên giao diện | Playwright | Đăng nhập bằng Sale rồi xác nhận nút duyệt không tồn tại trong DOM, không phải chỉ bị ẩn |

Nút bị ẩn bằng CSS vẫn bấm được bằng công cụ nhà phát triển. Năng lực thiếu thì component không được render.
