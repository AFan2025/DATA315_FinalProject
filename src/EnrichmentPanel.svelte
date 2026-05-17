<script>
  let {
    concepts = [],
    loading = false,
    onAddConcept = () => {},
  } = $props();

  let maxRatio = $derived(
    concepts.reduce((mx, c) => (c.ratio != null && c.ratio > mx ? c.ratio : mx), 1)
  );
</script>

<div class="enrichment">
  {#if loading && concepts.length === 0}
    <div class="loading-wrap">
      <div class="shimmer-row"></div>
      <div class="shimmer-row"></div>
      <div class="shimmer-row"></div>
      <div class="shimmer-row"></div>
      <div class="shimmer-row"></div>
    </div>
  {:else if concepts.length === 0}
    <p class="empty">Run a search to discover enriched concepts in the retrieved images.</p>
  {:else}
    <div class="legend">
      <span>Concept</span>
      <span>Enrichment</span>
    </div>

    <div class="list" class:dimmed={loading}>
      {#each concepts as c (c.concept)}
        {@const pct = c.ratio != null ? (c.ratio / maxRatio) * 100 : 0}
        <button
          class="row"
          onclick={() => onAddConcept(c.concept)}
          title="Add '{c.concept}' to query"
        >
          <div class="bar" style="width: {pct}%"></div>
          <span class="name">{c.concept}</span>
          <span class="ratio">
            {#if c.ratio != null}
              {c.ratio.toFixed(1)}×
            {:else}
              —
            {/if}
          </span>
        </button>
      {/each}
    </div>

    <p class="hint">Click a concept to add it to your query.</p>
  {/if}
</div>

<style>
  .enrichment {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 13px;
    text-align: center;
    padding: 24px 0;
    line-height: 1.5;
  }

  .legend {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
    padding: 0 8px 4px;
    border-bottom: 1px solid var(--border);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 8px;
    border: none;
    background: transparent;
    width: 100%;
    text-align: left;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text);
    transition: background 0.1s;
  }

  .row:hover {
    background: var(--accent-muted);
  }

  .bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: var(--accent-light);
    border-radius: var(--radius-sm);
    z-index: 0;
    transition: width 0.3s ease;
  }

  .name {
    position: relative;
    z-index: 1;
    font-weight: 500;
  }

  .ratio {
    position: relative;
    z-index: 1;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
    min-width: 40px;
    text-align: right;
  }

  .hint {
    font-size: 11px;
    color: var(--text-secondary);
    text-align: center;
    padding: 8px 0 0;
  }

  /* loading shimmer */

  .loading-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 0;
  }

  .shimmer-row {
    height: 32px;
    border-radius: var(--radius-sm);
    background: linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-hover) 50%, var(--bg-muted) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
