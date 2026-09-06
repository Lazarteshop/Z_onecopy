import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://vt.tiktok.com/ZS9SNbnEtHd7Y-7wb2l/';
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,fil;q=0.8',
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Final URL:', res.url);
  const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="og:title"]').attr('content') || $('title').text();
  console.log('Title:', ogTitle);

  const ogImg = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content') || $('meta[property="twitter:image"]').attr('content');
  console.log('OG Image:', ogImg);

  const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('meta[property="twitter:description"]').attr('content');
  console.log('OG Desc:', ogDesc);

  // Search JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text().trim());
      console.log('Found JSON-LD:', typeof data);
    } catch {}
  });

  // Search for images in page
  const foundImages: string[] = [];
  if (ogImg) foundImages.push(ogImg);

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-origin-src');
    if (src && !foundImages.includes(src)) foundImages.push(src);
  });

  // Script image regex
  const regex = /https?:\/\/[a-zA-Z0-9.-]*ibyteimg\.com\/[^\s"'<>\\]+/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let clean = match[0].replace(/&amp;/g, '&');
    if (!foundImages.includes(clean)) foundImages.push(clean);
  }

  console.log('Total images found:', foundImages.length);
  console.log('Sample images:', foundImages.slice(0, 4));
}

test().catch(console.error);
