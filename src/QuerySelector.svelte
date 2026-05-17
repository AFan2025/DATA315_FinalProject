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
  <div class="search-wrap">
    <div class="input-wrap">
      <input
        type="text"
        bind:value={query}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onfocusout={handleBlur}
        placeholder="Search concepts…"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="ac-list"
      />
      {#if isLoading}
        <span class="spinner"></span>
      {/if}
    </div>

    {#if isOpen && suggestions.length > 0}
      <ul id="ac-list" class="dropdown" role="listbox">
        {#each suggestions as word, i}
          <li role="option" aria-selected={highlightIdx === i} class:hl={highlightIdx === i}>
            <button type="button" onmousedown={(ev) => { ev.preventDefault(); choose(word); }}>
              {word}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="action-row">
    <button class="btn btn-primary" type="button" onclick={addWord} disabled={!selectedWord}>
      Add
    </button>
    <button class="btn" type="button" onclick={resetAll} disabled={addedWords.length === 0}>
      Reset
    </button>
    {#if selectedWord}
      <span class="selected-badge">{selectedWord}</span>
    {/if}
  </div>

  {#if errorMessage}
    <div class="error">{errorMessage}</div>
  {/if}

  <div class="word-list">
    {#if addedWords.length === 0}
      <p class="hint">Add concepts to build your query vector.</p>
    {:else}
      {#each addedWords as item, idx (item.word)}
        <div class="word-item">
          <div class="word-top">
            <span class="word-name">{item.word}</span>
            <button class="remove-btn" type="button" onclick={() => removeWord(idx)} title="Remove">✕</button>
          </div>
          <div class="slider-row">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={item.weight}
              oninput={(e) => handleSlider(idx, e)}
              disabled={addedWords.length === 1}
            />
            <span class="weight-val">{(item.weight * 100).toFixed(0)}%</span>
          </div>
        </div>
      {/each}
      <div class="total">Total: {totalWeight.toFixed(4)}</div>
    {/if}
  </div>
</div>

<style>
  .qs {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .search-wrap {
    position: relative;
  }

  .input-wrap {
    position: relative;
  }

  .input-wrap input {
    width: 100%;
    padding: 8px 10px;
    padding-right: 32px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-input);
    color: var(--text);
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
  }

  .input-wrap input:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .spinner {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: translateY(-50%) rotate(360deg); }
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin: 4px 0 0;
    padding: 4px;
    list-style: none;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
    z-index: 100;
    max-height: 220px;
    overflow-y: auto;
  }

  .dropdown li button {
    display: block;
    width: 100%;
    padding: 6px 8px;
    border: none;
    background: none;
    color: var(--text);
    font-size: 13px;
    text-align: left;
    border-radius: 4px;
  }

  .dropdown li button:hover,
  .dropdown li.hl button {
    background: var(--accent-light);
    color: var(--accent-hover);
  }

  .action-row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .selected-badge {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--accent-light);
    color: var(--accent);
    font-weight: 500;
  }

  .error {
    color: var(--error);
    font-size: 12px;
    background: var(--error-bg);
    padding: 6px 10px;
    border-radius: var(--radius-sm);
  }

  .word-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hint {
    color: var(--text-secondary);
    font-size: 13px;
    text-align: center;
    padding: 24px 0;
  }

  .word-item {
    background: var(--bg-muted);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
  }

  .word-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .word-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-heading);
  }

  .remove-btn {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    color: var(--text-secondary);
    font-size: 12px;
    border-radius: 4px;
    padding: 0;
    line-height: 1;
  }

  .remove-btn:hover {
    background: var(--error-bg);
    color: var(--error);
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slider-row input[type="range"] {
    flex: 1;
    height: 6px;
    margin: 0;
  }

  .weight-val {
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-secondary);
    min-width: 32px;
    text-align: right;
  }

  .total {
    font-size: 11px;
    color: var(--text-secondary);
    text-align: right;
    font-family: var(--font-mono);
  }
</style>
