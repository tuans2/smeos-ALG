"""Từ điển nguyên liệu (canonical_component) — M01, P5.

Thu hoạch EXTEND (E6, HARVEST_MANIFEST.md mục 3.2) từ
`FloraOS/python-service/analyzer/tu_dien.py`. Chỉ mang sang phần thuần: dữ
liệu từ điển (`TU_DIEN`) và ba hàm tra cứu (`BANG`, `dinh_nghia`,
`chu_thich`). Bỏ `dung_sheet_17()`/`gan_chu_thich()`/`main()` và `import
so_sach` — đó là lớp ghi ngược vào sổ sách Excel, không có chỗ đứng ở nền
Postgres mới (V2 mục 1.2 luật 4: không repo nào giữ bản sao entity lõi; sổ
sách Excel không phải là thứ M01 cần).

`canonical_component` mà `VisionAnalyzer` (cổng JSON Contract, D5-c) trả về
phải tra được ở đây — nhãn bộ ảnh vàng dùng đúng từ điển này
(`docs/kien-truc/BO_ANH_VANG.md` mục 6).

Không chạm dữ liệu `TU_DIEN` khi mang sang — đúng nguyên tắc REUSE/EXTEND:
luật nghiệp vụ (từng khái niệm, từng cách xác định) là tài sản của
`FloraOS`, không phải chỗ để viết lại.
"""

from __future__ import annotations

