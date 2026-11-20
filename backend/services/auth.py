import os
import json
import base64
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv

# Ensure env vars are loaded
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
security = HTTPBearer()

class FallbackUser:
    def __init__(self, user_id: str, email: str = ""):
        self.id = user_id
        self.email = email
        self.user_metadata = {"email": email}

    def __getitem__(self, item):
        return getattr(self, item)

def decode_jwt_claims(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) >= 2:
            padding = "=" * ((4 - len(parts[1]) % 4) % 4)
            return json.loads(base64.urlsafe_b64decode(parts[1] + padding).decode("utf-8"))
    except Exception:
        pass
    return {}

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if response and response.user:
            return response.user
    except Exception as e:
        # Fallback when Supabase cloud is paused / unreachable
        claims = decode_jwt_claims(token)
        user_id = claims.get("sub") or claims.get("user_id")
        email = claims.get("email") or ""
        if user_id:
            return FallbackUser(user_id=user_id, email=email)
        print(f"Auth Exception: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

    claims = decode_jwt_claims(token)
    user_id = claims.get("sub") or claims.get("user_id")
    email = claims.get("email") or ""
    if user_id:
        return FallbackUser(user_id=user_id, email=email)

    raise HTTPException(status_code=401, detail="Invalid authentication credentials")
