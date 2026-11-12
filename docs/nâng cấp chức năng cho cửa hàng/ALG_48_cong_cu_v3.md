# FloraOS — 48 công cụ: Input · Process · Outputs · Actions · Phân tích · Giá trị và cách ứng dụng

## 1. Cách đọc tài liệu

Mỗi công cụ được mô tả theo 5 phần cố định, cộng với dòng nêu cách chuỗi sử dụng và hai dòng về giá trị ứng dụng:

| Phần | Nội dung |
|---|---|
| **Input** | Dữ liệu, nội dung, lựa chọn mà người dùng hoặc hệ thống cần cung cấp để công cụ chạy. |
| **Process** | Các bước xử lý của công cụ từ input đến output. |
| **Outputs** | Kết quả cụ thể tạo ra (file, link, trang, bảng, lịch...). |
| **Actions** | Các thao tác người dùng thực hiện được với kết quả: chỉnh sửa, duyệt, chia sẻ, gửi, xuất bản, tải về, chuyển sang công cụ khác. |
| **Phân tích** | Các chỉ số công cụ ghi nhận, và quyết định kinh doanh mà chỉ số đó hỗ trợ. |
| **Cấp chuỗi** | Cách chuỗi dùng chức năng này khi quản lý nhiều cửa hàng. |
| **Giá trị ứng dụng thực tế** | Lợi ích kinh doanh cụ thể mà chức năng mang lại cho cửa hàng hoặc chuỗi. |
| **Cách ứng dụng vào thực tế** | Tình huống sử dụng cụ thể, theo từng bước, trong công việc hằng ngày. |

## 2. Nguyên tắc về nhãn phân loại và quyền sử dụng

- **Nhãn** (Cửa hàng / Cả hai / Chuỗi) chỉ để **gắn nhãn chuyên biệt** cho chức năng, giúp nhận biết chức năng được thiết kế chủ yếu cho ai. Nhãn **không giới hạn** quyền sử dụng của chuỗi.
- **Chuỗi được sử dụng đầy đủ cả 48 chức năng.** Với mỗi chức năng, chuỗi có thể:
  1. **Dùng trực tiếp** cho thương hiệu chuỗi hoặc cho các cửa hàng do chuỗi trực tiếp vận hành.
  2. **Tạo mẫu và phát hành** xuống các cửa hàng thành viên (nội dung, mẫu, quy trình, bảng giá, tiêu chuẩn).
  3. **Xem kết quả tổng hợp** của các cửa hàng thành viên, theo quyền được cấp.
- **Cửa hàng độc lập** dùng 41 chức năng mang nhãn *Cửa hàng* và *Cả hai*. Bảy chức năng 42–48 mang nhãn *Chuỗi* vì chúng chỉ có ý nghĩa khi có mạng lưới nhiều cửa hàng.

| Nhãn | Số lượng | Công cụ | Chuỗi dùng | Cửa hàng dùng |
|---|---|---|---|---|
| **Cửa hàng** | 21 | 09, 11, 13, 14, 15, 18, 19, 20, 22, 26, 27, 28, 30, 33, 35, 36–41 | Có | Có |
| **Cả hai** | 20 | 01–08, 10, 12, 16, 17, 21, 23, 24, 25, 29, 31, 32, 34 | Có | Có |
| **Chuỗi** | 7 | 42–48 | Có | Không |
| **Tổng quyền sử dụng** | 48 | | **48** | **41** |

---

## Nhóm 1 — Tạo hình ảnh và nội dung bán hàng

**Mục tiêu:** Biến ảnh chụp, ý tưởng và thông tin sản phẩm thành tài liệu bán hàng sẵn sàng đăng và gửi khách.

### 01. Tạo ảnh sản phẩm chuyên nghiệp
**Nhãn:** Cả hai

**Phương án xử lý mặc định:** gọi API của dịch vụ AI xử lý ảnh. Giữa công cụ và nhà cung cấp API có một lớp trung gian, để đổi nhà cung cấp mà không phải đổi giao diện hay tiêu chuẩn đầu ra. Chỉnh ảnh bằng bộ lọc thông thường chỉ là phương án dự phòng khi API lỗi hoặc ảnh không đạt sau số lần thử tối đa.

- **Input:** Ảnh chụp thô của sản phẩm (một hoặc nhiều ảnh, mỗi ảnh xử lý riêng); tùy chọn: tên mẫu, preset phông nền (trắng, kem, xám nhạt, nền thương hiệu), tỉ lệ khung hình; cấu hình thương hiệu (màu nền ưa dùng).
- **Process:**
  1. Kiểm tra ảnh đầu vào: độ phân giải tối thiểu, độ mờ, sản phẩm có nằm trọn trong khung không. Nếu không đạt thì hướng dẫn chụp lại.
  2. Dựng prompt JSON: lấy các tiêu chí trong bản Tiêu chuẩn đầu ra (mục 01.1), điền theo lựa chọn của người dùng và cấu hình thương hiệu (mục 01.2).
  3. Gọi API AI xử lý ảnh với ảnh gốc và prompt. Nếu API chỉ nhận prompt dạng văn bản, lớp trung gian chuyển JSON thành văn bản và tham số theo từng nhà cung cấp.
  4. Kiểm tra tự động: một lệnh gọi AI thị giác so sánh ảnh kết quả với ảnh gốc và với bản Tiêu chuẩn đầu ra, trả kết quả dạng JSON (mục 01.3).
  5. Quyết định theo quy tắc ở mục 01.4: đạt thì trả kết quả; không đạt thì điều chỉnh prompt theo tiêu chí lỗi và thử lại; vẫn không đạt thì dùng phương án dự phòng hoặc báo người dùng.
- **Outputs:** Ảnh sản phẩm hoàn chỉnh (PNG hoặc JPG), ảnh gốc để đối chiếu, và bản tóm tắt kiểm tra chất lượng lấy từ JSON kết quả.
- **Actions:** Duyệt ảnh trước khi dùng; yêu cầu xử lý lại kèm ghi chú (ví dụ "nền kem hơn"); đổi preset nền; tải về; lưu vào thư viện sản phẩm; chuyển tiếp sang công cụ 02, 03, 13.
- **Phân tích:** Tỉ lệ đạt ngay lần đầu; số lần thử lại trung bình; tiêu chí hay trượt nhất; chi phí API và thời gian xử lý trên mỗi ảnh; tỉ lệ ảnh được người dùng giữ lại; ảnh nào được dùng đăng và hiệu quả nhất. Giúp tinh chỉnh prompt, chọn nhà cung cấp và kiểm soát chi phí.
- **Cấp chuỗi:** Chuỗi quản lý bản Tiêu chuẩn đầu ra và preset nền thương hiệu dùng chung; cấu hình nhà cung cấp API và hạn mức chi phí cho từng cửa hàng; xem chất lượng và chi phí tổng hợp.
- **Giá trị ứng dụng thực tế:** Cửa hàng có ảnh bán hàng đồng đều và đẹp chỉ từ ảnh chụp bằng điện thoại, tiết kiệm chi phí chụp chuyên nghiệp. Chất lượng không phụ thuộc may rủi vì có tiêu chuẩn rõ ràng, và kiểm tra tự động giảm công duyệt thủ công.
- **Cách ứng dụng vào thực tế:** Thợ chụp bó hoa vừa làm xong bằng điện thoại tại quầy → tải lên, chọn nền kem → nhận ảnh đã xử lý, xem bản tóm tắt kiểm tra → duyệt và lưu vào thư viện → dùng ngay cho link bán hàng, thẻ chào, catalog. Với chuỗi: đặt nền thương hiệu một lần để mọi cửa hàng cho ra ảnh cùng phong cách.

#### 01.1 Tiêu chuẩn đầu ra (nguồn chuẩn để tạo prompt và để kiểm tra)

Mỗi tiêu chí có một mã. Cùng một mã được dùng ở ba nơi: trong prompt gửi API, trong bước kiểm tra tự động, và trong báo cáo phân tích. Nhờ vậy chỉ có một "nguồn sự thật" duy nhất, lưu thành file cấu hình (ví dụ `output_standard.json`) và chuỗi có thể quản lý tập trung.

| Mã | Tiêu chí | Chuẩn đạt | Loại |
|---|---|---|---|
| `product_fidelity` | Giữ nguyên sản phẩm | Cùng loại hoa, số lượng, màu chủ đạo, hình dáng bó và kiểu gói như ảnh gốc | Bắt buộc |
| `forbidden_content` | Nội dung cấm | Không có chữ, logo, watermark, hoa thêm, người | Bắt buộc |
| `truthfulness` | Trung thực | Không làm hoa tươi hơn, đầy hơn hoặc sang hơn thực tế sản phẩm giao | Bắt buộc |
| `background` | Phông nền | Sạch, đúng preset, không vật lạ, viền chủ thể tự nhiên | Chấm điểm |
| `lighting` | Ánh sáng | Đều, không cháy sáng, không tối mảng, không bóng gắt, không ám màu | Chấm điểm |
| `color` | Màu sắc | Sát màu ảnh gốc, màu chủ đạo không đổi tông | Chấm điểm |
| `composition` | Bố cục | Sản phẩm chiếm khoảng 60–80% khung, căn giữa, lề đều, không cắt mất cành hay giấy gói | Chấm điểm |
| `technical` | Chất lượng kỹ thuật | Cạnh dài tối thiểu khoảng 2048 px, cánh hoa nét, không nhiễu, không méo, không vệt lỗi do AI | Chấm điểm |

Các con số trong bảng là **đề xuất ban đầu**, cần điều chỉnh sau khi thử với ảnh thật của cửa hàng.

#### 01.2 Prompt JSON gửi API (mẫu)

```json
{
  "task": "product_photo_enhance",
  "standard_ref": "output_standard_v1",
  "product": {
    "type": "bouquet",
    "name": "Bó hồng đỏ",
    "dominant_colors": ["red", "green"]
  },
  "preserve": {
    "flower_types": true,
    "flower_count": true,
    "colors": true,
    "shape_and_wrapping": true
  },
  "background": { "preset": "soft_cream", "clean": true, "objects_allowed": false },
  "lighting": { "type": "soft_even_studio", "avoid": ["harsh_shadow", "overexposed", "color_cast"] },
  "composition": {
    "subject_fill_percent": [60, 80],
    "alignment": "center",
    "even_margin": true,
    "no_cropping_of_product": true
  },
  "quality": { "min_long_edge_px": 2048, "sharp_petals": true, "no_artifacts": true },
  "forbidden": ["text", "logo", "watermark", "extra_flowers", "people"],
  "output": { "format": "png", "aspect_ratio": "1:1", "count": 1 }
}
```

Mỗi khối trong prompt tương ứng một mã trong bản Tiêu chuẩn đầu ra. Khi chuẩn thay đổi, prompt tự thay đổi theo, không cần sửa tay.

#### 01.3 Kết quả kiểm tra JSON (mẫu)

```json
{
  "status": "pass",
  "overall_score": 0.92,
  "criteria": {
    "product_fidelity":  { "pass": true, "score": 0.96 },
    "forbidden_content": { "pass": true, "score": 1.0 },
    "truthfulness":      { "pass": true, "score": 0.95 },
    "background":        { "pass": true, "score": 0.93 },
    "lighting":          { "pass": true, "score": 0.9 },
    "color":             { "pass": true, "score": 0.91 },
    "composition":       { "pass": true, "score": 0.88 },
    "technical":         { "pass": true, "score": 0.9 }
  },
  "failed_criteria": [],
  "retry_hint": null
}
```

Điểm do mô hình thị giác ước lượng, nên chỉ là cơ sở để lọc tự động. Quyết định cuối cùng vẫn thuộc về cửa hàng ở bước duyệt ảnh.

#### 01.4 Quy tắc xử lý khi không đạt

