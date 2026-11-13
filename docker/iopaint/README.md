# IOPaint tự host — Mức 2 (nợ #104, tiếp #78)

Dịch vụ GPU đầu tiên trong `alg-core`. Xem tài liệu tích hợp đầy đủ:
"Tích hợp IOPaint Outpainting vào alg-core" (Claude Doc, 17/09).

## Trạng thái

**Model đã chọn xong, giấy phép sạch (18/09). Chưa chạy thử thật trên GPU
— cả ở container CUDA lẫn native `mps`.**

### Model: `kandinsky-community/kandinsky-2-2-decoder-inpaint`

Giấy phép **Apache-2.0**, xác nhận trên trang model HuggingFace của cả
`kandinsky-2-2-decoder-inpaint` và `kandinsky-2-2-prior` (mà
`AutoPipelineForInpainting` tự tải kèm) — không ràng buộc thương mại nào,
khác với `runwayml/stable-diffusion-inpainting` (CreativeML Open RAIL++-M,
model card ghi "chỉ cho nghiên cứu" nhưng điều khoản license thật cho phép
thương mại có điều kiện — **vẫn chưa soát xong**, không dùng làm mặc định
vì lý do đó, không phải vì bản thân license cấm).

`support_outpainting=true` xác nhận đọc thẳng `iopaint/schema.py`
(`iopaint==1.6.0`, dòng 88-96): Kandinsky 2.2 được liệt kê riêng theo TÊN
model (`self.name in [KANDINSKY22_NAME, POWERPAINT_NAME]`), tách biệt với
nhánh whitelist theo họ SD/SDXL — vì kiến trúc Kandinsky khác SD/SDXL, xác
nhận theo tên chứ không suy đoán từ `model_type`. **Không dùng `lama`**
(mặc định của IOPaint) — đã xác minh LaMa không hỗ trợ outpainting,
`use_extender=true` với LaMa trả 200 OK nhưng không mở rộng canvas.

Đánh đổi đã biết, chưa đo được vì chưa chạy thật: Kandinsky 2.2 thường cho
ảnh kém chân thực hơn một model họ SD/SDXL-inpainting khi outpaint nền ảnh
sản phẩm — đây là lý do các model SD/SDXL vẫn để ngỏ như lựa chọn thay thế
sau khi soát xong giấy phép, không phải Kandinsky là lựa chọn cuối cùng
duy nhất.

### Việc còn lại trước khi coi là xong (Giai đoạn 2 của kế hoạch tích hợp)

1. Build image trên máy có GPU NVIDIA thật (VPS, khi có), xác nhận
   `nvidia-smi` bên trong container thấy đúng card — HOẶC chạy native qua
   `run_native_mps.sh` (mục dưới) trên Apple Silicon để thử nhanh trước.
2. Đo thời gian khởi động lần đầu (model tải về vài GB) và dung lượng
   VRAM/RAM cần thiết thật.
3. Nối `IOPAINT_URL` (`.env`) trỏ vào container/tiến trình này, chạy thử
   `IOPaintExpander` thật qua `expand_provider=iopaint`.

## Chạy trên Apple Silicon (mps, thử nhanh trên laptop)

Docker Desktop trên macOS không pass-through GPU Metal vào container Linux
— chạy `Dockerfile` này trên máy Apple Silicon chỉ chạy CPU dù máy có GPU
thật. Cách duy nhất dùng được GPU của máy (M-series) là cài `iopaint`
thẳng bằng `pip`, không qua Docker:

```bash
./docker/iopaint/run_native_mps.sh
```

Script cài `iopaint==1.6.0` vào một venv riêng (`.venv-iopaint/`, không
đụng tới môi trường Python của `alg-core`) và khởi động
`iopaint start --device mps --model kandinsky-community/kandinsky-2-2-decoder-inpaint`
trên `127.0.0.1:8080`. Sau khi thấy log khởi động xong, xác nhận bằng lệnh
health-check ở mục dưới rồi nối vào `.env`:

**Cần Python 3.9-3.12 trên máy** (đã xác minh thật 18/09) — `iopaint==1.6.0`
kéo theo `Pillow==9.5.0`, bản này không có wheel dựng sẵn cho Python 3.13+
(kể cả 3.14) và `setup.py` cũ của nó lỗi (`KeyError: '__version__'`) khi
pip phải build từ mã nguồn với setuptools hiện đại. Script tự dò một bản
Python tương thích đã cài trên máy; nếu không thấy sẽ báo cài qua
`brew install python@3.11` rồi chạy lại.

```
IOPAINT_URL=http://127.0.0.1:8080
IOPAINT_MODEL=kandinsky-community/kandinsky-2-2-decoder-inpaint
IOPAINT_DEVICE=mps
```

Chỉ dùng cho phát triển/thử nhanh trên laptop — hạ tầng thật vẫn chuyển
sang VPS/CUDA khi lên production (đã chốt 18/09, xem tài liệu tích hợp).

## Chạy thử (container, GPU NVIDIA/VPS)

```bash
docker build -t alg-iopaint -f docker/iopaint/Dockerfile .

docker run --gpus all -p 8080:8080 \
    -v iopaint-models:/root/.cache/iopaint \
    alg-iopaint

# Từ alg-core:
# IOPAINT_URL=http://localhost:8080
# IOPAINT_MODEL=kandinsky-community/kandinsky-2-2-decoder-inpaint
# IOPAINT_DEVICE=cuda
```

Đổi model (`-e MODEL=<tên-model>`) sang một model khác cần soát giấy phép
riêng trước — xem mục "Model" ở trên.

Không có endpoint health-check riêng (đã xác minh) — `GET /api/v1/model`
là cách rẻ nhất để kiểm container đã sẵn sàng và đọc lại `support_outpainting`
của model đang chạy:

```bash
curl http://localhost:8080/api/v1/model
```

## Chủ sở hữu hạ tầng

Đã chốt 18/09: laptop cá nhân (MacBook Air M3, chạy native qua
`run_native_mps.sh`) cho giai đoạn phát triển, chuyển sang VPS khi lên
production — xem tài liệu tích hợp. Đội vận hành VPS, ai theo dõi chi phí
điện/thuê máy, ai patch bảo mật vẫn là quyết định mở riêng cho giai đoạn
production, chưa cần chốt ở giai đoạn phát triển hiện tại.
