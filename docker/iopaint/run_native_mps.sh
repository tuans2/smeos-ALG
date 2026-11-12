#!/usr/bin/env bash
# Chạy IOPaint NATIVE (không qua Docker) trên Apple Silicon — nợ #104,
# tiếp #78. Xem docker/iopaint/README.md, mục "Chạy trên Apple Silicon".
#
# Docker Desktop trên macOS không pass-through GPU Metal vào container
# Linux — image `docker/iopaint/Dockerfile` (dựng cho CUDA) chỉ chạy CPU
# trên máy Apple Silicon dù máy có GPU thật. Cách duy nhất dùng được GPU
# của máy (M-series, kiến trúc Metal/`mps`) là cài `iopaint` thẳng bằng
# `pip` lên chính máy, không qua Docker — đúng như script này làm.
#
# Cài vào một venv RIÊNG (`.venv-iopaint/`, cạnh script này) — không đụng
# tới môi trường Python của `workers/` (alg-core dùng Poetry/venv
# riêng cho worker, IOPaint có bảng phụ thuộc rất khác — torch, diffusers,
# gradio — không nên trộn vào cùng một venv).
#
# Chỉ dùng cho phát triển/thử nhanh trên laptop. Hạ tầng thật chuyển sang
# VPS/CUDA khi lên production (đã chốt 18/09 — xem tài liệu tích hợp).
set -euo pipefail

CD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${CD_DIR}/.venv-iopaint"

# Ghim đúng bản đã xác minh thật (đọc trực tiếp mã nguồn gói, không suy
# đoán — xem docstring iopaint_outpainter.py) — không dùng `iopaint` trần,
# để một bản phát hành mới không âm thầm đổi hành vi `use_extender`/lược
# đồ request mà `IOPaintExpander` đã dựa vào.
IOPAINT_VERSION="1.6.0"

# Model mặc định: Apache-2.0, support_outpainting=true xác nhận đọc thẳng
# iopaint/schema.py — xem README.md, mục "Model". Đổi bằng biến môi
# trường MODEL=<tên-khác> nếu cần thử model khác (vẫn phải tự soát giấy
# phép của model đó trước).
MODEL="${MODEL:-kandinsky-community/kandinsky-2-2-decoder-inpaint}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8080}"

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
    echo "Cảnh báo: script này viết cho Apple Silicon (darwin/arm64)." >&2
    echo "Máy hiện tại: $(uname -s)/$(uname -m) — --device mps sẽ lỗi nếu không phải Apple Silicon." >&2
fi

# `iopaint==1.6.0` kéo theo `Pillow==9.5.0` (bảng phụ thuộc thật, xem
# METADATA của gói) — bản Pillow này KHÔNG có wheel dựng sẵn cho Python
# 3.13+ (kể cả 3.14), pip phải build từ mã nguồn và `setup.py` cũ của nó
# lỗi ngay với setuptools hiện đại (`KeyError: '__version__'`) — đã xác
# minh thật (18/09, máy anh Tony: `python3` trỏ vào 3.14). KHÔNG dùng
# `python3` trần — dò một bản 3.9–3.12 đã cài sẵn trên máy.
PYTHON_BIN=""
for candidate in python3.11 python3.10 python3.12 python3.9 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
        ver="$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || true)"
        case "$ver" in
            3.9|3.10|3.11|3.12)
                PYTHON_BIN="$candidate"
                break
                ;;
        esac
    fi
done

if [[ -z "$PYTHON_BIN" ]]; then
    echo "Không tìm thấy Python 3.9-3.12 trên máy — cần bản này để cài" >&2
    echo "iopaint==1.6.0 (Python 3.13+/3.14 làm pip build Pillow 9.5.0 từ" >&2
    echo "mã nguồn và lỗi). Cài một bản qua Homebrew rồi chạy lại script:" >&2
    echo "" >&2
    echo "    brew install python@3.11" >&2
    echo "" >&2
    exit 1
fi

echo "Dùng ${PYTHON_BIN} ($("$PYTHON_BIN" -c 'import sys; print(sys.version.split()[0])')) cho venv IOPaint."

if [[ -d "$VENV_DIR" ]]; then
    # venv đã tồn tại nhưng có thể dựng bằng Python sai (vd. lần chạy
    # trước dùng `python3` trỏ vào 3.14, cài Pillow lỗi giữa chừng) — kiểm
    # lại đúng phiên bản trước khi dùng lại, không giả định venv cũ đúng.
    ver_hien_co="$("${VENV_DIR}/bin/python3" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "?")"
    ver_can="$("$PYTHON_BIN" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
    if [[ "$ver_hien_co" != "$ver_can" ]]; then
        echo "venv cũ dựng bằng Python ${ver_hien_co}, cần ${ver_can} — xoá và tạo lại."
        rm -rf "$VENV_DIR"
    fi
fi

if [[ ! -d "$VENV_DIR" ]]; then
    echo "Tạo venv riêng cho IOPaint tại ${VENV_DIR}..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

pip install --upgrade pip >/dev/null
pip install "iopaint==${IOPAINT_VERSION}"

echo ""
echo "Khởi động IOPaint — model=${MODEL}, device=mps, ${HOST}:${PORT}"
echo "Lần đầu chạy sẽ tải model về (có thể vài GB) — chờ log báo khởi động"
echo "xong rồi mới xác nhận bằng: curl http://${HOST}:${PORT}/api/v1/model"
echo ""

iopaint start \
    --host "$HOST" \
    --port "$PORT" \
    --device mps \
    --model "$MODEL"
