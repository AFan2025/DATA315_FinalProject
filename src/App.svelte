<script>
  import { onDestroy } from 'svelte';
  import ConceptWeightsPanel from './components/ConceptWeightsPanel.svelte';
  import RetrievedImagesPanel from './components/RetrievedImagesPanel.svelte';
  import UnexpectedConceptsPanel from './components/UnexpectedConceptsPanel.svelte';
  import ImageModal from './components/ImageModal.svelte';
  import { retrieveConceptResults } from './lib/api.js';

  const RETRIEVAL_DEBOUNCE_MS = 320;
  const DEFAULT_WEIGHT = 0.5;
  const TOP_K = 12;
  const HIGHLIGHT_MS = 1800;

  /** @type {{ id: string, label: string, weight: number }[]} */
  let activeConcepts = [];
  /** @type {{ id: string, url: string, caption?: string, score?: number }[]} */
  let retrievedImages = [];
  /** @type {{ id: string, label: string, meanWeight?: number, baselineWeight?: number, ratio?: number }[]} */
  let unexpectedConcepts = [];
  /** @type {{ id: string, url: string, caption?: string, score?: number } | null} */
  let selectedImage = null;

  let loading = false;
  let error = '';
  let highlightedConceptId = '';

  let debounceTimer;
  let highlightTimer;
  let latestRequestId = 0;

  onDestroy(() => {
    clearTimeout(debounceTimer);
    clearTimeout(highlightTimer);
    latestRequestId += 1;
  });

  $: retrievalSignature = JSON.stringify(
    activeConcepts.map((concept) => ({
      id: concept.id,
      weight: concept.weight,
    }))
  );

  $: {
    clearTimeout(debounceTimer);

    if (activeConcepts.length === 0) {
      loading = false;
      error = '';
      retrievedImages = [];
      unexpectedConcepts = [];
    } else {
      const conceptSnapshot = activeConcepts.map((concept) => ({ ...concept }));
      debounceTimer = setTimeout(() => {
        void runRetrieval(conceptSnapshot);
      }, RETRIEVAL_DEBOUNCE_MS);
    }
  }

  /** @param {{ id: string, label: string }} concept */
  function handleAddConcept(concept) {
    if (!concept?.id) {
      return;
    }

    const existing = activeConcepts.find((item) => item.id === concept.id);
    if (existing) {
      pulseConcept(existing.id);
      return;
    }

    activeConcepts = [
      ...activeConcepts,
      {
        id: concept.id,
        label: concept.label,
        weight: DEFAULT_WEIGHT,
      },
    ];
    pulseConcept(concept.id);
  }

  /** @param {string} conceptId */
  function handleRemoveConcept(conceptId) {
    activeConcepts = activeConcepts.filter((concept) => concept.id !== conceptId);
  }

  /** @param {{ id: string, weight: number }} detail */
  function handleWeightChange(detail) {
    activeConcepts = activeConcepts.map((concept) =>
      concept.id === detail.id
        ? { ...concept, weight: clampWeight(detail.weight) }
        : concept
    );
  }

  function handleNormalizeWeights() {
    const total = activeConcepts.reduce((sum, concept) => sum + concept.weight, 0);
    if (total <= 0) {
      return;
    }

    activeConcepts = activeConcepts.map((concept) => ({
      ...concept,
      weight: concept.weight / total,
    }));
  }

  /** @param {{ id: string, label: string }} concept */
  function handleUnexpectedConceptSelect(concept) {
    handleAddConcept(concept);
  }

  /** @param {{ id: string, url: string, caption?: string, score?: number }} image */
  function handleImageSelect(image) {
    selectedImage = image;
  }

  function closeModal() {
    selectedImage = null;
  }

  /** @param {{ id: string, label: string, weight: number }[]} concepts */
  async function runRetrieval(concepts) {
    const requestId = ++latestRequestId;
    loading = true;
    error = '';

    try {
      const result = await retrieveConceptResults({
        concepts,
        topK: TOP_K,
      });

      if (requestId !== latestRequestId) {
        return;
      }

      retrievedImages = Array.isArray(result.images) ? result.images : [];
      unexpectedConcepts = Array.isArray(result.unexpectedConcepts)
        ? result.unexpectedConcepts.slice(0, 10)
        : [];
    } catch (fetchError) {
      if (requestId !== latestRequestId) {
        return;
      }

      error = 'Could not retrieve results. Please try again.';
      console.error(fetchError);
    } finally {
      if (requestId === latestRequestId) {
        loading = false;
      }
    }
  }

  /** @param {string} conceptId */
  function pulseConcept(conceptId) {
    highlightedConceptId = conceptId;
    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
      if (highlightedConceptId === conceptId) {
        highlightedConceptId = '';
      }
    }, HIGHLIGHT_MS);
  }

  /** @param {number} weight */
  function clampWeight(weight) {
    if (!Number.isFinite(weight)) {
      return 0;
    }

    return Math.max(0, Math.min(1, weight));
  }
</script>

<svelte:head>
  <title>Concept-Driven Dataset Auditing</title>
  <meta
    name="description"
    content="Interactive concept-driven image dataset auditing interface for inspecting retrieved images and candidate concept associations."
  />
</svelte:head>

<div class="app-shell">
  <header class="page-header">
    <div>
      <p class="eyebrow">Human-In-The-Loop Dataset Auditing</p>
      <h1>Inspect learned concept associations in image retrieval results.</h1>
    </div>
    <p class="intro">
      Build a query in the learned representation space, inspect the retrieved image subset,
      and surface candidate associations worth auditing relative to the dataset baseline.
    </p>
  </header>

  <main class="workspace">
    <ConceptWeightsPanel
      activeConcepts={activeConcepts}
      highlightedConceptId={highlightedConceptId}
      on:addconcept={(event) => handleAddConcept(event.detail)}
      on:removeconcept={(event) => handleRemoveConcept(event.detail.id)}
      on:changeweight={(event) => handleWeightChange(event.detail)}
      on:normalizeweights={handleNormalizeWeights}
    />

    <RetrievedImagesPanel
      images={retrievedImages}
      loading={loading}
      error={error}
      hasActiveQuery={activeConcepts.length > 0}
      on:selectimage={(event) => handleImageSelect(event.detail)}
    />

    <UnexpectedConceptsPanel
      concepts={unexpectedConcepts}
      loading={loading}
      error={error}
      hasActiveQuery={activeConcepts.length > 0}
      on:selectconcept={(event) => handleUnexpectedConceptSelect(event.detail)}
    />
  </main>
</div>

{#if selectedImage}
  <ImageModal image={selectedImage} on:close={closeModal} />
{/if}
