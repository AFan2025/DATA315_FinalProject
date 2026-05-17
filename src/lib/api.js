const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * @param {Record<string, number>} conceptWeights
 * @param {{ k?: number, threshold?: number, offset?: number, signal?: AbortSignal }} [opts]
 */
export async function search(conceptWeights, { k = 20, threshold = 0.25, offset = 0, signal } = {}) {
  const res = await fetch(
    `${API_BASE}/search?k=${k}&threshold=${threshold}&offset=${offset}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept_weights: conceptWeights }),
      signal,
    },
  );
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return res.json();
}

/**
 * @param {string} query
 * @param {{ limit?: number, signal?: AbortSignal }} [opts]
 */
export async function autocomplete(query, { limit = 10, signal } = {}) {
  const res = await fetch(
    `${API_BASE}/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`,
    { signal },
  );
  if (!res.ok) throw new Error(`Autocomplete failed (${res.status})`);
  return res.json();
}
