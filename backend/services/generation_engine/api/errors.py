class GenerationEngineError(Exception):
    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

class ProviderUnavailableError(GenerationEngineError):
    pass

class StorageError(GenerationEngineError):
    pass

class CacheMissError(GenerationEngineError):
    pass

class ValidationFailedError(GenerationEngineError):
    pass

class GenerationFailedError(GenerationEngineError):
    pass

class TimeoutError(GenerationEngineError):
    pass

class RateLimitExceededError(GenerationEngineError):
    pass
