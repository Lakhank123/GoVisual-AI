"""
GoVisual AI — Brand Intelligence Service
Extracts business name, logo, photos, and color palette
from Google Places API.
"""

import os
import httpx
from colorthief import ColorThief
import io

GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")


class BrandService:

    async def search(self, query: str, city: str) -> list:
        """Search Google Places for a business. Returns top 5 results."""
        if not GOOGLE_API_KEY:
            # Return mock data in development
            return self._mock_results(query, city)

        search_query = f"{query} {city}".strip()
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"

        async with httpx.AsyncClient() as client:
            r = await client.get(url, params={
                "query": search_query,
                "key":   GOOGLE_API_KEY,
                "type":  "establishment",
            })
            data = r.json()

        results = []
        for place in data.get("results", [])[:5]:
            photo_ref = None
            if place.get("photos"):
                photo_ref = place["photos"][0]["photo_reference"]

            results.append({
                "place_id":   place["place_id"],
                "name":       place["name"],
                "address":    place.get("formatted_address", ""),
                "rating":     place.get("rating", 0),
                "photo_url":  self._photo_url(photo_ref) if photo_ref else None,
            })

        return results

    async def extract_profile(self, place_id: str) -> dict:
        """Given a place_id, return full brand profile with colors."""
        if not GOOGLE_API_KEY:
            return self._mock_profile(place_id)

        url = "https://maps.googleapis.com/maps/api/place/details/json"
        async with httpx.AsyncClient() as client:
            r = await client.get(url, params={
                "place_id": place_id,
                "fields":   "name,website,photos,formatted_address,icon",
                "key":      GOOGLE_API_KEY,
            })
            result = r.json().get("result", {})

        # Download up to 5 photos
        photos = []
        for ph in result.get("photos", [])[:5]:
            ref = ph["photo_reference"]
            photos.append({
                "url":   self._photo_url(ref, maxwidth=800),
                "thumb": self._photo_url(ref, maxwidth=200),
            })

        # Extract dominant colors from first photo
        colors = ["#1a1a2e", "#16213e", "#0f3460"]  # fallback dark colors
        if photos:
            try:
                photo_bytes = await self.download_photo(photos[0]["url"])
                colors = self._extract_colors(photo_bytes)
            except Exception:
                pass

        return {
            "place_id": place_id,
            "name":     result.get("name", "Your Brand"),
            "website":  result.get("website", ""),
            "address":  result.get("formatted_address", ""),
            "logo_url": result.get("icon", ""),
            "photos":   photos,
            "colors":   colors,
        }

    async def download_photo(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            return r.content

    def _extract_colors(self, image_bytes: bytes) -> list:
        """Use ColorThief to extract 3 dominant hex colors."""
        ct = ColorThief(io.BytesIO(image_bytes))
        palette = ct.get_palette(color_count=3, quality=5)
        return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in palette]

    def _photo_url(self, photo_reference: str, maxwidth: int = 400) -> str:
        return (
            f"https://maps.googleapis.com/maps/api/place/photo"
            f"?maxwidth={maxwidth}&photo_reference={photo_reference}&key={GOOGLE_API_KEY}"
        )

    # ── Mock data for development (no API key needed) ─────────────────────
    def _mock_results(self, query, city):
        return [
            {
                "place_id": "mock_001",
                "name":     f"{query} - {city}",
                "address":  f"Main Road, {city}, Maharashtra",
                "rating":   4.3,
                "photo_url": None,
            }
        ]

    def _mock_profile(self, place_id):
        return {
            "place_id": place_id,
            "name":     "Demo Brand",
            "website":  "",
            "address":  "Demo Address, Maharashtra",
            "logo_url": "",
            "photos":   [],
            "colors":   ["#1a1a2e", "#e94560", "#0f3460"],
        }