- Trượt bất kỳ tiêu chí **Bắt buộc** → coi là không đạt, không đưa cho người dùng như kết quả cuối.
- Các tiêu chí **Chấm điểm** → đạt khi mỗi tiêu chí từ 0.8 trở lên (đề xuất).
- Không đạt → lấy `failed_criteria` và `retry_hint` bổ sung vào prompt, thử lại tối đa 2 lần (đề xuất).
- Vẫn không đạt → chuyển phương án dự phòng (chỉnh ảnh cơ bản) hoặc báo người dùng và gợi ý chụp lại.

### 02. Tạo bộ ảnh sản phẩm từ một ảnh gốc
**Nhãn:** Cả hai

**Phương án xử lý mặc định:** gọi API của dịch vụ AI xử lý ảnh, dùng cùng lớp trung gian, cùng bản Tiêu chuẩn đầu ra (mục 01.1) và cùng cơ chế prompt JSON như công cụ 01. Công cụ 02 bổ sung hai thứ: tiêu chí **nhất quán giữa các ảnh trong bộ** (mọi ảnh phải là cùng một sản phẩm) và **danh sách biến thể** (tỉ lệ × phong cách × góc chụp).

**Phát triển theo giai đoạn:** giai đoạn 1 làm ngay (nhiều tỉ lệ, nhiều phong cách, nhiều góc); giai đoạn 2 phát triển sau (bối cảnh sáng tạo). Chi tiết ở mục 02.1.

- **Input:** Ảnh gốc (nên là kết quả của công cụ 01); lựa chọn tỉ lệ, phong cách, góc chụp hoặc chọn theo kênh đích (catalog, website, quảng cáo, story, reels). Tùy chọn: ảnh tham chiếu từ góc khác do cửa hàng tự chụp, để tăng độ chính xác khi tạo góc mới. Giai đoạn 2: chọn bối cảnh.
- **Process:**
  1. Kiểm tra ảnh gốc đã đạt bản Tiêu chuẩn đầu ra chưa; nếu chưa, gợi ý chạy công cụ 01 trước.
  2. Dựng danh sách biến thể từ lựa chọn (tỉ lệ × phong cách × góc), giới hạn số biến thể mỗi lần để kiểm soát chi phí.
  3. Dựng prompt JSON cho từng biến thể (mục 02.3).
  4. Gọi API AI tạo từng ảnh.
  5. Kiểm tra từng ảnh theo bản Tiêu chuẩn, và kiểm tra **nhất quán cả bộ** (cùng một sản phẩm so với ảnh gốc).
  6. Ảnh không đạt thì tạo lại tối đa số lần cho phép; vẫn không đạt thì loại khỏi bộ và báo rõ.
  7. Đặt tên file theo quy ước, đóng gói, tạo bảng chỉ mục JSON của bộ ảnh.
- **Outputs:**
  - **Giai đoạn 1:** Bộ ảnh nhiều tỉ lệ, nhiều phong cách, nhiều góc cạnh của cùng một sản phẩm; kèm bảng chỉ mục (ảnh nào, tỉ lệ, phong cách, góc, trạng thái kiểm tra).
  - **Giai đoạn 2:** Thêm ảnh bối cảnh sáng tạo (sản phẩm trong khung cảnh).
- **Actions:** Chọn ảnh nào giữ lại; tạo lại từng ảnh; thêm hoặc bớt biến thể; tải cả bộ hoặc từng ảnh; đẩy thẳng vào catalog, link bán hàng, thẻ chào; lên lịch đăng theo kênh.
- **Phân tích:** Tỉ lệ ảnh đạt kiểm tra theo từng loại biến thể (tỉ lệ, phong cách, góc); góc nào hay lỗi; ảnh nào, kênh nào có tương tác cao nhất; chi phí API trên mỗi bộ ảnh; số ảnh tạo ra trên mỗi ảnh gốc. Giúp biết biến thể nào đáng tạo và biến thể nào gây tốn chi phí mà ít hiệu quả.
- **Cấp chuỗi:** Chuỗi định nghĩa preset phong cách theo dịp và thương hiệu, giới hạn số biến thể và ngân sách mỗi cửa hàng, phát bộ ảnh chuẩn cho sản phẩm chủ lực; so sánh hiệu quả ảnh giữa các khu vực.
- **Giá trị ứng dụng thực tế:** Từ một lần chụp, cửa hàng có đủ ảnh cho mọi kênh và đủ góc nhìn để khách hình dung sản phẩm, không phải chụp lại nhiều lần. Chuỗi có bộ ảnh đồng bộ phong cách cho toàn hệ thống.
- **Cách ứng dụng vào thực tế:** Sau khi có ảnh đạt chuẩn từ công cụ 01 → chọn "bộ đăng bán" gồm 1:1 cho catalog, 4:5 cho bài đăng, 9:16 cho story, mỗi tỉ lệ vài góc → hệ thống tạo và kiểm tra → cửa hàng loại ảnh không ưng → đẩy bộ ảnh vào catalog và link bán hàng. Dịp Tết: chọn thêm phong cách nền theo dịp để làm bộ ảnh riêng. Giai đoạn sau: chọn thêm bối cảnh "quầy lễ tân" cho mẫu hoa văn phòng.

#### 02.1 Phạm vi theo giai đoạn

| Hạng mục | Giai đoạn 1 (làm ngay) | Giai đoạn 2 (phát triển sau) |
|---|---|---|
| Tỉ lệ khung hình | 1:1, 4:5, 9:16, 16:9 | Thêm tỉ lệ cho in ấn (A4, A5) và tỉ lệ tùy chỉnh |
| Phong cách | Nền sáng, nền tối, nền theo dịp hoặc mùa, nền thương hiệu | Phong cách tùy biến theo nhận diện của từng chuỗi |
| Góc chụp | Chính diện (gốc), nghiêng trái, nghiêng phải (biên độ nhỏ), nhìn từ trên xuống, cận cảnh chi tiết | Góc thấp, góc ba phần tư mở rộng, ảnh xoay nhiều góc |
| Bối cảnh sáng tạo | Chưa có | Sản phẩm trong khung cảnh: bàn tiệc, phòng khách, quầy lễ tân, bàn làm việc, hộp quà, bối cảnh theo dịp lễ |
| Kiểm tra | Từng ảnh theo bản Tiêu chuẩn và nhất quán cả bộ | Thêm kiểm tra bối cảnh hợp lý: tỉ lệ vật thể, ánh sáng, bối cảnh không che hoặc làm sai sản phẩm |

#### 02.2 Lưu ý về độ trung thực của góc chụp mới

Góc nhìn mới tạo từ một ảnh gốc là AI **dựng thêm phần không có trong ảnh** (ví dụ mặt sau, bên hông của bó hoa), nên có thể khác sản phẩm thật. Đây là rủi ro đáng chú ý với hoa, vì khách kỳ vọng nhận đúng như ảnh. Cách giảm rủi ro, nên đưa vào thiết kế từ giai đoạn 1:

1. Giới hạn biên độ góc nghiêng ở mức nhỏ (đề xuất tối đa khoảng 30°); các góc xa hơn chỉ mở khi có ảnh tham chiếu thật.
2. Cho phép tải thêm ảnh góc khác do cửa hàng chụp để làm tham chiếu.
3. Kiểm tra nhất quán với ảnh gốc ở từng ảnh (`product_fidelity`, `truthfulness`).
4. Đánh dấu nội bộ các ảnh do AI dựng góc mới, và yêu cầu cửa hàng duyệt từng ảnh trước khi dùng.
5. Không dùng ảnh dựng làm cam kết về sản phẩm giao nếu cửa hàng chưa xác nhận.

#### 02.3 Prompt JSON mẫu (giai đoạn 1)

```json
{
  "task": "product_image_set",
  "source_image": "img_001",
  "standard_ref": "output_standard_v1",
  "phase": 1,
  "variants": [
    { "id": "v1", "aspect_ratio": "1:1",  "style": "light_background", "angle": "front" },
    { "id": "v2", "aspect_ratio": "4:5",  "style": "seasonal_tet",     "angle": "left_15deg" },
    { "id": "v3", "aspect_ratio": "9:16", "style": "dark_background",  "angle": "top_down" },
    { "id": "v4", "aspect_ratio": "1:1",  "style": "light_background", "angle": "close_up_detail" }
  ],
  "preserve": {
    "flower_types": true,
    "flower_count": true,
    "colors": true,
    "shape_and_wrapping": true
  },
  "consistency": { "same_product_across_set": true },
  "forbidden": ["text", "logo", "watermark", "extra_flowers", "people"]
}
```

Giai đoạn 2 chỉ cần thêm khối bối cảnh vào từng biến thể, không đổi cấu trúc:

```json
{ "id": "v5", "aspect_ratio": "4:5", "style": "light_background", "angle": "front",
  "scene": { "type": "reception_desk", "mood": "warm", "product_must_stay_dominant": true } }
```

#### 02.4 Kết quả kiểm tra JSON của bộ ảnh (mẫu)

```json
{
  "status": "partial_pass",
  "set_consistency": { "same_product": true, "score": 0.9 },
  "variants": [
    { "id": "v1", "status": "pass" },
    { "id": "v2", "status": "pass" },
    { "id": "v3", "status": "fail", "failed_criteria": ["product_fidelity"],
      "retry_hint": "Giữ đúng số lượng cành hồng và màu giấy gói như ảnh gốc" },
    { "id": "v4", "status": "pass" }
  ]
}
```

### 03. Tạo thẻ chào sản phẩm
**Nhãn:** Cả hai
- **Input:** Ảnh mẫu hoa, tên mẫu, giá, vài điểm nổi bật, thông điệp ngắn; chọn mẫu thiết kế.
- **Process:** Chọn bố cục theo mẫu thiết kế → đặt ảnh, chữ, giá, logo → tự cân đối phông chữ và màu theo thương hiệu → xuất nhiều kích thước.
- **Outputs:** Thẻ giới thiệu mẫu hoa dạng ảnh, sẵn sàng gửi hoặc đăng.
- **Actions:** Sửa chữ, giá; đổi mẫu thiết kế; tải về; gửi qua Zalo/Messenger; đưa vào catalog; chèn vào link bán hàng.
- **Phân tích:** Số thẻ đã tạo và gửi; mẫu hoa nào được gửi nhiều; tỉ lệ khách phản hồi hoặc đặt sau khi nhận thẻ. Giúp biết mẫu hoa và kiểu thẻ nào chốt đơn tốt.
- **Cấp chuỗi:** Phát mẫu thẻ theo bộ nhận diện chung (liên kết công cụ 45); cửa hàng chỉ điền ảnh, tên, giá.
- **Ranh giới:** 03 là tài liệu quảng bá dạng ảnh, dùng để xem, gửi và đăng; không có chức năng đặt hàng. Công cụ 13 là trang có chức năng đặt mua. Hai công cụ dùng chung dữ liệu sản phẩm; thẻ chào nên gắn link hoặc QR dẫn sang link bán hàng.
- **Giá trị ứng dụng thực tế:** Biến mỗi mẫu hoa thành một thẻ giới thiệu nhất quán, gửi được ngay khi khách đang hỏi; giảm việc nhắn từng dòng giá và mô tả; tạo cảm giác chuyên nghiệp khi tư vấn qua tin nhắn.
- **Cách ứng dụng vào thực tế:** Khách hỏi "có mẫu nào khoảng 600 nghìn không?" → nhân viên chọn 3 mẫu → tạo thẻ chào → gửi qua Zalo kèm link bán hàng. Đầu tuần đăng thẻ mẫu bán chạy lên fanpage. In thẻ khổ nhỏ đặt tại quầy kèm QR.

