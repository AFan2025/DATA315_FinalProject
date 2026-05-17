from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import scipy.sparse
import faiss
import os
import json

app = FastAPI(title="slice-backend-api", version="1.0.0")

DATA_PATH = "data"

clip_embeddings     = np.load(os.path.join(DATA_PATH, "clip_embeddings.npy"))
concept_embeddings  = np.load(os.path.join(DATA_PATH, "concept_embeddings.npy"))
concept_frequencies = np.load(os.path.join(DATA_PATH, "concept_frequencies.npy"))
image_ids           = np.load(os.path.join(DATA_PATH, "image_ids.npy"))
splice_weights      = scipy.sparse.load_npz(os.path.join(DATA_PATH, "splice_weights.npz"))
faiss_index         = faiss.read_index(os.path.join(DATA_PATH, "faiss.index"))

with open(os.path.join(DATA_PATH, "vocabulary.json")) as f:
    vocab = json.load(f)
with open(os.path.join(DATA_PATH, "image_urls.json")) as f:
    image_urls = json.load(f)

vocab_index = {word: i for i, word in enumerate(vocab)}  # fast lookup

class Image(BaseModel):
    image_id: str
    score: float
    url: str
    row: int

class Concept(BaseModel):
    concept: str
    mean_weight: float
    base_freq: float
    ratio: Optional[float] = None

class ConceptWeights(BaseModel):
    concept_weights: dict

class SearchResponse(BaseModel):
    display_results: List[Image]
    top_concepts: List[Concept]
    total_above_threshold: int

def build_query_vector(input_weights: ConceptWeights) -> np.ndarray:
    """Weighted sum of concept CLIP embeddings, L2-normalised."""
    q = np.zeros(512, dtype=np.float32)
    missing = []
    for concept, weight in input_weights.concept_weights.items():
        idx = vocab_index.get(concept)
        if idx is not None:
            q += weight * concept_embeddings[idx]
        else:
            missing.append(concept)
    if missing:
        print(f"  Not in vocabulary: {missing}")
    norm = np.linalg.norm(q)
    if norm == 0:
        raise ValueError("Query vector is zero. All concepts missing or weights invalid.")
    return q / norm

def retrieve(concept_weights: ConceptWeights, k: int = 20, threshold: float = 0.25):
    """Return top-k display results and all above-threshold rows for concept analysis.

    Returns:
        display_results: list of top-k dicts with image_id, score, url, row
        all_rows: list of all row indices with cosine similarity >= threshold
                  (used for stable concept statistics over a larger pool)
    """
    q = build_query_vector(concept_weights)

    # Fetch all images above the threshold for stable concept stats
    lims, distances, indices = faiss_index.range_search(q[None], threshold)
    all_idx = indices[lims[0]:lims[1]]
    all_scores = distances[lims[0]:lims[1]]

    # Sort descending by score
    order = np.argsort(all_scores)[::-1]
    all_idx = all_idx[order]
    all_scores = all_scores[order]

    # Build display results from top-k
    display_results = []
    for score, idx in zip(all_scores[:k], all_idx[:k]):
        img_id = int(image_ids[idx])
        output_img = Image(
            image_id=str(img_id),
            score=float(score),
            url=image_urls[str(img_id)],
            row=int(idx)
        )
        display_results.append(output_img)

    return {
        'display_results': display_results,
        'threshold_count': list(all_idx)
    }

def top_concepts(retrieved_rows: list[int], query_concepts: ConceptWeights, top_n: int = 15) -> List[Concept]: 
    """Return top concepts by mean SpLiCE weight in the retrieved set.

    Sorted by mean weight (correlation). Enrichment ratio vs baseline shown
    as secondary info but does not affect ordering.
    """
    sub = splice_weights[retrieved_rows].toarray()  # [N, V]
    mean_w = sub.mean(axis=0)                        # [V]

    for concept in query_concepts.concept_weights:
        if concept in vocab_index:
            mean_w[vocab_index[concept]] = 0.0

    top = mean_w.argsort()[::-1][:top_n]
    out = []
    for i in top:
        if mean_w[i] <= 0:
            break
        base = float(concept_frequencies[i])
        ratio = mean_w[i] / base if base > 0 else None
        out.append(Concept(
            concept=vocab[i],
            mean_weight=float(mean_w[i]),
            base_freq=base,
            ratio=ratio,
        ))
    return out

@app.post("/search")
async def search(input_weights: ConceptWeights, k: int = 20, threshold: float = 0.25):
    return retrieve(input_weights, k, threshold)

@app.get("/autocomplete")
async def autocomplete(query: str, limit: int = 10):
    """Return a list of vocabulary words matching the query."""
    matches = [word for word in vocab_index if word.startswith(query.lower())]
    matches.sort(key=len)
    return {"query": query, "matches": matches[:limit]}

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

    
