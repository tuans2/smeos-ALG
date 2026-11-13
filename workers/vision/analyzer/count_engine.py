#!/usr/bin/env python3
"""
Đếm số lượng từng loại hoa bằng ba kênh độc lập rồi đối chiếu.

Kênh 1  llm       : mô hình phán, đã ổn định bằng temperature 0 và trung vị 2 lượt
Kênh 2  dien_tich : diện tích cụm màu chia cho diện tích một bông
Kênh 3  chan_tren : chặn trên vật lý, dùng để bác các con số vô lý

Ba kênh lệch quá NGUONG_LECH thì để trống số lượng và bật cảnh báo,
không bao giờ ghi một con số mà hệ thống không tin.

Chỉ phụ thuộc numpy.
"""

import numpy as np
from scipy import ndimage

# Giá trị mặc định, dùng khi chạy module riêng lẻ hoặc khi không có file cấu
# hình. Bản chạy thật nạp đè bằng nap_cau_hinh() ngay sau khi đọc config.json.
#
# Trước đây bốn tham số dưới đây có mặt trong config.json nhưng không nhánh mã
# nào đọc tới, nên sửa file cấu hình không đổi được gì — trái hẳn câu mở đầu
# của chính file ấy là "sửa ở đây, không sửa trong mã". Đã gặp ba lần cùng
# một kiểu lỗi trong dự án này, nên nay thêm nap_cau_hinh() và một phép tự
# kiểm đối chiếu khoá khai với khoá thật sự đọc.
HE_SO_XEP_CHONG = 1.15      # cánh hoa chồng nhau nên diện tích chiếu nhỏ hơn tổng
NGUONG_LECH = 0.25          # 25 phần trăm
HE_SO_NOI_CHAN_TREN = 1.80  # nới chặn trên vì đường kính bông chỉ là ước lượng
NGUONG_KET_CAU = None       # None nghĩa là tự suy từng ảnh
DAO_DONG_BONG_TREN_CANH = 0.25  # cành thật lệch bao nhiêu so với số trung bình
TY_LE_CHE_KHUAT = {         # quy số bông nhìn thấy ra tổng số bông
    "Một mặt": 1.05,
    "Hai mặt": 1.55,
    "Toàn diện 360": 1.85,
}

# Khoá trong config.json ứng với từng hằng số ở trên. Dùng cho cả phép nạp đè
# lẫn phép tự kiểm, để hai bên không bao giờ lệch nhau nữa.
KHOA_CAU_HINH = {
    "he_so_xep_chong": "HE_SO_XEP_CHONG",
    "nguong_lech_dem": "NGUONG_LECH",
    "he_so_noi_chan_tren": "HE_SO_NOI_CHAN_TREN",
    "nguong_ket_cau_hoa": "NGUONG_KET_CAU",
    "ty_le_che_khuat": "TY_LE_CHE_KHUAT",
    "dao_dong_bong_tren_canh": "DAO_DONG_BONG_TREN_CANH",
}


def nap_cau_hinh(cfg):
    """
    Nạp đè các hằng số đo đạc bằng giá trị trong config.json.

    Trả danh sách khoá đã nạp, để nơi gọi in ra và người dùng thấy tham số
    mình sửa có thật sự vào việc hay không.
    """
    da_nap = []
    for khoa, ten_hang in KHOA_CAU_HINH.items():
        if khoa not in (cfg or {}):
            continue
        gt = cfg[khoa]
        if khoa == "nguong_ket_cau_hoa" or gt is not None:
            globals()[ten_hang] = gt
            da_nap.append(khoa)
    return da_nap

# Bông to thì đếm viền bông là đúng: cánh rộng, ranh giới rõ, mỗi bông một
# khối. Bông nhỏ mọc chùm thì cánh trắng của các bông liền nhau dính thành
# một mảng không tách được, nhưng nhuỵ thì không bao giờ chồng lên nhuỵ. Nên
# dưới mốc này, đếm nhuỵ mới là phép đo, đếm bông chỉ là phỏng đoán.
NGUONG_BONG_NHO_CM = 4.5
TY_LE_NHUY_MAC_DINH = 0.35   # đường kính nhuỵ trên đường kính bông
NGUONG_DE_NHUY = 0.60        # nhuỵ lệch kênh mô hình quá mức này thì nhuỵ thắng
BAN_KINH_NHUY_TOI_THIEU = 2.5   # px, dưới mức này ảnh không đủ nét để đếm
SAI_SO_BAN_KINH_NHUY = 2.5   # nhuỵ đo lệch quá ngần này lần so với danh mục thì bác

# Dải màu nhuỵ, hue tính bằng độ trên vòng 360.
DAI_MAU_NHUY = {
    "vàng":  {"hue": (40, 76),   "sat": (0.35, 1.01), "val": (0.55, 1.01)},
    "cam":   {"hue": (20, 45),   "sat": (0.40, 1.01), "val": (0.45, 1.01)},
    "nâu":   {"hue": (15, 50),   "sat": (0.25, 1.01), "val": (0.15, 0.60)},
    "đen":   {"hue": (0, 360),   "sat": (0.00, 1.01), "val": (0.00, 0.25)},
    "xanh":  {"hue": (70, 165),  "sat": (0.25, 1.01), "val": (0.25, 1.01)},
    "trắng": {"hue": (0, 360),   "sat": (0.00, 0.18), "val": (0.82, 1.01)},
}


# ---------------------------------------------------------------- kênh 4
def _hsv(arr):
    """RGB float 0..1 sang HSV, hue tính bằng độ. Chỉ dùng numpy."""
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx, mn = arr.max(-1), arr.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    kh = d > 1e-6
    idx = kh & (mx == r)
    h[idx] = (60 * ((g[idx] - b[idx]) / d[idx])) % 360
    idx = kh & (mx == g)
    h[idx] = 60 * ((b[idx] - r[idx]) / d[idx]) + 120
    idx = kh & (mx == b)
    h[idx] = 60 * ((r[idx] - g[idx]) / d[idx]) + 240
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    return h, s, mx


def mat_na_nhuy(arr, mask, mau):
    """Vùng nhuỵ của một màu khai trong danh mục, trả mặt nạ nhị phân."""
    dai = None
    for ten, d in DAI_MAU_NHUY.items():
        if ten in str(mau or "").strip().lower():
            dai = d
            break
    if dai is None:
        return None
    h, s, v = _hsv(arr)
    lo, hi = dai["hue"]
    kh = (h >= lo) & (h <= hi) if lo <= hi else ((h >= lo) | (h <= hi))
    m = (kh & (s >= dai["sat"][0]) & (s < dai["sat"][1])
         & (v >= dai["val"][0]) & (v < dai["val"][1]))
    return m & mask if mask is not None else m


