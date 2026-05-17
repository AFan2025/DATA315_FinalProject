<script>
  import { createEventDispatcher } from 'svelte';
  import ConceptSearchBox from './ConceptSearchBox.svelte';
  import ConceptSliderRow from './ConceptSliderRow.svelte';

  export let activeConcepts = [];
  export let highlightedConceptId = '';

  const dispatch = createEventDispatcher();

  /** @param {{ detail: { id: string, label: string } }} event */
  function forwardAddConcept(event) {
    dispatch('addconcept', event.detail);
  }

  /** @param {string} conceptId */
  function removeConcept(conceptId) {
    dispatch('removeconcept', { id: conceptId });
  }

  /** @param {{ id: string, weight: number }} detail */
  function changeWeight(detail) {
    dispatch('changeweight', detail);
  }

  function normalizeWeights() {
    dispatch('normalizeweights');
  }
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="panel-label">Concept Weights</p>
      <h2>Construct a query in concept space.</h2>
    </div>
    <button
      type="button"
      class="subtle-button"
      on:click={normalizeWeights}
      disabled={activeConcepts.length < 2}
    >
      Normalize
    </button>
  </div>

  <p class="panel-copy">
    Search the SpLiCE vocabulary, add active concepts, and adjust their weights to steer
    retrieval.
  </p>

  <ConceptSearchBox on:addconcept={forwardAddConcept} />

  <div class="concept-list" aria-live="polite">
    {#if activeConcepts.length === 0}
      <div class="empty-card">
        Add concepts to construct a query in the learned representation space.
      </div>
    {:else}
      {#each activeConcepts as concept (concept.id)}
        <ConceptSliderRow
          concept={concept}
          highlighted={highlightedConceptId === concept.id}
          on:removeconcept={() => removeConcept(concept.id)}
          on:changeweight={(event) => changeWeight(event.detail)}
        />
      {/each}
    {/if}
  </div>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel-header {
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
    color: var(--muted-strong);
  }

  h2 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.3;
    color: var(--text-strong);
  }

  .panel-copy {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--muted);
  }

  .subtle-button {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.65rem 0.9rem;
    background: var(--surface);
    color: var(--muted-strong);
    font: inherit;
    cursor: pointer;
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
  }

  .subtle-button:hover:enabled {
    background: var(--surface-strong);
    border-color: var(--border-strong);
    color: var(--text-strong);
  }

  .subtle-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .concept-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .empty-card {
    border: 1px dashed var(--border-strong);
    border-radius: 1rem;
    padding: 1rem;
    background: var(--surface);
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.6;
  }
</style>
