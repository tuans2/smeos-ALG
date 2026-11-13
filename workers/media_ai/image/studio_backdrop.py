"""Studio Backdrop & Compositing Engine — Tạo phông nền thương mại & đổ bóng tự nhiên.

Tạo phông nền studio cao cấp (Warm Gray, Off-white, Boutique Bokeh, Soft Ambient) và sinh bóng đổ
tiếp xúc (Natural Contact Shadow), kết hợp Optical Light Wrap & Alpha Feathering giúp bó hoa
và tay cầm hòa nhập 100% chân thực vào không gian, triệt tiêu hoàn toàn cảm giác "cắt dán / viền sticker".
"""

from __future__ import annotations

import math
from typing import Literal

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


StudioStyle = Literal[
    "warm_gray", "off_white", "clean_white", "soft_ambient", "wood_warm", "boutique_bokeh", "transparent"
]


class StudioBackdropEngine:
    """Tạo phông nền Studio thương mại và ghép lớp hoàn thiện (Compositing)."""

    STYLE_PALETTES = {
        "warm_gray": {
            "center": (252, 250, 246),
            "edge": (235, 231, 224),
            "ao_color": (32, 28, 24),
            "shadow_color": (48, 44, 38),
        },
        "off_white": {
            "center": (255, 254, 250),
            "edge": (242, 240, 235),
            "ao_color": (30, 28, 25),
            "shadow_color": (45, 42, 38),
        },
        "clean_white": {
            "center": (255, 255, 255),
            "edge": (246, 246, 246),
            "ao_color": (35, 35, 35),
            "shadow_color": (55, 55, 55),
        },
        "soft_ambient": {
            "center": (254, 249, 242),
            "edge": (234, 226, 216),
            "ao_color": (36, 30, 24),
            "shadow_color": (52, 45, 38),
        },
        "wood_warm": {
            "center": (246, 240, 232),
            "edge": (224, 214, 200),
            "ao_color": (38, 30, 22),
            "shadow_color": (56, 44, 34),
        },
        "boutique_bokeh": {
            "center": (250, 244, 236),
            "edge": (216, 202, 186),
            "ao_color": (42, 32, 24),
            "shadow_color": (60, 48, 36),
        },
    }

    # Tâm vùng sáng của phông theo hướng nguồn sáng (Đợt 2, 25/09/2026). Trước
    # đây phông luôn sáng từ trên-trái dù bóng đổ đã theo `light_direction` —
    # phông và bóng "nói hai hướng sáng khác nhau". "left" = đúng như cũ.
    TAM_SANG_THEO_HUONG: dict[str, tuple[float, float]] = {
        "left": (0.35, 0.25),
        "right": (0.65, 0.25),
        "above": (0.50, 0.12),
        "front": (0.50, 0.38),
    }

    def _tam_sang(self, light_direction: str, seed: int | None, mac_dinh: tuple[float, float]) -> tuple[float, float, float]:
        """(tâm x, tâm y, hệ số độ tối mép). `seed` (phương án, Đợt 2) dời tâm
        sáng ±6% và đổi độ tối mép ±10% — cùng ý đồ, phông khác thật."""
        if light_direction == "left" and seed is None:
            return mac_dinh[0], mac_dinh[1], 1.0
        cx, cy = self.TAM_SANG_THEO_HUONG.get(light_direction, mac_dinh)
        if light_direction == "left":
            cx, cy = mac_dinh
        if seed is None:
            return cx, cy, 1.0
        rng = np.random.default_rng(seed)
        return (
            float(np.clip(cx + rng.uniform(-0.06, 0.06), 0.05, 0.95)),
            float(np.clip(cy + rng.uniform(-0.06, 0.06), 0.05, 0.95)),
            float(rng.uniform(0.9, 1.1)),
        )

    def create_bokeh_backdrop(
        self,
        width: int,
        height: int,
        with_grain: bool = True,
        light_direction: str = "left",
        seed: int | None = None,
    ) -> Image.Image:
        """Tạo phông nền không gian tiệm hoa nghệ thuật với vòng tròn Bokeh quang học f/1.8.

        `seed` (Đợt 2): bố cục đốm bokeh sinh theo seed — mỗi phương án một
        khung cảnh; `None` giữ nguyên 10 đốm cố định như trước."""
        import cv2

        # Lấy dải màu nền ấm từ bảng màu boutique_bokeh
        palette = self.STYLE_PALETTES["boutique_bokeh"]
        c_r, c_g, c_b = palette["center"]
        e_r, e_g, e_b = palette["edge"]

        y, x = np.ogrid[:height, :width]
        tx, ty, k_mep = self._tam_sang(light_direction, seed, (0.40, 0.30))
        center_x = width * tx
        center_y = height * ty
        max_dist = math.sqrt((width - center_x) ** 2 + (height - center_y) ** 2)

        dist = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2) / max_dist
        dist = np.clip(dist, 0.0, 1.0)
        factor = np.clip(dist * dist * (3 - 2 * dist) * k_mep, 0.0, 1.0)

        r = c_r + (e_r - c_r) * factor
        g = c_g + (e_g - c_g) * factor
        b = c_b + (e_b - c_b) * factor
        rgb_arr = np.dstack((r.astype(np.uint8), g.astype(np.uint8), b.astype(np.uint8)))
        base = Image.fromarray(rgb_arr, mode="RGB").convert("RGBA")
        base_rgba = np.array(base)

        # Tạo lớp đốm sáng Bokeh hữu cơ
        bokeh_layer = np.zeros((height, width, 4), dtype=np.uint8)
        np.random.seed(101)

        # 16 đốm sáng bokeh mềm mại
        bokeh_spots = [
            (0.15, 0.20, 55, (255, 245, 225, 45)),
            (0.25, 0.12, 40, (255, 250, 235, 60)),
            (0.80, 0.18, 70, (255, 242, 215, 40)),
            (0.88, 0.35, 50, (250, 235, 205, 50)),
            (0.12, 0.65, 60, (248, 238, 220, 35)),
            (0.85, 0.75, 80, (245, 230, 210, 40)),
            (0.70, 0.08, 45, (255, 252, 240, 55)),
            (0.30, 0.85, 65, (242, 228, 208, 30)),
            (0.08, 0.40, 48, (250, 240, 225, 40)),
            (0.92, 0.55, 58, (252, 244, 230, 45)),
        ]
        if seed is not None:
            rng = np.random.default_rng(seed)
            bokeh_spots = [
                (
                    float(rng.uniform(0.04, 0.96)),
                    float(rng.uniform(0.04, 0.9)),
                    int(rng.uniform(38, 85)),
                    (int(rng.uniform(242, 256)), int(rng.uniform(228, 253)), int(rng.uniform(205, 241)), int(rng.uniform(30, 62))),
                )
                for _ in range(int(rng.integers(8, 14)))
            ]

        for rx, ry, r, (cr, cg, cb, ca) in bokeh_spots:
            cx = int(width * rx)
            cy = int(height * ry)
            radius = int(r * (width / 800.0))
            cv2.circle(bokeh_layer, (cx, cy), max(8, radius), (cr, cg, cb, ca), -1)

        # Làm mờ thấu kính khẩu độ lớn (f/1.8 Lens Blur)
        blur_ksize = max(15, int(width * 0.04) | 1)
        bokeh_blurred = cv2.GaussianBlur(bokeh_layer, (blur_ksize, blur_ksize), 0)

        # Ghép bokeh lên base
        base_pil = Image.fromarray(base_rgba, mode="RGBA")
        bokeh_pil = Image.fromarray(bokeh_blurred, mode="RGBA")
        base_pil.alpha_composite(bokeh_pil)

        if with_grain:
            np_final = np.array(base_pil)
            rgb = np_final[:, :, :3].astype(np.float32)
            np.random.seed(42)
            grain = np.random.normal(0.0, 1.8, (height, width))
            for i in range(3):
                rgb[:, :, i] = np.clip(rgb[:, :, i] + grain, 0, 255)
            np_final[:, :, :3] = rgb.astype(np.uint8)
            return Image.fromarray(np_final, mode="RGBA")

        return base_pil

    def create_backdrop(
        self,
        width: int,
        height: int,
        style: StudioStyle = "warm_gray",
        with_grain: bool = True,
        light_direction: str = "left",
        seed: int | None = None,
    ) -> Image.Image:
        """Tạo phông nền studio với dải sáng softbox mềm mại và vi hạt quang học (Film Grain).

        `light_direction` / `seed` (Đợt 2, 25/09/2026): vùng sáng của phông theo
        đúng hướng nguồn sáng của cảnh; seed đổi nhẹ vị trí/độ sâu vùng sáng
        (và bố cục bokeh) để các phương án cục bộ khác nhau thật. Mặc định
        ("left", None) cho ra đúng phông như trước."""
        if style == "transparent":
            return Image.new("RGBA", (width, height), (0, 0, 0, 0))

        if style == "boutique_bokeh":
            return self.create_bokeh_backdrop(width, height, with_grain=with_grain, light_direction=light_direction, seed=seed)

        palette = self.STYLE_PALETTES.get(style, self.STYLE_PALETTES["warm_gray"])
        c_r, c_g, c_b = palette["center"]
        e_r, e_g, e_b = palette["edge"]

        # Hướng sáng mềm mại nghiêng góc 45° từ góc trên-trái (Top-Left)
        # khớp tự nhiên với ánh sáng cửa sổ thường thấy trên các ảnh chụp hoa
        y, x = np.ogrid[:height, :width]
        tx, ty, k_mep = self._tam_sang(light_direction, seed, (0.35, 0.25))
        center_x = width * tx
        center_y = height * ty
        max_dist = math.sqrt((width - center_x) ** 2 + (height - center_y) ** 2)

        dist = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2) / max_dist
        dist = np.clip(dist, 0.0, 1.0)
        # Đường cong sigmoid mượt mà
        factor = np.clip(dist * dist * (3 - 2 * dist) * k_mep, 0.0, 1.0)

        r = c_r + (e_r - c_r) * factor
        g = c_g + (e_g - c_g) * factor
        b = c_b + (e_b - c_b) * factor

        # Thêm vi hạt quang học hữu cơ (Micro Film Grain ~0.65%)
        # giúp đồng nhất cấu trúc bề mặt giữa phông nền và ảnh chụp từ camera
        if with_grain:
            np.random.seed(42)
            grain = np.random.normal(0.0, 1.6, (height, width))
            r = np.clip(r + grain, 0, 255)
            g = np.clip(g + grain, 0, 255)
            b = np.clip(b + grain, 0, 255)

        rgb_arr = np.dstack((r.astype(np.uint8), g.astype(np.uint8), b.astype(np.uint8)))
        return Image.fromarray(rgb_arr, mode="RGB").convert("RGBA")

    def create_contact_shadow(
        self,
        alpha_mask: Image.Image,
        offset_y: int = 14,
        offset_x: int = 0,
        blur_radius: int = 18,
        opacity: float = 0.28,
        shadow_color: tuple[int, int, int] = (50, 45, 40),
    ) -> Image.Image:
        """Sinh bóng đổ tự nhiên (Contact Shadow) từ kênh alpha của chủ thể."""
        w, h = alpha_mask.size
        shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        r, g, b = shadow_color
        solid_color = Image.new("RGB", (w, h), (r, g, b))

        alpha_scaled = alpha_mask.point(lambda p: int(p * opacity))
        shifted_alpha = Image.new("L", (w, h), 0)
        shifted_alpha.paste(alpha_scaled, (offset_x, offset_y))
        blurred_alpha = shifted_alpha.filter(ImageFilter.GaussianBlur(radius=blur_radius))

        shadow_layer.paste(solid_color, (0, 0), blurred_alpha)
        return shadow_layer

    def apply_alpha_feathering(
        self, subject_rgba: Image.Image, radius: float = 1.2
    ) -> Image.Image:
        """Làm mềm viền alpha (Sub-pixel Feathering) mô phỏng quang sai thấu kính, chống viền sắc dao cạo."""
        try:
            import cv2

            rgba_np = np.array(subject_rgba)
            alpha = rgba_np[:, :, 3].astype(np.float32)

            # Chỉ làm mờ vùng viền chuyển tiếp (alpha > 0 & alpha < 252) để bảo vệ khối lõi
            blurred_alpha = cv2.GaussianBlur(alpha, (0, 0), sigmaX=radius, sigmaY=radius)

            # Giữ nguyên phần đặc (> 250) nhưng làm mềm dải viền ngoài
            fringe_mask = (alpha > 0) & (alpha < 252)
            alpha[fringe_mask] = blurred_alpha[fringe_mask]

            rgba_np[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
            return Image.fromarray(rgba_np, mode="RGBA")
        except Exception:
            return subject_rgba

    def apply_arm_fadeout(
        self, subject_rgba: Image.Image, bottom_ratio: float = 0.07
    ) -> Image.Image:
        """Làm mờ chuyển gradient nhẹ nhàng (Soft Fadeout) ở phần đáy cánh tay, chống bị cắt cụt cứng."""
        try:
            rgba_np = np.array(subject_rgba)
            h, w = rgba_np.shape[:2]
            alpha = rgba_np[:, :, 3].astype(np.float32)

            # Kiểm tra nếu mép đáy có vật thể (cánh tay)
            if np.any(alpha[-1, :] > 20):
                fade_start = int(h * (1.0 - bottom_ratio))
                fade_len = max(1, h - fade_start)
                for y in range(fade_start, h):
                    # Gradient giảm dần từ 1.0 về 0.0
                    progress = (h - 1 - y) / float(fade_len)
                    smooth_factor = progress * progress * (3.0 - 2.0 * progress)
                    alpha[y, :] *= smooth_factor

                rgba_np[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
                return Image.fromarray(rgba_np, mode="RGBA")
            return subject_rgba
        except Exception:
            return subject_rgba

    def apply_light_wrap(
        self,
        subject_rgba: Image.Image,
        backdrop: Image.Image,
        wrap_depth_px: int = 4,
        wrap_intensity: float = 0.32,
    ) -> Image.Image:
        """Tán xạ ánh sáng phông nền (Optical Light Wrap) tràn nhẹ vào 2-4px mép chủ thể."""
        try:
            import cv2

            rgba_np = np.array(subject_rgba)
            subject_rgb = rgba_np[:, :, :3].astype(np.float32)
            alpha = rgba_np[:, :, 3]

            bg_rgb = np.array(backdrop.convert("RGB"), dtype=np.float32)

            # Làm mờ phông nền thành dải sáng quang học
            blurred_bg = cv2.GaussianBlur(bg_rgb, (0, 0), sigmaX=8.0, sigmaY=8.0)

            # Xác định dải viền phía trong của chủ thể
            subject_binary = (alpha > 15).astype(np.uint8) * 255
            if np.sum(subject_binary) == 0:
                return subject_rgba

            dist = cv2.distanceTransform(subject_binary, cv2.DIST_L2, 3)
            # Trọng số tràn sáng: tối đa ở mép ngoài cùng (dist = 1) và suy giảm dần vào trong (dist = wrap_depth_px)
            wrap_weight = np.clip(1.0 - (dist / max(1.0, float(wrap_depth_px))), 0.0, 1.0)
            wrap_weight = wrap_weight * wrap_intensity * (alpha.astype(np.float32) / 255.0)
            wrap_weight = wrap_weight[:, :, np.newaxis]

            # Hòa trộn ánh sáng mềm vào viền chủ thể
            wrapped_rgb = (1.0 - wrap_weight) * subject_rgb + wrap_weight * blurred_bg
            wrapped_rgb = np.clip(wrapped_rgb, 0, 255).astype(np.uint8)

            result_rgba = np.dstack((wrapped_rgb, alpha))
            return Image.fromarray(result_rgba, mode="RGBA")
        except Exception:
            return subject_rgba

    # Độ sâu (px) mà light wrap được phép đổi màu viền chủ thể. Phép đo
    # Subject Integrity của M04b (`variant_worker._co_bien`) PHẢI co mặt nạ sâu
    # hơn con số này — trước 23/09/2026 phép đo chỉ co 3px trong khi light wrap
    # đổi 4px, nên mọi biến thể local hợp lệ bị đo ~0,96 (< 0,99) và bị dán
    # nhãn sai.
    LIGHT_WRAP_DEPTH_PX = 4

    @staticmethod
    def fit_backdrop_image(image: Image.Image, width: int, height: int) -> Image.Image:
        """Phủ kín khung `width`×`height` bằng ảnh hậu cảnh (cover-crop giữa
        tâm), trả RGBA — không méo tỷ lệ ảnh nhà cung cấp trả về."""
        src = image.convert("RGBA")
        sw, sh = src.size
        if sw == 0 or sh == 0:
            raise ValueError("Ảnh hậu cảnh rỗng")
        scale = max(width / sw, height / sh)
        nw, nh = max(width, int(round(sw * scale))), max(height, int(round(sh * scale)))
        resized = src.resize((nw, nh), Image.LANCZOS)
        left = (nw - width) // 2
        top = (nh - height) // 2
        return resized.crop((left, top, left + width, top + height))

    # Hệ số (x, y) nhân vào độ lệch bóng mặc định theo hướng nguồn sáng.
    SHADOW_OFFSET_BY_LIGHT: dict[str, tuple[float, float]] = {
        "left": (1.0, 1.0),     # sáng trái → bóng lệch phải-xuống (hành vi cũ)
        "right": (-1.0, 1.0),   # sáng phải → bóng lệch trái-xuống
        "above": (0.15, 0.7),   # sáng trên → bóng gần như ngay dưới chân
        "front": (0.1, 0.45),   # sáng trước mặt → bóng ngắn, sát gốc
    }

    def composite(
        self,
        subject_rgba: Image.Image,
        style: StudioStyle = "warm_gray",
        with_shadow: bool = True,
        with_light_wrap: bool = True,
        with_arm_fadeout: bool = False,
        backdrop_image: Image.Image | None = None,
        light_direction: str = "left",
        seed: int | None = None,
        harmonize: bool = False,
    ) -> Image.Image:
        """Ghép chủ thể RGBA vào phông Studio với hệ thống bóng đổ 2 tầng và Light Wrap quang học.

        `backdrop_image` (23/09/2026 — nhánh Cloud M04b đi qua hàng đợi job):
        hậu cảnh do nhà cung cấp sinh ra (KHÔNG chứa chủ thể). Khi có, nó
        thay cho phông tự dựng bằng `create_backdrop`; bóng đổ, light wrap và
        bước dán NGUYÊN KHỐI chủ thể giữ nguyên — nên phép đo Subject
        Integrity vẫn đo trên đúng pixel gốc của Master Image.

        `harmonize` (Đợt 3, 25/09/2026 — `compose_mode=harmonize`): màu bóng lấy
        từ hậu cảnh, hậu cảnh làm mờ nhẹ khi sắc hơn chủ thể, light wrap mạnh
        hơn trong đúng dải viền 4 px. Không đụng lõi — xem `image/hoa_hop.py`.
        Thông tin đã làm ghi vào `self.lan_cuoi_hoa_hop`.
        """
        w, h = subject_rgba.size

        if style == "transparent":
            return subject_rgba

        if backdrop_image is not None:
            backdrop = self.fit_backdrop_image(backdrop_image, w, h)
        else:
            backdrop = self.create_backdrop(w, h, style=style, with_grain=True, light_direction=light_direction, seed=seed)

        self.lan_cuoi_hoa_hop: dict | None = None
        if harmonize:
            from media_ai.image.hoa_hop import khop_do_net_nen

            backdrop, ban_kinh_mo = khop_do_net_nen(backdrop, subject_rgba)
            self.lan_cuoi_hoa_hop = {"background_blur_px": ban_kinh_mo}

        # 1. Làm mềm viền quang học (Alpha Feathering)
        processed_subject = self.apply_alpha_feathering(subject_rgba, radius=1.1)

        # 2. Làm mờ chuyển êm phần cẳng tay ở cạnh đáy (Arm Fadeout)
        if with_arm_fadeout:
            processed_subject = self.apply_arm_fadeout(processed_subject, bottom_ratio=0.06)

        alpha_mask = processed_subject.split()[3]

        if with_shadow:
            palette = dict(self.STYLE_PALETTES.get(style, self.STYLE_PALETTES["warm_gray"]))
            if harmonize:
                from media_ai.image.hoa_hop import mau_bong_tu_nen

                mau = mau_bong_tu_nen(backdrop, alpha_mask, palette["shadow_color"])
                palette["shadow_color"] = mau
                palette["ao_color"] = tuple(int(c * 0.7) for c in mau)
                if self.lan_cuoi_hoa_hop is not None:
                    self.lan_cuoi_hoa_hop["shadow_color"] = list(mau)

            # Tầng 1: Contact Ambient Occlusion (Khối tiếp xúc gốc chân giấy và tay)
            ao_shadow = self.create_contact_shadow(
                alpha_mask,
                offset_y=max(3, int(h * 0.006)),
                offset_x=max(1, int(w * 0.003)),
                blur_radius=max(5, int(h * 0.008)),
                opacity=0.16,
                shadow_color=palette.get("ao_color", (32, 28, 24)),
            )

            # Tầng 2: Directional Soft Shadow — đổ NGƯỢC hướng sáng (Đợt 1,
            # 24/09/2026: trước đây luôn sáng trên-trái, bóng dưới-phải, bất kể
            # hậu cảnh sáng từ đâu). "left" giữ nguyên hành vi cũ.
            dx, dy = self.SHADOW_OFFSET_BY_LIGHT.get(light_direction, self.SHADOW_OFFSET_BY_LIGHT["left"])
            dir_shadow = self.create_contact_shadow(
                alpha_mask,
                offset_y=int(round(max(14, int(h * 0.022)) * dy)),
                offset_x=int(round(max(10, int(w * 0.016)) * dx)),
                blur_radius=max(28, int(h * 0.040)),
                opacity=0.09,
                shadow_color=palette["shadow_color"],
            )

            # Ghép bóng mềm trước, sau đó là bóng tiếp xúc đậm
            backdrop.alpha_composite(dir_shadow)
            backdrop.alpha_composite(ao_shadow)

        # 3. Áp dụng Optical Light Wrap tràn sáng phông vào viền giấy/hoa
        if with_light_wrap:
            processed_subject = self.apply_light_wrap(
                processed_subject, backdrop, wrap_depth_px=self.LIGHT_WRAP_DEPTH_PX,
                wrap_intensity=0.42 if harmonize else 0.30,
            )

        # 4. Ghép chủ thể lên trên cùng
        backdrop.alpha_composite(processed_subject)
        return backdrop.convert("RGB")

