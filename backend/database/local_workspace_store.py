import os
import json
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("LocalWorkspaceStore")

STORE_FILE = os.path.join(os.path.dirname(__file__), "local_workspace_store.json")

def is_local_dev_store_enabled() -> bool:
    """
    Determines whether local JSON persistence is permitted.
    Strictly disabled in production to protect serverless runtime and guarantee
    that Supabase PostgreSQL is the authoritative persistence layer.
    """
    env = os.getenv("ENVIRONMENT", "development").lower()
    explicit_flag = os.getenv("ENABLE_LOCAL_WORKSPACE_DEV_STORE")

    if explicit_flag is not None:
        return explicit_flag.lower() in ("true", "1", "yes")

    # In production, default to FALSE (PostgreSQL only)
    if env in ("production", "prod"):
        return False

    # In local development or testing, allowed as a non-breaking developer fallback
    return True


def _load_store() -> Dict[str, Any]:
    if not os.path.exists(STORE_FILE):
        return {
            "users": {},
            "brands": {},
            "products": {},
            "library_assets": {},
            "generation_counts": {}
        }
    try:
        with open(STORE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {STORE_FILE}: {e}")
        return {
            "users": {},
            "brands": {},
            "products": {},
            "library_assets": {},
            "generation_counts": {}
        }

def _save_store(data: Dict[str, Any]):
    if not is_local_dev_store_enabled():
        logger.debug("[LocalWorkspaceStore] Local JSON write skipped: disabled in production environment.")
        return
    try:
        os.makedirs(os.path.dirname(STORE_FILE), exist_ok=True)
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving {STORE_FILE}: {e}")


class LocalWorkspaceStore:
    """
    Development-only resilient persistence store for GoVisual AI.
    Used exclusively in local development mode to preserve workspace state
    when offline. Gated off in production environments.
    """

    @staticmethod
    def is_enabled() -> bool:
        return is_local_dev_store_enabled()

    @staticmethod
    def save_brand(business_id: str, brand_data: Dict[str, Any], email: Optional[str] = None):
        if not is_local_dev_store_enabled():
            return brand_data

        store = _load_store()
        normalized_data = dict(brand_data)
        normalized_data["business_id"] = business_id
        normalized_data["onboarding_complete"] = True

        store["brands"][business_id] = normalized_data
        if email:
            store["brands"][email.lower()] = normalized_data

        # Also register in users map
        b_name = normalized_data.get("brand_name") or normalized_data.get("shopName") or "My Brand"
        user_info = store["users"].get(business_id) or {}
        user_info.update({
            "id": business_id,
            "business_name": b_name,
            "category": normalized_data.get("category"),
            "city": normalized_data.get("city"),
            "email": email or user_info.get("email"),
            "onboarding_complete": True,
        })
        store["users"][business_id] = user_info
        if email:
            store["users"][email.lower()] = user_info

        _save_store(store)
        return normalized_data

    @staticmethod
    def get_brand(identifier: str) -> Optional[Dict[str, Any]]:
        if not identifier or not is_local_dev_store_enabled():
            return None
        store = _load_store()
        key = identifier.lower() if "@" in identifier else identifier

        # 1. Direct match by id or email
        if key in store["brands"]:
            return store["brands"][key]
        if identifier in store["brands"]:
            return store["brands"][identifier]

        # 2. Search through brands for exact matching business_id or email
        for b_id, b_val in store["brands"].items():
            if b_val.get("business_id") == identifier or b_val.get("email", "").lower() == key:
                return b_val

        return None

    @staticmethod
    def save_user(user_id: str, user_data: Dict[str, Any], email: Optional[str] = None):
        if not is_local_dev_store_enabled():
            return user_data

        store = _load_store()
        u_info = store["users"].get(user_id, {})
        u_info.update(user_data)
        u_info["id"] = user_id
        if email:
            u_info["email"] = email

        store["users"][user_id] = u_info
        if email:
            store["users"][email.lower()] = u_info

        _save_store(store)
        return u_info

    @staticmethod
    def get_user(identifier: str) -> Optional[Dict[str, Any]]:
        if not identifier or not is_local_dev_store_enabled():
            return None
        store = _load_store()
        key = identifier.lower() if "@" in identifier else identifier
        if key in store["users"]:
            return store["users"][key]
        if identifier in store["users"]:
            return store["users"][identifier]
        for u_id, u_val in store["users"].items():
            if u_val.get("id") == identifier or u_val.get("email", "").lower() == key:
                return u_val
        return None

    @staticmethod
    def save_library_asset(business_id: str, asset: Dict[str, Any], email: Optional[str] = None):
        if not is_local_dev_store_enabled():
            return

        store = _load_store()
        assets = store["library_assets"].get(business_id, [])
        filtered = [a for a in assets if a.get("id") != asset.get("id") and a.get("url") != asset.get("url")]
        filtered.insert(0, asset)
        store["library_assets"][business_id] = filtered
        if email:
            store["library_assets"][email.lower()] = filtered

        count = store["generation_counts"].get(business_id, 0) + 1
        store["generation_counts"][business_id] = count
        if email:
            store["generation_counts"][email.lower()] = count

        _save_store(store)

    @staticmethod
    def get_library_assets(identifier: str) -> List[Dict[str, Any]]:
        if not identifier or not is_local_dev_store_enabled():
            return []
        store = _load_store()
        key = identifier.lower() if "@" in identifier else identifier
        if key in store["library_assets"]:
            return store["library_assets"][key]
        if identifier in store["library_assets"]:
            return store["library_assets"][identifier]
        for b_id, assets in store["library_assets"].items():
            if b_id == identifier or b_id.lower() == key:
                return assets
        return []

    @staticmethod
    def get_generation_count(identifier: str) -> int:
        if not identifier or not is_local_dev_store_enabled():
            return 0
        store = _load_store()
        key = identifier.lower() if "@" in identifier else identifier
        if key in store["generation_counts"]:
            return store["generation_counts"][key]
        if identifier in store["generation_counts"]:
            return store["generation_counts"][identifier]
        return 0
