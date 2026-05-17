<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';

  export let image;

  const dispatch = createEventDispatcher();

  let failed = false;

  function closeModal() {
    dispatch('close');
  }

  /** @param {MouseEvent} event */
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  function handleImageError() {
    failed = true;
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="modal-backdrop"
  role="presentation"
  on:click={handleBackdropClick}
>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="image-modal-title">
    <button
      type="button"
      class="close-button"
      aria-label="Close image details"
      on:click={closeModal}
    >
      ×
    </button>

    <div class="modal-media">
      {#if failed || !image.url}
        <div class="placeholder">Preview unavailable</div>
      {:else}
        <img
          src={image.url}
          alt={image.caption || image.id || 'Retrieved image'}
          on:error={handleImageError}
        />
      {/if}
    </div>

    <div class="modal-body">
      <p class="panel-label">Retrieved Image</p>
      <h2 id="image-modal-title">{image.caption || image.id}</h2>
      <div class="meta-grid">
        <div>
          <p class="meta-label">Identifier</p>
          <p class="meta-value">{image.id}</p>
        </div>
        <div>
          <p class="meta-label">Score</p>
          <p class="meta-value">{Number.isFinite(image.score) ? image.score.toFixed(2) : '—'}</p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 21, 0.52);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    z-index: 20;
  }

  .modal-card {
    position: relative;
    width: min(900px, 100%);
    border-radius: 1.4rem;
    border: 1px solid rgba(233, 236, 230, 0.45);
    background: var(--surface);
    box-shadow: 0 28px 80px rgba(15, 21, 19, 0.22);
    overflow: hidden;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--text-strong);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
  }

  .modal-media {
    background: linear-gradient(135deg, #eff3eb, #dfe8da);
    min-height: 19rem;
  }

  .modal-media img,
  .placeholder {
    width: 100%;
    display: block;
  }

  .modal-media img {
    max-height: 65vh;
    object-fit: contain;
  }

  .placeholder {
    display: grid;
    min-height: 19rem;
    place-items: center;
    color: var(--muted);
  }

  .modal-body {
    padding: 1.4rem 1.4rem 1.6rem;
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
    font-size: 1.25rem;
    color: var(--text-strong);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .meta-label,
  .meta-value {
    margin: 0;
  }

  .meta-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  .meta-value {
    margin-top: 0.4rem;
    color: var(--text-strong);
  }
</style>
