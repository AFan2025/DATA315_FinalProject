<script>
  import { onDestroy } from 'svelte';
  import QuerySelector from './QuerySelector.svelte';
  import ImageGrid from './ImageGrid.svelte';
  import EnrichmentPanel from './EnrichmentPanel.svelte';
  import { search } from './lib/api.js';

  let results = $state([]);
  let concepts = $state([]);
  let totalAboveThreshold = $state(0);
  let isSearching = $state(false);
  let searchError = $state('');
  let latencyMs = $state(0);

  /** Word to inject into QuerySelector from enrichment click */
  let pendingConcept = $state('');

  /** @type {AbortController | undefined} */
  let abortCtrl;
  onDestroy(() => abortCtrl?.abort());

  /** @param {Record<string, number>} weights */
  async function handleSearch(weights) {
    if (!weights || Object.keys(weights).length === 0) {
      results = [];
      concepts = [];
      totalAboveThreshold = 0;
      searchError = '';
      return;
    }

    abortCtrl?.abort();
    abortCtrl = new AbortController();
    isSearching = true;
    searchError = '';
    const t0 = performance.now();

    try {
      const data = await search(weights, { signal: abortCtrl.signal });
      results = data.display_results ?? [];
      concepts = data.top_concepts ?? [];
      totalAboveThreshold = data.total_above_threshold ?? 0;
      latencyMs = Math.round(performance.now() - t0);
    } catch (err) {
      if (err.name !== 'AbortError') {
        searchError = err.message;
        results = [];
        concepts = [];
      }
    } finally {
      isSearching = false;
    }
  }

  function handleAddConcept(word) {
    pendingConcept = word;
  }

  function handlePendingConsumed() {
    pendingConcept = '';
  }
</script>

<div class="shell">
  <header class="header">
    <div class="header-inner">
      <h1>SpLiCE Auditor</h1>
      <p class="tagline">Interactive concept-based auditing of image datasets via CLIP + SpLiCE</p>
    </div>
  </header>

  <main class="main">
    <aside class="panel panel-query">
      <div class="panel-header">
        <h2>Query Builder</h2>
      </div>
      <div class="panel-body">
        <QuerySelector
          onSearch={handleSearch}
          {pendingConcept}
          onPendingConsumed={handlePendingConsumed}
        />
      </div>
    </aside>

    <section class="panel panel-results">
      <ImageGrid
        images={results}
        loading={isSearching}
        error={searchError}
        {totalAboveThreshold}
        {latencyMs}
      />
    </section>

    <aside class="panel panel-enrichment">
      <div class="panel-header">
        <h2>Enriched Concepts</h2>
      </div>
      <div class="panel-body">
        <EnrichmentPanel
          {concepts}
          loading={isSearching}
          onAddConcept={handleAddConcept}
        />
      </div>
    </aside>
  </main>
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .header {
    border-bottom: 1px solid var(--border);
    background: var(--bg-panel);
    padding: 14px 24px;
  }

  .header-inner {
    max-width: 1600px;
    margin: 0 auto;
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
  }

  .header h1 {
    font-size: 1.25rem;
    white-space: nowrap;
  }

  .tagline {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .main {
    flex: 1;
    display: grid;
    grid-template-columns: 300px 1fr 300px;
    min-height: 0;
  }

  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-query,
  .panel-enrichment {
    border-right: 1px solid var(--border);
    background: var(--bg-panel);
    overflow-y: auto;
  }

  .panel-enrichment {
    border-right: none;
    border-left: 1px solid var(--border);
  }

  .panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .panel-header h2 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .panel-results {
    overflow-y: auto;
    padding: 16px;
  }

  @media (max-width: 1100px) {
    .main {
      grid-template-columns: 280px 1fr;
    }
    .panel-enrichment {
      grid-column: 1 / -1;
      border-left: none;
      border-top: 1px solid var(--border);
      max-height: 300px;
    }
  }

  @media (max-width: 768px) {
    .main {
      grid-template-columns: 1fr;
    }
    .panel-query {
      border-right: none;
      border-bottom: 1px solid var(--border);
      max-height: 40vh;
    }
    .panel-enrichment {
      max-height: 40vh;
    }
  }
</style>
