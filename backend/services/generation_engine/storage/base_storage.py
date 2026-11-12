from abc import ABC, abstractmethod
from typing import List, Optional

class StorageProvider(ABC):
    @abstractmethod
    async def upload(self, file_bytes: bytes, filename: str, mime_type: str) -> str:
        pass
        
    @abstractmethod
    async def download(self, storage_path: str) -> bytes:
        pass
        
    @abstractmethod
    async def delete(self, storage_path: str) -> bool:
        pass
        
    @abstractmethod
    async def exists(self, storage_path: str) -> bool:
        pass
        
    @abstractmethod
    async def generate_public_url(self, storage_path: str) -> str:
        pass
        
    @abstractmethod
    async def generate_signed_url(self, storage_path: str, expiration_seconds: int = 3600) -> str:
        pass
        
    @abstractmethod
    async def list_assets(self, prefix: str) -> List[str]:
        pass
