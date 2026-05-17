<script>
  import { onDestroy } from 'svelte';
  import QuerySelector from './QuerySelector.svelte';
  import ImageGrid from './ImageGrid.svelte';
  import EnrichmentPanel from './EnrichmentPanel.svelte';
  import ImageModal from './ImageModal.svelte';
  import { search } from './lib/api.js';

  const PAGE_SIZE = 24;

  let results = $state([]);
  let concepts = $state([]);
  let totalAboveThreshold = $state(0);
  let isSearching = $state(false);
  let isPageLoading = $state(false);
  let searchError = $state('');
  let latencyMs = $state(0);
  let currentPage = $state(0);

  /** Last query weights — needed to re-fetch on page change */
  let lastWeights = $state({});
  /** Word to inject into QuerySelector from enrichment click */
  let pendingConcept = $state('');
  /** Image to show in full-screen modal */
  let selectedImage = $state(null);

  let totalPages = $derived(Math.max(1, Math.ceil(totalAboveThreshold / PAGE_SIZE)));

  /** @type {AbortController | undefined} */
  let abortCtrl;
  onDestroy(() => abortCtrl?.abort());

  /** Called when the query changes (add/remove/slider) */
  async function handleSearch(weights) {
    lastWeights = weights;
    currentPage = 0;
    await doSearch(weights, 0, true);
  }

  /** Called when the user clicks a page button */
  async function handlePageChange(page) {
    currentPage = page;
    await doSearch(lastWeights, page, false);
  }

  /**
   * @param {Record<string, number>} weights
   * @param {number} page
   * @param {boolean} fullSearch — true = update enrichment too; false = images only
   */
  async function doSearch(weights, page, fullSearch) {
    if (!weights || Object.keys(weights).length === 0) {
      results = [];
      concepts = [];
      totalAboveThreshold = 0;
      searchError = '';
      return;
    }

    abortCtrl?.abort();
    abortCtrl = new AbortController();
    if (fullSearch) isSearching = true;
    isPageLoading = true;
    searchError = '';
    const t0 = performance.now();

    try {
      const data = await search(weights, {
        k: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        signal: abortCtrl.signal,
      });
      results = data.display_results ?? [];
      if (fullSearch) {
        concepts = data.top_concepts ?? [];
        totalAboveThreshold = data.total_above_threshold ?? 0;
      }
      latencyMs = Math.round(performance.now() - t0);
    } catch (err) {
      if (err.name !== 'AbortError') {
        searchError = err.message;
        results = [];
        if (fullSearch) concepts = [];
      }
    } finally {
      isSearching = false;
      isPageLoading = false;
    }
  }

  function handleAddConcept(word) {
    pendingConcept = word;
  }

  function handlePendingConsumed() {
    pendingConcept = '';
  }

  function handleImageClick(img) {
    selectedImage = img;
  }

  function closeModal() {
    selectedImage = null;
  }
</script>

<div class="app-shell">
  <header class="page-header">
    <div>
      <p class="eyebrow">Human-In-The-Loop Dataset Auditing</p>
      <h1>SpLiCE Auditor</h1>
    </div>
    <p class="intro">
      Build a query in the learned representation space, inspect the retrieved image subset,
      and surface candidate associations worth auditing relative to the dataset baseline.
    </p>
  </header>

  <main class="workspace">
    <section class="workspace-card">
      <div class="card-header">
        <p class="panel-label">Query Builder</p>
        <h2>Construct a weighted concept query.</h2>
      </div>
      <QuerySelector
        onSearch={handleSearch}
        {pendingConcept}
        onPendingConsumed={handlePendingConsumed}
      />
    </section>

    <section class="workspace-card">
      <ImageGrid
        images={results}
        loading={isSearching}
        pageLoading={isPageLoading}
        error={searchError}
        {totalAboveThreshold}
        {latencyMs}
        {currentPage}
        {totalPages}
        onPageChange={handlePageChange}
        onImageClick={handleImageClick}
      />
    </section>

    <section class="workspace-card">
      <div class="card-header">
        <p class="panel-label">Enriched Concepts</p>
        <h2>Surface candidate associations worth auditing.</h2>
      </div>
      <p class="helper-copy">
        These concepts are unusually weighted in the retrieved image subset relative to
        the full dataset baseline.
      </p>
      <EnrichmentPanel
        {concepts}
        loading={isSearching}
        onAddConcept={handleAddConcept}
      />
    </section>
  </main>
</div>

{#if selectedImage}
  <ImageModal image={selectedImage} onClose={closeModal} />
{/if}

<style>
  .app-shell {
    width: calc(100% - 24px);
    max-width: 2000px;
    margin: 0 auto;
    padding: 20px 0 32px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 1.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .eyebrow {
    margin: 0 0 0.6rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .page-header h1 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: clamp(1.8rem, 4vw, 2.8rem);
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--text-heading);
  }

  .intro {
    margin: 0;
    max-width: 44ch;
    font-size: 0.92rem;
    line-height: 1.7;
    color: var(--text-secondary);
  }

  .workspace {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    grid-template-rows: 1fr;
    gap: 0.75rem;
    align-items: stretch;
    min-height: calc(100vh - 120px);
  }

  .workspace-card {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem;
    background: var(--bg-panel);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .panel-label {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .card-header h2 {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.3;
    color: var(--text-heading);
  }

  .helper-copy {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  @media (max-width: 1100px) {
    .workspace {
      grid-template-columns: 1fr 2fr;
    }
    .workspace-card:last-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 768px) {
    .app-shell {
      width: calc(100% - 12px);
      padding-top: 12px;
      padding-bottom: 20px;
    }
    .page-header h1 {
      font-size: clamp(1.4rem, 7vw, 1.8rem);
    }
    .workspace {
      grid-template-columns: 1fr;
      align-items: start;
      min-height: auto;
    }
    .workspace-card {
      padding: 0.9rem;
    }
  }
</style>
