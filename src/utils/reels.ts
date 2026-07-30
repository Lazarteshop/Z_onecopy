export interface FormattedReelUrl {
  embedUrl: string;
  platform: 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'direct';
}

export function formatEmbedUrl(rawUrl: string): FormattedReelUrl {
  if (!rawUrl) return { embedUrl: '', platform: 'direct' };
  let url = rawUrl.trim();

  // 1. YouTube Shorts & Watch URLs
  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
  if (ytShortsMatch && ytShortsMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytShortsMatch[1]}?autoplay=1&enablejsapi=1`,
      platform: 'youtube'
    };
  }

  const ytWatchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i);
  if (ytWatchMatch && ytWatchMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytWatchMatch[1]}?autoplay=1&enablejsapi=1`,
      platform: 'youtube'
    };
  }

  // 2. Facebook Reels / Videos
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
    if (url.includes('facebook.com/plugins/video.php')) {
      return { embedUrl: url, platform: 'facebook' };
    }
    const encoded = encodeURIComponent(url);
    return {
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&autoplay=true`,
      platform: 'facebook'
    };
  }

  // 3. TikTok
  const tiktokMatch = url.match(/tiktok\.com\/.*\/video\/(\d+)/i) || url.match(/tiktok\.com\/embed\/v2\/(\d+)/i);
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
