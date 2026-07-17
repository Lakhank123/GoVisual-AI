"""
GoVisual AI — Addon: Instagram Integration Service
Handles OAuth, post publishing, and analytics via Instagram Graph API
"""
import os, httpx
from typing import Optional

IG_APP_ID       = os.getenv("INSTAGRAM_APP_ID", "")
IG_APP_SECRET   = os.getenv("INSTAGRAM_APP_SECRET", "")
IG_REDIRECT_URI = os.getenv("INSTAGRAM_REDIRECT_URI", "https://yourdomain.com/api/instagram/callback")
GRAPH_BASE      = "https://graph.instagram.com/v19.0"
FB_GRAPH_BASE   = "https://graph.facebook.com/v19.0"

class InstagramService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30)

    # ── OAuth ─────────────────────────────────────────────────────────────────
    def get_auth_url(self, state: str) -> str:
        """Return Instagram OAuth URL to redirect user to."""
        return (
            f"https://www.facebook.com/v19.0/dialog/oauth"
            f"?client_id={IG_APP_ID}"
            f"&redirect_uri={IG_REDIRECT_URI}"
            f"&scope=instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement"
            f"&response_type=code"
            f"&state={state}"
        )

    async def exchange_code(self, code: str) -> dict:
        """Exchange auth code for short-lived token, then upgrade to long-lived."""
        # Step 1: short-lived token
        resp = await self.client.post(
            f"{FB_GRAPH_BASE}/oauth/access_token",
            data={
                "client_id":     IG_APP_ID,
                "client_secret": IG_APP_SECRET,
                "redirect_uri":  IG_REDIRECT_URI,
                "code":          code,
            }
        )
        resp.raise_for_status()
        short = resp.json()
        short_token = short["access_token"]

        # Step 2: long-lived token (60 days)
        resp2 = await self.client.get(
            f"{FB_GRAPH_BASE}/oauth/access_token",
            params={
                "grant_type":        "fb_exchange_token",
                "client_id":         IG_APP_ID,
                "client_secret":     IG_APP_SECRET,
                "fb_exchange_token": short_token,
            }
        )
        resp2.raise_for_status()
        long = resp2.json()
        return {"access_token": long["access_token"], "expires_in": long.get("expires_in", 5183944)}

    async def get_ig_user_id(self, access_token: str) -> str:
        """Get the Instagram Business account ID linked to the token."""
        # Get Facebook pages
        resp = await self.client.get(f"{FB_GRAPH_BASE}/me/accounts", params={"access_token": access_token})
        resp.raise_for_status()
        pages = resp.json().get("data", [])
        if not pages:
            raise ValueError("No Facebook Pages found. User needs a Facebook Page linked to Instagram Business account.")
        page_token = pages[0]["access_token"]
        page_id    = pages[0]["id"]

        # Get IG account connected to this page
        resp2 = await self.client.get(
            f"{FB_GRAPH_BASE}/{page_id}",
            params={"fields": "instagram_business_account", "access_token": page_token}
        )
        resp2.raise_for_status()
        data = resp2.json()
        ig_id = data.get("instagram_business_account", {}).get("id")
        if not ig_id:
            raise ValueError("No Instagram Business account linked to this Facebook Page.")
        return ig_id, page_token

    # ── Publishing ────────────────────────────────────────────────────────────
    async def publish_image(self, ig_user_id: str, access_token: str, image_url: str, caption: str) -> dict:
        """
        Publish a single image post to Instagram.
        image_url must be a publicly accessible URL (Cloudinary CDN or similar).
        """
        # Step 1: Create media container
        resp = await self.client.post(
            f"{FB_GRAPH_BASE}/{ig_user_id}/media",
            params={
                "image_url":    image_url,
                "caption":      caption,
                "access_token": access_token,
            }
        )
        resp.raise_for_status()
        container_id = resp.json()["id"]

        # Step 2: Publish container
        resp2 = await self.client.post(
            f"{FB_GRAPH_BASE}/{ig_user_id}/media_publish",
            params={"creation_id": container_id, "access_token": access_token}
        )
        resp2.raise_for_status()
        media_id = resp2.json()["id"]
        return {"success": True, "media_id": media_id, "ig_user_id": ig_user_id}

    async def publish_reel(self, ig_user_id: str, access_token: str, video_url: str, caption: str, cover_url: Optional[str] = None) -> dict:
        """Publish an MP4 video as an Instagram Reel."""
        params = {
            "media_type":   "REELS",
            "video_url":    video_url,
            "caption":      caption,
            "share_to_feed":"true",
            "access_token": access_token,
        }
        if cover_url:
            params["cover_url"] = cover_url

        resp = await self.client.post(f"{FB_GRAPH_BASE}/{ig_user_id}/media", params=params)
        resp.raise_for_status()
        container_id = resp.json()["id"]

        # Wait for video processing (poll status)
        import asyncio
        for _ in range(15):
            await asyncio.sleep(5)
            status_resp = await self.client.get(
                f"{FB_GRAPH_BASE}/{container_id}",
                params={"fields": "status_code", "access_token": access_token}
            )
            status = status_resp.json().get("status_code", "")
            if status == "FINISHED":
                break
            if status == "ERROR":
                raise ValueError("Instagram video processing failed.")

        resp2 = await self.client.post(
            f"{FB_GRAPH_BASE}/{ig_user_id}/media_publish",
            params={"creation_id": container_id, "access_token": access_token}
        )
        resp2.raise_for_status()
        return {"success": True, "media_id": resp2.json()["id"]}

    # ── Analytics ─────────────────────────────────────────────────────────────
    async def get_account_insights(self, ig_user_id: str, access_token: str) -> dict:
        """Fetch follower count, reach, impressions for the last 30 days."""
        # Basic profile
        profile_resp = await self.client.get(
            f"{FB_GRAPH_BASE}/{ig_user_id}",
            params={
                "fields":       "followers_count,media_count,username,profile_picture_url",
                "access_token": access_token,
            }
        )
        profile_resp.raise_for_status()
        profile = profile_resp.json()

        # Insights (requires instagram_manage_insights permission)
        try:
            insights_resp = await self.client.get(
                f"{FB_GRAPH_BASE}/{ig_user_id}/insights",
                params={
                    "metric":       "reach,impressions,profile_views,follower_count",
                    "period":       "day",
                    "since":        self._days_ago(30),
                    "until":        self._days_ago(0),
                    "access_token": access_token,
                }
            )
            insights_resp.raise_for_status()
            raw_insights = insights_resp.json().get("data", [])
        except:
            raw_insights = []

        # Recent media performance
        media_resp = await self.client.get(
            f"{FB_GRAPH_BASE}/{ig_user_id}/media",
            params={
                "fields":       "id,caption,media_type,timestamp,like_count,comments_count,media_url",
                "limit":        10,
                "access_token": access_token,
            }
        )
        media_resp.raise_for_status()
        recent_media = media_resp.json().get("data", [])

        return {
            "profile":      profile,
            "insights":     raw_insights,
            "recentMedia":  recent_media,
        }

    async def get_media_insights(self, media_id: str, access_token: str) -> dict:
        """Get reach, impressions, and engagement for a specific post."""
        resp = await self.client.get(
            f"{FB_GRAPH_BASE}/{media_id}/insights",
            params={
                "metric":       "reach,impressions,engagement,saved",
                "access_token": access_token,
            }
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    def _days_ago(self, days: int) -> int:
        import time
        return int(time.time()) - days * 86400
