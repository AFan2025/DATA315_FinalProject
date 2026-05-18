<script>
  let {
    image = null,
    onClose = () => {},
    onPrev = () => {},
    onNext = () => {},
    hasPrev = false,
    hasNext = false,
  } = $props();

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowLeft' && hasPrev) onPrev();
    else if (e.key === 'ArrowRight' && hasNext) onNext();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal-card">
    <button class="close-btn" onclick={onClose} aria-label="Close">×</button>
    <button class="nav-btn nav-prev" onclick={onPrev} disabled={!hasPrev} aria-label="Previous image">‹</button>
    <button class="nav-btn nav-next" onclick={onNext} disabled={!hasNext} aria-label="Next image">›</button>

    <div class="modal-media">
      {#if image?.url}
        <img src={image.url} alt="Image {image.image_id}" />
      {:else}
        <div class="placeholder">No image available</div>
      {/if}
    </div>

    <div class="modal-body">
      <p class="panel-label">Image Details</p>
      <h2>Image #{image?.image_id ?? '—'}</h2>

      <div class="meta-grid">
        <div>
          <p class="meta-label">Cosine Similarity</p>
          <p class="meta-value">{image?.score?.toFixed(4) ?? '—'}</p>
        </div>
        <div>
          <p class="meta-label">Image ID</p>
          <p class="meta-value">{image?.image_id ?? '—'}</p>
        </div>
        <div>
          <p class="meta-label">Row Index</p>
          <p class="meta-value">{image?.row ?? '—'}</p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 16, 9, 0.55);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    z-index: 20;
  }

  .modal-card {
    position: relative;
    width: min(900px, 100%);
    border-radius: var(--radius);
    border: 1px solid rgba(233, 236, 230, 0.45);
    background: var(--bg-panel);
    box-shadow: 0 28px 80px rgba(26, 16, 9, 0.22);
    overflow: hidden;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--text-heading);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    z-index: 1;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 2.8rem;
    height: 2.8rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--text-heading);
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 120ms ease, opacity 120ms ease;
  }

  .nav-btn:disabled {
    opacity: 0.2;
    cursor: default;
  }

  .nav-btn:not(:disabled):hover {
    background: var(--bg-hover);
  }

  .nav-prev { left: 1rem; }
  .nav-next { right: 1rem; }

  .modal-media {
    background: linear-gradient(135deg, #f5f0ea, #ebe4db);
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
    color: var(--text-secondary);
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
    color: var(--text-secondary);
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-heading);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .meta-label, .meta-value {
    margin: 0;
  }

  .meta-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }

  .meta-value {
    margin-top: 0.4rem;
    color: var(--text-heading);
    font-family: var(--font-mono);
  }

  @media (prefers-color-scheme: dark) {
    .close-btn {
      background: rgba(30, 35, 28, 0.9);
    }
    .modal-media {
      background: linear-gradient(135deg, #241c12, #332a1f);
    }
  }
</style>