def dem_theo_nhuy(arr, mask, mau, ban_kinh_mong=None):
    """
    Đếm bông bằng số nhuỵ, dùng cực đại cục bộ của biến đổi khoảng cách.

    Bán kính nhuỵ không khai trước mà đo ngay trên ảnh: lấy phân vị 90 của
    biến đổi khoảng cách trong vùng nhuỵ. Nhuỵ dính nhau thì biến đổi khoảng
    cách vẫn thắt lại ở chỗ tiếp giáp, mỗi nhuỵ giữ một đỉnh riêng.

    ban_kinh_mong : bán kính nhuỵ suy từ đường kính bông và tỷ lệ nhuỵ trên
                    bông của danh mục. Dùng để bác trường hợp dải màu bắt
                    nhầm thứ khác: khai nhuỵ trắng cho bó hồng thì mặt nạ ôm
                    trọn tờ giấy gói và trả về bán kính 189px, một nhuỵ to
                    bằng cả bó hoa.

    Trả (số bông, bán kính nhuỵ px, số điểm ảnh nhuỵ) hoặc (None, ...) khi
    không dựng được mặt nạ, ảnh không đủ nét, hoặc mặt nạ bắt nhầm.
    """
    try:
        from scipy import ndimage as ndi
    except ImportError:
        return None, None, None

    m = mat_na_nhuy(arr, mask, mau)
    if m is None or m.sum() < 60:
        return None, None, int(m.sum()) if m is not None else None

    m = ndi.binary_opening(m, np.ones((3, 3), bool))
    if m.sum() < 60:
        return None, None, int(m.sum())

    d = ndi.distance_transform_edt(m)
    r = float(np.percentile(d[m], 90))
    if r < BAN_KINH_NHUY_TOI_THIEU:
        # Nhuỵ chỉ còn vài điểm ảnh. Đỉnh và nhiễu không phân biệt được nữa,
        # con số đếm ra sẽ thấp hơn thật, thà không trả gì còn hơn trả sai.
        return None, round(r, 2), int(m.sum())

    if ban_kinh_mong and not (1 / SAI_SO_BAN_KINH_NHUY
                              <= r / ban_kinh_mong <= SAI_SO_BAN_KINH_NHUY):
        return None, round(r, 2), int(m.sum())

    k = int(max(3, 2 * round(r) + 1))
    dinh = (d >= ndi.maximum_filter(d, size=k)) & (d >= 0.55 * r) & m
    n = int(ndi.label(dinh, structure=np.ones((3, 3), bool))[1])
    return n, round(r, 2), int(m.sum())


def dem_nhuy_thay_dem_bong(x):
    """
    Loài này nên tin kênh nhuỵ hơn kênh bông hay không.

    Chỉ khi danh mục khai màu nhuỵ, và bông nhỏ tới mức viền bông không còn
    tách được. Hồng bảy phân đếm bông vẫn đúng nên kênh nhuỵ không đụng vào.
    """
    if not x.get("mau_nhuy"):
        return False
    dk = x.get("duong_kinh_cm")
    return bool(dk) and float(dk) <= NGUONG_BONG_NHO_CM


# ---------------------------------------------------------------- kênh 2
def _hop_trung_binh(x, k):
    """Trung bình cục bộ cửa sổ (2k+1) bằng ảnh tích phân."""
    p = np.pad(x, k, mode="edge")
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    s = 2 * k + 1
    return (c[s:, s:] - c[:-s, s:] - c[s:, :-s] + c[:-s, :-s]) / (s * s)


def do_lech_chuan_cuc_bo(anh_rgb, k=3):
    """Độ lệch chuẩn cục bộ trên kênh độ sáng. Cửa sổ 7x7 khi k=3."""
    L = anh_rgb.mean(2)
    mu = _hop_trung_binh(L, k)
    return np.sqrt(np.maximum(_hop_trung_binh(L * L, k) - mu * mu, 0))


def mat_na_ket_cau(anh_rgb, mat_na_sp, nguong=None):
    """
    Vùng có kết cấu, dùng để tách cánh hoa khỏi vải và nền cùng màu.

    Đo trên vòng hoa tang lễ: cánh cúc trắng có độ lệch chuẩn cục bộ 0,038;
    nơ voan trắng 0,015; nền phông 0,003. Ba vùng này cùng màu trắng nên
    phân cụm theo màu gộp chúng làm một, khiến diện tích hoa phồng lên nhiều
    lần. Kết cấu tách được chúng.

    nguong None thì suy từ chính ảnh: một nửa trung vị của vùng sản phẩm,
    kẹp trong khoảng 0,015 đến 0,035 để không quá nhạy với ảnh mờ hay nét.
    """
    sd = do_lech_chuan_cuc_bo(anh_rgb)
    if nguong is None:
        tv = float(np.median(sd[mat_na_sp])) if mat_na_sp.any() else 0.02
        nguong = min(0.035, max(0.015, tv * 0.5))
    return sd >= nguong, nguong


def dien_tich_theo_cum(anh_rgb, mat_na_sp, tam_cum, loc_ket_cau=True, nguong=None):
    """
    Gán mỗi pixel sản phẩm về cụm màu gần nhất, trả diện tích theo cụm.

    anh_rgb   : mảng (H, W, 3) giá trị 0..1
    mat_na_sp : mảng bool (H, W)
    tam_cum   : mảng (K, 3) tâm cụm màu 0..1, lấy từ color_engine

    Trả về (dien_tich_tho, dien_tich_ket_cau, nguong_da_dung).
    Dùng dien_tich_ket_cau cho hoa và lá; dien_tich_tho cho vải, giấy, nơ.
    """
    C = np.asarray(tam_cum, dtype=np.float32)
    if not mat_na_sp.any() or len(C) == 0:
        z = np.zeros(len(C), dtype=int)
        return z, z, nguong

    X = anh_rgb[mat_na_sp].reshape(-1, 3).astype(np.float32)
    nhan = ((X[:, None, :] - C[None, :, :]) ** 2).sum(2).argmin(1)
    tho = np.bincount(nhan, minlength=len(C))

    if not loc_ket_cau:
        return tho, tho, nguong

    mkc, nguong = mat_na_ket_cau(
        anh_rgb, mat_na_sp, NGUONG_KET_CAU if nguong is None else nguong)
    giu = mkc[mat_na_sp]
    kc = np.bincount(nhan[giu], minlength=len(C))
    return tho, kc, nguong


def nhan_cum(anh_rgb, mat_na_sp, tam_cum):
    """Bản đồ nhãn cụm màu cho cả khung. Ngoài mặt nạ sản phẩm ghi -1."""
    C = np.asarray(tam_cum, dtype=np.float32)
    lab = np.full(anh_rgb.shape[:2], -1, dtype=np.int16)
    if not mat_na_sp.any() or len(C) == 0:
        return lab
    X = anh_rgb[mat_na_sp].reshape(-1, 3).astype(np.float32)
    lab[mat_na_sp] = ((X[:, None, :] - C[None, :, :]) ** 2).sum(2).argmin(1)
    return lab


