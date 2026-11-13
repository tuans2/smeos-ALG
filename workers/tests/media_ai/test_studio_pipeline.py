"""Unit tests cho Studio Micro-Pipeline (M04a Image Optimization)."""

import io
from PIL import Image, ImageDraw

from media_ai.image.studio_backdrop import StudioBackdropEngine
from media_ai.image.watermark_remover import WatermarkRemover
from media_ai.providers.enhancement.studio_enhancer import StudioEnhancer
from media_ai.providers.segmentation.rembg_segmenter import RembgSegmenter


def _tao_anh_bong_hoa(size=(200, 200)) -> Image.Image:
    """Tạo ảnh giả lập có bông hoa đỏ ở giữa và chữ watermark ở góc."""
    img = Image.new("RGB", size, color=(240, 230, 220))
    draw = ImageDraw.Draw(img)
    w, h = size
    # Vẽ hoa ở giữa (màu đỏ)
    draw.ellipse([w * 0.3, h * 0.2, w * 0.7, h * 0.6], fill=(220, 40, 60))
    # Vẽ thân hoa (màu xanh)
    draw.rectangle([w * 0.48, h * 0.6, w * 0.52, h * 0.85], fill=(40, 150, 50))
    # Vẽ watermark chữ ở góc dưới
    draw.text((int(w * 0.1), int(h * 0.88)), "HOTLINE 090000000", fill=(10, 10, 10))
    return img


def test_rembg_segmenter_returns_rgba_and_alpha():
    img = _tao_anh_bong_hoa()
    segmenter = RembgSegmenter()
    rgba, alpha = segmenter.extract_subject(img)

    assert rgba.mode == "RGBA"
    assert alpha.mode == "L"
    assert rgba.size == img.size
    assert alpha.size == img.size


def test_watermark_remover_inpaint():
    img = _tao_anh_bong_hoa()
    remover = WatermarkRemover()
    # Mask vùng watermark
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    w, h = img.size
    draw.rectangle([w * 0.08, h * 0.85, w * 0.9, h * 0.98], fill=255)

    cleaned = remover.inpaint_mask(img, mask)
    assert cleaned.size == img.size
    assert cleaned.mode == "RGB"


def test_studio_backdrop_engine_compositing():
    engine = StudioBackdropEngine()
    subject = Image.new("RGBA", (150, 150), (0, 0, 0, 0))
    draw = ImageDraw.Draw(subject)
    draw.ellipse([30, 30, 120, 120], fill=(255, 100, 100, 255))

    res = engine.composite(subject, style="warm_gray", with_shadow=True)
    assert res.mode == "RGB"
    assert res.size == (150, 150)


def test_studio_enhancer_full_pipeline():
    img = _tao_anh_bong_hoa()
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    enhancer = StudioEnhancer()
    result = enhancer.enhance(img_bytes, {"mode": "auto"})

    assert "image" in result
    assert isinstance(result["image"], bytes)
    assert result["generated_flags"]["generative_fill_used"] is False
    assert result["parameters"]["provider"] == "studio"
    assert result["parameters"]["subject_protected"] is True
    assert len(result["parameters"]["applied_changes"]) > 0


def test_edge_defringer():
    from media_ai.image.defringe import EdgeDefringer

    defringer = EdgeDefringer()
    rgba = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    draw = ImageDraw.Draw(rgba)
    # Vùng đặc
    draw.rectangle([20, 20, 80, 80], fill=(200, 50, 50, 255))
    # Vùng viền mờ
    draw.rectangle([15, 15, 85, 85], outline=(100, 100, 100, 128))

    cleaned = defringer.defringe(rgba)
    assert cleaned.size == (100, 100)
    assert cleaned.mode == "RGBA"


def test_studio_backdrop_styles():
    engine = StudioBackdropEngine()
    subject = Image.new("RGBA", (100, 100), (255, 100, 100, 255))

    for style in ["warm_gray", "off_white", "clean_white", "soft_ambient", "wood_warm", "boutique_bokeh"]:
        res = engine.composite(subject, style=style, with_shadow=True)
        assert res.mode == "RGB"
        assert res.size == (100, 100)


def test_studio_backdrop_optical_enhancements():
    engine = StudioBackdropEngine()
    subject = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
    draw = ImageDraw.Draw(subject)
    # Vẽ hoa và cẳng tay kéo xuống tận đáy
    draw.ellipse([30, 20, 90, 80], fill=(240, 120, 100, 255))
    draw.rectangle([45, 75, 75, 120], fill=(220, 180, 150, 255))

    # Test feathering
    feathered = engine.apply_alpha_feathering(subject, radius=1.2)
    assert feathered.size == (120, 120)

    # Test arm fadeout: pixel ở hàng cuối cùng phải có alpha giảm dần
    faded = engine.apply_arm_fadeout(subject, bottom_ratio=0.1)
    assert faded.size == (120, 120)
    # Điểm đáy cùng phải mờ hơn điểm ở giữa cẳng tay
    alpha_bottom = faded.getpixel((60, 119))[3]
    alpha_mid = faded.getpixel((60, 85))[3]
    assert alpha_bottom < alpha_mid

    # Test light wrap
    backdrop = engine.create_backdrop(120, 120, style="warm_gray")
    wrapped = engine.apply_light_wrap(subject, backdrop, wrap_depth_px=3, wrap_intensity=0.3)
    assert wrapped.size == (120, 120)
    assert wrapped.mode == "RGBA"


def test_studio_enhancer_lifestyle_clean():
    img = _tao_anh_bong_hoa()
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    enhancer = StudioEnhancer()
    result = enhancer.enhance(
        img_bytes,
        {"mode": "auto", "studio_style": "lifestyle_clean"},
    )
    assert "image" in result
    assert isinstance(result["image"], bytes)

