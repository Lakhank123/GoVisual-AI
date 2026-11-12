"""
GoVisual AI — Isolated Instagram Database Repository (SQLite)
Maintains Instagram connections and OAuth state without modifying Supabase schema or data.
Designed behind an abstract repository interface for easy migration in the future.
"""
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional, Protocol

DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "govisual.db"
)

class BaseInstagramRepository(Protocol):
    def upsert_connection(
        self,
        user_id: str,
        instagram_user_id: str,
        username: str,
        account_type: str,
        access_token_encrypted: str,
        token_expires_at: Optional[str] = None,
        status: str = "active",
    ) -> dict: ...

    def get_connection(self, user_id: str) -> Optional[dict]: ...

    def disconnect(self, user_id: str) -> bool: ...

    def save_oauth_state(self, state: str, user_id: str) -> None: ...

    def consume_oauth_state(self, state: str, max_age_seconds: int = 600) -> Optional[str]: ...


class SQLiteInstagramRepository:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        """Initializes tables if they do not exist."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS instagram_connections (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL UNIQUE,
                    instagram_user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    account_type TEXT NOT NULL,
                    access_token_encrypted TEXT NOT NULL,
                    token_expires_at TIMESTAMP,
                    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active'
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS oauth_states (
                    state TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()

    def upsert_connection(
        self,
        user_id: str,
        instagram_user_id: str,
        username: str,
        account_type: str,
        access_token_encrypted: str,
        token_expires_at: Optional[str] = None,
        status: str = "active",
    ) -> dict:
        now_str = datetime.now(timezone.utc).isoformat()
        conn_id = str(uuid.uuid4())
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO instagram_connections (
                    id, user_id, instagram_user_id, username, account_type,
                    access_token_encrypted, token_expires_at, connected_at, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    instagram_user_id = excluded.instagram_user_id,
                    username = excluded.username,
                    account_type = excluded.account_type,
                    access_token_encrypted = excluded.access_token_encrypted,
                    token_expires_at = excluded.token_expires_at,
                    connected_at = excluded.connected_at,
                    status = excluded.status;
            """, (
                conn_id,
                user_id,
                instagram_user_id,
                username,
                account_type,
                access_token_encrypted,
                token_expires_at,
                now_str,
                status
            ))
            conn.commit()

        return self.get_connection(user_id) or {}

    def get_connection(self, user_id: str) -> Optional[dict]:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM instagram_connections WHERE user_id = ?",
                (user_id,)
            )
            row = cur.fetchone()
            if row:
                return dict(row)
            return None

    def disconnect(self, user_id: str) -> bool:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE instagram_connections SET status = 'disconnected' WHERE user_id = ?",
                (user_id,)
            )
            conn.commit()
            return cur.rowcount > 0

    def save_oauth_state(self, state: str, user_id: str) -> None:
        now_str = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO oauth_states (state, user_id, created_at) VALUES (?, ?, ?)",
                (state, user_id, now_str)
            )
            conn.commit()

    def consume_oauth_state(self, state: str, max_age_seconds: int = 600) -> Optional[str]:
        """
        Validates and consumes OAuth state exactly once.
        Rejects invalid, expired, or previously used states.
        """
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT user_id, created_at FROM oauth_states WHERE state = ?",
                (state,)
            )
            row = cur.fetchone()
            if not row:
                return None

            user_id = row["user_id"]
            created_at_str = row["created_at"]

            # Delete the state immediately to prevent reuse (one-time consumption)
            cur.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
            conn.commit()

            # Validate expiration
            try:
                # Parse created_at (support ISO format and sqlite timestamp)
                if isinstance(created_at_str, str):
                    if "T" in created_at_str:
                        created_dt = datetime.fromisoformat(created_at_str)
                    else:
                        created_dt = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                else:
                    created_dt = datetime.now(timezone.utc)

                age = (datetime.now(timezone.utc) - created_dt).total_seconds()
                if age > max_age_seconds:
                    return None
            except Exception:
                # If parsing fails, fall back to invalidating for security
                return None

            return user_id


# Global repository instance
instagram_repo = SQLiteInstagramRepository()
