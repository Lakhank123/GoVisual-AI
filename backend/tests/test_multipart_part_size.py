import pytest
import io
import json
from fastapi.testclient import TestClient
from main import app
from services.auth import get_current_user

class DummyUser:
    id = "test-user-multipart-123"
    email = "test@govisual.ai"

@pytest.fixture(autouse=True)
def override_user():
    app.dependency_overrides[get_current_user] = lambda: DummyUser()
    yield
    app.dependency_overrides.pop(get_current_user, None)

def test_multipart_handles_large_part_size():
    client = TestClient(app)

    # 1.5MB string in a non-file field (normally triggers 1024KB limit)
    large_non_file_text = "A" * (1500 * 1024)

    # Small 1x1 png image
    tiny_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
        b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    data = {
        "product": "Test Product",
        "price": "100",
        "format": "1:1",
        "image_type": "Instagram post",
        "purpose": "Brand promotion",
        "mood": "Clean",
        "background": "Studio",
        "lighting": "Natural",
        "offer": "None",
        "brand_name": "Test Brand",
        "brand_colors": "#000000",
        "category": "Retail",
        "description": large_non_file_text,  # 1.5MB text field!
    }

    files = {
        "product_image": ("product.png", io.BytesIO(tiny_png), "image/png")
    }

    response = client.post("/generate", data=data, files=files)
    
    # Crucial check: it MUST NOT fail with 400 "Part exceeded maximum size of 1024KB."
    if response.status_code == 400:
        detail = response.json().get("detail", "")
        assert "Part exceeded maximum size" not in str(detail), f"Failed with multipart limit error: {detail}"

    print("Test passed: Large part size (>1024KB) did not trigger MultiPartException!")
