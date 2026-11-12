from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from services.auth import get_current_user
from services.product_service import ProductService
import logging

router = APIRouter(prefix="/api/products", tags=["products"])
product_svc = ProductService()
security = HTTPBearer()

logger = logging.getLogger(__name__)

# Pydantic schemas for request/response validation
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price_positioning: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_positioning: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    business_id: str
    name: str
    description: Optional[str]
    price_positioning: Optional[str]
    category: Optional[str]
    image_url: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

def get_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Extracts the raw JWT token from the Authorization header."""
    return credentials.credentials

@router.get("", response_model=List[ProductResponse])
def get_products(user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    """Retrieve all products for the authenticated user's business."""
    try:
        products = product_svc.get_products(token)
        return products
    except Exception as e:
        logger.error(f"Error fetching products: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred.")

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    """Retrieve a specific product by ID."""
    try:
        product = product_svc.get_product(token, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred.")

@router.post("", response_model=ProductResponse)
def create_product(product: ProductCreate, user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    """Create a new product."""
    try:
        # Enforce business_id matches the authenticated user.id
        business_id = user.id
        new_product = product_svc.create_product(token, business_id, product.dict(exclude_unset=True))
        return new_product
    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, product: ProductUpdate, user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    """Update an existing product."""
    try:
        updated_product = product_svc.update_product(token, product_id, product.dict(exclude_unset=True))
        if not updated_product:
            raise HTTPException(status_code=404, detail="Product not found or access denied")
        return updated_product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred.")

@router.delete("/{product_id}")
def delete_product(product_id: str, user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    """Delete a product."""
    try:
        success = product_svc.delete_product(token, product_id)
        if not success:
            raise HTTPException(status_code=404, detail="Product not found or access denied")
        return {"status": "success", "message": "Product deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred.")
