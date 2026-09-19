import express from 'express';
import { createSearchProvider, type SearchResult } from './search';

const app = express();
const port = Number(process.env.API_PORT || 4000);
const searchProvider = createSearchProvider(process.env);
const requestTimes: number[] = [];

app.use(express.json({ limit: '1mb' }));

function needsWebSearch(input: string): boolean {
  return /\b(latest|current|today|now|recent|this week|weather|price|version|news|happened|search|google|internet|online|check)\b/i.test(input);
}

function trimSearchQuery(input: string): string {
  return input.replace(/\b(bhai|please|batao|bata|karke|kar|ke|mujhe|tell me|search|google|internet|online|check)\b/gi, ' ').replace(/\s+/g, ' ').trim();
}

function rateLimited(): boolean {
  const now = Date.now();
  while (requestTimes[0] && requestTimes[0] < now - 60_000) requestTimes.shift();
  if (requestTimes.length >= 30) return true;
  requestTimes.push(now);
  return false;
}

async function generateWithGemini(input: string, history: Array<{ role: 'user' | 'assistant'; content: string }>, sources: SearchResult[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('AI service is not configured');
  const sourceContext = sources.length
    ? `\n\nLive web sources (use only these for current claims):\n${sources.map(source => `- ${source.title} (${source.url}): ${source.description}`).join('\n')}`
    : '';
  const contents = [
    ...history.slice(-12).map(turn => ({ role: turn.role === 'assistant' ? 'model' : 'user', parts: [{ text: turn.content }] })),
    { role: 'user', parts: [{ text: `${input}${sourceContext}` }] }
  ];
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.0-flash'}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: 'You are NEXA, a friendly natural conversational assistant. Understand English, Hindi, Hinglish, Roman Hindi, typos, and follow-up context. Answer directly and match the requested length. If live sources are provided, prioritize them and do not invent current facts or citations.' }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 800 } }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || 'I could not generate a response.';
}

app.post('/api/chat', async (request, response) => {
  if (rateLimited()) return response.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  const { input, history = [] } = request.body as { input?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> };
  if (!input?.trim()) return response.status(400).json({ error: 'A message is required.' });

  let sources: SearchResult[] = [];
  const shouldSearch = needsWebSearch(input);
  try {
    if (shouldSearch) {
      if (!searchProvider) return response.status(503).json({ error: 'Live internet search is currently unavailable.' });
      sources = await searchProvider.search(trimSearchQuery(input));
    }
    const answer = await generateWithGemini(input, history, sources);
    return response.json({ answer, sources, searched: shouldSearch });
  } catch (error) {
    console.error('Nexa API error:', error instanceof Error ? error.message : error);
    return response.status(502).json({ error: shouldSearch ? 'Live internet search is currently unavailable.' : 'Something went wrong. Please try again.' });
  }
});

app.post('/api/search', async (request, response) => {
  if (!searchProvider) return response.status(503).json({ error: 'Live internet search is currently unavailable.' });
  const query = String(request.body?.query || '').trim();
  if (!query) return response.status(400).json({ error: 'A search query is required.' });
  try {
    return response.json({ results: await searchProvider.search(query) });
  } catch {
    return response.status(502).json({ error: 'Live internet search is currently unavailable.' });
  }
});

app.listen(port, () => console.log(`Nexa API listening on http://localhost:${port}`));