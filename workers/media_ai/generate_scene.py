"""Generate Scene Variant CLI — Tối ưu hóa sinh 4 biến thể phân cảnh Narrative Arc.

Sử dụng StudioBackdropEngine và RembgSegmenter (với cache RGBA) để tạo ảnh biến thể chất lượng cao,
bảo tồn 100% lẵng hoa thật nguyên bản của shop hoa, sinh bối cảnh studio/lifestyle/gỗ ấm/trong suốt.
"""

from __future__ import annotations

import os
import sys
import time
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from media_ai.image.studio_backdrop import StudioBackdropEngine
from media_ai.providers.segmentation.rembg_segmenter import RembgSegmenter
from media_ai.image.defringe import EdgeDefringer


STYLE_ALIAS_MAP = {
    "1": "clean_white",
    "setup": "clean_white",
    "studio_white": "clean_white",
    "clean_white": "clean_white",
    "2": "boutique_bokeh",
    "rising": "boutique_bokeh",
    "lifestyle": "boutique_bokeh",
    "boutique_bokeh": "boutique_bokeh",
    "luxury_hotel": "boutique_bokeh",
    "wedding": "boutique_bokeh",
    "3": "wood_warm",
    "climax": "wood_warm",
    "wood_warm": "wood_warm",
    "wood_minimal": "wood_warm",
    "4": "transparent",
    "cta": "transparent",
    "transparent": "transparent",
    "cutout": "transparent",
}


def generate_scene(master_path: str, style_name: str, output_path: str) -> None:
    if not os.path.exists(master_path):
        raise FileNotFoundError(f"Master image not found: {master_path}")

    style = STYLE_ALIAS_MAP.get(style_name.lower(), "boutique_bokeh")

    # Kiểm tra xem đã có cache RGBA chưa
    cache_rgba_path = master_path + ".rgba.png"
    if os.path.exists(cache_rgba_path):
        rgba = Image.open(cache_rgba_path)
    else:
        master_img = Image.open(master_path).convert("RGB")
        segmenter = RembgSegmenter()
        rgba_subj, _ = segmenter.extract_subject(master_img)
        defringer = EdgeDefringer()
        rgba = defringer.defringe(rgba_subj)
        try:
            rgba.save(cache_rgba_path, format="PNG")
        except Exception:
            pass

    engine = StudioBackdropEngine()

    if style == "transparent":
        # Tách nền trong suốt
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        rgba.save(output_path, format="PNG")
        return

    # Ghép bối cảnh
    composited = engine.composite(rgba, style=style, with_shadow=True, with_light_wrap=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    composited.save(output_path, quality=95)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generate_scene.py <master_path> <style> <output_path>")
        sys.exit(1)

    master_file = sys.argv[1]
    scene_style = sys.argv[2]
    out_file = sys.argv[3]

    t0 = time.time()
    generate_scene(master_file, scene_style, out_file)
    print(f"Generated {scene_style} scene in {time.time() - t0:.2f}s -> {out_file}")
