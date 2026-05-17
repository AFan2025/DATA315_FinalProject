import { getMockConcepts, getMockRetrievalResults } from './mockData.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * @typedef {{ id: string, label: string }} ConceptOption
 * @typedef {{ id: string, label: string, weight: number }} ActiveConcept
 * @typedef {{ id: string, url: string, caption?: string, score?: number }} RetrievedImage
 * @typedef {{ id: string, label: string, meanWeight?: number, baselineWeight?: number, ratio?: number }} UnexpectedConcept
 * @typedef {{ images: RetrievedImage[], unexpectedConcepts: UnexpectedConcept[] }} RetrievalResponse
 */

/**
 * @param {string} query
 * @returns {Promise<ConceptOption[]>}
 */
export async function searchConcepts(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE}/concepts/search?q=${encodeURIComponent(trimmedQuery)}`
    );

    if (!response.ok) {
      throw new Error(`Concept search failed with status ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data
        .filter((item) => item?.id && item?.label)
        .map((item) => ({ id: String(item.id), label: String(item.label) }));
    }
  } catch (error) {
    try {
      const legacyResponse = await fetch(
        `${API_BASE}/autocomplete?query=${encodeURIComponent(trimmedQuery)}&limit=10`
      );
      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        if (Array.isArray(legacyData.matches)) {
          return legacyData.matches.map((value) => ({
            id: String(value),
            label: String(value),
          }));
        }
      }
    } catch (legacyError) {
      console.debug('Legacy concept search unavailable.', legacyError);
    }

    console.debug('Using mock concept search fallback.', error);
  }

  return getMockConcepts(trimmedQuery);
}

/**
 * @param {{ concepts: ActiveConcept[], topK?: number }} payload
 * @returns {Promise<RetrievalResponse>}
 */
export async function retrieveConceptResults(payload) {
  try {
    const response = await fetch(`${API_BASE}/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concepts: payload.concepts,
        topK: payload.topK ?? 12,
      }),
    });

    if (!response.ok) {
      throw new Error(`Retrieve failed with status ${response.status}`);
    }

    const data = await response.json();
    return sanitizeRetrievalResponse(data);
  } catch (error) {
    console.debug('Using mock retrieval fallback.', error);
    return getMockRetrievalResults(payload.concepts, payload.topK ?? 12);
  }
}

/**
 * @param {unknown} data
 * @returns {RetrievalResponse}
 */
function sanitizeRetrievalResponse(data) {
  const rawImages = Array.isArray(data?.images) ? data.images : [];
  const rawUnexpectedConcepts = Array.isArray(data?.unexpectedConcepts)
    ? data.unexpectedConcepts
    : [];

  return {
    images: rawImages.map((image) => ({
      id: String(image?.id ?? image?.image_id ?? 'unknown-image'),
      url: String(image?.url ?? ''),
      caption:
        typeof image?.caption === 'string'
          ? image.caption
          : typeof image?.image_id === 'string'
            ? image.image_id
            : '',
      score: Number.isFinite(image?.score) ? Number(image.score) : undefined,
    })),
    unexpectedConcepts: rawUnexpectedConcepts.map((concept) => ({
      id: String(concept?.id ?? concept?.concept ?? concept?.label ?? 'unknown-concept'),
      label: String(concept?.label ?? concept?.concept ?? concept?.id ?? 'Unknown concept'),
      meanWeight: Number.isFinite(concept?.meanWeight)
        ? Number(concept.meanWeight)
        : Number.isFinite(concept?.mean_weight)
          ? Number(concept.mean_weight)
          : undefined,
      baselineWeight: Number.isFinite(concept?.baselineWeight)
        ? Number(concept.baselineWeight)
        : Number.isFinite(concept?.base_freq)
          ? Number(concept.base_freq)
          : undefined,
      ratio: Number.isFinite(concept?.ratio) ? Number(concept.ratio) : undefined,
    })),
  };
}
