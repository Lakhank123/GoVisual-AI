"""
GoVisual AI — Brand Intelligence Service
Extracts business name, logo, photos, and color palette
from Google Places API.
"""

import os
import httpx
import io

GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")


class BrandService:

    async def search(self, query: str, city: str) -> list:
        """Search Google Places for a business. Returns top 6 results."""
        if not GOOGLE_API_KEY:
            return self._mock_results(query, city)

        # Append India + state to force local results
        search_query = f"{query} {city} Maharashtra India".strip()
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params={
                    "query":    search_query,
                    "key":      GOOGLE_API_KEY,
                    "region":   "in",
                    "language": "en",
                })
                data = r.json()

            # Log status so you can debug in terminal
            status = data.get("status", "UNKNOWN")
            print(f"[Places API] status={status} | query='{search_query}'")

            if status == "REQUEST_DENIED":
                print(f"[Places API] error: {data.get('error_message', 'no message')}")
                print("[Places API] Fix: Enable billing on console.cloud.google.com")
                return self._mock_results(query, city)

            if status == "ZERO_RESULTS":
                print("[Places API] No results — trying shorter query")
                # Retry with just name + city (no state)
                return await self._retry_search(query, city)

            if status != "OK":
                print(f"[Places API] Unexpected status: {status}")
                return self._mock_results(query, city)

            results = []
            for place in data.get("results", [])[:6]:
                photo_ref = None
                if place.get("photos"):
                    photo_ref = place["photos"][0]["photo_reference"]

                results.append({
                    "place_id": place["place_id"],
                    "name":     place["name"],
                    "address":  place.get("formatted_address", ""),
                    "rating":   place.get("rating", 0),
                    "photo_url": self._photo_url(photo_ref) if photo_ref else None,
                })

            print(f"[Places API] Found {len(results)} results")
            return results if results else self._mock_results(query, city)

        except httpx.TimeoutException:
            print("[Places API] Request timed out")
            return self._mock_results(query, city)
        except Exception as e:
            print(f"[Places API] Exception: {e}")
            return self._mock_results(query, city)

    async def _retry_search(self, query: str, city: str) -> list:
        """Fallback search with shorter query when full query returns nothing."""
        search_query = f"{query} {city}".strip()
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params={
                    "query":  search_query,
                    "key":    GOOGLE_API_KEY,
                    "region": "in",
                })
                data = r.json()
            results = []
            for place in data.get("results", [])[:6]:
                photo_ref = None
                if place.get("photos"):
                    photo_ref = place["photos"][0]["photo_reference"]
                results.append({
                    "place_id": place["place_id"],
                    "name":     place["name"],
                    "address":  place.get("formatted_address", ""),
                    "rating":   place.get("rating", 0),
                    "photo_url": self._photo_url(photo_ref) if photo_ref else None,
                })
            return results if results else self._mock_results(query, city)
        except Exception as e:
            print(f"[Places API] Retry failed: {e}")
            return self._mock_results(query, city)

    async def extract_profile(self, place_id: str) -> dict:
        """Given a place_id, return full brand profile with colors."""
        if not GOOGLE_API_KEY or place_id.startswith("mock"):
            return self._mock_profile(place_id)

        url = "https://maps.googleapis.com/maps/api/place/details/json"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url, params={
                    "place_id": place_id,
                    "fields":   "name,website,photos,formatted_address,icon,rating",
                    "key":      GOOGLE_API_KEY,
                    "language": "en",
                })
                data = r.json()

            print(f"[Places Details] status={data.get('status')}")
            result = data.get("result", {})

            # Build photo list — up to 6 photos
            photos = []
            for ph in result.get("photos", [])[:6]:
                ref = ph["photo_reference"]
                photos.append({
                    "url":   self._photo_url(ref, maxwidth=800),
                    "thumb": self._photo_url(ref, maxwidth=200),
                })

            # Extract dominant colors from first shop photo
            colors = ["#1a1a2e", "#16213e", "#0f3460"]
            if photos:
                try:
                    photo_bytes = await self.download_photo(photos[0]["url"])
                    colors = self._extract_colors(photo_bytes)
                    print(f"[ColorThief] Extracted colors: {colors}")
                except Exception as ce:
                    print(f"[ColorThief] Failed: {ce} — using fallback colors")

            return {
                "place_id": place_id,
                "name":     result.get("name", "Your Brand"),
                "website":  result.get("website", ""),
                "address":  result.get("formatted_address", ""),
                "logo_url": result.get("icon", ""),
                "photos":   photos,
                "colors":   colors,
                "rating":   result.get("rating", 0),
            }

        except Exception as e:
            print(f"[Places Details] Exception: {e}")
            return self._mock_profile(place_id)

    async def download_photo(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(url)
            return r.content

    def _extract_colors(self, image_bytes: bytes) -> list:
        """Use ColorThief to extract 3 dominant hex colors."""
        from colorthief import ColorThief
        ct = ColorThief(io.BytesIO(image_bytes))
        palette = ct.get_palette(color_count=3, quality=5)
        return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in palette]

    def _photo_url(self, photo_reference: str, maxwidth: int = 400) -> str:
        return (
            f"https://maps.googleapis.com/maps/api/place/photo"
            f"?maxwidth={maxwidth}"
            f"&photo_reference={photo_reference}"
            f"&key={GOOGLE_API_KEY}"
        )

    def _mock_results(self, query: str, city: str) -> list:
        return [
            {
                "place_id": "mock_001",
                "name":     query,
                "address":  f"Main Road, {city}, Maharashtra",
                "rating":   4.3,
                "photo_url": None,
            },
            {
                "place_id": "mock_002",
                "name":     f"{query} - Branch",
                "address":  f"Station Area, {city}, Maharashtra",
                "rating":   4.1,
                "photo_url": None,
            },
        ]

    def _mock_profile(self, place_id: str) -> dict:
        return {
            "place_id": place_id,
            "name":     "Your Brand",
            "website":  "",
            "address":  "Maharashtra, India",
            "logo_url": "",
            "photos":   [],
            "colors":   ["#1a1a2e", "#e94560", "#0f3460"],
            "rating":   0,
        }