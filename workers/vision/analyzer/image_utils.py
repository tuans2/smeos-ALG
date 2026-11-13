import hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import uniform_filter
from pathlib import Path

# Hàm clahe_luminance_enhance đã gỡ cùng nhánh phân đoạn. Nó là nơi duy nhất
# trong dự án dùng cv2, nên gỡ nó cũng gỡ luôn phụ thuộc opencv-python.


def compute_local_std(img_gray: np.ndarray, window_size: int = 7) -> np.ndarray:
    """
    Tính độ lệch chuẩn cục bộ (local standard deviation) trên cửa sổ window_size x window_size
    sử dụng uniform_filter (fast integral expectation: sqrt(E[X^2] - E[X]^2)).
    Trả về mảng float trong khoảng [0, 1].
    """
    gray_f = img_gray.astype(np.float32) / 255.0
    mean = uniform_filter(gray_f, size=window_size)
    mean_sq = uniform_filter(gray_f**2, size=window_size)
    var = np.maximum(0.0, mean_sq - mean**2)
    return np.sqrt(var)


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def dhash(image: Image.Image, hash_size: int = 8) -> int:
    # Convert to grayscale and resize to (hash_size + 1) x hash_size
    image = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.array(image)
    
    # Compare adjacent pixels
    diff = pixels[:, 1:] > pixels[:, :-1]
    
    # Convert boolean array to integer
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])

def hamming_distance(hash1: int, hash2: int) -> int:
    return bin(hash1 ^ hash2).count("1")

def get_simple_mask_and_bbox(img_np: np.ndarray):
    """
    Very simple salient mask using saturation and brightness difference from background.
    Assuming background is mostly white/gray.
    """
    if img_np.ndim == 3:
        # Convert to HSV-like intuitively or just use max-min (saturation-ish)
        r, g, b = img_np[:,:,0], img_np[:,:,1], img_np[:,:,2]
        max_c = np.maximum(np.maximum(r, g), b)
        min_c = np.minimum(np.minimum(r, g), b)
        sat = max_c - min_c
        # Threshold: if it has some color or is very dark (not white/light gray background)
        mask = (sat > 20) | (max_c < 200)
    else:
        mask = img_np < 200
        
    if not np.any(mask):
        return mask, (0, 0, img_np.shape[1], img_np.shape[0])
        
    y, x = np.where(mask)
    bbox = (x.min(), y.min(), x.max(), y.max())
    return mask, bbox

def laplacian_variance(img_gray: np.ndarray) -> float:
    # Simple laplacian kernel
    # Tích chập Laplace bằng numpy thuần, không cần scipy.signal.
    # Giảm bề mặt phụ thuộc và tránh lỗi khi scipy cài thiếu module con.
    a = img_gray.astype(np.float64)
    lap = (a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]
           - 4.0 * a[1:-1, 1:-1])
    return float(np.var(lap))

def do_sach_nen(img_np: np.ndarray, bien: float = 0.10) -> float:
    """
    Độ đồng nhất của dải viền quanh khung. 1 là nền trơn, 0 là nền lộn xộn.

    Ảnh chụp sản phẩm trên nền phông có viền gần như một màu. Ảnh chụp trong
    cửa hàng có viền đầy kệ, cửa kính và hoa khác. Đây là dấu hiệu rẻ nhất để
    tách hai loại ảnh ấy, và nó không phụ thuộc vào giả định nền sáng màu như
    mặt nạ hiện có.
    """
    if img_np.ndim == 3:
        g = img_np.astype(np.float32).mean(2)
    else:
        g = img_np.astype(np.float32)
    h, w = g.shape[:2]
    by, bx = max(1, int(h * bien)), max(1, int(w * bien))
    vien = np.concatenate([g[:by].ravel(), g[-by:].ravel(),
                           g[:, :bx].ravel(), g[:, -bx:].ravel()])
    return float(np.clip(1.0 - vien.std() / 64.0, 0.0, 1.0))


def ty_le_da_nguoi(img_np: np.ndarray) -> float:
    """
    Tỷ lệ pixel màu da trên khung.

    Ảnh có người mẫu cầm sản phẩm luôn cao hơn hẳn ảnh chỉ chụp sản phẩm.
    Cần chỉ số này vì mặt nạ diện tích đang tính người, tóc và quần áo là
    sản phẩm, nên ảnh có người lại được điểm diện tích cao nhất.

    Lọc theo sắc độ và độ bão hoà chứ không theo ngưỡng RGB. Luật RGB quen
    dùng bắt nhầm hoa vàng và hoa cam: cánh cúc vàng có đỏ cao, lục vừa, lam
    thấp nên thoả hết điều kiện. Đo trên GHĐT0002, luật RGB chấm ảnh nền
    trắng không người là 8,5 phần trăm, cao hơn cả ngưỡng loại. Da người có
    sắc độ dưới 32 độ và bão hoà vừa phải; cánh hoa vàng nằm quanh 48 độ và
    bão hoà trên 0,9, nên hai điều kiện ấy tách được chúng.
    """
    if img_np.ndim != 3:
        return 0.0
    f = img_np.astype(np.float32) / 255.0
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    mx, mn = f.max(2), f.min(2)
    d = mx - mn
    v = mx
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = m & (mx == r)
    h[i] = (60 * ((g - b) / np.maximum(d, 1e-6)) % 360)[i]
    i = m & (mx == g)
    h[i] = (60 * ((b - r) / np.maximum(d, 1e-6)) + 120)[i]
    i = m & (mx == b)
    h[i] = (60 * ((r - g) / np.maximum(d, 1e-6)) + 240)[i]
    da = (((h <= 32) | (h >= 350)) & (s >= 0.12) & (s <= 0.58)
          & (v >= 0.35) & (v <= 0.96) & (r > g) & (g > b))
    return float(da.mean())


