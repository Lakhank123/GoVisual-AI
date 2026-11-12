from enum import Enum

class LifecycleEvent(str, Enum):
    GenerationStarted = "GenerationStarted"
    CacheHit = "CacheHit"
    CacheMiss = "CacheMiss"
    ProviderStarted = "ProviderStarted"
    ProviderCompleted = "ProviderCompleted"
    ProviderFailed = "ProviderFailed"
    ValidationStarted = "ValidationStarted"
    ValidationCompleted = "ValidationCompleted"
    BackgroundRemovalStarted = "BackgroundRemovalStarted"
    BackgroundRemovalCompleted = "BackgroundRemovalCompleted"
    CompositionStarted = "CompositionStarted"
    CompositionCompleted = "CompositionCompleted"
    StorageStarted = "StorageStarted"
    StorageCompleted = "StorageCompleted"
    GenerationCompleted = "GenerationCompleted"
    GenerationFailed = "GenerationFailed"