### 04. Tạo nội dung bán hàng
**Nhãn:** Cả hai
- **Input:** Ảnh hoặc thông tin sản phẩm (loại hoa, dịp, giá, đối tượng tặng); kênh đăng; giọng văn mong muốn.
- **Process:** Nhận diện đặc điểm sản phẩm → chọn góc nội dung theo dịp và đối tượng → viết tên gợi ý, mô tả, tiêu đề, caption, hashtag, CTA → điều chỉnh độ dài theo kênh.
- **Outputs:** Bộ nội dung chữ: tên, mô tả, tiêu đề, caption, CTA, hashtag.
- **Actions:** Chọn phiên bản; chỉnh sửa; yêu cầu viết lại theo giọng khác; sao chép; gắn vào link bán hàng hoặc thẻ chào.
- **Phân tích:** Phiên bản nội dung/CTA nào có tương tác, lượt nhấp cao; kênh nào hiệu quả hơn. Giúp rút ra kiểu viết phù hợp với khách của cửa hàng.
- **Cấp chuỗi:** Đặt sẵn giọng văn thương hiệu, cụm từ bắt buộc và cụm từ cấm để cửa hàng viết đồng nhất.
- **Giá trị ứng dụng thực tế:** Tiết kiệm thời gian viết, giữ chất lượng nội dung đều giữa các bài và tăng tương tác nhờ CTA rõ ràng.
- **Cách ứng dụng vào thực tế:** Sau khi có ảnh (công cụ 01) → nhập loại hoa, dịp, giá → nhận vài phiên bản caption → chọn bản hợp giọng cửa hàng → đăng bài; dùng lại phần mô tả cho link bán hàng và catalog.

### 05. Tạo poster và banner quảng cáo
**Nhãn:** Cả hai
- **Input:** Dịp hoặc chương trình, thông điệp chính, ưu đãi, ảnh sản phẩm, logo, thời gian áp dụng.
- **Process:** Chọn bố cục theo dịp và kênh → đặt tiêu đề, ưu đãi, ảnh, CTA → xuất theo từng kích thước (poster in, banner web, ảnh mạng xã hội).
- **Outputs:** Bộ thiết kế quảng cáo nhiều kích thước.
- **Actions:** Chỉnh nội dung; đổi phong cách; tải file in hoặc file số; gắn link chương trình; chuyển sang chiến dịch (22, 44).
- **Phân tích:** Thiết kế nào được dùng nhiều và mang lại lượt nhấp/lead; thời điểm đăng hiệu quả. Giúp chọn phong cách quảng cáo cho dịp lễ sau.
- **Cấp chuỗi:** Thiết kế một lần cho toàn mạng lưới, mỗi cửa hàng chỉ thay địa chỉ và liên hệ.
- **Giá trị ứng dụng thực tế:** Có poster và banner theo dịp trong thời gian ngắn thay vì chờ nhà thiết kế; thông điệp và hình ảnh đồng bộ giữa các kênh.
- **Cách ứng dụng vào thực tế:** Trước 20/10, chọn dịp → nhập ưu đãi (ví dụ miễn phí giao nội thành, tặng thiệp) và 3 mẫu hoa → xuất banner fanpage, poster đặt tại cửa hàng, ảnh story → đăng cùng lúc.

### 06. Tạo video giới thiệu sản phẩm
**Nhãn:** Cả hai
- **Input:** Một hoặc nhiều ảnh, nội dung chữ ngắn, giá/ưu đãi, chọn nhạc và tỉ lệ khung hình.
- **Process:** Sắp xếp ảnh thành các cảnh → thêm chữ, hiệu ứng chuyển cảnh, nhạc → căn thời lượng theo kênh (15–30 giây) → kết xuất video.
- **Outputs:** Video ngắn dọc hoặc vuông, kèm ảnh bìa.
- **Actions:** Xem trước; đổi nhạc, thứ tự cảnh, chữ; tải về; đăng hoặc gửi; dùng lại làm video chiến dịch.
- **Phân tích:** Lượt xem, thời gian xem, nhấp CTA; video nào của mẫu hoa nào hiệu quả. Giúp quyết định đầu tư video cho dòng sản phẩm nào.
- **Cấp chuỗi:** Tạo video thương hiệu hoặc video chiến dịch chung; thành viên đổi thông tin liên hệ và dùng lại.
- **Giá trị ứng dụng thực tế:** Video ngắn thường được các nền tảng ưu tiên hiển thị, giúp tăng tiếp cận mà không cần biết dựng video.
- **Cách ứng dụng vào thực tế:** Chọn 4–5 ảnh các mẫu bán chạy → nhập tên mẫu và giá → chọn nhạc → xuất video ngắn đăng TikTok và Reels; dùng ảnh bìa tự tạo cho bài đăng.

### 07. Tạo thiệp và lời chúc
**Nhãn:** Cả hai
- **Input:** Dịp tặng, người nhận, mối quan hệ, vài ý gửi gắm, tên người tặng; chọn mẫu thiệp và hình thức (in hoặc điện tử).
- **Process:** Phân tích bối cảnh → viết lời chúc theo giọng phù hợp (trang trọng, ấm áp, hài hước) → đặt vào mẫu thiệp → xuất bản in hoặc bản điện tử.
- **Outputs:** Thiệp cá nhân hóa (file in hoặc ảnh/link điện tử).
- **Actions:** Chọn một trong nhiều lời chúc; chỉnh sửa; in; gửi cho người tặng duyệt; gắn vào đơn hàng.
- **Phân tích:** Tỉ lệ đơn có thiệp; dịp và kiểu lời chúc được chọn nhiều; doanh thu từ thiệp trả phí (nếu có). Giúp thiết kế mẫu thiệp theo dịp phổ biến.
- **Cấp chuỗi:** Cung cấp thư viện mẫu thiệp theo thương hiệu cho toàn mạng lưới.
- **Giá trị ứng dụng thực tế:** Thiệp cá nhân hóa tạo cảm xúc cho người nhận, khó so sánh giá với nơi khác, đồng thời tăng giá trị đơn và giúp khách đỡ phải nghĩ lời chúc.
- **Cách ứng dụng vào thực tế:** Khách đặt hoa tặng sinh nhật mẹ → nhân viên nhập 2–3 ý khách muốn nói → chọn lời chúc ưng ý → in thiệp nhỏ kẹp vào bó hoa, hoặc gửi bản điện tử cho khách duyệt.

---

## Nhóm 2 — Xây dựng thương hiệu và trang trực tuyến

**Mục tiêu:** Có hiện diện trực tuyến chuyên nghiệp và các trang giới thiệu có link để chia sẻ.

### 08. Tạo landing page cửa hàng hoặc chuỗi
**Nhãn:** Cả hai
- **Input:** Tên, logo, mô tả thương hiệu, ảnh, sản phẩm/dịch vụ nổi bật, địa chỉ, liên hệ, nút hành động mong muốn.
- **Process:** Chọn mẫu trang → tự sắp xếp các mục (giới thiệu, sản phẩm, dịch vụ, liên hệ) → tối ưu hiển thị trên điện thoại → tạo link riêng.
- **Outputs:** Trang giới thiệu trực tuyến có link.
- **Actions:** Chỉnh nội dung từng mục; đổi giao diện; xuất bản hoặc gỡ; gắn tên miền riêng; chia sẻ link; tạo QR (công cụ 12).
- **Phân tích:** Lượt truy cập, nguồn truy cập, thời gian xem, tỉ lệ nhấp nút (gọi, nhắn tin, đặt hàng). Giúp biết phần nào của trang hiệu quả để chỉnh sửa.
- **Cấp chuỗi:** Trang thương hiệu giới thiệu toàn hệ thống, dẫn khách đến cửa hàng thành viên (liên kết công cụ 42); có thể tạo trang con cho từng cửa hàng.
- **Giá trị ứng dụng thực tế:** Có địa chỉ trực tuyến chính thức thay vì chỉ dựa vào fanpage; tăng uy tín với khách doanh nghiệp; một link duy nhất dùng ở mọi nơi.
- **Cách ứng dụng vào thực tế:** Nhập thông tin, chọn mẫu trang → xuất bản → đặt link ở bio mạng xã hội, Google Business, danh thiếp. Chuỗi dùng làm trang thương hiệu, dẫn khách đến từng cửa hàng thành viên.

### 09. Tạo catalog và bộ sưu tập hoa
**Nhãn:** Cửa hàng
- **Input:** Danh sách mẫu hoa (ảnh, tên, giá); tiêu chí phân loại (dịp, phong cách, mức giá, chủ đề).
- **Process:** Phân nhóm mẫu theo tiêu chí → sắp xếp thứ tự hiển thị → tạo trang catalog có lọc và tìm kiếm → giữ link cố định khi cập nhật.
- **Outputs:** Catalog trực tuyến có link chia sẻ.
- **Actions:** Thêm, bớt, sắp xếp mẫu; ẩn mẫu hết hàng; tạo bộ sưu tập theo mùa; chia sẻ link; tạo QR; xuất PDF.
- **Phân tích:** Lượt xem catalog, mẫu và bộ sưu tập được xem/nhấp nhiều nhất, mẫu ít được quan tâm. Giúp chọn mẫu nên đẩy mạnh hoặc loại bỏ.
- **Cấp chuỗi:** Tạo catalog thương hiệu chung hoặc catalog theo khu vực; phát danh mục chuẩn cho cửa hàng thành viên. Catalog gộp nhiều cửa hàng xem công cụ 43.
- **Giá trị ứng dụng thực tế:** Khách xem nhiều mẫu cùng lúc mà không phải hỏi đi hỏi lại "còn mẫu nào khác không?"; cửa hàng cập nhật ở một nơi mà link không đổi.
- **Cách ứng dụng vào thực tế:** Chia catalog theo dịp: Sinh nhật, Khai trương, Chia buồn, Dưới 500 nghìn → gửi link cho khách mới; mỗi tuần cập nhật mẫu theo mùa; ẩn mẫu tạm hết hoa.

### 10. Tạo trang giới thiệu dịch vụ
**Nhãn:** Cả hai
- **Input:** Loại dịch vụ (cưới, sự kiện, văn phòng, khách sạn, doanh nghiệp); ảnh công trình; quy trình; gói dịch vụ; liên hệ.
- **Process:** Chọn mẫu theo loại dịch vụ → sắp xếp phần năng lực, quy trình, dự án tiêu biểu, đánh giá khách → gắn nút yêu cầu báo giá.
- **Outputs:** Trang chào dịch vụ có link riêng.
- **Actions:** Chỉnh nội dung; thêm dự án; xuất bản; chia sẻ; nối nút "Yêu cầu báo giá" với công cụ 16 hoặc 17.
- **Phân tích:** Lượt xem, số yêu cầu báo giá phát sinh từ trang, tỉ lệ chuyển đổi theo loại dịch vụ. Giúp biết dịch vụ nào đang có nhu cầu.
- **Cấp chuỗi:** Giới thiệu năng lực cung ứng toàn mạng lưới (nhiều địa điểm, quy mô lớn) để nhận hợp đồng doanh nghiệp.
- **Giá trị ứng dụng thực tế:** Khách sự kiện và doanh nghiệp cần thấy năng lực trước khi liên hệ; trang dịch vụ cho thấy sự nghiêm túc và giúp thu hút đơn giá trị cao.
- **Cách ứng dụng vào thực tế:** Tạo trang "Hoa cưới" với 6–8 ảnh công trình, quy trình vài bước và nút nhận báo giá → gửi link cho cặp đôi hoặc đơn vị tổ chức cưới → gắn vào Google Business.

