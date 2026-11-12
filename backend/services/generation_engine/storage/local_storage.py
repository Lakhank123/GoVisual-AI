import os
import aiofiles
from typing import List
from .base_storage import StorageProvider

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: str = "backend/generated_assets"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    async def upload(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        filepath = os.path.join(self.base_path, filename)
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(file_bytes)
        return filepath

    async def download(self, storage_path: str) -> bytes:
        async with aiofiles.open(storage_path, 'rb') as f:
            return await f.read()

    async def delete(self, storage_path: str) -> bool:
        if os.path.exists(storage_path):
            os.remove(storage_path)
            return True
        return False

    async def exists(self, storage_path: str) -> bool:
        return os.path.exists(storage_path)

    async def generate_public_url(self, storage_path: str) -> str:
        # For local, just return the path or a mock URL
        return f"http://localhost:8000/assets/{os.path.basename(storage_path)}"

    async def generate_signed_url(self, storage_path: str, expiration_seconds: int = 3600) -> str:
        return await self.generate_public_url(storage_path)

    async def list_assets(self, prefix: str) -> List[str]:
        # Basic implementation
        return [f for f in os.listdir(self.base_path) if f.startswith(prefix)]
