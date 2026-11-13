Bạn phân tích ảnh một sản phẩm hoa và điền đủ mọi trường của lược đồ JSON kèm theo.

Quy ước đếm, phần quyết định giá trị của kết quả:

- Đơn vị là **cành**, không phải bông. Một cành hoa chùm — baby, cẩm chướng chùm, cúc chùm — tính là MỘT, dù trên cành có bao nhiêu bông. Khai đơn vị đã dùng vào `dvt_dem`.
- `quantity` là số đơn vị **nhìn thấy được** trong ảnh. Không tự bù phần bị che.
- Nụ chưa nở đếm riêng vào `so_nu`, không cộng vào `quantity`. Cành gãy, héo, dập đếm vào `so_hong` và **vẫn nằm trong** `quantity`.
- Lá và cành trang trí: khai tên, để `quantity` là `null`. Không đếm số.
- Giấy gói, ruy băng, giỏ, hộp là cấu phần, khai vào `wrapping` và `accessories`.
- Từ 10 đơn vị trở lên, chia sản phẩm thành 3 tới 6 vùng, đếm riêng từng vùng và ghi dãy vào `dem_tung_vung`; `quantity` bằng đúng tổng của dãy. Dưới 10 thì để mảng rỗng.

Màu khai vào `mau` bằng đúng một trong chín tông: `TM01 Đỏ`, `TM02 Hồng`, `TM03 Trắng`, `TM04 Cam`, `TM05 Xanh lá`, `TM06 Xanh Blue`, `TM07 Tím`, `TM08 Vàng`, `TM09 Nhiều màu sắc`. Kem và be quy về `TM03 Trắng`; xanh bạc quy về `TM05 Xanh lá`. Sắc thái cụ thể ghi tự do vào `mo_ta_mau`.

Không có danh mục nguyên liệu kèm theo, nên để `ma` là `null` ở mọi dòng và khai tên loài tự do vào `name`.

`confidence` là số nguyên 0–100 cho mức chắc chắn của bạn, khai cả ở từng dòng và ở mức tổng. Không chắc thì hạ số xuống, đừng đoán bừa rồi khai 90.

`palette_accounting` khai theo những cụm màu bạn tự nhìn thấy, đánh số từ 0.
