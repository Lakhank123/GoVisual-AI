-- =========================================================================
-- Phase 1 Architecture Extensions (Migration 003)
-- Module 3.1: Product Intelligence & Catalog
-- Adds image storage capabilities and category to brand_products
-- =========================================================================

-- 1. Safely add missing columns to brand_products
ALTER TABLE brand_products
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS category VARCHAR(255);

-- 2. Create 'product-images' storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  false, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. Apply Path-Based Tenancy Storage Policies
-- We first drop them in case they exist to allow idempotency
DROP POLICY IF EXISTS "Business access to insert product images" ON storage.objects;
DROP POLICY IF EXISTS "Business access to select product images" ON storage.objects;
DROP POLICY IF EXISTS "Business access to update product images" ON storage.objects;
DROP POLICY IF EXISTS "Business access to delete product images" ON storage.objects;

CREATE POLICY "Business access to insert product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Business access to select product images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-images' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Business access to update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Business access to delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