### 11. Tạo hồ sơ cửa hàng chia sẻ nhanh
**Nhãn:** Cửa hàng
- **Input:** Địa chỉ, giờ mở cửa, hotline, mạng xã hội, các link quan trọng (catalog, đặt hàng).
- **Process:** Tổng hợp vào một trang một màn hình → gắn bản đồ chỉ đường → nút gọi và nhắn tin → tạo link ngắn.
- **Outputs:** Trang thông tin cửa hàng gọn nhẹ, có link.
- **Actions:** Cập nhật giờ, thông tin; chia sẻ link; đặt vào bio mạng xã hội; tạo QR; cập nhật giờ đặc biệt dịp lễ.
- **Phân tích:** Lượt xem, lượt bấm gọi, lượt chỉ đường, lượt nhấp từng link. Giúp biết khách liên hệ qua kênh nào nhiều nhất.
- **Cấp chuỗi:** Tạo hồ sơ cho từng cửa hàng và quản lý tập trung; dữ liệu này là nguồn cho danh bạ mạng lưới (công cụ 42).
- **Giá trị ứng dụng thực tế:** Khách tìm được thông tin liên hệ nhanh, giảm số cuộc gọi chỉ để hỏi địa chỉ và giờ mở cửa.
- **Cách ứng dụng vào thực tế:** Đặt link ở bio mạng xã hội; in QR dán cửa kính và trên túi, hộp; cập nhật giờ mở cửa đặc biệt vào các dịp lễ.

### 12. Tạo QR code cửa hàng và sản phẩm
**Nhãn:** Cả hai
- **Input:** Chọn đích truy cập (hồ sơ, catalog, sản phẩm, trang đặt hàng); tùy chọn logo, màu, khung.
- **Process:** Tạo link theo dõi → sinh mã QR có độ phân giải in → gắn nhãn vị trí/chiến dịch.
- **Outputs:** Hình QR dùng cho in ấn và hiển thị (PNG, SVG, PDF).
- **Actions:** Đổi đích mà không phải in lại; tải về; in lên bao bì, thiệp, bảng hiệu; tạo nhiều QR cho nhiều vị trí.
- **Phân tích:** Số lượt quét theo QR, theo vị trí, theo thời gian, loại thiết bị. Giúp biết điểm tiếp xúc nào kéo khách tốt nhất.
- **Cấp chuỗi:** Tạo QR cho từng cửa hàng để biết khách đến từ điểm nào; đổi đích đồng loạt cho cả mạng lưới.
- **Giá trị ứng dụng thực tế:** Nối thế giới thật với trực tuyến gần như không tốn chi phí; đổi đích đến mà không phải in lại; biết điểm đặt QR nào hiệu quả.
- **Cách ứng dụng vào thực tế:** In QR "Xem mẫu mới" trên thiệp kèm đơn; QR "Đánh giá cửa hàng" trên túi; QR "Đặt hoa định kỳ" tại quầy; đặt tên riêng cho từng QR để xem thống kê.

---

## Nhóm 3 — Bán hàng và chốt đơn

**Mục tiêu:** Đưa khách từ xem sản phẩm đến báo giá, xác nhận và thanh toán.

### 13. Tạo link bán hàng
**Nhãn:** Cửa hàng
- **Input:** Một mẫu hoa (ảnh, tên, mô tả, giá); tùy chọn kích thước, phụ kiện, thiệp; thời gian giao tối thiểu.
- **Process:** Tạo trang sản phẩm → gắn các lựa chọn và giá → bật nút đặt mua → tạo link riêng.
- **Outputs:** Link bán hàng riêng cho từng mẫu.
- **Actions:** Chỉnh giá, tùy chọn; tạm ẩn khi hết hàng; gửi link; gắn gợi ý bán thêm (30); tạo QR; chuyển đơn sang công cụ 20.
- **Phân tích:** Lượt xem, tỉ lệ bấm đặt, tỉ lệ hoàn tất đơn, nguồn khách. Giúp biết mẫu nào xem nhiều nhưng ít mua để chỉnh giá hoặc ảnh.
- **Cấp chuỗi:** Tạo link bán hàng cho sản phẩm chủ lực và phát xuống cửa hàng (mỗi cửa hàng nhận đơn riêng); xem doanh số tổng hợp.
- **Ranh giới:** 13 là điểm chốt đơn có chức năng đặt mua (tùy chọn, giá, giờ giao). Công cụ 03 chỉ là thẻ quảng bá dạng ảnh. Từ trang bán hàng có thể tạo nhanh thẻ chào (công cụ 03) cho cùng sản phẩm, và ngược lại thẻ chào có thể dẫn về link này.
- **Giá trị ứng dụng thực tế:** Khách tự xem, chọn và đặt trong lúc cửa hàng bận; chốt đơn nhanh và ít sai thông tin; mỗi mẫu có một điểm bán riêng chia sẻ được.
- **Cách ứng dụng vào thực tế:** Với mẫu bán chạy, tạo link riêng → gửi khi khách hỏi hoặc dán dưới bài quảng cáo → khách chọn kích thước, thêm thiệp, nhập giờ giao → đơn về cửa hàng, chuyển sang bước xác nhận.

### 14. Tạo catalog bán hàng theo nhu cầu
**Nhãn:** Cửa hàng
- **Input:** Nhu cầu của khách (ngân sách, dịp, phong cách, người nhận); các mẫu được chọn.
- **Process:** Lọc mẫu phù hợp với nhu cầu → sắp xếp theo mức phù hợp → gom vào một trang có nút chọn và đặt.
- **Outputs:** Bộ sưu tập chọn lọc có link riêng cho từng khách hoặc từng lần tư vấn.
- **Actions:** Thêm, bớt mẫu; gửi khách; khách chọn và đặt trực tiếp; sao chép làm mẫu cho khách khác.
- **Phân tích:** Số bộ sưu tập đã gửi, tỉ lệ khách mở, mẫu nào được chọn, tỉ lệ chốt đơn. Giúp biết cách chọn mẫu nào dễ chốt.
- **Cấp chuỗi:** Tạo bộ sưu tập mẫu theo nhu cầu phổ biến (ví dụ "quà 20/10 dưới 500 nghìn") cho cửa hàng dùng lại; xem tỉ lệ chốt giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Khách phân vân không phải xem hàng chục ảnh, so sánh ngay trên một trang, tăng khả năng chốt đơn.
- **Cách ứng dụng vào thực tế:** Khách nhắn "tặng cô giáo, tầm 400–500 nghìn" → nhân viên chọn 4 mẫu phù hợp → tạo bộ sưu tập → gửi link → khách bấm chọn và đặt. Lưu lại làm mẫu "Tặng cô giáo 20/11" để dùng lại.

### 15. Tạo báo giá theo yêu cầu khách hàng
**Nhãn:** Cửa hàng
- **Input:** Yêu cầu khách (ngân sách, loại hoa, số lượng, phong cách, thời gian giao); dữ liệu giá từ công cụ 32, 33, 34.
- **Process:** Chọn mẫu và công thức phù hợp → tính giá theo nguyên liệu và biên lợi nhuận → tạo một hoặc nhiều phương án (tiết kiệm, tiêu chuẩn, cao cấp) → dựng báo giá.
- **Outputs:** Báo giá cá nhân hóa nhiều phương án, có thời hạn hiệu lực.
- **Actions:** Chỉnh giá, phương án; gửi khách; khách chọn phương án; chuyển báo giá thành đơn (công cụ 20); gia hạn hoặc hủy.
- **Phân tích:** Số báo giá gửi, tỉ lệ chốt, phương án được chọn nhiều, thời gian từ báo giá đến chốt. Giúp biết mức giá và cách trình bày dễ chốt.
- **Cấp chuỗi:** Dùng mẫu báo giá chuẩn (công cụ 46); xem tỉ lệ chốt và chênh lệch giá giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Báo giá nhanh, chính xác, có nhiều phương án để khách dễ quyết định; tránh báo sai giá gây lỗ.
- **Cách ứng dụng vào thực tế:** Khách yêu cầu "bó hoa tông hồng, ngân sách 800 nghìn" → nhập yêu cầu → hệ thống đề xuất 3 phương án theo giá vốn → nhân viên chỉnh → gửi link báo giá để khách chọn.

### 16. Tạo báo giá hoa sự kiện và doanh nghiệp
**Nhãn:** Cả hai
- **Input:** Yêu cầu sự kiện (loại, quy mô, địa điểm, ngày), danh sách hạng mục, số lượng, yêu cầu lắp đặt, điều khoản thanh toán.
- **Process:** Phân rã thành hạng mục → tính đơn giá từ công thức và bảng giá → cộng chi phí vận chuyển, lắp đặt, nhân công → tính tổng, đặt cọc, điều khoản → dựng báo giá nhiều hạng mục.
- **Outputs:** Báo giá theo hạng mục (PDF hoặc link), có tổng chi phí và điều khoản.
- **Actions:** Chỉnh hạng mục; tạo phiên bản mới; gửi khách; khách xác nhận hoặc yêu cầu điều chỉnh; chuyển thành đơn và lịch thực hiện.
- **Phân tích:** Giá trị báo giá, tỉ lệ thắng thầu, biên lợi nhuận dự kiến theo hạng mục, thời gian chốt. Giúp biết loại sự kiện nào có lãi và cách định giá tốt hơn.
- **Cấp chuỗi:** Báo giá hợp đồng nhiều địa điểm, phân chia hạng mục cho các cửa hàng cùng thực hiện, tổng hợp thành một báo giá duy nhất cho khách.
- **Giá trị ứng dụng thực tế:** Đơn sự kiện và doanh nghiệp có giá trị lớn, cần báo giá minh bạch theo hạng mục; chuẩn hóa giúp giảm sai sót và tăng độ tin cậy.
- **Cách ứng dụng vào thực tế:** Công ty đặt hoa cho hội nghị → liệt kê hạng mục (hoa bàn đại biểu, lẵng hoa chào mừng, backdrop) → nhập số lượng, địa điểm → xuất báo giá có điều khoản đặt cọc → khách xác nhận.

### 17. Tạo form đặt hoa theo yêu cầu
**Nhãn:** Cả hai
- **Input:** Chọn các trường cần hỏi (ngân sách, màu, dịp, người nhận, lời chúc, ngày giờ và địa chỉ giao); hoặc dùng mẫu sẵn.
- **Process:** Dựng form → kiểm tra dữ liệu nhập (số điện thoại, ngày giờ hợp lệ) → mỗi lần gửi tạo ra một phiếu yêu cầu → thông báo cho cửa hàng.
- **Outputs:** Form có link và các phiếu yêu cầu đặt hoa.
- **Actions:** Thêm, bớt trường; nhận thông báo đơn mới; phản hồi khách; chuyển phiếu thành báo giá (15) hoặc đơn (20); lưu thông tin khách.
- **Phân tích:** Số phiếu nhận, tỉ lệ hoàn thành form, mức ngân sách và dịp phổ biến, tỉ lệ phiếu thành đơn. Giúp hiểu nhu cầu thực của khách và cải thiện form.
- **Cấp chuỗi:** Một form chung, tự chuyển phiếu đến cửa hàng phù hợp theo khu vực; theo dõi thời gian phản hồi của từng cửa hàng.
- **Giá trị ứng dụng thực tế:** Thu đủ thông tin trong một lần, không phải hỏi lại nhiều câu; nhận yêu cầu được cả ngoài giờ làm việc.
- **Cách ứng dụng vào thực tế:** Đặt link form ở bio và tin nhắn tự động → khách điền ngân sách, dịp, địa chỉ → cửa hàng nhận phiếu → tư vấn hoặc báo giá ngay khi có người trực.

### 18. Tạo gói hoa và combo quà tặng
**Nhãn:** Cửa hàng
- **Input:** Các thành phần (hoa, thiệp, quà, bình); dịp hoặc ngân sách; giá gói.
- **Process:** Ghép thành phần thành gói → tính giá vốn và lợi nhuận gói (nối công cụ 33, 34) → tạo ảnh và mô tả gói.
- **Outputs:** Gói sản phẩm có tên, ảnh, giá.
- **Actions:** Chỉnh thành phần, giá; công bố gói; gắn vào link bán hàng, catalog; dừng gói sau mùa.
- **Phân tích:** Số gói bán, tỉ lệ gói trên tổng đơn, giá trị đơn trung bình khi có gói so với không có. Giúp biết gói nào nên giữ, gói nào nên đổi.
- **Cấp chuỗi:** Thiết kế gói chung theo dịp để cửa hàng áp dụng; so sánh hiệu quả gói giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Khách chọn quà dễ hơn; cửa hàng tăng giá trị mỗi đơn nhờ bán trọn gói.
- **Cách ứng dụng vào thực tế:** Tạo gói "Hoa + thiệp + sô-cô-la" cho 14/2 và 8/3 → đặt giá gói thấp hơn tổng giá lẻ một chút → hiển thị trên link bán hàng và catalog.

