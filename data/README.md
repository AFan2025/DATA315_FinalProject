# splice_viz/data — Precomputed Artifacts

This directory is **gitignored**. Populate it by running `notebooks/precompute.ipynb` on Colab,
then upload the results to HuggingFace and download them here before starting the server.

## Files

| File | Shape / type | Load with | Description |
|---|---|---|---|
| `clip_embeddings.npy` | `[N, 512]` float32 | `numpy.load` | L2-normalised CLIP ViT-B/32 image embeddings |
| `concept_embeddings.npy` | `[V, 512]` float32 | `numpy.load` | CLIP text embeddings for each vocab concept |
| `splice_weights.npz` | `[N, V]` sparse float32 | `scipy.sparse.load_npz` | SpLiCE concept weights per image |
| `concept_frequencies.npy` | `[V]` float32 | `numpy.load` | Fraction of dataset images where each concept is active |
| `vocabulary.json` | list of V strings | `json.load` | Concept names; index i corresponds to column i in the matrices |
| `image_ids.npy` | `[N]` int64 | `numpy.load` | COCO image IDs; index i corresponds to row i in the matrices |
| `image_urls.json` | dict str→str | `json.load` | Maps str(image_id) → COCO image URL |
| `faiss.index` | FAISS IndexFlatIP | `faiss.read_index` | Exact cosine-similarity index over clip_embeddings |

N = 118,287 (COCO train2017).  V = 10,000 (top LAION concepts).

## Key invariants

- All matrices share the same row order. Row i in `clip_embeddings`, `splice_weights`, and `image_ids[i]` all refer to the same image.
- All concept vectors share the same column order. Column j in `concept_embeddings`, `splice_weights`, and `vocabulary[j]` all refer to the same concept.
- `clip_embeddings` rows are L2-normalised — cosine similarity equals dot product.
- `faiss.index` was built from `clip_embeddings` in the same row order, so `index.search(q, k)` returns indices directly into the above arrays.

## Query logic (for the backend)

```python
# 1. Build query vector from user concept weights
query_vec = sum(weight * concept_embeddings[vocab.index(concept)]
                for concept, weight in user_query.items()
                if concept in vocab)
query_vec /= numpy.linalg.norm(query_vec)

# 2. Retrieve top-k images
scores, indices = faiss_index.search(query_vec[None], k=20)
retrieved_image_ids = image_ids[indices[0]]
retrieved_urls = [image_urls[str(id)] for id in retrieved_image_ids]

# 3. Compute enrichment
retrieved_freq = (splice_weights[indices[0]] > 0).mean(axis=0)   # [V]
enrichment = retrieved_freq / concept_frequencies                  # [V]
# mask query concepts and rare baseline concepts, then rank descending
```

## Server dependencies

The backend needs only:
```
numpy
scipy
faiss-cpu
fastapi
uvicorn
```

No PyTorch, no CLIP, no SpLiCE at serve time.
