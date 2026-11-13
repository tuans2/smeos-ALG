"""Đóng dấu thương hiệu của CHÍNH tiệm hoa lên biến thể marketing — M04b.

Bản trước vẽ cứng chuỗi "ALG Tiệm Hoa" lên mọi ảnh của mọi tổ chức. Với
một nền tảng đa tenant thì đó không phải một thiếu sót nhỏ: nó đóng tên nhà
cung cấp phần mềm lên hàng của người bán, và người bán không có cách nào gỡ.

Logo thật nằm ở `brand_profiles.logo_asset_id`. Khi tiệm chưa tải logo lên,
ta lùi về chữ — nhưng là TÊN TIỆM lấy từ `organizations.name`, không phải
tên nền tảng.

Không có logo VÀ không có tên thì không đóng dấu gì cả. Một con dấu sai còn
tệ hơn không có con dấu.
"""

from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont


# Con dấu chiếm tối đa ngần này chiều rộng khung — đủ đọc trên điện thoại,
# chưa tới mức che mất bó hoa.
TY_LE_RONG_TOI_DA = 0.22
LE = 0.025


def _font(co: int) -> ImageFont.ImageFont:
    for ten in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ):
        try:
            return ImageFont.truetype(ten, co)
        except Exception:
            continue
    return ImageFont.load_default()


def dong_dau_logo(anh: Image.Image, logo_bytes: bytes, do_mo: float = 0.85) -> Image.Image:
    """Đặt logo ở góc dưới phải, giữ nguyên tỷ lệ và kênh alpha của logo."""
    nen = anh.convert("RGBA")
    w, h = nen.size

    logo = Image.open(io.BytesIO(logo_bytes))
    if logo.mode != "RGBA":
        logo = logo.convert("RGBA")

    rong_dich = max(1, int(w * TY_LE_RONG_TOI_DA))
    if logo.width != rong_dich:
        cao_dich = max(1, int(logo.height * rong_dich / logo.width))
        logo = logo.resize((rong_dich, cao_dich), Image.LANCZOS)

    if do_mo < 1.0:
        alpha = logo.split()[3].point(lambda v: int(v * do_mo))
        logo.putalpha(alpha)

    le = int(min(w, h) * LE)
    lop = Image.new("RGBA", nen.size, (0, 0, 0, 0))
    lop.paste(logo, (w - logo.width - le, h - logo.height - le), logo)
    return Image.alpha_composite(nen, lop)


def dong_dau_chu(anh: Image.Image, ten_tiem: str) -> Image.Image:
    """Lùi về khi tiệm chưa tải logo: một viên thuốc mờ mang TÊN TIỆM."""
    ten = (ten_tiem or "").strip()
    if not ten:
        return anh

    nen = anh.convert("RGBA")
    w, h = nen.size
    lop = Image.new("RGBA", nen.size, (0, 0, 0, 0))
    ve = ImageDraw.Draw(lop)

    co_chu = max(12, int(min(w, h) * 0.028))
    font = _font(co_chu)
    hop = ve.textbbox((0, 0), ten, font=font)
    rong_chu, cao_chu = hop[2] - hop[0], hop[3] - hop[1]

    dem_x, dem_y = int(co_chu * 0.9), int(co_chu * 0.55)
    rong_vien = rong_chu + dem_x * 2
    cao_vien = cao_chu + dem_y * 2
    le = int(min(w, h) * LE)
    x, y = w - rong_vien - le, h - cao_vien - le

    ve.rounded_rectangle(
        [x, y, x + rong_vien, y + cao_vien],
        radius=cao_vien // 2,
        fill=(15, 23, 42, 190),
        outline=(255, 255, 255, 70),
        width=1,
    )
    ve.text((x + dem_x - hop[0], y + dem_y - hop[1]), ten, font=font, fill=(248, 250, 252, 240))
    return Image.alpha_composite(nen, lop)


def dong_dau(
    anh: Image.Image,
    logo_bytes: bytes | None,
    ten_tiem: str | None,
) -> Image.Image:
    """Đường vào duy nhất. Logo thắng chữ; không có cả hai thì trả ảnh nguyên."""
    if logo_bytes:
        try:
            return dong_dau_logo(anh, logo_bytes)
        except Exception:
            # Logo hỏng hoặc không đọc được: lùi về chữ, không làm hỏng cả job.
            pass
    if ten_tiem:
        return dong_dau_chu(anh, ten_tiem)
    return anh