### 19. Tạo gói đặt hoa định kỳ
**Nhãn:** Cửa hàng
- **Input:** Tần suất (tuần/tháng), mẫu hoa hoặc ngân sách, địa chỉ giao, ngày bắt đầu, thời hạn gói, giá.
- **Process:** Tạo lịch giao theo tần suất → tự sinh đơn mỗi kỳ → nhắc thanh toán → báo trước khi hết hạn.
- **Outputs:** Gói dịch vụ định kỳ và lịch đơn tự sinh.
- **Actions:** Tạm dừng, đổi mẫu, đổi ngày giao; gia hạn; hủy; chuyển đơn mỗi kỳ cho công cụ 36, 39, 40.
- **Phân tích:** Số khách định kỳ, doanh thu lặp lại hàng tháng, tỉ lệ gia hạn và rời gói. Giúp dự báo doanh thu và biết nhóm khách trung thành.
- **Cấp chuỗi:** Bán gói định kỳ cho khách doanh nghiệp có nhiều địa điểm, giao bởi nhiều cửa hàng; xem doanh thu định kỳ toàn mạng lưới.
- **Giá trị ứng dụng thực tế:** Doanh thu dự báo được, giảm công nhận đơn lặp lại, gắn bó lâu dài với khách doanh nghiệp.
- **Cách ứng dụng vào thực tế:** Chào khách văn phòng, nhà hàng gói "hoa lễ tân mỗi thứ Hai trong 3 tháng" → thiết lập lịch → hệ thống tự sinh đơn mỗi tuần và nhắc thanh toán.

### 20. Tạo trang xác nhận và thanh toán đơn hàng
**Nhãn:** Cửa hàng
- **Input:** Thông tin đơn đã chốt (mẫu, giá, địa chỉ, thời gian giao, điều kiện thanh toán).
- **Process:** Tạo trang tóm tắt đơn → khách kiểm tra và xác nhận → thanh toán hoặc đặt cọc → ghi nhận trạng thái.
- **Outputs:** Đơn hàng xác nhận kèm trạng thái thanh toán (chưa thanh toán, đã cọc, đã thanh toán).
- **Actions:** Gửi link khách; khách xác nhận, thanh toán; cửa hàng đối chiếu, hoàn tiền, hủy; chuyển đơn sang sản xuất (36).
- **Phân tích:** Tỉ lệ khách xác nhận, thanh toán, bỏ dở; thời gian từ gửi đến thanh toán; hình thức thanh toán. Giúp giảm đơn bỏ dở và nợ.
- **Cấp chuỗi:** Quy định điều kiện đặt cọc chung; xem doanh thu và công nợ tổng hợp từng cửa hàng.
- **Giá trị ứng dụng thực tế:** Tách rõ giai đoạn tư vấn và đơn chính thức, tránh hiểu nhầm về giá, địa chỉ, giờ giao; đặt cọc giúp giảm rủi ro khách hủy đơn.
- **Cách ứng dụng vào thực tế:** Khách chốt mẫu → gửi link xác nhận → khách kiểm tra và đặt cọc theo tỉ lệ cửa hàng quy định → cửa hàng thấy trạng thái "đã cọc" và chuyển sang sản xuất.

---

## Nhóm 4 — Thu hút khách hàng và tạo cơ hội bán hàng

**Mục tiêu:** Tìm người quan tâm, thu thập thông tin và đưa họ vào quy trình tư vấn.

### 21. Tạo form thu thập khách hàng tiềm năng
**Nhãn:** Cả hai
- **Input:** Các trường cần thu (tên, liên hệ, khu vực, nhu cầu); lời mời hoặc ưu đãi đổi thông tin; đích nhận lead.
- **Process:** Dựng form → kiểm tra dữ liệu → lưu lead vào danh sách → gắn nguồn (QR, chiến dịch, trang) → thông báo người phụ trách.
- **Outputs:** Form có link và danh sách lead.
- **Actions:** Xem, lọc, gán người phụ trách; đánh dấu trạng thái (mới, đã liên hệ, đã mua); xuất danh sách; chuyển lead sang chăm sóc (26, 27).
- **Phân tích:** Số lead, nguồn lead, tỉ lệ hoàn thành form, tỉ lệ lead thành khách. Giúp biết kênh nào thu lead chất lượng.
- **Cấp chuỗi:** Thu lead chung và chia cho cửa hàng theo khu vực; theo dõi tốc độ xử lý lead từng cửa hàng.
- **Giá trị ứng dụng thực tế:** Biến người xem thành danh sách khách có thể liên hệ lại, đây là tài sản dữ liệu của cửa hàng.
- **Cách ứng dụng vào thực tế:** Gắn form ở landing page và QR tại quầy với lời mời "Nhận bảng giá hoa sự kiện" → khách để lại tên, số điện thoại, nhu cầu → nhân viên gọi lại trong ngày.

### 22. Tạo chiến dịch thu hút khách hàng
**Nhãn:** Cửa hàng
- **Input:** Mục tiêu (khai trương, lễ Tết, ra mắt bộ sưu tập), thời gian, ưu đãi, ngân sách, kênh.
- **Process:** Đề xuất cấu trúc chiến dịch → tạo thông điệp, thiết kế (công cụ 03–05), trang đích, form thu lead (21) → lập lịch triển khai → gắn mã theo dõi.
- **Outputs:** Bộ chiến dịch: nội dung, thiết kế, trang đích, form, lịch đăng.
- **Actions:** Chỉnh từng thành phần; xuất bản; lên lịch; tạm dừng; nhân bản chiến dịch cho dịp sau.
- **Phân tích:** Lượt tiếp cận, nhấp, lead, đơn từ chiến dịch; chi phí trên mỗi lead. Giúp quyết định chiến dịch nào nên lặp lại.
- **Cấp chuỗi:** Chạy chiến dịch cho thương hiệu hoặc cửa hàng trực tiếp; chiến dịch phát cho nhiều cửa hàng dùng công cụ 44.
- **Giá trị ứng dụng thực tế:** Chạy chiến dịch có cấu trúc, đo được kết quả, không rời rạc từng bài đăng.
- **Cách ứng dụng vào thực tế:** Chiến dịch "Khai trương chi nhánh" kéo dài 2 tuần, ưu đãi cho 100 khách đầu tiên → bộ gồm banner, bài đăng, trang đích, form → theo dõi số lead mỗi ngày để điều chỉnh.

### 23. Tạo chương trình giới thiệu khách hàng
**Nhãn:** Cả hai
- **Input:** Quyền lợi cho người giới thiệu và người được giới thiệu, điều kiện hợp lệ, thời hạn.
- **Process:** Cấp mã/link riêng cho từng khách → ghi nhận lượt giới thiệu → kiểm tra điều kiện hợp lệ → cộng quyền lợi.
- **Outputs:** Link/mã giới thiệu và bảng theo dõi lượt giới thiệu.
- **Actions:** Gửi mã cho khách; duyệt hoặc từ chối lượt; trao quyền lợi; thay đổi quy định; dừng chương trình.
- **Phân tích:** Số khách tham gia giới thiệu, số khách mới từ giới thiệu, doanh thu và chi phí quyền lợi. Giúp đánh giá hiệu quả so với quảng cáo trả phí.
- **Cấp chuỗi:** Chương trình dùng chung: khách giới thiệu ở cửa hàng này, người được giới thiệu mua ở cửa hàng khác vẫn được ghi nhận.
- **Giá trị ứng dụng thực tế:** Kênh khách mới đáng tin vì đến từ người quen, chi phí thấp và đo được.
- **Cách ứng dụng vào thực tế:** Gửi mã giới thiệu cho khách cũ, người giới thiệu và người mới cùng nhận ưu đãi → hệ thống ghi nhận khi người mới đặt đơn → xem báo cáo số lượt giới thiệu và doanh thu.

### 24. Tạo khảo sát nhu cầu khách hàng
**Nhãn:** Cả hai
- **Input:** Câu hỏi khảo sát (dùng mẫu hoặc tự tạo), nhóm khách mục tiêu.
- **Process:** Dựng khảo sát → gửi link → thu phản hồi → tổng hợp thống kê, nhóm khách theo sở thích.
- **Outputs:** Link khảo sát và báo cáo kết quả.
- **Actions:** Gửi khảo sát; xem kết quả theo thời gian thực; xuất dữ liệu; lưu nhóm khách vào danh sách để chăm sóc.
- **Phân tích:** Tỉ lệ trả lời; phân bố phong cách, ngân sách, dịp tặng, tần suất mua; nhóm khách nổi bật. Giúp chuẩn bị sản phẩm và chương trình phù hợp.
- **Cấp chuỗi:** Khảo sát diện rộng và so sánh nhu cầu giữa các khu vực, cửa hàng.
- **Giá trị ứng dụng thực tế:** Quyết định kinh doanh dựa trên dữ liệu thật từ khách; phát hiện nhu cầu chưa được đáp ứng.
- **Cách ứng dụng vào thực tế:** Gửi khảo sát 5 câu cho khách cũ, đổi lấy mã giảm giá → sau hai tuần xem tổng hợp tông màu và ngân sách phổ biến → chọn mẫu mới cho bộ sưu tập sắp tới.

### 25. Tạo điểm thu hút khách qua QR code
**Nhãn:** Cả hai
- **Input:** Đích (form đăng ký hoặc ưu đãi), lời mời hiển thị, vị trí đặt QR.
- **Process:** Tạo trang đích có lời mời → tạo QR có khung thiết kế → gắn nhãn vị trí → theo dõi lượt quét và lead.
- **Outputs:** QR kèm khung lời mời, trang đích, thống kê quét.
- **Actions:** Tải khung QR để in; đổi ưu đãi mà không in lại; tạm dừng; nhân bản cho vị trí khác.
- **Phân tích:** Lượt quét, tỉ lệ để lại thông tin, lead theo vị trí đặt. Giúp biết bao bì, quầy, tờ rơi nào hiệu quả.
- **Cấp chuỗi:** Phát khung QR đồng bộ cho các cửa hàng; so sánh hiệu quả thu lead tại quầy giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Thu lead ngay tại điểm tiếp xúc, lúc khách đang quan tâm.
- **Cách ứng dụng vào thực tế:** In QR kèm lời mời "Quét để nhận ưu đãi cho lần mua sau" tại quầy và trên hộp hoa → khách quét và để lại số điện thoại → vào danh sách lead để chăm sóc.

---

## Nhóm 5 — Chăm sóc khách hàng và tăng doanh thu

**Mục tiêu:** Giữ quan hệ với khách cũ, tăng số lần mua lại và giá trị mỗi đơn.

