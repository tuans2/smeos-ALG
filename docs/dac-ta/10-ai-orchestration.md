# 10 — Nền AI: cổng, sổ đăng ký, định tuyến, chấm điểm

Bốn engine ở PRD mục 5 nói ALG *làm gì* với AI. Tài liệu này nói ALG *gọi* AI thế nào — và nó áp cho mọi module ở cả ba repo, không riêng module nào.

Lý do tài liệu này tồn tại: mô hình đổi nhanh hơn sản phẩm. Bộ máy phân tích ảnh đã đổi mặc định một lần trong hai ngày (D5-e). Model video mở trọng số đổi giấy phép giữa các phiên bản. Nếu tên nhà cung cấp nằm trong luật nghiệp vụ thì mỗi lần thị trường đổi là một lần sửa mã nghiệp vụ.

## 1. Bốn luật

| # | Luật |
|---|---|
| 1 | **Năng lực trước, mô hình sau.** Mã nghiệp vụ gọi một *năng lực* (`product_vision`), không gọi một nhà cung cấp (`OpenAIVisionProvider`) |
| 2 | **Mọi lời gọi AI đi qua cổng AI.** Không route, use-case, agent hay script nào gọi thẳng SDK của nhà cung cấp |
| 3 | **Mô hình là cấu hình, không phải mã.** Đổi mô hình là đổi một dòng trong sổ đăng ký cộng một lần đo, không phải một lần sửa module |
| 4 | **Đầu ra AI được chấm điểm trước khi thành dữ liệu.** Chấm điểm là của máy, duyệt là của người; cái này không thay cái kia |

Luật 2 là luật dễ vi phạm nhất và cũng là luật đáng giá nhất: nó là điều kiện để sổ chi phí, chuỗi dự phòng, sàn quyền riêng tư và phép đo chất lượng tồn tại ở đúng một chỗ.

## 2. Ba mức triển khai

| Mức | Cách chạy | Dùng khi |
|---|---|---|
| **Mức 1 — API** | Nhà cung cấp thương mại | Mặc định. Ra sản phẩm nhanh, chất lượng cao, không gánh hạ tầng GPU |
| **Mức 2 — Trọng số mở** | Tự vận hành hoặc dịch vụ quản lý | Khi khối lượng, chi phí, độ trễ, quyền riêng tư hoặc mức kiểm soát đủ lớn để bù chi phí vận hành |
| **Mức 3 — Lai** | Nhiều mô hình cộng thị giác máy tính tất định cộng tri thức ngành | Khi cần độ chính xác cao nhất và khi ALG đã biết mô hình hiện tại sai ở đâu |

**Thứ tự lên mức không đảo được:** API → thu dữ liệu → đo → hiểu ca sai → trọng số mở → thu thêm dữ liệu → lai → chỉ khi đó mới tính tới tinh chỉnh mô hình. Tinh chỉnh trước khi biết mô hình sai ở đâu là trả tiền để khoá lại một cái sai chưa ai mô tả được.

