<script>
  import { createEventDispatcher } from 'svelte';

  export let concept;

  const dispatch = createEventDispatcher();

  function selectConcept() {
    dispatch('selectconcept', {
      id: concept.id,
      label: concept.label,
    });
  }

  $: ratio = Number.isFinite(concept.ratio) ? concept.ratio : 0;
  $: emphasis = Math.max(0.12, Math.min(0.42, ratio / 10));
  $: tooltip = [
    'Ratio compares the concept’s average weight in retrieved images to its average weight across the full dataset.',
    `Mean weight: ${formatMetric(concept.meanWeight)}`,
    `Dataset baseline: ${formatMetric(concept.baselineWeight)}`,
    `Ratio: ${formatRatio(concept.ratio)}`,
  ].join('\n');

  /** @param {number | undefined} value */
  function formatMetric(value) {
    return Number.isFinite(value) ? value.toFixed(4) : '—';
  }

  /** @param {number | undefined} value */
  function formatRatio(value) {
    return Number.isFinite(value) ? `${value.toFixed(1)}x` : '—';
  }
</script>

<button
  type="button"
  class="concept-item"
  style={`--badge-emphasis:${emphasis};`}
  title={tooltip}
  on:click={selectConcept}
>
  <span class="concept-name">{concept.label}</span>
  <span class="ratio-badge">{formatRatio(concept.ratio)}</span>
</button>

<style>
  .concept-item {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 0.9rem 1rem;
    background: var(--surface);
    color: var(--text-strong);
    font: inherit;
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }

  .concept-item:hover {
    transform: translateY(-1px);
    border-color: var(--border-strong);
    box-shadow: 0 14px 28px rgba(31, 38, 34, 0.08);
  }

  .concept-name {
    text-align: left;
  }

  .ratio-badge {
    border-radius: 999px;
    padding: 0.35rem 0.7rem;
    background: rgba(114, 141, 123, var(--badge-emphasis));
    color: var(--text-strong);
    font-size: 0.82rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
