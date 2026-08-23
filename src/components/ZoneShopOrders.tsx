import React, { useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Copy,
  Phone,
  RotateCcw,
  MapPin,
  Calendar,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { ShopOrder, ShopOrderStatus } from '../types';

interface ZoneShopOrdersProps {
  orders: ShopOrder[];
  loading: boolean;
  onRefreshOrders: () => void;
  onCancelOrder: (orderId: string, reason: string) => void;
  onBuyAgain: (order: ShopOrder) => void;
  onTrackOrderModal: (order: ShopOrder) => void;
  triggerNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onBrowseShop: () => void;
}

export const ZoneShopOrders: React.FC<ZoneShopOrdersProps> = ({
  orders,
  loading,
  onRefreshOrders,
  onCancelOrder,
  onBuyAgain,
  onTrackOrderModal,
  triggerNotification,
  onBrowseShop
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'order_placed' | 'for_packing' | 'to_ship' | 'shipped_success' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Nagbago ang isip / Change of mind');

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(it => it.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'order_placed') return order.status === 'order_placed';
    if (selectedFilter === 'for_packing') return order.status === 'for_packing';
    if (selectedFilter === 'to_ship') return order.status === 'sorting_hub' || order.status === 'rider_pickup' || order.status === 'to_ship';
    if (selectedFilter === 'shipped_success') return order.status === 'shipped_success';
    if (selectedFilter === 'cancelled') return order.status === 'cancelled_by_seller' || order.status === 'cancelled_by_buyer';

    return true;
  });

  const getStatusBadge = (status: ShopOrderStatus) => {
    switch (status) {
      case 'order_placed':
        return {
          label: 'Order Placed & Paid',
          color: 'bg-blue-50 border border-blue-200 text-blue-700',
          icon: Clock
        };
      case 'for_packing':
        return {
          label: 'For Packing (Warehouse)',
          color: 'bg-amber-50 border border-amber-200 text-amber-700',
          icon: Package
        };
      case 'sorting_hub':
        return {
          label: 'Sorting Hub (In Transit)',
          color: 'bg-indigo-50 border border-indigo-200 text-indigo-700',
          icon: Truck
        };
      case 'rider_pickup':
        return {
          label: 'Picked Up by Rider',
          color: 'bg-purple-50 border border-purple-200 text-purple-700',
          icon: Truck
        };
      case 'to_ship':
        return {
          label: 'Out for Delivery (To Ship)',
          color: 'bg-orange-50 border border-orange-300 text-orange-800 font-black animate-pulse',
          icon: Truck
        };
      case 'shipped_success':
        return {
          label: 'Shipped Successfully 🎉',
          color: 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-black',
          icon: CheckCircle2
        };
      case 'cancelled_by_seller':
        return {
          label: 'Cancelled by Seller ❌',
          color: 'bg-rose-50 border border-rose-200 text-rose-700 font-bold',
          icon: XCircle
        };
      case 'cancelled_by_buyer':
        return {
          label: 'Cancelled by You',
          color: 'bg-slate-100 border border-slate-300 text-slate-600 font-bold',
          icon: XCircle
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-700',
          icon: Package
        };
    }
  };

  const getStepProgressIndex = (status: ShopOrderStatus): number => {
    switch (status) {
      case 'order_placed': return 0;
      case 'for_packing': return 1;
      case 'sorting_hub': return 2;
      case 'rider_pickup': return 3;
      case 'to_ship': return 4;
      case 'shipped_success': return 5;
      default: return -1;
    }
  };

  const trackingSteps = [
    { title: 'Order Placed', desc: 'Payment verified' },
    { title: 'For Packing', desc: 'Warehouse packing' },
    { title: 'Sorting Hub', desc: 'In transit to hub' },
    { title: 'Picked Up by Rider', desc: 'Assigned courier' },
    { title: 'To Ship', desc: 'Out for delivery' },
    { title: 'Shipped Successfully', desc: 'Delivered' }
  ];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerNotification('Copied!', `Nai-copy ang ${label}: ${text}`, 'success');
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* FILTER STATUS TABS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'Lahat ng Orders', count: orders.length },
          { id: 'order_placed', label: 'To Pack / Paid', count: orders.filter(o => o.status === 'order_placed').length },
          { id: 'for_packing', label: 'For Packing', count: orders.filter(o => o.status === 'for_packing').length },
          { id: 'to_ship', label: 'To Ship / In Transit', count: orders.filter(o => ['sorting_hub', 'rider_pickup', 'to_ship'].includes(o.status)).length },
          { id: 'shipped_success', label: 'Shipped (Delivered)', count: orders.filter(o => o.status === 'shipped_success').length },
          { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status.startsWith('cancelled')).length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedFilter === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedFilter === tab.id ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Maghanap gamit ang Order Number, Tracking No., o Pangalan ng Item..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-orange-500 shadow-xs"
          />
        </div>
        <button
          onClick={onRefreshOrders}
          title="Refresh orders"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-2.5 rounded-2xl transition cursor-pointer shadow-xs shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
        </button>
      </div>

      {/* ORDERS LIST */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl mx-auto flex items-center justify-center text-2xl">
            📦
          </div>
          <h3 className="text-base font-black text-slate-900">Walang natagpuang order</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? 'Walang tumutugma sa iyong search query.' : 'Wala ka pang inilalagay na order sa kategoryang ito.'}
          </p>
          <button
            onClick={onBrowseShop}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-5 py-2.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Pumunta sa Z-oneShop Catalogue</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const badge = getStatusBadge(order.status);
            const currentStepIdx = getStepProgressIndex(order.status);
            const isCancelled = order.status.startsWith('cancelled');
            const canCancel = order.status === 'order_placed';

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:border-orange-200 transition space-y-4 p-4 sm:p-5"
              >
                {/* ORDER HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                      <span>Order</span>
                      <span className="text-orange-600">#{order.orderNumber}</span>
                    </span>
                    <button
                      onClick={() => handleCopy(order.orderNumber, 'Order Number')}
                      className="text-slate-400 hover:text-slate-700 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium">
                      • {new Date(order.createdAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* STATUS BADGE */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 ${badge.color}`}>
                      <badge.icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{badge.label}</span>
                    </span>
                  </div>
                </div>

                {/* VISUAL REAL-TIME ORDER TRACKING STEPPER */}
                {!isCancelled && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
                    <div className="flex items-center justify-between mb-3 text-[11px] font-black text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-orange-600" />
                        <span>Real-Time Logistics Status</span>
                      </span>
                      {order.trackingNumber && (
                        <button
                          onClick={() => handleCopy(order.trackingNumber!, 'Tracking Number')}
                          className="text-orange-600 hover:underline flex items-center gap-1 text-[10px]"
                        >
                          <span>Track: {order.trackingNumber}</span>
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* STEPPER BAR */}
                    <div className="relative">
                      <div className="hidden sm:block absolute top-4 left-4 right-4 h-1 bg-slate-200 rounded-full z-0">
                        <div
                          className="bg-gradient-to-r from-blue-500 via-orange-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, (currentStepIdx / 5) * 100)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 relative z-10">
                        {trackingSteps.map((step, idx) => {
                          const isDone = currentStepIdx >= idx;
                          const isCurrent = currentStepIdx === idx;
                          return (
                            <div
                              key={idx}
                              className={`flex sm:flex-col items-center sm:text-center gap-2 sm:gap-1 p-2 rounded-xl transition ${
                                isCurrent
                                  ? 'bg-orange-100/70 border border-orange-300'
                                  : isDone
                                  ? 'bg-white/80 border border-slate-200'
                                  : 'opacity-40'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                                  isDone
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-slate-300 text-slate-700'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-900 leading-tight truncate">
                                  {step.title}
                                </p>
                                <p className="text-[9px] text-slate-500 font-medium leading-tight">
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COURIER & RIDER CALLOUT */}
                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="font-bold">Courier:</span>
                        <span className="font-black text-slate-900">{order.courierName || 'Z-one Express'}</span>
                        {order.riderName && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-bold">Rider:</span>
                            <span className="font-black text-slate-900">{order.riderName}</span>
                          </>
                        )}
                      </div>

                      {order.riderPhone && (
                        <a
                          href={`tel:${order.riderPhone}`}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Tawagan si Rider</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* CANCELLED NOTICE */}
                {isCancelled && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-black">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Order Cancelled</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Dahilan: <span className="font-semibold text-rose-900">{order.cancellationReason || 'Kinansela ng pamunuan'}</span>
                    </p>
                    {order.paymentMethod === 'wallet' && (
                      <p className="text-[10px] text-emerald-700 font-bold">
                        ✓ Nai-balik na sa iyong Z-oneApp wallet balance ang halagang ₱{order.totalAmount.toFixed(2)}.
                      </p>
                    )}
                  </div>
                )}

                {/* ITEMS PREVIEW */}
                <div className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-black text-slate-900 truncate">{item.productName}</h5>
                          <p className="text-[11px] text-slate-500">
                            ₱{item.price.toLocaleString()} × {item.quantity} pc{item.quantity > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900">
                          ₱{(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FOOTER TOTAL & ACTIONS */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold">Bayad Gamit:</span>
                      <span className="font-black text-slate-900 uppercase">
                        {order.paymentMethod === 'wallet' ? '💳 Wallet Balance' : `📱 GCash (Ref #${order.gcashRefNo || 'Verified'})`}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Pahatiran: <span className="text-slate-800 font-medium">{order.shippingAddress.streetAddress}, {order.shippingAddress.city}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block">Order Total:</span>
                      <span className="text-base font-black text-orange-600">
                        ₱{order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {canCancel && (
                        <button
                          onClick={() => setCancellingOrderId(order.id)}
                          className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                        >
                          Ikansela
                        </button>
                      )}

                      <button
                        onClick={() => onTrackOrderModal(order)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <MapPin className="w-3.5 h-3.5 text-orange-400" />
                        <span>Track Details</span>
                      </button>

                      {(order.status === 'shipped_success' || isCancelled) && (
                        <button
                          onClick={() => onBuyAgain(order)}
                          className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Buy Again</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* CANCEL PROMPT DIALOG */}
                {cancellingOrderId === order.id && (
                  <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 space-y-3 animate-fadeIn text-xs">
                    <div className="flex items-center gap-2 text-rose-800 font-black">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Sigurado ka bang nais mong ikansela ang order #{order.orderNumber}?</span>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Dahilan ng pagkansela:</label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none"
                      >
                        <option value="Nagbago ang isip / Change of mind">Nagbago ang isip / Change of mind</option>
                        <option value="Maling item o dami ang napili">Maling item o dami ang napili</option>
                        <option value="Gusto palitan ang delivery address">Gusto palitan ang delivery address</option>
                        <option value="Bibiyahe / Walang tatanggap sa bahay">Bibiyahe / Walang tatanggap sa bahay</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setCancellingOrderId(null)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition"
                      >
                        Bumalik
                      </button>
                      <button
                        onClick={() => {
                          onCancelOrder(order.id, cancelReason);
                          setCancellingOrderId(null);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-sm transition cursor-pointer"
                      >
                        Kumpirmahin ang Pagkansela
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
