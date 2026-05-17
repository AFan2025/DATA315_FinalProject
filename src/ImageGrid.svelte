<script>
  let {
    images = [],
    loading = false,
    error = '',
    totalAboveThreshold = 0,
    latencyMs = 0,
  } = $props();
</script>

<div class="grid-container">
  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if images.length > 0 || loading}
    <div class="status-bar">
      {#if loading}
        <span class="status-text">Searching…</span>
      {:else}
        <span class="status-text">
          <strong>{images.length}</strong> shown of
          <strong>{totalAboveThreshold.toLocaleString()}</strong> matches
        </span>
        <span class="latency">{latencyMs}ms</span>
      {/if}
    </div>
  {/if}

  {#if loading && images.length === 0}
    <div class="skeleton-grid">
      {#each { length: 12 } as _}
        <div class="skeleton-card"></div>
      {/each}
    </div>
  {:else if images.length === 0 && !error}
    <div class="empty">
      <div class="empty-icon">🔍</div>
      <p class="empty-title">No results yet</p>
      <p class="empty-sub">Add concepts in the query builder and adjust weights to search the dataset.</p>
    </div>
  {:else}
    <div class="grid" class:dimmed={loading}>
      {#each images as img (img.image_id)}
        <div class="card">
          <div class="card-img">
            <img
              src={img.url}
              alt="Image {img.image_id}"
              loading="lazy"
              onerror={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement.classList.add('broken');
              }}
            />
          </div>
          <div class="card-footer">
            <span class="score" title="Cosine similarity">{img.score.toFixed(3)}</span>
            <span class="img-id" title="Image ID">#{img.image_id}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .grid-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--text-secondary);
    padding: 4px 0;
  }

  .latency {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--bg-muted);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .error-banner {
    color: var(--error);
    background: var(--error-bg);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }

  .card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-panel);
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.15s;
  }

  .card:hover {
    box-shadow: var(--shadow);
  }

  .card-img {
    aspect-ratio: 1;
    background: var(--bg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  :global(.card-img.broken) {
    color: var(--text-secondary);
    font-size: 12px;
  }

  :global(.card-img.broken)::after {
    content: 'Failed to load';
    font-size: 11px;
    color: var(--text-secondary);
  }

  .card-footer {
    padding: 4px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    font-family: var(--font-mono);
    border-top: 1px solid var(--border);
  }

  .score {
    font-weight: 600;
    color: var(--accent);
  }

  .img-id {
    color: var(--text-secondary);
  }

  /* skeleton */

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }

  .skeleton-card {
    aspect-ratio: 1;
    border-radius: var(--radius);
    background: linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-hover) 50%, var(--bg-muted) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* empty state */

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-heading);
    margin-bottom: 6px;
  }

  .empty-sub {
    color: var(--text-secondary);
    font-size: 13px;
    max-width: 320px;
  }
</style>
