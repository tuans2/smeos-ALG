from io import BytesIO
from PIL import Image

from media_ai.providers.enhancement.openai_enhancer import (
    DEFAULT_AUTO_CAPABILITIES,
    _build_custom_prompt,
    OpenAIEnhancer,
)
from media_ai.providers.enhancement.realesrgan import PILEnhancer


def test_build_custom_prompt_includes_selected_directives():
    # Trường hợp 1: Chỉ chọn xóa watermark
    prompt_wm = _build_custom_prompt(["remove_watermark"])
    assert "erase and inpaint any watermarks" in prompt_wm
    assert "seamless neutral off-white" not in prompt_wm

    # Trường hợp 2: Chọn tách nền và tăng sáng
    prompt_bg = _build_custom_prompt(["remove_background", "enhance_lighting"])
    assert "seamless neutral off-white or soft warm-gray studio backdrop" in prompt_bg
    assert "softbox illumination" in prompt_bg
    assert "erase and inpaint" not in prompt_bg


def test_openai_enhancer_fallback_records_applied_changes():
    # Khi không có API key, fallback PIL vẫn ghi nhận đầy đủ applied_changes
    img = Image.new("RGB", (400, 400), color=(200, 150, 100))
    buf = BytesIO()
    img.save(buf, format="JPEG")

    enhancer = OpenAIEnhancer(api_key=None)

    # Mode Custom với 2 capability
    res_custom = enhancer.enhance(
        buf.getvalue(),
        {"mode": "custom", "selected_capabilities": ["remove_watermark", "upscale_clarity"]},
    )
    assert res_custom["parameters"]["mode"] == "custom"
    assert res_custom["parameters"]["selected_capabilities"] == ["remove_watermark", "upscale_clarity"]
    assert len(res_custom["parameters"]["applied_changes"]) == 2
    assert any("watermark" in c.lower() for c in res_custom["parameters"]["applied_changes"])

    # Mode Auto mặc định
    res_auto = enhancer.enhance(buf.getvalue(), {"mode": "auto"})
    assert res_auto["parameters"]["mode"] == "auto"
    assert len(res_auto["parameters"]["applied_changes"]) == len(DEFAULT_AUTO_CAPABILITIES)


def test_pil_enhancer_records_applied_changes():
    img = Image.new("RGB", (200, 200), color=(100, 150, 200))
    buf = BytesIO()
    img.save(buf, format="JPEG")

    pil = PILEnhancer()
    res = pil.enhance(buf.getvalue(), {"mode": "auto"})
    assert "applied_changes" in res["parameters"]
    assert len(res["parameters"]["applied_changes"]) >= 2