def score_image(path: Path) -> dict:
    """
    Chấm điểm một ảnh để chọn ảnh đại diện cho mã sản phẩm.

    Trả về các thành phần thô; trọng số nằm ở compute_final_score.
    """
    try:
        with Image.open(path) as img:
            img = img.convert("RGB")
            width, height = img.size
            min_side = min(width, height)
            
            # Generate dhash
            img_hash = dhash(img)
            
            # Convert to numpy for analysis
            # Resize for faster mask & laplacian if too large, but laplacian needs sharpness.
            # Let's limit max size to 800 for analysis to save time
            max_dim = 800
            scale = 1.0
            if max(width, height) > max_dim:
                scale = max_dim / max(width, height)
                img_small = img.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)
            else:
                img_small = img
                
            img_np = np.array(img_small)
            img_gray = np.array(img_small.convert("L"))
            
            # 1. Mask and Bbox
            mask, bbox = get_simple_mask_and_bbox(img_np)
            mask_area = np.sum(mask)
            total_area = mask.size
            area_ratio = mask_area / total_area if total_area > 0 else 0
            
            # 2. Sharpness
            sharpness = laplacian_variance(img_gray)
            
            # 3. Resolution (min side)
            res_score = min_side
            
            # 4. Centering
            cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
            img_cx, img_cy = img_small.width / 2, img_small.height / 2
            # Distance from center normalized by image diagonal
            diag = np.sqrt(img_small.width**2 + img_small.height**2)
            dist = np.sqrt((cx - img_cx)**2 + (cy - img_cy)**2) / diag
            center_score = 1.0 - dist # 1.0 is perfectly centered
            
            return {
                "hash": img_hash,
                "area_ratio": area_ratio,
                "sharpness": sharpness,
                "res_score": res_score,
                "center_score": center_score,
                "nen_sach": do_sach_nen(img_np),
                "da_nguoi": ty_le_da_nguoi(img_np),
                "valid": True
            }
    except Exception as e:
        return {"valid": False, "error": str(e)}

def compute_final_score(scores_list: list) -> list:
    """
    Chuẩn hoá từng thành phần trong nhóm rồi tính điểm cuối. Giữ nguyên thứ tự.

    Tỷ lệ diện tích từng nặng 0,4 — nặng nhất — và đó là chỗ hỏng. Mặt nạ
    diện tích giả định nền sáng màu, nên trên ảnh chụp trong cửa hàng thì
    người, tóc, tạp dề, kệ hàng và hoa trưng bày đều bị tính là sản phẩm.
    Đo trên ba ảnh của GHĐT0002: ảnh nền trắng sạch được 0,45 còn ảnh chụp
    cả cửa hàng được 0,84, và ảnh cửa hàng thắng dù độ nét chỉ bằng 43 phần
    trăm. Ảnh thắng ấy đem đi phân tích cho cụm vàng 14 phần trăm bảng màu
    và số bông đếm ra bằng một nửa sự thật.

    Nay diện tích còn 0,20, độ nét lên 0,30 vì đó là chỉ số duy nhất không
    phụ thuộc giả định về nền, và thêm hai chỉ số chống đúng lỗi trên: nền
    có sạch không, và trong ảnh có người không.
    """
    if not scores_list:
        return []

    def lay(k, mac_dinh=0.0):
        return [s.get(k, mac_dinh) or mac_dinh for s in scores_list]

    def norm(arr):
        arr = np.asarray(arr, dtype=float)
        min_v, max_v = np.min(arr), np.max(arr)
        if max_v - min_v < 1e-6:
            return np.ones_like(arr)
        return (arr - min_v) / (max_v - min_v)

    n_area = norm(lay('area_ratio'))
    n_sharp = norm(lay('sharpness'))
    n_res = norm(lay('res_score'))
    n_center = norm(lay('center_score'))
    n_nen = norm(lay('nen_sach'))
    n_khong_nguoi = 1.0 - norm(lay('da_nguoi'))

    final_scores = (0.20 * n_area + 0.30 * n_sharp + 0.10 * n_res
                    + 0.10 * n_center + 0.15 * n_nen + 0.15 * n_khong_nguoi)

    for i, s in enumerate(scores_list):
        s['final_score'] = float(final_scores[i])

    return scores_list
