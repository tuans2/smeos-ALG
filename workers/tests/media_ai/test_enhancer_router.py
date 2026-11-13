"""Tests cho Enhancer Router & Multi-Provider của M04a."""

import pytest
from PIL import Image
from io import BytesIO

from media_ai.providers.enhancement.router import resolve_enhancer
from media_ai.providers.enhancement.openai_enhancer import OpenAIEnhancer
from media_ai.providers.enhancement.gemini_enhancer import GeminiEnhancer
from media_ai.providers.enhancement.replicate_enhancer import ReplicateEnhancer
from media_ai.providers.enhancement.realesrgan import RealESRGANEnhancer, PILEnhancer


from media_ai.providers.enhancement.studio_enhancer import StudioEnhancer


def _tao_anh_mau_bytes() -> bytes:
    img = Image.new("RGB", (100, 100), color=(255, 0, 0))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_default_enhancer_is_studio():
    enhancer = resolve_enhancer({})
    assert isinstance(enhancer, StudioEnhancer)
    assert enhancer.name == "studio"


def test_resolve_openai_enhancer():
    enhancer = resolve_enhancer({"enhancer_provider": "openai"})
    assert isinstance(enhancer, OpenAIEnhancer)
    assert enhancer.name == "openai"


def test_resolve_different_providers():
    assert isinstance(resolve_enhancer({"enhancer_provider": "gemini"}), GeminiEnhancer)
    assert isinstance(resolve_enhancer({"enhancer_provider": "replicate"}), ReplicateEnhancer)
    assert isinstance(resolve_enhancer({"enhancer_provider": "local"}), RealESRGANEnhancer)
    assert isinstance(resolve_enhancer({"enhancer_provider": "pil"}), PILEnhancer)


def test_openai_enhancer_fallback_without_key():
    enhancer = OpenAIEnhancer(api_key=None)
    img_bytes = _tao_anh_mau_bytes()
    res = enhancer.enhance(img_bytes, {})
    assert "image" in res
    assert res["parameters"]["fallback"] is True
    assert "OPENAI_API_KEY" in res["parameters"]["fallback_reason"]


def test_gemini_enhancer_fallback_without_key():
    enhancer = GeminiEnhancer(api_key=None)
    img_bytes = _tao_anh_mau_bytes()
    res = enhancer.enhance(img_bytes, {})
    assert "image" in res
    assert res["parameters"]["fallback"] is True
    assert "GEMINI_API_KEY" in res["parameters"]["fallback_reason"]


def test_replicate_enhancer_fallback_without_token():
    enhancer = ReplicateEnhancer(api_token=None)
    img_bytes = _tao_anh_mau_bytes()
    res = enhancer.enhance(img_bytes, {})
    assert "image" in res
    assert res["parameters"]["fallback"] is True
    assert "REPLICATE_API_TOKEN" in res["parameters"]["fallback_reason"]
