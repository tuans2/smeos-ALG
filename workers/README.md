# Worker Python

Hai worker, chung một Postgres và một lược đồ Prisma với `src/`.

| Thư mục | Module | Pha |
|---|---|---|
| `vision/` | M01 — phân tích ảnh sản phẩm | P5 |
| `media_ai/` | M04a — tối ưu ảnh sản phẩm | P9 |

## Cách lấy việc (D6-1)

```
SELECT … FROM generation_jobs
 WHERE status = 'PENDING'
 FOR UPDATE SKIP LOCKED
```
đánh thức bằng `LISTEN/NOTIFY`.

Cấm tuyệt đối `subprocess.Popen` + parse stdout. Cấm chạy job qua HTTP. HTTP nội bộ chỉ dành cho lời gọi ngắn đồng bộ như kiểm tra sức khoẻ.

## Luật của worker

1. `organization_id` lấy **chỉ từ dòng job**. Không suy từ dữ liệu ảnh, không nhận từ tham số client.
2. Cập nhật `stage` khi đổi bước, `result` khi có phán quyết, `status` sau cùng. Ba trục tách rời.
3. **Không ghi `usage`.** Usage ghi ở phía core tại điểm tạo job, vì hạn mức phải chặn trước khi job vào bảng.
4. Worker đọc lược đồ sinh sẵn từ Prisma, không tự khai bảng.
5. `media_ai/` gọi `vision/` qua cổng `VisionAnalyzer` (`providers/vision_bridge/`), không import trực tiếp mã nội bộ của `vision/`.

## Chạy

```bash
cd workers && python -m media_ai.worker
cd workers && python3 -m pytest tests -q
```
