# Intelligence package
import os
import logging
from .base import BrandIntelligenceProvider
from .groq_analyst import GroqBrandIntelligence

logger = logging.getLogger(__name__)

def get_intelligence_provider() -> BrandIntelligenceProvider:
    provider = os.getenv("BRAND_INTELLIGENCE_PROVIDER", "groq").lower()
    
    # We enforce Groq for the analysis pipeline as requested
    if provider != "groq":
        logger.warning(f"Provider {provider} requested, but forcing Groq as per configuration.")
        
    return GroqBrandIntelligence()
