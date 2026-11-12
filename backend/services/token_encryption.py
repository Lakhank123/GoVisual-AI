"""
GoVisual AI — Token Encryption Service
Secures Instagram OAuth access tokens at rest using AES (Fernet).
Tokens are decrypted only in memory when executing publishing calls and are
never exposed to the frontend or written to disk unencrypted.
"""
import os
import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken

class TokenEncryptionService:
    def __init__(self, key: Optional[str] = None):
        raw_key = key or os.getenv("TOKEN_ENCRYPTION_KEY")
        if not raw_key:
            # Fallback to META_APP_SECRET or INSTAGRAM_APP_SECRET
            raw_key = os.getenv("META_APP_SECRET") or os.getenv("INSTAGRAM_APP_SECRET")
            
        if not raw_key:
            raise ValueError(
                "TOKEN_ENCRYPTION_KEY (or META_APP_SECRET) must be set in the environment."
            )
            
        self.fernet = Fernet(self._derive_fernet_key(raw_key))

    @staticmethod
    def _derive_fernet_key(raw_key: str) -> bytes:
        """
        Ensures any raw key string is converted into a valid 32-byte URL-safe base64
        Fernet key.
        """
        # If it's already a valid 44-char urlsafe base64 string decoding to 32 bytes:
        try:
            decoded = base64.urlsafe_b64decode(raw_key.encode("utf-8"))
            if len(decoded) == 32:
                return raw_key.encode("utf-8")
        except Exception:
            pass

        # Otherwise, deterministically hash with SHA-256 and base64 urlsafe encode
        hashed = hashlib.sha256(raw_key.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(hashed)

    def encrypt(self, plaintext_token: str) -> str:
        """Encrypts a plaintext token into an encrypted string."""
        if not plaintext_token:
            raise ValueError("Token cannot be empty.")
        encrypted_bytes = self.fernet.encrypt(plaintext_token.encode("utf-8"))
        return encrypted_bytes.decode("utf-8")

    def decrypt(self, encrypted_token: str) -> str:
        """Decrypts an encrypted string back into the plaintext token."""
        if not encrypted_token:
            raise ValueError("Encrypted token cannot be empty.")
        try:
            decrypted_bytes = self.fernet.decrypt(encrypted_token.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except InvalidToken as e:
            raise ValueError("Failed to decrypt token: invalid token or encryption key mismatch.") from e
