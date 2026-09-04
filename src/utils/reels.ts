export interface FormattedReelUrl {
  embedUrl: string;
  platform: 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'direct';
}

export function formatEmbedUrl(rawUrl: string): FormattedReelUrl {
  if (!rawUrl) return { embedUrl: '', platform: 'direct' };
  let url = rawUrl.trim();

  // 1. YouTube Shorts & Watch URLs
  const ytMatch = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|watch\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1&rel=0`,
      platform: 'youtube'
    };
  }

  // 2. Facebook Reels / Videos
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
    if (url.includes('facebook.com/plugins/video.php')) {
      return { embedUrl: url, platform: 'facebook' };
    }
    const cleanUrl = url.split('#')[0];
    const encoded = encodeURIComponent(cleanUrl);
    return {
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&autoplay=true`,
      platform: 'facebook'
    };
  }

  // 3. TikTok
  const tiktokMatch = url.match(/(?:video|v|player\/v1|embed\/v2|embed)\/(\d{10,25})/i) ||
                      url.match(/tiktok\.com\/.*\/(\d{10,25})/i) ||
                      url.match(/[?&]v=(\d{10,25})/i);
  if (tiktokMatch && tiktokMatch[1]) {
    return {
      embedUrl: `https://www.tiktok.com/player/v1/${tiktokMatch[1]}?autoplay=1`,
      platform: 'tiktok'
    };
  }
  if (url.includes('tiktok.com')) {
    return {
      embedUrl: url,
      platform: 'tiktok'
    };
  }

  // 4. Instagram Reels / Posts
  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch && igMatch[1]) {
    return {
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      platform: 'instagram'
    };
  }
  if (url.includes('instagram.com')) {
    return {
      embedUrl: url.endsWith('/embed') ? url : `${url.replace(/\/$/, '')}/embed`,
      platform: 'instagram'
    };
  }

  // 5. Direct MP4 / WebM / Media
  return {
    embedUrl: url,
    platform: 'direct'
  };
}

export type AudienceCountry = 'Philippines' | 'India' | 'Indonesia' | 'US' | 'Canada' | 'UK';

export interface CountryCPMConfig {
  minCPM: number;
  maxCPM: number;
  baseCPM: number;
  label: string;
}

export const AUDIENCE_CPM_RATES: Record<AudienceCountry, CountryCPMConfig> = {
  Philippines: { minCPM: 5.80, maxCPM: 29.00, baseCPM: 12.00, label: '🇵🇭 Philippines (₱5.80 – ₱29.00)' },
  India: { minCPM: 4.64, maxCPM: 23.20, baseCPM: 8.50, label: '🇮🇳 India (₱4.64 – ₱23.20)' },
  Indonesia: { minCPM: 4.64, maxCPM: 26.10, baseCPM: 9.50, label: '🇮🇩 Indonesia (₱4.64 – ₱26.10)' },
  US: { minCPM: 5.80, maxCPM: 29.00, baseCPM: 18.50, label: '🇺🇸 US (₱5.80 – ₱29.00)' },
  Canada: { minCPM: 4.64, maxCPM: 23.20, baseCPM: 15.00, label: '🇨🇦 Canada (₱4.64 – ₱23.20)' },
  UK: { minCPM: 4.64, maxCPM: 26.10, baseCPM: 16.00, label: '🇬🇧 UK (₱4.64 – ₱26.10)' }
};

export interface ReelRevenueBreakdown {
  country: AudienceCountry;
  impressions: number;
  baseCPM: number;
  engagementBonus: number;
  watchTimeBonus: number;
  demandAdjustment: number;
  finalCPM: number;
  revenue: number;
}

export function calculateReelRevenue(
  impressions: number,
  likes: number = 0,
  country: AudienceCountry = 'Philippines',
  customWatchBonus?: number,
  customDemandAdj?: number
): ReelRevenueBreakdown {
  const config = AUDIENCE_CPM_RATES[country] || AUDIENCE_CPM_RATES.Philippines;

  const baseCPM = config.baseCPM;

  // 1. Engagement Bonus: calculated from likes/views or default baseline bonus
  const likesRatio = impressions > 0 ? (likes / impressions) : 0.05;
  const engagementBonus = Math.min(5.00, Math.max(0.50, likesRatio * 25 + likes * 0.15 + 1.20));

  // 2. Watch Time Bonus: default completion quality bonus
  const watchTimeBonus = customWatchBonus ?? Math.min(4.00, Math.max(0.50, 1.80 + (impressions > 0 ? 0.80 : 0.50)));

  // 3. Demand Adjustment: seasonal advertiser market demand
  const demandAdjustment = customDemandAdj ?? 1.20;

  // Raw CPM = Base + Engagement + Watch Time + Demand
  const rawCPM = baseCPM + engagementBonus + watchTimeBonus + demandAdjustment;

  // Clamped within country min and max dynamic range
  const finalCPM = Math.min(config.maxCPM, Math.max(config.minCPM, rawCPM));

  // Revenue = (Impressions × Final CPM) ÷ 1000
  const revenue = Number(((impressions * finalCPM) / 1000).toFixed(2));

  return {
    country,
    impressions,
    baseCPM: Number(baseCPM.toFixed(2)),
    engagementBonus: Number(engagementBonus.toFixed(2)),
    watchTimeBonus: Number(watchTimeBonus.toFixed(2)),
    demandAdjustment: Number(demandAdjustment.toFixed(2)),
    finalCPM: Number(finalCPM.toFixed(2)),
    revenue
  };
}

