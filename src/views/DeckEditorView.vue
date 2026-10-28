<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCurrentUser } from '../services/authService'
import { loadDecks, saveDeck } from '../services/deckService'
import { useRoute } from 'vue-router'

const route = useRoute()

//Anonymt login
const userId = ref('')
const authError = ref('')

async function loginAnonymously() {
  authError.value = ''

  try {
    const user = await getCurrentUser()
    userId.value = user.uid
  } catch (error) {
    console.error('Login fejlede:', error)
    authError.value = error.message
  }
}

async function saveActiveDeck() {
  deckSaveMessage.value = ''
  deckSaveError.value = ''

  try {
    if (!userId.value) {
      throw new Error('Please log in first.')
    }

    if (!activeDeckId.value) {
      throw new Error('Please create or select a deck first.')
    }

    const deckData = {
      name: deckName.value,
      format: deckFormat.value,
      mainboard: deck.value.mainboard,
      sideboard: deck.value.sideboard,
      folderId: ''
    }

    await saveDeck(userId.value, activeDeckId.value, deckData)

    deckSaveMessage.value = 'Deck saved successfully!'
  } catch (error) {
    console.error('Could not save deck:', error)
    deckSaveError.value = error.message || 'An error occurred while saving the deck.'
  }
}

function selectDeck(savedDeck) {
  activeDeckId.value = savedDeck.id
  deckName.value = savedDeck.name
  deckFormat.value = savedDeck.format
  deck.value = {
    mainboard: savedDeck.mainboard || [],
    sideboard: savedDeck.sideboard || []
  }

  deckSaveMessage.value = ''
  deckSaveError.value = ''
}

// Reaktiv state
const deck = ref({
  mainboard: [],
  sideboard: []
})
const searchQuery = ref('')
const cards = ref([])
const loading = ref(false)
const error = ref('')
const deckFormat = ref('Standard')
const activeDeckId = ref('')
const deckName = ref('')
const deckSaveMessage = ref('')
const deckSaveError = ref('')

// Hent kort fra Scryfall
async function searchCards() {
  if (!searchQuery.value.trim()) 
  return

  loading.value = true
  error.value = ''
  cards.value = []

  try {
    const query = encodeURIComponent(searchQuery.value.trim())

    const response = await fetch(
      `https://api.scryfall.com/cards/search?q=${query}`
    )

    if (!response.ok) {
      throw new Error('No cards found for the given search query.')
    }

    const data = await response.json()
    cards.value = data.data
  } catch (err) {
    error.value = err.message || 'An error occurred while searching for cards.'
  } finally {
    loading.value = false
  }
}

function addCard(card) {
  const existingCard = deck.value.mainboard.find(
    deckCard => deckCard.id === card.id
  )

  if (existingCard) {
    existingCard.quantity++
  } else {
    deck.value.mainboard.push({
      id: card.id,
      name: card.name,
      imageUrl: card.image_uris?.normal
        ?? card.card_faces?.[0]?.image_uris?.normal
        ?? '',
      quantity: 1,
      manaCost: card.mana_cost || '',
      manaValue: card.cmc ?? 0,
      typeLine: card.type_line || '',
      colors: card.colors || [],
      colorIdentity: card.color_identity || []
    })
  }
}

function removeCard(cardId) {
  deck.value.mainboard = deck.value.mainboard.filter(
    card => card.id !== cardId
  )
}

function changeQuantity(card, amount) {
  card.quantity += amount

  if (card.quantity <= 0) {
    removeCard(card.id)
  }
}

const totalCards = computed(() =>
  deck.value.mainboard.reduce(
    (total, card) => total + card.quantity,
    0
  )
)

const formatLimits = {
  Standard: 60,
  Modern: 60,
  Legacy: 60,
  Vintage: 60,
  Pauper: 60,
  Timeless: 60,
  Historic: 60,
  Commander: 100,
  'Duel Commander': 100,
  'Competitive Brawl': 100
}

const deckLimit = computed(() =>
  formatLimits[deckFormat.value] ?? 60
)

async function loadActiveDeck() {
    try {
    if (!userId.value) {
      await loginAnonymously()
    }

    if (!userId.value) {
      throw new Error('Could not log in.')
    }

    const decks = await loadDecks(userId.value)

    const matchingDeck = decks.find(
      savedDeck => savedDeck.id === route.params.id
    )

    if (!matchingDeck) {
      throw new Error('Deck not found.')
    }

    selectDeck(matchingDeck)
  } catch (error) {
    console.error('Could not load deck:', error)
    deckSaveError.value = error.message
  }
}

