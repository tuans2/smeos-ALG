from collections import deque
import os
import numpy as np
from PIL import Image

def rgb_to_lab(rgb_pixels):
    """Convert RGB array of shape (N, 3) to CIELAB."""
    # Normalize RGB to 0-1
    rgb = rgb_pixels.astype(np.float32) / 255.0
    
    # sRGB to Linear RGB
    mask = rgb > 0.04045
    rgb[mask] = np.power((rgb[mask] + 0.055) / 1.055, 2.4)
    rgb[~mask] = rgb[~mask] / 12.92
    
    # Linear RGB to XYZ (D65)
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    
    # XYZ to CIELAB
    x = x / 0.95047
    y = y / 1.00000
    z = z / 1.08883
    
    xyz = np.stack([x, y, z], axis=1)
    mask = xyz > 0.008856
    xyz[mask] = np.power(xyz[mask], 1/3)
    xyz[~mask] = (7.787 * xyz[~mask]) + (16.0 / 116.0)
    
    fx, fy, fz = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    
    l = (116.0 * fy) - 16.0
    a = 500.0 * (fx - fy)
    b_channel = 200.0 * (fy - fz)
    
    return np.stack([l, a, b_channel], axis=1)

def lab_to_rgb(lab_pixels):
    """Convert Lab array of shape (N, 3) back to RGB (0-255)."""
    l, a, b = lab_pixels[:, 0], lab_pixels[:, 1], lab_pixels[:, 2]
    
    fy = (l + 16.0) / 116.0
    fx = (a / 500.0) + fy
    fz = fy - (b / 200.0)
    
    fxyz = np.stack([fx, fy, fz], axis=1)
    
    xyz = np.zeros_like(fxyz)
    mask = fxyz**3 > 0.008856
    xyz[mask] = fxyz[mask]**3
    xyz[~mask] = (fxyz[~mask] - 16.0/116.0) / 7.787
    
    x = xyz[:, 0] * 0.95047
    y = xyz[:, 1] * 1.00000
    z = xyz[:, 2] * 1.08883
    
    # Linear XYZ to Linear RGB
    r = x *  3.2404542 + y * -1.5371385 + z * -0.4985314
    g = x * -0.9692660 + y *  1.8760108 + z *  0.0415560
    b_channel = x *  0.0556434 + y * -0.2040259 + z *  1.0572252
    
    rgb = np.stack([r, g, b_channel], axis=1)
    rgb = np.clip(rgb, 0, 1)
    
    # Linear RGB to sRGB
    mask = rgb > 0.0031308
    rgb[mask] = 1.055 * np.power(rgb[mask], 1/2.4) - 0.055
    rgb[~mask] = rgb[~mask] * 12.92
    
    return np.clip(np.round(rgb * 255.0), 0, 255).astype(np.uint8)

def rgb_to_hsv(rgb_pixels):
    """Convert RGB array of shape (N, 3) to HSV."""
    rgb = rgb_pixels.astype(np.float32) / 255.0
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    
    v = np.max(rgb, axis=1)
    m = np.min(rgb, axis=1)
    c = v - m
    
    s = np.zeros_like(v)
    mask = v > 0
    s[mask] = c[mask] / v[mask]
    
    h = np.zeros_like(v)
    
    mask = (c > 0) & (v == r)
    h[mask] = ((g[mask] - b[mask]) / c[mask]) % 6
    
    mask = (c > 0) & (v == g)
    h[mask] = ((b[mask] - r[mask]) / c[mask]) + 2
    
    mask = (c > 0) & (v == b)
    h[mask] = ((r[mask] - g[mask]) / c[mask]) + 4
    
    h = (h * 60) % 360
    
    return h, s, v

# Ngưỡng phân cụm. Sắc độ tính bằng khoảng cách tới trục xám trong Lab.
NGUONG_SAC = 10.0        # dưới mức này coi là không màu
NGUONG_GOP_MAU = 8.0     # gộp hai cụm có màu khi cách nhau dưới mức này
NGUONG_GOP_TRANG = 12.0  # cụm trắng gộp lỏng hơn, tránh vụn ra nhiều sắc xám
TOI_THIEU_MAU = 0.008    # cụm có màu chỉ cần 0,8% diện tích là giữ
TOI_THIEU_TRANG = 0.03   # cụm trắng phải đạt 3%
SO_CUM_TOI_DA = 8