def duong_kinh_tu_nhuy(mat_na_loai, ty_le_nhuy, canh_ngan_px=None,
                       san_dia=0.030, toi_thieu_dia=3):
    """
    Đo đường kính một bông qua đĩa nhuỵ, trả (đường kính px, số đĩa đo được).

    Đĩa nhuỵ là lỗ khép kín nằm giữa vòng cánh, nên tìm nó bằng phép lấp lỗ
    trên mặt nạ cánh rồi trừ đi chính mặt nạ ấy. Không cần biết màu nhuỵ, chỉ
    cần cánh khép thành vòng quanh nó.

    Vì sao đo nhuỵ chứ không đo bông: bông cắm sát nhau thì cánh chạm nhau và
    dính thành một khối, mọi phép đo trên khối ấy đều trượt — đo trên
    GHĐT0002-1 cho từ 29 tới 79 px tuỳ cách ước. Đĩa nhuỵ thì luôn rời nhau
    và tương phản mạnh. Đo cùng ảnh ở năm thang từ 512 tới 2048 px, tỷ lệ đĩa
    nhuỵ trên cạnh ngắn ra 0,0511 với độ tản mạn 3,1 phần trăm, trong khi tỷ
    lệ đường kính bông mô hình khai dao động 22 phần trăm giữa các lượt.

    Đường kính bông suy ra bằng đường kính đĩa chia cho tỷ lệ nhuỵ trên bông
    của loài, lấy ở cột đã có sẵn trong danh mục.
    """
    if not ty_le_nhuy or ty_le_nhuy <= 0 or mat_na_loai is None:
        return None, 0
    # Mặt nạ cụm màu lấy thẳng từ phân cụm nên rỗ và có rìa răng cưa. Không
    # làm sạch thì phép lấp lỗ sinh ra hàng chục mảnh vụn, trung vị tụt xuống
    # còn hai phần ba và đường kính bông suy ra sai theo bình phương.
    m0 = ndimage.binary_closing(
        ndimage.binary_opening(mat_na_loai, np.ones((3, 3))), np.ones((5, 5)))
    lo = ndimage.binary_fill_holes(m0) & ~m0
    lo = ndimage.binary_opening(lo, np.ones((3, 3)))
    lab, n = ndimage.label(lo)
    if not n:
        return None, 0
    dt = ndimage.sum(lo, lab, range(1, n + 1))
    dk = np.array([2.0 * np.sqrt(s / np.pi) for s in dt])
    # Sàn tính theo cạnh ngắn vùng sản phẩm chứ không theo số pixel cố định,
    # để phép đo không đổi khi thang đo ảnh đổi. Khe hở giữa các cánh cũng
    # thành lỗ khép kín nhưng nhỏ hơn đĩa nhuỵ nhiều lần. Không lấy sàn theo
    # tỷ lệ với đĩa lớn nhất vì hai đĩa dính nhau sẽ nâng mốc lên và loại mất
    # phần lớn đĩa thật.
    san = san_dia * canh_ngan_px if canh_ngan_px else 0.0
    giu = dk[dk >= san]
    if len(giu) < toi_thieu_dia:
        return None, int(len(giu))
    return float(np.median(giu)) / float(ty_le_nhuy), int(len(giu))


def thang_px_moi_cm(hoa):
    """
    Số điểm ảnh trên mỗi centimet, suy từ loài đã đo được đường kính.

    Chỉ nhận loài có `_nguon_dk` là phép đo thật, không nhận loài lấy đường
    kính từ ước lượng của mô hình — nếu không thì thang đo lại mang đúng sai
    số mà nó sinh ra để loại bỏ. Nhiều loài đo được thì lấy trung vị.
    """
    v = []
    for f in hoa or []:
        if not isinstance(f, dict):
            continue
        if str(f.get("_nguon_dk") or "") != "đo nhuỵ":
            continue
        dk_px, dk_cm = f.get("_duong_kinh_px"), f.get("duong_kinh_cm")
        if dk_px and dk_cm:
            try:
                v.append(float(dk_px) / float(dk_cm))
            except (TypeError, ValueError, ZeroDivisionError):
                pass
    return trung_vi(v)


def dem_canh_theo_dien_tich(dien_tich_px, dt_canh_cm2, px_moi_cm):
    """
    Số cành ước tính từ diện tích cụm màu, dành cho hoa mọc chùm.

    Đi thẳng từ diện tích ra cành, không qua bông. Với loài như baby thì
    đường kính một bông cỡ 2cm không đo được trên ảnh, mà sai số của nó lại
    bình phương lên trong phép chia diện tích rồi còn chia tiếp cho bốn mươi
    bông mỗi cành. Diện tích một cành phủ thì đo được và ổn định hơn hẳn.

    Trả None khi thiếu số đo hoặc thiếu thang quy đổi, để nơi gọi lùi về
    đường cũ là đếm bông rồi chia.
    """
    if not dien_tich_px or not dt_canh_cm2 or not px_moi_cm:
        return None
    dt_canh_px = float(dt_canh_cm2) * float(px_moi_cm) ** 2
    if dt_canh_px <= 0:
        return None
    return max(1, int(round(float(dien_tich_px) * HE_SO_XEP_CHONG / dt_canh_px)))


def dt_cac_mang(mat_na_loai):
    """Diện tích từng mảng rời của một cụm màu, đã mở hình thái."""
    if mat_na_loai is None or not mat_na_loai.any():
        return []
    m = ndimage.binary_opening(mat_na_loai, np.ones((5, 5)))
    lab, n = ndimage.label(m)
    if not n:
        return []
    return sorted((float(x) for x in ndimage.sum(m, lab, range(1, n + 1))),
                  reverse=True)


