# IOPaint tự host (Mức 2, nợ #104, tiếp #78) — dịch vụ GPU ĐẦU TIÊN trong
# repo `alg-core` (xem tài liệu "Tích hợp IOPaint Outpainting vào
# alg-core", mục "Thiết kế tích hợp" §5 và "Rủi ro").
#
# KHÔNG dùng lại `docker/CPUDockerfile`/`GPUDockerfile` của repo IOPaint
# chính thức — đã xác minh (17/09) hai tệp đó CŨ, còn trỏ tên gói
# `lama-cleaner` (tên cũ của IOPaint trước khi đổi tên dự án). Tệp này viết
# lại từ đầu, dựa trên CLI thật của `iopaint==1.6.0` (`iopaint start --host
# --port --model --device`, đọc trực tiếp từ `iopaint/cli.py`, không suy
# đoán) và bảng phụ thuộc thật của gói đó (`torch>=2.0.0`, xem
# `IOPaint-1.6.0.dist-info/METADATA`).
#
# **CHƯA build/chạy thử trên GPU thật** — môi trường soạn tệp này không có
# GPU. Việc còn lại trước khi coi là xong (Giai đoạn 2 của kế hoạch tích
# hợp): build thật trên máy có GPU, xác nhận `nvidia-smi` thấy card trong
# container, đo thời gian khởi động lần đầu (model SD/SDXL tải về có thể
# vài GB), rồi mới nối vào `IOPAINT_URL`.
#
# Base image dùng bản PyTorch CHÍNH THỨC đã đóng gói sẵn CUDA/cuDNN đúng
# cặp — tránh tự dựng toolchain CUDA từ image Ubuntu trần (rủi ro lệch
# driver/toolkit đã biết là nguồn lỗi phổ biến nhất khi tự build image
# GPU). Đổi tag khi cần khớp driver NVIDIA thật của máy chủ.
FROM pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime

# `opencv-python` (phụ thuộc của iopaint) cần libGL/glib ở tầng hệ điều
# hành — thiếu hai gói này là lỗi build phổ biến nhất khi đóng gói OpenCV
# trên image runtime tối giản (không có sẵn như trên image `-devel`).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Ghim đúng bản đã xác minh thật trong môi trường soạn mã (17/09) — không
# dùng `iopaint` (không ghim phiên bản), để một bản phát hành mới của
# IOPaint không âm thầm đổi hành vi `use_extender`/lược đồ request đã dựa
# vào (xem `iopaint_outpainter.py`).
RUN pip install --no-cache-dir "iopaint==1.6.0"

# Nơi lưu trọng số model — mount volume ngoài vào đây để không tải lại
# nhiều GB mỗi lần container khởi động lại.
ENV IOPAINT_MODEL_DIR=/root/.cache/iopaint
VOLUME ["/root/.cache/iopaint"]

EXPOSE 8080

# `MODEL` đọc từ biến môi trường ở lượt chạy (`docker run -e MODEL=...`),
# KHÔNG hardcode cứng trong logic ImageExpander — đổi model không cần sửa
# mã, đúng nguyên tắc "model là cấu hình, không phải mã" (Luật 3,
# `docs/dac-ta/10-ai-orchestration.md` §1). Mặc định đặt sẵn ở đây (18/09)
# là `kandinsky-community/kandinsky-2-2-decoder-inpaint` — giấy phép
# Apache-2.0 xác nhận xong (cả decoder và prior đi kèm), `support_outpainting`
# xác nhận `true` đọc thẳng `iopaint/schema.py` (whitelist theo tên model).
# KHÔNG dùng LaMa (mặc định của IOPaint) — đã xác minh LaMa không hỗ trợ
# outpainting, `use_extender=true` với LaMa trả 200 OK nhưng không mở rộng
# canvas. Đổi sang một model họ SD/SDXL-inpainting (ảnh thật thường chất
# lượng cao hơn Kandinsky cho ảnh sản phẩm) vẫn cần soát giấy phép riêng
# trước — xem README cạnh tệp này, mục "Trạng thái".
ENV MODEL="kandinsky-community/kandinsky-2-2-decoder-inpaint"
ENV DEVICE="cuda"

# Dạng shell (không phải exec form) để hai biến môi trường ở trên được mở
# rộng lúc container khởi động.
ENTRYPOINT iopaint start \
    --host 0.0.0.0 \
    --port 8080 \
    --device ${DEVICE} \
    --model ${MODEL} \
    --model-dir ${IOPAINT_MODEL_DIR}

# Cách chạy thật (điền vào IOPAINT_URL của alg-core sau khi xác nhận
# container khởi động thành công — xem README cạnh tệp này). `-e MODEL=`
# có thể bỏ qua (dùng mặc định Kandinsky 2.2 đã đặt sẵn ở trên):
#
#   docker build -t alg-iopaint -f docker/iopaint/Dockerfile .
#   docker run --gpus all -p 8080:8080 \
#       -v iopaint-models:/root/.cache/iopaint \
#       alg-iopaint
#
# Trên Apple Silicon (macOS), Docker Desktop KHÔNG pass-through Metal vào
# container — image này chỉ chạy CPU trên máy đó dù máy có GPU thật. Dùng
# `docker/iopaint/run_native_mps.sh` (cài trực tiếp bằng pip, không qua
# Docker) để thử với `mps` trên loại máy này.