Bộ máy `local_cv` của M01 là mức 2 đã có thật — nó không phải mục tiêu tương lai. Nó **từng** là mặc định qua quyết định ghi đè D5-e, rồi mặc định lật sang `openai_direct` (09/12) và **hiện là `openai_structured`** (nợ #83, chốt 09/17 — `workers/vision/providers/registry.py:27`, `src/modules/products/domain/vision-engine.ts:38`). Cổng D5-d chỉ bắt buộc đo trên bộ ảnh vàng khi đổi làm HẠ mặc định (RS-6, 18/09) — D5-e (Đầy đủ→Cục bộ) là lần HẠ duy nhất trong ba lần, và nó bằng lập luận chứ không bằng phép đo, nên đó vẫn là nợ mở thật. Hai lần sau (→`openai_direct`, →`openai_structured`) là NÂNG mặc định nên không bắt buộc qua cổng đo — không phải vi phạm.

## 3. Bản đồ tầng

```
Module nghiệp vụ  (M01 … M11, ở cả ba repo)
        │  gọi một NĂNG LỰC, kèm ngữ cảnh tổ chức và mức yêu cầu
        ▼
CỔNG AI  ── giải năng lực → kiểm chính sách và hạn mức → chọn mô hình
        │  → gọi adapter → kiểm lược đồ đầu ra → chấm điểm → ghi sổ
        ▼
BỘ ĐỊNH TUYẾN  ── đọc sổ đăng ký năng lực + sổ đăng ký mô hình
        │                + chính sách của tổ chức + sức khoẻ nhà cung cấp
        ▼
ADAPTER NHÀ CUNG CẤP  ── một interface cho mỗi loại cổng
        ▼
┌────────────────┬─────────────────────┬──────────────────────┐
│ API thương mại │ Trọng số mở         │ Bộ máy chuyên dụng   │
│ LLM · thị giác │ SAM2 · Florence-2   │ engine đếm · engine  │
│ ảnh · video    │ diffusion · video   │ màu · FFmpeg · OCR   │
└────────────────┴─────────────────────┴──────────────────────┘
```

**Cổng AI là một lớp trong `floraos-core`, không phải một dịch vụ thứ tư.** Nó nằm ở `src/core/ai/` cho phía TypeScript và `workers/ai/` cho phía Python, dùng chung sổ đăng ký và chính sách trong Postgres. Ba lý do:

- D6-1 cấm chạy job qua HTTP. Một dịch vụ cổng riêng đứng giữa core và worker sẽ là đúng cái đường HTTP đó, hoặc là một hàng đợi thứ hai.
- Đường A giữ ba repo tách rời và chỉ thêm ranh giới khi có lý do sở hữu dữ liệu. Cổng AI không sở hữu dữ liệu nào; nó đọc sổ đăng ký và ghi sổ chi phí.
- Một tiến trình nữa là một tiến trình nữa phải quan sát, triển khai và giữ cho sống. Chi phí đó chỉ đáng khi có tổ chức thứ hai gọi nó, và điều đó chưa xảy ra.

Engine ngoài không gọi cổng AI của core qua mạng. Nó giữ cổng AI của riêng nó **đọc cùng một sổ đăng ký và cùng chính sách** qua Integration API, rồi báo chi phí về. Ranh giới ở mục 12.

## 4. Sổ đăng ký năng lực

Năng lực là đơn vị mà module gọi và là đơn vị mà chính sách, hạn mức, phép đo và sổ chi phí gắn vào. Mỗi năng lực có một mã `AIC`, một module chủ, một hợp đồng vào ra, và một hàng trong `ai_capabilities`.

| Mã | Năng lực | Module | Loại |
|---|---|---|---|
| `AIC-01` | `product_vision` | M01 | Sinh — cần duyệt |
| `AIC-02` | `object_counting` | M01 | Sinh — nằm trong `AIC-01` |
| `AIC-03` | `color_analysis` | M01 | Tất định phần đo, sinh phần gọi tên |
| `AIC-04` | `product_copy` | M01b | Sinh — cần duyệt |
| `AIC-05` | `price_segment_hint` | M01b | Sinh — nhãn, không phải giá |
| `AIC-06` | `image_quality_analysis` | M04a | Đo |
| `AIC-07` | `product_segmentation` | M04a | Sinh mặt nạ |
| `AIC-08` | `image_enhancement` | M04a | Sinh — cần duyệt |
| `AIC-09` | `smart_reframe` | M04a | **Tất định** |
| `AIC-10` | `identity_verification` | M04a | Đo — cổng cứng |
| `AIC-11` | `background_removal` | M04b | Sinh mặt nạ |
| `AIC-12` | `background_generation` | M04b | Sinh — cần duyệt |
| `AIC-13` | `image_expansion` | M04b | Sinh — cần duyệt |
| `AIC-14` | `image_retouch_deterministic` | M04b | **Tất định** |
| `AIC-15` | `image_retouch_generative` | M04b | Sinh — cần duyệt |
| `AIC-16` | `watermark` | M04b | **Tất định** |
| `AIC-17` | `creative_variants` | M04b | Sinh — cần duyệt |
| `AIC-18` | `video_storyboard` | M04c | Sinh — kế hoạch cảnh |
| `AIC-19` | `video_shot_generation` | M04c | Sinh — cần duyệt |
| `AIC-20` | `video_assembly` | M04c | **Tất định** |
| `AIC-21` | `text_to_speech` | M04c | Sinh |
| `AIC-22` | `speech_to_text` | M04c | Sinh — phụ đề |
| `AIC-23` | `content_generation` | M07 | Sinh — cần duyệt |
| `AIC-24` | `content_qa` | M07 | Đo |
| `AIC-25` | `catalog_copy` | M06 | Sinh — cần duyệt |
| `AIC-26` | `landing_page_plan` | M05 | Sinh — kế hoạch, không phải HTML |
| `AIC-27` | `product_embedding` | M03 | Sinh — vector |
| `AIC-28` | `semantic_product_search` | M03 · M08 | Truy hồi |
| `AIC-29` | `customer_segmentation` | M09 | Sinh — gợi ý |
| `AIC-30` | `reminder_message` | M09 | Sinh — cần duyệt |
| `AIC-31` | `chat_intent_routing` | M08 | Sinh — phân loại |
| `AIC-32` | `chat_answer` | M08 | Sinh — có công cụ |
| `AIC-33` | `analytics_interpretation` | M11 | Sinh — diễn giải |
| `AIC-34` | `learning_pattern` | M11 | Sinh — kết luận kèm căn cứ |

Bốn năng lực mang nhãn **tất định** không bao giờ gọi mô hình. Chúng nằm trong sổ đăng ký để chính sách, sổ chi phí và phép đo có cùng một hình dạng cho mọi năng lực — không phải để mở đường cho một mô hình chen vào sau.

## 5. Sổ đăng ký mô hình và giấy phép

`ai_models` giữ mỗi mô hình một hàng. **Không mô hình nào vào production khi còn trống một trong bốn ô: giấy phép, được dùng thương mại, lãnh thổ, phạm vi sử dụng cho phép.** Ma trận chọn công nghệ ở kiến trúc V2 mục 13.1 là nơi điền chúng lần đầu; sổ đăng ký là nơi chúng sống.

Luật giấy phép áp cho cả phần không phải mô hình: FFmpeg bản cơ bản là LGPL 2.1+, một số thành phần tuỳ chọn mang GPL, nên cấu hình build của worker khoá rõ danh sách thành phần và ghi vào sổ đăng ký như một hàng.

Ba nhóm đã soát và kết luận khác nhau:

| Nhóm | Kết luận |
|---|---|
| SAM2, Florence-2 | Giấy phép thuận lợi cho triển khai thương mại. `local_cv` đã chạy thật trên hai mô hình này |
| Video trọng số mở | Điều kiện rất khác nhau giữa các họ mô hình — có họ dễ, có họ giới hạn theo lãnh thổ hoặc theo doanh thu của bên dùng. Không họ nào vào production chỉ vì điểm benchmark |
| API thương mại | Điều khoản lưu trữ và huấn luyện của mỗi nhà cung cấp soát trước khi đưa dữ liệu qua (`YC-V3`), và ô soát cách ly tenant là bắt buộc |

## 6. Cổng nhà cung cấp

Mười cổng. Năm cổng đầu đã có ở `src/core/ports/`.

| Cổng | Năng lực nó phục vụ |
|---|---|
| `VisionAnalyzer` | `AIC-01` `AIC-02` `AIC-03` `AIC-10` — ở mức hợp đồng JSON, không ở mức `detect/segment/recognize` |
| `LLMProvider` | `AIC-04` `AIC-05` `AIC-18` `AIC-23` `AIC-24` `AIC-25` `AIC-26` `AIC-29` `AIC-30` `AIC-31` `AIC-32` `AIC-33` `AIC-34` |
| `StorageProvider` | mọi năng lực sinh tệp |
| `QueueProvider` | mọi năng lực chạy bằng job |
| `PublisherProvider` | đăng bài — không phải năng lực AI |
| `SegmentationProvider` | `AIC-07` `AIC-11` |
| `ImageProvider` | `AIC-08` `AIC-12` `AIC-13` `AIC-15` `AIC-17` |
| `VideoProvider` | `AIC-19` |
| `SpeechProvider` | `AIC-21` `AIC-22` |
| `EmbeddingProvider` | `AIC-27` `AIC-28` |

Luật của cổng giữ nguyên từ `YC-N1` và `YC-N2`: cổng khai ở mức hợp đồng nghiệp vụ, không ở mức lời gọi kỹ thuật của một nhà cung cấp. Lược đồ riêng của nhà cung cấp dừng lại ở adapter — nó không xuất hiện trong `domain/`, không xuất hiện trong bảng nào, và không xuất hiện trong đáp ứng API.

### 6.1 Hợp đồng lời gọi

Module không gọi adapter. Nó gọi cổng AI, và cổng AI nhận đúng hình dạng này:

```ts
type AiCall<I> = {
  capability: string              // mã trong ai_capabilities, ví dụ "content_generation"
  input: I                        // hợp đồng vào của chính năng lực đó
  ctx: TenantContext              // giải từ phiên phía máy chủ, không nhận từ client
  privacy: AiPrivacyLevel         // suy từ LOẠI DỮ LIỆU, không nhận từ người gọi
  jobId?: string                  // có khi lời gọi nằm trong một job
  idempotencyKey?: string
  qualityTarget?: "thuong" | "cao"
}

type AiResult<O> = {
  output: O
  model: { key: string; version: string; provider: string }
  attempts: Array<{
    model: string
    outcome: "ACCEPTED" | "ESCALATED" | "FAILED"
    latencyMs: number
    costUsd?: number
  }>
  evaluation: {
    scores: Record<string, number>   // một khoá cho mỗi kênh đã khai ở ai_capabilities
    overall: number
    thresholdUsed?: number
    needsReview: boolean
  }
}
```

Ba điều đọc ra được từ hình dạng này, và cả ba là chủ ý:

- **`privacy` không phải tham số của người gọi.** Nó suy từ loại dữ liệu đi vào, nên một use-case không thể hạ mức để lấy một mô hình rẻ hơn. Use-case truyền nó vì nó biết mình đang xử lý dữ liệu gì, còn cổng AI kiểm lại bằng loại năng lực.
- **`attempts` là một mảng, không phải một giá trị.** Một lời gọi nghiệp vụ có thể là ba lượt gọi mô hình khi thác nghiệm leo. Mảng này là nguồn của `ai_requests`, và nó nhìn thấy được ở tầng use-case để lớp trên biết kết quả đã phải leo thác.
- **`evaluation.needsReview` đi cùng kết quả, không đi sau.** Use-case ghi bản ghi nghiệp vụ và đặt cờ soát trong cùng một giao dịch; không có đường nào ghi kết quả trước rồi chấm điểm sau.

### 6.2 Chữ ký năm cổng mới

```ts
interface SegmentationProvider {
  segment(input: {
    imageRef: AssetRef
    hints?: { boxes?: Box[]; points?: Point[] }
  }): Promise<{ masks: MaskData[]; modelVersion: string }>
}

interface ImageProvider {
  generate(input: {
    prompt: string
    reference?: AssetRef[]
    aspectRatio: string
  }): Promise<ProviderMedia>

  edit(input: {
    imageRef: AssetRef
    mask?: MaskData          // vùng ĐƯỢC phép đổi
    protectMask?: MaskData   // vùng KHÔNG được đổi — sản phẩm
    prompt: string
  }): Promise<ProviderMedia>
}

interface VideoProvider {
  submit(input: {
    frames: { first: AssetRef; last?: AssetRef }
    motion: string
    durationSeconds: number
    aspectRatio: string
  }): Promise<{ providerJobId: string }>

  poll(providerJobId: string): Promise<
    | { state: "RUNNING" }
    | { state: "DONE"; media: ProviderMedia }
    | { state: "FAILED"; reason: string }
  >
}

interface SpeechProvider {
  synthesize(input: { text: string; voice: string; language: string }): Promise<ProviderMedia>
  transcribe(input: { mediaRef: AssetRef; language?: string }): Promise<{
    segments: Array<{ startMs: number; endMs: number; text: string }>
    modelVersion: string
  }>
}

interface EmbeddingProvider {
  embed(input: { texts: string[] }): Promise<{ vectors: number[][]; modelVersion: string }>
}

type ProviderMedia = {
  bytes: Uint8Array | { tempHandle: string }
  mimeType: string
  modelVersion: string
  costUsd?: number
  providerFlags?: Record<string, boolean>   // ví dụ generative fill đã dùng
}
```

**Adapter không ghi kho tệp.** Nó trả byte hoặc một handle tạm; ghi vào kho và tạo bản ghi `assets` là việc của use-case qua `StorageProvider`. Đây là điều kiện để `YC-A1` (asset gốc bất biến) và `YC-T5` (đường dẫn theo tổ chức) nằm ở một chỗ duy nhất thay vì lặp lại trong từng adapter.

**`VideoProvider` tách `submit` và `poll`** vì mọi nhà cung cấp video đều bất đồng bộ, thường lâu hơn một lượt ảnh nhiều bậc. `providerJobId` lưu trong `payload` của `generation_jobs`; worker poll theo chu kỳ và cập nhật `stage`. Ép video vào một lời gọi đồng bộ là cách nhanh nhất để một job treo mười lăm phút rồi bị tiến trình quét đánh `FAILED` trong khi nhà cung cấp vẫn đang chạy.

**`edit` có hai mặt nạ, không phải một.** `mask` là vùng được phép đổi, `protectMask` là vùng không được đổi. Với `AIC-13` (mở rộng khung) thì `protectMask` chính là mặt nạ sản phẩm, và đó là thứ giữ cho một lượt mở rộng nền không sửa vào bó hoa.

## 7. Bộ định tuyến

Bộ định tuyến chọn mô hình cho một lời gọi năng lực. Nó đọc chín trục: mức chất lượng yêu cầu · độ trễ cho phép · ngân sách · mức quyền riêng tư · khối lượng · loại việc · kích thước đầu vào · loại đầu ra · sức khoẻ nhà cung cấp.

**Năm ràng buộc, không lách được:**

1. **Chỉ định tuyến trong số những bộ đã đo.** Một mô hình chưa có số trên bộ ảnh vàng không được bộ định tuyến chọn tự động cho `AIC-01`, kể cả khi nó rẻ hơn hoặc nhanh hơn. Tổ chức tự chọn nó qua `H4` thì được — đó là thử nghiệm có người chịu trách nhiệm, không phải quyết định của máy. Đây là D5-c và nó không đổi.
2. **Chính sách của tổ chức là trần, không phải gợi ý.** Tổ chức đã chọn bộ máy qua `H4` thì bộ định tuyến không đổi sang bộ khác để tiết kiệm. Nó chỉ được chọn trong phạm vi tổ chức đã mở.
3. **Mô hình chốt vào `payload` của job lúc tạo, worker không tra lại.** Hai ảnh cùng một lô không bao giờ chạy bằng hai mô hình khác nhau vì ai đó đổi cấu hình giữa lúc lô đang xếp hàng.
4. **Thác chỉ leo lên.** Xem mục 8.
5. **Sàn quyền riêng tư cắt sau cùng.** Xem mục 10.

Mọi quyết định định tuyến ghi lại: mô hình nào được chọn, vì trục nào, và mô hình nào bị loại. Không có bản ghi đó thì câu hỏi "vì sao hai bản ghi cùng loại lại khác nhau" không có câu trả lời — và đó là câu hỏi sẽ được hỏi.

## 8. Thác nghiệm và chuỗi dự phòng

Hai cơ chế khác nhau, dễ bị gộp:

| | Thác nghiệm | Chuỗi dự phòng |
|---|---|---|
| Kích hoạt bởi | Chất lượng thấp — điểm dưới ngưỡng | Hỏng kỹ thuật — nhà cung cấp lỗi, hết hạn, quá tải |
| Hướng đi | Chỉ leo lên: rẻ → đắt, đơn → lai | Sang ngang: nhà cung cấp khác cùng mức |
| Tính phí | Một lượt nghiệp vụ, dù chạy hai lần | Một lượt nghiệp vụ |
| Khi hết đường | `needs_review = true`, vào hàng chờ người | Job `FAILED`, credit hoàn theo D3-b |

```
Lời gọi năng lực
   ↓
Mô hình mức 1 → điểm ≥ ngưỡng chấp nhận? ──► xong
   ↓ không
Mô hình mức cao hơn → điểm ≥ ngưỡng? ──► xong
   ↓ không
Đường lai → điểm ≥ ngưỡng? ──► xong
   ↓ không
needs_review = true → hàng chờ duyệt, kèm điểm và lý do
```

**Thác chỉ bật khi năng lực CÓ ngưỡng đã đo.** Có ngưỡng thì lượt đầu chạy lớp chất lượng thấp nhất đủ điều kiện và thác leo lên khi điểm chưa đạt — đó là chỗ tiết kiệm được chi phí mà không đánh đổi độ chính xác. Chưa có ngưỡng (D20) thì lượt đầu chạy lớp chất lượng cao nhất: không có gì phát hiện ra một kết quả rẻ-mà-tệ, nên "bắt đầu từ lớp thấp" sẽ thành "luôn chạy mô hình rẻ nhất" — đúng chiều ngược với thứ tự ưu tiên đã chốt, Accuracy > Quality > Cost > Speed. Cờ này do cổng AI đặt từ chính ngưỡng, không phải một công tắc cấu hình.

**Thác không bao giờ hạ chất lượng để tiết kiệm.** Một lời gọi đã chạy bằng bộ đầy đủ không bị chạy lại bằng bộ gọn; chiều đó chỉ do tổ chức chọn qua `H4`.

**Dự phòng không vượt sàn quyền riêng tư.** Nhà cung cấp bên ngoài không bao giờ là bước dự phòng cho một lời gọi có mức quyền riêng tư đòi chạy tại chỗ. Hết đường trong phạm vi cho phép thì job `FAILED` — đó là kết quả đúng, không phải một lý do để gửi ảnh khách ra ngoài.

## 9. Lớp chấm điểm

Mỗi năng lực sinh ra một điểm chất lượng theo trục riêng của nó, ghi vào `ai_evaluations` và vào metadata của asset khi có asset.

| Năng lực | Trục chấm |
|---|---|
| `AIC-01` `AIC-02` | Điểm nhận dạng cấu phần · độ tin cậy số đếm · độ tin cậy danh mục loài · độ tin cậy thuộc tính |
| `AIC-08` `AIC-12` `AIC-13` `AIC-17` | Toàn vẹn sản phẩm · điểm nhiễu và sai lệch · điểm bố cục |
| `AIC-19` | Toàn vẹn sản phẩm · chất lượng chuyển động · chất lượng âm thanh · chất lượng phụ đề |
| `AIC-23` `AIC-25` `AIC-30` | Đúng dữ kiện · đúng giọng thương hiệu · đúng ràng buộc nền tảng · dễ đọc |
| `AIC-32` | Đúng nguồn sự thật · có dẫn được về bản ghi thật |

**Ba cổng khác nhau, không cổng nào thay cổng nào:**

```
điểm chất lượng   ← máy chấm mọi đầu ra AI (mục này)
Identity Guard    ← máy chấm riêng nhận dạng sản phẩm, cổng cứng của M04a
Review → Approve  ← người ra phán quyết, Luật 3 của PRD
```

Ngưỡng của Identity Guard (0,95 và 0,90) đã chốt với chủ sản phẩm cho `AIC-10` và không nằm trong bảng ngưỡng chung. Mọi ngưỡng khác khai theo từng năng lực trong `ai_capabilities`, và **không ngưỡng nào được đặt bằng lập luận** — nó đặt bằng một lần đo trên dữ liệu có đáp án, hoặc nó được ghi rõ là giá trị tạm kèm một dòng nợ kỹ thuật.

## 10. Định tuyến theo quyền riêng tư

Mỗi lời gọi mang một mức quyền riêng tư, suy từ loại dữ liệu chứ không từ ý muốn của người gọi:

| Mức | Dữ liệu | Đường cho phép |
|---|---|---|
| `public` | Ảnh sản phẩm đã xuất bản, nội dung đã đăng | Nhà cung cấp bên ngoài |
| `shop` | Ảnh sản phẩm chưa duyệt, hồ sơ thương hiệu, số liệu nội bộ | Nhà cung cấp có điều khoản lưu trữ và huấn luyện đã soát |
| `sensitive` | Dữ liệu cá nhân của khách hàng cuối | Chạy tại chỗ, không rời hạ tầng |

Mức `sensitive` là lý do `YC-K3` tồn tại: tên, số điện thoại và địa chỉ khách hàng không đi qua nhà cung cấp AI nào. Nội dung nhắc mua sinh ở mức `shop` từ dịp và sản phẩm; phần định danh ghép ở tầng gửi, sau khi mô hình đã xong việc.

## 11. Sổ chi phí mỗi lời gọi

Ba bảng khác nhau, ba câu hỏi khác nhau — không bảng nào thay bảng nào:

| Bảng | Trả lời | Đơn vị |
|---|---|---|
| `usage` | Tổ chức đã tiêu bao nhiêu credit, còn bao nhiêu | Credit, theo `feature` |
| `assets.cost_usd` | Một tài sản cụ thể tốn bao nhiêu tiền thật | USD, theo asset |
| `ai_requests` | Một lời gọi mô hình cụ thể tốn gì và cho chất lượng gì | USD, token, giây GPU, độ trễ, điểm |

`ai_requests` là bảng mà bộ định tuyến đọc để tối ưu, và là bảng duy nhất trả lời được "mô hình nào đang đắt hơn giá trị nó tạo ra". Nó không thay `usage`: hạn mức vẫn kiểm tại điểm tạo job phía core, một lượt nghiệp vụ vẫn trừ đúng số credit đã công bố, dù bên dưới thác nghiệm đã gọi mô hình ba lần.

## 12. Ranh giới cổng AI xuyên ba repo

```
floraos-core                                 engine ngoài
────────────                                 ────────────
ai_capabilities · ai_models · ai_policies
   │
   ├── GET /integration/ai-policy       ──►  cổng AI của engine đọc chính sách
   │       năng lực được phép, mô hình đủ
   │       điều kiện, ngưỡng, sàn riêng tư
   │
   ├── POST /integration/jobs           ◄──  kiểm hạn mức trước khi chạy việc tính phí
   ├── POST /integration/usage          ◄──  credit và mức dùng
   └── POST /integration/ai-requests    ◄──  chi phí, độ trễ, điểm chất lượng mỗi lời gọi
```

**Chính sách và sổ đăng ký sống ở core, một bản.** Engine ngoài không giữ bản sao tự quyết — nó đọc và cache, và khi không đọc được thì dùng bản cache gần nhất chứ không tự nới chính sách. Một engine tự quyết mô hình nào được dùng là một engine có thể gửi ảnh khách ra một nhà cung cấp chưa ai soát.

Đây là đường ghi thứ tư của Integration API, và nó là ngoại lệ duy nhất được thêm vào ba đường của D12: nó không mang dữ liệu nghiệp vụ, chỉ mang số đo về chính lời gọi.

## 13. Tri thức ngành hoa

Mô hình đổi trong sáu tháng. Tri thức ngành hoa của ALG thì tích lại. Đây là phần không mua được và không thuê được, nên nó nằm trong cơ sở dữ liệu của ALG chứ không nằm trong prompt.

### 13.1 Một hợp đồng, không phải hai

Hợp đồng `PhanTichSanPhamHoa` là hình dạng duy nhất mà một lượt phân tích trả về, ở cả ba bộ máy. Mọi cách biểu diễn khác — bảng cho người đọc, JSON cho engine ngoài, cột trong báo cáo — là **hình chiếu** của hợp đồng đó, không phải một lược đồ thứ hai. Hợp đồng chỉ được thêm trường, không xoá và không đổi trường đã có (`YC-N3`).

Hệ quả trực tiếp: mô hình trả `"rose"` thì ALG tra danh mục loài để ra `"Hoa hồng"` và mã loài. **Mô hình không bao giờ quyết định giá trị đi vào cơ sở dữ liệu.** Không tra được thì trường mã để trống cho người soát gắn lại, và nhãn gốc của mô hình giữ nguyên ở trường dấu hiệu nhận dạng — mất nhãn gốc là mất manh mối duy nhất để người soát sửa đúng.

### 13.2 Danh mục loài

```
flower_taxonomy
├── canonical_id            mã loài, bất biến
├── name_vi · name_en       tên chuẩn
├── aliases                 bí danh cả hai ngôn ngữ, gồm nhãn mô hình thường trả
├── colors                  màu thường gặp
├── season                  mùa vụ
├── price_segment           phân khúc giá thường gặp
├── visual_features         dấu hiệu thị giác phân biệt
├── confusable_with         cặp dễ nhầm, kèm dấu hiệu phân biệt
└── embedding               vector cho truy hồi
```

Hai nguồn đã có và chưa dùng hết: danh mục 86 loài trích từ dữ liệu vận hành thật, và bảng 63 cặp dễ nhầm kèm dấu hiệu thị giác. Cặp dễ nhầm chỉ phát huy khi có bộ phân loại thị giác thật — trước đó nó là dữ liệu chờ, không phải dữ liệu chết.

### 13.3 Truy hồi tri thức

`pgvector` trên chính Postgres đang dùng. Không thêm một cơ sở dữ liệu vector riêng: một Postgres là quyết định nền của tài liệu 01 mục 1, và khối lượng tri thức của một cửa hàng hoa không đòi hơn thế.

```
knowledge_chunks
├── organization_id         tri thức thuộc tổ chức, không dùng chung
├── source_kind             product · policy · delivery · pricing · faq
│                           · brand · campaign · past_post · customer_note
├── source_id               bản ghi gốc, để truy về
├── content                 đoạn văn bản
├── embedding               vector
└── updated_at
```

**Truy hồi không phải nguồn sự thật.** Nó tìm ra *chỗ nên đọc*, rồi câu trả lời đọc từ bản ghi thật. Thứ bậc nguồn sự thật cho mọi năng lực có truy hồi:

| # | Nguồn | Ví dụ câu hỏi nó trả lời |
|---|---|---|
| 1 | Dữ liệu giao dịch | Đơn này giao chưa |
| 2 | Product Master và giá | Mẫu này bao nhiêu, còn không |
| 3 | Chính sách cửa hàng | Có giao quận này không |
| 4 | Tri thức đã nạp | Hoa này để được mấy ngày |
| 5 | Suy luận của mô hình | Gợi ý phương án trong ngân sách |

Câu hỏi "mẫu này còn không" được trả lời ở bậc 1 và 2, **không bao giờ ở bậc 4** — tìm thấy một đoạn văn bản nói về sản phẩm không phải bằng chứng sản phẩm còn hàng.

## 14. Đếm không chỉ bằng mô hình ngôn ngữ

Một câu "có khoảng mười bảy cành hồng" không dùng được cho báo giá. Đường đếm của ALG có ba kênh và một bước chốt:

```
Ứng viên từ bộ nhận dạng  ─┐
Mặt nạ từ bộ tách thực thể ─┼─► chốt số  ─►  số cuối + độ tin cậy
Số do mô hình thị giác đọc ─┘
```

`count_engine.py` đã có hàm chốt ba kênh và đã chuyển sang nguyên vẹn; đường chạy hiện mới nối kênh mô hình thị giác. Hai kênh còn lại cần hiệu chỉnh trên dữ liệu có đáp án, tức cần bộ ảnh vàng trước — đây là lý do bộ ảnh vàng là điều kiện chặn, không phải một hạng mục tài liệu.

Độ tin cậy dưới ngưỡng thì `needs_review = true`. Số của máy không bao giờ âm thầm thành số trên báo giá.

## 15. Cái gì không bao giờ gọi AI

Mười bốn việc dưới đây chạy bằng mã. Gọi mô hình cho chúng là trả tiền để nhận một kết quả kém tin cậy hơn:

đổi kích thước · cắt khung · watermark · đổi định dạng · nén · ghép video · ghi phụ đề vào khung hình · chồng logo · tính giá · tồn trạng thái sản phẩm · trạng thái đơn · lịch đăng · trạng thái xuất bản · đo SLA.

Phần sửa ảnh cũng chia hai và chỉ nửa sau mới cần mô hình:

| Tất định | Sinh |
|---|---|
| Sáng, tương phản, phơi sáng, cân bằng trắng, độ nét, kích thước, nén, watermark | Xoá khuyết điểm, đổi môi trường, dựng lại vùng thiếu, đổi nền |

## 16. Bản đồ năng lực

Một hàng cho mỗi năng lực: mức 1 chạy bằng gì, mức 2 chạy bằng gì, đường lai gồm gì, endpoint nào, `feature` nào trong `usage`, bảng nào chứa kết quả, dự phòng ra sao, và đo bằng gì.

| Mã | Mức 1 — API | Mức 2 — trọng số mở | Đường lai | Endpoint · job | Bảng | Đo bằng |
|---|---|---|---|---|---|---|
| `AIC-01` | Thị giác LLM có lược đồ ép | Florence-2 + SAM2 (`local_cv`, đã chạy) | Ba kênh + danh mục loài + luật nghiệp vụ | `POST /vision/analyses` · `vision.analyze` | `product_analyses` | Bộ ảnh vàng: đúng loài, đúng số cành |
| `AIC-02` | Trong `AIC-01` | Bộ nhận dạng + bộ tách thực thể | Chốt ba kênh | như trên | như trên | Sai số đếm trên bộ ảnh vàng |
| `AIC-03` | Trong `AIC-01` | `color_engine` (đã có, thuần numpy) | Đo tại chỗ rồi để mô hình gọi tên | như trên | như trên | Khớp tone chủ đạo do người gán |
| `AIC-04` | LLM + hồ sơ thương hiệu | LLM mở | LLM + danh mục loài + số liệu hiệu quả | `POST /vision/copies` · `product.copy.generate` | `product_copies` | Tỷ lệ bản được duyệt không sửa |
| `AIC-05` | LLM | — | Thành phần + giá vốn + quy tắc giá | trong `AIC-04` | `product_copies` | Khớp phân khúc do người gán |
| `AIC-06` | Thị giác LLM | Thị giác máy tính | Cả hai | trong job M04a | `generation_jobs.stage` | Tỷ lệ ảnh bị đánh giá sai hạng |
| `AIC-07` | API tách nền | SAM2 | SAM2 + làm sạch mặt nạ + tinh biên | trong job M04a | `assets` | Chất lượng biên trên bộ ảnh vàng |
| `AIC-08` | API sửa ảnh | Diffusion mở | Thị giác máy tính + sinh có mặt nạ bảo vệ sản phẩm | `POST /media/optimizations` · `media.optimize` | `assets` | Điểm nhận dạng sau tăng cường |
| `AIC-09` | Mã | Mã | Mã | trong job M04a | `assets` | Bốn tỉ lệ đúng khung sản phẩm |
| `AIC-10` | Gọi lại `AIC-01` hai lần | như trên | như trên | trong job M04a | `generation_jobs.result` | Chặn được thay đổi sản phẩm mô phỏng |
| `AIC-11` | API tách nền | SAM2 + mô hình tách nền | Tách + làm sạch + tinh biên + alpha matting | engine ngoài · `creative.compose` | `assets` | Biên sạch trên ảnh tối và nền lẫn màu |
| `AIC-12` | API sinh ảnh | Diffusion mở | Mặt nạ + ảnh tham chiếu + sinh + soát bố cục | engine ngoài · `creative.compose` | `assets` | Điểm toàn vẹn sản phẩm ≥ ngưỡng |
| `AIC-13` | API mở rộng khung | Diffusion mở | Phân vùng + mở khung + sinh + **mặt nạ bảo vệ sản phẩm** | engine ngoài · `creative.compose` | `assets` | Sản phẩm gốc không đổi một pixel |
| `AIC-14` | Mã | Mã | Mã | engine ngoài | `assets` | — |
| `AIC-15` | API sửa ảnh | Diffusion mở | Sinh có mặt nạ + soát | engine ngoài · `creative.compose` | `assets` | Điểm toàn vẹn sản phẩm |
| `AIC-16` | Mã | Mã | Mã | engine ngoài | `assets` | — |
| `AIC-17` | Ma trận tổ hợp, xem dưới | như trên | như trên | engine ngoài · `creative.compose` | `assets` | Số biến thể dùng được trên tổng số sinh |
| `AIC-18` | LLM | LLM mở | LLM + số liệu hiệu quả theo kênh | engine ngoài · `video.generate` | `video_jobs` | Tỷ lệ cảnh phải dựng lại |
| `AIC-19` | API sinh video | Video mở, chỉ khi giấy phép đủ điều kiện | Sinh từng cảnh + soát từng cảnh + ghép bằng mã | engine ngoài · `video.generate` | `video_jobs` · `assets` | Điểm toàn vẹn sản phẩm từng cảnh |
| `AIC-20` | FFmpeg | FFmpeg | FFmpeg | engine ngoài | `assets` | — |
| `AIC-21` | API giọng đọc | TTS mở | TTS + soát phát âm tên riêng | engine ngoài · `video.generate` | `assets` | Tên cửa hàng đọc đúng |
| `AIC-22` | API nhận dạng tiếng nói | Whisper tự vận hành | Nhận dạng + canh dòng | engine ngoài · `video.generate` | `assets` | Sai số canh dòng phụ đề |
| `AIC-23` | LLM + hồ sơ thương hiệu + sản phẩm | LLM mở | LLM + truy hồi + số liệu hiệu quả | engine ngoài · `content.generate` | `posts` · `content_queue` | Tỷ lệ duyệt không sửa · hiệu quả sau đăng |
| `AIC-24` | LLM chấm theo danh mục kiểm | LLM mở | Luật tất định + LLM | trong `AIC-23` | `ai_evaluations` | Số dữ kiện bịa lọt qua |
| `AIC-25` | LLM | LLM mở | LLM + truy hồi | engine ngoài · `catalog.generate` | `product_copies` | Tỷ lệ duyệt không sửa |
| `AIC-26` | LLM ra **kế hoạch trang dạng JSON** | LLM mở | LLM + soát lược đồ + bộ khối được phép | engine ngoài · `landing.generate` | `pages` | Trang dựng được không cần sửa tay |
| `AIC-27` | API embedding | Embedding mở | — | job nền | `knowledge_chunks` · `flower_taxonomy` | Chất lượng truy hồi ở `AIC-28` |
| `AIC-28` | Truy vấn vector + lọc SQL | như trên | Vector + lọc + xếp hạng lại | `GET /products` · `POST /conversations/:id/messages` | — | Tỷ lệ câu hỏi tìm đúng sản phẩm |
| `AIC-29` | LLM trên dữ liệu tổng hợp | LLM mở | Luật + LLM + lịch sử mua | `GET /customers` | `customers.attributes` | Tỷ lệ phân khúc người vận hành đồng ý |
| `AIC-30` | LLM | LLM mở | Luật dịp + LLM + hồ sơ thương hiệu | `POST /reminder-campaigns` · `content.generate` | `posts` | Tỷ lệ khách phản hồi |
| `AIC-31` | LLM phân loại | Mô hình phân loại mở | Luật + mô hình | `POST /conversations/:id/messages` | `conversation_messages` | Tỷ lệ định tuyến đúng ý định |
| `AIC-32` | LLM + công cụ + truy hồi | LLM mở | Bộ định tuyến + truy hồi + công cụ tất định | như trên | `conversation_messages` | Tỷ lệ trả lời dẫn được về bản ghi thật |
| `AIC-33` | SQL trước, LLM diễn giải sau | LLM mở | SQL + mô hình dự báo + LLM | `GET /analytics/*` | `campaign_rollups` | Người vận hành đồng ý với diễn giải |
| `AIC-34` | LLM trên số liệu đã tổng hợp | LLM mở | Số liệu + thử nghiệm + LLM | `GET /learning-profile` | `learning_profiles` · `content_features` | Hiệu quả bài sau khi áp hồ sơ |

> **AIC-18 hiện thực một phần (24/09/2026):** kịch bản bối cảnh theo chủ đề của Creative Studio — feature `creative.scene_plan` (1 credit, giá tạm), `callCapability("video_storyboard")` qua `OpenAILLMProvider`, kênh chấm `plan_valid` = 1 khi đầu ra qua `normalizeAiScenePlan` (sai số cảnh / thiếu bối cảnh → thất bại, hoàn credit). Hai mô hình `openai_structured`/`openai_direct` được thêm `AIC-18` trong `seed-ai-registry.ts` — phải chạy lại `npm run db:seed`. Kịch bản lưu ở `generation_jobs.output`; Khu vực D dùng bối cảnh từng cảnh, Khu vực C dùng lời thoại. Chưa dùng cho storyboard video (E) và cung truyện của Khu vực B (`planNarrativeArc` vẫn theo luật) — nợ #125.

> **Sửa tại chỗ Chặng 07 (24/09/2026):** `creative.scene_revise` dùng `AIC-18` (sửa một cảnh, ghi đè `output` của job `creative.scene_plan` qua `replaceOutput`); `creative.content_rewrite` dùng `AIC-23 content_generation` (kênh chấm `factual/brand/platform/readability` bằng luật tất định + `checkFlowerContent`). Seed thêm `AIC-23` cho hai mô hình OpenAI.

> **AIC-17 hiện thực (23/09/2026):** hai feature job — `media.variant` (Studio Backdrop cục bộ, `cost_usd = None`) và `media.variant.cloud` (Stability `stable-image-core-v2beta` chỉ sinh HẬU CẢNH trống, bó hoa dán nguyên khối từ Master, Subject Integrity đo như nhánh local). Mỗi lượt gọi nhà cung cấp ghi một dòng `ai_requests` (`capability_code = AIC-17`, `model_key = stability_ai:stable-image-core-v2beta`, `outcome` ACCEPTED/FAILED); nhà cung cấp lỗi thì lùi về phông cục bộ, không làm hỏng job. Mô hình Stability chưa có hàng trong `ai_models` (D18 — bốn ô giấy phép) — cần đăng ký trước go-live, xem `TECHNICAL_DEBT.md` #121 ghi chú.

**Biến thể ảnh sinh theo ma trận, không sinh rời rạc.** Năm mươi lượt gọi độc lập cho năm mươi ảnh là năm mươi lần trả tiền cho cùng một hiểu biết về sản phẩm. Đường đúng: `sản phẩm × nền × bố cục × tỉ lệ × chiến dịch`, sinh theo tổ hợp rồi lọc trùng — năm nền nhân ba bố cục nhân ba tỉ lệ ra bốn mươi lăm tài sản từ một Master Image.

**Trang landing không do mô hình sinh HTML.** Mô hình sinh *kế hoạch trang* dạng JSON, lược đồ soát nó, rồi bộ dựng ghép từ các khối đã được phép. Một mô hình sinh HTML tự do là một mô hình có thể sinh ra trang không mở được trên điện thoại, không đúng thương hiệu, và không ai sửa nổi.

## 17. Sự kiện miền

Chuỗi giá trị ở PRD mục 6 là một chuỗi sự kiện, không phải một hàm gọi chín bước. Mỗi bước phát một sự kiện; bước sau đăng ký nghe chứ không bị bước trước gọi tên.

```
product.analyzed        → gợi ý sinh dữ liệu bán hàng, gợi ý tối ưu ảnh
product.copy.approved   → sản phẩm đủ điều kiện vào catalog
media.master.approved   → mở đường cho biến thể và video
creative.approved       → mở đường cho nội dung theo kênh
content.approved        → vào lịch đăng
content.published       → mở đường thu số liệu
post.metrics.updated    → nuôi hồ sơ phong cách
learning.updated        → đổi tham số soạn nội dung cho lượt sau
```

**Sự kiện là gợi ý, không phải lệnh chạy.** `product.analyzed` không tự sinh video. Nó làm thẻ chức năng kế tiếp sáng lên trên màn hình, và người dùng bấm. Đây là chỗ dễ hiểu sai nhất của một hệ điều hành: một chuỗi tự động chạy hết sẽ tiêu hết credit của người dùng trước khi họ hiểu mình vừa tiêu vào việc gì, và nó đi thẳng qua năm cổng duyệt.

## 18. Bậc trưởng thành

| Bậc | Nội dung | ALG |
|---|---|---|
| 1 | Gọi API AI | Đã qua |
| 2 | AI cộng tri thức của cửa hàng | Đang ở đây — hồ sơ thương hiệu và danh mục loài đã có, truy hồi chưa có |
| 3 | Thêm trọng số mở cho việc khối lượng lớn | `local_cv` đã có, chưa đo |
| 4 | Đường lai nhiều mô hình cộng thị giác máy tính | `count_engine` ba kênh, mới nối một kênh |
| 5 | Trí tuệ riêng của ngành hoa | Cần dữ liệu tích từ vận hành thật |

Bậc 4 và bậc 5 là phần không ai sao chép được trong sáu tháng. Bậc 1 thì ai cũng làm được trong một tuần — nên giá trị lâu dài của ALG không nằm ở việc gọi được mô hình nào, mà nằm ở danh mục loài, bộ ảnh có nhãn, cặp *máy đoán gì / người sửa thành gì*, và số liệu hiệu quả theo từng cửa hàng.

## 19. Bản đồ công nghệ

| Tầng | Chọn |
|---|---|
| Web và API | Next.js, TypeScript, Node 22 |
| Xử lý ảnh và video | Python 3.11 |
| Cơ sở dữ liệu | PostgreSQL 16 |
| Vector | `pgvector` trên chính Postgres đó |
| Hàng đợi | Bảng `generation_jobs` trên Postgres, `FOR UPDATE SKIP LOCKED` + `LISTEN/NOTIFY` |
| Kho tệp | Tương thích S3, URL ký sẵn |
| Cổng AI | Lớp trong `floraos-core`, không phải dịch vụ riêng |
| Sổ đăng ký và chính sách | Bảng trong Postgres, đọc qua Integration API bởi engine ngoài |
| Dựng video | FFmpeg, cấu hình build khoá theo giấy phép |
| Quan sát | Nhật ký có cấu trúc mang `organization_id` và `job_id`, số đo theo trạng thái job |

Ba chỗ bản đồ này khác với khuyến nghị thường gặp, và cả ba là quyết định đã chốt chứ không phải thiếu sót:

- **Không Redis, không hàng đợi ngoài.** D6-1 chốt Postgres làm hàng đợi. Một hàng đợi thứ hai là một nguồn sự thật thứ hai về trạng thái job, và trạng thái job là thứ đã hỏng một lần ở hệ v1 vì nằm trong bộ nhớ tiến trình.
- **Không dịch vụ cổng AI riêng.** Lý do ở mục 3.
- **Không cơ sở dữ liệu vector riêng.** Lý do ở mục 13.3.

---

## Phụ lục A — giá trị seed của `ai_capabilities`

Bảng này là nội dung nạp lần đầu cho `ai_capabilities`. Cột ngưỡng để trống ở đâu thì ở đó chưa có dữ liệu có đáp án để đặt (D20, nợ #72) — trống là trạng thái đúng, và cổng AI đối xử với nó là "chấm điểm, ghi lại, không chặn".

| Mã | `kind` | `needs_approval` | `privacy_floor` | Kênh chấm | Ngưỡng |
|---|---|---|---|---|---|
| `AIC-01` | generative | có | `shop` | `component`, `count`, `taxonomy`, `attribute` | chưa đo |
| `AIC-02` | generative | trong `AIC-01` | `shop` | `count` | chưa đo |
| `AIC-03` | measuring | trong `AIC-01` | `shop` | `color` | chưa đo |
| `AIC-04` | generative | có | `shop` | `factual`, `brand`, `readability` | chưa đo |
| `AIC-05` | generative | trong `AIC-04` | `shop` | `factual` | chưa đo |
| `AIC-06` | measuring | không | `shop` | `quality` | chưa đo |
| `AIC-07` | generative | không | `shop` | `mask_edge` | chưa đo |
| `AIC-08` | generative | có | `shop` | `product_integrity`, `artifact`, `composition` | chưa đo |
| `AIC-09` | deterministic | không | `shop` | — | — |
| `AIC-10` | measuring | không | `shop` | `identity`, `color`, `geometry`, `component_consistency` | **0,95 / 0,90 — đã chốt** |
| `AIC-11` | generative | không | `public` | `mask_edge` | chưa đo |
| `AIC-12` | generative | có | `public` | `product_integrity`, `composition` | chưa đo |
| `AIC-13` | generative | có | `public` | `product_integrity`, `artifact` | chưa đo |
| `AIC-14` | deterministic | không | `public` | — | — |
| `AIC-15` | generative | có | `public` | `product_integrity`, `artifact` | chưa đo |
| `AIC-16` | deterministic | không | `public` | — | — |
| `AIC-17` | generative | có | `public` | `product_integrity`, `composition` | chưa đo |
| `AIC-18` | generative | không | `shop` | `plan_valid` | chưa đo |
| `AIC-19` | generative | có | `public` | `product_integrity`, `motion`, `audio`, `subtitle` | chưa đo |
| `AIC-20` | deterministic | không | `public` | — | — |
| `AIC-21` | generative | không | `public` | `pronunciation` | chưa đo |
| `AIC-22` | generative | không | `public` | `alignment` | chưa đo |
| `AIC-23` | generative | có | `shop` | `factual`, `brand`, `platform`, `readability` | chưa đo |
| `AIC-24` | measuring | không | `shop` | `factual`, `brand`, `platform` | chưa đo |
| `AIC-25` | generative | có | `shop` | `factual`, `brand`, `readability` | chưa đo |
| `AIC-26` | generative | có | `shop` | `plan_valid`, `brand` | chưa đo |
| `AIC-27` | generative | không | `shop` | — | — |
| `AIC-28` | measuring | không | `shop` | `retrieval_hit` | chưa đo |
| `AIC-29` | generative | không | `sensitive` | `segment_agreement` | chưa đo |
| `AIC-30` | generative | có | `shop` | `factual`, `brand` | chưa đo |
| `AIC-31` | generative | không | `shop` | `intent_match` | chưa đo |
| `AIC-32` | generative | không | `shop` | `source_grounded` | chưa đo |
| `AIC-33` | generative | không | `shop` | `operator_agreement` | chưa đo |
| `AIC-34` | generative | không | `shop` | `sample_size`, `effect_measured` | chưa đo |

Ba điểm cần đọc kỹ trong bảng trên:

**`AIC-29` là năng lực duy nhất mang sàn `sensitive`** — phân khúc khách hàng đọc hồ sơ và lịch sử mua của người thật. Nó chạy tại chỗ, và đó là lý do phân khúc khách hàng không phải một lời gọi LLM thương mại dù nghe như một việc LLM làm tốt.

**`AIC-30` mang sàn `shop`, không phải `sensitive`**, và điều đó chỉ đúng vì nội dung nhắc mua sinh từ **dịp và sản phẩm**; tên, số điện thoại, địa chỉ ghép ở tầng gửi sau khi mô hình đã xong việc (`YC-K3`, `YC-K4`). Nếu có ai đưa tên khách vào prompt thì năng lực này phải đổi sàn, và đó là một thay đổi kiến trúc chứ không phải một dòng prompt.

**Bốn năng lực `deterministic` không có kênh chấm và không có ngưỡng** vì không có gì để chấm — chúng không gọi mô hình. Chúng nằm trong bảng để chính sách, sổ chi phí và phép đo có cùng một hình dạng cho mọi năng lực.

---

## Phụ lục B: Tiến độ Xây dựng 34 AI Capabilities (Hợp nhất từ CHECKLIST_AI_CAPABILITIES_BUILD.md)

Hạng mục này theo dõi chi tiết kỹ thuật chuyên sâu cho tầng AI Orchestration Engine, AI Registry, Cổng Provider và Bộ định tuyến:

### 1. Trạng thái Nền tảng (Phase 0 Foundation — ĐÃ HOÀN TẤT)
- [x] 34 AI Capabilities định nghĩa chuẩn trong `src/core/ai/domain/ai-capabilities.ts`
- [x] 10 Provider ports tại `src/core/ports/` (Hexagonal Architecture)
- [x] Bảng `ai_capabilities`, `ai_models` + 4 cổng giấy phép (License, Commercial Use, Territory, Allowed Use)
- [x] Bộ định tuyến AI Router (5 ràng buộc), đánh giá chất lượng, sàn quyền riêng tư Sensitive Floor
- [x] Cổng gateway `callCapability` + `wiring.ts`
- [x] `ai_policies` theo tổ chức, `GET/PUT /ai-policy` (`U1`/`U2`)
- [x] Ghi nhận `ai_requests`, chấm điểm `ai_evaluations`
- [x] RBAC: `U1`–`U4` (119 capabilities, 34 trần cứng)
- [x] Hạ tầng Job `generation_jobs` 3 trục, `enqueueJob`, Worker `claimNext` (`SKIP LOCKED`)
- [x] Ghi nhận mức dùng `usage` tập trung tại điểm tạo job

### 2. Giao diện Chọn Tính năng & Định mức Credit (Phase 1 — ĐÃ HOÀN TẤT)
- [x] Thư viện Feature Catalog `src/lib/feature-catalog.ts` ánh xạ 34 AIC $\rightarrow$ RBAC $\rightarrow$ Module
- [x] Thành phần `FeaturePicker.tsx` tích hợp trên giao diện điều phối
- [x] Định mức Credit `credit-estimator.ts` (Phán quyết PO 23/09/2026: giai đoạn dev permissive 0 credit, đo lường chi phí thật trước khi chốt giá thương mại)
