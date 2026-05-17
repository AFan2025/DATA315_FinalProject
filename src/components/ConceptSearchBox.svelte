<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { searchConcepts } from '../lib/api.js';

  const DEBOUNCE_MS = 220;

  const dispatch = createEventDispatcher();

  let query = '';
  let loading = false;
  let error = '';
  let isOpen = false;
  let selectedIndex = 0;
  let debounceTimer;
  let requestId = 0;

  /** @type {{ id: string, label: string }[]} */
  let suggestions = [];

  onDestroy(() => {
    clearTimeout(debounceTimer);
    requestId += 1;
  });

  $: trimmedQuery = query.trim();

  /** @param {InputEvent & { currentTarget: HTMLInputElement }} event */
  function handleInput(event) {
    query = event.currentTarget.value;
    error = '';
    scheduleSearch();
  }

  function scheduleSearch() {
    clearTimeout(debounceTimer);

    if (!trimmedQuery) {
      suggestions = [];
      isOpen = false;
      loading = false;
      return;
    }

    debounceTimer = setTimeout(() => {
      void fetchSuggestions(trimmedQuery);
    }, DEBOUNCE_MS);
  }

  /** @param {string} term */
  async function fetchSuggestions(term) {
    const currentRequestId = ++requestId;
    loading = true;
    error = '';

    try {
      const results = await searchConcepts(term);
      if (currentRequestId !== requestId) {
        return;
      }

      suggestions = results;
      isOpen = results.length > 0;
      selectedIndex = 0;
    } catch (searchError) {
      if (currentRequestId !== requestId) {
        return;
      }

      suggestions = [];
      isOpen = false;
      error = 'Could not load suggestions.';
      console.error(searchError);
    } finally {
      if (currentRequestId === requestId) {
        loading = false;
      }
    }
  }

  function addSelectedConcept() {
    const selected = suggestions[selectedIndex];
    if (!selected) {
      error = 'Select a concept from the search results first.';
      return;
    }

    dispatch('addconcept', selected);
    query = '';
    suggestions = [];
    isOpen = false;
    selectedIndex = 0;
    error = '';
  }

  /** @param {{ id: string, label: string }} concept */
  function chooseSuggestion(concept) {
    dispatch('addconcept', concept);
    query = '';
    suggestions = [];
    isOpen = false;
    selectedIndex = 0;
    error = '';
  }

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (!isOpen && event.key === 'Enter') {
      event.preventDefault();
      addSelectedConcept();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      addSelectedConcept();
    } else if (event.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<div class="search-shell">
  <label class="search-label" for="concept-search">Search vocabulary</label>
  <div class="search-row">
    <div
      class="search-input-wrap"
      role="combobox"
      aria-expanded={isOpen}
      aria-controls="concept-search-results"
      aria-haspopup="listbox"
    >
      <input
        id="concept-search"
        class="search-input"
        type="text"
        value={query}
        on:input={handleInput}
        on:keydown={handleKeydown}
        autocomplete="off"
        placeholder="Type a concept like cat, house, tie, beard"
        aria-autocomplete="list"
      />

      {#if loading}
        <span class="search-status">Searching…</span>
      {/if}
    </div>

    <button type="button" class="add-button" on:click={addSelectedConcept}>
      Add
    </button>
  </div>

  {#if isOpen}
    <ul id="concept-search-results" class="results-list" role="listbox">
      {#each suggestions as suggestion, index (suggestion.id)}
        <li>
          <button
            type="button"
            class:selected={selectedIndex === index}
            class="result-button"
            role="option"
            aria-selected={selectedIndex === index}
            on:click={() => chooseSuggestion(suggestion)}
          >
            <span>{suggestion.label}</span>
            <span class="result-id">{suggestion.id}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if error}
    <p class="inline-message error">{error}</p>
  {/if}
</div>

<style>
  .search-shell {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .search-label {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--muted-strong);
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
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: 0.95rem;
    padding: 0.95rem 1rem;
    background: var(--surface);
    color: var(--text-strong);
    font: inherit;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgba(105, 122, 111, 0.12);
  }

  .search-status {
    position: absolute;
    right: 0.95rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    font-size: 0.78rem;
  }

  .add-button {
    border: 1px solid var(--border);
    border-radius: 0.95rem;
    padding: 0.95rem 1rem;
    background: var(--surface-strong);
    color: var(--text-strong);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: transform 140ms ease, border-color 140ms ease, background-color 140ms ease;
  }

  .add-button:hover {
    transform: translateY(-1px);
    border-color: var(--border-strong);
    background: var(--surface-contrast);
  }

  .results-list {
    margin: 0;
    padding: 0.4rem;
    list-style: none;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface);
    box-shadow: 0 18px 40px rgba(34, 41, 37, 0.08);
    max-height: 16rem;
    overflow: auto;
  }

  .result-button {
    width: 100%;
    border: none;
    border-radius: 0.85rem;
    padding: 0.8rem 0.9rem;
    background: transparent;
    color: var(--text-strong);
    font: inherit;
    text-align: left;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
  }

  .result-button:hover,
  .result-button.selected {
    background: var(--surface-strong);
  }

  .result-id {
    color: var(--muted);
    font-size: 0.84rem;
  }

  .inline-message {
    margin: 0;
    font-size: 0.86rem;
  }

  .error {
    color: var(--error);
  }
</style>