### 26. Tạo nội dung chăm sóc khách hàng
**Nhãn:** Cửa hàng
- **Input:** Nhóm khách (mới mua, lâu không mua, VIP), tình huống (cảm ơn, hỏi thăm sau giao, chúc mừng, nhắc mua), kênh gửi.
- **Process:** Chọn kịch bản theo tình huống → viết tin nhắn cá nhân hóa (tên, đơn gần nhất, dịp) → điều chỉnh độ dài và giọng theo kênh.
- **Outputs:** Bộ tin nhắn mẫu và lời chúc cá nhân hóa.
- **Actions:** Chọn và chỉnh sửa; sao chép; gửi (Zalo, SMS, Facebook); lưu thành mẫu; gắn vào chiến dịch bán lại (27).
- **Phân tích:** Số tin gửi, tỉ lệ phản hồi, tỉ lệ khách mua lại sau tin nhắn. Giúp biết kịch bản nào hiệu quả.
- **Cấp chuỗi:** Thiết lập kịch bản chăm sóc chuẩn và giọng thương hiệu cho cửa hàng; theo dõi mức độ thực hiện chăm sóc.
- **Giá trị ứng dụng thực tế:** Duy trì quan hệ đều đặn mà không tốn thời gian soạn tin; khách cảm thấy được quan tâm nên dễ mua lại.
- **Cách ứng dụng vào thực tế:** Sau khi giao một ngày, gửi tin hỏi thăm "Hoa đã đến tay đúng giờ chưa ạ?"; sau một tháng gửi tin nhắc dịp; nhóm khách VIP nhận nội dung riêng.

### 27. Tạo chiến dịch chăm sóc và bán lại
**Nhãn:** Cửa hàng
- **Input:** Danh sách hoặc nhóm khách cũ, mục tiêu (mẫu mới, ưu đãi, dịp), ưu đãi, thời gian.
- **Process:** Phân nhóm khách → soạn thông điệp cho từng nhóm → lập lịch gửi → gắn link sản phẩm và mã ưu đãi → theo dõi phản hồi.
- **Outputs:** Kế hoạch chiến dịch bán lại: đối tượng, nội dung, lịch gửi.
- **Actions:** Chỉnh nhóm đối tượng, nội dung; lên lịch; gửi; tạm dừng; nhân bản cho dịp sau.
- **Phân tích:** Tỉ lệ mở, nhấp, mua lại; doanh thu từ khách cũ; nhóm khách phản hồi tốt nhất. Giúp biết tệp khách cũ nên chăm sóc theo cách nào.
- **Cấp chuỗi:** Chạy chiến dịch bán lại trên tệp khách chung của chuỗi (nếu dữ liệu thuộc chuỗi) hoặc phát kịch bản cho cửa hàng.
- **Giá trị ứng dụng thực tế:** Khách cũ dễ mua hơn khách mới và chi phí tiếp cận thấp hơn, giúp tăng doanh thu từ tệp khách sẵn có.
- **Cách ứng dụng vào thực tế:** Trước 8/3, lọc nhóm khách đã mua dịp 14/2 → gửi chiến dịch "Mẫu mới và ưu đãi khách quen" kèm link catalog → đo số đơn phát sinh.

### 28. Tạo lịch nhắc dịp quan trọng
**Nhãn:** Cửa hàng
- **Input:** Ngày sinh nhật, kỷ niệm do khách cung cấp; lịch sử mua để suy ra chu kỳ mua; sự đồng ý của khách.
- **Process:** Ghi nhận dịp → tính ngày nhắc trước 7–14 ngày → tạo việc nhắc kèm gợi ý nội dung và mẫu hoa.
- **Outputs:** Lịch chăm sóc khách hàng và danh sách việc cần liên hệ.
- **Actions:** Thêm, sửa dịp; nhận nhắc; gửi tin chăm sóc từ gợi ý; đánh dấu đã liên hệ; bỏ qua.
- **Phân tích:** Số dịp ghi nhận, tỉ lệ khách được liên hệ đúng hạn, tỉ lệ đặt hoa sau nhắc. Giúp đo giá trị của việc chủ động tiếp cận.
- **Cấp chuỗi:** Đặt quy tắc nhắc và kịch bản chung; xem tỉ lệ thực hiện của cửa hàng.
- **Giá trị ứng dụng thực tế:** Chủ động tiếp cận trước dịp thay vì chờ khách tự nhớ; tạo doanh thu từ các dịp lặp lại hằng năm.
- **Cách ứng dụng vào thực tế:** Khách mua hoa sinh nhật vợ → ghi lại ngày với sự đồng ý của khách → năm sau, trước sinh nhật khoảng 10 ngày hệ thống nhắc nhân viên gửi gợi ý mẫu hoa.

### 29. Tạo chương trình khách hàng thân thiết
**Nhãn:** Cả hai
- **Input:** Quy tắc tích điểm, các mức thành viên, quyền lợi từng mức, điều kiện lên/xuống hạng.
- **Process:** Ghi nhận điểm theo đơn hàng → tự xếp hạng thành viên → áp quyền lợi → thông báo khi đạt hạng.
- **Outputs:** Chương trình thành viên và hồ sơ điểm, hạng từng khách.
- **Actions:** Cộng, trừ điểm; đổi ưu đãi; gửi thông báo; đổi quy tắc; xuất danh sách thành viên.
- **Phân tích:** Số thành viên theo hạng, tần suất mua và giá trị đơn của thành viên so với khách thường, tỉ lệ giữ chân. Giúp đánh giá chi phí và lợi ích chương trình.
- **Cấp chuỗi:** Chương trình dùng chung: điểm và hạng có giá trị tại mọi cửa hàng; xem khách mua chéo giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Tăng tần suất và giá trị mua lại, khiến khách khó chuyển sang cửa hàng khác.
- **Cách ứng dụng vào thực tế:** Đặt quy tắc tích điểm theo giá trị đơn, chia hạng Bạc và Vàng, hạng Vàng được giao miễn phí → hiển thị điểm cho khách khi đặt đơn → xem tỉ lệ khách quay lại theo hạng.

### 30. Tạo gợi ý bán thêm và bán chéo
**Nhãn:** Cửa hàng
- **Input:** Sản phẩm khách đang chọn; danh mục sản phẩm bổ sung (thiệp, quà, bình, dịch vụ giao nhanh).
- **Process:** Ghép sản phẩm chính với món phù hợp theo dịp và mức giá → xếp thứ tự gợi ý → tạo thông điệp gợi ý ngắn.
- **Outputs:** Danh sách sản phẩm bổ sung gắn được vào link bán hàng hoặc kịch bản tư vấn.
- **Actions:** Chỉnh quy tắc ghép; bật, tắt gợi ý; gắn vào link bán hàng (13) hoặc trang xác nhận (20).
- **Phân tích:** Tỉ lệ khách chọn thêm, món bán thêm hiệu quả nhất, giá trị đơn tăng thêm. Giúp biết cặp sản phẩm nào nên ghép.
- **Cấp chuỗi:** Đặt quy tắc ghép sản phẩm chung; so sánh tỉ lệ bán thêm giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Tăng giá trị đơn mà không cần giảm giá, đồng thời giúp khách hoàn thiện món quà.
- **Cách ứng dụng vào thực tế:** Khách chọn một bó hoa → hệ thống gợi ý thêm thiệp và hộp sô-cô-la → bật gợi ý tại trang bán hàng và trang xác nhận → xem tỉ lệ khách chọn thêm.

---

## Nhóm 6 — Tính giá và tối ưu lợi nhuận

**Mục tiêu:** Biết rõ chi phí, định giá có căn cứ và chuẩn bị nguyên liệu đúng nhu cầu.

### 31. Tạo công thức và định mức nguyên liệu
**Nhãn:** Cả hai
- **Input:** Mẫu hoa (ảnh); danh sách nguyên liệu và số lượng (hoa, lá, phụ kiện, giấy gói, ruy băng); thời gian thực hiện.
- **Process:** Ghi thành phần theo từng mẫu → liên kết với bảng giá (32) → tính thời gian và độ khó → lưu thành công thức chuẩn.
- **Outputs:** Công thức chuẩn cho từng mẫu hoa.
- **Actions:** Tạo, sửa, nhân bản; thay nguyên liệu tương đương khi thiếu hàng; in; dùng làm cơ sở cho công cụ 33, 35, 36.
- **Phân tích:** Số mẫu có công thức, nguyên liệu dùng nhiều nhất, mẫu có công thức phức tạp hoặc tốn công. Giúp biết mẫu nào nên đơn giản hóa.
- **Cấp chuỗi:** Xây công thức chuẩn cho mẫu chủ lực, các cửa hàng làm giống nhau; kiểm soát thay đổi công thức.
- **Giá trị ứng dụng thực tế:** Mọi người làm cùng một mẫu cho ra kết quả giống nhau; là cơ sở tính giá vốn và mua hàng; đào tạo thợ mới nhanh hơn.
- **Cách ứng dụng vào thực tế:** Với mỗi mẫu bán chạy, ghi rõ loại hoa, số cành, lá, giấy gói → thợ mới làm theo công thức → chủ cửa hàng dùng công thức để tính giá vốn và dự toán mua hoa.

### 32. Quản lý bảng giá nguyên liệu
**Nhãn:** Cả hai
- **Input:** Giá nhập từng nguyên liệu, nhà cung cấp, ngày cập nhật, đơn vị tính.
- **Process:** Lưu giá và lịch sử → chuẩn hóa đơn vị → cảnh báo khi giá biến động → cập nhật giá vốn các mẫu liên quan.
- **Outputs:** Danh mục giá nguyên liệu luôn mới.
- **Actions:** Nhập, sửa giá; nhập hàng loạt từ file; so sánh nhà cung cấp; xác nhận cập nhật giá vốn.
- **Phân tích:** Biến động giá theo thời gian, nguyên liệu tăng giá mạnh, mẫu hoa bị ảnh hưởng. Giúp quyết định đổi nguyên liệu hoặc điều chỉnh giá bán.
- **Cấp chuỗi:** Đặt bảng giá tham chiếu hoặc giá nhập tập trung; so sánh giá nhập giữa các cửa hàng để đàm phán với nhà cung cấp.
- **Giá trị ứng dụng thực tế:** Giá hoa biến động theo mùa, cập nhật kịp thời giúp tránh bán lỗ.
- **Cách ứng dụng vào thực tế:** Sau mỗi lần nhập hàng, cập nhật giá nguyên liệu → hệ thống cảnh báo các mẫu bị ảnh hưởng và gợi ý xem lại giá bán.

### 33. Tính giá vốn sản phẩm
**Nhãn:** Cửa hàng
- **Input:** Công thức (31), bảng giá (32), chi phí nhân công, bao bì, chi phí khác đã khai báo.
- **Process:** Nhân định mức với đơn giá → cộng nhân công và chi phí khác → tính giá vốn trên mỗi mẫu và mỗi đơn.
- **Outputs:** Bảng giá vốn theo từng mẫu hoa hoặc từng đơn.
- **Actions:** Xem chi tiết cấu thành; cập nhật khi giá đổi; xuất bảng; chuyển sang đề xuất giá bán (34).
- **Phân tích:** Cơ cấu chi phí (nguyên liệu, nhân công, bao bì), mẫu có giá vốn cao bất thường. Giúp phát hiện chỗ có thể tiết kiệm.
- **Cấp chuỗi:** Tính giá vốn chuẩn cho mẫu chủ lực; so sánh giá vốn thực tế giữa các cửa hàng để tìm chênh lệch.
- **Giá trị ứng dụng thực tế:** Biết giá vốn thật để quyết định giá bán và khuyến mãi; phát hiện mẫu có lợi nhuận thấp.
- **Cách ứng dụng vào thực tế:** Chạy tính giá vốn cho nhóm mẫu bán chạy → xem cơ cấu chi phí → mẫu nào nguyên liệu chiếm quá cao thì đổi nguyên liệu hoặc điều chỉnh giá.

