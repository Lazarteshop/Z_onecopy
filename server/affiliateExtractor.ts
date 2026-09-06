import * as cheerio from 'cheerio';

export interface ExtractedProductData {
  productName: string;
  title: string;
  name: string;
  productDescription: string;
  description: string;
  sourceDescription: string;
  aiNormalizedDescription: string;
  price: number | null;
  priceAvailable: boolean;
  priceStatus: 'available' | 'unavailable';
  currency: string;
  primaryImage: string;
  mainProductImage: string;
  image: string;
  galleryImages: string[];
  images: string[];
  brand: string;
  seller: string;
  sellerName: string;
  specifications: { label: string; value: string }[];
  keyFeatures: string[];
  availability: string;
  platform: string;
  platformName: string;
  affiliatePlatform: string;
  originalAffiliateUrl: string;
  affiliateUrl: string;
  finalResolvedProductUrl: string;
  resolvedProductUrl: string;
  resolvedUrl: string;
  aiCleaned: boolean;
  isBlockedOrRequiresManual: boolean;
  sources: {
    title: string;
    description: string;
    mainImage: string;
    gallery: string;
    price: string;
    platform: string;
  };
  extractionStatus: {
    productName: boolean;
    productImage: boolean;
    galleryCount: number;
    price: boolean;
    description: boolean;
    seller: boolean;
    brand: boolean;
  };
  note: string;
}

// Prohibited host check for SSRF prevention
export function isProhibitedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '169.254.169.254' ||
    h.startsWith('10.') ||
    h.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.endsWith('.internal') ||
    h.endsWith('.local')
  );
}

// Decode HTML entities and sanitize whitespace
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8369;/gi, '₱')
    .replace(/&#x20B1;/gi, '₱')
    .replace(/&bull;/gi, '•')
    .replace(/&middot;/gi, '·')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .trim();
}

// Clean and normalize image URLs
export function cleanImageUrl(candidate: any, baseUrl?: string): string | null {
  if (!candidate || typeof candidate !== 'string') return null;
  let cleaned = candidate.trim();
  // decode escaped slashes or html entities
  cleaned = cleaned.replace(/\\u002F/g, '/').replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/\\/g, '');
  if (cleaned.startsWith('//')) cleaned = 'https:' + cleaned;
  if (cleaned.startsWith('/') && baseUrl) {
    try {
      cleaned = new URL(cleaned, baseUrl).toString();
    } catch {}
  }
  if (!/^https?:\/\//i.test(cleaned)) return null;

  const lower = cleaned.toLowerCase();
  // Filter out non-images or script assets
  if (lower.includes('<script') || lower.includes('.js') || lower.includes('.svg') || lower.includes('.css')) return null;
  // Filter out tracking pixels, spacers, beacons
  if (lower.includes('1x1') || lower.includes('pixel') || lower.includes('tracking') || lower.includes('beacon') || lower.includes('blank.gif') || lower.includes('spacer') || lower.includes('transparent.png')) return null;
  // Filter out site logos, favicons, avatars, badges, ratings
  if (lower.includes('favicon') || lower.includes('avatar') || lower.includes('logo-') || lower.includes('badge') || lower.includes('rating') || lower.includes('tts_logo')) return null;

  // Normalize common CDN resizing tokens to get high-res variants if present
  // Amazon: remove ._AC_..._.
  cleaned = cleaned.replace(/\._AC_[A-Z0-9_,]+_\./i, '.');

  return cleaned;
}

