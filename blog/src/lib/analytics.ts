const CF_API_TOKEN = import.meta.env.CLOUDFLARE_ANALYTICS_TOKEN;
const CF_ZONE_ID = import.meta.env.CLOUDFLARE_ZONE_ID;
const BLOG_HOST = 'blog.unratified.org';
const DAYS_TO_QUERY = 7;

interface PopularPost {
  slug: string;
  views: number;
}

export async function getPopularPosts(limit = 5): Promise<PopularPost[]> {
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    return [];
  }

  const totals = new Map<string, number>();
  const now = new Date();

  // Query day by day (CF adaptive groups limited to 1-day range per query)
  const fetches = [];
  for (let i = 0; i < DAYS_TO_QUERY; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    fetches.push(fetchDay(dateStr));
  }

  const results = await Promise.allSettled(fetches);
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    for (const [slug, count] of r.value) {
      totals.set(slug, (totals.get(slug) ?? 0) + count);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, views]) => ({ slug, views }));
}

async function fetchDay(date: string): Promise<Map<string, number> | null> {
  try {
    const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          viewer {
            zones(filter: { zoneTag: "${CF_ZONE_ID}" }) {
              httpRequestsAdaptiveGroups(
                filter: {
                  date: "${date}"
                  clientRequestHTTPHost: "${BLOG_HOST}"
                  requestSource: "eyeball"
                }
                limit: 50
                orderBy: [count_DESC]
              ) {
                count
                dimensions { clientRequestPath }
              }
            }
          }
        }`,
      }),
    });

    const json = await resp.json() as any;
    const groups = json?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;
    if (!groups) return null;

    const counts = new Map<string, number>();
    for (const g of groups) {
      const path: string = g.dimensions.clientRequestPath;
      if (!/^\/\d{4}-\d{2}-\d{2}-/.test(path)) continue;
      const slug = path.replace(/\/$/, '').slice(1);
      counts.set(slug, (counts.get(slug) ?? 0) + g.count);
    }
    return counts;
  } catch {
    return null;
  }
}
