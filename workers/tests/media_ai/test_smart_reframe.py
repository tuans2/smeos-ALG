from io import BytesIO
from PIL import Image

from media_ai.providers.smart_reframe import SmartReframe, reframe_to_ratios


def test_smart_reframe_produces_exact_target_dimensions():
    # Tạo ảnh giả lập dọc (3:4) mô phỏng ảnh chụp bó hoa
    img = Image.new("RGB", (600, 800), color=(255, 200, 150))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    master_bytes = buf.getvalue()

    reframer = SmartReframe()
    results = reframer.reframe(master_bytes)

    assert set(results.keys()) == {"1:1", "4:5", "9:16", "16:9"}

    # 1:1 -> 1024 x 1024
    assert results["1:1"].width == 1024
    assert results["1:1"].height == 1024
    out_1_1 = Image.open(BytesIO(results["1:1"].image))
    assert out_1_1.size == (1024, 1024)

    # 4:5 -> 1024 x 1280
    assert results["4:5"].width == 1024
    assert results["4:5"].height == 1280
    out_4_5 = Image.open(BytesIO(results["4:5"].image))
    assert out_4_5.size == (1024, 1280)

    # 9:16 -> 1080 x 1920
    assert results["9:16"].width == 1080
    assert results["9:16"].height == 1920
    out_9_16 = Image.open(BytesIO(results["9:16"].image))
    assert out_9_16.size == (1080, 1920)

    # 16:9 -> 1920 x 1080
    assert results["16:9"].width == 1920
    assert results["16:9"].height == 1080
    out_16_9 = Image.open(BytesIO(results["16:9"].image))
    assert out_16_9.size == (1920, 1080)


def test_smart_reframe_handles_rgba():
    img = Image.new("RGBA", (500, 500), color=(255, 100, 100, 200))
    buf = BytesIO()
    img.save(buf, format="PNG")

    reframed = reframe_to_ratios(buf.getvalue())
    assert len(reframed) == 4
    for ratio_key, raw_bytes in reframed.items():
        assert len(raw_bytes) > 0
        opened = Image.open(BytesIO(raw_bytes))
        assert opened.format == "JPEG"
