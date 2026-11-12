import { useState } from 'react';
import { useOnboardingStore } from '../../lib/store';
import ProductCard from './ProductCard';
import BrandCompletionCard from './BrandCompletionCard';
import { motion } from 'framer-motion';

export default function ProductsEditor() {
  const { products, setProducts, setStep } = useOnboardingStore();
  
  const [showForm, setShowForm] = useState(products.length === 0);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg"];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ["jpg", "jpeg", "png", "webp"];

    if (!validMimes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      setImageError("Only JPG, JPEG, PNG, and WEBP images are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image size must be less than 10MB.");
      return;
    }

    setImageError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  function handleAdd() {
    if (!name.trim()) return;
    const newProduct = {
      id: Date.now().toString(),
      name, price, description: desc, category, isPrimary,
      image: imagePreview || '',
      imageFile: imageFile || null
    };
    setProducts([...products, newProduct]);
    setName(''); setPrice(''); setDesc(''); setCategory(''); setIsPrimary(false);
    setImageFile(null); setImagePreview(null); setImageError(null);
    setShowForm(false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-space-grotesk text-2xl font-bold text-white">Flagship Products</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="text-[#E8B66F] text-sm font-semibold hover:underline">
              + Add Product
            </button>
          )}
        </div>
        <p className="text-[#B9AA99] mb-6">Add a few key products to help the AI generate specific creatives.</p>

        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {products.map((p, i) => (
              <ProductCard 
                key={i} 
                image={p.image || p.imageUrl}
                name={p.name} 
                price={p.price} 
                description={p.description} 
                category={p.category} 
                isPrimary={p.isPrimary} 
              />
            ))}
          </div>
        )}

        {showForm && (
          <div className="bg-[#21170F] border border-[#3B2B1E] rounded-xl p-5 mb-6">
            <h4 className="text-white font-semibold mb-4">New Product</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#B9AA99] mb-1 uppercase tracking-wider">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#14100D] border border-[#3B2B1E] rounded-lg px-3 py-2 text-sm text-white focus:border-[#E8B66F] outline-none" />
              </div>
              <div>
                <label className="block text-xs text-[#B9AA99] mb-1 uppercase tracking-wider">Price</label>
                <input value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-[#14100D] border border-[#3B2B1E] rounded-lg px-3 py-2 text-sm text-white focus:border-[#E8B66F] outline-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-[#B9AA99] mb-1 uppercase tracking-wider">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-[#14100D] border border-[#3B2B1E] rounded-lg px-3 py-2 text-sm text-white focus:border-[#E8B66F] outline-none min-h-[60px]" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-1/2">
                <label className="block text-xs text-[#B9AA99] mb-1 uppercase tracking-wider">Category</label>
                <input value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#14100D] border border-[#3B2B1E] rounded-lg px-3 py-2 text-sm text-white focus:border-[#E8B66F] outline-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="accent-[#E8B66F]" />
                <span className="text-sm text-white">Flagship Product</span>
              </label>
            </div>

            {/* Product Image Upload */}
            <div className="mb-4">
              <label className="block text-xs text-[#B9AA99] mb-1 uppercase tracking-wider">Product Image (Optional, max 10MB, JPG/PNG/WEBP)</label>
              {imageError && (
                <div className="text-red-400 text-xs mb-2">{imageError}</div>
              )}
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Product Preview" className="w-32 h-32 object-cover rounded-lg border border-[#3B2B1E]" />
                  <div className="mt-2 flex gap-2">
                    <label className="px-3 py-1.5 bg-[#2B1E14] text-white rounded text-xs cursor-pointer border border-[#3B2B1E] hover:bg-[#3B2B1E]">
                      Replace
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30 hover:bg-red-500/30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#3B2B1E] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-[#14100D] hover:border-[#E8B66F]/50 transition-colors">
                  <span className="text-xl mb-1">📸</span>
                  <span className="text-xs text-white font-medium">Click to upload product image</span>
                  <span className="text-[10px] text-[#B9AA99] mt-0.5">JPG, PNG, or WEBP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3">
              {products.length > 0 && (
                <button onClick={() => setShowForm(false)} className="text-[#B9AA99] text-sm hover:text-white">Cancel</button>
              )}
              <button onClick={handleAdd} className="bg-[#3B2B1E] text-[#E8B66F] font-bold px-4 py-2 rounded-lg hover:bg-[#6F452C]">
                Save Product
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button onClick={() => setStep(4)} className="w-1/3 bg-[#21170F] border border-[#3B2B1E] text-white py-4 rounded-xl hover:bg-[#2B1E14] transition-all font-semibold">
            Back
          </button>
          <button onClick={() => setStep(6)} className="w-2/3 bg-[#E8B66F] text-[#0B0907] font-bold py-4 rounded-xl hover:bg-[#F3CB8D] transition-all cursor-pointer">
            Continue to Audience
          </button>
        </div>
      </div>
      
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <BrandCompletionCard />
        </div>
      </div>
    </motion.div>
  );
}