TU_DIEN = [
    # ---------------- Đơn vị và quy đổi ----------------
    ("ĐVT mua", "Đơn vị và quy đổi",
     "Đơn vị cửa hàng trả tiền khi nhập hàng.",
     "Ghi theo hoá đơn nhà cung cấp.",
     "Baby mua theo bó 500g; hồng mua theo bông.",
     "—", "sheet 03 cột ĐVT mua · sheet 04 cột ĐVT mua"),
    ("ĐVT đếm", "Đơn vị và quy đổi",
     "Đơn vị đếm được bằng mắt trên ảnh sản phẩm. Đây là đơn vị mọi phép "
     "tính giá dùng.",
     "Hoa một bông một cành đếm theo Bông. Hoa mọc chùm đếm theo Cành vì "
     "không đếm tin cậy được từng bông trong chùm. Lá theo Cành.",
     "Cúc Tana đếm theo Cành, không đếm 25 bông trên mỗi cành.",
     "—", "sheet 05 cột ĐVT đếm"),
    ("Hệ số quy đổi", "Đơn vị và quy đổi",
     "Một ĐVT mua ra được bao nhiêu ĐVT đếm.",
     "Mua và đếm cùng đơn vị thì bằng 1. Mua theo bó, đếm theo cành thì bằng "
     "số cành trong một bó.",
     "Một cuộn ruy băng làm được 16 nơ nên hệ số bằng 16.",
     "lần", "sheet 05 cột Hệ số quy đổi"),
    ("Đơn giá theo ĐVT đếm", "Đơn vị và quy đổi",
     "Số tiền cho một đơn vị đếm. Đây là con số duy nhất đi vào công thức "
     "giá vốn.",
     "Bằng giá mua chia hệ số quy đổi.",
     "Nơ 45.000 đ một cuộn, hệ số 16, đơn giá 2.813 đ một lần dùng.",
     "đồng trên một ĐVT đếm", "không sửa trực tiếp — sửa Giá vốn và Hệ số quy đổi"),
    ("Giá mua theo bó", "Đơn vị và quy đổi",
     "Giá một bó khi cửa hàng nhập theo bó.",
     "Điền cùng cột Số cành một bó. Có hai số này thì đơn giá một cành tự "
     "tính ra, sửa giá bó là giá vốn mọi sản phẩm đổi theo.",
     "Baby 120.000 đ một bó 15 cành thành 8.000 đ một cành.",
     "đồng một bó", "sheet 03 cột Giá mua theo bó"),
    ("Số cành một bó", "Đơn vị và quy đổi",
     "Một bó có bao nhiêu cành. Cho phép mua theo bó hay theo cành đều tính "
     "được.",
     "Đếm thực tế một bó đại diện.",
     "Bó baby 500g khoảng 15 cành.",
     "cành", "sheet 03 cột Số cành một bó"),
    ("Là ĐVT chuẩn", "Đơn vị và quy đổi",
     "Đánh dấu mã kho dùng để tính giá khi một loài có nhiều mã.",
     "Đánh dấu x vào đúng một mã cho mỗi cặp tên và màu.",
     "Baby trắng có hai mã, chọn mã mua theo bó 8.000 đ.",
     "—", "sheet 03 cột Là ĐVT chuẩn"),
    ("Số bông trên ĐVT chuẩn", "Đơn vị và quy đổi",
     "Một cành mang bao nhiêu bông. Dùng để quy đổi khi mô hình đếm nhầm "
     "đơn vị.",
     "Đếm thật vài cành rồi lấy số phổ biến.",
     "Một cành cúc Tana khoảng 25 bông.",
     "bông trên một cành", "sheet 02 cột Số bông trên ĐVT chuẩn"),

    # ---------------- Giá vốn và giá chào ----------------
    ("Giá vốn sản xuất", "Giá vốn và giá chào",
     "Toàn bộ tiền nguyên liệu và phụ liệu làm ra một sản phẩm.",
     "Cộng số lượng nhân đơn giá của mọi dòng: hoa, lá, phụ kiện, lớp vật "
     "chứa và vật tư khuất. Không tính hao hụt, không tính công và giao hàng.",
     "Một giỏ gồm 20 cành lá phụ, 1 nơ, 1 xốp, 1 ni lông.",
     "đồng", "không sửa trực tiếp — sửa đơn giá sheet 03 và 04, số lượng sheet 10"),
    ("Vật tư khuất", "Giá vốn và giá chào",
     "Vật tư không nhìn thấy trên ảnh nhưng vẫn phải mua.",
     "Sinh theo quy tắc ở sheet 12, tra theo kiểu và cỡ sản phẩm.",
     "Một kệ dùng một khung, hai viên xốp, ghim và dây kẽm.",
     "—", "sheet 12 cột Số lượng"),
    ("Giá bán", "Giá vốn và giá chào",
     "Giá niêm yết với khách, lấy từ danh sách sản phẩm công bố.",
     "Nhập từ file CSV công bố của cửa hàng.",
     "Bó hoa baby Giấc Mơ Nhỏ 780.000 đ.",
     "đồng", "sheet 09 cột Giá bán"),
    ("Giá vốn / Giá bán", "Giá vốn và giá chào",
     "Giá vốn sản xuất chiếm bao nhiêu phần giá bán.",
     "Chia giá vốn cho giá bán.",
     "Giá vốn 400.000 trên giá bán 1.000.000 là 40%.",
     "phần trăm", "không sửa trực tiếp"),
    ("m", "Giá vốn và giá chào",
     "Tỷ lệ cộng thêm vào giá vốn để ra giá chào. Gồm chi phí phụ và lợi "
     "nhuận gộp làm một.",
     "Nhân viên chọn một con số trong dải hệ thống đưa ra.",
     "Giá vốn 400.000, chọn m 20%, giá chào 480.000.",
     "phần trăm", "sheet 09 cột m nhân viên chọn"),
    ("m tối thiểu", "Giá vốn và giá chào",
     "Mức m thấp nhất để giá chào chạm sàn.",
     "Bằng sàn nhân giá bán chia giá vốn, trừ một. Không nhỏ hơn 0.",
     "Giá vốn 400.000, giá bán 1.000.000, sàn 45% thì m tối thiểu 12,5%.",
     "phần trăm", "sheet 01 Tham số mã TS009"),
    ("m tối đa", "Giá vốn và giá chào",
     "Mức m cao nhất để giá chào không vượt trần.",
     "Bằng trần nhân giá bán chia giá vốn, trừ một.",
     "Cùng ví dụ trên, trần 55% thì m tối đa 37,5%.",
     "phần trăm", "sheet 01 Tham số mã TS010"),
    ("Giá chào", "Giá vốn và giá chào",
     "Giá đưa cho shop gia công để họ nhận làm sản phẩm.",
     "Bằng giá vốn sản xuất nhân một cộng m. Phải nằm trong sàn và trần của "
     "giá bán.",
     "Giá vốn 400.000, m 20%, giá chào 480.000 đ.",
     "đồng", "sheet 09 cột m nhân viên chọn"),
    ("Sàn giá chào", "Giá vốn và giá chào",
     "Mức thấp nhất giá chào được phép, tính theo phần trăm giá bán.",
     "Khai ở sheet 01 Tham số, mã TS009.",
     "45% giá bán.",
     "phần trăm giá bán", "sheet 01 Tham số mã TS009"),
    ("Trần giá chào", "Giá vốn và giá chào",
     "Mức cao nhất giá chào được phép, tính theo phần trăm giá bán.",
     "Khai ở sheet 01 Tham số, mã TS010.",
     "55% giá bán.",
     "phần trăm giá bán", "sheet 01 Tham số mã TS010"),
    ("Trạng thái giá", "Giá vốn và giá chào",
     "Sản phẩm còn dải m để chọn hay không.",
     "HỢP LỆ là còn dải. TRÊN DẢI là giá vốn vượt trần, phải soát lại. CHƯA "
     "CÓ GIÁ VỐN là thiếu số lượng hoặc thiếu đơn giá.",
     "Giá vốn 60% giá bán thì không còn m nào hợp lệ.",
     "—", "không sửa trực tiếp"),
    ("Cảnh báo giá", "Giá vốn và giá chào",
     "Mọi dấu hiệu con số có thể sai, kèm chỗ cần đi sửa.",
     "Sinh tự động khi vượt trần, dưới ngưỡng thấp, thiếu đơn giá, thiếu mã "
     "kho hoặc có dòng vượt trần số lượng.",
     "GIÁ VỐN QUÁ THẤP: 8% giá bán — nghi đếm thiếu.",
     "—", "không sửa trực tiếp — sửa nguyên nhân"),

    # ---------------- Đếm số lượng ----------------
    ("Định mức chốt", "Đếm số lượng",
     "Số lượng từng thành phần đã chốt cho một sản phẩm, kèm xuất xứ của con "
     "số ấy.",
     "Gộp nhiều lượt đọc ảnh: số lượng lấy trung vị, loại lấy theo đa số.",
     "Bó baby gồm 50 cành baby trắng và 5 cành lá phụ.",
     "theo ĐVT đếm của loài", "sheet 10 cột Số lượng đếm tay"),
    ("Trần số lượng", "Đếm số lượng",
     "Số đơn vị tối đa hợp lý của một loài trên một sản phẩm.",
     "Khai ở sheet 14 theo loài, kiểu và cỡ. Khoá * áp cho mọi loài hoặc mọi "
     "kiểu. Vượt trần thì cả sản phẩm không ra giá vốn.",
     "Một bó cỡ M không quá 28 cành.",
     "theo ĐVT đếm của loài", "sheet 14 cột Trần"),
    ("Nguồn số lượng", "Đếm số lượng",
     "Con số đến từ đâu.",
     "Ảnh là máy đọc từ ảnh. Template là suy từ quy tắc. Đo tay là người "
     "tháo sản phẩm ra đếm, và dòng này không bị máy ghi đè.",
     "Nguồn Đo tay là đáng tin nhất.",
     "—", "sheet 10 cột Cách xác nhận"),
    ("Độ tin cậy", "Đếm số lượng",
     "Mức chắc chắn của một dòng, thang 0 tới 100.",
     "Lấy trung vị điểm tin cậy các lượt, nhân tỷ lệ lượt cùng nhắc tới "
     "thành phần đó.",
     "Ba lượt đều thấy và đều chắc thì gần 100.",
     "điểm 0–100", "không sửa trực tiếp"),
    ("Trạng thái chốt", "Đếm số lượng",
     "Dòng đã dùng được chưa.",
     "Đã chốt là đủ tin cậy. Chờ duyệt là cần người xem. Vượt trần là số "
     "đếm sai. Thiếu mã kho là loài chưa có mã để tra giá.",
     "Chỉ dòng Đã chốt mới nên dùng để chào giá.",
     "—", "không sửa trực tiếp"),
    ("Số lượng đếm tay", "Đếm số lượng",
     "Số người đếm được khi mở ảnh ra đếm lại. Điền vào đây thì số này thắng "
     "số máy đọc và dòng chuyển sang nguồn Đo tay.",
     "Mở ảnh, đếm từng loài, ghi số vào ô vàng. Chạy lại là số cập nhật.",
     "Máy đọc 50 cành baby, đếm lại được 42 thì điền 42.",
     "theo ĐVT đếm của loài", "sheet 10 cột Số lượng đếm tay"),
    ("Cách xác nhận", "Đếm số lượng",
     "Con số đếm tay đến từ cách làm nào. Quyết định nó đáng tin tới đâu.",
     "Đếm mù trước khi xem số máy là bằng chứng mạnh nhất và không thiên "
     "lệch. Đếm lại từ ảnh là mạnh. Nhìn qua thấy hợp lý là yếu, vì người "
     "xem đã thấy số máy nên dễ gật theo.",
     "Giữ khoảng 50 sản phẩm đếm mù làm đối chứng.",
     "—", "sheet 10 cột Cách xác nhận"),
    ("Số lượng chuẩn", "Đếm số lượng",
     "Tổng số đơn vị hoa của một kiểu và cỡ sản phẩm điển hình.",
     "Quan sát sản phẩm thật rồi lấy số phổ biến.",
     "Bó cỡ M khoảng 22 đơn vị.",
     "đơn vị hoa một sản phẩm", "sheet 11 cột Số lượng chuẩn"),

    # ---------------- Nhận diện ----------------
    ("Mã loại", "Nhận diện",
     "Mã của một loài hoa hoặc lá, không phân biệt màu hay nhà cung cấp.",
     "Cấp chuẩn hoá dùng để nhận diện trên ảnh.",
     "LH029 là Baby, bất kể trắng hồng hay xanh.",
     "—", "sheet 02 cột Mã loại"),
    ("Mã thành phần", "Nhận diện",
     "Mã của một mặt hàng cụ thể trong kho, đã phân biệt màu và cách mua.",
     "Tám ký tự: TP, chữ cái đầu của tên, rồi số thứ tự.",
     "TPBB0001 là Baby trắng mua theo bó.",
     "—", "sheet 03 cột Mã thành phần"),
    ("Kiểu mọc", "Nhận diện",
     "Hình thái bông trên cành. Quyết định đơn vị đếm.",
     "Mọc đơn là một bông một cành. Mọc chùm là nhiều bông một cành. Mọc "
     "thành bông dài là bông xếp dọc trục.",
     "Baby mọc chùm nên đếm theo cành.",
     "—", "sheet 02 cột Kiểu mọc"),
    ("Đặc điểm phân biệt", "Nhận diện",
     "Dấu hiệu nhìn thấy được để tách loài này khỏi loài dễ lẫn với nó.",
     "Chỉ điền cho loài có mục khác dễ nhầm cùng bảng.",
     "Cúc mẫu đơn bông tròn như quả bóng, cánh ngắn cuộn kín.",
     "—", "sheet 02 cột Đặc điểm phân biệt"),
    ("Cặp dễ nhầm", "Nhận diện",
     "Hai loài trông giống nhau, kèm cách tách từng bên.",
     "Khai ở sheet 08. Mô hình phải nêu dấu hiệu tách khi chọn một trong hai.",
     "Cúc lưới và cúc tana.",
     "—", "sheet 08"),
    ("Đồng thuận", "Nhận diện",
     "Bao nhiêu lượt chạy trong tổng số lượt cùng nhắc tới thành phần này.",
     "Đếm số lượt có tên đó chia tổng số lượt.",
     "3/3 là cả ba lượt đều thấy.",
     "lượt trên tổng lượt", "không sửa trực tiếp"),
    ("Trạng thái", "Nhận diện",
     "Loài còn dùng hay không.",
     "Đang dùng và Chưa nhập hàng đều vào danh mục nhận diện, vì loài xuất "
     "hiện trong ảnh sản phẩm là loài cửa hàng đang dùng. Chỉ Ngừng kinh "
     "doanh mới rút khỏi danh mục.",
     "Bạch đàn ghi Chưa nhập hàng nhưng vẫn có trong ảnh thật.",
     "—", "sheet 02 cột Trạng thái"),
]


