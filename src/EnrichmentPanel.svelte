<script>
  let {
    concepts = [],
    loading = false,
    onAddConcept = () => {},
  } = $props();

  let sortBy = $state('freq_ratio');

  let sortedConcepts = $derived(
    [...concepts].sort((a, b) => {
      if (sortBy === 'freq_ratio') {
        return (b.freq_ratio ?? 0) - (a.freq_ratio ?? 0);
      }
      return (b.freq_retrieved ?? 0) - (a.freq_retrieved ?? 0);
    })
  );

  let maxBar = $derived(
    sortedConcepts.reduce((mx, c) => {
      const val = sortBy === 'freq_ratio' ? (c.freq_ratio ?? 0) : (c.freq_retrieved ?? 0);
      return val > mx ? val : mx;
    }, 1)
  );
</script>

<div class="enrichment">
  {#if loading && concepts.length === 0}
    <div class="loading-wrap">
      {#each { length: 8 } as _}
        <div class="shimmer-row"></div>
      {/each}
    </div>
  {:else if concepts.length === 0}
    <div class="empty-card">
      Add concepts to construct a query in the learned representation space.
    </div>
  {:else}
    <div class="sort-row">
      <label class="sort-label" for="enrich-sort">Sort by</label>
      <select id="enrich-sort" class="sort-select" bind:value={sortBy}>
        <option value="freq_ratio">Enrichment ratio</option>
        <option value="freq_retrieved">Frequency in results</option>
      </select>
    </div>

    <div class="legend">
      <span>Concept</span>
      <span>{sortBy === 'freq_ratio' ? 'Ratio' : 'Freq'}</span>
    </div>

    <div class="concept-list" class:dimmed={loading}>
      {#each sortedConcepts as c (c.concept)}
        {@const val = sortBy === 'freq_ratio' ? (c.freq_ratio ?? 0) : (c.freq_retrieved ?? 0)}
        {@const pct = Math.min((val / maxBar) * 100, 100)}
        <button
          class="bar-row"
          onclick={() => onAddConcept(c.concept)}
          title="Freq in results: {(c.freq_retrieved * 100).toFixed(1)}%  ·  Dataset baseline: {(c.base_freq * 100).toFixed(1)}%  ·  Ratio: {c.freq_ratio != null ? c.freq_ratio.toFixed(2) + 'x' : '—'}"
        >
          <div class="bar-track">
            <div class="bar-fill" style="width: {pct}%"></div>
          </div>
          <span class="bar-label">{c.concept}</span>
          <span class="bar-value">
            {#if sortBy === 'freq_ratio'}
              {c.freq_ratio != null ? c.freq_ratio.toFixed(1) + '×' : '—'}
            {:else}
              {(c.freq_retrieved * 100).toFixed(0)}%
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
    gap: 0.5rem;
    flex: 1;
    min-height: 0;
  }

  .empty-card {
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 1.2rem 1rem;
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.6;
    text-align: center;
  }

  .sort-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sort-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .sort-select {
    flex: 1;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    background: var(--bg-input);
    color: var(--text-heading);
    font-size: 0.78rem;
    outline: none;
    cursor: pointer;
  }

  .sort-select:focus {
    border-color: var(--accent);
  }

  .legend {
    display: flex;
    justify-content: space-between;
    padding: 0 0.1rem 0.3rem;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
  }

  .concept-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow-y: auto;
  }

  .bar-row {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.45rem 0.5rem;
    border: none;
    background: transparent;
    color: var(--text-heading);
    font: inherit;
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-xs);
    transition: background 100ms ease;
    gap: 0.4rem;
  }

  .bar-row:hover {
    background: var(--bg-hover);
  }

  .bar-track {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    border-radius: var(--radius-xs);
    overflow: hidden;
    pointer-events: none;
  }

  .bar-fill {
    height: 100%;
    background: var(--accent-light);
    border-radius: var(--radius-xs);
    transition: width 350ms ease;
  }

  .bar-label {
    position: relative;
    z-index: 1;
    flex: 1;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-value {
    position: relative;
    z-index: 1;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--accent);
    white-space: nowrap;
    min-width: 2.5rem;
    text-align: right;
  }

  .hint {
    font-size: 0.72rem;
    color: var(--text-secondary);
    text-align: center;
    padding-top: 0.2rem;
  }

  .loading-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .shimmer-row {
    height: 2rem;
    border-radius: var(--radius-xs);
    background: linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-hover) 50%, var(--bg-muted) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
