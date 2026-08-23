import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Truck,
  Package,
  CheckCircle2,
  Calendar,
  Clock,
  Phone,
  Copy,
  UserCheck,
  ShieldCheck,
  Building2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { ShopOrder } from '../types';

interface ZoneShopOrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ShopOrder | null;
  token?: string;
  onRefreshOrders?: () => void;
  triggerNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ZoneShopOrderTrackingModal: React.FC<ZoneShopOrderTrackingModalProps> = ({
  isOpen,
  onClose,
  order: initialOrder,
  token,
  onRefreshOrders,
  triggerNotification
}) => {
  const [currentOrder, setCurrentOrder] = useState<ShopOrder | null>(initialOrder);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    setCurrentOrder(initialOrder);
  }, [initialOrder]);

  // Live refetch order details
  const fetchLiveOrder = async () => {
    if (!initialOrder) return;
    try {
      setRefreshing(true);
      const res = await fetch(`/api/shop/orders/${initialOrder.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && data.order) {
        setCurrentOrder(data.order);
        if (onRefreshOrders) onRefreshOrders();
      }
    } catch (err) {
      console.error('Failed to reload order tracking:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialOrder) {
      fetchLiveOrder();
      const timer = setInterval(fetchLiveOrder, 10000);
      return () => clearInterval(timer);
    }
  }, [isOpen, initialOrder?.id]);

  if (!isOpen || !currentOrder) return null;
  const order = currentOrder;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerNotification('Copied!', `Nai-copy ang ${label}: ${text}`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-xl border border-orange-500/30">
              🚚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">Live Parcel Tracking</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">Order #{order.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveOrder}
              title="I-refresh ang tracking data"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TRACKING NUMBER & COURIER CARD */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-orange-700">
                Logistics Partner: {order.courierName || 'Z-one Express Nationwide'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-slate-900">
                  {order.trackingNumber || 'Pending Waybill Generation'}
                </span>
                {order.trackingNumber && (
                  <button
                    onClick={() => handleCopy(order.trackingNumber!, 'Tracking Number')}
                    className="text-orange-600 hover:text-orange-700 transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {order.riderName && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-orange-200 shadow-2xs">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs">
                  🛵
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">Rider</p>
                  <p className="text-xs font-black text-slate-900">{order.riderName}</p>
                </div>
                {order.riderPhone && (
                  <a
                    href={`tel:${order.riderPhone}`}
                    className="ml-2 w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* DESTINATION ADDRESS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-black text-slate-800">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span>Delivery Destination</span>
            </div>
            <p className="font-bold text-slate-900">
              {order.shippingAddress.recipientName} ({order.shippingAddress.phoneNumber})
            </p>
            <p className="text-slate-600">
              {order.shippingAddress.streetAddress}, {order.shippingAddress.barangay ? `${order.shippingAddress.barangay}, ` : ''}{order.shippingAddress.city}, {order.shippingAddress.province || ''} {order.shippingAddress.postalCode || ''}
            </p>
            {order.shippingAddress.deliveryNotes && (
              <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-200">
                "{order.shippingAddress.deliveryNotes}"
              </p>
            )}
          </div>

          {/* REAL-TIME STATUS TIMELINE */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Tracking History & Updates</span>
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(order.statusTimeline || []).map((tl, index) => {
                const isLatest = index === order.statusTimeline.length - 1;
                return (
                  <div key={index} className="relative">
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black ${
                        isLatest
                          ? 'bg-orange-500 text-white ring-4 ring-orange-100 shadow-sm'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isLatest ? '●' : '✓'}
                    </div>

                    <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                      isLatest ? 'bg-orange-50/70 border-orange-200' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h5 className={`font-black ${isLatest ? 'text-orange-900' : 'text-slate-900'}`}>
                          {tl.title}
                        </h5>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(tl.timestamp).toLocaleTimeString('fil-PH', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {tl.description}
                      </p>
                      {tl.location && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold pt-1">
                          <Building2 className="w-3 h-3" />
                          <span>{tl.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-6 py-2.5 rounded-xl transition cursor-pointer"
          >
            Isara ang Window
          </button>
        </div>

      </div>
    </div>
  );
};
