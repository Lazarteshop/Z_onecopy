import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  ShoppingBag, 
  Globe, 
  Wallet, 
  Shield, 
  Clock, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Megaphone,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Award,
  QrCode,
  Download,
  Video,
  Image as ImageIcon,
  Link2,
  ExternalLink,
  Play,
  Pause,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MousePointerClick,
  BarChart3,
  Star,
  Upload
} from 'lucide-react';
import { MerchantAd } from '../types';
import AICommercialPlayer from './AICommercialPlayer';

const compressImageFromFile = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
};

interface MerchantPortalProps {
  token: string | null;
  language: 'tl' | 'en';
  triggerNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

const PRESET_COLORS = [
  { name: 'Shopee Orange', value: '#EE4D2D' },
  { name: 'GCash Blue', value: '#1E40AF' },
  { name: 'Grab Green', value: '#10B981' },
  { name: 'FoodPanda Pink', value: '#EC4899' },
  { name: 'Elegant Charcoal', value: '#0F172A' },
  { name: 'Golden Amber', value: '#D97706' },
  { name: 'Ocean Cyan', value: '#06B6D4' },
  { name: 'Royal Purple', value: '#7C3AED' }
];

const ICONS_LIST = [
  { name: 'ShoppingBag', label: '🛍️ Tindahan / Shop', emoji: '🛍️' },
  { name: 'Utensils', label: '🍽️ Kainan / Food', emoji: '🍽️' },
  { name: 'Laptop', label: '💻 Trabaho / Tech', emoji: '💻' },
  { name: 'Compass', label: '✈️ Biyahe / Travel', emoji: '✈️' },
  { name: 'Activity', label: '🏥 Kalusugan / Health', emoji: '🏥' },
  { name: 'Newspaper', label: '📰 Balita / News', emoji: '📰' },
  { name: 'Wifi', label: '📶 Internet / WiFi', emoji: '📶' },
  { name: 'PiggyBank', label: '💰 Negosyo / Savings', emoji: '💰' },
  { name: 'Sparkles', label: '⭐ Serbisyo / Others', emoji: '⭐' }
];

const BUSINESS_CATEGORIES = [
  'Online Shop',
  'Local Business',
  'Restaurant / Food',
  'Services',
  'Creator / Brand',
  'Product Launch',
  'Event / Promo'
];

const CTA_OPTIONS = [
  'Visit Website',
  'Shop Now',
  'Learn More',
  'Watch Now',
  'Order Now',
  'Message Business',
  'View Offer'
];

const PLANS = [
  { id: 'bronze', name: 'Bronze Plan', price: 299, days: 7, reward: 1.50, desc: 'Perpekto para sa mabilisang promosyon at anunsyo.' },
  { id: 'silver', name: 'Silver Plan', price: 999, days: 30, reward: 2.50, desc: 'Pinakasikat para sa mga lumalagong lokal na tindahan.' },
  { id: 'gold', name: 'Gold Plan', price: 2499, days: 90, reward: 3.50, desc: 'Mahabang exposure na may mas mataas na prayoridad sa feed.' },
  { id: 'platinum', name: 'Platinum Plan', price: 7999, days: 365, reward: 5.00, desc: 'Isang buong taon na sponsored listing para sa maximum branding.' }
];

function extractDomainLabel(rawUrl?: string): string {
  if (!rawUrl) return 'z-oneapp.com';
  try {
    const u = new URL(rawUrl.trim());
    return u.hostname.replace(/^www\./i, '');
  } catch {
    return rawUrl.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0] || 'website.com';
  }
}