### 34. Đề xuất giá bán và lợi nhuận
**Nhãn:** Cả hai
- **Input:** Giá vốn (33), biên lợi nhuận mục tiêu, chi phí liên quan (vận chuyển, chiết khấu), giá thị trường tham khảo (nếu có).
- **Process:** Tính giá bán từ giá vốn và biên lợi nhuận → mô phỏng nhiều mức giá → tính lợi nhuận dự kiến → cảnh báo khi dưới ngưỡng.
- **Outputs:** Giá bán đề xuất và lợi nhuận dự kiến theo từng mức giá.
- **Actions:** Chọn mức giá; áp giá vào sản phẩm, catalog, link bán hàng; lưu kịch bản dịp lễ; so sánh kịch bản.
- **Phân tích:** Biên lợi nhuận thực tế, mẫu lỗ hoặc lãi thấp, tác động của giảm giá đến lợi nhuận. Giúp định giá và quyết định khuyến mãi.
- **Cấp chuỗi:** Đặt khung giá khuyến nghị (sàn, trần) cho toàn mạng lưới; theo dõi cửa hàng bán dưới giá sàn.
- **Giá trị ứng dụng thực tế:** Định giá có căn cứ thay vì cảm tính; mô phỏng được tác động của khuyến mãi lên lợi nhuận.
- **Cách ứng dụng vào thực tế:** Đặt biên lợi nhuận mục tiêu → hệ thống đề xuất giá → so sánh kịch bản giảm giá dịp lễ để xem lợi nhuận còn lại trước khi áp dụng.

### 35. Lập dự toán và nhu cầu mua nguyên liệu
**Nhãn:** Cửa hàng
- **Input:** Đơn đã nhận và dự kiến (dịp lễ), công thức (31), tồn kho hiện có (nếu khai báo), thời gian mua.
- **Process:** Cộng dồn nguyên liệu theo công thức × số lượng → trừ tồn kho → thêm hao hụt dự phòng → tính chi phí theo bảng giá.
- **Outputs:** Danh sách nguyên liệu cần mua, số lượng và chi phí ước tính.
- **Actions:** Chỉnh hao hụt; xuất danh sách đi chợ hoặc gửi nhà cung cấp; cập nhật tồn kho sau khi nhập.
- **Phân tích:** Chênh lệch giữa dự toán và thực mua, tỉ lệ hao hụt, nguyên liệu hay thiếu hoặc dư. Giúp mua đúng lượng ở lần sau.
- **Cấp chuỗi:** Tổng hợp nhu cầu nguyên liệu toàn mạng lưới để mua tập trung dịp cao điểm; phân bổ về cửa hàng.
- **Giá trị ứng dụng thực tế:** Mua đúng lượng, giảm hao hụt, tránh thiếu hoa vào ngày cao điểm.
- **Cách ứng dụng vào thực tế:** Hai tuần trước dịp lễ lớn, cộng nhu cầu từ đơn đặt trước và dự kiến → ra danh sách nguyên liệu cần mua → chốt với nhà cung cấp sớm.

---

## Nhóm 7 — Sản xuất, kiểm soát và giao hàng

**Mục tiêu:** Thực hiện đúng yêu cầu của khách, kiểm soát chất lượng và giao đúng hẹn.

### 36. Tạo phiếu sản xuất và hướng dẫn cắm hoa
**Nhãn:** Cửa hàng
- **Input:** Đơn đã chốt, công thức (31), yêu cầu riêng của khách, hạn hoàn thành.
- **Process:** Lấy công thức của mẫu → kết hợp yêu cầu riêng (đổi màu, thêm thiệp) → tạo phiếu gồm ảnh mẫu, nguyên liệu, các bước, lưu ý.
- **Outputs:** Phiếu hướng dẫn thực hiện (in hoặc xem trên điện thoại).
- **Actions:** Giao việc cho thợ; thợ nhận việc, báo bắt đầu và hoàn thành; ghi chú vấn đề; in phiếu.
- **Phân tích:** Thời gian làm trung bình mỗi mẫu, số đơn sai lệch so với yêu cầu, năng suất từng thợ. Giúp phân việc và cải thiện công thức.
- **Cấp chuỗi:** Phát phiếu và hướng dẫn chuẩn cho mẫu chủ lực; xem chất lượng thực hiện giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Giảm sai lệch giữa yêu cầu của khách và sản phẩm làm ra; thợ mới không phải hỏi lại; giảm thời gian giải thích.
- **Cách ứng dụng vào thực tế:** Đơn đã chốt → in phiếu có ảnh mẫu, công thức và ghi chú riêng (ví dụ "đổi sang hồng pastel") → thợ làm theo phiếu và đánh dấu hoàn thành.

### 37. Tạo checklist kiểm soát chất lượng
**Nhãn:** Cửa hàng
- **Input:** Đơn hàng; bộ tiêu chí kiểm tra (tự đặt hoặc lấy từ chuỗi, công cụ 46).
- **Process:** Tạo checklist theo đơn (đúng mẫu, màu, độ tươi, thiệp, phụ kiện, đóng gói, yêu cầu đặc biệt) → người kiểm tick từng mục → chặn giao nếu mục bắt buộc chưa đạt.
- **Outputs:** Checklist đã hoàn thành cho từng đơn, kèm ảnh minh chứng (tùy chọn).
- **Actions:** Tick đạt/không đạt; ghi lỗi; yêu cầu làm lại; chuyển sang duyệt ảnh (38) hoặc giao (39).
- **Phân tích:** Tỉ lệ đơn đạt lần đầu, lỗi hay gặp nhất, thợ hoặc khâu phát sinh lỗi. Giúp giảm lỗi lặp lại.
- **Cấp chuỗi:** Ban hành checklist chuẩn; so sánh tỉ lệ đạt giữa các cửa hàng.
- **Giá trị ứng dụng thực tế:** Phát hiện lỗi trước khi giao, giảm chi phí đền bù và mất uy tín.
- **Cách ứng dụng vào thực tế:** Trước khi chụp ảnh duyệt, người kiểm tra tick từng mục: đúng màu, thiệp đúng tên, đủ phụ kiện, hoa tươi → chỉ đơn đạt mới chuyển sang bước giao.

### 38. Tạo link duyệt ảnh trước khi giao
**Nhãn:** Cửa hàng
- **Input:** Ảnh bó hoa hoàn thiện, thông tin đơn, người nhận duyệt.
- **Process:** Tạo trang xem ảnh → gửi khách → khách xác nhận hoặc yêu cầu chỉnh → lưu trạng thái và thời điểm duyệt.
- **Outputs:** Trang xem và xác nhận ảnh thực tế.
- **Actions:** Gửi link; khách duyệt hoặc yêu cầu sửa; thợ chỉnh và gửi lại; chuyển sang giao khi đã duyệt.
- **Phân tích:** Tỉ lệ duyệt ngay, tỉ lệ yêu cầu sửa và lý do, thời gian chờ duyệt. Giúp giảm tranh chấp và rút ngắn thời gian chờ.
- **Cấp chuỗi:** Bật chính sách bắt buộc duyệt ảnh với đơn nhất định (ví dụ giá trị cao); theo dõi tỉ lệ yêu cầu sửa toàn mạng lưới.
- **Giá trị ứng dụng thực tế:** Khách yên tâm, nhất là khi đặt hoa tặng người ở xa; giảm tranh chấp sau giao hàng.
- **Cách ứng dụng vào thực tế:** Thợ chụp ảnh bó hoa thật → gửi link → khách bấm đồng ý hoặc yêu cầu chỉnh → cửa hàng lưu lại xác nhận làm bằng chứng.

### 39. Tạo phiếu giao hàng
**Nhãn:** Cửa hàng
- **Input:** Địa chỉ, người nhận, số điện thoại, khung giờ, lưu ý giao (gửi lễ tân, giữ bí mật người gửi), người giao.
- **Process:** Lấy thông tin từ đơn → kiểm tra thiếu sót (địa chỉ chưa rõ, thiếu số điện thoại) → tạo phiếu và liên kết bản đồ.
- **Outputs:** Phiếu giao hàng (in hoặc gửi qua điện thoại).
- **Actions:** Giao việc cho người giao; người giao xác nhận đã nhận, đang giao, đã giao; chụp ảnh giao; báo sự cố.
- **Phân tích:** Tỉ lệ giao đúng giờ, giao lỗi, thời gian giao trung bình, khu vực hay trễ. Giúp tối ưu khu vực giao và phí giao.
- **Cấp chuỗi:** Điều phối đơn sang cửa hàng gần địa chỉ giao nhất; xem tỉ lệ giao đúng giờ theo cửa hàng.
- **Giá trị ứng dụng thực tế:** Người giao có đủ thông tin, giảm nhầm địa chỉ và giờ giao, tăng tỉ lệ giao thành công.
- **Cách ứng dụng vào thực tế:** In hoặc gửi phiếu có địa chỉ, số điện thoại người nhận, lưu ý "gọi trước khi đến" → người giao cập nhật trạng thái và chụp ảnh khi giao xong.

### 40. Lập lịch sản xuất và giao hàng
**Nhãn:** Cửa hàng
- **Input:** Danh sách đơn kèm giờ giao, thời gian làm mỗi mẫu, số thợ và người giao, ca làm việc.
- **Process:** Tính hạn làm theo giờ giao → xếp thứ tự ưu tiên → phân bổ theo năng lực → cảnh báo quá tải hoặc nguy cơ trễ.
- **Outputs:** Lịch công việc theo ngày và giờ cho thợ và người giao.
- **Actions:** Kéo thả điều chỉnh; giao lại việc; chặn nhận thêm đơn khi quá tải; in hoặc gửi lịch.
- **Phân tích:** Mức tải theo giờ và ngày, thời điểm cao điểm, số đơn bị trễ và nguyên nhân. Giúp quyết định thêm nhân sự hoặc giới hạn đơn.
- **Cấp chuỗi:** Xem tải của các cửa hàng, chuyển đơn từ cửa hàng quá tải sang cửa hàng còn năng lực.
- **Giá trị ứng dụng thực tế:** Tránh quá tải vào giờ cao điểm, phân bổ việc hợp lý và giảm trễ đơn.
- **Cách ứng dụng vào thực tế:** Sáng ngày cao điểm mở lịch trong ngày → thấy khung giờ quá tải → chuyển bớt đơn sang khung sớm hơn hoặc bổ sung người; đơn gấp được đánh dấu ưu tiên.

### 41. Theo dõi kết quả thực hiện đơn hàng
**Nhãn:** Cửa hàng
- **Input:** Cập nhật trạng thái từ thợ, người giao, nhân viên; sự cố phát sinh.
- **Process:** Ghi nhận trạng thái (mới, đang làm, đã duyệt ảnh, đang giao, đã giao, có vấn đề) → cảnh báo đơn sắp trễ → lưu lịch sử.
- **Outputs:** Bảng trạng thái đơn theo thời gian thực và lịch sử từng đơn.
- **Actions:** Lọc đơn theo trạng thái; xử lý đơn có vấn đề; thông báo khách; đóng đơn; ghi nhận khiếu nại.
- **Phân tích:** Số đơn theo trạng thái, thời gian hoàn thành trung bình, tỉ lệ đơn trễ và có sự cố. Giúp thấy điểm nghẽn trong quy trình.
- **Cấp chuỗi:** Bảng theo dõi đơn của nhiều cửa hàng trên một màn hình; dữ liệu này là nguồn cho công cụ 47.
- **Giá trị ứng dụng thực tế:** Chủ cửa hàng không phải hỏi từng người "đơn đó xong chưa"; phát hiện sớm đơn có nguy cơ trễ.
- **Cách ứng dụng vào thực tế:** Mở bảng trạng thái, lọc đơn đang làm và đơn sắp đến giờ giao → nhắc thợ; khi có sự cố thì ghi chú và báo khách kịp thời.

---

## Nhóm 8 — Phát triển và quản lý chuỗi cửa hàng

**Mục tiêu:** Tạo giá trị chung, hỗ trợ cửa hàng thành viên và mở rộng mạng lưới. Cả nhóm mang nhãn **Chuỗi**.

