import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Trophy,
  ShoppingBag,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Share2,
  TrendingUp,
  Wallet,
  Tag,
  ArrowRight,
  ShieldCheck,
  Zap,
  Gift,
  RefreshCw,
  PlusCircle,
  CreditCard,
  Percent,
  Timer,
  ChevronRight,
  AlertTriangle,
  Crown,
  ExternalLink,
  Flame,
  ShoppingCart,
  Truck,
  Search
} from 'lucide-react';
import { 
  UserSession, 
  UserVAStats, 
  VALeaderboardEntry, 
  VALeaderboardWinner, 
  ShopProduct, 
  ShopBasket, 
  VABanner,
  ShopBasketItem,
  ShopCartItem,
  ShopOrder
} from '../types';
import { ZoneShopCart } from './ZoneShopCart';
import { ZoneShopCheckoutModal } from './ZoneShopCheckoutModal';
import { ZoneShopOrders } from './ZoneShopOrders';
import { ZoneShopOrderTrackingModal } from './ZoneShopOrderTrackingModal';

interface ZoneShopVAHubProps {
  token: string;
  user: UserSession;
  onRefreshProfile: () => void;
  triggerNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  language: 'tl' | 'en';
}

export const ZoneShopVAHub: React.FC<ZoneShopVAHubProps> = ({
  token,
  user,
  onRefreshProfile,
  triggerNotification,
  language
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'hiring' | 'banners' | 'shop' | 'cart' | 'orders' | 'leaderboard'>('hiring');
  
  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [vaStatus, setVaStatus] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<VALeaderboardEntry[]>([]);
  const [winner, setWinner] = useState<VALeaderboardWinner | null>(null);
  const [unpaidBaskets, setUnpaidBaskets] = useState<ShopBasket[]>([]);
  const [myBanners, setMyBanners] = useState<VABanner[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [cartItems, setCartItems] = useState<ShopCartItem[]>([]);
  const [customerActiveBanner, setCustomerActiveBanner] = useState<VABanner | null>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [shopSearch, setShopSearch] = useState<string>('');
  const [shopCategory, setShopCategory] = useState<string>('All');

  // Modals & Action States
  const [showPlaceBannerModal, setShowPlaceBannerModal] = useState<boolean>(false);
  const [selectedBasketForBanner, setSelectedBasketForBanner] = useState<ShopBasket | null>(null);
  const [bannerTypeChoice, setBannerTypeChoice] = useState<'free' | 'paid'>('free');
  const [bannerTitle, setBannerTitle] = useState<string>('');
  const [bannerMessage, setBannerMessage] = useState<string>('');
  const [bannerPromoCode, setBannerPromoCode] = useState<string>('ZONESPECIAL10');
  const [bannerDiscount, setBannerDiscount] = useState<number>(10);
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [placingBanner, setPlacingBanner] = useState<boolean>(false);

  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutSelectedItems, setCheckoutSelectedItems] = useState<ShopCartItem[]>([]);
  const [checkoutSubtotal, setCheckoutSubtotal] = useState<number>(0);
  const [checkoutShipping, setCheckoutShipping] = useState<number>(0);
  const [checkoutDiscount, setCheckoutDiscount] = useState<number>(0);
  const [checkoutVoucherCode, setCheckoutVoucherCode] = useState<string>('');
  const [checkoutEstimatedTotal, setCheckoutEstimatedTotal] = useState<number>(0);

  // Tracking Modal State
  const [trackingModalOrder, setTrackingModalOrder] = useState<ShopOrder | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState<boolean>(false);

  // Subscribe modal
  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [subMethod, setSubMethod] = useState<'balance' | 'gcash'>('balance');
  const [gcashSenderNumber, setGcashSenderNumber] = useState<string>('');
  const [gcashRefNo, setGcashRefNo] = useState<string>('');
  const [subscribing, setSubscribing] = useState<boolean>(false);

  // VM Transfer
  const [transferringVM, setTransferringVM] = useState<boolean>(false);
  const [vmTransferAmount, setVmTransferAmount] = useState<string>('');

  // Quick Hire Applicant Simulator
  const [showHireModal, setShowHireModal] = useState<boolean>(false);
  const [applicantName, setApplicantName] = useState<string>('');
  const [applicantEmail, setApplicantEmail] = useState<string>('');
  const [hiringProcessing, setHiringProcessing] = useState<boolean>(false);

  // Bounty Claim
  const [claimingBounty, setClaimingBounty] = useState<boolean>(false);

  // Copy feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [statusRes, leadRes, basketsRes, bannersRes, prodsRes, cartRes, ordersRes] = await Promise.all([
        fetch('/api/va/status', { headers }).then(r => r.json()),
        fetch('/api/va/leaderboard', { headers }).then(r => r.json()),
        fetch('/api/shop/unpaid-baskets', { headers }).then(r => r.json()),
        fetch('/api/va/my-banners', { headers }).then(r => r.json()),
        fetch('/api/shop/products').then(r => r.json()),
        fetch('/api/shop/cart', { headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/shop/orders', { headers }).then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (statusRes.success) setVaStatus(statusRes);
      if (leadRes.success) {
        setLeaderboard(leadRes.leaderboard || []);
        setWinner(leadRes.winner || null);
      }
      if (basketsRes.success) setUnpaidBaskets(basketsRes.baskets || []);
      if (bannersRes.success) setMyBanners(bannersRes.banners || []);
      if (prodsRes.success) setProducts(prodsRes.products || []);
      if (cartRes?.success) {
        const rawCart = Array.isArray(cartRes.cart) ? cartRes.cart : (cartRes.cart?.items || []);
        setCartItems(rawCart);
        if (cartRes.activeBanner) {
          setCustomerActiveBanner(cartRes.activeBanner);
        } else {
          setCustomerActiveBanner(null);
        }
      }
      if (ordersRes?.success) setOrders(ordersRes.orders || []);
    } catch (err) {
      console.error('Failed to load VA & Shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersOnly = async () => {
    try {
      setOrdersLoading(true);
      const res = await fetch('/api/shop/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (activeSubTab === 'orders') {
      fetchOrdersOnly();
    } else if (activeSubTab === 'banners') {
      fetchData();
    }
  }, [activeSubTab]);

  // Copy Referral/Hiring link
  const handleCopyHiringLink = () => {
    const hiringUrl = `${window.location.origin}/?ref=${user.referralCode}&mode=va`;
    navigator.clipboard.writeText(hiringUrl);
    setCopiedLink(true);
    triggerNotification('Na-kopyang Link', 'Nai-copy sa clipboard ang iyong VA Referral & Hiring Link!', 'success');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Recruit / Hire VA
  const handleHireApplicant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim()) {
      triggerNotification('Kailangan ang Pangalan', 'Ilagay ang buong pangalan ng VA applicant.', 'warning');
      return;
    }

    try {
      setHiringProcessing(true);
      const res = await fetch('/api/va/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          referralCode: user.referralCode,
          candidateName: applicantName.trim(),
          candidateEmail: applicantEmail.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Nabigong i-hire ang applicant.');
      }

      triggerNotification('🎉 Tagumpay na Na-hire!', data.message, 'success');
      setShowHireModal(false);
      setApplicantName('');
      setApplicantEmail('');
      fetchData();
      onRefreshProfile();
    } catch (err: any) {
      triggerNotification('Error sa Pag-hire', err.message, 'error');
    } finally {
      setHiringProcessing(false);
    }
  };

  // Claim ₱3,000 Bounty
  const handleClaimBounty = async () => {
    try {
      setClaimingBounty(true);
      const res = await fetch('/api/va/claim-500-reward', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Hindi ma-claim ang reward.');
      }

      triggerNotification('🏆 ₱3,000 Grand Bounty Claimed!', data.message, 'success');
      fetchData();
      onRefreshProfile();
    } catch (err: any) {
      triggerNotification('Claim Error', err.message, 'error');
    } finally {
      setClaimingBounty(false);
    }
  };

  // Subscribe to Paid Plan (₱100/mo)
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubscribing(true);
      const res = await fetch('/api/va/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          paymentMethod: subMethod,
          gcashSenderNumber: subMethod === 'gcash' ? gcashSenderNumber : undefined,
          gcashRefNo: subMethod === 'gcash' ? gcashRefNo : undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Subscription failed.');
      }

      triggerNotification('💎 Subscription Update', data.message, 'success');
      setShowSubModal(false);
      fetchData();
      onRefreshProfile();
    } catch (err: any) {
      triggerNotification('Subscription Error', err.message, 'error');
    } finally {
      setSubscribing(false);
    }
  };

  // Place Marketing Banner
  const handlePlaceBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBasketForBanner) return;

    try {
      setPlacingBanner(true);
      const res = await fetch('/api/va/place-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetBasketId: selectedBasketForBanner.id,
          bannerType: bannerTypeChoice,
          title: bannerTitle.trim(),
          message: bannerMessage.trim(),
          promoCode: bannerPromoCode.trim() || undefined,
          discountPercent: bannerDiscount || 10,
          imageUrl: bannerImageUrl.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Nabigong ilagay ang banner.');
      }

      triggerNotification('🚀 Banner Active!', data.message, 'success');
      setShowPlaceBannerModal(false);
      setSelectedBasketForBanner(null);
      setBannerTitle('');
      setBannerMessage('');
      fetchData();
    } catch (err: any) {
      triggerNotification('Banner Error', err.message, 'error');
    } finally {
      setPlacingBanner(false);
    }
  };

  // Transfer Virtual Money to Wallet Balance
  const handleConvertVM = async () => {
    const currentVM = vaStatus?.vaStats?.virtualMoneyBalance || 0;
    if (currentVM < 600) {
      triggerNotification('Kulang ang VM', 'Kailangan ng minimum ₱600 Virtual Money bago makapag-transfer.', 'warning');
      return;
    }

    try {
      setTransferringVM(true);
      const amount = vmTransferAmount ? Number(vmTransferAmount) : currentVM;
      const res = await fetch('/api/va/convert-vm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Conversion failed.');
      }

      triggerNotification('💸 Virtual Money Transferred!', data.message, 'success');
      setVmTransferAmount('');
      fetchData();
      onRefreshProfile();
    } catch (err: any) {
      triggerNotification('Transfer Error', err.message, 'error');
    } finally {
      setTransferringVM(false);
    }
  };

  // Simulate Order Payment or Expiration
  const handleSimulateBasketAction = async (basketId: string, action: 'customer_pay_deliver' | 'force_expire') => {
    try {
      const res = await fetch('/api/shop/simulate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ basketId, action })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed.');
      }

      if (action === 'customer_pay_deliver') {
        triggerNotification('🛍️ Order Paid & Delivered!', `Nabayaran ang order! ${data.earnedCommission > 0 ? `Kumita si ${data.vaName} ng ₱${data.earnedCommission.toFixed(2)} Virtual Money!` : ''}`, 'success');
      } else {
        triggerNotification('⚠️ Expired Lead', 'Na-marka bilang Bad Order / Expired Lead.', 'info');
      }

      fetchData();
      onRefreshProfile();
    } catch (err: any) {
      triggerNotification('Action Error', err.message, 'error');
    }
  };

  // Add product to cart (API)
  const handleAddToCart = async (product: ShopProduct) => {
    try {
      const res = await fetch('/api/shop/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, quantity: 1 })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add item.');
      }
      const rawCart = Array.isArray(data.cart) ? data.cart : (data.cart?.items || []);
      setCartItems(rawCart);
      triggerNotification('🛒 Naidagdag sa Cart!', `Naidagdag ang "${product.name}" sa iyong shopping basket.`, 'success');
    } catch (err: any) {
      triggerNotification('Cart Error', err.message, 'error');
    }
  };

  // Update Cart Quantity
  const handleUpdateCartQuantity = async (productId: string, quantity: number) => {
    try {
      const res = await fetch('/api/shop/cart/update-quantity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
      const rawCart = Array.isArray(data.cart) ? data.cart : (data.cart?.items || []);
      setCartItems(rawCart);
    } catch (err: any) {
      triggerNotification('Cart Error', err.message, 'error');
    }
  };

  // Remove Item from Cart
  const handleRemoveCartItem = async (productId: string) => {
    try {
      const res = await fetch(`/api/shop/cart/item/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Remove failed');
      const rawCart = Array.isArray(data.cart) ? data.cart : (data.cart?.items || []);
      setCartItems(rawCart);
      triggerNotification('Item Removed', 'Inalis ang item sa iyong cart.', 'info');
    } catch (err: any) {
      triggerNotification('Cart Error', err.message, 'error');
    }
  };

  // Clear Cart
  const handleClearCart = async () => {
    try {
      const res = await fetch('/api/shop/cart/clear', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Clear failed');
      setCartItems([]);
      triggerNotification('Cart Cleared', 'Na-clear ang lahat ng items sa iyong cart.', 'info');
    } catch (err: any) {
      triggerNotification('Cart Error', err.message, 'error');
    }
  };

  // Toggle Cart Item Checkbox
  const handleToggleCartItem = async (productId: string, selected: boolean) => {
    try {
      const res = await fetch('/api/shop/cart/toggle-select', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, selected })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Toggle failed');
      const rawCart = Array.isArray(data.cart) ? data.cart : (data.cart?.items || []);
      setCartItems(rawCart);
    } catch (err: any) {
      triggerNotification('Cart Error', err.message, 'error');
    }
  };

  // Select All Cart Checkbox
  const handleSelectAllCart = async (selected: boolean) => {
    try {
      const res = await fetch('/api/shop/cart/select-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selected })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Select all failed');
      const rawCart = Array.isArray(data.cart) ? data.cart : (data.cart?.items || []);
      setCartItems(rawCart);
    } catch (err: any) {
      triggerNotification('Cart Error', err.message, 'error');
    }
  };

  // Proceed To Checkout Trigger
  const handleProceedToCheckout = (selectedItems: ShopCartItem[], autoPromoCode?: string) => {
    setCheckoutSelectedItems(selectedItems);
    if (autoPromoCode) {
      setCheckoutVoucherCode(autoPromoCode);
    }
    setIsCheckoutModalOpen(true);
  };

  // Order Placed Success Callback
  const handleOrderPlacedSuccess = (newOrder: ShopOrder) => {
    setIsCheckoutModalOpen(false);
    triggerNotification('🎉 Order Placed Successfully!', `Order #${newOrder.orderNumber} ay natanggap na at ipinoproseso na sa warehouse!`, 'success');
    fetchData();
    onRefreshProfile();
    setActiveSubTab('orders');
    setTrackingModalOrder(newOrder);
    setIsTrackingModalOpen(true);
  };

  // Cancel Order
  const handleCancelOrder = async (orderId: string, reason: string) => {
    try {
      const res = await fetch(`/api/shop/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Cancel failed');
      triggerNotification('Order Cancelled', data.message, 'info');
      fetchData();
      onRefreshProfile();
    } catch (err: any) {
      triggerNotification('Cancellation Error', err.message, 'error');
    }
  };

  // Buy Again / Reorder
  const handleBuyAgain = async (order: ShopOrder) => {
    try {
      for (const item of order.items) {
        await fetch('/api/shop/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: item.productId, quantity: item.quantity })
        });
      }
      triggerNotification('🛒 Items Added!', 'Nailagay muli sa iyong cart ang mga items!', 'success');
      fetchData();
      setActiveSubTab('cart');
    } catch (err: any) {
      triggerNotification('Reorder Error', err.message, 'error');
    }
  };

  // Submit cart as an unpaid basket in Z-oneShop (for VA Marketing demo)
  const handleCreateBasketFromCart = async () => {
    if (cartItems.length === 0) return;
    try {
      const items = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        productName: item.productName,
        price: item.price
      }));

      const res = await fetch('/api/shop/create-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create basket.');
      }

      triggerNotification('🛒 Basket Created!', data.message, 'success');
      setActiveSubTab('banners');
      fetchData();
    } catch (err: any) {
      triggerNotification('Cart Error', err.message, 'error');
    }
  };

  const hiredCount = vaStatus?.vaStats?.hiredCount || 0;
  const progressPercent = Math.min(100, Math.round((hiredCount / 500) * 100));
  const isPaidSubActive = vaStatus?.vaStats?.vaSubscription?.status === 'active';
  const vmBalance = vaStatus?.vaStats?.virtualMoneyBalance || 0;

  return (
    <div id="va-hiring-shop-hub" className="space-y-6 animate-fadeIn">
      
      {/* 🚀 HEADER HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600 text-white text-[10px] sm:text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Briefcase className="w-3.5 h-3.5 text-yellow-300" />
                <span>Z-ONESHOP AUTOMATED VA HIRING SYSTEM</span>
              </span>
              <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3 text-yellow-400" />
                <span>₱3,000 1ST PRIZE BOUNTY</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Mag-Hire ng 500 Virtual Assistants & Kumita sa Z-oneShop Marketing!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Gamitin ang iyong unique hiring link. Ang unang user na makaabot ng 500 hired VAs bago ang 
              <span className="text-yellow-300 font-black"> Nov 15, 2026</span> ay mananalo ng <span className="text-emerald-400 font-black">₱3,000 Cash Reward</span>! Bawat VA ay maaaring mag-place ng marketing banners sa unpaid shopping baskets para sa 2.5% - 5.0% commission.
            </p>
          </div>

          {/* QUICK STATS CARDS */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
            <div className="bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl p-4 min-w-[140px] flex-1 sm:flex-none backdrop-blur-md transition">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">Hired VAs</span>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-baseline gap-1">
                <span>{hiredCount}</span>
                <span className="text-xs text-slate-300 font-bold">/ 500</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 to-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl p-4 min-w-[140px] flex-1 sm:flex-none backdrop-blur-md transition">
              <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">Virtual Money (VM)</span>
              <div className="text-2xl sm:text-3xl font-black text-yellow-300 mt-1">
                ₱{vmBalance.toFixed(2)}
              </div>
              <span className="text-[9px] text-emerald-300 font-bold block mt-1">
                {vmBalance >= 600 ? '✅ Handa nang i-transfer' : 'Minimum ₱600 transfer'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🧭 SUB-NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'hiring', label: 'VA Recruitment & 500 Goal', icon: Users, badge: `${hiredCount}/500` },
          { id: 'banners', label: 'VA Marketing Banners & Commissions', icon: Tag, badge: `${myBanners.length}` },
          { id: 'shop', label: 'Z-oneShop Catalogue', icon: ShoppingBag, badge: `${products.length}` },
          { id: 'cart', label: 'Shopping Cart', icon: ShoppingCart, badge: cartItems.reduce((acc, i) => acc + i.quantity, 0) > 0 ? `${cartItems.reduce((acc, i) => acc + i.quantity, 0)}` : undefined },
          { id: 'orders', label: 'My Orders & Real-Time Tracking', icon: Truck, badge: orders.length > 0 ? `${orders.length}` : undefined },
          { id: 'leaderboard', label: 'Live 500 Bounty Leaderboard', icon: Trophy, badge: winner ? 'Claimed' : 'Live' }
        ].map((tab) => {
          const IconComp = tab.icon;
          const isSelected = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isSelected ? 'bg-white/20 text-white' : tab.id === 'cart' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. VA RECRUITMENT & 500 GOAL TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'hiring' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* 🎯 0-100% REAL-TIME PROGRESS BAR & BOUNTY CARD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
                  <h2 className="text-lg font-black text-slate-900">
                    Real-Time Progress Bar Patungong 500 Hired VAs
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Target: 500 Matagumpay na Na-hire na Virtual Assistants | Deadline: <span className="font-bold text-slate-800">November 15, 2026</span>
                </p>
              </div>

              {/* CLAIM BUTTON OR WINNER NOTICE */}
              {winner ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-amber-600 shrink-0 animate-pulse" />
                  <div className="text-left">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 block">₱3,000 Bounty Winner</span>
                    <span className="text-xs font-extrabold text-amber-950">{winner.userName} ({winner.hiredCount} VAs)</span>
                  </div>
                </div>
              ) : hiredCount >= 500 ? (
                <button
                  onClick={handleClaimBounty}
                  disabled={claimingBounty}
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black text-xs px-6 py-3 rounded-2xl shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 animate-pulse"
                >
                  <Gift className="w-4 h-4 text-slate-950" />
                  <span>I-CLAIM ANG ₱3,000 REWARD NGAYON! 🏆</span>
                </button>
              ) : (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-blue-600" />
                  <span>Kailangan pa ng {500 - hiredCount} VAs para ma-claim</span>
                </div>
              )}
            </div>

            {/* GIANT PROGRESS BAR */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-blue-600">{progressPercent}% Nakumpleto</span>
                <span className="text-slate-700">{hiredCount} / 500 Hired Assistants</span>
              </div>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl h-6 p-1 relative overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full rounded-xl transition-all duration-700 relative flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                >
                  <span className="text-[10px] font-black text-white drop-shadow-sm">
                    {progressPercent}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                <span>0 Hires (Simula)</span>
                <span>250 Hires (Halfway)</span>
                <span>500 Hires (₱3,000 Grand Reward 🏆)</span>
              </div>
            </div>
          </div>

          {/* 🔗 RECRUITMENT LINK & SHARE TOOLKIT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* LINK BOX (2 COLUMNS) */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Share2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Iyong Opisyal na Virtual Assistant Hiring Link & Code
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Ibahagi sa iyong mga kaibigan, kakilala, o team upang mag-apply at ma-hire bilang iyong Virtual Assistant.
                  </p>
                </div>
              </div>

              {/* CODE & URL BOX */}
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5 truncate">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Iyong VA Hiring Link</span>
                    <span className="text-xs font-mono font-bold text-slate-800 truncate block">
                      {window.location.origin}/?ref={user.referralCode}&mode=va
                    </span>
                  </div>
                  <button
                    onClick={handleCopyHiringLink}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      copiedLink ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    }`}
                  >
                    {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Nai-copy!' : 'I-copy Link'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-0.5">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block">Employer Code</span>
                    <span className="text-base font-mono font-black text-indigo-900">{user.referralCode}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-0.5">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">Anti-Fraud Protection</span>
                    <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Device & IP Verified</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTON TO SIMULATE / ADD APPLICANT */}
              <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 justify-between items-center">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Maaari ka ring mag-recruit ng applicant gamit ang pop-up form:
                </span>
                <button
                  onClick={() => setShowHireModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Mag-hire ng Applicant Ngayon</span>
                </button>
              </div>
            </div>

            {/* RULES CARD (1 COLUMN) */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-md space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block">
                  Alituntunin ng ₱3,000 Bounty
                </span>
                <h4 className="font-extrabold text-sm text-white">Paano Manalo ng ₱3,000?</h4>
                <ul className="space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>I-share ang link at mag-hire ng hanggang 500 VAs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Unang makakaabot bago mag-Nov 15, 2026 ang siyang kikilalaning Champion.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Bawal ang fake / bot accounts (awtomatikong nade-detect ng anti-fraud system).</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-white/10 rounded-2xl text-[11px] text-blue-200 font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-300 shrink-0" />
                <span>Deadline: Nov 15, 2026, 11:59 PM</span>
              </div>
            </div>

          </div>

          {/* 👥 LIST OF HIRED VAs */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Listahan ng Iyong mga Na-hire na Virtual Assistants ({hiredCount})
                </h3>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>I-refresh</span>
              </button>
            </div>

            {vaStatus?.vaStats?.hiredVAs && vaStatus.vaStats.hiredVAs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vaStatus.vaStats.hiredVAs.map((va: any, idx: number) => (
                  <div 
                    key={va.id || idx}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-2xs">
                        {va.avatar || '👩‍💼'}
                      </span>
                      <div className="truncate">
                        <h4 className="font-extrabold text-xs text-slate-900 truncate">{va.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Na-hire: {new Date(va.hiredAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                      Aktibo ✅
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-extrabold text-slate-700 text-sm">Wala ka pang na-hire na Virtual Assistant.</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                  I-share ang iyong referral link sa itaas o mag-recruit gamit ang form upang magsimulang mag-ipon patungong 500 hires!
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VA MARKETING BANNERS & COMMISSIONS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'banners' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* WALLET & COMMISSION INFO BAR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* VM WALLET CARD */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Virtual Money (VM) Wallet</span>
                <Wallet className="w-5 h-5 text-yellow-300 animate-pulse" />
              </div>
              <div>
                <span className="text-3xl font-black text-yellow-300 font-mono">₱{vmBalance.toFixed(2)}</span>
                <p className="text-[11px] text-slate-300 font-medium mt-1">
                  Komisyon mula sa nabayarang mga shopping basket.
                </p>
              </div>
              <div className="border-t border-indigo-800/60 pt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Min. Transfer: ₱600.00</span>
                <button
                  onClick={handleConvertVM}
                  disabled={transferringVM || vmBalance < 600}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  {transferringVM ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>I-transfer sa Wallet</span>
                </button>
              </div>
            </div>

            {/* FREE PLAN CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    Free Banner Plan
                  </span>
                  <span className="text-xs font-black text-slate-900">Lifetime Libre</span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">3 Days Visibility • 2.5% Commission</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Walang bayad! Maaari kang mag-place ng marketing banner sa mga unpaid baskets na may 3 araw na visibility at 2.5% Virtual Money commission kapag nabayaran.
                </p>
              </div>
              <span className="text-[11px] font-black text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Palaging Aktibo para sa Lahat</span>
              </span>
            </div>

            {/* PAID PLAN CARD */}
            <div className={`border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3 ${
              isPaidSubActive ? 'bg-amber-50/50 border-amber-300' : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-600" />
                    <span>VIP Paid Plan</span>
                  </span>
                  <span className="text-xs font-black text-indigo-700">₱100 / Buwan</span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">7 Days Visibility • 5.0% Commission</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Palakihin ang tsansa ng benta! 7 araw na mananatili ang iyong promotional banner sa cart ng mamimili kasama ang dobleng komisyon na 5.0%!
                </p>
              </div>
              {isPaidSubActive ? (
                <div className="text-[11px] font-black text-amber-700 flex items-center justify-between">
                  <span>✅ Aktibo ang VIP Access</span>
                  <span className="text-[10px] text-slate-500">Exp: {new Date(vaStatus.vaStats.vaSubscription.expiresAt).toLocaleDateString()}</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubModal(true)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs py-2 rounded-xl transition cursor-pointer shadow-sm text-center"
                >
                  Mag-subscribe sa Paid Plan (₱100/mo)
                </button>
              )}
            </div>

          </div>

          {/* 🛒 UNPAID SHOPPING BASKETS AVAILABLE TO TARGET */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Mga Unpaid Shopping Baskets sa Z-oneShop ({unpaidBaskets.length} Active Leads)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Ito ang mga customer na may naiwang mga items sa kanilang cart. Mag-place ng promotional banner na may discount code upang mahikayat silang mag-checkout!
                </p>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-slate-500 hover:text-blue-600 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>I-refresh ang Baskets</span>
              </button>
            </div>

            {unpaidBaskets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpaidBaskets.map((basket) => {
                  const hasMyBanner = (basket as any).isMyBanner;
                  const hasActiveBanner = (basket as any).hasActiveBanner;
                  const activeBannerInfo = (basket as any).activeBanner;

                  return (
                    <div 
                      key={basket.id}
                      className="border border-slate-200 rounded-2xl p-4.5 hover:border-blue-400 hover:shadow-md transition space-y-3.5 flex flex-col justify-between bg-slate-50/40"
                    >
                      <div className="space-y-2.5">
                        {/* Customer Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-sm shadow-2xs">
                              {basket.userAvatar || '🛍️'}
                            </span>
                            <div>
                              <h4 className="font-black text-xs text-slate-900 leading-tight">{basket.userName}</h4>
                              <span className="text-[10px] text-slate-400 font-semibold block">
                                Cart id: {basket.id.substring(0, 12)}...
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                            ₱{basket.totalAmount.toFixed(2)}
                          </span>
                        </div>

                        {/* Items Preview */}
                        <div className="space-y-1.5 bg-white border border-slate-100 rounded-xl p-2.5 text-xs">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Mga Items sa Basket:</span>
                          {basket.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700 font-semibold">
                              <span className="truncate max-w-[170px]">• {it.productName}</span>
                              <span className="text-slate-500 shrink-0">x{it.quantity}</span>
                            </div>
                          ))}
                          {basket.items.length > 2 && (
                            <span className="text-[10px] text-blue-600 font-bold block">
                              +{basket.items.length - 2} pang ibang produkto
                            </span>
                          )}
                        </div>

                        {/* Banner status info */}
                        {hasActiveBanner && (
                          <div className="p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-[11px] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-900 flex items-center gap-1">
                                <Tag className="w-3 h-3 text-indigo-600" />
                                <span>Banner ni: {activeBannerInfo?.vaName || 'Virtual Assistant'}</span>
                              </span>
                              <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                                {activeBannerInfo?.bannerType === 'paid' ? '7-Day Paid (5%)' : '3-Day Free (2.5%)'}
                              </span>
                            </div>
                            <p className="text-[10px] text-indigo-800 italic truncate font-medium">
                              "{activeBannerInfo?.title} - {activeBannerInfo?.message}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        {!hasActiveBanner ? (
                          <button
                            onClick={() => {
                              setSelectedBasketForBanner(basket);
                              setBannerTitle(`Special ₱${(basket.totalAmount * 0.1).toFixed(0)} Voucher for You!`);
                              setBannerMessage('Kumpletuhin ang iyong order ngayon upang makuha ang special promotion at libreng delivery!');
                              setShowPlaceBannerModal(true);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Mag-place ng Marketing Banner</span>
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-center text-slate-500 font-semibold">
                              {hasMyBanner ? '✅ Aktibo ang iyong banner dito!' : '⚠️ May banner na mula sa ibang VA.'}
                            </div>
                            {/* SIMULATION CONTROLS FOR TESTING */}
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSimulateBasketAction(basket.id, 'customer_pay_deliver')}
                                title="Simulate customer paying and order being delivered"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Bayaran at I-deliver (Earn)</span>
                              </button>
                              <button
                                onClick={() => handleSimulateBasketAction(basket.id, 'force_expire')}
                                title="Simulate expiration into Bad Order"
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-[10px] px-2 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                Expire Lead
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-extrabold text-slate-700 text-sm">Walang bagong unpaid basket ngayon.</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                  Magtungo sa "Z-oneShop Catalogue" tab sa itaas at mag-add ng items sa cart para makagawa ng bagong unpaid lead!
                </p>
              </div>
            )}
          </div>

          {/* 📋 MY PLACED MARKETING BANNERS */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Iyong mga Nailagay na Banners at Katayuan ({myBanners.length})
                </h3>
              </div>
            </div>

            {myBanners.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {myBanners.map((banner) => {
                  const isSuccess = banner.status === 'success_paid';
                  const isExpired = banner.status === 'bad_order_expired';
                  const isActive = banner.status === 'active';

                  return (
                    <div key={banner.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            banner.bannerType === 'paid' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {banner.bannerType === 'paid' ? '7-Day Paid (5%)' : '3-Day Free (2.5%)'}
                          </span>
                          <h4 className="font-extrabold text-xs text-slate-900">{banner.title}</h4>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Customer: <span className="font-bold text-slate-800">{banner.targetCustomerName}</span> | Cart Amount: <span className="font-bold text-emerald-700">₱{banner.targetOrderAmount?.toFixed(2)}</span>
                        </p>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          Nailagay noong: {new Date(banner.createdAt).toLocaleString('fil-PH', { hour12: true })}
                        </span>
                      </div>

                      {/* Status and Commission */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                        {isActive && (
                          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin-slow" />
                            <span>Aktibo (Naka-abang)</span>
                          </span>
                        )}
                        {isSuccess && (
                          <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 animate-fadeIn">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Nabayaran & Delivered ✅</span>
                          </span>
                        )}
                        {isExpired && (
                          <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Bad Order / Expired Lead</span>
                          </span>
                        )}

                        <div className="text-xs font-mono font-black">
                          {isSuccess ? (
                            <span className="text-emerald-600">+₱{banner.earnedCommission?.toFixed(2)} VM</span>
                          ) : (
                            <span className="text-slate-500">Potensyal: ₱{banner.potentialCommission?.toFixed(2)} VM</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-1">
                <Tag className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-extrabold text-slate-700 text-xs">Wala ka pang nailagay na banner.</h4>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Z-ONESHOP CATALOGUE TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'shop' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* ACTIVE VA PROMOTIONAL BANNER ANNOUNCEMENT */}
          {customerActiveBanner && customerActiveBanner.status === 'active' && (
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-4 sm:p-5 text-slate-950 shadow-xl border border-amber-300 animate-fadeIn flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/90 text-slate-950 font-black text-xl flex items-center justify-center shadow-md shrink-0">
                  {customerActiveBanner.vaAvatar || '🎁'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-950 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {customerActiveBanner.bannerType === 'paid' ? '⭐ 7-Day VIP Promo' : '🎯 Special Deal'}
                    </span>
                    <span className="text-xs font-black text-slate-950">
                      Mula kay Virtual Assistant {customerActiveBanner.vaName}
                    </span>
                  </div>
                  <h4 className="font-black text-sm sm:text-base text-slate-950 mt-0.5">
                    {customerActiveBanner.title} (-{customerActiveBanner.discountPercent || 10}% Discount)
                  </h4>
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                    "{customerActiveBanner.message}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => {
                    handleProceedToCheckout(cartItems, customerActiveBanner.promoCode);
                  }}
                  disabled={cartItems.length === 0}
                  className="flex-1 sm:flex-none bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  <span>I-checkout gamit ang Promo</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('cart')}
                  className="bg-white/90 hover:bg-white text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Tingnan sa Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* TOP CART BAR BANNER */}
          {cartItems.length > 0 && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center text-white shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>Mayroon kang {cartItems.reduce((a, b) => a + b.quantity, 0)} items sa Cart</span>
                    <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      ₱{cartItems.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}
                    </span>
                  </h4>
                  <p className="text-xs text-blue-100 font-medium">
                    Maaari mo itong i-checkout nang direkta gamit ang COD, Wallet, o GCash, o i-convert bilang Unpaid Basket para sa VA Marketing!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveSubTab('cart')}
                  className="flex-1 sm:flex-none bg-white hover:bg-slate-100 text-blue-900 font-black text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Tingnan ang Cart ({cartItems.reduce((a, b) => a + b.quantity, 0)})</span>
                </button>
                <button
                  onClick={handleCreateBasketFromCart}
                  title="Gumawa ng Unpaid Basket para sa VA Marketing Banners"
                  className="bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-1"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>VA Lead</span>
                </button>
              </div>
            </div>
          )}

          {/* PRODUCT CATALOGUE */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                  <span>Z-oneShop Official Product Catalogue</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Lahat ng items ay 100% authentic, may mabilisang 2-3 days nationwide delivery, at supportado ang Cash on Delivery (COD).
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('cart')}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 self-start sm:self-auto"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>My Shopping Cart ({cartItems.reduce((a, b) => a + b.quantity, 0)})</span>
              </button>
            </div>

            {/* SEARCH AND CATEGORY FILTERS */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Maghanap ng produkto, brand, o gamit..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 border border-slate-200 rounded-2xl outline-none text-xs font-semibold text-slate-900 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {['All', 'Electronics', 'Wearables', 'Audio', 'Home & Living', 'Health & Wellness', 'Travel & Outdoor', 'Fashion Accessories', 'Food & Pantry'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setShopCategory(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      shopCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'All' ? 'Lahat ng Kategorya' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* PRODUCT GRID */}
            {(() => {
              const filtered = products.filter(p => {
                const matchesSearch = !shopSearch || 
                  p.name.toLowerCase().includes(shopSearch.toLowerCase()) || 
                  p.description.toLowerCase().includes(shopSearch.toLowerCase()) ||
                  p.category.toLowerCase().includes(shopSearch.toLowerCase());
                const matchesCat = shopCategory === 'All' || p.category.toLowerCase() === shopCategory.toLowerCase();
                return matchesSearch && matchesCat;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 space-y-2">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="font-extrabold text-slate-700 text-sm">Walang nahanap na produkto</h4>
                    <p className="text-xs text-slate-400 font-medium">Subukang baguhin ang iyong search keywords o category filter.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((prod) => {
                    const inCartCount = cartItems.find(i => i.productId === prod.id)?.quantity || 0;
                    return (
                      <div 
                        key={prod.id}
                        className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition duration-200 flex flex-col justify-between bg-white group hover:border-blue-200"
                      >
                        <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                          <img 
                            src={prod.image} 
                            alt={prod.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md">
                            {prod.category}
                          </span>
                          <span className="absolute top-2 right-2 bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                            ★ {prod.rating}
                          </span>
                          {inCartCount > 0 && (
                            <span className="absolute bottom-2 right-2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                              {inCartCount} sa Cart
                            </span>
                          )}
                        </div>

                        <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug">{prod.name}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 font-medium leading-relaxed">{prod.description}</p>
                          </div>

                          <div className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="flex items-baseline justify-between">
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-black text-indigo-700 font-mono">₱{prod.price.toFixed(2)}</span>
                                {prod.originalPrice && (
                                  <span className="text-xs text-slate-400 line-through font-mono">₱{prod.originalPrice.toFixed(2)}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold">{prod.stock} stocks</span>
                            </div>

                            <button
                              onClick={() => handleAddToCart(prod)}
                              className="w-full bg-slate-900 hover:bg-blue-600 active:scale-95 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>{inCartCount > 0 ? `Magdagdag Pa (+1) [${inCartCount}]` : 'Ilagay sa Cart (Add to Cart)'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SHOPPING CART TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'cart' && (
        <ZoneShopCart
          cart={cartItems}
          loading={loading}
          activeBanner={customerActiveBanner}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onToggleSelect={handleToggleCartItem}
          onSelectAll={handleSelectAllCart}
          onClearCart={handleClearCart}
          onProceedToCheckout={handleProceedToCheckout}
          onExploreProducts={() => setActiveSubTab('shop')}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. MY ORDERS & REAL-TIME TRACKING TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'orders' && (
        <ZoneShopOrders
          orders={orders}
          loading={ordersLoading}
          onRefreshOrders={fetchOrdersOnly}
          onCancelOrder={handleCancelOrder}
          onBuyAgain={handleBuyAgain}
          onTrackOrderModal={(ord) => {
            setTrackingModalOrder(ord);
            setIsTrackingModalOpen(true);
          }}
          triggerNotification={triggerNotification}
          onBrowseShop={() => setActiveSubTab('shop')}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. LIVE 500 BOUNTY LEADERBOARD TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Live Leaderboard: ₱3,000 Grand Hiring Bounty
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Unang makakaabot ng 500 Hired VAs bago mag-Nov 15, 2026 ang siyang tatanghaling panalo!
                  </p>
                </div>
              </div>

              {winner && (
                <span className="bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Panalo: {winner.userName}</span>
                </span>
              )}
            </div>

            {/* LEADERBOARD TABLE */}
            <div className="divide-y divide-slate-100">
              {leaderboard.map((item, index) => {
                const isWinnerRank = winner && winner.userId === item.userId;
                return (
                  <div 
                    key={item.userId} 
                    className={`py-3.5 px-3 rounded-2xl flex items-center justify-between gap-4 transition ${
                      item.isCurrentUser ? 'bg-blue-50/70 border border-blue-200/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-8 w-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                        item.rank === 1 ? 'bg-amber-400 text-slate-950 shadow-xs' :
                        item.rank === 2 ? 'bg-slate-200 text-slate-800' :
                        item.rank === 3 ? 'bg-amber-600/20 text-amber-900' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                      </span>

                      <span className="h-9 w-9 bg-white border border-slate-200 rounded-full flex items-center justify-center text-sm shadow-2xs">
                        {item.avatar || '👤'}
                      </span>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-xs text-slate-900">{item.name}</h4>
                          {item.isCurrentUser && (
                            <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">IKAW</span>
                          )}
                          {isWinnerRank && (
                            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">CHAMPION 🏆</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {item.hiredCount} / 500 VAs ({item.progressPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress visual */}
                    <div className="w-28 sm:w-44 flex items-center gap-2">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 font-mono shrink-0">
                        {item.hiredCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 MODAL 1: PLACE MARKETING BANNER FORM */}
      {/* ========================================================================= */}
      {showPlaceBannerModal && selectedBasketForBanner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Mag-place ng Marketing Banner sa Basket
                </h3>
              </div>
              <button
                onClick={() => setShowPlaceBannerModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-slate-500 block">Target Customer Basket:</span>
              <div className="flex justify-between items-center font-extrabold text-slate-900">
                <span>{selectedBasketForBanner.userName}</span>
                <span className="text-emerald-700 font-mono">₱{selectedBasketForBanner.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handlePlaceBannerSubmit} className="space-y-4 text-xs">
              {/* Plan Choice */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Pumili ng Banner Plan Duration:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBannerTypeChoice('free')}
                    className={`p-3 rounded-xl border font-black text-left cursor-pointer transition ${
                      bannerTypeChoice === 'free' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="block text-[11px]">Free Plan</span>
                    <span className="block text-[9px] text-slate-500 font-normal">3 Days Visibility • 2.5% Comm (₱{(selectedBasketForBanner.totalAmount * 0.025).toFixed(2)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isPaidSubActive) {
                        triggerNotification('Kailangan ng Subscription', 'Mag-subscribe muna sa ₱100/mo VIP Plan para sa 7-Day 5% Banners.', 'warning');
                        setShowSubModal(true);
                        return;
                      }
                      setBannerTypeChoice('paid');
                    }}
                    className={`p-3 rounded-xl border font-black text-left cursor-pointer transition ${
                      bannerTypeChoice === 'paid' ? 'border-amber-500 bg-amber-50 text-amber-950' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="block text-[11px]">VIP Paid Plan (5%)</span>
                    <span className="block text-[9px] text-slate-500 font-normal">7 Days Visibility • 5.0% Comm (₱{(selectedBasketForBanner.totalAmount * 0.05).toFixed(2)})</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Banner Headline / Pamagat:</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="Hal. Special Discount Voucher for You!"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                />
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Panghikayat na Mensahe (Marketing Pitch):</label>
                <textarea
                  required
                  rows={3}
                  value={bannerMessage}
                  onChange={(e) => setBannerMessage(e.target.value)}
                  placeholder="Hal. Bayaran ang iyong cart ngayon upang makuha ang special discount at mabilisang libreng delivery!"
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-medium text-slate-900 resize-none"
                />
              </div>

              {/* Promo Code & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Voucher / Coupon Code:</label>
                  <input
                    type="text"
                    value={bannerPromoCode}
                    onChange={(e) => setBannerPromoCode(e.target.value)}
                    placeholder="Hal. ZONEOFF10"
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono font-bold uppercase text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discount Percentage (%):</label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={bannerDiscount}
                    onChange={(e) => setBannerDiscount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlaceBannerModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  disabled={placingBanner}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {placingBanner ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                  <span>I-publish ang Banner 🚀</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 MODAL 2: SUBSCRIBE TO PAID PLAN (₱100/MO) */}
      {/* ========================================================================= */}
      {showSubModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Mag-subscribe sa VIP VA Paid Plan (₱100/mo)
                </h3>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-medium">
                I-unlock ang 7 Days Visibility at 5.0% Virtual Money Commission sa lahat ng shopping baskets na iyong ila-lockan ng banners!
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-950 font-extrabold">
                <span>Halaga ng Subscription:</span>
                <span className="font-mono text-base">₱100.00 / Buwan</span>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Paraan ng Pagbabayad:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubMethod('balance')}
                    className={`p-3 rounded-xl border font-black text-left cursor-pointer transition ${
                      subMethod === 'balance' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="block text-[11px]">Wallet Balance</span>
                    <span className="block text-[9px] text-slate-500 font-normal">Kasalukuyan: ₱{(user.stats?.balance || 0).toFixed(2)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubMethod('gcash')}
                    className={`p-3 rounded-xl border font-black text-left cursor-pointer transition ${
                      subMethod === 'gcash' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="block text-[11px]">GCash Direct</span>
                    <span className="block text-[9px] text-slate-500 font-normal">Ipadala sa Admin QR/No.</span>
                  </button>
                </div>
              </div>

              {subMethod === 'gcash' && (
                <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="text-[11px] text-slate-700 font-semibold space-y-0.5">
                    <span className="block font-bold">Admin GCash Account:</span>
                    <span className="font-mono font-black text-indigo-700 block">0917-123-4567 (Z-one Admin)</span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Iyong GCash Mobile Number:</label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. 09181234567"
                      value={gcashSenderNumber}
                      onChange={(e) => setGcashSenderNumber(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">GCash Reference Number (Ref No.):</label>
                    <input
                      type="text"
                      required
                      placeholder="Hal. REF123456789"
                      value={gcashRefNo}
                      onChange={(e) => setGcashRefNo(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-mono font-bold uppercase text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  disabled={subscribing}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {subscribing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                  <span>Kumpirmahin (₱100)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 MODAL 3: QUICK RECRUIT / HIRE VA FORM */}
      {/* ========================================================================= */}
      {showHireModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Mag-hire ng Bagong Virtual Assistant
                </h3>
              </div>
              <button
                onClick={() => setShowHireModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleHireApplicant} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Buong Pangalan ng VA Applicant:</label>
                <input
                  type="text"
                  required
                  placeholder="Hal. Angelica Dela Vega"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Address (Opsyonal):</label>
                <input
                  type="email"
                  placeholder="Hal. angelica@example.com"
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-medium text-slate-900"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 font-medium">
                💡 Awtomatikong mabe-verify ang device at IP upang maiwasan ang duplicate entries. Dagdag +1 ito sa iyong 500 hiring goal!
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowHireModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  disabled={hiringProcessing}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  {hiringProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                  <span>Kumpirmahin ang Pag-hire</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 MODAL 4: Z-ONESHOP CHECKOUT MODAL */}
      {/* ========================================================================= */}
      <ZoneShopCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        token={token}
        user={user}
        selectedCartItems={checkoutSelectedItems}
        initialPromoCode={checkoutVoucherCode}
        suggestedPromoBanner={customerActiveBanner}
        onOrderPlacedSuccess={handleOrderPlacedSuccess}
        triggerNotification={triggerNotification}
        onRefreshProfile={onRefreshProfile}
      />

      {/* ========================================================================= */}
      {/* 🚀 MODAL 5: REAL-TIME ORDER TRACKING MODAL */}
      {/* ========================================================================= */}
      <ZoneShopOrderTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        order={trackingModalOrder}
        token={token}
        onRefreshOrders={fetchOrdersOnly}
        triggerNotification={triggerNotification}
      />

    </div>
  );
};