onMounted(() => {
  loadActiveDeck()
})
</script>

<template>
  <main class="app">
    <header class="page-header">
      <h1>MTG Deck Tool</h1>
      <p>Search for cards for your next deck.</p>
    </header>

    <form class="search-form" @submit.prevent="searchCards">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search for a card..."
        aria-label="Search for Magic cards"
      />

      <button type="submit" :disabled="loading">
        {{ loading ? 'Searching...' : 'Search' }}
      </button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="status">Fetching cards...</p>

    <section v-if="cards.length" class="card-grid">
      <article
        v-for="card in cards"
        :key="card.id"
        class="card-result"
      >
        <img
          v-if="card.image_uris?.normal"
          :src="card.image_uris.normal"
          :alt="card.name"
          loading="lazy"
        />

        <img
          v-else-if="card.card_faces?.[0]?.image_uris?.normal"
          :src="card.card_faces[0].image_uris.normal"
          :alt="card.name"
          loading="lazy"
        />

        <div class="card-info">
          <button
            class="add-button"
            @click="addCard(card)"
          >
          + Add to deck
          </button>
        </div>

      </article>
    </section>

    <section class="deck-section">
      <header class="deck-header">
      <h2>Your deck</h2>
      <span>{{ totalCards }}/{{ deckLimit }}</span>
    </header>

    <p v-if="deck.mainboard.length === 0" class="empty-deck">
    Your deck is empty. Search for cards and add them!
    </p>

    <ul v-else class="deck-list">
      <li
        v-for="card in deck.mainboard"
        :key="card.id"
        class="deck-item"
      >
      <img
        v-if="card.imageUrl"
        :src="card.imageUrl"
        :alt="card.name"
      />

      <span class="deck-card-name">{{ card.name }}</span>

      <div class="quantity-controls">
        <button
          type="button"
          :aria-label="`Remove one ${card.name}`"
          @click="changeQuantity(card, -1)"
        >
          −
        </button>

        <span>{{ card.quantity }}</span>

        <button
          type="button"
          :aria-label="`Add one ${card.name}`"
          @click="changeQuantity(card, 1)"
        >
          +
        </button>
      </div>

      <button
        type="button"
        class="remove-button"
        @click="removeCard(card.id)"
      >
        Remove
      </button>
      </li>
      </ul>
      <button
        type="button"
        class="save-button"
        @click="saveActiveDeck"
        :disabled="!activeDeckId"
      >
        Save Deck
      </button>

      <p v-if="deckSaveMessage" class="status">
        {{ deckSaveMessage }}
      </p>

      <p v-if="deckSaveError" class="error">
        {{ deckSaveError }}
      </p>
    </section>
  </main>
</template>

<style lang="scss" scoped>
// 1. Variabler
$color-bg: #111318;
$color-surface: #1c1e25;
$color-input: #202229;
$color-border: #30323a;
$color-text: #f4f4f5;
$color-muted: #a1a1aa;
$color-accent: #ffa81b;
$color-error: #ff9292;

$radius: 12px;
$radius-small: 8px;

// 2. Globale styles
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  background: $color-bg;
  color: $color-text;
  font-family: Arial, sans-serif;
}

button,
input {
  font: inherit;
}

// 3. Appens layout
.app {
  width: min(1400px, 94%);
  margin: 0 auto;
  padding: 3rem 0;
}

// 4. Header
.page-header {
  margin-bottom: 2rem;

  h1 {
    margin: 0 0 0.5rem;
    font-size: 2.5rem;
  }

  p {
    color: $color-muted;
  }
}

// 5. Søgeformular
.search-form {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;

  input {
    flex: 1;
    min-width: 0;
    padding: 0.9rem 1rem;
    border: 1px solid #3f414a;
    border-radius: $radius-small;
    background: $color-input;
    color: $color-text;

    &:focus {
      outline: 2px solid $color-accent;
      outline-offset: 2px;
    }
  }

  button {
    padding: 0.9rem 1.4rem;
    border: 0;
    border-radius: $radius-small;
    background: $color-accent;
    color: #171a13;
    font-weight: bold;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover:not(:disabled) {
      opacity: 0.85;
    }

    &:disabled {
      opacity: 0.6;
      cursor: wait;
    }
  }
}