def dem_chum_roi(mat_na_loai, dt_canh_px=None, san=0.25):
    """
    Đếm số mảng rời của một cụm màu, mỗi mảng coi là một cành.

    Dùng cho hoa mọc chùm khi không có thang quy đổi để tính theo diện tích:
    một cành baby hay thuý châu là một chùm xoè riêng, cắm cạnh nhau vẫn
    thường thấy khe. Mở hình thái trước để tách những chỗ chỉ dính nhau bằng
    vài điểm ảnh.

    Kênh này đếm thiếu khi các cành chồng lên nhau thật, nên nó đứng sau kênh
    diện tích một cành và chỉ dùng khi kênh kia không chạy được. Mảng nhỏ hơn
    `san` lần diện tích một cành bị bỏ, vì đó là mảnh vụn chứ không phải cành.

    Kênh này chỉ dùng được khi biết một cành phủ bao nhiêu điểm ảnh, tức khi
    ảnh có thang quy đổi. Không có thang thì phép đếm không tự biết mình đang
    đếm cành hay đếm mảng cánh dính nhau.

    Đo trên hai bó cúc tana thật, cắm dày: cụm màu tách ra bốn mảng lớn, phân
    bố kích thước trơn tru đúng như bốn cành rời — max chia trung vị 1,5 và
    mảng lớn nhất chỉ chiếm 29 phần trăm tổng. Không dấu hiệu hình học nào
    phân biệt được với bốn cành thật, trong khi bó có khoảng hai mươi cành.
    Cho nó bỏ phiếu thì khoảng chốt nở từ 15–25 thành 4–20, tệ hơn lúc chưa
    có kênh này. Chỉ diện tích một cành mới bác được: mỗi mảng ở đây lớn gấp
    nhiều lần một cành.

    Trả (số cành, diện tích trung vị mỗi mảng, số mảng thô).
    """
    if mat_na_loai is None or not mat_na_loai.any():
        return None, None, 0
    m = ndimage.binary_opening(mat_na_loai, np.ones((5, 5)))
    lab, n = ndimage.label(m)
    if not n:
        return None, None, 0
    dt = np.asarray(ndimage.sum(m, lab, range(1, n + 1)), dtype=float)
    if dt_canh_px and dt_canh_px > 0:
        giu = dt[dt >= san * float(dt_canh_px)]
        if len(giu) < 3:
            return None, None, int(n)
        tv = float(np.median(giu))
        # Mảng lớn gấp đôi một cành nghĩa là nhiều cành đã nhập làm một.
        if tv > 2.0 * float(dt_canh_px):
            return None, round(tv, 1), int(n)
        return int(len(giu)), round(tv, 1), int(n)
    giu = dt[dt >= san * dt.max()]
    if len(giu) < 3:
        return None, None, int(n)
    return None, round(float(np.median(giu)), 1), int(n)


def px_moi_bong(duong_kinh_px):
    """Diện tích chiếu của một bông, tính bằng pixel."""
    if not duong_kinh_px or duong_kinh_px <= 0:
        return None
    return np.pi * (duong_kinh_px / 2.0) ** 2


def dem_theo_dien_tich(dien_tich_px, duong_kinh_px, he_so=None):
    """Số bông ước tính từ diện tích. Trả None khi thiếu đường kính."""
    he_so = HE_SO_XEP_CHONG if he_so is None else he_so
    a = px_moi_bong(duong_kinh_px)
    if a is None or not dien_tich_px:
        return None
    return int(round(dien_tich_px * he_so / a))


def duong_kinh_px_tu_ty_le(ty_le, canh_ngan_px):
    """
    Đổi tỷ lệ đường kính bông trên cạnh ngắn vùng sản phẩm thành pixel.
    ty_le do mô hình cung cấp trong lượt tiền kiểm.
    """
    if not ty_le or not canh_ngan_px:
        return None
    return float(ty_le) * float(canh_ngan_px)


# ---------------------------------------------------------------- kênh 3
def chan_tren(dien_tich_hoa_px, duong_kinh_px, he_so=None):
    """
    Số bông tối đa có thể nhét vừa vùng hoa. Dùng để bác giá trị vô lý.
    Ví dụ đã gặp: 200 bông cho một bó cầm tay, 240 bông cho bó 15 hoa hồng.
    """
    he_so = HE_SO_XEP_CHONG if he_so is None else he_so
    a = px_moi_bong(duong_kinh_px)
    if a is None or not dien_tich_hoa_px:
        return None
    # Nới 80 phần trăm cho sai số đường kính. Số lượng tỷ lệ nghịch với bình
    # phương đường kính nên chặn quá sát sẽ bác nhầm giá trị đúng: bó hồng
    # thật có 15 đến 18 bông, kênh diện tích cho 13, nới 35 phần trăm chỉ ra
    # chặn 17 và sẽ bác nhầm con số 18.
    return int(round(dien_tich_hoa_px * he_so / a * HE_SO_NOI_CHAN_TREN))


# ---------------------------------------------------------------- chốt
def trung_vi(vals):
    v = [x for x in vals if isinstance(x, (int, float)) and x > 0]
    return float(np.median(v)) if v else None


def chot(kenh_llm, kenh_dt, kenh_chan, nguong=None, ten=""):
    """
    Chốt số lượng từ ba kênh. Luôn trả về một khoảng, không bao giờ để trống.

    Nguyên tắc: thà đưa một khoảng thật thà còn hơn một con số giả chính xác,
    và cũng hơn một ô trống vì ô trống thì không dùng được vào việc gì.

      hai kênh sát nhau   -> số chính xác, min bằng max
      hai kênh lệch xa    -> khoảng trải từ kênh thấp tới kênh cao
      chỉ một kênh chạy   -> khoảng nới 25 phần trăm hai bên
      không kênh nào      -> khoảng từ 1 tới chặn trên vật lý

    Trả thêm so_luong_min và so_luong_max. so_luong là giá trị đại diện, dùng
    khi cần một con số duy nhất, và bằng trung điểm của khoảng.
    """
    nguong = NGUONG_LECH if nguong is None else nguong
    cb = []
    ct = {"llm": kenh_llm, "dien_tich": kenh_dt, "chan_tren": kenh_chan}

    def ra(lo, hi, tin, cach):
        lo, hi = max(0, int(round(lo))), max(0, int(round(hi)))
        if lo > hi:
            lo, hi = hi, lo
        # Chặn trên vật lý suy từ diện tích và đường kính bông. Cả khoảng
        # nằm trên chặn trên nghĩa là một trong hai phía sai: hoặc đếm thừa,
        # hoặc đường kính đo lệch. Nới khoảng xuống tới chặn và báo, thay vì
        # im lặng đưa ra con số mà chính phép đo vật lý bác bỏ.
        if kenh_chan and lo > kenh_chan:
            cb.append(f"TRÊN CHẶN VẬT LÝ{': ' + ten if ten else ''} "
                      f"(chốt {lo}–{hi}, chặn {int(kenh_chan)})")
            lo = int(kenh_chan)
            tin = min(tin, 40)
        return {"so_luong": int(round((lo + hi) / 2)), "so_luong_min": lo,
                "so_luong_max": hi, "do_tin_cay": tin, "cach_dem": cach,
                "canh_bao": cb, "chi_tiet": ct}

    llm = kenh_llm if isinstance(kenh_llm, (int, float)) and kenh_llm > 0 else None
    dt = kenh_dt if isinstance(kenh_dt, (int, float)) and kenh_dt > 0 else None

    # Kênh mô hình vượt xa chặn trên vật lý thì bác hẳn. Vượt ít thì giữ,
    # vì chặn trên suy từ đường kính bông vốn chỉ là ước lượng.
    if kenh_chan and llm and llm > kenh_chan:
        boi = llm / kenh_chan
        if boi >= 4:
            cb.append(f"VƯỢT CHẶN TRÊN{': ' + ten if ten else ''} "
                      f"({llm} > {kenh_chan}, gấp {boi:.1f} lần) — đã bác")
            llm = None

    co = [v for v in (llm, dt) if v]
    if not co:
        if kenh_chan:
            cb.append(f"ĐẾM THẤT BẠI{': ' + ten if ten else ''}, "
                      f"chỉ suy được từ chặn trên vật lý")
            return ra(1, kenh_chan, 10, "chỉ chặn trên")
        cb.append(f"ĐẾM THẤT BẠI{': ' + ten if ten else ''}")
        return {"so_luong": None, "so_luong_min": None, "so_luong_max": None,
                "do_tin_cay": 0, "cach_dem": "THẤT BẠI", "canh_bao": cb,
                "chi_tiet": ct}

    if len(co) == 1:
        v = co[0]
        cb.append(f"MỘT KÊNH{': ' + ten if ten else ''}")
        return ra(v * 0.75, v * 1.25, 45, "một kênh, nới 25%")

    tv = trung_vi(co)
    lech = max(abs(v - tv) / tv for v in co)
    if lech > nguong:
        cb.append(f"ĐẾM LỆCH{': ' + ten if ten else ''} "
                  f"llm={kenh_llm} diện tích={kenh_dt} lệch {lech*100:.0f}%")
        return ra(min(co), max(co), 35, "khoảng giữa hai kênh")

    tin = int(round(95 - lech * 100))
    return ra(tv, tv, max(60, min(95, tin)), "hai kênh đồng thuận")


