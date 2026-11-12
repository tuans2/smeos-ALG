# 05 — Kiến trúc phía máy chủ

TypeScript cho web và API, Python cho xử lý ảnh, một Postgres dùng chung. Hai bên nối nhau qua bảng `generation_jobs` — không qua HTTP, không qua tiến trình con.

## 1. Bố cục

```
floraos-core/
├── prisma/schema.prisma          nguồn sự thật lược đồ
├── src/
│   ├── core/
│   │   ├── ports/                VisionAnalyzer · LLMProvider · StorageProvider
│   │   │                         · QueueProvider · PublisherProvider
│   │   │                         · SegmentationProvider · ImageProvider
│   │   │                         · VideoProvider · SpeechProvider
│   │   │                         · EmbeddingProvider
│   │   ├── ai/                   cổng AI — xem tài liệu 10
│   │   ├── tenancy/              ngữ cảnh tổ chức, bộ gác truy vấn
│   │   └── rbac/                 bảng năng lực, ba lớp cắt
│   ├── modules/<tên>/
│   │   ├── domain/               thực thể + luật, KHÔNG import hạ tầng
│   │   ├── use-cases/            điều phối
│   │   ├── infra/                repository, Prisma
│   │   └── adapters/             ra ngoài
│   └── app/api/v1/               route
├── workers/
│   ├── ai/                       cổng AI phía Python: sổ đăng ký, định tuyến, chấm điểm
│   ├── vision/                   M01
│   └── media_ai/                 M04a
└── tests/
```

Mọi module đủ **bốn** thư mục. `mapping-engine` của LocalBudd hiện chỉ có `adapters` — không lặp lại lỗi đó.

`domain/` không import Prisma. Đó là điều kiện để test luật nghiệp vụ chạy không cần cơ sở dữ liệu, và là lý do bộ test giá của ALG chuyển sang được nguyên vẹn.

## 2. Bốn lớp, một chiều phụ thuộc

```
route  →  use-case  →  repository  →  Prisma
             ↓
          domain  (không phụ thuộc ai)
             ↑
          adapter  →  cổng  →  nhà cung cấp bên ngoài
```

| Lớp | Được làm | Không được làm |
|---|---|---|
| `route` | Đọc phiên, kiểm năng lực, kiểm lược đồ zod, gọi một use-case | Truy vấn cơ sở dữ liệu, chứa luật nghiệp vụ |
| `use-case` | Điều phối, mở giao dịch, gọi repository và cổng | Biết mình đang chạy trong HTTP |
| `repository` | Truy vấn, **áp bộ gác tổ chức** | Chứa luật nghiệp vụ |
| `domain` | Luật thuần | Import bất cứ thứ gì thuộc hạ tầng |
| `adapter` | Nói chuyện với bên ngoài. **Chỗ duy nhất SDK của nhà cung cấp AI xuất hiện** | Được module khác import trực tiếp |
| `core/ai` | Giải năng lực, kiểm chính sách, chọn mô hình, kiểm lược đồ đầu ra, chấm điểm, ghi sổ chi phí | Chứa luật nghiệp vụ của module, hay biết module nào đang gọi |

## 3. Ngữ cảnh tổ chức

Ngữ cảnh giải một lần ở biên, rồi truyền xuống. Không lớp nào tự đi tìm lại.

```ts
type TenantContext = {
  organizationId: string
  workspaceId: string
  userId: string
  branchId: string | null      // null = phạm vi toàn tổ chức
  capabilities: ReadonlySet<string>
}
```

Giải từ `sessions.organization_id` phía máy chủ. Không hàm nào nhận `organizationId` từ tham số do client kiểm soát.

**Bộ gác nằm ở repository, không ở route.** Repository nhận `TenantContext` làm tham số bắt buộc thứ nhất và tự chèn điều kiện lọc:

```ts
class ProductRepository {
  async findById(ctx: TenantContext, id: string) {
    return this.db.products.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
  }
}
```

Route quên kiểm là chuyện thường gặp và bắt được ở review. Repository quên kiểm là lỗ hổng im lặng. Đặt bộ gác ở lớp sâu hơn nghĩa là quên ở lớp nông không gây hậu quả.

Không có `prisma` toàn cục xuất ra ngoài `infra/`. Module nào import trực tiếp `PrismaClient` là lỗi chặn ở review, vì nó đi vòng qua bộ gác.

## 4. Ba lớp cắt quyền

```ts
function duocPhep(ctx: TenantContext, ma: string): boolean {
  if (TRAN_CUNG[ma] && !TRAN_CUNG[ma].includes(ctx.roleKey)) return false   // cắt sau cùng
  const congTac = overrides.get(`${ctx.roleId}:${ma}`)
  if (congTac !== undefined) return congTac
  return MAC_DINH[ma].includes(ctx.roleKey)
}
```

Trần cứng kiểm **trước** trong mã nhưng cắt **sau cùng** về ngữ nghĩa: không giá trị nào của bảng công tắc mở được nó. Bảng `TRAN_CUNG` là hằng trong mã nguồn, không nằm trong cơ sở dữ liệu — đặt nó vào cơ sở dữ liệu là biến một luật không mở được thành một dòng ai sửa cũng được.

## 5. Cổng

Năm cổng ở `src/core/ports/`. Không module nào gọi thẳng API nhà cung cấp.