// Valg af deck-format
.format-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  margin-top: 1.5rem;

  label {
    color: $color-muted;
    font-size: 0.9rem;
    font-weight: 600;
  }

  select {
    min-width: 180px;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 1px solid $color-border;
    border-radius: $radius-small;
    background: $color-input;
    color: $color-text;
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      border-color: $color-accent;
    }

    &:focus {
      outline: none;
      border-color: $color-accent;
      box-shadow: 0 0 0 2px rgba(185, 242, 124, 0.2);
    }

    option {
      background: $color-input;
      color: $color-text;
    }
  }
}

.add-button {
  width: 100%;
  padding: 0.7rem;
  border: 0;
  border-radius: $radius-small;
  background: $color-accent;
  color: #171a13;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    opacity: 0.85;
  }
}

.deck-section {
  margin-top: 3rem;
  padding: 2rem;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-surface;
}

.deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid $color-border;

  h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  span {
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    background: $color-input;
    color: $color-accent;
    font-size: 0.85rem;
    font-weight: bold;
    white-space: nowrap;
  }
}

.empty-deck {
  padding: 2rem 1rem;
  color: $color-muted;
  text-align: center;
}

.deck-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.deck-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid $color-border;
  border-radius: $radius-small;
  background: $color-input;
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &:hover {
    border-color: $color-accent;
    background: #272a33;
  }

  img {
    display: block;
    width: 100%;
    max-width: 220px;
    height: auto;
    border-radius: 8px;
  }
}

.deck-card-name {
  display: none;
}

.quantity-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;

  span {
    min-width: 1.5rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid $color-border;
    border-radius: 6px;
    background: $color-surface;
    color: $color-text;
    font-size: 1.1rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      background: $color-accent;
      color: #171a13;
    }
  }
}

.remove-button {
  padding: 0.55rem 0.8rem;
  border: 1px solid rgba(255, 146, 146, 0.3);
  border-radius: 8px;
  background: rgba(255, 146, 146, 0.08);
  color: $color-error;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    border-color: $color-error;
    background: rgba(255, 146, 146, 0.18);
  }

  &:active {
    background: rgba(255, 146, 146, 0.28);
  }
}

// 6. Feedback til brugeren
.error {
  color: $color-error;
}

.status {
  color: $color-accent;
}

// 7. Kortoversigt
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;
}

.card-result {
  overflow: hidden;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-surface;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: $color-accent;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
  }
}

.deck-manager {
  margin-top: 2rem;
  padding: 1.5rem;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-surface;

  h2,
  h3 {
    margin-top: 0;
  }

  form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  input {
    flex: 1;
    min-width: 180px;
    padding: 0.75rem;
    border: 1px solid $color-border;
    border-radius: $radius-small;
    background: $color-input;
    color: $color-text;
  }

  button {
    padding: 0.75rem 1rem;
    border: 0;
    border-radius: $radius-small;
    background: $color-accent;
    color: #171a13;
    font-weight: bold;
    cursor: pointer;
  }

  ul {
    padding-left: 1.25rem;
  }

  li {
    margin-bottom: 0.5rem;
  }
}

.save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding: 0.9rem 1.5rem;
  border: 0;
  border-radius: $radius-small;
  background: $color-accent;
  color: #171a13;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(0px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
    transform: none;
  }
}

// 8. Responsivt design
@media (max-width: 480px) {
  .app {
    padding: 2rem 0;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .search-form {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
    .deck-section {
    padding: 1rem;
  }

  .format-selector {
  align-items: stretch;
  flex-direction: column;
  gap: 0.5rem;

  select {
    width: 100%;
    min-width: 0;
  }
}

  .deck-item {
    .deck-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .deck-item {
      padding: 0.4rem;

      img {
        width: 100%;
      }
    }

    .quantity-controls {
      gap: 0.25rem;

      button {
        width: 26px;
        height: 26px;
      }
    }

    .remove-button {
      width: 100%;
    }
  }

  .quantity-controls {
    gap: 0.35rem;
  }

  .quantity-controls {
  gap: 0.25rem;

  button {
    width: 26px;
    height: 26px;
  }
}
}
</style>