def hieu_chinh_duong_kinh(hoa, canh_ngan_px):
    """
    Sửa lại đường kính bông bằng tỷ lệ tương đối trong danh mục.

    Mô hình ước cỡ tương đối khá kém với bông nhỏ. Ca vòng hoa tang lễ: nó cho
    cúc Rossi tỷ lệ 0,10 và hồng môn 0,17, tức chênh 1,7 lần, trong khi danh
    mục ghi 4 cm và 12 cm, tức phải chênh 3 lần. Hậu quả là diện tích một bông
    cúc bị thổi lên bốn lần và số bông tính ra chỉ còn một phần tư.

    Cách sửa: lấy loài có đường kính thật lớn nhất làm mốc, vì mô hình ước cỡ
    lớn đáng tin hơn, rồi suy số pixel trên mỗi cm và tính lại cho các loài
    còn lại theo đúng đường kính trong danh mục.

    Sửa trực tiếp trên các phần tử, thêm khoá _duong_kinh_px và _nguon_dk.

    Loài nào đã đo được đường kính qua đĩa nhuỵ thì giữ nguyên số đo ấy và
    không hiệu chỉnh lại: nó là phép đo trên chính tấm ảnh, đáng tin hơn mọi
    phép suy từ ước lượng của mô hình. Loài đo được cũng được ưu tiên làm mốc
    quy đổi cho các loài còn lại, vì thang px trên cm suy từ nó là thang đo
    chứ không phải thang đoán.
    """
    da_do = [f for f in hoa or [] if f.get("_nguon_dk") == "đo nhuỵ"
             and f.get("_duong_kinh_px") and f.get("duong_kinh_cm")]
    if da_do and canh_ngan_px:
        moc = max(da_do, key=lambda f: float(f["duong_kinh_cm"]))
        px_moi_cm = float(moc["_duong_kinh_px"]) / float(moc["duong_kinh_cm"])
        for f in hoa or []:
            if f.get("_nguon_dk") == "đo nhuỵ":
                continue
            if f.get("duong_kinh_cm"):
                f["_duong_kinh_px"] = float(f["duong_kinh_cm"]) * px_moi_cm
                f["_nguon_dk"] = f"danh mục, quy từ {moc.get('name')} đo nhuỵ"
            elif f.get("bloom_diameter_ratio"):
                f["_duong_kinh_px"] = float(f["bloom_diameter_ratio"]) * canh_ngan_px
                f["_nguon_dk"] = "mô hình"
        return hoa

    co_cm = [f for f in hoa or []
             if f.get("duong_kinh_cm") and f.get("bloom_diameter_ratio")]
    if len(co_cm) < 2 or not canh_ngan_px:
        for f in hoa or []:
            if f.get("bloom_diameter_ratio"):
                f["_duong_kinh_px"] = float(f["bloom_diameter_ratio"]) * canh_ngan_px
                f["_nguon_dk"] = "mô hình"
        return hoa

    moc = max(co_cm, key=lambda f: float(f["duong_kinh_cm"]))
    px_moi_cm = (float(moc["bloom_diameter_ratio"]) * canh_ngan_px
                 / float(moc["duong_kinh_cm"]))
    for f in hoa or []:
        if f.get("duong_kinh_cm"):
            f["_duong_kinh_px"] = float(f["duong_kinh_cm"]) * px_moi_cm
            f["_nguon_dk"] = ("mô hình, làm mốc" if f is moc
                              else f"danh mục, quy từ {moc.get('name')}")
        elif f.get("bloom_diameter_ratio"):
            f["_duong_kinh_px"] = float(f["bloom_diameter_ratio"]) * canh_ngan_px
            f["_nguon_dk"] = "mô hình"
    return hoa


