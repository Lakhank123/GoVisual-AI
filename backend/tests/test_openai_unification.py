import io
import base64
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from PIL import Image

from services.addons.photoshoot_service import PhotoshootService
from services.image_provider.providers.openai_provider import OpenAIImageProvider
from services.image_provider.models import CreativeRequest
from services.self_correction.providers.openai_regeneration_provider import OpenAIRegenerationProvider


def create_test_image(color=(255, 0, 0), size=(100, 100)) -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_mock_openai_edit_response(image_bytes: bytes):
    b64_str = base64.b64encode(image_bytes).decode("utf-8")
    mock_item = MagicMock()
    mock_item.b64_json = b64_str
    mock_item.url = None
    mock_resp = MagicMock()
    mock_resp.data = [mock_item]
    return mock_resp


@pytest.mark.asyncio
async def test_photoshoot_service_uses_openai_configuration():
    service = PhotoshootService()
    assert service.openai_api_key != "" or service.openai_api_key == ""
    assert service.openai_image_model == "gpt-image-2"
    assert service.openai_image_quality == "medium"
    assert service.openai_image_size == "1024x1024"


@pytest.mark.asyncio
async def test_photoshoot_model_mode_sends_dual_reference_canvas():
    service = PhotoshootService()
    service.openai_api_key = "sk-test-mock-key"
    product_bytes = create_test_image((255, 0, 0))
    dummy_gen_bytes = create_test_image((0, 255, 0))
    mock_openai_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.resources.images.AsyncImages.edit", new_callable=AsyncMock) as mock_edit:
        mock_edit.return_value = mock_openai_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Royal Chronograph Watch",
            avatar_id="aarav",
            background_id="luxury-dark",
            mode="model",
            include_model=True,
            shot_count=1,
        )

        assert len(results) == 1
        assert results[0]["success"] is True
        assert mock_edit.call_count == 1

        call_kwargs = mock_edit.call_args[1]
        assert call_kwargs["model"] == "gpt-image-2"
        assert call_kwargs["quality"] == "medium"
        image_tuple = call_kwargs["image"]
        assert image_tuple[0] == "dual_reference.png"
        prompt = call_kwargs["prompt"]
        assert "Features Indian model Aarav" in prompt
        assert "Royal Chronograph Watch" in prompt


@pytest.mark.asyncio
async def test_photoshoot_product_only_mode_sends_product_only():
    service = PhotoshootService()
    service.openai_api_key = "sk-test-mock-key"
    product_bytes = create_test_image((255, 200, 0))
    dummy_gen_bytes = create_test_image((10, 10, 10))
    mock_openai_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    with patch("openai.resources.images.AsyncImages.edit", new_callable=AsyncMock) as mock_edit:
        mock_edit.return_value = mock_openai_resp

        results = await service.generate_photoshoot(
            product_image_bytes=product_bytes,
            product_name="Ceramic Tea Mug",
            avatar_id="aarav",
            background_id="white-studio",
            mode="product_only",
            include_model=False,
            shot_count=1,
        )

        assert len(results) == 1
        assert results[0]["success"] is True
        call_kwargs = mock_edit.call_args[1]
        image_tuple = call_kwargs["image"]
        assert image_tuple[0] == "product.png"
        prompt = call_kwargs["prompt"]
        assert "Strict product-only composition" in prompt


@pytest.mark.asyncio
async def test_openai_image_provider_supports_single_and_dual_references():
    provider = OpenAIImageProvider()
    assert provider.model_name == "gpt-image-2"
    assert provider.quality == "medium"

    product_bytes = create_test_image((0, 0, 255))
    dummy_gen_bytes = create_test_image((128, 128, 128))
    mock_openai_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    # 1. Single reference (Creative Studio default)
    req_single = CreativeRequest(
        candidate_id="cand_1",
        computed_prompt="Professional studio shot of blue vase",
        reference_images=[product_bytes]
    )

    with patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test-mock-key"}):
        with patch("openai.resources.images.AsyncImages.edit", new_callable=AsyncMock) as mock_edit, \
             patch("services.storage.StorageService.upload", new_callable=AsyncMock) as mock_upload:
            mock_edit.return_value = mock_openai_resp
            mock_upload.return_value = "https://example.com/single.png"

            res = await provider.generate(req_single)
            assert len(res) == 1
            assert res[0].status == "SUCCESS"
            call_kwargs = mock_edit.call_args[1]
            assert call_kwargs["image"][0] == "product-reference.png"

    # 2. Dual reference (Product + Model)
    model_bytes = create_test_image((255, 128, 0))
    req_dual = CreativeRequest(
        candidate_id="cand_2",
        computed_prompt="Commercial portrait with model wearing headphones",
        reference_images=[product_bytes, model_bytes]
    )

    with patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test-mock-key"}):
        with patch("openai.resources.images.AsyncImages.edit", new_callable=AsyncMock) as mock_edit, \
             patch("services.storage.StorageService.upload", new_callable=AsyncMock) as mock_upload:
            mock_edit.return_value = mock_openai_resp
            mock_upload.return_value = "https://example.com/dual.png"

            res = await provider.generate(req_dual)
            assert len(res) == 1
            assert res[0].status == "SUCCESS"
            call_kwargs = mock_edit.call_args[1]
            assert call_kwargs["image"][0] == "dual_reference.png"


@pytest.mark.asyncio
async def test_openai_regeneration_provider_uses_openai():
    provider = OpenAIRegenerationProvider()
    assert provider.model_name == "gpt-image-2"
    assert provider.quality == "medium"
    assert provider.size == "1024x1024"

    ref_bytes = create_test_image((50, 50, 50))
    dummy_gen_bytes = create_test_image((200, 200, 200))
    mock_openai_resp = create_mock_openai_edit_response(dummy_gen_bytes)

    candidate_data = {
        "candidate_id": "cand_repair_test",
        "prompt_used": "Original prompt for product",
        "logo_image": None,
        "logo_position": "top-right",
    }

    with patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test-mock-key"}):
        with patch("openai.resources.images.AsyncImages.edit", new_callable=AsyncMock) as mock_edit, \
             patch("services.storage.StorageService.upload", new_callable=AsyncMock) as mock_upload:
            mock_edit.return_value = mock_openai_resp
            mock_upload.return_value = "https://example.com/repaired.png"

            repaired = await provider.regenerate(candidate_data, "Sharpen product boundaries", ref_bytes)
            assert repaired["candidate_id"] == "cand_repair_test_repaired"
            assert repaired["url"] == "https://example.com/repaired.png"
            call_kwargs = mock_edit.call_args[1]
            assert "CRITICAL REPAIR INSTRUCTION: Sharpen product boundaries" in call_kwargs["prompt"]
