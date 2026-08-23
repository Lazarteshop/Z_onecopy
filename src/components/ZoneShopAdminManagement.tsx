import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  DollarSign,
  AlertCircle,
  X,
  Copy,
  ChevronRight,
  Phone,
  Tag,
  Filter
} from 'lucide-react';
import { ShopProduct, ShopOrder, ShopOrderStatus } from '../types';

interface ZoneShopAdminManagementProps {
  token: string;
  triggerNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

export const ZoneShopAdminManagement: React.FC<ZoneShopAdminManagementProps> = ({
  token,
  triggerNotification
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [loading, setLoading] = useState<boolean>(true);

  // Products state
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);

  // Product Form state
  const [pName, setPName] = useState<string>('');
  const [pCategory, setPCategory] = useState<string>('Gadgets');
  const [pPrice, setPPrice] = useState<string>('');
  const [pOriginalPrice, setPOriginalPrice] = useState<string>('');
  const [pStock, setPStock] = useState<string>('50');
  const [pImage, setPImage] = useState<string>('');
  const [pDescription, setPDescription] = useState<string>('');
  const [pTags, setPTags] = useState<string>('Best Seller, Free Shipping');
  const [pIsActive, setPIsActive] = useState<boolean>(true);
  const [savingProduct, setSavingProduct] = useState<boolean>(false);

  // Orders state
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Advanced Status Modal
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<ShopOrder | null>(null);
  const [targetStatus, setTargetStatus] = useState<ShopOrderStatus>('for_packing');
  const [customNote, setCustomNote] = useState<string>('');
  const [trackingNumberInput, setTrackingNumberInput] = useState<string>('');
  const [courierNameInput, setCourierNameInput] = useState<string>('Z-one Express');
  const [riderNameInput, setRiderNameInput] = useState<string>('Kuya Elmer');
  const [riderPhoneInput, setRiderPhoneInput] = useState<string>('0918-555-1234');
  const [cancellationReasonInput, setCancellationReasonInput] = useState<string>('Out of stock / Logistics reroute');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: token };

      const [prodsRes, ordersRes] = await Promise.all([
        fetch('/api/shop/products', { headers }).then(r => r.json()),
        fetch('/api/admin/shop/orders', { headers }).then(r => r.json())
      ]);