def _phan_cum(lab, k, nguong_gop):
    """
    K-means trong Lab cho một nhóm pixel, rồi gộp các cụm quá gần nhau.

    Trả về danh sách (tâm, số pixel), đã bỏ cụm rỗng.
    """
    n = lab.shape[0]
    if n == 0 or k <= 0:
        return []
    k = min(k, n)

    # Khởi tạo kiểu k-means++ rút gọn: điểm đầu ngẫu nhiên, các điểm sau
    # lấy điểm xa nhất so với những tâm đã chọn.
    np.random.seed(42)
    tam = [lab[np.random.randint(n)]]
    xa = np.sum((lab - tam[0]) ** 2, axis=1)
    for _ in range(1, k):
        if np.max(xa) == 0:
            break
        i = int(np.argmax(xa))
        tam.append(lab[i])
        xa = np.minimum(xa, np.sum((lab - lab[i]) ** 2, axis=1))
    tam = np.array(tam)

    for _ in range(25):
        nhan = np.argmin(np.sum((lab[:, None, :] - tam[None, :, :]) ** 2, axis=2), axis=1)
        moi = np.array([lab[nhan == i].mean(axis=0) if np.any(nhan == i) else tam[i]
                        for i in range(len(tam))])
        dich = np.sum(np.sqrt(np.sum((moi - tam) ** 2, axis=1)))
        tam = moi
        if dich < 1.0:
            break

    nhan = np.argmin(np.sum((lab[:, None, :] - tam[None, :, :]) ** 2, axis=2), axis=1)
    dem = np.bincount(nhan, minlength=len(tam)).astype(np.int64)

    while True:
        gop = False
        for i in range(len(tam)):
            for j in range(i + 1, len(tam)):
                if dem[i] == 0 or dem[j] == 0:
                    continue
                if np.sqrt(np.sum((tam[i] - tam[j]) ** 2)) < nguong_gop:
                    tong = dem[i] + dem[j]
                    tam[i] = (tam[i] * dem[i] + tam[j] * dem[j]) / tong
                    dem[i], dem[j] = tong, 0
                    gop = True
                    break
            if gop:
                break
        if not gop:
            break

    return [(tam[i], int(dem[i])) for i in range(len(tam)) if dem[i] > 0]