### 42. Tạo danh bạ và bản đồ cửa hàng thành viên
**Nhãn:** Chuỗi
- **Input:** Thông tin từ hồ sơ từng cửa hàng (địa chỉ, khu vực phục vụ, giờ mở cửa, liên hệ, link bán hàng).
- **Process:** Tổng hợp hồ sơ → định vị trên bản đồ → xây bộ lọc theo khu vực, dịch vụ → gợi ý cửa hàng gần nhất.
- **Outputs:** Trang danh bạ và bản đồ mạng lưới có link.
- **Actions:** Thêm, tạm ngưng, gỡ cửa hàng; chỉnh khu vực phục vụ; chia sẻ trang; nhúng vào landing page chuỗi.
- **Phân tích:** Lượt tìm cửa hàng theo khu vực, cửa hàng được chọn nhiều, khu vực có nhu cầu nhưng chưa có cửa hàng. Giúp quy hoạch mạng lưới.
- **Cấp chuỗi:** Đây là chức năng cốt lõi của chuỗi.
- **Giá trị ứng dụng thực tế:** Khách tìm được cửa hàng gần nhất; mạng lưới trông có quy mô và đáng tin.
- **Cách ứng dụng vào thực tế:** Chuỗi tạo trang "Hệ thống cửa hàng" trên website, nhúng bản đồ → mỗi cửa hàng có nút đặt hoa và nút chỉ đường.

### 43. Tạo catalog sản phẩm chung toàn chuỗi
**Nhãn:** Chuỗi
- **Input:** Mẫu hoa từ các cửa hàng (công cụ 09) hoặc mẫu chuẩn của chuỗi; điều kiện bán (khu vực, cửa hàng nhận làm, giá tham chiếu).
- **Process:** Gom và loại trùng → phân loại theo danh mục, khu vực → gắn cửa hàng có thể thực hiện → khi khách chọn mẫu, dẫn đến cửa hàng phù hợp.
- **Outputs:** Catalog đa cửa hàng có link.
- **Actions:** Duyệt mẫu đưa vào catalog; gắn hoặc gỡ cửa hàng khỏi mẫu; đặt giá tham chiếu; chia sẻ; xuất PDF.
- **Phân tích:** Mẫu được quan tâm nhất toàn mạng lưới, mẫu nào cửa hàng nào làm tốt, nhu cầu theo khu vực. Giúp điều phối sản phẩm giữa các cửa hàng.
- **Cấp chuỗi:** Đây là chức năng cốt lõi của chuỗi.
- **Giá trị ứng dụng thực tế:** Khách xem được sản phẩm của cả mạng lưới; chuỗi điều phối đơn đến cửa hàng có thể làm mẫu đó.
- **Cách ứng dụng vào thực tế:** Khách chọn mẫu trên catalog chung → nhập địa chỉ giao → hệ thống gợi ý cửa hàng gần và có thể làm mẫu → đơn chuyển về cửa hàng đó.

### 44. Tạo chiến dịch bán hàng chung toàn chuỗi
**Nhãn:** Chuỗi
- **Input:** Mục tiêu, ưu đãi, thời gian, danh sách cửa hàng tham gia, tài nguyên thương hiệu (45).
- **Process:** Soạn nội dung, thiết kế, trang đích → tạo phiên bản riêng cho từng cửa hàng (liên hệ, mã theo dõi) → phát hành → thu kết quả.
- **Outputs:** Bộ chiến dịch dùng chung và báo cáo kết quả theo cửa hàng.
- **Actions:** Chọn cửa hàng tham gia; phát hành; cửa hàng xác nhận hoặc điều chỉnh trong phạm vi cho phép; dừng chiến dịch; nhân bản cho dịp sau.
- **Phân tích:** Lượt tiếp cận, lead, đơn theo từng cửa hàng; cửa hàng triển khai tốt và chưa tốt; chi phí tổng. Giúp đánh giá chương trình chung.
- **Cấp chuỗi:** Đây là chức năng cốt lõi của chuỗi.
- **Giá trị ứng dụng thực tế:** Triển khai chương trình đồng bộ toàn hệ thống mà chỉ thiết kế một lần.
- **Cách ứng dụng vào thực tế:** Dịp 8/3, ban quản lý chuỗi soạn chiến dịch và phát bản đã gắn thông tin riêng cho từng cửa hàng → các cửa hàng đăng và nhận đơn → ban quản lý xem kết quả theo cửa hàng sau vài ngày.

### 45. Tạo bộ nhận diện và thư viện nội dung chung
**Nhãn:** Chuỗi
- **Input:** Logo, bảng màu, phông chữ, mẫu thẻ chào, poster, caption, tài liệu, quy tắc sử dụng thương hiệu.
- **Process:** Phân loại tài nguyên → gắn quyền truy cập → cho phép tùy biến trong giới hạn (ví dụ chỉ đổi thông tin liên hệ) → lưu phiên bản.
- **Outputs:** Thư viện tài nguyên thương hiệu và hướng dẫn sử dụng.
- **Actions:** Tải lên, cập nhật, thu hồi tài nguyên; phân quyền theo cửa hàng; thông báo khi có bản mới; cửa hàng tải và dùng.
- **Phân tích:** Tài nguyên được dùng nhiều, cửa hàng nào hay dùng hoặc không dùng, tình trạng dùng sai thương hiệu. Giúp cập nhật thư viện theo nhu cầu.
- **Cấp chuỗi:** Đây là chức năng cốt lõi của chuỗi.
- **Giá trị ứng dụng thực tế:** Thương hiệu nhất quán; cửa hàng không phải tự thiết kế; tiết kiệm chi phí cho cả mạng lưới.
- **Cách ứng dụng vào thực tế:** Chuỗi tải logo, mẫu poster, hướng dẫn dùng màu lên thư viện → thông báo cho cửa hàng → cửa hàng tải về dùng và chỉ đổi thông tin liên hệ.

### 46. Chuẩn hóa báo giá và tiêu chuẩn dịch vụ
**Nhãn:** Chuỗi
- **Input:** Tiêu chuẩn do ban quản lý quy định (mẫu báo giá, checklist, quy chuẩn phục vụ, cam kết chất lượng).
- **Process:** Soạn bộ tiêu chuẩn → gắn vào các công cụ liên quan (15, 16, 37) → phát hành → yêu cầu cửa hàng xác nhận áp dụng.
- **Outputs:** Bộ mẫu và tiêu chuẩn chung, tích hợp sẵn trong công cụ của cửa hàng.
- **Actions:** Tạo, cập nhật tiêu chuẩn; phát hành bản mới; cửa hàng xác nhận; bật hoặc tắt tính bắt buộc.
- **Phân tích:** Tỉ lệ cửa hàng áp dụng, mức tuân thủ (tỉ lệ đơn dùng mẫu chuẩn, tỉ lệ đạt checklist), cửa hàng lệch chuẩn. Giúp xác định nơi cần hỗ trợ.
- **Cấp chuỗi:** Đây là chức năng cốt lõi của chuỗi.
- **Giá trị ứng dụng thực tế:** Chất lượng dịch vụ đồng đều, khách nhận trải nghiệm giống nhau ở mọi cửa hàng.
- **Cách ứng dụng vào thực tế:** Ban hành mẫu báo giá chung và checklist chất lượng → cửa hàng xác nhận áp dụng → hằng tháng xem tỉ lệ tuân thủ của từng cửa hàng.

### 47. Theo dõi hiệu quả cửa hàng thành viên
**Nhãn:** Chuỗi
- **Input:** Dữ liệu từ các công cụ cấp cửa hàng (sản phẩm, lượt xem, lead, đơn hàng, mức sử dụng công cụ); phân quyền xem.
- **Process:** Thu thập và chuẩn hóa dữ liệu → tính chỉ số theo cửa hàng, khu vực, thời gian → xếp hạng, so sánh → gắn cảnh báo bất thường.
- **Outputs:** Báo cáo hiệu quả mạng lưới (bảng, biểu đồ, bảng xếp hạng).
- **Actions:** Lọc theo cửa hàng, khu vực, thời gian; xuất báo cáo; đặt mục tiêu; gửi nhắc nhở hoặc yêu cầu hỗ trợ cho cửa hàng; lên lịch báo cáo định kỳ.
- **Phân tích:** Chính là phân tích tổng hợp: doanh thu, lead, tỉ lệ chốt, tỉ lệ giao đúng giờ, mức dùng công cụ theo cửa hàng. Giúp nhận biết cửa hàng giỏi, cửa hàng cần hỗ trợ và hiệu quả chương trình chung.
- **Cấp chuỗi:** Đây là chức năng cốt lõi của chuỗi.
- **Giá trị ứng dụng thực tế:** Quản lý bằng số liệu thay vì cảm nhận; phát hiện sớm cửa hàng yếu; đánh giá đúng hiệu quả các chương trình chung.
- **Cách ứng dụng vào thực tế:** Mỗi đầu tuần xem báo cáo: doanh thu, lead, tỉ lệ giao đúng giờ theo cửa hàng → liên hệ hỗ trợ cửa hàng tụt hạng → chia sẻ cách làm của cửa hàng dẫn đầu.

### 48. Phát triển mạng lưới cửa hàng mới
**Nhãn:** Chuỗi
- **Input:** Chính sách thành viên, điều kiện tham gia, tài liệu giới thiệu; thông tin cửa hàng tiềm năng.
- **Process:** Tạo trang đăng ký và form thu thông tin → đưa hồ sơ vào quy trình (quan tâm, tìm hiểu, ký kết, kích hoạt) → gửi tài liệu theo từng bước → nhắc việc cho người phụ trách.
- **Outputs:** Bộ công cụ tiếp nhận thành viên và bảng theo dõi hồ sơ.
- **Actions:** Duyệt hoặc từ chối hồ sơ; chuyển bước; gửi tài liệu, hợp đồng; kích hoạt tài khoản cửa hàng; thêm cửa hàng vào danh bạ (42).
- **Phân tích:** Số hồ sơ theo bước, tỉ lệ chuyển đổi, thời gian xử lý, nguồn cửa hàng tiềm năng. Giúp cải thiện quy trình tuyển thành viên.
- **Cấp chuỗi:** Đây là chức năng cốt lõi của chuỗi.
- **Giá trị ứng dụng thực tế:** Mở rộng mạng lưới có quy trình, không bỏ sót hồ sơ cửa hàng tiềm năng.
- **Cách ứng dụng vào thực tế:** Đăng trang tuyển thành viên → cửa hàng quan tâm điền form → nhân viên liên hệ, gửi tài liệu, ký kết → kích hoạt tài khoản và thêm cửa hàng vào danh bạ mạng lưới.

---

## 3. Gợi ý ưu tiên phát triển

- **Lớp 1 — Giá trị tức thì (01–25):** Tạo tài liệu bán hàng, trang trực tuyến, link bán hàng và thu hút khách. Ưu tiên hiển thị nổi bật để người dùng nhận kết quả ngay.
- **Lớp 2 — Tăng trưởng doanh thu (26–35):** Chăm sóc khách hàng, bán lại, tính giá và tối ưu lợi nhuận. Giúp người dùng quay lại thường xuyên.
- **Lớp 3 — Vận hành và phát triển chuỗi (36–48):** Sản xuất, giao hàng, tiêu chuẩn hóa và phát triển mạng lưới.

**Lưu ý thiết kế chung cho phần Phân tích:** mỗi công cụ ghi nhận số liệu ở cấp cửa hàng; công cụ 47 là nơi tổng hợp các số liệu đó lên cấp chuỗi theo quyền được cấp. Nên thống nhất sớm cách đặt tên chỉ số và mã nguồn (QR, chiến dịch, cửa hàng) để số liệu từ các công cụ cộng gộp được.

> **Nguyên tắc xuyên suốt:** Mỗi công cụ phải trả lời được ba câu hỏi: *Tôi nhận được gì? Tôi dùng kết quả đó để làm gì? Nó giúp tôi tiết kiệm thời gian, có thêm khách hay tăng doanh thu như thế nào?*