def chot_danh_sach(hoa, dien_tich_theo_loai, canh_ngan_px, nguong=None,
                   anh_net=None, mat_na_net=None, canh_ngan_net=None):
    """
    Chốt số lượng cho từng loại hoa.

    hoa                  : list dict, mỗi dict cần name, quantity (kênh llm),
                           và một trong hai: duong_kinh_cm hoặc bloom_diameter_ratio
    dien_tich_theo_loai  : dict {tên loại: số pixel}
    canh_ngan_px         : cạnh ngắn của hộp bao vùng sản phẩm, tính bằng pixel
    anh_net, mat_na_net  : ảnh ở thang đo cao và mặt nạ sản phẩm tương ứng,
                           chỉ dùng cho kênh nhuỵ; để None thì kênh nhuỵ tắt

    Sửa trực tiếp trên bản sao và trả về (danh sách mới, danh sách cảnh báo).
    """
    nguong = NGUONG_LECH if nguong is None else nguong
    hoa = hieu_chinh_duong_kinh(hoa, canh_ngan_px)
    px_moi_cm = thang_px_moi_cm(hoa)
    ra, cb_all = [], []
    for h in hoa or []:
        x = dict(h)
        ten = x.get("name") or ""
        # Tra diện tích theo tên hiện tại, lùi về tên gốc khi tên đã bị đổi
        # bởi bước ánh xạ danh mục.
        dt = dien_tich_theo_loai.get(ten)
        if dt is None and x.get("_ten_goc"):
            dt = dien_tich_theo_loai.get(x["_ten_goc"])

        dk_px = x.get("_duong_kinh_px") or duong_kinh_px_tu_ty_le(
            x.get("bloom_diameter_ratio"), canh_ngan_px)

        k_dt = dem_theo_dien_tich(dt, dk_px)
        k_ct = chan_tren(dt, dk_px)

        # Kênh diện tích luôn cho ra số BÔNG: nó chia diện tích cụm màu cho
        # diện tích một bông. Mô hình thì đếm theo đơn vị của danh mục. Với
        # hoa chùm (ĐVT Cành) hai kênh không cùng đơn vị, tỷ lệ lệch giữa
        # chúng đúng bằng số bông trên cành, nên phép đối chiếu luôn báo lệch
        # và kênh diện tích bị loại oan. Đo trên bó cúc tana: mô hình 8 cành,
        # diện tích 188 bông, tỷ lệ 23,5 sát với 25 bông/cành của danh mục —
        # hai kênh thực ra đang đồng thuận. Quy kênh diện tích về đơn vị của
        # kênh mô hình trước khi đối chiếu, giữ lại số bông thô để soát.
        k_dt_bong, k_ct_bong = k_dt, k_ct
        btc = x.get("bong_tren_canh") or 1
        if (x.get("dvt_dem") or "").strip() == "Cành" and btc > 1:
            if k_dt:
                k_dt = max(1, int(round(k_dt / float(btc))))
            if k_ct:
                k_ct = max(1, int(round(k_ct / float(btc))))

            # Với hoa mọc chùm, đo thẳng ra cành đáng tin hơn đo ra bông rồi
            # chia. Đường kính một bông baby cỡ 2cm không đo được trên ảnh, và
            # sai số của nó bình phương lên rồi lại chia cho 40; còn mảng một
            # cành phủ thì đo được, và cành mới là đơn vị nhân viên đặt hàng.
            k_canh = dem_canh_theo_dien_tich(dt, x.get("dt_canh_cm2"), px_moi_cm)
            if not k_canh and x.get("_mat_na_mang") and px_moi_cm \
                    and x.get("dt_canh_cm2"):
                # Đếm mảng rời, nhưng chỉ khi từng mảng có kích thước đúng
                # bằng một cành. Không có phép so ấy thì mảng cánh dính nhau
                # cũng bị đếm là cành.
                dt_canh_px = float(x["dt_canh_cm2"]) * px_moi_cm ** 2
                mang = [v for v in x["_mat_na_mang"] if v >= 0.25 * dt_canh_px]
                if len(mang) >= 3:
                    tv = float(np.median(mang))
                    if tv <= 2.0 * dt_canh_px:
                        k_canh = len(mang)
                        x["_kenh_chum_roi"] = k_canh
            if k_canh:
                x["_kenh_dt_canh"] = k_canh
                k_dt = k_canh
                if k_ct:
                    k_ct = max(k_ct, int(round(k_canh * HE_SO_NOI_CHAN_TREN)))

        # Kênh nhuỵ. Đếm số nhuỵ trên ảnh thang đo cao, ra số bông, rồi quy
        # về đơn vị của kênh mô hình để đối chiếu được.
        k_nh_bong, k_nh, r_nhuy = None, None, None
        if anh_net is not None and x.get("mau_nhuy"):
            bk_mong = None
            if canh_ngan_net and x.get("bloom_diameter_ratio"):
                bk_mong = (float(x["bloom_diameter_ratio"]) * canh_ngan_net
                           * float(x.get("ty_le_nhuy") or TY_LE_NHUY_MAC_DINH) / 2)
            k_nh_bong, r_nhuy, _ = dem_theo_nhuy(anh_net, mat_na_net,
                                                 x.get("mau_nhuy"), bk_mong)
            if k_nh_bong:
                k_nh = k_nh_bong
                if (x.get("dvt_dem") or "").strip() == "Cành" and btc > 1:
                    k_nh = max(1, int(round(k_nh_bong / float(btc))))

        # Kênh diện tích chia diện tích cụm màu cho diện tích một bông, mà
        # đường kính bông có khi lại do chính mô hình đoán. Khi đó nó không
        # phải bằng chứng độc lập: nó là phán đoán của kênh một, bình phương
        # lên. Mô hình đoán đường kính nhỏ 17 phần trăm thì kênh diện tích
        # phồng 45 phần trăm, rồi hai kênh "đồng thuận" và hệ thống nâng độ
        # tin cậy lên. Đo trên bó hồng cam: sự thật 15 bông, mô hình nói 23,
        # diện tích nói 21, chốt 28.
        #
        # Nên khi đường kính chưa được danh mục hiệu chỉnh, kênh diện tích
        # và chặn trên chỉ để tham khảo, không được bỏ phiếu. Chúng vẫn được
        # ghi lại đầy đủ trong chi tiết đếm để người soát nhìn thấy.
        # Loài làm mốc được gán "mô hình, làm mốc", và chuỗi đó không nằm
        # trong danh sách loại trừ cũ nên nó vẫn bỏ phiếu — đúng thứ mà chú
        # thích trên kia nói phải loại. Loài làm mốc theo định nghĩa là loài
        # lấy đường kính thẳng từ mô hình, chưa qua hiệu chỉnh danh mục.
        # Đo trên GHĐT0002-1: cùng một ảnh, cùng seed, mô hình khai tỷ lệ
        # đường kính 0,17 rồi 0,2 rồi 0,126 qua ba lượt. Số bông tỉ lệ nghịch
        # với bình phương đường kính nên kênh diện tích nhảy từ 11 lên 45, và
        # vì nó được bỏ phiếu nên kết quả chốt thành khoảng 15–45.
        #
        # Hai kênh dành riêng cho hoa mọc chùm thì không dính vào chuyện này:
        # diện tích một cành và đếm mảng rời đều không dùng đường kính bông,
        # nên chúng độc lập với kênh mô hình dù đường kính có do mô hình đoán
        # hay không. Loại chúng theo `_nguon_dk` là loại oan, và loại oan thì
        # loài mọc chùm mất luôn kênh thứ hai — đúng chỗ đang thiếu nhất.
        nguon = x.get("_nguon_dk")
        doc_lap = bool(nguon) and not str(nguon).startswith("mô hình")
        if x.get("_kenh_dt_canh"):
            doc_lap = True

        # Kênh diện tích không bỏ phiếu nữa, chỉ còn làm chặn trên.
        #
        # Đối chiếu tám loài trên sáu ảnh có số người đếm tay xác nhận:
        #
        #     kênh mô hình    trung vị 0,92 so sự thật, dải 0,64 tới 1,25
        #     kênh diện tích  trung vị 1,51 so sự thật, dải 0,00 tới 5,87
        #
        # Kênh mô hình gần như không lệch. Kênh diện tích thì trải từ không
        # tới gần sáu lần, và cái đáng nói là nó lệch loạn chứ không lệch
        # đều — nếu lệch đều thì chỉnh một hằng số là xong, còn lệch loạn thì
        # không hằng số nào cứu được. Cho nó bỏ phiếu ngang hàng chỉ làm
        # khoảng chốt nở ra vô ích: 6–44 cho một loài đếm tay được 7-8, 15–77
        # cho một loài đếm được 10.
        #
        # Bỏ nó khỏi phiếu, chỉ giữ kênh mô hình nới 25 phần trăm: trúng 6
        # trên 8 ca. Hai ca trượt đều là sản phẩm cắm dày, chỗ mô hình đếm
        # thiếu chừng một phần ba — đó là việc khác, cần thêm mẫu mới sửa.
        #
        # Riêng hai kênh dành cho hoa mọc chùm vẫn bỏ phiếu: chúng đo thẳng
        # ra cành, không đi qua đường kính bông nên không mang sai số ấy.
        bo_phieu_dt = bool(x.get("_kenh_dt_canh"))
        kq = chot(x.get("quantity"),
                  k_dt if bo_phieu_dt else None,
                  k_ct if doc_lap else None,
                  nguong, ten)
        kq["chi_tiet"] = {"llm": x.get("quantity"), "dien_tich": k_dt,
                          "chan_tren": k_ct}
        if k_dt_bong != k_dt or k_ct_bong != k_ct:
            kq["chi_tiet"]["dien_tich_bong"] = k_dt_bong
            kq["chi_tiet"]["chan_tren_bong"] = k_ct_bong
        if not bo_phieu_dt and x.get("quantity") and not k_nh:
            # Đây là đường đi thường gặp nhất chứ không còn là ngoại lệ, nên
            # lời cảnh báo phải nói đúng thực tế: kênh diện tích được ghi lại
            # để soát nhưng cố tình không tính vào kết quả.
            kq["canh_bao"] = [c for c in kq["canh_bao"] if "MỘT KÊNH" not in c]
            kq["canh_bao"].append(
                f"CHỈ KÊNH MÔ HÌNH{': ' + ten if ten else ''} — kênh diện "
                f"tích ({k_dt}) chỉ ghi để soát, không tính vào kết quả; "
                f"số chốt là ước lượng của mô hình nới 25 phần trăm")

        if k_nh:
            kq["chi_tiet"]["nhuy"] = k_nh
            if k_nh_bong != k_nh:
                kq["chi_tiet"]["nhuy_bong"] = k_nh_bong
            kq["chi_tiet"]["ban_kinh_nhuy_px"] = r_nhuy

        # Với bông nhỏ mọc chùm, kênh nhuỵ là phép đo trực tiếp còn kênh mô
        # hình là ước lượng bằng mắt trên một mảng trắng không tách được. Hai
        # bên chênh quá NGUONG_DE_NHUY thì lấy số đo, không lấy số ước lượng.
        # Bó cúc tana: mô hình 8 cành, nhuỵ đo 508 bông tức 20 cành.
        if k_nh and dem_nhuy_thay_dem_bong(x):
            llm = x.get("quantity")
            lech = (abs(k_nh - llm) / max(k_nh, llm)) if llm else 1.0
            if lech > NGUONG_DE_NHUY:
                kq["so_luong"] = k_nh
                kq["so_luong_min"] = max(1, int(round(k_nh * 0.85)))
                kq["so_luong_max"] = int(round(k_nh * 1.15))
                kq["cach_dem"] = "đếm nhuỵ trên ảnh, nới 15%"
                kq["do_tin_cay"] = 75
                kq["canh_bao"] = [c for c in kq["canh_bao"]
                                  if "MỘT KÊNH" not in c and "ĐẾM LỆCH" not in c]
                kq["canh_bao"].append(
                    f"ĐẾM THEO NHUỴ{': ' + ten if ten else ''} — bông nhỏ mọc "
                    f"chùm nên viền bông không tách được, đã lấy số nhuỵ đo "
                    f"trên ảnh ({k_nh_bong} bông) thay cho ước lượng của mô "
                    f"hình ({llm})")
            else:
                kq["do_tin_cay"] = max(kq["do_tin_cay"], 70)
                kq["cach_dem"] = "kênh nhuỵ đồng thuận với mô hình"

        x["quantity"] = kq["so_luong"]
        x["quantity_min"] = kq["so_luong_min"]
        x["quantity_max"] = kq["so_luong_max"]
        x["_dem"] = kq["chi_tiet"]
        x["_do_tin_cay_dem"] = kq["do_tin_cay"]
        x["_cach_dem"] = kq["cach_dem"]
        cb_all += kq["canh_bao"]
        ra.append(x)

    tong = sum(x["quantity"] for x in ra if isinstance(x.get("quantity"), int))
    for x in ra:
        x["ratio_percent"] = (round(100 * x["quantity"] / tong)
                              if tong and isinstance(x.get("quantity"), int) else None)
    return ra, cb_all


