<script>
  import { onDestroy } from 'svelte';
  import { autocomplete as fetchAutocomplete } from './lib/api.js';

  let {
    onSearch = () => {},
    pendingConcept = '',
    onPendingConsumed = () => {},
  } = $props();

  const DEBOUNCE_MS = 200;
  const SEARCH_DEBOUNCE_MS = 300;
  const MAX_WORDS = 8;

  let query = $state('');
  let suggestions = $state([]);
  let highlightIdx = $state(-1);
  let selectedWord = $state('');
  let isOpen = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let addedWords = $state([]);

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let acTimer;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let searchTimer;
  /** @type {AbortController | undefined} */
  let acAbort;

  onDestroy(() => {
    clearTimeout(acTimer);
    clearTimeout(searchTimer);
    acAbort?.abort();
  });

  let totalWeight = $derived(addedWords.reduce((s, w) => s + w.weight, 0));

  $effect(() => {
    if (pendingConcept && !addedWords.some(w => w.word === pendingConcept)) {
      if (addedWords.length < MAX_WORDS) {
        addedWords = uniformize([...addedWords, { word: pendingConcept, weight: 0 }]);
        fireSearch(true);
      }
      onPendingConsumed();
    } else if (pendingConcept) {
      onPendingConsumed();
    }
  });

  /* ---- autocomplete ---- */

  function handleInput() {
    selectedWord = '';
    highlightIdx = -1;
    scheduleAC(query);
  }

  function scheduleAC(q) {
    clearTimeout(acTimer);
    if (!q.trim()) {
      suggestions = [];
      isOpen = false;
      isLoading = false;
      acAbort?.abort();
      return;
    }
    acTimer = setTimeout(() => void doAC(q.trim()), DEBOUNCE_MS);
  }

  async function doAC(text) {
    acAbort?.abort();
    acAbort = new AbortController();
    isLoading = true;
    try {
      const data = await fetchAutocomplete(text, { signal: acAbort.signal });
      suggestions = Array.isArray(data.matches) ? data.matches : [];
      isOpen = suggestions.length > 0;
      highlightIdx = -1;
    } catch (err) {
      if (err.name !== 'AbortError') {
        errorMessage = 'Could not load suggestions.';
        suggestions = [];
        isOpen = false;
      }
    } finally {
      isLoading = false;
    }
  }

  function choose(word) {
    query = word;
    selectedWord = word;
    suggestions = [];
    isOpen = false;
    highlightIdx = -1;
    errorMessage = '';
  }

  function handleKeydown(e) {
    if (isOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightIdx = Math.min(highlightIdx + 1, suggestions.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightIdx = Math.max(highlightIdx - 1, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choose(suggestions[highlightIdx >= 0 ? highlightIdx : 0]);
      } else if (e.key === 'Escape') {
        isOpen = false;
      }
      return;
    }
    if (e.key === 'Enter' && selectedWord) {
      e.preventDefault();
      addWord();
    }
  }

  function handleBlur() {
    setTimeout(() => { isOpen = false; }, 150);
  }

  /* ---- word management ---- */

  function uniformize(words) {
    if (words.length === 0) return [];
    const w = 1 / words.length;
    return words.map(item => ({ ...item, weight: w }));
  }

  function addWord() {
    if (!selectedWord) {
      errorMessage = 'Select a concept from the dropdown first.';
      return;
    }
    if (addedWords.length >= MAX_WORDS) {
      errorMessage = `Maximum ${MAX_WORDS} concepts.`;
      return;
    }
    if (addedWords.some(w => w.word === selectedWord)) {
      errorMessage = 'Already added.';
      return;
    }
    addedWords = uniformize([...addedWords, { word: selectedWord, weight: 0 }]);
    errorMessage = '';
    query = '';
    selectedWord = '';
    suggestions = [];
    isOpen = false;
    fireSearch(true);
  }

  function removeWord(idx) {
    addedWords = uniformize(addedWords.filter((_, i) => i !== idx));
    fireSearch(true);
  }

  function resetAll() {
    addedWords = [];
    selectedWord = '';
    query = '';
    suggestions = [];
    isOpen = false;
    errorMessage = '';
    fireSearch(true);
  }

  function normalizeWeights() {
    const total = addedWords.reduce((s, w) => s + w.weight, 0);
    if (total <= 0) return;
    addedWords = addedWords.map(w => ({ ...w, weight: w.weight / total }));
    fireSearch(true);
  }

  function handleSlider(idx, e) {
    if (addedWords.length <= 1) return;
    const val = Math.max(0, Math.min(1, parseFloat(e.currentTarget.value) || 0));
    const remainder = 1 - val;
    const updated = addedWords.map(item => ({ ...item }));
    updated[idx].weight = val;

    const others = updated.map((_, i) => i).filter(i => i !== idx);
    const othersSum = others.reduce((s, i) => s + updated[i].weight, 0);

    if (othersSum > 0) {
      for (const i of others) updated[i].weight = (updated[i].weight / othersSum) * remainder;
    } else {
      const even = remainder / others.length;
      for (const i of others) updated[i].weight = even;
    }

    const correction = 1 - updated.reduce((s, item) => s + item.weight, 0);
    updated[idx].weight += correction;
    addedWords = updated;
    fireSearch(false);
  }

  /* ---- search trigger ---- */

  function fireSearch(immediate) {
    clearTimeout(searchTimer);
    const weights = {};
    for (const item of addedWords) weights[item.word] = item.weight;
    if (immediate) {
      onSearch(weights);
    } else {
      searchTimer = setTimeout(() => onSearch(weights), SEARCH_DEBOUNCE_MS);
    }
  }
</script>

<div class="qs">
  <label class="search-label" for="concept-search">Search vocabulary</label>

  <div class="search-row">
    <div class="search-input-wrap">
      <input
        id="concept-search"
        class="search-input"
        type="text"
        bind:value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onfocusout={handleBlur}
        placeholder="Type a concept like cat, house, tie, beard"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="ac-list"
      />
      {#if isLoading}
        <span class="search-status">Searching…</span>
      {/if}
    </div>

    <button class="btn" type="button" onclick={addWord}>Add</button>
  </div>

  {#if isOpen && suggestions.length > 0}
    <ul id="ac-list" class="dropdown" role="listbox">
      {#each suggestions as word, i}
        <li role="option" aria-selected={highlightIdx === i}>
          <button
            type="button"
            class="dropdown-item"
            class:selected={highlightIdx === i}
            onmousedown={(ev) => { ev.preventDefault(); choose(word); }}
          >
            {word}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if errorMessage}
    <p class="inline-error">{errorMessage}</p>
  {/if}

  <div class="word-list">
    {#if addedWords.length === 0}
      <div class="empty-card">Add concepts to build your query vector.</div>
    {:else}
      {#each addedWords as item, idx (item.word)}
        <div class="slider-card">
          <div class="slider-header">
            <div>
              <span class="concept-label">{item.word}</span>
            </div>
            <div class="slider-actions">
              <span class="weight-chip">{(item.weight * 100).toFixed(0)}%</span>
              <button
                class="icon-btn"
                type="button"
                onclick={() => removeWord(idx)}
                aria-label="Remove {item.word}"
              >×</button>
            </div>
          </div>
          <input
            class="slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={item.weight}
            oninput={(e) => handleSlider(idx, e)}
            disabled={addedWords.length === 1}
            aria-label="{item.word} weight"
          />
        </div>
      {/each}

      <div class="list-footer">
        <span class="total">Σ {totalWeight.toFixed(3)}</span>
        <div class="footer-actions">
          <button class="btn btn-sm" type="button" onclick={normalizeWeights}>Normalize</button>
          <button class="btn btn-sm" type="button" onclick={resetAll}>Reset</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .qs {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .search-label {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .search-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.7rem;
    align-items: start;
  }

  .search-input-wrap {
    position: relative;
  }

  .search-input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.85rem 1rem;
    background: var(--bg-input);
    color: var(--text-heading);
    font: inherit;
    outline: none;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-muted);
  }

  .search-status {
    position: absolute;
    right: 0.95rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    font-size: 0.78rem;
  }

  .dropdown {
    margin: 0;
    padding: 0.4rem;
    list-style: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-panel);
    box-shadow: var(--shadow);
    max-height: 16rem;
    overflow-y: auto;
  }

  .dropdown-item {
    width: 100%;
    border: none;
    border-radius: 0.85rem;
    padding: 0.7rem 0.9rem;
    background: transparent;
    color: var(--text-heading);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .dropdown-item:hover,
  .dropdown-item.selected {
    background: var(--bg-muted);
  }

  .inline-error {
    margin: 0;
    font-size: 0.86rem;
    color: var(--error);
  }

  .word-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .empty-card {
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 1.2rem 1rem;
    color: var(--text-secondary);
    font-size: 0.92rem;
    line-height: 1.6;
    text-align: center;
  }

  .slider-card {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.85rem 0.9rem;
    background: var(--bg-panel);
    transition: border-color 180ms ease, box-shadow 180ms ease;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
  }

  .concept-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-heading);
  }

  .slider-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .weight-chip {
    min-width: 2.8rem;
    text-align: center;
    border-radius: 999px;
    padding: 0.3rem 0.6rem;
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    font-family: var(--font-mono);
  }

  .icon-btn {
    width: 1.8rem;
    height: 1.8rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 1.1rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    transition: background 140ms ease, border-color 140ms ease;
  }

  .icon-btn:hover {
    background: var(--error-bg);
    border-color: var(--error);
    color: var(--error);
  }

  .slider {
    width: 100%;
  }

  .list-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.3rem;
  }

  .total {
    font-size: 0.78rem;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .footer-actions {
    display: flex;
    gap: 0.4rem;
  }

  .btn-sm {
    padding: 0.35rem 0.7rem;
    font-size: 0.78rem;
  }
</style>
