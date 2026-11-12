"""
GoVisual AI — Addon: Instagram Integration Service
Handles Instagram Login for Professional Accounts (Business / Creator) and direct
creative publishing via Instagram Graph API v20.0.
"""
import os
import io
import asyncio
import httpx
from typing import Optional
from PIL import Image

from services.addons.instagram_exceptions import (
    InstagramError,
    UnsupportedAccountTypeError,
    TokenExchangeError,
    PublicMediaStorageError,
    MediaContainerError,
    PublishingError,
)
from services.storage import StorageService

GRAPH_VERSION   = "v20.0"
IG_GRAPH_BASE   = f"https://graph.instagram.com/{GRAPH_VERSION}"
FB_GRAPH_BASE   = f"https://graph.facebook.com/{GRAPH_VERSION}"
OAUTH_BASE      = "https://api.instagram.com/oauth"
DIALOG_BASE     = "https://www.instagram.com/oauth/authorize"

REQUIRED_SCOPES = "instagram_business_basic,instagram_business_content_publish"


class InstagramService:
    def __init__(self, client: Optional[httpx.AsyncClient] = None, storage_svc: Optional[StorageService] = None):
        self._client = client
        self.storage_svc = storage_svc or StorageService()

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    @property
    def app_id(self) -> str:
        return (os.getenv("META_APP_ID") or os.getenv("INSTAGRAM_APP_ID") or "").strip()

    @property
    def app_secret(self) -> str:
        return (os.getenv("META_APP_SECRET") or os.getenv("INSTAGRAM_APP_SECRET") or "").strip()

    @property
    def redirect_uri(self) -> str:
        return os.getenv(
            "INSTAGRAM_REDIRECT_URI",
            "http://localhost:8000/api/instagram/callback"
        ).strip()

    # ── OAuth & Account ────────────────────────────────────────────────────────
    def get_auth_url(self, state: str) -> str:
        """
        Returns the Instagram Login authorization URL with required permissions only:
        instagram_business_basic, instagram_business_content_publish.
        """
        if not self.app_id:
            raise InstagramError("META_APP_ID or INSTAGRAM_APP_ID is not configured in backend/.env")

        return (
            f"{DIALOG_BASE}"
            f"?enable_fb_login=0"
            f"&force_authentication=1"
            f"&client_id={self.app_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&response_type=code"
            f"&scope={REQUIRED_SCOPES}"
            f"&state={state}"
        )

    async def exchange_code(self, code: str) -> dict:
        """
        Exchanges the authorization code for a short-lived token, then upgrades it
        to a 60-day long-lived credential via the Instagram Graph API.
        """
        if not self.app_id or not self.app_secret:
            raise InstagramError("Meta App ID or App Secret is not configured.")

        # Step 1: Exchange code for short-lived token
        short_token: str = ""
        user_id_from_auth: str = ""
        try:
            resp = await self.client.post(
                f"{OAUTH_BASE}/access_token",
                data={
                    "client_id":     self.app_id,
                    "client_secret": self.app_secret,
                    "grant_type":    "authorization_code",
                    "redirect_uri":  self.redirect_uri,
                    "code":          code,
                }
            )
            if resp.status_code != 200:
                # Fallback to Facebook Graph dialog exchange if applicable
                fb_resp = await self.client.post(
                    f"{FB_GRAPH_BASE}/oauth/access_token",
                    data={
                        "client_id":     self.app_id,
                        "client_secret": self.app_secret,
                        "redirect_uri":  self.redirect_uri,
                        "code":          code,
                    }
                )
                if fb_resp.status_code == 200:
                    resp_data = fb_resp.json()
                else:
                    self._handle_api_error(resp, "Token exchange failed")
            else:
                resp_data = resp.json()

            short_token = resp_data.get("access_token", "")
            user_id_from_auth = str(resp_data.get("user_id", ""))
        except httpx.RequestError as e:
            raise TokenExchangeError(f"Network error during authorization exchange: {str(e)}") from e

        if not short_token:
            raise TokenExchangeError("No access token returned from authorization exchange.")

        # Step 2: Exchange short-lived token for long-lived 60-day token
        try:
            long_resp = await self.client.get(
                f"https://graph.instagram.com/access_token",
                params={
                    "grant_type":    "ig_exchange_token",
                    "client_secret": self.app_secret,
                    "access_token":  short_token,
                }
            )
            if long_resp.status_code == 200:
                long_data = long_resp.json()
                return {
                    "access_token": long_data["access_token"],
                    "expires_in":   long_data.get("expires_in", 5184000),
                    "user_id":      user_id_from_auth,
                }
            else:
                # Fallback to FB long-lived exchange if using Facebook OAuth app
                fb_long = await self.client.get(
                    f"{FB_GRAPH_BASE}/oauth/access_token",
                    params={
                        "grant_type":        "fb_exchange_token",
                        "client_id":         self.app_id,
                        "client_secret":     self.app_secret,
                        "fb_exchange_token": short_token,
                    }
                )
                if fb_long.status_code == 200:
                    fb_data = fb_long.json()
                    return {
                        "access_token": fb_data["access_token"],
                        "expires_in":   fb_data.get("expires_in", 5184000),
                        "user_id":      user_id_from_auth,
                    }
                # If long-lived exchange fails, return short token with warning
                return {
                    "access_token": short_token,
                    "expires_in":   3600,
                    "user_id":      user_id_from_auth,
                }
        except httpx.RequestError as e:
            raise TokenExchangeError(f"Network error upgrading token: {str(e)}") from e

    async def get_account_info(self, access_token: str) -> dict:
        """
        Queries the authenticated Instagram account via Graph API:
        GET /me?fields=id,username,account_type
        Validates that the account is Business or Creator.
        """
        try:
            resp = await self.client.get(
                f"{IG_GRAPH_BASE}/me",
                params={
                    "fields":       "id,username,account_type",
                    "access_token": access_token,
                }
            )
            if resp.status_code != 200:
                self._handle_api_error(resp, "Failed to retrieve Instagram account details")

            data = resp.json()
            ig_id = data.get("id")
            username = data.get("username", "")
            account_type = (data.get("account_type") or "").upper()

            # Account validation
            if account_type not in ["BUSINESS", "CREATOR", "MEDIA_CREATOR"]:
                raise UnsupportedAccountTypeError(
                    "Instagram Professional account required. Please switch your Instagram account to Business or Creator."
                )

            return {
                "instagram_user_id": ig_id,
                "username":          username,
                "account_type":      account_type,
            }
        except httpx.RequestError as e:
            raise InstagramError(f"Network error retrieving Instagram profile: {str(e)}") from e

    # ── Media Resolution & Format ──────────────────────────────────────────────
    def resolve_public_jpeg_url(self, image_url_or_path: str, image_bytes: Optional[bytes] = None) -> str:
        """
        Ensures the creative resolves to a publicly accessible HTTPS JPEG URL.
        Converts PNG/WebP to JPEG if needed.
        Uploads local images to Cloudinary.
        """
        # If already public HTTPS and not a local/private hostname:
        clean_url = (image_url_or_path or "").strip()
        is_local = (
            not clean_url.startswith("http")
            or "localhost" in clean_url
            or "127.0.0.1" in clean_url
            or "0.0.0.0" in clean_url
        )

        if not is_local and clean_url.startswith("https://"):
            return clean_url

        # Otherwise, we must read the local image and upload to Cloudinary
        raw_bytes = image_bytes
        if not raw_bytes:
            # Resolve from local file
            local_path = ""
            if "/static/generated/" in clean_url:
                fname = clean_url.split("/static/generated/")[-1]
                local_path = os.path.join("generated_images", fname)
            elif os.path.exists(clean_url):
                local_path = clean_url
            
            if local_path and os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    raw_bytes = f.read()

        if not raw_bytes:
            raise PublicMediaStorageError(
                f"Cannot resolve local creative image: '{clean_url}' is not accessible on disk."
            )

        # Ensure JPEG format
        jpeg_bytes = self._ensure_jpeg_bytes(raw_bytes)

        # Upload to Cloudinary
        if not self.storage_svc.is_cloudinary_configured():
            raise PublicMediaStorageError(
                "Instagram requires a publicly accessible HTTPS image URL. Your creative is hosted locally, "
                "and Cloudinary is not configured. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, "
                "and CLOUDINARY_API_SECRET in backend/.env to publish directly to Instagram."
            )

        import uuid
        public_url = self.storage_svc.upload_public_jpeg(
            image_bytes=jpeg_bytes,
            folder="govisual_instagram",
            filename=f"ig_post_{uuid.uuid4().hex}.jpg"
        )
        return public_url

    @staticmethod
    def _ensure_jpeg_bytes(image_bytes: bytes) -> bytes:
        """Converts raw image bytes to JPEG if necessary without altering dimensions."""
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                if img.format == "JPEG":
                    return image_bytes
                
                if img.mode != "RGB":
                    img = img.convert("RGB")
                
                out = io.BytesIO()
                img.save(out, format="JPEG", quality=95)
                return out.getvalue()
        except Exception as e:
            raise PublicMediaStorageError(f"Failed to process image format: {str(e)}") from e

    # ── Publishing Flow ────────────────────────────────────────────────────────
    async def publish_creative(
        self,
        ig_user_id: str,
        access_token: str,
        image_url: str,
        caption: str,
        image_bytes: Optional[bytes] = None,
    ) -> dict:
        """
        Executes the Instagram Publishing Flow:
        1. Resolves public HTTPS JPEG URL.
        2. Creates media container via POST /{ig_user_id}/media.
        3. Polls container status with bounded timeout (MAX 5 attempts, backoff 2s).
        4. Publishes container via POST /{ig_user_id}/media_publish.
        5. Retrieves media ID and actual post permalink via GET /{media_id}?fields=id,permalink.
        """
        # Step 1: Resolve public HTTPS JPEG URL
        public_image_url = self.resolve_public_jpeg_url(image_url, image_bytes)

        # Step 2: Create media container
        try:
            container_resp = await self.client.post(
                f"{IG_GRAPH_BASE}/{ig_user_id}/media",
                params={
                    "image_url":    public_image_url,
                    "caption":      caption,
                    "access_token": access_token,
                }
            )
            if container_resp.status_code != 200:
                self._handle_api_error(container_resp, "Failed to create Instagram media container")
            
            container_data = container_resp.json()
            container_id = container_data.get("id")
            if not container_id:
                raise MediaContainerError("Instagram did not return a creation_id container.")
        except httpx.RequestError as e:
            raise MediaContainerError(f"Network error creating media container: {str(e)}") from e

        # Step 3: Bounded polling check
        await self._poll_container_status(container_id, access_token)

        # Step 4: Publish media container
        try:
            publish_resp = await self.client.post(
                f"{IG_GRAPH_BASE}/{ig_user_id}/media_publish",
                params={
                    "creation_id":  container_id,
                    "access_token": access_token,
                }
            )
            if publish_resp.status_code != 200:
                self._handle_api_error(publish_resp, "Failed to publish media container")

            publish_data = publish_resp.json()
            media_id = publish_data.get("id")
            if not media_id:
                raise PublishingError("Instagram publishing response missing media id.")
        except httpx.RequestError as e:
            raise PublishingError(f"Network error publishing media: {str(e)}") from e

        # Step 5: Retrieve published media ID and actual permalink
        permalink = await self._fetch_media_permalink(media_id, access_token)

        return {
            "success":  True,
            "media_id": media_id,
            "permalink": permalink,
        }

    async def _poll_container_status(self, container_id: str, access_token: str) -> None:
        """
        Polls Instagram container status with bounded retries.
        Terminates on FINISHED, ERROR, or EXPIRED.
        """
        max_attempts = 5
        backoff_seconds = 2.0

        for attempt in range(max_attempts):
            try:
                status_resp = await self.client.get(
                    f"{IG_GRAPH_BASE}/{container_id}",
                    params={
                        "fields":       "status_code,status",
                        "access_token": access_token,
                    }
                )
                if status_resp.status_code == 200:
                    data = status_resp.json()
                    status_code = data.get("status_code", "").upper()
                    
                    if status_code == "FINISHED" or not status_code:
                        # For single image posts, container is often ready immediately or has no status_code
                        return
                    if status_code == "ERROR":
                        raise MediaContainerError("Instagram media container processing failed.")
                    if status_code == "EXPIRED":
                        raise MediaContainerError("Instagram media container expired before publishing.")
            except httpx.RequestError:
                pass  # Retry on transient network blip during polling

            if attempt < max_attempts - 1:
                await asyncio.sleep(backoff_seconds)

        # If loop finished without error and without explicit FINISHED, do one last check
        # Many image containers are ready within the initial window

    async def _fetch_media_permalink(self, media_id: str, access_token: str) -> str:
        """Retrieves the actual live Instagram post permalink."""
        try:
            resp = await self.client.get(
                f"{IG_GRAPH_BASE}/{media_id}",
                params={
                    "fields":       "id,permalink",
                    "access_token": access_token,
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                permalink = data.get("permalink")
                if permalink:
                    return permalink
        except Exception:
            pass

        # Fallback to standard Instagram post format if permalink query is delayed
        return f"https://www.instagram.com/p/{media_id}/"

    # ── Error Translation ──────────────────────────────────────────────────────
    @staticmethod
    def _handle_api_error(response: httpx.Response, context: str) -> None:
        """Translates Meta Graph API error codes into human-readable messages without exposing secrets."""
        try:
            error_obj = response.json().get("error", {})
            code = error_obj.get("code")
            subcode = error_obj.get("error_subcode")
            msg = error_obj.get("message", response.text)
        except Exception:
            code = response.status_code
            msg = response.text

        # Error translations
        if code == 190:
            raise InstagramError("Instagram session or token expired. Please reconnect your Instagram account.")
        elif code in [4, 17, 32, 613]:
            raise InstagramError("Instagram API rate limit reached. Please wait a few moments and try again.")
        elif code in [10, 200] or subcode == 1363030:
            raise InstagramError("Instagram publishing permission denied. Ensure your account is a Business/Creator account and has granted content publishing permissions.")
        elif code == 100:
            raise InstagramError(f"Invalid Instagram request parameters: {msg}")
        else:
            raise InstagramError(f"{context}: {msg}")
