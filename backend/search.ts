export interface SearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
  publishedAt?: string;
}

export interface WebSearchProvider {
  search(query: string): Promise<SearchResult[]>;
  searchNews(query: string): Promise<SearchResult[]>;
  searchImages(query: string): Promise<SearchResult[]>;
  fetchPage(url: string): Promise<string>;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export class BraveSearchProvider implements WebSearchProvider {
  constructor(private readonly apiKey: string) {}

  private async request(query: string, freshness?: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query, count: '6', safesearch: 'moderate' });
    if (freshness) params.set('freshness', freshness);
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': this.apiKey },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
    const data = await response.json() as { web?: { results?: Array<{ title?: string; url?: string; description?: string; age?: string }> } };
    return (data.web?.results || []).filter(item => item.title && item.url).map(item => ({
      title: item.title!,
      url: item.url!,
      description: item.description || '',
      domain: domainOf(item.url!),
      publishedAt: item.age
    }));
  }

  search(query: string) {
    return this.request(query);
  }

  searchNews(query: string) {
    return this.request(query, 'week');
  }

  searchImages(_query: string) {
    return Promise.resolve([]);
  }

  async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Nexa/1.0' } });
    if (!response.ok) throw new Error(`Page returned ${response.status}`);
    const html = await response.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
  }
}

export function createSearchProvider(env: Record<string, string | undefined>): WebSearchProvider | null {
  if (env.WEB_SEARCH_PROVIDER === 'brave' && env.WEB_SEARCH_API_KEY) return new BraveSearchProvider(env.WEB_SEARCH_API_KEY);
  return null;
}