// Detect ecommerce platform
export function detectPlatform(url: string, htmlContent?: string): { platform: string; platformName: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('tiktok') || host.includes('musical.ly') || host.includes('tiktokv.com')) {
      return { platform: 'TikTok Shop', platformName: 'TikTok Shop' };
    }
    if (host.includes('shopee') || host.includes('shp.ee')) {
      return { platform: 'Shopee', platformName: 'Shopee' };
    }
    if (host.includes('lazada') || host.includes('laz.app')) {
      return { platform: 'Lazada', platformName: 'Lazada' };
    }
    if (host.includes('amazon') || host.includes('amzn.to') || host.includes('a.co')) {
      return { platform: 'Amazon', platformName: 'Amazon' };
    }
    if (host.includes('shopify') || host.includes('myshopify.com')) {
      return { platform: 'Shopify', platformName: 'Shopify' };
    }
    if (host.includes('etsy') || host.includes('etsy.me')) {
      return { platform: 'Etsy', platformName: 'Etsy' };
    }
    if (host.includes('temu')) {
      return { platform: 'Temu', platformName: 'Temu' };
    }
    if (host.includes('aliexpress') || host.includes('alix.to')) {
      return { platform: 'AliExpress', platformName: 'AliExpress' };
    }
    if (host.includes('zalora')) {
      return { platform: 'Zalora', platformName: 'Zalora' };
    }
    if (host.includes('ebay')) {
      return { platform: 'eBay', platformName: 'eBay' };
    }

    if (htmlContent) {
      const lowerHtml = htmlContent.slice(0, 50000).toLowerCase();
      if (lowerHtml.includes('tiktok shop') || lowerHtml.includes('shop.tiktok.com')) {
        return { platform: 'TikTok Shop', platformName: 'TikTok Shop' };
      }
      if (lowerHtml.includes('shopee') || lowerHtml.includes('cdn.shopee')) {
        return { platform: 'Shopee', platformName: 'Shopee' };
      }
      if (lowerHtml.includes('lazada') || lowerHtml.includes('lzd-') || lowerHtml.includes('lazada.com')) {
        return { platform: 'Lazada', platformName: 'Lazada' };
      }
      if (lowerHtml.includes('amazon') || lowerHtml.includes('amazon.com')) {
        return { platform: 'Amazon', platformName: 'Amazon' };
      }
      if (lowerHtml.includes('shopify') || lowerHtml.includes('cdn.shopify.com') || lowerHtml.includes('window.shopify')) {
        return { platform: 'Shopify', platformName: 'Shopify' };
      }
      if (lowerHtml.includes('etsy')) {
        return { platform: 'Etsy', platformName: 'Etsy' };
      }
      if (lowerHtml.includes('temu')) {
        return { platform: 'Temu', platformName: 'Temu' };
      }
      if (lowerHtml.includes('aliexpress')) {
        return { platform: 'AliExpress', platformName: 'AliExpress' };
      }
      if (lowerHtml.includes('zalora')) {
        return { platform: 'Zalora', platformName: 'Zalora' };
      }
      if (lowerHtml.includes('ebay')) {
        return { platform: 'eBay', platformName: 'eBay' };
      }
    }
  } catch {}
  return { platform: 'Other', platformName: 'Other Partner' };
}

