<script>
  import { createEventDispatcher } from 'svelte';
  import ImageCard from './ImageCard.svelte';

  export let images = [];
  export let loading = false;
  export let error = '';
  export let hasActiveQuery = false;

  const dispatch = createEventDispatcher();

  /** @param {{ detail: { id: string, url: string, caption?: string, score?: number } }} event */
  function selectImage(event) {
    dispatch('selectimage', event.detail);
  }
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="panel-label">Retrieved Images</p>
      <h2>Inspect the current retrieved subset.</h2>
    </div>
    {#if loading}
      <span class="status-badge">Retrieving images…</span>
    {/if}
  </div>

  <div class="panel-frame">
    {#if !hasActiveQuery}
      <div class="empty-card">
        Add a concept to begin exploring the dataset.
      </div>
    {:else if error && images.length === 0}
      <div class="empty-card error">{error}</div>
    {:else if images.length === 0 && !loading}
      <div class="empty-card">No matching images found for this query.</div>
    {:else}
      <div class="image-grid" aria-busy={loading}>
        {#each images as image (image.id)}
          <ImageCard image={image} on:selectimage={selectImage} />
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
    min-width: 0;
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
    gap: 0.35rem;
    border-radius: 999px;
    background: var(--surface-strong);
    color: var(--muted-strong);
    padding: 0.45rem 0.7rem;
    font-size: 0.82rem;
  }

  .panel-frame {
    min-height: 18rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
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
