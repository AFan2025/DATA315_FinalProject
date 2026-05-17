<script>
  let {
    images = [],
    loading = false,
    pageLoading = false,
    error = '',
    totalAboveThreshold = 0,
    latencyMs = 0,
    currentPage = 0,
    totalPages = 1,
    onPageChange = () => {},
    onImageClick = () => {},
  } = $props();

  let anyLoading = $derived(loading || pageLoading);
</script>

<div class="panel">
  <div class="panel-top">
    <div>
      <p class="panel-label">Retrieved Images</p>
      <h2>Inspect the current retrieved subset.</h2>
    </div>
    {#if anyLoading}
      <span class="status-badge">
        {loading ? 'Retrieving images…' : 'Loading page…'}
      </span>
    {:else if images.length > 0}
      <span class="status-badge quiet">
        {totalAboveThreshold.toLocaleString()} matches · {latencyMs}ms
      </span>
    {/if}
  </div>

  {#if error}
    <div class="error-card">{error}</div>
  {/if}

  <div class="panel-frame">
    {#if loading && images.length === 0}
      <div class="image-grid">
        {#each { length: 24 } as _}
          <div class="skeleton-card"></div>
        {/each}
      </div>
    {:else if images.length === 0 && !error && !loading}
      <div class="empty-card">
        Add a concept to begin exploring the dataset.
      </div>
    {:else}
      <div class="image-grid" class:dimmed={pageLoading && !loading}>
        {#each images as img (img.image_id)}
          <button class="img-card" onclick={() => onImageClick(img)} type="button">
            <div class="img-wrap">
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
            <div class="img-footer">
              <span class="score">{img.score.toFixed(3)}</span>
              <span class="img-id">#{img.image_id}</span>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if totalPages > 1}
    <nav class="pagination" aria-label="Result pages">
      <button
        class="page-btn"
        disabled={currentPage === 0 || anyLoading}
        onclick={() => onPageChange(currentPage - 1)}
      >← Prev</button>

      <span class="page-info">
        Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
      </span>

      <button
        class="page-btn"
        disabled={currentPage >= totalPages - 1 || anyLoading}
        onclick={() => onPageChange(currentPage + 1)}
      >Next →</button>
    </nav>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .panel-label {
    margin: 0 0 0.45rem;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.3;
    color: var(--text-heading);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 999px;
    background: var(--bg-muted);
    color: var(--text-secondary);
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .status-badge.quiet {
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }

  .error-card {
    border: 1px solid var(--error);
    border-radius: var(--radius-sm);
    padding: 0.8rem 1rem;
    color: var(--error);
    font-size: 0.9rem;
    background: var(--error-bg);
  }

  .panel-frame {
    min-height: 16rem;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.6rem;
  }

  @media (max-width: 1100px) {
    .image-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 768px) {
    .image-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .img-card {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--bg-panel);
    cursor: pointer;
    padding: 0;
    text-align: left;
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }

  .img-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-strong);
    box-shadow: 0 14px 28px rgba(31, 38, 34, 0.08);
  }

  .img-wrap {
    aspect-ratio: 1;
    background: var(--bg-muted);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .img-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  :global(.img-wrap.broken)::after {
    content: 'Failed to load';
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .img-footer {
    padding: 0.3rem 0.45rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
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

  .empty-card {
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 2rem 1rem;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.6;
    text-align: center;
  }

  /* skeleton — matches the 6-col grid */
  .skeleton-card {
    aspect-ratio: 1;
    border-radius: var(--radius-sm);
    background: linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-hover) 50%, var(--bg-muted) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @media (max-width: 1100px) {
    .skeleton-card:nth-child(n+17) { display: none; }
  }
  @media (max-width: 768px) {
    .skeleton-card:nth-child(n+9) { display: none; }
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding-top: 0.5rem;
  }

  .page-btn {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.55rem 1rem;
    background: var(--bg-panel);
    color: var(--text-heading);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
  }

  .page-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--border-strong);
    background: var(--bg-muted);
  }

  .page-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .page-info {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }
</style>
