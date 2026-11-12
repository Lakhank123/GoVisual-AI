from typing import Dict, Type
from .base_provider import BaseGenerationProvider

class ProviderFactory:
    _providers: Dict[str, Type[BaseGenerationProvider]] = {}

    @classmethod
    def register(cls, name: str, provider_cls: Type[BaseGenerationProvider]):
        cls._providers[name] = provider_cls

    @classmethod
    def get_provider(cls, name: str) -> BaseGenerationProvider:
        provider_cls = cls._providers.get(name)
        if not provider_cls:
            raise ValueError(f"Provider '{name}' not found. Available providers: {list(cls._providers.keys())}")
        return provider_cls()
