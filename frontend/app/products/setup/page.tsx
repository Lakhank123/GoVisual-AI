"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, getSafeSession } from "@/lib/supabase";
import { getProducts, createProduct, updateProduct, deleteProduct, uploadProductImage, getProductImageUrl, deleteProductImage, Product } from "@/lib/productApi";
import { useDemoSession } from "@/components/providers/demo-session-provider";

export default function ProductsSetupPage() {
  const router = useRouter();
  const { refreshProducts } = useDemoSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await getSafeSession();
        if (!session) {
          router.push("/auth");
          return;
        }
        setUserId(session.user.id);
        const fetchedProducts = await getProducts(session.access_token);
        setProducts(fetchedProducts);

        const urls: Record<string, string> = {};
        for (const p of fetchedProducts) {
          if (p.image_url) {
            const url = await getProductImageUrl(p.image_url);
            if (url) urls[p.id] = url;
          }
        }
        setImageUrls(urls);
      } catch (err: any) {
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg"];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ["jpg", "jpeg", "png", "webp"];

    if (!validMimes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      setError("Only JPG, JPEG, PNG, and WEBP images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB.");
      return;
    }

    setError("");
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setDesc("");
    setCategory("");
    setImageFile(null);
    setImagePreview(null);
    setEditProductId(null);
  };

  const handleSave = async () => {
    if (!name.trim() || !category.trim() || !desc.trim()) {
      setError("Name, category, and description are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      let imageUrl = editProductId ? products.find(p => p.id === editProductId)?.image_url : undefined;
      
      // Handle Image removal if preview was cleared and no new file selected
      if (!imagePreview && !imageFile && imageUrl) {
          await deleteProductImage(imageUrl);
          imageUrl = undefined;
      }

      if (imageFile && userId) {
        const newImageUrl = await uploadProductImage(imageFile, userId);
        if (editProductId && imageUrl && imageUrl !== newImageUrl) {
           await deleteProductImage(imageUrl);
        }
        imageUrl = newImageUrl;
      }

      const productPayload = {
        name,
        category,
        description: desc,
        price_positioning: price || undefined,
        image_url: imageUrl || "",
      };

      if (editProductId) {
        const updated = await updateProduct(editProductId, productPayload);
        
        let signedUrl = imageUrl ? imageUrls[editProductId] : "";
        if (imageFile && updated.image_url) {
           const url = await getProductImageUrl(updated.image_url);
           if (url) signedUrl = url;
        } else if (!updated.image_url) {
           signedUrl = "";
        }

        setProducts(products.map(p => p.id === editProductId ? updated : p));
        setImageUrls(prev => {
            const next = {...prev};
            if (signedUrl) next[updated.id] = signedUrl;
            else delete next[updated.id];
            return next;
        });
        setSuccessMsg("Product updated successfully!");
      } else {
        const created = await createProduct(productPayload);
        let signedUrl = "";
        if (created.image_url) {
           signedUrl = await getProductImageUrl(created.image_url) || "";
        }
        setProducts([...products, created]);
        if (signedUrl) {
           setImageUrls(prev => ({...prev, [created.id]: signedUrl}));
        }
        setSuccessMsg("Product created successfully!");
      }

      await refreshProducts();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditProductId(p.id);
    setName(p.name);
    setPrice(p.price_positioning || "");
    setDesc(p.description || "");
    setCategory(p.category || "");
    setImagePreview(p.image_url ? imageUrls[p.id] || null : null);
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const p = products.find(prod => prod.id === id);
      await deleteProduct(id);
      if (p?.image_url) {
        await deleteProductImage(p.image_url);
      }
      setProducts(products.filter(p => p.id !== id));
      setImageUrls(prev => {
        const next = {...prev};
        delete next[id];
        return next;
      });
      await refreshProducts();
      setSuccessMsg("Product deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete product");
    }
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#0B0907", padding: "40px 24px", color: "#F7F3ED" }}>Loading products...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B0907", padding: "40px 24px", color: "#F7F3ED" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", color: "#F7F3ED" }}>Products & Services Catalog</h1>
        <p style={{ color: "#B9AA99", fontSize: "14px", marginBottom: "32px" }}>
          Manage your key offerings and master product reference images.
        </p>

        {error && <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "12px", borderRadius: "8px", marginBottom: "16px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>{error}</div>}
        {successMsg && <div style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", padding: "12px", borderRadius: "8px", marginBottom: "16px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>{successMsg}</div>}

        <div style={{ background: "#21170F", border: "1px solid #3B2B1E", padding: "24px", borderRadius: "16px", marginBottom: "32px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#F7F3ED" }}>
            {editProductId ? "Edit Item" : "Add New Item"}
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#B9AA99", marginBottom: "8px" }}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#14100D", border: "1px solid #3B2B1E", color: "#F7F3ED", outline: "none", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#B9AA99", marginBottom: "8px" }}>Category *</label>
              <input value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#14100D", border: "1px solid #3B2B1E", color: "#F7F3ED", outline: "none", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#B9AA99", marginBottom: "8px" }}>Price Positioning (Optional)</label>
              <select value={price} onChange={e => setPrice(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#14100D", border: "1px solid #3B2B1E", color: "#F7F3ED", outline: "none", boxSizing: 'border-box', appearance: "none" }}>
                <option value="">Select Positioning...</option>
                <option value="budget">Budget</option>
                <option value="mid">Mid-Range</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#B9AA99", marginBottom: "8px" }}>Description *</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#14100D", border: "1px solid #3B2B1E", color: "#F7F3ED", outline: "none", minHeight: "80px", boxSizing: 'border-box' }} />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: "13px", color: "#B9AA99", marginBottom: "8px" }}>Master Product Image (Optional, max 10MB, JPG/PNG/WEBP)</label>
              {imagePreview ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", border: "1px solid #3B2B1E" }} />
                  <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                    <label style={{ padding: "8px 12px", background: "#2B1E14", color: "#F7F3ED", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: "1px solid #3B2B1E" }}>
                      Replace Image
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} style={{ display: "none" }} />
                    </label>
                    <button onClick={removeImage} style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>
                      Remove Image
                    </button>
                  </div>
                  {imageFile && <div style={{ fontSize: "12px", color: "#B9AA99", marginTop: "4px" }}>Filename: {imageFile.name}</div>}
                </div>
              ) : (
                <div>
                  <label style={{ display: "inline-block", padding: "12px", background: "#14100D", color: "#F7F3ED", border: "1px dashed #E8B66F", borderRadius: "8px", cursor: "pointer" }}>
                    Upload Image
                    <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} style={{ display: "none" }} />
                  </label>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button 
                onClick={handleSave} 
                disabled={!name.trim() || !category.trim() || !desc.trim() || isSubmitting} 
                style={{ flex: 1, padding: "12px", background: (name.trim() && category.trim() && desc.trim() && !isSubmitting) ? "#E8B66F" : "#2B1E14", color: (name.trim() && category.trim() && desc.trim() && !isSubmitting) ? "#0B0907" : "#B9AA99", border: "none", borderRadius: "8px", fontWeight: 700, cursor: (name.trim() && category.trim() && desc.trim() && !isSubmitting) ? "pointer" : "not-allowed" }}
              >
                {isSubmitting ? "Saving..." : (editProductId ? "Update Item" : "Save Item")}
              </button>
              {editProductId && (
                <button onClick={resetForm} style={{ padding: "12px", background: "transparent", color: "#B9AA99", border: "1px solid #3B2B1E", borderRadius: "8px", cursor: "pointer" }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", color: "#F7F3ED" }}>Your Catalog</h3>
        {products.length === 0 ? (
          <div style={{ background: "#14100D", border: "1px dashed #3B2B1E", padding: "32px", borderRadius: "12px", textAlign: "center", color: "#B9AA99" }}>
            No products in your catalog yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px", marginBottom: "32px" }}>
            {products.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: "16px", background: "#21170F", border: "1px solid #3B2B1E", padding: "16px", borderRadius: "12px" }}>
                {p.image_url && imageUrls[p.id] && (
                  <div style={{ width: "80px", height: "80px", flexShrink: 0, borderRadius: "8px", overflow: "hidden", border: "1px solid #3B2B1E" }}>
                    <img src={imageUrls[p.id]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "16px", color: "#F7F3ED" }}>{p.name}</div>
                  <div style={{ fontSize: "12px", color: "#E8B66F", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{p.category}</div>
                  {p.price_positioning && <div style={{ color: "#B9AA99", fontSize: "14px", marginTop: "4px" }}>{p.price_positioning}</div>}
                  {p.description && <div style={{ color: "#B9AA99", fontSize: "13px", marginTop: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>}
                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                    <button onClick={() => handleEdit(p)} style={{ background: "none", border: "none", color: "#E8B66F", fontSize: "13px", cursor: "pointer", padding: 0 }}>Edit</button>
                    <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "13px", cursor: "pointer", padding: 0 }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "16px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ flex: 1, padding: "16px", background: "#21170F", color: "#F7F3ED", border: "1px solid #3B2B1E", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}>
            Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
