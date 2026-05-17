<script>
  import { onDestroy } from 'svelte';

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
  const DEBOUNCE_MS = 200;
  const MAX_WORDS = 5;

  /** @typedef {{ word: string, weight: number }} WeightedWord */

  /** @type {string} */
  let query = '';
  /** @type {string[]} */
  let suggestions = [];
  /** @type {string} */
  let selectedWord = '';
  /** @type {boolean} */
  let isOpen = false;
  /** @type {boolean} */
  let isLoading = false;
  /** @type {string} */
  let errorMessage = '';
  /** @type {WeightedWord[]} */
  let addedWords = [];

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let debounceTimer;
  /** @type {AbortController | undefined} */
  let requestAbortController;

  onDestroy(() => {
    clearTimeout(debounceTimer);
    requestAbortController?.abort();
  });

  $: totalWeight = addedWords.reduce((sum, item) => sum + item.weight, 0);

  /** @param {Event & { currentTarget: HTMLInputElement }} event */
  function handleInput(event) {
    query = event.currentTarget.value;
    selectedWord = '';
    scheduleAutocomplete(query);
  }

  /** @param {string} nextQuery */
  function scheduleAutocomplete(nextQuery) {
    clearTimeout(debounceTimer);

    if (!nextQuery.trim()) {
      suggestions = [];
      isOpen = false;
      isLoading = false;
      errorMessage = '';
      requestAbortController?.abort();
      return;
    }

    debounceTimer = setTimeout(() => {
      void fetchSuggestions(nextQuery.trim());
    }, DEBOUNCE_MS);
  }

  /** @param {string} searchText */
  async function fetchSuggestions(searchText) {
    requestAbortController?.abort();
    requestAbortController = new AbortController();
    isLoading = true;
    errorMessage = '';

    try {
      const response = await fetch(
        `${API_BASE}/autocomplete?query=${encodeURIComponent(searchText)}&limit=10`,
        { signal: requestAbortController.signal }
      );

      if (!response.ok) {
        throw new Error(`Autocomplete request failed with status ${response.status}`);
      }

      const data = await response.json();
      suggestions = Array.isArray(data.matches) ? data.matches : [];
      isOpen = suggestions.length > 0;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        errorMessage = 'Could not load suggestions.';
        suggestions = [];
        isOpen = false;
      }
    } finally {
      isLoading = false;
    }
  }

  /** @param {string} word */
  function chooseSuggestion(word) {
    query = word;
    selectedWord = word;
    suggestions = [];
    isOpen = false;
    errorMessage = '';
  }

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (event.key === 'Enter' && suggestions.length > 0) {
      chooseSuggestion(suggestions[0]);
    }

    if (event.key === 'Escape') {
      isOpen = false;
    }
  }

  /** @param {WeightedWord[]} words */
  function applyUniformWeights(words) {
    if (words.length === 0) {
      return [];
    }

    const uniformWeight = 1 / words.length;
    return words.map((item) => ({ ...item, weight: uniformWeight }));
  }

  function addSelectedWord() {
    if (!selectedWord) {
      errorMessage = 'Select a word from the dropdown first.';
      return;
    }

    if (addedWords.length >= MAX_WORDS) {
      errorMessage = `You can add at most ${MAX_WORDS} words.`;
      return;
    }

    if (addedWords.some((item) => item.word === selectedWord)) {
      errorMessage = 'That word has already been added.';
      return;
    }

    const nextWords = [...addedWords, { word: selectedWord, weight: 0 }];
    addedWords = applyUniformWeights(nextWords);
    errorMessage = '';
    query = '';
    selectedWord = '';
    suggestions = [];
    isOpen = false;
  }

  function resetAddedWords() {
    addedWords = [];
    selectedWord = '';
    query = '';
    suggestions = [];
    isOpen = false;
    errorMessage = '';
  }

  /** @param {number} index
   *  @param {Event & { currentTarget: HTMLInputElement }} event
   */
  function handleSliderInput(index, event) {
    if (addedWords.length === 0) {
      return;
    }

    if (addedWords.length === 1) {
      addedWords = [{ ...addedWords[0], weight: 1 }];
      return;
    }

    const nextWeight = Number.parseFloat(event.currentTarget.value);
    const clampedWeight = Math.max(0, Math.min(1, Number.isFinite(nextWeight) ? nextWeight : 0));
    const remainder = 1 - clampedWeight;

    const updated = addedWords.map((item) => ({ ...item }));
    updated[index].weight = clampedWeight;

    const otherIndices = updated
      .map((_, i) => i)
      .filter((i) => i !== index);

    const othersTotal = otherIndices.reduce((sum, i) => sum + updated[i].weight, 0);

    if (othersTotal > 0) {
      for (const i of otherIndices) {
        updated[i].weight = (updated[i].weight / othersTotal) * remainder;
      }
    } else {
      const evenWeight = remainder / otherIndices.length;
      for (const i of otherIndices) {
        updated[i].weight = evenWeight;
      }
    }

    const runningTotal = updated.reduce((sum, item) => sum + item.weight, 0);
    const correction = 1 - runningTotal;
    updated[index].weight += correction;

    addedWords = updated;
    errorMessage = '';
  }
</script>

<div>
  <label for="vocab-search">Search vocabulary</label>
  <input
    id="vocab-search"
    type="text"
    bind:value={query}
    on:input={handleInput}
    on:keydown={handleKeydown}
    autocomplete="off"
    aria-autocomplete="list"
    aria-controls="vocab-suggestions"
    placeholder="Type a word"
  />

  <button type="button" on:click={addSelectedWord}>Add</button>
  <button type="button" on:click={resetAddedWords}>Reset</button>

  {#if isLoading}
    <div>Loading suggestions...</div>
  {/if}

  {#if isOpen && suggestions.length > 0}
    <ul id="vocab-suggestions" role="listbox">
      {#each suggestions as word}
        <li role="option" aria-selected={selectedWord === word}>
          <button type="button" on:click={() => chooseSuggestion(word)}>
            {word}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if errorMessage}
    <div>{errorMessage}</div>
  {/if}

  {#if selectedWord}
    <div>Selected: {selectedWord}</div>
  {/if}

  <div>
    <h3>Added words</h3>
    {#if addedWords.length === 0}
      <div>No words added yet.</div>
    {:else}
      {#each addedWords as item, index}
        <div>
          <div>{item.word}</div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={item.weight}
            on:input={(event) => handleSliderInput(index, event)}
            disabled={addedWords.length === 1}
          />
          <span>{item.weight.toFixed(2)}</span>
        </div>
      {/each}
      <div>Total weight: {totalWeight.toFixed(4)}</div>
    {/if}
  </div>
</div>