      if (prodsRes.success) setProducts(prodsRes.products || []);
      if (ordersRes.success) {
        setOrders(ordersRes.orders || []);
        setOrderStats(ordersRes.stats || null);
      }
    } catch (err) {
      console.error('Failed to load shop admin data:', err);
      triggerNotification('Error sa pag-load ng shop data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Open Product Modal for Create
  const handleOpenNewProductModal = () => {
    setEditingProduct(null);
    setPName('');
    setPCategory('Gadgets');
    setPPrice('');
    setPOriginalPrice('');
    setPStock('50');
    setPImage('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60');
    setPDescription('');
    setPTags('Best Seller, Hot Deal');
    setPIsActive(true);
    setShowProductModal(true);
  };

  // Open Product Modal for Edit
  const handleOpenEditProductModal = (prod: ShopProduct) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPCategory(prod.category);
    setPPrice(String(prod.price));
    setPOriginalPrice(prod.originalPrice ? String(prod.originalPrice) : '');
    setPStock(String(prod.stock || 50));
    setPImage(prod.image);
    setPDescription(prod.description || '');
    setPTags(Array.isArray(prod.tags) ? prod.tags.join(', ') : 'Hot Deal');
    setPIsActive(prod.isActive !== false);
    setShowProductModal(true);
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pPrice || !pImage.trim()) {
      triggerNotification('Kailangan ang Pangalan, Presyo, at Image URL.', 'error');
      return;
    }

    try {
      setSavingProduct(true);
      const payload = {
        name: pName.trim(),
        category: pCategory,
        price: Number(pPrice),
        originalPrice: pOriginalPrice ? Number(pOriginalPrice) : undefined,
        stock: Number(pStock) || 50,
        image: pImage.trim(),
        description: pDescription.trim(),
        tags: pTags.split(',').map(t => t.trim()).filter(Boolean),
        isActive: pIsActive
      };

      let res;
      if (editingProduct) {
        res = await fetch(`/api/admin/shop/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/admin/shop/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Nabigong i-save ang produkto.');
      }

      triggerNotification(`🎉 ${data.message}`, 'success');
      setShowProductModal(false);
      fetchData();
    } catch (err: any) {
      triggerNotification(`Error: ${err.message}`, 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  // Toggle Product Active Status
  const handleToggleProductStatus = async (productId: string) => {
    try {
      const res = await fetch(`/api/admin/shop/products/${productId}/toggle-status`, {
        method: 'PATCH',
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Toggle failed');

      triggerNotification(`✓ ${data.message}`, 'success');
      fetchData();
    } catch (err: any) {
      triggerNotification(err.message, 'error');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Sigurado ka bang nais mong burahin ang "${productName}" sa Z-oneShop catalogue?`)) return;

    try {
      const res = await fetch(`/api/admin/shop/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: token }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');

      triggerNotification('🗑️ Nabura ang produkto.', 'info');
      fetchData();
    } catch (err: any) {
      triggerNotification(err.message, 'error');
    }
  };

  // Open Status Action Modal
  const handleOpenActionModal = (order: ShopOrder, newStatus: ShopOrderStatus) => {
    setSelectedOrderForAction(order);
    setTargetStatus(newStatus);
    setTrackingNumberInput(order.trackingNumber || `ZEX-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setCourierNameInput(order.courierName || 'Z-one Express');
    setRiderNameInput(order.riderName || 'Kuya Elmer');
    setRiderPhoneInput(order.riderPhone || '0918-555-1234');
    setCustomNote('');
    setCancellationReasonInput('Out of stock / Logistics reroute');
  };

  // Submit Order Status Update
  const handleSubmitStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForAction) return;

    try {
      setSubmittingAction(true);
      const res = await fetch('/api/admin/shop/order/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          orderId: selectedOrderForAction.id,
          newStatus: targetStatus,
          trackingNumber: trackingNumberInput,
          courierName: courierNameInput,
          riderName: riderNameInput,
          riderPhone: riderPhoneInput,
          customNote: customNote.trim() || undefined,
          cancellationReason: targetStatus === 'cancelled_by_seller' ? cancellationReasonInput : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Nabigong i-update ang order status.');
      }

      triggerNotification(`🎉 ${data.message}`, 'success');
      setSelectedOrderForAction(null);
      fetchData();
    } catch (err: any) {
      triggerNotification(`Error: ${err.message}`, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategoryFilter === 'all' || p.category.toLowerCase() === productCategoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.userName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(orderSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (orderStatusFilter === 'all') return true;
    if (orderStatusFilter === 'pending') return o.status === 'order_placed' || o.status === 'for_packing';
    if (orderStatusFilter === 'in_transit') return o.status === 'sorting_hub' || o.status === 'rider_pickup' || o.status === 'to_ship';
    if (orderStatusFilter === 'delivered') return o.status === 'shipped_success';
    if (orderStatusFilter === 'cancelled') return o.status.startsWith('cancelled');

    return o.status === orderStatusFilter;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER & METRICS */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-orange-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
              Admin Exclusive
            </span>
            <span className="text-slate-400 text-xs font-bold">Real-Time E-Commerce Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Z-oneShop Catalogue, Orders & Logistics Control Panel
          </h2>
          <p className="text-xs text-slate-300">
            Pamahalaan ang mga produkto, i-advance ang parcel tracking milestones, at i-manage ang customer fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="bg-white/10 hover:bg-white/20 text-white font-black text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={handleOpenNewProductModal}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* STATS METRICS GRID */}
      {orderStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Kabuuang Orders</span>
            <div className="text-xl font-black text-slate-900">{orderStats.totalOrders} orders</div>
            <p className="text-[10px] text-slate-500">Lahat ng transactions</p>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Shop Sales</span>
            <div className="text-xl font-black text-emerald-600">
              ₱{(orderStats.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-700 font-bold">Successful purchases</p>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">To Pack / In Transit</span>
            <div className="text-xl font-black text-orange-600">
              {(orderStats.pendingPackingCount || 0) + (orderStats.toShipCount || 0)} orders
            </div>
            <p className="text-[10px] text-orange-600 font-bold">Needs fulfillment</p>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Delivered Successfully</span>
            <div className="text-xl font-black text-indigo-600">{orderStats.deliveredCount || 0} parcels</div>
            <p className="text-[10px] text-indigo-600 font-bold">Signed by buyers</p>
          </div>
        </div>
      )}

      {/* SUB TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-2 pb-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-black rounded-t-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Customer Orders & Tracking ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-xs font-black rounded-t-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'products'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Product Catalogue Management ({products.length})</span>
        </button>
      </div>

      {/* ==================== TAB 1: ORDERS & TRACKING FULFILLMENT ==================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          
          {/* ORDERS SEARCH & FILTER BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search Order #, Buyer Name, Tracking..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'To Pack / New' },
                { id: 'in_transit', label: 'In Transit / To Ship' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'cancelled', label: 'Cancelled' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    orderStatusFilter === f.id ? 'bg-orange-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ORDERS TABLE / CARDS */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              Walang natagpuang order.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 hover:border-orange-300 transition"
                >
                  {/* ROW HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900">Order #{order.orderNumber}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-700">{order.userName}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {order.shippingAddress.city}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        order.status === 'shipped_success' ? 'bg-emerald-100 text-emerald-800' :
                        order.status.startsWith('cancelled') ? 'bg-rose-100 text-rose-800' :
                        order.status === 'to_ship' ? 'bg-orange-100 text-orange-800 animate-pulse' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      <span className="font-black text-slate-900">₱{order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* ORDER DETAILS & ITEMS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* ITEMS */}
                    <div className="space-y-1 md:col-span-1 border-r border-slate-100 pr-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Ordered Items</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <img src={it.image} alt={it.productName} className="w-7 h-7 rounded-md object-cover" />
                            <span className="text-[11px] font-semibold text-slate-800 truncate flex-1">{it.productName}</span>
                            <span className="text-[10px] font-bold text-slate-500">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PAYMENT & COURIER */}
                    <div className="space-y-1 text-[11px] md:col-span-1 border-r border-slate-100 pr-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Payment & Waybill</span>
                      <p className="font-bold text-slate-800">
                        Method: <span className="text-slate-600">{order.paymentMethod === 'wallet' ? 'Wallet Balance' : `GCash (Ref: ${order.gcashRefNo})`}</span>
                      </p>
                      <p className="font-bold text-slate-800">
                        Waybill: <span className="text-orange-600 font-black">{order.trackingNumber || 'None'}</span>
                      </p>
                      {order.riderName && (
                        <p className="text-slate-600">
                          Rider: {order.riderName} ({order.riderPhone})
                        </p>
                      )}
                    </div>

                    {/* ADMIN ACTION STEPPER BUTTONS */}
                    <div className="space-y-1.5 md:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Advance Tracking Milestone</span>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {order.status === 'order_placed' && (
                          <button
                            onClick={() => handleOpenActionModal(order, 'for_packing')}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            ➔ Set "For Packing"
                          </button>
                        )}

                        {order.status === 'for_packing' && (
                          <button
                            onClick={() => handleOpenActionModal(order, 'sorting_hub')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            ➔ Set "Sorting Hub"
                          </button>
                        )}

                        {order.status === 'sorting_hub' && (
                          <button
                            onClick={() => handleOpenActionModal(order, 'rider_pickup')}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            ➔ Set "Rider Pickup"
                          </button>
                        )}

                        {order.status === 'rider_pickup' && (
                          <button
                            onClick={() => handleOpenActionModal(order, 'to_ship')}
                            className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer animate-pulse"
                          >
                            ➔ Set "To Ship" (Out for Delivery)
                          </button>
                        )}

                        {order.status === 'to_ship' && (
                          <button
                            onClick={() => handleOpenActionModal(order, 'shipped_success')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
                          >
                            ✓ Mark "Shipped Successfully" (Delivered)
                          </button>
                        )}

                        {!order.status.startsWith('cancelled') && order.status !== 'shipped_success' && (
                          <button
                            onClick={() => handleOpenActionModal(order, 'cancelled_by_seller')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            ❌ Cancel Order (Seller)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: PRODUCTS CATALOGUE MANAGEMENT ==================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          
          {/* SEARCH & FILTERS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product title or category..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {['all', 'Gadgets', 'Fashion', 'Beauty', 'Home', 'Lifestyle'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setProductCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    productCategoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-slate-900 text-white font-black'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCTS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredProducts.map(product => {
              const isInactive = product.isActive === false;
              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border p-4 shadow-2xs flex flex-col justify-between gap-3 transition ${
                    isInactive ? 'border-dashed border-slate-300 opacity-60 bg-slate-50' : 'border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-100">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className="text-[9px] bg-slate-950/80 text-white font-black px-2 py-0.5 rounded-md uppercase">
                          {product.category}
                        </span>
                        {isInactive && (
                          <span className="text-[9px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-md uppercase">
                            Hidden / Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1">{product.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{product.description || 'Walang description.'}</p>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-orange-600">₱{product.price.toLocaleString()}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-slate-400 line-through">₱{product.originalPrice.toLocaleString()}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-600 font-bold">
                        Stock: {product.stock || 50}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleProductStatus(product.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                        isInactive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{isInactive ? 'I-Activate' : 'I-Tago'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditProductModal(product)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold p-1.5 rounded-lg transition cursor-pointer"
                        title="I-edit ang produkto"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold p-1.5 rounded-lg transition cursor-pointer"
                        title="Burahin ang produkto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== CREATE / EDIT PRODUCT MODAL ==================== */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black">
                {editingProduct ? 'I-edit ang Produkto' : 'Magdagdag ng Bagong Produkto sa Catalogue'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Name*</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g. Wireless Noise-Cancelling Earbuds"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category*</label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Gadgets">Gadgets</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Home">Home</option>
                    <option value="Lifestyle">Lifestyle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Stock Quantity*</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Price (₱)*</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    placeholder="e.g. 599"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Original Price (₱)</label>
                  <input
                    type="number"
                    min="1"
                    value={pOriginalPrice}
                    onChange={(e) => setPOriginalPrice(e.target.value)}
                    placeholder="e.g. 999 (for discount badge)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Image URL*</label>
                <input
                  type="url"
                  required
                  value={pImage}
                  onChange={(e) => setPImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  placeholder="Isalaysay ang mga features at benepisyo ng produkto..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={pTags}
                  onChange={(e) => setPTags(e.target.value)}
                  placeholder="e.g. Best Seller, Free Shipping, 50% Off"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pIsActiveCheck"
                  checked={pIsActive}
                  onChange={(e) => setPIsActive(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <label htmlFor="pIsActiveCheck" className="text-slate-800 font-bold cursor-pointer">
                  I-publish kaagad sa customer shop catalogue (Active)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black shadow-md shadow-orange-500/20"
                >
                  {savingProduct ? 'Sine-save...' : 'I-save ang Produkto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADVANCED STATUS MILESTONE MODAL ==================== */}
      {selectedOrderForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Update Order Milestone Tracking</h3>
                <p className="text-xs text-slate-400">Order #{selectedOrderForAction.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrderForAction(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStatusUpdate} className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-2xl">
                <p className="font-bold text-orange-900">
                  Target Status: <span className="uppercase font-black">{targetStatus.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Awtomatikong makakatanggap ng notification ang customer ({selectedOrderForAction.userName}) sa kanyang My Orders tracker.
                </p>
              </div>

              {targetStatus !== 'cancelled_by_seller' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Waybill / Tracking No.*</label>
                      <input
                        type="text"
                        required
                        value={trackingNumberInput}
                        onChange={(e) => setTrackingNumberInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Courier Name*</label>
                      <input
                        type="text"
                        required
                        value={courierNameInput}
                        onChange={(e) => setCourierNameInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Assigned Rider Name</label>
                      <input
                        type="text"
                        value={riderNameInput}
                        onChange={(e) => setRiderNameInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Rider Contact Phone</label>
                      <input
                        type="text"
                        value={riderPhoneInput}
                        onChange={(e) => setRiderPhoneInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Custom Timeline Note (Optional)</label>
                    <input
                      type="text"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="e.g. Parcel has passed through Bulacan sorting hub."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Dahilan ng Pagkansela (Cancellation Reason)*</label>
                  <textarea
                    rows={3}
                    required
                    value={cancellationReasonInput}
                    onChange={(e) => setCancellationReasonInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-rose-600 mt-1">
                    * Kapag kinansela, ibabalik ang stock at ia-auto refund ang pondo kung nagbayad gamit ang Wallet Balance.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForAction(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100"
                >
                  Bumalik
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black shadow-md shadow-orange-500/20"
                >
                  {submittingAction ? 'Ina-update...' : 'Kumpirmahin ang Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
