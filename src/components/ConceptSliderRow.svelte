<script>
  import { createEventDispatcher } from 'svelte';

  export let concept;
  export let highlighted = false;

  const dispatch = createEventDispatcher();

  /** @param {InputEvent & { currentTarget: HTMLInputElement }} event */
  function handleInput(event) {
    dispatch('changeweight', {
      id: concept.id,
      weight: Number.parseFloat(event.currentTarget.value),
    });
  }

  function removeConcept() {
    dispatch('removeconcept', { id: concept.id });
  }

  $: sliderId = `concept-slider-${concept.id}`;
</script>

<article class:highlighted class="slider-card">
  <div class="row-header">
    <div>
      <label class="concept-label" for={sliderId}>{concept.label}</label>
      <p class="concept-id">{concept.id}</p>
    </div>
    <div class="row-actions">
      <span class="weight-chip">{concept.weight.toFixed(2)}</span>
      <button
        type="button"
        class="icon-button"
        aria-label={`Remove ${concept.label}`}
        on:click={removeConcept}
      >
        ×
      </button>
    </div>
  </div>

  <input
    id={sliderId}
    class="slider"
    type="range"
    min="0"
    max="1"
    step="0.01"
    value={concept.weight}
    aria-label={`${concept.label} weight`}
    on:input={handleInput}
  />
</article>

<style>
  .slider-card {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 0.95rem 1rem;
    background: var(--surface);
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .slider-card.highlighted {
    border-color: rgba(106, 127, 114, 0.55);
    box-shadow: 0 0 0 4px rgba(106, 127, 114, 0.12);
    transform: translateY(-1px);
  }

  .row-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .concept-label {
    display: block;
    font-size: 0.98rem;
    font-weight: 600;
    color: var(--text-strong);
  }

  .concept-id {
    margin: 0.15rem 0 0;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .weight-chip {
    min-width: 3rem;
    text-align: center;
    border-radius: 999px;
    padding: 0.35rem 0.65rem;
    background: var(--surface-strong);
    color: var(--muted-strong);
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }

  .icon-button {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--muted-strong);
    font: inherit;
    font-size: 1.15rem;
    line-height: 1;
    cursor: pointer;
    transition: background-color 140ms ease, border-color 140ms ease;
  }

  .icon-button:hover {
    background: var(--surface-strong);
    border-color: var(--border-strong);
  }

  .slider {
    width: 100%;
    accent-color: var(--accent);
  }
</style>