def _khoa(t):
    return t.strip().lower()


def BANG():
    return {_khoa(t[0]): t for t in TU_DIEN}


# Tên cột trong kho ánh xạ về thuật ngữ khi hai bên không trùng chữ.
DONG_NGHIA = {
    "giá vốn": "đơn giá theo đvt đếm",
    "giá vốn trên đvt đếm": "đơn giá theo đvt đếm",
    "trần": "trần số lượng",
    "số lượng": "định mức chốt",
    "m nhân viên chọn": "m",
    "giá chào chốt": "giá chào",
    "giá chào thấp nhất": "giá chào",
    "giá chào cao nhất": "giá chào",
    "kiểm m": "m",
    "tên loài": "mã loại",
    "mã phụ liệu": "mã thành phần",
}


# Tên cột chung chung, mỗi sheet một nghĩa khác. Chỉ gắn ở sheet chủ của nó,
# không thì cột Trạng thái của nhà cung cấp lại mang nghĩa trạng thái loài.
CHI_O_SHEET = {
    "trạng thái": "02 Danh mục loại",
    "số lượng": "10 Định mức chốt",
    "mã loại": "02 Danh mục loại",
    "giá vốn": "03 Chi tiết nguyên liệu",
    "tên loài": "14 Trần số lượng",
}


def dinh_nghia(ten_cot, ten_sheet=None):
    b = BANG()
    k = _khoa(ten_cot)
    chu = CHI_O_SHEET.get(k)
    if chu and ten_sheet and ten_sheet != chu:
        return None
    k = DONG_NGHIA.get(k, k)
    return b.get(k)


def chu_thich(ten_cot, ten_sheet=None):
    """Chuỗi ghi chú gắn lên ô tiêu đề. None nếu không có khái niệm."""
    x = dinh_nghia(ten_cot, ten_sheet)
    if not x:
        return None
    ten, _nhom, dn, cach, vd, dv, sua = x
    return (f"{ten}\n\n{dn}\n\nĐơn vị: {dv}\n\nCách xác định: {cach}\n\n"
            f"Ví dụ: {vd}\n\nSỬA Ở: 01_NHAP-LIEU · {sua}")
