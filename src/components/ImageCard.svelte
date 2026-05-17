<script>
  import { createEventDispatcher } from 'svelte';

  export let image;

  const dispatch = createEventDispatcher();

  let failed = false;

  function selectImage() {
    dispatch('selectimage', image);
  }

  function handleImageError() {
    failed = true;
  }
</script>

<button type="button" class="image-card" on:click={selectImage}>
  <div class="image-frame">
    {#if failed || !image.url}
      <div class="placeholder" aria-hidden="true">
        <span>Preview unavailable</span>
      </div>
    {:else}
      <img
        src={image.url}
        alt={image.caption || image.id || 'Retrieved image'}
        loading="lazy"
        on:error={handleImageError}
      />
    {/if}
  </div>

  <div class="meta-row">
    <p class="caption">{image.caption || image.id}</p>
    <p class="score">{Number.isFinite(image.score) ? image.score.toFixed(2) : '—'}</p>
  </div>
</button>

<style>
  .image-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 1.1rem;
    background: var(--surface);
    cursor: pointer;
    text-align: left;
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }

  .image-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-strong);
    box-shadow: 0 18px 32px rgba(31, 38, 34, 0.08);
  }

  .image-frame {
    position: relative;
    overflow: hidden;
    border-radius: 0.95rem;
    aspect-ratio: 4 / 3;
    background: linear-gradient(135deg, #f0f2ec, #e2e8df);
  }

  img,
  .placeholder {
    width: 100%;
    height: 100%;
  }

  img {
    display: block;
    object-fit: cover;
  }

  .placeholder {
    display: grid;
    place-items: center;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .caption,
  .score {
    margin: 0;
    font-size: 0.85rem;
  }

  .caption {
    color: var(--text-strong);
  }

  .score {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
