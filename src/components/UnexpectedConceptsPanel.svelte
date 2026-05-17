<script>
  import { createEventDispatcher } from 'svelte';
  import UnexpectedConceptItem from './UnexpectedConceptItem.svelte';

  export let concepts = [];
  export let loading = false;
  export let error = '';
  export let hasActiveQuery = false;

  const dispatch = createEventDispatcher();

  /** @param {{ detail: { id: string, label: string } }} event */
  function selectConcept(event) {
    dispatch('selectconcept', event.detail);
  }
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="panel-label">Unexpected Concepts</p>
      <h2>Surface candidate associations worth auditing.</h2>
    </div>
    {#if loading}
      <span class="status-badge">Computing associated concepts…</span>
    {/if}
  </div>

  <p class="helper-copy">
    These concepts are unusually weighted in the retrieved image subset relative to the
    full dataset baseline.
  </p>

  <div class="panel-frame">
    {#if !hasActiveQuery}
      <div class="empty-card">
        Add concepts to construct a query in the learned representation space.
      </div>
    {:else if error && concepts.length === 0}
      <div class="empty-card error">{error}</div>
    {:else if concepts.length === 0 && !loading}
      <div class="empty-card">No overrepresented concepts found for this query.</div>
    {:else}
      <div class="concept-list" aria-busy={loading}>
        {#each concepts as concept (concept.id)}
          <UnexpectedConceptItem concept={concept} on:selectconcept={selectConcept} />
        {/each}
      </div>
      {#if error}
        <p class="inline-message error">{error}</p>
      {/if}
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

  .status-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: var(--surface-strong);
    color: var(--muted-strong);
    padding: 0.45rem 0.7rem;
    font-size: 0.82rem;
  }

  .helper-copy {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--muted);
  }

  .panel-frame {
    min-height: 18rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .concept-list {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
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

  .inline-message {
    margin: 0;
    font-size: 0.86rem;
  }

  .error {
    color: var(--error);
  }
</style>
