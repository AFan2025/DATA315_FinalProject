import requests
import matplotlib.pyplot as plt
from PIL import Image
from io import BytesIO
import json
import numpy as np
import scipy.sparse
import faiss
import os
import sys

DATA_PATH = "../data/"

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

# Query helpers — this is the logic the backend will run

def build_query_vector(concept_weights: dict) -> np.ndarray:
    """Weighted sum of concept CLIP embeddings, L2-normalised."""
    q = np.zeros(512, dtype=np.float32)
    missing = []
    for concept, weight in concept_weights.items():
        idx = vocab_index.get(concept)
        if idx is not None:
            q += weight * concept_embeddings[idx]
        else:
            missing.append(concept)
    if missing:
        print(f"  Not in vocabulary: {missing}")
    norm = np.linalg.norm(q)
    return q / norm if norm > 0 else q


def retrieve(concept_weights: dict, k: int = 20, threshold: float = 0.25):
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
        display_results.append({
            "image_id": img_id,
            "score": float(score),
            "url": image_urls[str(img_id)],
            "row": int(idx),
        })

    print(f"  {len(all_idx):,} images above threshold={threshold} (showing top {min(k, len(all_idx))})")
    return display_results, list(all_idx)


def top_concepts(retrieved_rows: list[int], query_concepts: dict, top_n: int = 15):
    """Return top concepts by mean SpLiCE weight in the retrieved set.

    Sorted by mean weight (correlation). Enrichment ratio vs baseline shown
    as secondary info but does not affect ordering.
    """
    sub = splice_weights[retrieved_rows].toarray()  # [N, V]
    mean_w = sub.mean(axis=0)                        # [V]

    for concept in query_concepts:
        if concept in vocab_index:
            mean_w[vocab_index[concept]] = 0.0

    top = mean_w.argsort()[::-1][:top_n]
    out = []
    for i in top:
        if mean_w[i] <= 0:
            break
        base = float(concept_frequencies[i])
        ratio = mean_w[i] / base if base > 0 else None
        out.append({
            "concept":     vocab[i],
            "mean_weight": float(mean_w[i]),
            "base_freq":   base,
            "ratio":       ratio,
        })
    return out

def show_results(results, concept_weights, n_cols=5):
    k = len(results)
    n_rows = (k + n_cols - 1) // n_cols
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(3 * n_cols, 3 * n_rows))
    axes = np.array(axes).flatten()

    for ax, res in zip(axes, results):
        try:
            resp = requests.get(res["url"], timeout=5)
            img  = Image.open(BytesIO(resp.content)).convert("RGB")
            ax.imshow(img)
        except Exception:
            ax.set_facecolor("#eee")
        ax.set_title(f"{res['score']:.3f}", fontsize=8)
        ax.axis("off")

    for ax in axes[k:]:
        ax.axis("off")

    query_str = ", ".join(f"{c}: {w}" for c, w in concept_weights.items())
    fig.suptitle(f"Query: {{{query_str}}}", fontsize=11)
    plt.tight_layout()
    plt.show()


def show_top_concepts(concepts):
    print(f"{'Concept':25s}  {'Mean weight':>11s}  {'vs baseline':>11s}")
    print("-" * 52)
    for c in concepts:
        ratio_str = f"{c['ratio']:.2f}x" if c["ratio"] is not None else "   n/a"
        print(f"{c['concept']:25s}  {c['mean_weight']:11.4f}  {ratio_str:>11s}")