| Cổng | Trách nhiệm | Adapter đầu tiên |
|---|---|---|
| `VisionAnalyzer` | `analyze(image, context) → ProductAnalysis` | `OpenAIStructuredProvider` |
| `LLMProvider` | Sinh văn bản, có lược đồ JSON | |
| `StorageProvider` | Đọc ghi tệp, URL ký sẵn | |
| `QueueProvider` | Đưa việc vào hàng đợi, huỷ việc | Postgres, xem mục 6 |
| `PublisherProvider` | Đăng bài ra kênh ngoài | thuộc SocialFlow |

`ProductAnalysis` là hợp đồng JSON `PhanTichSanPhamHoa` (`strict: true`, sáu trường cấp một). Hình dạng lấy nguyên từ `Schema.json` thu hoạch, không khai lại bằng tay. Chỉ được **thêm** trường, không xoá và không đổi trường đã có.

Cổng đặt ở mức hợp đồng JSON, không ở mức `detect/segment/recognize` — quyết định D5-c. Provider chọn bằng số đo trên bộ ảnh vàng, không chốt cứng trong tài liệu.

**Identity Guard dùng cùng một provider và cùng một model version cho cả hai lần phân tích của một job**, ghi vào metadata asset. Fingerprint trước và sau tính bằng hai model khác nhau thì điểm so sánh mất ý nghĩa.

## 6. Ranh giới TypeScript và Python

```
core (TS)                             worker (Python)
──────────────────                    ─────────────────────
kiểm hạn mức          ─┐
ghi usage              │  Postgres    ┌── SELECT … FOR UPDATE SKIP LOCKED
tạo generation_jobs    ├─────────────►│   LISTEN/NOTIFY đánh thức
NOTIFY                ─┘              └── cập nhật stage → result → status
                                          ghi assets
đọc trạng thái ◄──────────────────────────┘
```

Ba việc trong **một giao dịch** phía core:

```
kiểm hạn mức → ghi usage (ENQUEUED, trừ credit) → tạo generation_jobs → NOTIFY
```

Giao dịch hỏng thì không có job và không mất credit. `NOTIFY` gửi sau khi commit, vì đánh thức worker trước khi dòng job nhìn thấy được là một cuộc đua.

Sáu luật của worker:

1. `organization_id` lấy **chỉ từ dòng job**. Không suy từ dữ liệu ảnh, không nhận từ tham số.
2. Cập nhật `stage` khi đổi bước, `result` khi có phán quyết, `status` sau cùng.
3. **Không ghi `usage`.** Hạn mức phải chặn trước khi job vào bảng, nên kế toán thuộc phía core.
4. Đọc lược đồ sinh sẵn, không tự khai bảng.
5. Model nạp một lần lúc worker khởi động, không nạp lại mỗi job.
6. `media_ai/` gọi `vision/` qua cổng, không import mã nội bộ của nhau.

**Cấm tuyệt đối `subprocess.Popen` + parse stdout. Cấm chạy job qua HTTP.** Đây là seam của FloraOS v1 và là một trong những lý do dựng lại. HTTP nội bộ chỉ dành cho lời gọi ngắn đồng bộ: kiểm tra sức khoẻ, tra một phép đo.

## 7. Job

Ba trục tách rời, ý nghĩa và bộ giá trị ở tài liệu 07 mục 6.

Xử lý thất bại:

| Tình huống | `status` | `result` | Retry |
|---|---|---|---|
| Nhà cung cấp timeout | `FAILED` | — | Có, luỹ thừa lùi, tối đa 3 lần |
| Worker crash giữa chừng | `FAILED` | — | Có |
| Identity Guard từ chối | `COMPLETED` | `REJECTED` | **Không** |
| Người dùng huỷ | `CANCELLED` | — | Không |

Job `PROCESSING` quá `started_at + 15 phút` bị một tiến trình quét đánh dấu `FAILED` với `error = "worker timeout"`. Không có tiến trình này thì một worker chết để lại job treo vĩnh viễn.

## 8. Nhật ký tiến trình

Nhật ký ghi cộng dồn vào một bảng phụ theo `job_id` với số thứ tự tăng dần, không giữ trong bộ nhớ. Endpoint SSE đọc từ số thứ tự client gửi lên qua `Last-Event-ID`.

FloraOS v1 giữ `LUOT: dict` trong RAM và mất toàn bộ khi khởi động lại. Trải nghiệm nhật ký theo dòng thì giữ; cách lưu thì đổi.

## 9. Cấu hình

Mọi cấu hình đọc qua một module `env.ts` kiểm bằng zod lúc khởi động. Thiếu biến thì tiến trình không lên, không chạy tiếp với giá trị mặc định âm thầm.

Khoá nhà cung cấp là khoá nền tảng, không phải khoá của tổ chức — quyết định D2. Chúng không bao giờ đi qua trình duyệt và không bao giờ nằm trong bảng nào.

## 10. Test

| Loại | Chạy gì | Bắt buộc |
|---|---|---|
| Luật nghiệp vụ | `domain/` thuần, không cơ sở dữ liệu | Mọi luật thu hoạch có test đi kèm |
| Cách ly tenant | Hai tổ chức, mọi endpoint | `npm run test:tenant` xanh trước mọi merge |
| Quyền | Ba lớp cắt, đủ 76 mã | `maChucNang.test.ts` chuyển nguyên vẹn |
| Worker | `pytest` trên `workers/` | Engine đếm và engine màu có test hồi quy |
| Hồi quy Vision | Bộ ảnh vàng | Điều kiện nghiệm thu P5 |

Luật thu hoạch: mã mang từ ba repo cũ sang phải có hạng trong `HARVEST_MANIFEST.md`, và luật nghiệp vụ phải đi kèm test khoá nó. Test xanh trên repo này thì mới coi là chuyển xong.