// Recursive object search for product fields in serialized application JSON
function recursivelySearchJson(obj: any, results: {
  titles: string[];
  descriptions: string[];
  images: string[];
  prices: number[];
  currencies: string[];
  brands: string[];
  sellers: string[];
}, depth = 0): void {
  if (!obj || depth > 8) return;

  if (typeof obj === 'string') {
    // Check if string is serialized JSON
    if ((obj.startsWith('{') && obj.endsWith('}')) || (obj.startsWith('[') && obj.endsWith(']'))) {
      try {
        const parsed = JSON.parse(obj);
        recursivelySearchJson(parsed, results, depth + 1);
      } catch {}
    }
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      recursivelySearchJson(item, results, depth + 1);
    }
    return;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Title/Name
      if ((lowerKey === 'title' || lowerKey === 'productname' || lowerKey === 'product_name' || lowerKey === 'itemname') && typeof value === 'string') {
        const t = value.trim();
        if (t.length > 5 && t.length < 300 && !results.titles.includes(t)) results.titles.push(t);
      }

      // Description
      if ((lowerKey === 'description' || lowerKey === 'productdescription' || lowerKey === 'product_desc' || lowerKey === 'desc' || lowerKey === 'itemdescription' || lowerKey === 'richtextdescription') && typeof value === 'string') {
        const d = value.trim();
        if (d.length > 20 && !results.descriptions.includes(d)) results.descriptions.push(d);
      }

      // Image
      if ((lowerKey === 'image' || lowerKey === 'imageurl' || lowerKey === 'image_url' || lowerKey === 'mainimage' || lowerKey === 'primaryimage' || lowerKey === 'thumbnail' || lowerKey === 'imgurl') && typeof value === 'string') {
        if (/^https?:\/\//i.test(value) || value.startsWith('//')) {
          results.images.push(value);
        }
      }
      if ((lowerKey === 'images' || lowerKey === 'imageurls' || lowerKey === 'image_urls' || lowerKey === 'gallery' || lowerKey === 'galleryimages' || lowerKey === 'photos') && Array.isArray(value)) {
        for (const imgItem of value) {
          if (typeof imgItem === 'string' && (/^https?:\/\//i.test(imgItem) || imgItem.startsWith('//'))) {
            results.images.push(imgItem);
          } else if (imgItem && typeof imgItem === 'object' && typeof imgItem.url === 'string') {
            results.images.push(imgItem.url);
          }
        }
      }

      // Price
      if ((lowerKey === 'price' || lowerKey === 'saleprice' || lowerKey === 'sale_price' || lowerKey === 'currentprice' || lowerKey === 'current_price' || lowerKey === 'minprice' || lowerKey === 'format_price' || lowerKey === 'originalprice') && (typeof value === 'number' || typeof value === 'string')) {
        const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0 && num < 1000000) {
          // Normalize if in cents (> 10000)
          const normalizedPrice = num > 10000 && lowerKey.includes('cent') ? num / 100 : num;
          results.prices.push(normalizedPrice);
        }
      }

      // Currency
      if ((lowerKey === 'currency' || lowerKey === 'pricecurrency' || lowerKey === 'currencycode') && typeof value === 'string') {
        const cur = value.trim().toUpperCase();
        if (cur.length === 3 && !results.currencies.includes(cur)) results.currencies.push(cur);
      }

      // Brand / Seller
      if ((lowerKey === 'brand' || lowerKey === 'brandname') && typeof value === 'string' && value.trim()) {
        results.brands.push(value.trim());
      }
      if ((lowerKey === 'seller' || lowerKey === 'sellername' || lowerKey === 'shopname' || lowerKey === 'storename') && typeof value === 'string' && value.trim()) {
        results.sellers.push(value.trim());
      }

      // Recurse into nested objects
      recursivelySearchJson(value, results, depth + 1);
    }
  }
}

