<script>
  import { onDestroy } from 'svelte';
  import QuerySelector from './QuerySelector.svelte';
  import ImageGrid from './ImageGrid.svelte';
  import EnrichmentPanel from './EnrichmentPanel.svelte';
  import ImageModal from './ImageModal.svelte';
  import { search } from './lib/api.js';

  const PAGE_SIZE = 15;

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
  /** Show info overlay */
  let showInfo = $state(false);

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

  let selectedLocalIndex = $derived(results.findIndex(img => img.image_id === selectedImage?.image_id));
  let selectedGlobalIndex = $derived(selectedImage ? currentPage * PAGE_SIZE + selectedLocalIndex : -1);
  let hasPrev = $derived(selectedGlobalIndex > 0);
  let hasNext = $derived(selectedGlobalIndex >= 0 && selectedGlobalIndex < totalAboveThreshold - 1);

  /** After a page load triggered by modal navigation, select first or last image */
  let pendingSelectPosition = $state(null);

  $effect(() => {
    if (pendingSelectPosition && results.length > 0) {
      selectedImage = pendingSelectPosition === 'first' ? results[0] : results[results.length - 1];
      pendingSelectPosition = null;
    }
  });

  function handleImageClick(img) {
    selectedImage = img;
  }

  async function handlePrev() {
    if (selectedLocalIndex > 0) {
      selectedImage = results[selectedLocalIndex - 1];
    } else if (currentPage > 0) {
      pendingSelectPosition = 'last';
      await handlePageChange(currentPage - 1);
    }
  }

  async function handleNext() {
    if (selectedLocalIndex < results.length - 1) {
      selectedImage = results[selectedLocalIndex + 1];
    } else if (currentPage < totalPages - 1) {
      pendingSelectPosition = 'first';
      await handlePageChange(currentPage + 1);
    }
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
    <button class="info-btn" onclick={() => showInfo = true} aria-label="About this tool">?</button>
  </header>

  {#if showInfo}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="info-backdrop" onclick={() => showInfo = false}>
      <div class="info-panel" onclick={(e) => e.stopPropagation()}>
        <button class="info-close" onclick={() => showInfo = false} aria-label="Close">×</button>
        <h3>How SpLiCE Auditor Works</h3>
        <p><strong>SpLiCE</strong> (Sparse Linear Concept Embeddings) decomposes CLIP image embeddings into weighted sums of human-interpretable concept vectors drawn from a large vocabulary. Each image is represented not as an opaque 512-dimensional vector, but as a sparse combination of concepts like <em>cat</em>, <em>outdoor</em>, or <em>formal attire</em>.</p>
        <h4>Query Builder</h4>
        <p>You construct a query by selecting concepts and adjusting their relative weights. These are combined into a single embedding via weighted sum and L2-normalized. The backend performs a FAISS nearest-neighbor search over the dataset using cosine similarity, returning images whose SpLiCE embeddings are closest to your query.</p>
        <h4>Retrieved Images</h4>
        <p>Images shown exceed a cosine similarity threshold of 0.22 against your query vector. Each card displays its similarity score. You can page through results and click any image to inspect it.</p>
        <h4>Related Concepts</h4>
        <p>For the retrieved subset, the tool computes how frequently each concept appears relative to the full dataset baseline. Concepts ranked by <em>enrichment ratio</em> are overrepresented in the retrieved subset compared to the dataset as a whole — surfacing latent associations worth auditing. Clicking a concept adds it to your query for deeper exploration.</p>
      </div>
    </div>
  {/if}

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
        <p class="panel-label">Related Concepts</p>
        <h2>Explore concept associations in retrieved images.</h2>
      </div>
      <EnrichmentPanel
        {concepts}
        loading={isSearching}
        onAddConcept={handleAddConcept}
      />
    </section>
  </main>
</div>

{#if selectedImage}
  <ImageModal
    image={selectedImage}
    onClose={closeModal}
    onPrev={handlePrev}
    onNext={handleNext}
    hasPrev={hasPrev}
    hasNext={hasNext}
  />
{/if}

<style>
  .app-shell {
    width: calc(100% - 24px);
    max-width: 2000px;
    margin: 0 auto;
    padding: 20px 0 16px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .info-btn {
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-panel);
    color: var(--text-secondary);
    font-size: 1.3rem;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 120ms ease, color 120ms ease;
  }

  .info-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .info-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(26, 16, 9, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .info-panel {
    position: relative;
    width: min(860px, 90vw);
    max-height: 85vh;
    background: rgba(255, 251, 247, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  .info-close {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
  }

  .info-close:hover {
    background: var(--bg-hover);
    color: var(--text-heading);
  }

  .info-panel h3 {
    font-size: 1.8rem;
    color: var(--text-heading);
    margin: 0 0 0.5rem;
  }

  .info-panel h4 {
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0.75rem 0 0;
  }

  .info-panel p {
    font-size: 1rem;
    line-height: 1.75;
    color: var(--text);
    margin: 0;
  }

  @media (prefers-color-scheme: dark) {
    .info-panel {
      background: rgba(28, 20, 10, 0.92);
    }
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
    flex: 1;
    min-height: 0;
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
    overflow: hidden;
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