def extract_palette(image_path, k=8, max_side=240):
    # Step 1: Load and resize
    with Image.open(image_path) as img:
        img = img.convert("RGB")
        w, h = img.size
        if max(w, h) > max_side:
            ratio = max_side / max(w, h)
            new_w, new_h = int(w * ratio), int(h * ratio)
            img = img.resize((new_w, new_h), Image.LANCZOS)
    
    img_arr = np.array(img, dtype=np.uint8)
    h, w, _ = img_arr.shape
    total_pixels = h * w
    
    # Step 2: Tách nền. Màu nền suy từ chính dải mép ảnh, không dùng ngưỡng cứng.
    #
    # Trước đây điều kiện là cả ba kênh >= 238, chênh kênh <= 10 và độ mịn
    # <= 0,015. Ba ngưỡng cứng ấy hỏng theo hai kiểu.
    #
    # Nền không phải trắng tinh thì trượt hết. Đo trên các crop đang có: mép
    # ảnh có trung vị RGB từ 142 tới 253, và năm trên sáu ảnh chỉ có 0 tới 7
    # phần trăm điểm ảnh mép qua nổi ngưỡng 238.
    #
    # Nền trắng thật cũng vỡ vụn. GHCB0027-1 nền trắng, mép sáng 0,87 tới
    # 0,94, nhưng 5 phần trăm điểm ảnh nền trượt phép kiểm độ mịn ở chỗ
    # chuyển sáng và bóng dưới chân đế. Năm phần trăm ấy đủ dựng thành tường
    # chắn: vùng nền đủ mịn vỡ thành bảy mảnh rời, phép loang từ mép chỉ với
    # tới mảnh lớn nhất chiếm 52 phần trăm, bỏ sót 29 phần trăm khung. Phần
    # bỏ sót gộp cụm với hồng trắng và cho ra 165 bông hồng.
    #
    # Nay lấy trung vị màu ở dải mép làm mốc và cho dung sai quanh nó. Phép
    # loang từ mép vẫn giữ nguyên, vì đó mới là thứ tách được cánh hoa trắng
    # khỏi nền trắng: hai vùng ấy có độ mịn gần như bằng nhau, 0,0031 với
    # 0,0020, nên chỉ tính liên thông mới phân biệt được.
    from vision.analyzer.image_utils import compute_local_std  # sửa đường dẫn import khi đóng gói lại thành package - EXTEND E6, khong doi logic
    gray = np.array(img.convert("L"))
    std_map = compute_local_std(gray, window_size=7)

    vien = max(2, int(round(0.02 * min(h, w))))
    mep = np.concatenate([
        img_arr[:vien].reshape(-1, 3), img_arr[-vien:].reshape(-1, 3),
        img_arr[:, :vien].reshape(-1, 3), img_arr[:, -vien:].reshape(-1, 3)])
    goc = np.median(mep, axis=0)
    # Dung sai theo độ tản mạn của chính dải mép, chặn trong khoảng 12 tới 40
    # để nền loang loáng vẫn nhận mà nền có vật thể thì không nuốt lan.
    toa = float(np.median(np.abs(mep - goc)))
    dung_sai = float(np.clip(4.0 * toa + 12.0, 12.0, 40.0))
    lech = np.abs(img_arr.astype(np.int16) - goc.astype(np.int16)).max(axis=2)

    max_c = np.max(img_arr, axis=2)
    min_c = np.min(img_arr, axis=2)
    # Độ mịn cũng lấy mốc từ dải mép thay vì hằng số. Giữ phép kiểm này để
    # phép loang dừng lại ở ranh giới sản phẩm, nhưng nới đủ để không tự cắt
    # nền thành mảnh.
    mep_std = std_map[:vien].ravel()
    nguong_std = float(np.clip(np.percentile(mep_std, 95) * 3.0, 0.015, 0.12))
    is_bg_color = (lech <= dung_sai) & ((max_c - min_c) <= max(10, dung_sai)) \
        & (std_map <= nguong_std)
    
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    # Add all edge pixels
    for x in range(w):
        queue.append((0, x))
        queue.append((h-1, x))
    for y in range(1, h-1):
        queue.append((y, 0))
        queue.append((y, w-1))
        
    for y, x in queue:
        visited[y, x] = True
        
    mask_bg = np.zeros((h, w), dtype=bool)
    
    # Flood fill
    dirs = [(-1,0), (1,0), (0,-1), (0,1)]
    while queue:
        y, x = queue.popleft()
        if is_bg_color[y, x]:
            mask_bg[y, x] = True
            for dy, dx in dirs:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                    
    # The product is where mask_bg is False
    mask_product = ~mask_bg
    
    # Erode product mask by 1 pixel to remove anti-aliasing edges
    eroded_product = np.copy(mask_product)
    for y in range(h):
        for x in range(w):
            if mask_product[y, x]:
                for dy, dx in dirs:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask_bg[ny, nx]:
                        eroded_product[y, x] = False
                        break
                        
    product_pixels_cnt = np.sum(eroded_product)
    source = "algorithm"
    
    if product_pixels_cnt < 0.05 * total_pixels:
        eroded_product = np.ones((h, w), dtype=bool)
        source = "algorithm_no_mask"
        product_pixels_cnt = total_pixels
        
    product_pixel_ratio = int(round(product_pixels_cnt * 100 / total_pixels))
    
    # Extract RGB values of product
    product_rgb = img_arr[eroded_product]
    
    # Step 6: Aux metrics
    hue, sat, val = rgb_to_hsv(product_rgb)
    green_mask = (hue >= 65) & (hue <= 175) & (sat > 0.12)
    green_ratio = int(round(np.sum(green_mask) * 100 / product_pixels_cnt))
    saturation_avg = int(round(np.mean(sat) * 100))
    brightness_avg = int(round(np.mean(val) * 100))
    
    # Step 3: Phân cụm hai tầng
    #
    # Ảnh hoa chụp trên phông trắng có tới bốn phần năm số pixel gần như
    # không màu: nền, voan, giấy gói, và bản thân hoa trắng. Phân cụm một
    # lần trên toàn bộ vùng sản phẩm thì gần hết độ phân giải cụm bị tiêu
    # vào việc chia nhỏ các sắc trắng, còn những mảng có màu thật — thứ duy
    # nhất cho biết loài nào là loài nào — bị dồn xuống dưới ngưỡng và loại
    # bỏ. Đo trên một ảnh vòng hoa: cúc tím chiếm 2,8 phần trăm pixel nhưng
    # cụm của nó chỉ ra 1 phần trăm, bị loại, và mô hình không hề biết trong
    # ảnh có màu tím nào cần giải trình.
    #
    # Vì vậy tách pixel không màu và pixel có màu thành hai nhóm rồi phân
    # cụm riêng. Nhóm có màu được chia phần lớn số cụm dù nó là thiểu số
    # pixel, vì mỗi phần trăm diện tích có màu mang nhiều thông tin hơn hẳn
    # một phần trăm diện tích trắng.
    product_lab = rgb_to_lab(product_rgb)
    N = product_lab.shape[0]

    sac = np.sqrt(product_lab[:, 1] ** 2 + product_lab[:, 2] ** 2)
    co_mau = sac >= NGUONG_SAC
    n_mau = int(np.sum(co_mau))

    # Chia số cụm: nhóm có màu luôn được ít nhất một nửa, trừ khi ảnh gần
    # như không có màu nào.
    if n_mau < 0.01 * N:
        k_mau, k_trang = 0, k
    elif n_mau > 0.6 * N:
        k_mau, k_trang = max(2, k - 3), min(3, k - 2)
    else:
        k_mau = max(2, int(round(k * 0.6)))
        k_trang = max(2, k - k_mau)

    cum = []
    if k_mau and n_mau:
        cum += _phan_cum(product_lab[co_mau], k_mau, NGUONG_GOP_MAU)
    if k_trang:
        cum += _phan_cum(product_lab[~co_mau], k_trang, NGUONG_GOP_TRANG)

    # Step 5: Lọc và chuẩn hoá
    # Cụm có màu giữ ở ngưỡng thấp hơn hẳn cụm trắng, vì một mảng màu nhỏ
    # thường là cả một loại hoa còn một mảng trắng nhỏ thường chỉ là bóng đổ.
    valid_clusters = []
    for tam, dem in cum:
        ratio = dem / N
        co = np.sqrt(tam[1] ** 2 + tam[2] ** 2) >= NGUONG_SAC
        if ratio >= (TOI_THIEU_MAU if co else TOI_THIEU_TRANG):
            valid_clusters.append({'lab': tam, 'ratio': ratio, 'count': dem})

    valid_clusters.sort(key=lambda x: x['count'], reverse=True)
    if os.getenv("ALG_DEBUG_MAU") or os.getenv("FLORAOS_DEBUG_MAU"):  # tên cũ vẫn nhận
        for vc in valid_clusters:
            c_rgb = lab_to_rgb(vc['lab'].reshape(1, 3))
            print("  cụm màu RGB:", c_rgb, "tỷ lệ:", round(vc['ratio'], 4))

    valid_clusters = valid_clusters[:SO_CUM_TOI_DA]
    
    # Convert to Hex and normalize percentages
    palette = []
    if not valid_clusters:
        # Fallback if somehow all clusters are removed
        rgb_mean = np.mean(product_rgb, axis=0).reshape(1, 3)
        hex_val = '#{:02X}{:02X}{:02X}'.format(int(rgb_mean[0,0]), int(rgb_mean[0,1]), int(rgb_mean[0,2]))
        palette.append({"hex": hex_val, "ratio_percent": 100})
    else:
        total_valid_count = sum(c['count'] for c in valid_clusters)
        ratios = [c['count'] * 100.0 / total_valid_count for c in valid_clusters]
        int_ratios = [int(round(r)) for r in ratios]
        
        # fix rounding to exact 100
        diff = 100 - sum(int_ratios)
        if int_ratios:
            int_ratios[0] += diff
            
        for idx, c in enumerate(valid_clusters):
            lab_arr = c['lab'].reshape(1, 3)
            rgb_arr = lab_to_rgb(lab_arr)
            hex_val = '#{:02X}{:02X}{:02X}'.format(rgb_arr[0,0], rgb_arr[0,1], rgb_arr[0,2])
            palette.append({
                "hex": hex_val,
                "ratio_percent": int_ratios[idx]
            })
            
    return {
        "palette": palette,
        "green_ratio": green_ratio,
        "saturation_avg": saturation_avg,
        "brightness_avg": brightness_avg,
        "product_pixel_ratio": product_pixel_ratio,
        "source": source,
        "mask": eroded_product
    }

def get_color_name_from_hex(hex_str: str) -> str:
    """Suy ra tên màu cơ bản từ mã HEX khi LLM trả về rỗng."""
    try:
        hex_str = hex_str.lstrip('#')
        r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
        rgb = np.array([[r, g, b]])
        h, s, v = rgb_to_hsv(rgb)
        h_val, s_val, v_val = h[0], s[0], v[0]
        
        if v_val < 0.15:
            return "Đen"
        if s_val < 0.12:
            if v_val > 0.85:
                return "Trắng"
            return "Xám"
            
        if h_val < 15 or h_val >= 345:
            return "Đỏ"
        elif h_val < 35:
            return "Cam"
        elif h_val < 62:
            return "Vàng"
        elif h_val < 160:
            return "Xanh lá"
        elif h_val < 260:
            return "Xanh dương"
        elif h_val < 320:
            return "Tím"
        else:
            return "Hồng"
    except Exception:
        return "Màu khác"


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = extract_palette(sys.argv[1])
        print(res)
