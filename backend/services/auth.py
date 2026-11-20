import os
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv
import jwt

load_dotenv()

logger = logging.getLogger("GoVisual.Auth")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
security = HTTPBearer(auto_error=True)

class AuthenticatedUser:
    """
    Cryptographically verified Supabase user representation.
    Guarantees user ID, email, and claims have been validated against
    the cryptographic signature and expiration time.
    """
    def __init__(self, user_id: str, email: str = "", role: str = "authenticated", metadata: Optional[Dict[str, Any]] = None):
        self.id = user_id
        self.email = email
        self.role = role
        self.user_metadata = metadata or {"email": email}
        self.app_metadata = {"role": role}

    def __getitem__(self, item):
        return getattr(self, item, None)

    def get(self, item, default=None):
        return getattr(self, item, default)

    def __repr__(self):
        return f"<AuthenticatedUser id={self.id} email={self.email}>"


def verify_supabase_jwt(token: str) -> AuthenticatedUser:
    """
    Cryptographically verifies the incoming Supabase JWT token.
    1. If SUPABASE_JWT_SECRET is configured, performs local HMAC-SHA256 signature,
       expiration, and audience validation with PyJWT.
    2. Otherwise, delegates verification to the authoritative Supabase Auth API
       via supabase.auth.get_user(token).
    3. Rejects invalid, forged, or expired tokens with HTTP 401.
    Never accepts unverified claims.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or malformed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Method 1: Cryptographic verification using SUPABASE_JWT_SECRET
    if SUPABASE_JWT_SECRET:
        try:
            # Supabase tokens use HS256 and aud="authenticated"
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
                leeway=10,
            )

            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing subject claim ('sub').",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Check audience if set
            aud = payload.get("aud")
            if aud and aud != "authenticated":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token audience.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            email = payload.get("email", "")
            role = payload.get("role", "authenticated")
            user_meta = payload.get("user_metadata", {})

            return AuthenticatedUser(
                user_id=str(user_id),
                email=str(email),
                role=str(role),
                metadata=user_meta,
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature: cryptographic verification failed.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWTError as e:
            logger.warning(f"[Auth] PyJWT verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Method 2: Authoritative verification via Supabase Auth API
    try:
        response = supabase.auth.get_user(token)
        if response and response.user:
            u = response.user
            user_id = getattr(u, "id", None) or (u.get("id") if isinstance(u, dict) else None)
            email = getattr(u, "email", "") or (u.get("email") if isinstance(u, dict) else "")
            user_meta = getattr(u, "user_metadata", {}) or (u.get("user_metadata") if isinstance(u, dict) else {})
            role = getattr(u, "role", "authenticated") or "authenticated"

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Supabase user validation returned an invalid user ID.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return AuthenticatedUser(
                user_id=str(user_id),
                email=str(email),
                role=str(role),
                metadata=user_meta,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"[Auth] Supabase auth.get_user failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Unable to verify token signature with auth provider.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> AuthenticatedUser:
    """
    FastAPI dependency that enforces strict, cryptographic authentication.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header with Bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_supabase_jwt(credentials.credentials)
