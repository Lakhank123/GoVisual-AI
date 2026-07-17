import asyncio
import logging
from typing import Dict, Any, Optional
from services.brand import BrandService
from services.addons.instagram_service import InstagramService

logger = logging.getLogger(__name__)

class DataSourceService:
    """
    Handles parallel data extraction from multiple sources.
    Implements graceful degradation: if one source fails, it continues with the rest.
    """
    def __init__(self):
        self.brand_svc = BrandService()
        self.ig_svc = InstagramService()
    
    async def extract_all(self, 
                          google_place_id: Optional[str] = None, 
                          website_url: Optional[str] = None, 
                          instagram_handle: Optional[str] = None,
                          manual_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Extracts data concurrently from provided sources.
        Returns a dictionary of raw sources.
        """
        results = {
            "google": None,
            "website": None,
            "instagram": None,
            "manual": manual_data,
            "errors": []
        }
        
        tasks = {}
        
        if google_place_id:
            tasks["google"] = self.brand_svc.extract_profile(google_place_id)
            
        if instagram_handle:
            # Check if ig_svc has a specific method, otherwise just mock or pass
            if hasattr(self.ig_svc, 'extract_profile'):
                tasks["instagram"] = self.ig_svc.extract_profile(instagram_handle)
            else:
                tasks["instagram"] = self._mock_extract_instagram(instagram_handle)
                
        if website_url:
            tasks["website"] = self._mock_extract_website(website_url)
            
        if manual_data and "logo_base64" in manual_data:
            tasks["logo"] = self._extract_logo(manual_data["logo_base64"])
            
        # Execute all tasks concurrently, catching exceptions so one failure doesn't block others
        if tasks:
            keys = list(tasks.keys())
            coroutines = list(tasks.values())
            
            responses = await asyncio.gather(*coroutines, return_exceptions=True)
            
            for key, response in zip(keys, responses):
                if isinstance(response, Exception):
                    logger.error(f"Extraction failed for source '{key}': {str(response)}")
                    results["errors"].append(f"Failed to extract from {key}")
                else:
                    results[key] = response
                    
        return results

    async def _extract_logo(self, base64_str: str) -> Dict[str, Any]:
        try:
            import base64
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            image_bytes = base64.b64decode(base64_str)
            colors = self.brand_svc._extract_colors(image_bytes)
            # Annotate with source
            annotated_colors = [{"hex": c, "source": "logo"} for c in colors]
            return {"colors": annotated_colors}
        except Exception as e:
            logger.error(f"Logo extraction error: {e}")
            return {"colors": []}

    async def _mock_extract_website(self, url: str) -> Dict[str, Any]:
        """Scrape website for text and basic CSS colors."""
        import httpx
        from bs4 import BeautifulSoup
        import re
        
        if not url.startswith("http"):
            url = "http://" + url
            
        colors = []
        scraped_text = "Premium products and services."
        
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, 'html.parser')
                    # Extract basic text
                    scraped_text = " ".join(soup.stripped_strings)[:1000]
                    
                    # Very naive CSS color extraction (hex codes)
                    hex_matches = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', r.text)
                    # Filter out grays/whites/blacks heuristically or just take top most common
                    from collections import Counter
                    common_hex = [c[0].lower() for c in Counter(hex_matches).most_common(5)]
                    
                    colors = [{"hex": c, "source": "website"} for c in common_hex]
        except Exception as e:
            logger.error(f"Website extraction error for {url}: {e}")
            
        return {"url": url, "scraped_text": scraped_text, "colors": colors}
        
    async def _mock_extract_instagram(self, handle: str) -> Dict[str, Any]:
        """Simple mock for IG extraction."""
        return {"handle": handle, "bio": "Official instagram account.", "followers": 0, "colors": []}
