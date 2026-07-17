import os
import httpx

class BrandService:

    def _get_google_key(self):
        return os.getenv("GOOGLE_PLACES_API_KEY", "").strip()

    async def search(self, query: str, city: str) -> list:
        key = self._get_google_key()
        if not key:
            return self._mock_results(query, city)
        search_query = f"{query} {city}".strip()
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(url, params={
                    "query": search_query,
                    "key": key,
                    "type": "establishment",
                    "region": "in",
                })
                data = r.json()
            results = []
            for place in data.get("results", [])[:5]:
                photo_ref = None
                if place.get("photos"):
                    photo_ref = place["photos"][0]["photo_reference"]
                results.append({
                    "place_id": place["place_id"],
                    "name": place["name"],
                    "address": place.get("formatted_address", ""),
                    "rating": place.get("rating", 0),
                    "photo_url": self._photo_url(photo_ref) if photo_ref else None,
                })
            return results if results else self._mock_results(query, city)
        except Exception as e:
            print(f"Places search error: {e}")
            return self._mock_results(query, city)

    async def extract_profile(self, place_id: str) -> dict:
        key = self._get_google_key()
        if not key or place_id.startswith("mock"):
            return self._mock_profile(place_id)
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(url, params={
                    "place_id": place_id,
                    "fields": "name,website,photos,formatted_address,icon",
                    "key": key,
                })
                result = r.json().get("result", {})
            photos = []
            for ph in result.get("photos", [])[:5]:
                ref = ph["photo_reference"]
                photos.append({
                    "url": self._photo_url(ref, 800),
                    "thumb": self._photo_url(ref, 200),
                })
            colors = ["#1a1a2e", "#16213e", "#0f3460"]
            if photos:
                try:
                    photo_bytes = await self.download_photo(photos[0]["url"])
                    colors = self._extract_colors(photo_bytes)
                except Exception:
                    pass
                    
            annotated_colors = [{"hex": c, "source": "google_business"} for c in colors]
            
            return {
                "place_id": place_id,
                "name": result.get("name", "Your Brand"),
                "website": result.get("website", ""),
                "address": result.get("formatted_address", ""),
                "logo_url": result.get("icon", ""),
                "photos": photos,
                "colors": annotated_colors,
            }
        except Exception as e:
            print(f"Place details error: {e}")
            return self._mock_profile(place_id)

    async def download_photo(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            return r.content

    def _extract_colors(self, image_bytes: bytes) -> list:
        from colorthief import ColorThief
        import io
        ct = ColorThief(io.BytesIO(image_bytes))
        palette = ct.get_palette(color_count=3, quality=5)
        return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in palette]

    def _photo_url(self, photo_reference: str, maxwidth: int = 400) -> str:
        key = self._get_google_key()
        return (
            f"https://maps.googleapis.com/maps/api/place/photo"
            f"?maxwidth={maxwidth}"
            f"&photo_reference={photo_reference}"
            f"&key={key}"
        )

    def _mock_results(self, query, city):
        return [
            {
                "place_id": "mock_001",
                "name": query,
                "address": f"Main Road, {city}, Maharashtra",
                "rating": 4.3,
                "photo_url": None,
            },
            {
                "place_id": "mock_002",
                "name": f"{query} - Branch",
                "address": f"Station Area, {city}, Maharashtra",
                "rating": 4.1,
                "photo_url": None,
            },
        ]

    def _mock_profile(self, place_id):
        return {
            "place_id": place_id,
            "name": "Your Brand",
            "website": "",
            "address": "Maharashtra, India",
            "logo_url": "",
            "photos": [],
            "colors": [
                {"hex": "#1a1a2e", "source": "google_business"},
                {"hex": "#e94560", "source": "google_business"},
                {"hex": "#0f3460", "source": "google_business"}
            ],
        }