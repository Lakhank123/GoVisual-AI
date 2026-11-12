import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

class ProductService:
    """
    Service for managing Product Catalog.
    Instantiates a scoped Supabase client per request using the user's JWT
    to ensure RLS is correctly enforced at the database layer.
    """

    def _get_client(self, token: str) -> Client:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise ValueError("Supabase credentials not configured.")
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        # Manually set the auth header so the client acts as the user
        client.options.headers["Authorization"] = f"Bearer {token}"
        return client

    def get_products(self, token: str):
        client = self._get_client(token)
        response = client.table("brand_products").select("*").execute()
        return response.data

    def get_product(self, token: str, product_id: str):
        client = self._get_client(token)
        response = client.table("brand_products").select("*").eq("id", product_id).execute()
        if not response.data:
            return None
        return response.data[0]

    def create_product(self, token: str, business_id: str, data: dict):
        client = self._get_client(token)
        
        # Ensure brand_core_identity exists to satisfy foreign key constraint
        try:
            client.table("brand_core_identity").insert({
                "business_id": business_id,
                "brand_name": "Default Brand"
            }).execute()
        except Exception as e:
            print(f"Error creating brand_core_identity: {e}")

        # Enforce business_id matches the authenticated user (tenant isolation)
        data["business_id"] = business_id
        response = client.table("brand_products").insert(data).execute()
        if not response.data:
            raise Exception("Failed to create product")
        return response.data[0]

    def update_product(self, token: str, product_id: str, data: dict):
        client = self._get_client(token)
        # Prevent updating the business_id
        if "business_id" in data:
            del data["business_id"]
        response = client.table("brand_products").update(data).eq("id", product_id).execute()
        if not response.data:
            return None
        return response.data[0]

    def delete_product(self, token: str, product_id: str):
        client = self._get_client(token)
        response = client.table("brand_products").delete().eq("id", product_id).execute()
        # In Supabase Python client, delete() returns the deleted rows in .data
        if not response.data:
            return False
        return True
