import os
import base64
from typing import Optional

try:
    import cloudinary
    import cloudinary.uploader
except Exception:
    cloudinary = None

LOCAL_DIR = "./generated_images"


class StorageService:

    def __init__(self):
        self.use_local = os.getenv("USE_LOCAL_STORAGE", "true").lower() == "true"
        self.base_url = os.getenv("PUBLIC_BACKEND_URL", "http://localhost:8000")
        self.cloud_ready = False

        self._configure_cloudinary()

    def _configure_cloudinary(self) -> bool:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
        api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
        api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()

        if cloudinary and cloud_name and api_key and api_secret:
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True,
            )
            if not self.use_local:
                self.cloud_ready = True
            return True
        return False

    def is_cloudinary_configured(self) -> bool:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
        api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
        api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()
        return bool(cloudinary and cloud_name and api_key and api_secret)

    async def upload(self, image_bytes: bytes, folder: str, filename: str) -> str:
        if self.cloud_ready:
            return self._save_cloudinary(image_bytes, folder, filename)
        return self._save_local(image_bytes, filename)

    def upload_public_jpeg(self, image_bytes: bytes, folder: str = "govisual_creatives", filename: str = "creative.jpg") -> str:
        """
        Uploads image directly to Cloudinary regardless of USE_LOCAL_STORAGE setting,
        returning a secure public HTTPS URL suitable for third-party platforms like Instagram.
        """
        if not self.is_cloudinary_configured():
            raise ValueError(
                "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your backend/.env."
            )
        # Ensure configured
        self._configure_cloudinary()
        return self._save_cloudinary(image_bytes, folder, filename)

    def _save_cloudinary(self, image_bytes: bytes, folder: str, filename: str) -> str:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
        public_id = os.path.splitext(filename)[0]
        result = cloudinary.uploader.upload(
            f"data:image/jpeg;base64,{encoded}",
            folder=folder,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
        )
        return result["secure_url"]

    def _save_local(self, image_bytes: bytes, filename: str) -> str:
        os.makedirs(LOCAL_DIR, exist_ok=True)
        path = os.path.join(LOCAL_DIR, filename)
        with open(path, "wb") as f:
            f.write(image_bytes)
        return f"{self.base_url}/static/generated/{filename}"