// MAIN GENERIC URL-TO-PRODUCT EXTRACTION PIPELINE
export async function extractProductFromUrl(
  rawUrl: string,
  aiNormalizer?: (raw: any) => Promise<{
    cleanTitle: string;
    cleanDescription: string;
    keyFeatures: string[];
    specifications: { label: string; value: string }[];
    aiCleaned: boolean;
  }>
): Promise<ExtractedProductData> {
  const trimmedUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    throw new Error('Invalid URL scheme. Must start with http:// or https://');
  }

  // 1. Validate Initial URL host for SSRF protection
  const parsedInitial = new URL(trimmedUrl);
  if (isProhibitedHost(parsedInitial.hostname)) {
    throw new Error('Prohibited target host address.');
  }

  // 2. Server-side redirect resolution
  let finalResolvedProductUrl = trimmedUrl;
  let htmlText = '';
  let isBlockedOrRequiresManual = false;

  const sources = {
    title: '',
    description: '',
    mainImage: '',
    gallery: '',
    price: '',
    platform: ''
  };

  try {
    const response = await fetch(trimmedUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fil;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });

    finalResolvedProductUrl = response.url || trimmedUrl;

    // Validate resolved host for SSRF
    const resolvedParsed = new URL(finalResolvedProductUrl);
    if (isProhibitedHost(resolvedParsed.hostname)) {
      throw new Error('Redirected to prohibited target host address.');
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('text') && !contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('json')) {
      throw new Error('Destination is not an HTML/text product page.');
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > 5 * 1024 * 1024) {
      throw new Error('Product page exceeds safe response size limit (5MB).');
    }

    if (response.status === 403 || response.status === 429 || response.status === 503) {
      isBlockedOrRequiresManual = true;
    }

    const rawHtml = await response.text();
    htmlText = rawHtml.slice(0, 3000000); // 3MB safe read ceiling

    if (
      htmlText.includes('cf-browser-verification') ||
      htmlText.includes('challenge-running') ||
      htmlText.includes('robot check') ||
      htmlText.includes('verify you are human') ||
      htmlText.includes('Please verify you are a human')
    ) {
      isBlockedOrRequiresManual = true;
    }
  } catch (err: any) {
    isBlockedOrRequiresManual = true;
  }

  // Detect platform
  const detectedPlatform = detectPlatform(finalResolvedProductUrl, htmlText);
  sources.platform = detectedPlatform.platformName;

  // Load Cheerio for robust DOM parsing (attribute-order agnostic)
  const $ = cheerio.load(htmlText || '<html><head></head><body></body></html>');

  // Multi-source storage
  let extractedTitle = '';
  let extractedDescription = '';
  let extractedPrice: number | null = null;
  let priceAvailable = false;
  let extractedCurrency = 'PHP';
  let extractedBrand = '';
  let extractedSeller = '';
  let extractedAvailability = 'In Stock';
  const rawImages: string[] = [];
  const rawSpecs: { label: string; value: string }[] = [];
  const rawFeatures: string[] = [];

  const addImageCandidate = (candidate: any, sourceLabel: string) => {
    const cleaned = cleanImageUrl(candidate, finalResolvedProductUrl);
    if (cleaned && !rawImages.includes(cleaned)) {
      rawImages.push(cleaned);
      if (!sources.mainImage) {
        sources.mainImage = sourceLabel;
      }
    }
  };

  // ==========================================
  // LAYER 1: Embedded JSON-LD / Schema.org
  // ==========================================
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const rawJson = $(el).text().trim();
      if (!rawJson) return;
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed]);

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        // Title
        if (item.name && typeof item.name === 'string' && item.name.trim().length > 5 && !extractedTitle) {
          extractedTitle = decodeHtmlEntities(item.name);
          sources.title = 'JSON-LD Product.name';
        }

        // Description
        if (item.description && typeof item.description === 'string' && item.description.trim().length > 15 && !extractedDescription) {
          extractedDescription = decodeHtmlEntities(item.description);
          sources.description = 'JSON-LD Product.description';
        }

        // Images
        if (item.image) {
          const addImg = (val: any) => {
            if (typeof val === 'string') addImageCandidate(val, 'JSON-LD Product.image');
            else if (Array.isArray(val)) val.forEach(addImg);
            else if (val && typeof val === 'object') {
              if (typeof val.url === 'string') addImageCandidate(val.url, 'JSON-LD Product.image');
              if (typeof val.contentUrl === 'string') addImageCandidate(val.contentUrl, 'JSON-LD Product.image');
            }
          };
          addImg(item.image);
        }

        // Price & Currency & Availability
        if (item.offers && !priceAvailable) {
          const offerList = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const off of offerList) {
            if (!off || typeof off !== 'object') continue;
            const candidatePrice = parseFloat(String(off.price || off.lowPrice || off.priceSpecification?.price || '').replace(/,/g, ''));
            if (!isNaN(candidatePrice) && candidatePrice > 0 && !priceAvailable) {
              extractedPrice = candidatePrice;
              priceAvailable = true;
              sources.price = 'JSON-LD Offer.price';
            }
            if (off.priceCurrency && typeof off.priceCurrency === 'string') {
              extractedCurrency = off.priceCurrency.trim().toUpperCase();
            }
            if (off.availability) {
              const avail = String(off.availability).toLowerCase();
              if (avail.includes('outofstock') || avail.includes('discontinued')) {
                extractedAvailability = 'Out of Stock';
              }
            }
          }
        }

        // Brand & Seller
        if (item.brand && !extractedBrand) {
          if (typeof item.brand === 'string') extractedBrand = decodeHtmlEntities(item.brand);
          else if (item.brand.name) extractedBrand = decodeHtmlEntities(String(item.brand.name));
        }
        if (item.seller?.name && !extractedSeller) {
          extractedSeller = decodeHtmlEntities(String(item.seller.name));
        }

        // Specifications
        if (Array.isArray(item.additionalProperty)) {
          for (const prop of item.additionalProperty) {
            if (prop && prop.name && prop.value) {
              rawSpecs.push({
                label: decodeHtmlEntities(String(prop.name)),
                value: decodeHtmlEntities(String(prop.value))
              });
            }
          }
        }
      }
    } catch {}
  });

  // ==========================================
  // LAYER 2: Open Graph & Twitter Card Meta Tags (Cheerio handles ANY attribute order)
  // ==========================================
  if (!extractedTitle) {
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="og:title"]').attr('content');
    if (ogTitle && ogTitle.trim()) {
      extractedTitle = decodeHtmlEntities(ogTitle);
      sources.title = 'Open Graph (og:title)';
    }
  }
  if (!extractedTitle) {
    const twTitle = $('meta[name="twitter:title"]').attr('content') || $('meta[property="twitter:title"]').attr('content');
    if (twTitle && twTitle.trim()) {
      extractedTitle = decodeHtmlEntities(twTitle);
      sources.title = 'Twitter Card (twitter:title)';
    }
  }

  // Description from OG / Meta / Twitter
  if (!extractedDescription) {
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="og:description"]').attr('content');
    if (ogDesc && ogDesc.trim() && ogDesc.length > 15) {
      extractedDescription = decodeHtmlEntities(ogDesc);
      sources.description = 'Open Graph (og:description)';
    }
  }
  if (!extractedDescription) {
    const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="description"]').attr('content');
    if (metaDesc && metaDesc.trim() && metaDesc.length > 15) {
      extractedDescription = decodeHtmlEntities(metaDesc);
      sources.description = 'HTML Meta Description (meta[name="description"])';
    }
  }
  if (!extractedDescription) {
    const twDesc = $('meta[name="twitter:description"]').attr('content') || $('meta[property="twitter:description"]').attr('content');
    if (twDesc && twDesc.trim() && twDesc.length > 15) {
      extractedDescription = decodeHtmlEntities(twDesc);
      sources.description = 'Twitter Card (twitter:description)';
    }
  }

  // Images from OG & Twitter & Itemprop
  const ogImages = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[property="og:image:secure_url"]').attr('content'),
    $('meta[property="og:image:url"]').attr('content'),
    $('meta[name="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('meta[property="twitter:image"]').attr('content'),
    $('meta[name="twitter:image:src"]').attr('content'),
    $('meta[itemprop="image"]').attr('content'),
    $('link[rel="image_src"]').attr('href')
  ];
  for (const oImg of ogImages) {
    if (oImg) addImageCandidate(oImg, 'Open Graph / Twitter Card Image');
  }

  // Price from OG
  if (!priceAvailable) {
    const ogPrice = $('meta[property="product:price:amount"]').attr('content') ||
                    $('meta[property="og:price:amount"]').attr('content') ||
                    $('meta[name="product:sale_price:amount"]').attr('content');
    if (ogPrice) {
      const pVal = parseFloat(ogPrice.replace(/,/g, ''));
      if (!isNaN(pVal) && pVal > 0) {
        extractedPrice = pVal;
        priceAvailable = true;
        sources.price = 'Open Graph (product:price:amount)';
      }
    }
  }

  // Currency from OG
  const ogCurr = $('meta[property="product:price:currency"]').attr('content') || $('meta[property="og:price:currency"]').attr('content');
  if (ogCurr) extractedCurrency = ogCurr.trim().toUpperCase();

  const ogSite = $('meta[property="og:site_name"]').attr('content');
  if (ogSite && !extractedSeller) extractedSeller = decodeHtmlEntities(ogSite);

  const ogBrand = $('meta[property="product:brand"]').attr('content') || $('meta[name="brand"]').attr('content');
  if (ogBrand && !extractedBrand) extractedBrand = decodeHtmlEntities(ogBrand);

  // ==========================================
  // LAYER 3: URL Parameters (TikTok og_info & similar)
  // ==========================================
  try {
    const urlObj = new URL(finalResolvedProductUrl);
    const ogInfoParam = urlObj.searchParams.get('og_info');
    if (ogInfoParam) {
      const parsedOg = JSON.parse(ogInfoParam);
      if (parsedOg.title && !extractedTitle) {
        extractedTitle = decodeHtmlEntities(parsedOg.title);
        sources.title = 'URL Destination Parameter (og_info.title)';
      }
      if (parsedOg.image) {
        addImageCandidate(parsedOg.image, 'URL Destination Parameter (og_info.image)');
      }
    }
  } catch {}

  // ==========================================
  // LAYER 4: Embedded Serialized Application State (Next.js, Nuxt, React, Modern SSR)
  // ==========================================
  const embeddedResults = {
    titles: [] as string[],
    descriptions: [] as string[],
    images: [] as string[],
    prices: [] as number[],
    currencies: [] as string[],
    brands: [] as string[],
    sellers: [] as string[]
  };

  $('script').each((_, el) => {
    const scriptType = $(el).attr('type') || '';
    const scriptId = $(el).attr('id') || '';
    const content = $(el).text().trim();

    if (!content) return;

    if (
      scriptType.includes('json') ||
      scriptId.includes('__NEXT_DATA__') ||
      scriptId.includes('__NUXT__') ||
      scriptId.includes('__MODERN_') ||
      scriptId.includes('state') ||
      content.startsWith('{') ||
      content.includes('ShopifyAnalytics') ||
      content.includes('var meta =')
    ) {
      // Direct JSON parse attempt
      try {
        const parsed = JSON.parse(content);
        recursivelySearchJson(parsed, embeddedResults);
      } catch {
        // Regex extract JSON assignment
        const matchAssign = content.match(/(?:var\s+meta\s*=|ShopifyAnalytics\.meta\s*=|window\.__INITIAL_STATE__\s*=|window\.__PRELOADED_STATE__\s*=)\s*(\{[\s\S]*?\});/i);
        if (matchAssign && matchAssign[1]) {
          try {
            const parsedObj = JSON.parse(matchAssign[1]);
            recursivelySearchJson(parsedObj, embeddedResults);
          } catch {}
        }
      }
    }
  });

  // Apply embedded state fallbacks
  if (!extractedTitle && embeddedResults.titles.length > 0) {
    extractedTitle = decodeHtmlEntities(embeddedResults.titles[0]);
    sources.title = 'Embedded Application State (script JSON)';
  }
  if (!extractedDescription && embeddedResults.descriptions.length > 0) {
    extractedDescription = decodeHtmlEntities(embeddedResults.descriptions[0]);
    sources.description = 'Embedded Application State (script JSON)';
  }
  if (!priceAvailable && embeddedResults.prices.length > 0) {
    extractedPrice = embeddedResults.prices[0];
    priceAvailable = true;
    sources.price = 'Embedded Application State (script JSON)';
  }
  if (embeddedResults.images.length > 0) {
    for (const embImg of embeddedResults.images) {
      addImageCandidate(embImg, 'Embedded Application State (script JSON)');
    }
  }
  if (!extractedBrand && embeddedResults.brands.length > 0) {
    extractedBrand = decodeHtmlEntities(embeddedResults.brands[0]);
  }
  if (!extractedSeller && embeddedResults.sellers.length > 0) {
    extractedSeller = decodeHtmlEntities(embeddedResults.sellers[0]);
  }

  // ==========================================
  // LAYER 5: HTML Document & Heading / Container Fallbacks
  // ==========================================
  if (!extractedTitle) {
    const headingCandidate =
      $('#productTitle').text() ||
      $('.product-title').text() ||
      $('.pdp-title').text() ||
      $('[data-testid="product-title"]').text() ||
      $('h1.title').text() ||
      $('h1').first().text();

    if (headingCandidate && headingCandidate.trim()) {
      extractedTitle = decodeHtmlEntities(headingCandidate);
      sources.title = 'HTML Product Heading (h1)';
    }
  }

  if (!extractedTitle) {
    const pageTitle = $('title').text();
    if (pageTitle && pageTitle.trim()) {
      extractedTitle = decodeHtmlEntities(pageTitle);
      sources.title = 'HTML <title> tag';
    }
  }

  // Description HTML containers
  if (!extractedDescription) {
    const descContainer =
      $('#productDescription').text() ||
      $('.product-description').text() ||
      $('.productDescription').text() ||
      $('[itemprop="description"]').text() ||
      $('#feature-bullets').text() ||
      $('.pdp-description').text() ||
      $('.product-detail').text();

    if (descContainer && descContainer.trim() && descContainer.length > 25) {
      extractedDescription = decodeHtmlEntities(descContainer);
      sources.description = 'HTML Product Description Container';
    }
  }

  // Amazon Feature Bullets
  $('#feature-bullets li span.a-list-item').each((_, el) => {
    const bullet = decodeHtmlEntities($(el).text());
    if (bullet && bullet.length > 5 && !rawFeatures.includes(bullet)) {
      rawFeatures.push(bullet);
    }
  });

  // Price from HTML Elements
  if (!priceAvailable) {
    // Amazon selectors
    const azWhole = $('.a-price-whole').first().text();
    const azFraction = $('.a-price-fraction').first().text() || '00';
    if (azWhole) {
      const p = parseFloat(`${azWhole.replace(/[^0-9]/g, '')}.${azFraction.replace(/[^0-9]/g, '')}`);
      if (!isNaN(p) && p > 0) {
        extractedPrice = p;
        priceAvailable = true;
        sources.price = 'HTML Price Element (.a-price-whole)';
      }
    }

    if (!priceAvailable) {
      const directPriceEl = $('#priceblock_ourprice').text() || $('#priceblock_dealprice').text() || $('.a-offscreen').first().text() || $('.pdp-price').text();
      if (directPriceEl) {
        const val = parseFloat(directPriceEl.replace(/[^0-9.]/g, ''));
        if (!isNaN(val) && val > 0) {
          extractedPrice = val;
          priceAvailable = true;
          sources.price = 'HTML Price Element';
        }
      }
    }

    // TikTok Shop price selectors
    if (!priceAvailable && detectedPlatform.platform === 'TikTok Shop') {
      const lineThrough = $('.line-through').first().text();
      if (lineThrough) {
        const match = lineThrough.match(/₱\s*([0-9]+(?:\.[0-9]{2})?)/);
        if (match) {
          extractedPrice = parseFloat(match[1]);
          priceAvailable = true;
          sources.price = `TikTok Shop Element (${lineThrough.trim()})`;
        }
      }
    }

    // Generic visible price regex in HTML text
    if (!priceAvailable) {
      const matches = [...htmlText.matchAll(/(?:₱|PHP|\$|US\s*\$)\s*([0-9,]+(?:\.[0-9]{2})?)/g)];
      for (const m of matches) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val < 500000) {
          extractedPrice = val;
          priceAvailable = true;
          sources.price = `Page Currency Text Pattern (${m[0]})`;
          break;
        }
      }
    }
  }

  // ==========================================
  // LAYER 6: Comprehensive Image Scraping (Tags & CDN Patterns)
  // ==========================================
  $('img').each((_, el) => {
    const candidates = [
      $(el).attr('data-old-hires'),
      $(el).attr('data-zoom-image'),
      $(el).attr('data-large-image'),
      $(el).attr('data-origin-src'),
      $(el).attr('data-src'),
      $(el).attr('src')
    ];

    for (const c of candidates) {
      if (c) addImageCandidate(c, 'HTML <img> Tag');
    }

    // Check srcset
    const srcset = $(el).attr('srcset') || $(el).attr('data-srcset');
    if (srcset) {
      const parts = srcset.split(',').map(s => s.trim().split(' ')[0]);
      for (const p of parts) {
        if (p) addImageCandidate(p, 'HTML <img> srcset');
      }
    }
  });

  // Preload links
  $('link[rel="preload"][as="image"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) addImageCandidate(href, 'HTML <link rel="preload">');
  });

  // Regex scan for known high-res CDN images
  const cdnRegex = /https?:\/\/[a-zA-Z0-9.-]*(?:ibyteimg\.com|byteoversea\.com|susercontent\.com|shopee\.[a-z.]+|alicdn\.com|media-amazon\.com|shopify\.com|etsystatic\.com|ebayimg\.com)\/[^\s"'<>\\]+/gi;
  let cdnMatch;
  while ((cdnMatch = cdnRegex.exec(htmlText)) !== null) {
    addImageCandidate(cdnMatch[0], 'Embedded CDN Image URL');
  }

  // Gallery images organization
  const mainProductImage = rawImages.length > 0 ? rawImages[0] : '';
  const galleryImages = rawImages.slice(0, 15); // Up to 15 high-res gallery images

  if (galleryImages.length > 1) {
    sources.gallery = `Extracted ${galleryImages.length} images from page source, tags & scripts`;
  } else if (galleryImages.length === 1) {
    sources.gallery = '1 image detected';
  } else {
    sources.gallery = 'No images detected';
  }

  // ==========================================
  // LAYER 7: AI Normalization Layer (Strictly Non-Hallucinatory)
  // ==========================================
  let cleanTitle = extractedTitle;
  let cleanDescription = extractedDescription;
  let finalFeatures = rawFeatures;
  let finalSpecs = rawSpecs;
  let aiCleaned = false;

  if (aiNormalizer && (extractedTitle || extractedDescription)) {
    try {
      const aiRes = await aiNormalizer({
        title: extractedTitle,
        description: extractedDescription,
        brand: extractedBrand,
        seller: extractedSeller,
        price: extractedPrice,
        platform: detectedPlatform.platformName,
        specs: rawSpecs,
        features: rawFeatures
      });
      cleanTitle = aiRes.cleanTitle || extractedTitle;
      cleanDescription = aiRes.cleanDescription || extractedDescription;
      finalFeatures = aiRes.keyFeatures || rawFeatures;
      finalSpecs = aiRes.specifications || rawSpecs;
      aiCleaned = aiRes.aiCleaned;
    } catch {}
  } else {
    // Deterministic cleaning fallback
    cleanTitle = extractedTitle
      .replace(/^\[[^\]]+\]\s*/g, '')
      .replace(/^【[^】]+】\s*/g, '')
      .replace(/^(?:HOT SALE!?|BEST SELLER!?|NEW ARRIVAL!?|100% ORIGINAL!?|BUY \d TAKE \d!?|ORIGINAL!?|READY STOCK!?)\s*[-|:]?\s*/i, '')
      .trim();
  }

  const isPriceValid = priceAvailable && typeof extractedPrice === 'number' && extractedPrice > 0;

  return {
    productName: cleanTitle || extractedTitle || '',
    title: cleanTitle || extractedTitle || '',
    name: cleanTitle || extractedTitle || '',
    productDescription: cleanDescription || extractedDescription || '',
    description: cleanDescription || extractedDescription || '',
    sourceDescription: extractedDescription || '',
    aiNormalizedDescription: cleanDescription || '',
    price: isPriceValid ? extractedPrice : null,
    priceAvailable: isPriceValid,
    priceStatus: isPriceValid ? 'available' : 'unavailable',
    currency: extractedCurrency,
    primaryImage: mainProductImage,
    mainProductImage,
    image: mainProductImage,
    galleryImages,
    images: galleryImages,
    brand: extractedBrand,
    seller: extractedSeller,
    sellerName: extractedSeller,
    specifications: finalSpecs,
    keyFeatures: finalFeatures,
    availability: extractedAvailability,
    platform: detectedPlatform.platform,
    platformName: detectedPlatform.platformName,
    affiliatePlatform: detectedPlatform.platformName,
    originalAffiliateUrl: rawUrl,
    affiliateUrl: rawUrl,
    finalResolvedProductUrl,
    resolvedProductUrl: finalResolvedProductUrl,
    resolvedUrl: finalResolvedProductUrl,
    aiCleaned,
    isBlockedOrRequiresManual,
    sources,
    extractionStatus: {
      productName: Boolean((cleanTitle || extractedTitle || '').trim()),
      productImage: Boolean(mainProductImage),
      galleryCount: galleryImages.length,
      price: isPriceValid,
      description: Boolean((cleanDescription || extractedDescription || '').trim()),
      seller: Boolean(extractedSeller),
      brand: Boolean(extractedBrand)
    },
    note: isBlockedOrRequiresManual
      ? '⚠️ Unable to automatically read this product page. (Manual entry fallback available.)'
      : (extractedTitle ? 'Extracted complete product information.' : 'Manual entry fallback available.')
  };
}