function resolveClientEmbedPreview(rawUrl: string): {
  valid: boolean;
  platform?: 'youtube' | 'facebook' | 'vimeo' | 'direct_mp4';
  embedUrl?: string;
  directUrl?: string;
  error?: string;
} {
  if (!rawUrl || !rawUrl.trim()) return { valid: false };
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:')) {
    return { valid: false, error: 'Unsafe URL protocol is not allowed.' };
  }
  if (!lower.startsWith('https://') && !lower.startsWith('http://')) {
    return { valid: false, error: 'URL must start with https:// or http://' };
  }
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(u.pathname + u.search)) {
      return { valid: true, platform: 'direct_mp4', directUrl: u.toString() };
    }
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let vid = '';
      if (host.includes('youtu.be')) {
        vid = u.pathname.replace(/^\//, '').split('/')[0];
      } else if (u.pathname.startsWith('/watch')) {
        vid = u.searchParams.get('v') || '';
      } else if (u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/embed/')) {
        vid = u.pathname.split('/')[2] || '';
      }
      vid = vid.replace(/[^a-zA-Z0-9_-]/g, '');
      if (vid.length >= 6) {
        return { valid: true, platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${vid}?rel=0` };
      }
      return { valid: false, error: 'Could not extract YouTube Video ID.' };
    }
    if (host.includes('vimeo.com')) {
      const m = u.pathname.match(/\/(?:video\/)?(\d+)/);
      if (m && m[1]) {
        return { valid: true, platform: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}` };
      }
      return { valid: false, error: 'Could not extract Vimeo Video ID.' };
    }
    if (host.includes('facebook.com') || host.includes('fb.watch')) {
      return {
        valid: true,
        platform: 'facebook',
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.toString())}&show_text=false`
      };
    }
    return { valid: false, error: 'Supported sources: YouTube, Facebook Video, Vimeo, or Direct MP4 URL.' };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

export default function MerchantPortal({
  token,
  language,
  triggerNotification
}: MerchantPortalProps) {
  const [ads, setAds] = useState<MerchantAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'social_promotion' | 'campaign_ad'>('social_promotion');

  // Social Feed Promotion fields
  const [businessName, setBusinessName] = useState('');
  const [businessLogo, setBusinessLogo] = useState('🛍️');
  const [businessCategory, setBusinessCategory] = useState<string>('Online Shop');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [mediaSourceType, setMediaSourceType] = useState<'upload_video' | 'upload_image' | 'external_video'>('upload_video');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string>('');
  const [externalVideoUrl, setExternalVideoUrl] = useState<string>('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [ctaText, setCtaText] = useState('Shop Now');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Classic Campaign Ad states
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [logo, setLogo] = useState('ShoppingBag');
  const [category, setCategory] = useState<'Shopping' | 'Balita' | 'Teknolohiya' | 'E-Services' | 'Kultura'>('Shopping');
  const [primaryColor, setPrimaryColor] = useState('#EE4D2D');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [planId, setPlanId] = useState('bronze');
  const [gcashSenderNumber, setGcashSenderNumber] = useState('');
  const [gcashReferenceNo, setGcashReferenceNo] = useState('');

  // Preview State
  const [previewAd, setPreviewAd] = useState<MerchantAd | null>(null);
  const [activeCommercialAd, setActiveCommercialAd] = useState<MerchantAd | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchMyAds = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/ads', {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAds();
  }, [token]);

  // Upload helper to Cloudflare R2 via /api/zone/upload
  const uploadDataUrlToR2 = async (dataUrl: string): Promise<string> => {
    const res = await fetch('/api/zone/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || ''
      },
      body: JSON.stringify({ dataUrl })
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Failed to upload media to Cloudflare R2.');
    }
    return data.url;
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const compressed = await compressImageFromFile(file, 300, 300, 0.8);
      const r2Url = await uploadDataUrlToR2(compressed);
      setBusinessLogo(r2Url);
      triggerNotification(
        language === 'tl' ? 'Na-upload na ang Business Logo!' : 'Business Logo uploaded!',
        'success'
      );
    } catch (err: any) {
      triggerNotification(err.message || 'Logo upload failed', 'error');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handlePromoMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>, expectedType: 'video' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (expectedType === 'video') {
      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov)$/i)) {
        triggerNotification(
          language === 'tl' ? 'Pumili ng valid na video file (MP4, WebM, MOV).' : 'Please select a valid video file (MP4, WebM, MOV).',
          'error'
        );
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        triggerNotification(
          language === 'tl' ? 'Ang video ay hindi dapat lumagpas sa 50MB.' : 'Video file size must not exceed 50MB.',
          'error'
        );
        return;
      }
    } else {
      if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
        triggerNotification(
          language === 'tl' ? 'Pumili ng valid na larawan (JPG, PNG, WebP).' : 'Please select a valid image (JPG, PNG, WebP).',
          'error'
        );
        return;
      }
    }

    setIsUploadingMedia(true);
    try {
      let dataUrl = '';
      if (expectedType === 'image') {
        dataUrl = await compressImageFromFile(file, 1200, 1200, 0.82);
      } else {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read video file'));
          reader.readAsDataURL(file);
        });
      }

      const r2Url = await uploadDataUrlToR2(dataUrl);
      setUploadedMediaUrl(r2Url);
      triggerNotification(
        language === 'tl'
          ? `✅ Matagumpay na na-upload ang ${expectedType === 'video' ? 'video' : 'larawan'} sa Cloudflare R2!`
          : `✅ Successfully uploaded promotional ${expectedType} to Cloudflare R2!`,
        'success'
      );
    } catch (err: any) {
      triggerNotification(err.message || 'Media upload failed', 'error');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleSubmitSocialPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!businessName.trim() || !headline.trim() || !description.trim() || !destinationUrl.trim()) {
      triggerNotification(
        language === 'tl'
          ? 'Pakikumpleto ang Business Name, Headline, Description, at Destination URL.'
          : 'Please complete Business Name, Headline, Description, and Destination URL.',
        'error'
      );
      return;
    }

    if (mediaSourceType === 'upload_video' || mediaSourceType === 'upload_image') {
      if (!uploadedMediaUrl.trim()) {
        triggerNotification(
          language === 'tl'
            ? `Paki-upload muna ang iyong promotional ${mediaSourceType === 'upload_video' ? 'video' : 'larawan'}.`
            : `Please upload your promotional ${mediaSourceType === 'upload_video' ? 'video' : 'image'} first.`,
          'error'
        );
        return;
      }
    } else if (mediaSourceType === 'external_video') {
      const check = resolveClientEmbedPreview(externalVideoUrl);
      if (!check.valid) {
        triggerNotification(check.error || 'Invalid external video link.', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          promotionType: 'social_promotion',
          businessName: businessName.trim(),
          businessLogo,
          businessCategory,
          headline: headline.trim(),
          title: headline.trim(),
          description: description.trim(),
          hashtags: hashtagsInput
            .split(/[\s,]+/)
            .map(t => t.trim())
            .filter(Boolean),
          mediaSourceType,
          mediaUrl: mediaSourceType === 'external_video' ? externalVideoUrl.trim() : uploadedMediaUrl.trim(),
          mediaType: mediaSourceType === 'upload_image' ? 'image' : 'video',
          externalVideoUrl: mediaSourceType === 'external_video' ? externalVideoUrl.trim() : undefined,
          destinationUrl: destinationUrl.trim(),
          url: destinationUrl.trim(),
          ctaText
        })
      });

      const data = await res.json();
      if (res.ok) {
        const isLive = data.ad?.status === 'active' || data.ad?.status === 'approved';
        triggerNotification(
          isLive
            ? (language === 'tl'
                ? '🟢 Live na ang iyong Business Promotion sa Z-oneSocial Feed!'
                : '🟢 Your Business Promotion is now LIVE in the Z-oneSocial Feed!')
            : (language === 'tl'
                ? '🟢 Naisumite na ang iyong Business Promotion! Lalabas ito sa Z-oneSocial Feed pagkatapos ng Admin approval.'
                : '🟢 Business Promotion submitted! It will appear in the Z-oneSocial Feed once approved by Admin.'),
          'success'
        );
        setBusinessName('');
        setHeadline('');
        setDescription('');
        setHashtagsInput('');
        setUploadedMediaUrl('');
        setExternalVideoUrl('');
        setDestinationUrl('');
        setShowForm(false);
        fetchMyAds();
      } else {
        triggerNotification(data.error || 'Failed to create promotion.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Connection error submitting promotion.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'social_promotion') {
      return handleSubmitSocialPromotion(e);
    }
    if (!token) return;

    if (!title.trim() || !url.trim() || !description.trim() || !gcashSenderNumber.trim() || !gcashReferenceNo.trim()) {
      triggerNotification(
        language === 'tl' 
          ? 'Mangyaring punan ang lahat ng kinakailangang impormasyon.' 
          : 'Please fill in all required fields.', 
        'error'
      );
      return;
    }

    if (gcashSenderNumber.length < 10) {
      triggerNotification(
        language === 'tl'
          ? 'Ang GCash sender number ay dapat mayroong hindi bababa sa 10 digits.'
          : 'GCash sender number must be at least 10 digits.',
        'error'
      );
      return;
    }

    if (gcashReferenceNo.length < 10) {
      triggerNotification(
        language === 'tl'
          ? 'Ang GCash reference number ay dapat mayroong hindi bababa sa 10 digits.'
          : 'GCash reference number must be at least 10 digits.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          title,
          url,
          description,
          logo,
          category,
          primaryColor,
          accentColor,
          planId,
          gcashSenderNumber,
          gcashReferenceNo
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerNotification(
          language === 'tl'
            ? '🟢 Matagumpay na naisumite ang iyong negosyo! Hintayin ang pagsusuri ng admin.'
            : '🟢 Successfully submitted your business promotion! Waiting for admin review.',
          'success'
        );
        setTitle('');
        setUrl('');
        setDescription('');
        setGcashSenderNumber('');
        setGcashReferenceNo('');
        setShowForm(false);
        fetchMyAds();
      } else {
        triggerNotification(data.error || 'Failed to submit promotion request.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Connection error submitting promotion.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePromotionStatus = async (adId: string, nextStatus: 'paused' | 'active' | 'completed') => {
    if (!token) return;
    setUpdatingStatusId(adId);
    try {
      const res = await fetch(`/api/merchant/ads/${adId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification(
          language === 'tl'
            ? `Na-update ang status ng promotion sa: ${nextStatus.toUpperCase()}`
            : `Promotion status updated to: ${nextStatus.toUpperCase()}`,
          'success'
        );
        fetchMyAds();
      } else {
        triggerNotification(data.error || 'Failed to update status', 'error');
      }
    } catch {
      triggerNotification('Network error updating promotion status', 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getStatusBadge = (status: string, isFeatured?: boolean) => {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {isFeatured && (
          <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span>Featured</span>
          </span>
        )}
        {status === 'pending' && (
          <span className="bg-amber-100 border border-amber-250 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>{language === 'tl' ? 'Pending Review' : 'Pending Review'}</span>
          </span>
        )}
        {(status === 'active' || status === 'approved') && (
          <span className="bg-emerald-100 border border-emerald-250 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <CheckCircle className="w-3 h-3" />
            <span>{language === 'tl' ? 'Active sa Feed' : 'Active in Feed'}</span>
          </span>
        )}
        {status === 'paused' && (
          <span className="bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <Pause className="w-3 h-3" />
            <span>{language === 'tl' ? 'Naka-Pause' : 'Paused'}</span>
          </span>
        )}
        {(status === 'declined' || status === 'rejected') && (
          <span className="bg-rose-100 border border-rose-250 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <XCircle className="w-3 h-3" />
            <span>{language === 'tl' ? 'Rejected' : 'Rejected'}</span>
          </span>
        )}
        {(status === 'expired' || status === 'completed') && (
          <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
            <AlertCircle className="w-3 h-3" />
            <span>{language === 'tl' ? 'Completed' : 'Completed'}</span>
          </span>
        )}
      </div>
    );
  };

  // Build live preview object for the Social Promotion form
  const extPreview = resolveClientEmbedPreview(externalVideoUrl);
  const parsedFormTags = hashtagsInput
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => (t.startsWith('#') ? t : `#${t}`));

  const renderSponsoredFeedCardPreview = (promo: {
    businessName: string;
    businessLogo: string;
    businessCategory: string;
    headline: string;
    description: string;
    hashtags: string[];
    mediaSourceType: string;
    mediaUrl?: string;
    embedUrl?: string;
    destinationUrl: string;
    ctaText: string;
  }) => {
    const isLogoImage =
      promo.businessLogo &&
      (promo.businessLogo.startsWith('http') || promo.businessLogo.startsWith('data:') || promo.businessLogo.startsWith('/'));

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden max-w-xl mx-auto text-slate-900">
        {/* Header */}
        <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {isLogoImage ? (
              <img
                src={promo.businessLogo}
                alt={promo.businessName}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-lg shrink-0">
                {promo.businessLogo || '🏢'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-slate-900">
                  {promo.businessName || 'Your Business Name'}
                </span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                  Verified Partner
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-0.5">
                <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded font-extrabold">
                  Sponsored
                </span>
                <span>•</span>
                <span>{promo.businessCategory || 'Online Shop'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <h4 className="font-black text-sm text-slate-900 leading-snug">
            {promo.headline || 'Your Promotion Headline Appears Here'}
          </h4>
          <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
            {promo.description || 'Write an engaging caption or promotional offer for Z-oneApp members...'}
          </p>
          {promo.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {promo.hashtags.map((tag, i) => (
                <span key={i} className="text-xs font-bold text-blue-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Media */}
        <div className="bg-slate-950">
          {promo.mediaSourceType === 'upload_image' && promo.mediaUrl ? (
            <img
              src={promo.mediaUrl}
              alt={promo.headline}
              className="w-full max-h-80 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : promo.embedUrl ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={promo.embedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={promo.headline || 'Promotional Video'}
              />
            </div>
          ) : promo.mediaUrl ? (
            <video
              src={promo.mediaUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-80 object-contain bg-black"
            />
          ) : (
            <div className="aspect-video w-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-6 text-center gap-2">
              <Video className="w-8 h-8 text-indigo-400" />
              <span className="text-xs font-bold">
                {language === 'tl'
                  ? 'Lalabas dito ang iyong Video o Larawan sa Z-oneSocial Feed'
                  : 'Your Promotional Video or Banner Image will appear here'}
              </span>
            </div>
          )}
        </div>

        {/* Destination & CTA Action Bar */}
        <div className="bg-slate-50 px-4 py-3 border-t border-b border-slate-200/80 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
              {extractDomainLabel(promo.destinationUrl)}
            </p>
            <p className="text-xs font-black text-slate-900 truncate">
              {promo.headline || promo.businessName || 'Visit Official Business Page'}
            </p>
          </div>
          <a
            href={promo.destinationUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!promo.destinationUrl) e.preventDefault();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs transition"
          >
            <span>{promo.ctaText || 'Shop Now'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Social Actions Bar */}
        <div className="px-4 py-2 bg-white flex items-center justify-around text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1.5 py-1">
            <Heart className="w-4 h-4 text-slate-400" /> Like
          </span>
          <span className="flex items-center gap-1.5 py-1">
            <MessageSquare className="w-4 h-4 text-slate-400" /> Comment
          </span>
          <span className="flex items-center gap-1.5 py-1">
            <Share2 className="w-4 h-4 text-slate-400" /> Share
          </span>
          <span className="flex items-center gap-1.5 py-1">
            <Bookmark className="w-4 h-4 text-slate-400" /> Save
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 🚀 PROMOTION MAIN BANNER */}
      <div 
        className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', 
          backgroundColor: '#0f172a', 
          color: '#ffffff' 
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="bg-emerald-500 text-emerald-950 font-black text-[10px] tracking-widest px-3 py-1 rounded-full uppercase flex items-center gap-1 w-max">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>{language === 'tl' ? 'NEGOSYO PROMOTION HUB → Z-ONESOCIAL FEED' : 'BUSINESS PROMOTION HUB → Z-ONESOCIAL FEED'}</span>
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {language === 'tl' 
              ? 'I-promote ang Iyong Negosyo sa Z-oneSocial Feed!' 
              : 'Promote Your Business Directly in the Z-oneSocial Feed!'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 font-semibold leading-relaxed">
            {language === 'tl'
              ? 'Mag-post ng promotional video, larawan, at clickable CTA button na natural na lalabas sa Z-oneSocial Feed para makita, ma-like, ma-comment, at mabisita ng libo-libong miyembro!'
              : 'Publish promotional videos, banners, and clickable CTA buttons that appear naturally inside the Z-oneSocial Feed where members can watch, react, comment, share, and visit your business!'}
          </p>
          
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setFormMode('social_promotion');
                setShowForm(!showForm);
                setPreviewAd(null);
              }}
              id="toggle-ad-form-btn"
              className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {showForm ? (
                <span>{language === 'tl' ? 'Tingnan ang Aking Promotions' : 'View My Promotions'}</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-slate-950 font-black" />
                  <span>{language === 'tl' ? 'Create Promotion (Z-oneSocial Feed)' : 'Create Promotion (Z-oneSocial Feed)'}</span>
                </>
              )}
            </button>
            
            <button
              onClick={fetchMyAds}
              id="refresh-merchant-ads-btn"
              className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{language === 'tl' ? 'I-refresh' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔮 INTERACTIVE PREVIEW PANEL */}
      {previewAd && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-emerald-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{language === 'tl' ? 'Z-oneSocial Feed Sponsored Post Preview' : 'Z-oneSocial Feed Sponsored Post Preview'}</span>
            </h3>
            <button 
              onClick={() => setPreviewAd(null)}
              className="text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
            >
              ✕ {language === 'tl' ? 'Isara' : 'Close'}
            </button>
          </div>

          {renderSponsoredFeedCardPreview({
            businessName: previewAd.businessName || previewAd.title,
            businessLogo: previewAd.businessLogo || '🏢',
            businessCategory: previewAd.businessCategory || previewAd.category || 'Local Business',
            headline: previewAd.headline || previewAd.title,
            description: previewAd.description,
            hashtags: previewAd.hashtags || [],
            mediaSourceType: previewAd.mediaSourceType || (previewAd.mediaUrl ? 'upload_image' : 'none'),
            mediaUrl: previewAd.mediaUrl,
            embedUrl: previewAd.embedUrl,
            destinationUrl: previewAd.destinationUrl || previewAd.url,
            ctaText: previewAd.ctaText || 'Visit Website'
          })}
        </div>
      )}

      {/* 🎬 AI COMMERCIAL POPUP PLAYER */}
      {activeCommercialAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-1 max-w-4xl w-full relative shadow-2xl">
            <button
              onClick={() => setActiveCommercialAd(null)}
              className="absolute -top-12 right-0 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-full border border-slate-700 cursor-pointer select-none transition z-50 flex items-center gap-1"
            >
              ✕ {language === 'tl' ? 'Isara' : 'Close'}
            </button>
            {activeCommercialAd.aiCommercial ? (
              <AICommercialPlayer
                commercial={activeCommercialAd.aiCommercial}
                businessUrl={activeCommercialAd.url}
                businessTitle={activeCommercialAd.title}
                onClose={() => setActiveCommercialAd(null)}
              />
            ) : (
              <div className="p-8 text-center space-y-4">
                <p className="text-slate-400 font-bold text-sm">Walang nahanap na AI Commercial para sa promotion na ito.</p>
                <button 
                  onClick={() => setActiveCommercialAd(null)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  Isara
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📝 FORM FOR NEW PROMOTION OR AD SUBMISSION */}
      {showForm ? (
        <form onSubmit={handleSubmit} id="merchant-ad-form" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                <span>
                  {formMode === 'social_promotion'
                    ? (language === 'tl' ? 'Create Promotion (Z-oneSocial Feed)' : 'Create Promotion (Z-oneSocial Feed)')
                    : (language === 'tl' ? 'Sponsored Task Campaign (Mag-ipon)' : 'Sponsored Task Campaign')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                {formMode === 'social_promotion'
                  ? (language === 'tl'
                      ? 'Gumawa ng sponsored video o photo post na may CTA button sa Z-oneSocial Feed.'
                      : 'Create a sponsored video or image post with a clickable CTA button in the Z-oneSocial Feed.')
                  : (language === 'tl'
                      ? 'Punan ang mga detalye ng iyong negosyo para sa Sponsored Campaign Tasks.'
                      : 'Enter your business details and submit your reference payment for Campaign Tasks.')}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start">
              <button
                type="button"
                onClick={() => setFormMode('social_promotion')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  formMode === 'social_promotion'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Z-oneSocial Feed Promo</span>
              </button>
              <button
                type="button"
                onClick={() => setFormMode('campaign_ad')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  formMode === 'campaign_ad'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Task Campaign Ad</span>
              </button>
            </div>
          </div>

          {formMode === 'social_promotion' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT: CREATE PROMOTION FIELDS */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Business Information */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>1. Business Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        Business Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g.Kusina ni Lola Maria"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold"
                      >
                        {BUSINESS_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Business Logo / Avatar */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700">
                      Business Logo / Avatar (Optional)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {ICONS_LIST.map((ic) => (
                        <button
                          key={ic.name}
                          type="button"
                          onClick={() => setBusinessLogo(ic.emoji)}
                          className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center cursor-pointer transition ${
                            businessLogo === ic.emoji
                              ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-100'
                          }`}
                          title={ic.label}
                        >
                          {ic.emoji}
                        </button>
                      ))}
                      <label className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          disabled={isUploadingLogo}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Promotion Content */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. Promotion Content</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700">
                      Headline / Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 50% OFF Grand Opening Promo — Free Delivery Today!"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700">
                      Description / Caption <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe your product, offer, service, or announcement clearly for Z-oneSocial Feed viewers..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700">
                      Hashtags (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. #PinoyNegosyo #OnlineShopPH #ZOnePromo"
                      value={hashtagsInput}
                      onChange={(e) => setHashtagsInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* 3. Media Options (Option A: Upload Video, Option B: Upload Image, Option C: External Video) */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>3. Promotional Media (Cloudflare R2 / External Video)</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaSourceType('upload_video')}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 cursor-pointer transition ${
                        mediaSourceType === 'upload_video'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>Upload Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaSourceType('upload_image')}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 cursor-pointer transition ${
                        mediaSourceType === 'upload_image'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaSourceType('external_video')}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 cursor-pointer transition ${
                        mediaSourceType === 'external_video'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Link2 className="w-4 h-4" />
                      <span>External Video</span>
                    </button>
                  </div>

                  {mediaSourceType === 'upload_video' && (
                    <div className="space-y-2">
                      <label className="w-full border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center">
                        {isUploadingMedia ? (
                          <>
                            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                            <span className="text-xs font-bold text-blue-700">Uploading Video to Cloudflare R2...</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-6 h-6 text-blue-600" />
                            <span className="text-xs font-black text-slate-800">
                              Click to Upload Promotional Video (MP4, WebM, MOV)
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">
                              Stored permanently via Cloudflare R2 media pipeline
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                          onChange={(e) => handlePromoMediaFileChange(e, 'video')}
                          disabled={isUploadingMedia}
                          className="hidden"
                        />
                      </label>
                      {uploadedMediaUrl && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800">
                          <span className="truncate">✅ R2 Video Ready: {uploadedMediaUrl}</span>
                          <button
                            type="button"
                            onClick={() => setUploadedMediaUrl('')}
                            className="text-rose-600 hover:underline ml-2 shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {mediaSourceType === 'upload_image' && (
                    <div className="space-y-2">
                      <label className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center">
                        {isUploadingMedia ? (
                          <>
                            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                            <span className="text-xs font-bold text-emerald-700">Uploading Image to Cloudflare R2...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-6 h-6 text-emerald-600" />
                            <span className="text-xs font-black text-slate-800">
                              Click to Upload Promotional Banner / Photo (JPG, PNG, WebP)
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold">
                              Auto-compressed & stored on Cloudflare R2
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => handlePromoMediaFileChange(e, 'image')}
                          disabled={isUploadingMedia}
                          className="hidden"
                        />
                      </label>
                      {uploadedMediaUrl && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800">
                          <span className="truncate">✅ R2 Image Ready: {uploadedMediaUrl}</span>
                          <button
                            type="button"
                            onClick={() => setUploadedMediaUrl('')}
                            className="text-rose-600 hover:underline ml-2 shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {mediaSourceType === 'external_video' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-700">
                        External Video URL (YouTube, Facebook Video, Vimeo, or Direct MP4 URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=... or https://example.com/promo.mp4"
                        value={externalVideoUrl}
                        onChange={(e) => setExternalVideoUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {externalVideoUrl.trim() && (
                        extPreview.valid ? (
                          <p className="text-[11px] font-bold text-emerald-700">
                            ✅ Valid {extPreview.platform?.toUpperCase()} video source detected
                          </p>
                        ) : (
                          <p className="text-[11px] font-bold text-rose-600">
                            ⚠️ {extPreview.error}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Destination & Call To Action */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
                    <span>4. Destination Link & Call-To-Action (CTA)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        Destination URL <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://yourbusiness.com or https://shopee.ph/yourshop"
                        value={destinationUrl}
                        onChange={(e) => setDestinationUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        CTA Button
                      </label>
                      <select
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold"
                      >
                        {CTA_OPTIONS.map((cta) => (
                          <option key={cta} value={cta}>{cta}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: LIVE Z-ONESOCIAL FEED POST PREVIEW */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Live Z-oneSocial Feed Preview</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Sponsored Card</span>
                </div>

                {renderSponsoredFeedCardPreview({
                  businessName,
                  businessLogo,
                  businessCategory,
                  headline,
                  description,
                  hashtags: parsedFormTags,
                  mediaSourceType,
                  mediaUrl:
                    mediaSourceType === 'external_video'
                      ? extPreview.directUrl
                      : uploadedMediaUrl,
                  embedUrl:
                    mediaSourceType === 'external_video'
                      ? extPreview.embedUrl
                      : undefined,
                  destinationUrl,
                  ctaText
                })}
              </div>
            </div>
          ) : (
            /* CLASSIC TASK CAMPAIGN AD FORM */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">
                    {language === 'tl' ? 'Pangalan ng Negosyo o Pamagat' : 'Business Name or Title'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Hal: Lola Maria's Pancit & Bakery"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">
                    {language === 'tl' ? 'Target Link o Website URL' : 'Target Link or Website URL'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="Hal: https://facebook.com/lolamariabakery"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">
                    {language === 'tl' ? 'Maikling Deskripsyon / Anunsyo' : 'Short Description / Announcement'} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Hal: Masarap at sariwang pandesal, pancit, at kakanin! Bukas kami mula 5 AM hanggang 8 PM. Bisitahin ang aming Facebook page ngayon!"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Kategorya</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold"
                    >
                      <option value="Shopping">Shopping</option>
                      <option value="Kultura">Kultura (Pagkain/Travel)</option>
                      <option value="Teknolohiya">Teknolohiya</option>
                      <option value="E-Services">E-Services</option>
                      <option value="Balita">Balita</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Icon</label>
                    <select
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold"
                    >
                      {ICONS_LIST.map(ic => (
                        <option key={ic.name} value={ic.name}>{ic.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Pangunahing Kulay ng Ad</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setPrimaryColor(color.value)}
                        className={`h-7 px-3 rounded-lg text-[10px] font-bold text-white transition flex items-center justify-center border ${
                          primaryColor === color.value ? 'border-black ring-2 ring-indigo-500/30 font-black scale-105' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-700 tracking-wide uppercase">Pumili ng Promosyon Package</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {PLANS.map(p => {
                      const isSelected = planId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setPlanId(p.id)}
                          className={`border rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600/50' 
                              : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-950 text-xs">{p.name} ({p.days} Araw)</h4>
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                +{p.days} Days
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{p.desc}</p>
                            <p className="text-[9px] text-emerald-600 font-black">
                              User Reward: ₱{p.reward.toFixed(2)} kada view!
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-indigo-700 block">₱{p.price}</span>
                            <span className="text-[9px] font-bold text-slate-400">GCash Pay</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-150 rounded-2xl p-4.5 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <h4 className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <Wallet className="w-4 h-4 text-indigo-600" />
                      <span>{language === 'tl' ? 'Opisyal na GCash QR Payment' : 'Official GCash QR Payment'}</span>
                    </h4>
                    <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      INSTAPAY / GCASH
                    </span>
                  </div>

                  <div className="bg-white border border-indigo-150 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
                    <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-sm group">
                      <img 
                        src="/admin_gcash_qr.png" 
                        alt="Admin GCash QR Code" 
                        className="w-48 h-48 object-contain rounded-lg mx-auto"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                        VERIFIED
                      </div>
                    </div>

                    <div className="space-y-1 w-full max-w-xs">
                      <a 
                        href="/admin_gcash_qr.png" 
                        download="Z-oneApp_Admin_GCash_QR.png"
                        className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 transition px-3.5 py-1.5 rounded-xl text-indigo-700 font-extrabold text-[10px] cursor-pointer shadow-2xs border border-indigo-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{language === 'tl' ? 'I-download ang QR Code' : 'Download QR Code'}</span>
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-950 uppercase tracking-wide">
                        {language === 'tl' ? 'Iyong GCash Mobile No.' : 'Your GCash Mobile No.'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Hal: 09171234567"
                        value={gcashSenderNumber}
                        onChange={(e) => setGcashSenderNumber(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-wider focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-950 uppercase tracking-wide">
                        {language === 'tl' ? 'GCash Reference Number' : 'GCash Reference Number'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="13-digit code"
                        value={gcashReferenceNo}
                        onChange={(e) => setGcashReferenceNo(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-wider focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-3 rounded-2xl transition cursor-pointer"
            >
              {language === 'tl' ? 'Kanselahin' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={submitting || isUploadingMedia || isUploadingLogo}
              id="submit-ad-btn"
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-black text-xs px-6 py-3 rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-600/15"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>{language === 'tl' ? 'Isinusumite...' : 'Publishing...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>
                    {formMode === 'social_promotion'
                      ? (language === 'tl' ? 'Publish Promotion to Z-oneSocial Feed' : 'Publish Promotion to Z-oneSocial Feed')
                      : `I-submit ang Aking Ad (₱${PLANS.find(p => p.id === planId)?.price})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* 📋 MERCHANTS OWN ADS & PROMOTIONS LIST VIEW WITH ANALYTICS */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span>{language === 'tl' ? 'Aking mga Negosyo Promosyon & Analytics' : 'My Business Promotions & Analytics'} ({ads.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-slate-500 text-xs font-bold select-none">Kumukuha ng mga promotions sa server...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Megaphone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-sm">{language === 'tl' ? 'Walang Aktibong Promosyon' : 'No Promotions Yet'}</h4>
                <p className="text-slate-500 font-bold text-xs select-none max-w-sm mx-auto">
                  {language === 'tl' 
                    ? 'Mag-click sa "Create Promotion" sa itaas para mag-post ng video o larawan ng iyong negosyo sa Z-oneSocial Feed!'
                    : 'Click "Create Promotion" above to publish a promotional video or photo post in the Z-oneSocial Feed!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.map((ad) => {
                const isLogoImg = ad.businessLogo && (ad.businessLogo.startsWith('http') || ad.businessLogo.startsWith('data:') || ad.businessLogo.startsWith('/'));
                return (
                  <div key={ad.id} id={`merchant-ad-item-${ad.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isLogoImg ? (
                            <img src={ad.businessLogo} alt={ad.businessName || ad.title} className="h-10 w-10 rounded-xl object-cover border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0">
                              {ad.businessLogo || (ad.logo === 'ShoppingBag' ? '🛍️' : ad.logo === 'Utensils' ? '🍽️' : ad.logo === 'Laptop' ? '💻' : '🏢')}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-950 text-xs truncate">{ad.headline || ad.title}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                              <span className="truncate">{ad.businessName || ad.userName}</span>
                              <span>•</span>
                              <span className="text-indigo-700 font-black">{ad.businessCategory || ad.category}</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(ad.status, ad.isFeatured)}
                      </div>

                      <p className="text-[11px] text-slate-600 font-semibold leading-relaxed line-clamp-2">{ad.description}</p>

                      {/* 📊 REAL-TIME PROMOTION ANALYTICS BAR */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div>
                          <div className="text-xs font-black text-slate-900">{ad.viewsCount || 0}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">Views</div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-blue-600">{ad.videoPlaysCount || 0}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">Plays</div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-emerald-600">{ad.ctaClicksCount || 0}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">CTA Clicks</div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-rose-600">{ad.likesCount || 0}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">Likes</div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-indigo-600">{ad.commentsCount || 0}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">Comments</div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-amber-600">{ad.sharesCount || 0}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">Shares</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(ad.createdAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(ad.status === 'active' || ad.status === 'approved') && (
                          <button
                            type="button"
                            disabled={updatingStatusId === ad.id}
                            onClick={() => handleTogglePromotionStatus(ad.id, 'paused')}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-black text-[10px] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        )}
                        {ad.status === 'paused' && (
                          <button
                            type="button"
                            disabled={updatingStatusId === ad.id}
                            onClick={() => handleTogglePromotionStatus(ad.id, 'active')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-[10px] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                        )}
                        {ad.status === 'active' && ad.aiCommercial && (
                          <button
                            type="button"
                            onClick={() => setActiveCommercialAd(ad)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[10px] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer select-none"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>AI Commercial</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewAd(ad)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-black text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>{language === 'tl' ? 'I-preview' : 'Preview'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
