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

  function handleAdd() {
    if (!name.trim()) return;
    const newProduct = {
      id: Date.now().toString(),
      name, price, description: desc, category, isPrimary,
      image: '' // Local upload handled later or via URL
    };
    setProducts([...products, newProduct]);
    setName(''); setPrice(''); setDesc(''); setCategory(''); setIsPrimary(false);
    setShowForm(false);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-space-grotesk text-2xl font-bold text-white">Flagship Products</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="text-[#39ff14] text-sm font-semibold hover:underline">
              + Add Product
            </button>
          )}
        </div>
        <p className="text-[#3a5a3a] mb-6">Add a few key products to help the AI generate specific creatives.</p>

        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {products.map((p, i) => (
              <ProductCard 
                key={i} 
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
          <div className="bg-[#0d160d] border border-[#1a2a1a] rounded-xl p-5 mb-6">
            <h4 className="text-white font-semibold mb-4">New Product</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#3a5a3a] mb-1 uppercase tracking-wider">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#39ff14] outline-none" />
              </div>
              <div>
                <label className="block text-xs text-[#3a5a3a] mb-1 uppercase tracking-wider">Price</label>
                <input value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#39ff14] outline-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-[#3a5a3a] mb-1 uppercase tracking-wider">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#39ff14] outline-none min-h-[60px]" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-1/2">
                <label className="block text-xs text-[#3a5a3a] mb-1 uppercase tracking-wider">Category</label>
                <input value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#080f08] border border-[#1a2a1a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#39ff14] outline-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="accent-[#39ff14]" />
                <span className="text-sm text-white">Flagship Product</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              {products.length > 0 && (
                <button onClick={() => setShowForm(false)} className="text-[#3a5a3a] text-sm hover:text-white">Cancel</button>
              )}
              <button onClick={handleAdd} className="bg-[#1a2a1a] text-[#39ff14] font-bold px-4 py-2 rounded-lg hover:bg-[#2a4a2a]">
                Save Product
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button onClick={() => setStep(4)} className="w-1/3 bg-[#0d160d] border border-[#1a2a1a] text-white py-4 rounded-xl hover:bg-[#1a2a1a] transition-all font-semibold">
            Back
          </button>
          <button onClick={() => setStep(6)} className="w-2/3 bg-[#39ff14] text-black font-bold py-4 rounded-xl hover:opacity-90 transition-all cursor-pointer">
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