def khoang_la(la, no=0.3):
    """
    Gắn khoảng cho lá và cành phụ.

    Lá không có kênh kiểm chứng nào: diện tích cụm màu không chia được ra
    từng cành vì lá xếp chồng và khuất nhau, còn đường kính thì không có
    khái niệm. Con số duy nhất là phán đoán của mô hình. Ghi thẳng nó thành
    một số chính xác là nói quá điều mình biết, nên nó đi kèm khoảng nới
    30 phần trăm hai bên và nhãn cho biết nguồn gốc.
    """
    ra = []
    for x in la or []:
        y = dict(x)
        q = y.get("quantity")
        if isinstance(q, (int, float)) and q > 0:
            y["quantity"] = int(round(q))
            y["quantity_min"] = max(1, int(round(q * (1 - no))))
            y["quantity_max"] = int(round(q * (1 + no)))
            y["_cach_dem"] = "mô hình ước lượng, nới 30%"
            y["_kenh_llm"] = int(round(q))
        else:
            y["quantity"] = y["quantity_min"] = y["quantity_max"] = None
            y["_cach_dem"] = "không đếm được"
        ra.append(y)
    return ra


def so_canh(hoa, bang_bong_tren_dvt):
    """
    Quy số bông ra số đơn vị mua, dùng bảng Số bông / ĐVT của danh mục.

    Loại có `dvt_dem` là `Cành` thì mô hình đã đếm sẵn theo cành; chia thêm
    cho số bông trên cành nữa là quy đổi hai lần và cho ra số nhỏ hơn thực tế
    hàng chục lần. Chỉ loại đếm theo bông mới quy đổi.

    Loại nào chưa chốt được số lượng thì bỏ qua chứ không coi là 0. Trả None
    khi không loại nào có số lượng, để cột số cành để trống thay vì ghi 0.
    """
    co_so = [f for f in (hoa or []) if isinstance(f.get("quantity"), (int, float))]
    if not co_so:
        return None

    def quy(khoa):
        t = 0.0
        for f in hoa or []:
            v = f.get(khoa)
            if not isinstance(v, (int, float)):
                continue
            if (f.get("dvt_dem") or "").strip() == "Cành":
                t += v
            else:
                t += v / max(1.0, float(bang_bong_tren_dvt.get(f.get("name")) or 1))
        return int(round(t))

    return quy("quantity"), quy("quantity_min"), quy("quantity_max")


