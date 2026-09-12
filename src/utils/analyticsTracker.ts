// Client-side analytics tracking helper with deduplication and error tolerance

const viewedItems = new Set<string>();
const clickedProducts = new Set<string>();

export async function trackContentView(
  contentType: 'post' | 'reel' | 'challenge' | 'product',
  contentId: string,
  token?: string
): Promise<void> {
  if (!contentId) return;
  const key = `${contentType}:${contentId}`;
  if (viewedItems.has(key)) return; // Client-side session deduplication
  viewedItems.add(key);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/zone/analytics/view', {
      method: 'POST',
      headers,
      body: JSON.stringify({ contentType, contentId }),
      keepalive: true
    });
  } catch (err) {
    // Non-blocking silent fail
    console.debug('Analytics view tracking skipped:', err);
  }
}

export async function trackProductClick(
  productId: string,
  creatorId: string,
  sourceType?: 'post' | 'reel' | 'shop',
  sourceId?: string,
  token?: string
): Promise<void> {
  if (!productId || !creatorId) return;
  const key = `${productId}:${creatorId}`;
  if (clickedProducts.has(key)) return; // 1-click per session deduplication
  clickedProducts.add(key);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/zone/analytics/product-click', {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId, creatorId, sourceType, sourceId }),
      keepalive: true
    });
  } catch (err) {
    console.debug('Product click tracking skipped:', err);
  }
}
