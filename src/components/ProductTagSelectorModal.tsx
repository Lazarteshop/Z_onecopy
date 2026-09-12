import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  X,
  Check,
  Tag,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { SocialProductRef } from '../types';

interface ProductTagSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: SocialProductRef) => void;
  selectedProductId?: string;
  language?: 'tl' | 'en';
}

export const ProductTagSelectorModal: React.FC<ProductTagSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  selectedProductId,
  language = 'tl'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<SocialProductRef[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async (q = '') => {
    setIsLoading(true);
    try {
      // Fetch products from shop or search API
      const url = q.trim() 
        ? `/api/search?q=${encodeURIComponent(q.trim())}&type=products`
        : `/api/search?q=shop&type=products`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.results && Array.isArray(data.results.products)) {
        setProducts(data.results.products);
      } else if (res.ok && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to fetch shop products for tagging:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(searchQuery);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {language === 'tl' ? 'I-tag ang Z-oneShop Produkto' : 'Tag a Z-oneShop Product'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'tl'
                  ? 'Ikonekta ang produkto sa iyong Post o Reel para kumita sa benta'
                  : 'Link a product to your Post or Reel to earn commissions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="p-3 border-b border-slate-800 bg-slate-950/50 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'tl' ? 'Maghanap ng produkto sa Z-oneShop...' : 'Search shop products...'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            {language === 'tl' ? 'Hanapin' : 'Search'}
          </button>
        </form>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>{language === 'tl' ? 'Kinukuha ang mga produkto...' : 'Loading products...'}</span>
            </div>
          ) : products.length > 0 ? (
            products.map((prod) => {
              const isSelected = selectedProductId === prod.id;
              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    onSelectProduct(prod);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0"
                    />
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-black truncate">{prod.name}</div>
                      <div className="text-xs font-black text-emerald-400 mt-0.5">
                        ₱{prod.price.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-400/30">
                        <Check className="w-3.5 h-3.5" />
                        <span>Nakapili</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition">
                        I-tag Ito
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-44 text-center text-xs text-slate-400 space-y-2">
              <ShoppingBag className="w-8 h-8 text-slate-600" />
              <p>{language === 'tl' ? 'Walang nahanap na produkto sa Z-oneShop.' : 'No products found in Z-oneShop.'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>{products.length} {language === 'tl' ? 'produktong available' : 'products available'}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
          >
            {language === 'tl' ? 'Isara' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