def tong_so_bong(hoa, facing):
    """
    Tổng số bông nhìn thấy và tổng ước tính, cả hai đều dưới dạng khoảng.

    `quantity` nằm theo đơn vị đếm của từng loại, không phải lúc nào cũng là
    bông. Loại có ĐVT là Cành thì mô hình trả về số cành, phải nhân với số
    bông trên cành mới ra số bông. Cộng thẳng sẽ cho ra cột Tổng số bông bằng
    đúng cột Tổng số cành — điều không thể xảy ra với hoa chùm, và với cúc
    tana 25 bông/cành thì con số bị nhỏ đi 25 lần.

    Số bông trên cành trong danh mục là một giá trị trung bình, còn cành thật
    thì dao động: cúc tana ghi 25 bông một cành, cành thật đếm được từ 18 tới
    32. Nên khi quy cành ra bông, mép dưới của khoảng nhân với mức thấp và mép
    trên nhân với mức cao, thay vì cả hai cùng nhân với con số trung bình. Một
    con số duy nhất cho tổng số bông của hoa chùm là con số giả chính xác.

    Trả (nhìn thấy, nhìn thấy min, nhìn thấy max, tổng, tổng min, tổng max).
    """
    dd = max(0.0, min(0.9, float(DAO_DONG_BONG_TREN_CANH or 0.0)))

    def cong(khoa, he=1.0):
        t = 0
        for x in hoa or []:
            v = x.get(khoa)
            if not isinstance(v, int):
                continue
            btc = x.get("bong_tren_canh") or 1
            if (x.get("dvt_dem") or "").strip() == "Cành" and btc > 1:
                v = int(round(v * float(btc) * he))
            t += v
        return t

    nt = cong("quantity")
    lo, hi = cong("quantity_min", 1.0 - dd), cong("quantity_max", 1.0 + dd)
    if not nt:
        return (None,) * 6
    k = TY_LE_CHE_KHUAT.get(facing, 1.05)
    return (nt, lo, hi, int(round(nt * k)), int(round(lo * k)), int(round(hi * k)))


if __name__ == "__main__":
    print("Kiểm thử kênh diện tích trên số đo thật của ba ảnh sản phẩm")
    print("(diện tích và đường kính đo ở thang ảnh 512 px)\n")
    ca = [
        ("Bó hồng — hồng cam",        48461, 75, "15-18"),
        ("Bó cẩm chướng — cẩm chướng", 41715, 58, "~30"),
        ("Vòng hoa — cúc trắng",      21282, 28, "45-60"),
        ("Vòng hoa — cúc tím",        11949, 22, "25-35"),
    ]
    for ten, dt, dk, thuc in ca:
        n = dem_theo_dien_tich(dt, dk)
        ct = chan_tren(dt, dk)
        print(f"  {ten:28} diện tích {dt:6d}px  đk {dk:3d}px -> {n:3d} bông "
              f"| chặn trên {ct:3d} | thực tế {thuc}")

    print("\nKiểm thử quy tắc chốt:")
    thu = [
        ("hai kênh sát nhau",   18, 16, 40),
        ("lệch quá ngưỡng",      8, 20, 40),
        ("llm vượt chặn trên", 240, 19, 30),
        ("thiếu kênh diện tích", 18, None, None),
        ("hỏng cả hai",       None, None, 40),
    ]
    for ten, a, b, c in thu:
        kq = chot(a, b, c, ten=ten)
        print(f"  {ten:22} llm={str(a):5} dt={str(b):5} chặn={str(c):5} "
              f"-> {str(kq['so_luong']):5} tin={kq['do_tin_cay']:3} {kq['canh_bao']}")

    print("\nKiểm thử chốt danh sách và tổng số bông:")
    hoa = [{"name": "Hồng Ecuador", "quantity": 17, "bloom_diameter_ratio": 0.170},
           {"name": "Cúc tím",      "quantity": 60, "bloom_diameter_ratio": 0.043}]
    dt = {"Hồng Ecuador": 48461, "Cúc tím": 11949}
    ra, cb = chot_danh_sach(hoa, dt, 440)
    for x in ra:
        print(f"  {x['name']:16} -> {str(x['quantity']):5} bông  "
              f"({x['_cach_dem']}, tin {x['_do_tin_cay_dem']})  {x['_dem']}")
    print("  cảnh báo:", cb)
    nt, nt_lo, nt_hi, tong, t_lo, t_hi = tong_so_bong(ra, "Một mặt")
    print(f"  nhìn thấy {nt} ({nt_lo}–{nt_hi}), tổng ước tính {tong} ({t_lo}–{t_hi})")

    print("\nKiểm thử quy đổi đơn vị Cành sang Bông:")
    chum = [{"name": "Cúc Tana", "quantity": 8, "quantity_min": 6,
             "quantity_max": 10, "dvt_dem": "Cành", "bong_tren_canh": 25}]
    nt, _, _, tong, _, _ = tong_so_bong(chum, "Một mặt")
    canh = so_canh(chum, {})
    print(f"  8 cành cúc tana (25 bông/cành) -> nhìn thấy {nt} bông, "
          f"tổng {tong} bông, {canh[0]} cành")
    assert nt == 200 and canh[0] == 8, "quy đổi Cành sang Bông sai"
    print("  đạt")

    print("\nKiểm thử điều kiện bật kênh nhuỵ:")
    ca_nhuy = [
        ("Cúc tana, bông 3cm, khai màu nhuỵ", {"duong_kinh_cm": 3.0,
                                               "mau_nhuy": "Vàng"}, True),
        ("Hồng, bông 7cm, khai màu nhuỵ",     {"duong_kinh_cm": 7.0,
                                               "mau_nhuy": "Vàng"}, False),
        ("Cúc tana nhưng danh mục bỏ trống",  {"duong_kinh_cm": 3.0}, False),
        ("Chưa khai đường kính",              {"mau_nhuy": "Vàng"}, False),
    ]
    for ten, x, mong in ca_nhuy:
        duoc = dem_nhuy_thay_dem_bong(x)
        assert duoc is mong, f"điều kiện bật kênh nhuỵ sai ở: {ten}"
        print(f"  {ten:38} -> {'đếm nhuỵ' if duoc else 'đếm bông'}")
    print("  đạt")
