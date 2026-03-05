interface Env {
  UNSPLASH_ACCESS_KEY: string;
}

interface UnsplashPhoto {
  urls: { raw: string; regular: string };
  user: { name: string; links: { html: string } };
  links: { html: string };
  description: string | null;
  alt_description: string | null;
}

async function handleRequest(context: { env: Env; request: Request }) {
  const { env } = context;
  const apiKey = env.UNSPLASH_ACCESS_KEY;

  if (!apiKey) {
    return new Response('UNSPLASH_ACCESS_KEY not configured', { status: 500 });
  }

  const unsplashUrl = new URL('https://api.unsplash.com/photos/random');
  unsplashUrl.searchParams.set('query', 'human rights');
  unsplashUrl.searchParams.set('orientation', 'landscape');
  unsplashUrl.searchParams.set('content_filter', 'high');

  const apiResponse = await fetch(unsplashUrl.toString(), {
    headers: {
      Authorization: `Client-ID ${apiKey}`,
      'Accept-Version': 'v1',
    },
  });

  if (!apiResponse.ok) {
    return new Response('Unsplash API error', { status: 502 });
  }

  const photo: UnsplashPhoto = await apiResponse.json();

  // Request a 1200x630 crop — ideal OG image dimensions
  const imageUrl = `${photo.urls.raw}&w=1200&h=630&fit=crop&crop=entropy&auto=format&q=80`;

  // Trigger Unsplash download tracking (required by API guidelines)
  // Fire-and-forget — don't block the response
  void fetch(`https://api.unsplash.com/photos/${extractPhotoId(photo.urls.raw)}/download`, {
    headers: { Authorization: `Client-ID ${apiKey}` },
  }).catch(() => {});

  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    return new Response('Failed to fetch image', { status: 502 });
  }

  const imageBody = imageResponse.body;
  const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';

  return new Response(imageBody, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      'X-Photo-By': photo.user.name,
      'X-Photo-Url': photo.links.html,
      'X-Photographer-Url': photo.user.links.html,
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const onRequestGet = handleRequest;
export const onRequestHead = handleRequest;

function extractPhotoId(rawUrl: string): string {
  // raw URL: https://images.unsplash.com/photo-XXXXX?ixid=...
  const match = rawUrl.match(/photo-([a-zA-Z0-9_-]+)/);
  return match ? `photo-${match[1]}` : '';
}
