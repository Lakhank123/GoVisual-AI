"""
GoVisual AI — Instagram Integration Exceptions
Human-readable exceptions for Meta/Instagram OAuth and publishing flows.
"""

class InstagramError(Exception):
    """Base exception for Instagram integration."""
    pass

class UnsupportedAccountTypeError(InstagramError):
    """Raised when an Instagram account is Personal rather than Business or Creator."""
    pass

class OAuthStateError(InstagramError):
    """Raised when OAuth state is missing, invalid, replayed, or expired."""
    pass

class TokenExchangeError(InstagramError):
    """Raised when exchanging authorization code for token fails."""
    pass

class PublicMediaStorageError(InstagramError):
    """Raised when an image is local and cannot resolve to a public HTTPS JPEG URL."""
    pass

class MediaContainerError(InstagramError):
    """Raised when creating or polling Instagram media container fails."""
    pass

class PublishingError(InstagramError):
    """Raised when the final media_publish call or permalink retrieval fails."""
    pass
