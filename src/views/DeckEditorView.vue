<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getCurrentUser } from '../services/authService'
import { loadDecks, saveDeck, getCardArtCrop } from '../services/deckService'
import { useRoute } from 'vue-router'
import ManaCost from '../components/ManaCost.vue'

// Route context: the deck ID in the URL determines which saved deck is loaded.
const route = useRoute()

// Authentication state and anonymous sign-in
// The Firebase UID is used to read and save this user's decks.
// Anonymous sign-in
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

// Persistence: serialize the editor state and save it to Firebase.
async function saveActiveDeck() {
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

    console.log('Deck saved successfully!')
  } catch (error) {
    console.error('Could not save deck:', error)
  }
}

let saveTimeout = null
let isLoadingDeck = false

function selectDeck(savedDeck) {
  isLoadingDeck = true

  activeDeckId.value = savedDeck.id
  deckName.value = savedDeck.name
  deckFormat.value = savedDeck.format
  deck.value = {
    mainboard: savedDeck.mainboard || [],
    sideboard: savedDeck.sideboard || []
  }

  isLoadingDeck = false
}

// Editor state: values shared by the search UI, deck display, and save workflow.
// Reactive state
const deck = ref({
  mainboard: [],
  sideboard: []
})
const deckBannerArt = ref('')
const searchQuery = ref('')
const cards = ref([])
const loading = ref(false)
const error = ref('')
const deckFormat = ref('Standard')
const activeDeckId = ref('')
const deckName = ref('')
const searchMenuOpen = ref(false)
const loadError = ref('')


// Card search: debounce is managed by the watcher below before this request runs.
let searchTimeout = null
// Fetch cards from Scryfall
async function searchCards() {
  clearTimeout(searchTimeout)

  if (!searchQuery.value.trim()) return

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
    cards.value = data.data.map(card => {
      // Multi-faced cards may have a mana cost on each individual face.
      if (card.card_faces && !card.mana_cost) {
        return {
          ...card,
          mana_cost: card.card_faces
            .map(face => face.mana_cost)
            .filter(Boolean)
            .join(' // ')
        }
      }

      return card
    })
  } catch (err) {
    error.value = err.message || 'An error occurred while searching for cards.'
  } finally {
    loading.value = false
    searchMenuOpen.value = true
  }
}

watch(searchMenuOpen, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = ''
    cards.value = []
    error.value = ''
  }
})

watch(searchQuery, (newValue) => {
  // Cancel the previous timer.
  clearTimeout(searchTimeout)

  // If the search field is empty, clear the related state.
  if (!newValue.trim()) {
    searchMenuOpen.value = false
    cards.value = []
    error.value = ''
    return
  }

  // Start a new timer with an 800 ms delay.
  searchTimeout = setTimeout(() => {
    searchCards()
  }, 800)
})

// Deck actions: add a card to either the mainboard or sideboard.
function addCard(card, targetBoard = 'mainboard', quantity = 1) {
  const board = deck.value[targetBoard]

  if (!board) return

  const existingCard = board.find(
    deckCard => deckCard.id === card.id
  )

  if (existingCard) {
    existingCard.quantity += quantity
  } else {
    board.push({
      id: card.id,
      name: card.name,

      // Store images for both sides of multiface cards
      cardFaces: card.card_faces?.map(face => ({
        name: face.name,
        imageUrl: face.image_uris?.normal || ''
      })) || [],

      // Front image (default)
      imageUrl: card.image_uris?.normal
        ?? card.card_faces?.[0]?.image_uris?.normal
        ?? '',

      quantity: quantity,
      manaCost: card.mana_cost || '',
      manaValue: card.cmc ?? 0,
      typeLine: card.type_line || '',
      colors: card.colors || [],
      colorIdentity: card.color_identity || []
    })
  }
}

// Card-face UI state: track flips and transitions independently for each card.
const flippedCards = ref(new Set())
const animatingCards = ref(new Set())

function toggleCardFace(card) {
  // Start the animation.
  const animating = new Set(animatingCards.value)
  animating.add(card.id)
  animatingCards.value = animating

  // Flip the card.
  const updatedCards = new Set(flippedCards.value)

  if (updatedCards.has(card.id)) {
    updatedCards.delete(card.id)
  } else {
    updatedCards.add(card.id)
  }

  flippedCards.value = updatedCards
}

// Called when the CSS transition has finished.
function finishCardFlip(cardId) {
  const animating = new Set(animatingCards.value)
  animating.delete(cardId)
  animatingCards.value = animating
}

function removeCard(cardId, targetBoard = 'mainboard') {
  deck.value[targetBoard] = deck.value[targetBoard].filter(
    card => card.id !== cardId
  )
}

function changeQuantity(card, amount, targetBoard = 'mainboard') {
  card.quantity += amount

  if (card.quantity <= 0) {
    removeCard(card.id, targetBoard)
  }
}

// Display grouping: classify cards using their type line for the deck layout.
function getCardTypeGroup(typeLine = '') {
  const types = typeLine.split(' — ')[0]

  if (types.includes('Creature')) return 'Creatures'
  if (types.includes('Planeswalker')) return 'Planeswalkers'
  if (types.includes('Artifact')) return 'Artifacts'
  if (types.includes('Enchantment')) return 'Enchantments'
  if (types.includes('Instant')) return 'Instants'
  if (types.includes('Sorcery')) return 'Sorceries'
  if (types.includes('Land')) return 'Lands'

  return 'Other'
}

// Sort cards by mana value, using card name as a secondary sort.
function sortCardsByManaValue(cards) {
  return [...cards].sort((a, b) => {
    const manaValueDifference =
      Number(a.manaValue ?? 0) - Number(b.manaValue ?? 0)

    if (manaValueDifference !== 0) {
      return manaValueDifference
    }

    return a.name.localeCompare(b.name)
  })
}

// Build the ordered mainboard groups and calculate the quantity total for each.
const mainboardGroups = computed(() => {
  const groupOrder = [
    'Creatures',
    'Planeswalkers',
    'Artifacts',
    'Enchantments',
    'Instants',
    'Sorceries',
    'Lands',
    'Other'
  ]

  const groups = {}

  deck.value.mainboard.forEach(card => {
    const groupName = getCardTypeGroup(card.typeLine)

    if (!groups[groupName]) {
      groups[groupName] = []
    }

    groups[groupName].push(card)
  })

  return groupOrder
    .filter(groupName => groups[groupName]?.length)
    .map(groupName => ({
      name: groupName,
      cards: sortCardsByManaValue(groups[groupName]),
      total: groups[groupName].reduce(
        (sum, card) => sum + card.quantity,
        0
      )
    }))
})

const deckDisplayGroups = computed(() => {
  // Start with the existing mainboard groups.
  const groups = mainboardGroups.value.map(group => ({
    ...group,
    targetBoard: 'mainboard'
  }))

  // Add the sideboard as a single group.
  if (currentFormatRules.value.sideboardEnabled && deck.value.sideboard.length > 0) {
    groups.push({
      name: 'Sideboard',
      cards: deck.value.sideboard,
      total: totalSideboardCards.value,
      targetBoard: 'sideboard'
    })
  }

  return groups
})

const totalCards = computed(() =>
  deck.value.mainboard.reduce(
    (total, card) => total + card.quantity,
    0
  )
)

// Format rules drive deck size validation and whether a sideboard is shown.
const formatRules = {
  Standard: {
    mainboardMin: 60,
    sideboardEnabled: true,
    sideboardLimit: 15
  },
  Modern: {
    mainboardMin: 60,
    sideboardEnabled: true,
    sideboardLimit: 15
  },
  Legacy: {
    mainboardMin: 60,
    sideboardEnabled: true,
    sideboardLimit: 15
  },
  Vintage: {
    mainboardMin: 60,
    sideboardEnabled: true,
    sideboardLimit: 15
  },
  Pauper: {
    mainboardMin: 60,
    sideboardEnabled: true,
    sideboardLimit: 15
  },
  Timeless: {
    mainboardMin: 60,
    sideboardEnabled: true,
    sideboardLimit: 15
  },
  Historic: {
    mainboardMin: 60,
    sideboardEnabled: true,
    sideboardLimit: 15
  },
  Commander: {
    mainboardMin: 100,
    sideboardEnabled: false,
    sideboardLimit: 0
  },
  'Duel Commander': {
    mainboardMin: 100,
    sideboardEnabled: false,
    sideboardLimit: 0
  },
  'Competitive Brawl': {
    mainboardMin: 100,
    sideboardEnabled: false,
    sideboardLimit: 0
  }
}

const deckLimit = computed(() =>
  formatRules[deckFormat.value]?.mainboardMin ?? 60
)

const currentFormatRules = computed(() =>
  formatRules[deckFormat.value] ?? formatRules.Standard
)

const totalSideboardCards = computed(() =>
  deck.value.sideboard.reduce(
    (total, card) => total + card.quantity,
    0
  )
)

const mainboardIsValid = computed(() =>
  totalCards.value >= currentFormatRules.value.mainboardMin
)

const sideboardIsValid = computed(() =>
  totalSideboardCards.value <= currentFormatRules.value.sideboardLimit
)

// Autosave: debounce changes to deck contents, name, or format.
watch(
  [deck, deckName, deckFormat],
  () => {
    // Do not save while an existing deck is loading.
    if (isLoadingDeck) return

    // Reset the previous timer if the user makes
    // another change within 800 milliseconds.
    clearTimeout(saveTimeout)

    saveTimeout = setTimeout(() => {
      if (activeDeckId.value && userId.value) {
        saveActiveDeck()
      }
    }, 800)
  },
  {
    deep: true,
    flush: 'sync'
  }
)

// Loading: retrieve the deck matching the current route after authentication.
async function loadActiveDeck() {
  loadError.value = ''

  try {
    if (!userId.value) {
      await loginAnonymously()
    }

    if (!userId.value) {
      throw new Error('Could not log in.')
    }

    const decks = await loadDecks(userId.value)
    console.log('Loaded decks:', decks)

    const matchingDeck = decks.find(
      savedDeck => savedDeck.id === route.params.id
    )

    if (!matchingDeck) {
      throw new Error('Deck not found.')
    }

    selectDeck(matchingDeck)

  } catch (error) {
    console.error('Could not load deck:', error)
    loadError.value = error.message
  }
}



// Banner artwork: use Scryfall's art crop for the first mainboard card.
async function loadDeckBannerArt(card) {
  deckBannerArt.value = ''

  const artCrop = await getCardArtCrop(card)

  // Check that the card is still the first card in the mainboard.
  if (deck.value.mainboard[0]?.id === card?.id) {
    deckBannerArt.value = artCrop
  }
}

watch(
  () => deck.value.mainboard[0]?.id,
  (cardId) => {
    if (!cardId) {
      deckBannerArt.value = ''
      return
    }

    const firstCard = deck.value.mainboard[0]
    loadDeckBannerArt(firstCard)
  },
  { immediate: true }
)

watch(
  () => route.params.id,
  () => {
    loadActiveDeck()
  },
  { immediate: true }
)
</script>

<template>
  <main class="app">
    <v-alert
      v-if="loadError"
      type="error"
      variant="tonal"
      class="ma-4"
    >
      {{ loadError }}
    </v-alert>
    <header
      class="deck-banner"
      :class="{ 'deck-banner--empty': !deckBannerArt }"
    >
      <div
        v-if="deckBannerArt"
        class="deck-banner__art"
        :style="{ backgroundImage: `url('${deckBannerArt}')` }"
      ></div>

      <div class="deck-banner__overlay"></div>

      <div class="deck-banner__info">
        <span class="deck-banner__format">
          {{ deckFormat }}
        </span>

        <h1>{{ deckName }}</h1>
      </div>
    </header>

    <div class="deck-editor-content">
    <v-menu
      v-model="searchMenuOpen"
      :disabled="!searchQuery.trim()"
      :close-on-content-click="false"
      location="bottom"
      width="auto"
      max-width="100%"
      :offset="8"
    >
      <template #activator="{ props }">
        <v-form @submit.prevent>
          <v-row align="center">
            <v-col>
              <v-text-field
                v-bind="props"
                v-model="searchQuery"
                label="Search for a card"
                placeholder="e.g. Lightning Bolt"
                prepend-inner-icon="mdi-magnify"
                hide-details
              />
            </v-col>
          </v-row>
        </v-form>
      </template>

      <v-card class="search-results" variant="outlined">
        <v-card-text>
          <v-progress-linear
            v-if="loading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <template v-if="cards.length">
            <v-card
              v-for="card in cards"
              :key="card.id"
              class="search-result"
              variant="outlined"
            >
              <v-card-text>
                <v-row class="search-result-layout" align="center">
                  <!-- Card information -->
                  <v-col cols="12" sm>
                    <div class="search-result-info">
                      <div class="search-result-name text-subtitle-1 font-weight-bold">
                        {{ card.name }}
                      </div>

                      <div class="search-result-type text-body-2 text-medium-emphasis">
                        {{ card.type_line }}
                      </div>

                      <div class="text-caption text-medium-emphasis">
                        <ManaCost :cost="card.mana_cost" />
                      </div>
                    </div>
                  </v-col>

                  <!-- Mainboard buttons -->
                  <v-col cols="12" sm="auto" class="search-result-actions">
                    <div class="text-caption text-medium-emphasis mb-1">
                      Mainboard
                    </div>

                    <v-btn-group density="comfortable">
                      <v-btn
                        size="small"
                        color="primary"
                        @click="addCard(card, 'mainboard', 1)"
                      >
                        +1
                      </v-btn>

                      <v-btn
                        size="small"
                        color="primary"
                        @click="addCard(card, 'mainboard', 4)"
                      >
                        +4
                      </v-btn>
                    </v-btn-group>
                  </v-col>

                  <!-- Sideboard buttons -->
                  <v-col
                    v-if="currentFormatRules.sideboardEnabled"
                    cols="12"
                    sm="auto"
                    class="search-result-actions"
                  >
                    <div class="text-caption text-medium-emphasis mb-1">
                      Sideboard
                    </div>

                    <v-btn-group density="comfortable">
                      <v-btn
                        size="small"
                        variant="outlined"
                        color="primary"
                        @click="addCard(card, 'sideboard', 1)"
                      >
                        +1
                      </v-btn>

                      <v-btn
                        size="small"
                        variant="outlined"
                        color="primary"
                        @click="addCard(card, 'sideboard', 4)"
                      >
                        +4
                      </v-btn>
                    </v-btn-group>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>

          <div v-else-if="loading" class="text-medium-emphasis">
            Searching...
          </div>

          <div v-else-if="searchQuery.trim()" class="text-medium-emphasis">
            No cards found.
          </div>
        </v-card-text>
      </v-card>
    </v-menu>
    </div>


    
    <v-card class="deck-section" variant="flat">
      <!-- Mainboard header -->
      <v-card-title class="deck-header">
        <h2>Deck</h2>

        <v-chip
          :color="mainboardIsValid ? 'primary' : 'error'"
          size="small"
          variant="tonal"
        >
          {{ totalCards }}/{{ currentFormatRules.mainboardMin }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- Message shown when the mainboard is empty -->
        <p v-if="deck.mainboard.length === 0" class="empty-deck">
          Your deck is empty. Search for cards and add them!
        </p>

        <!-- All groups -->
      <div class="deck-groups"> 
        <div
          v-for="group in deckDisplayGroups"
          :key="group.name"
          class="deck-group"
        >
          <!-- Group header -->
          <div class="deck-group-header">
            <h3>{{ group.name }}</h3>

            <v-chip
              size="small"
              variant="tonal"
            >
              {{ group.total }}
            </v-chip>
          </div>

          <!-- Cards in the group -->
          <div
            v-if="group.cards.length"
            class="deck-grid"
          >
            <div
              v-for="card in group.cards"
              :key="card.id"
              class="deck-item"
            >
              <div class="deck-card-image">
                <!-- Card 3D flip -->
                <div
                  class="flip-card"
                  @transitionend="finishCardFlip(card.id)"
                  :class="{ 'is-flipped': flippedCards.has(card.id) }"
                >
                  <div class="flip-card-inner">
                    <div class="flip-card-face flip-card-front">
                      <img :src="card.imageUrl" :alt="card.name" />
                    </div>

                    <div class="flip-card-face flip-card-back">
                      <img
                        :src="card.cardFaces?.[1]?.imageUrl || card.imageUrl"
                        :alt="card.cardFaces?.[1]?.name || card.name"
                      />
                    </div>
                  </div>
                </div>

                <!-- Card controls -->
                <Transition name="card-controls">
                  <div
                    v-if="!animatingCards.has(card.id)"
                    class="card-controls"
                  >
                    <div class="card-quantity-overlay">
                      <v-chip
                        class="card-quantity-badge"
                        color="surface"
                        size="small"
                        variant="flat"
                      >
                        x{{ card.quantity }}
                      </v-chip>

                      <div class="quantity-controls--overlay">
                        <v-btn
                          class="quantity-button"
                          icon="mdi-plus"
                          size="small"
                          density="compact"
                          variant="flat"
                          aria-label="Add one copy"
                          @click.stop="changeQuantity(card, 1, group.targetBoard)"
                        />

                        <v-btn
                          class="quantity-button"
                          icon="mdi-minus"
                          size="small"
                          density="compact"
                          variant="flat"
                          aria-label="Remove one copy"
                          @click.stop="changeQuantity(card, -1, group.targetBoard)"
                        />
                      </div>
                    </div>

                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          class="card-menu-trigger"
                          icon="mdi-dots-vertical"
                          size="small"
                          density="compact"
                          variant="flat"
                          aria-label="Open card actions"
                          @click.stop
                        />
                      </template>

                      <v-list density="compact">
                        <!-- Quantity actions are available in the menu on mobile. -->
                        <v-list-item
                          class="quantity-menu-item"
                          title="Add one copy"
                          prepend-icon="mdi-plus"
                          @click="changeQuantity(card, 1, group.targetBoard)"
                        />
                        <v-list-item
                          class="quantity-menu-item"
                          title="Remove one copy"
                          prepend-icon="mdi-minus"
                          @click="changeQuantity(card, -1, group.targetBoard)"
                        />
                        <v-list-item
                          title="Remove card"
                          prepend-icon="mdi-delete-outline"
                          @click="removeCard(card.id, group.targetBoard)"
                        />
                      </v-list>
                    </v-menu>
                  </div>
                </Transition>

                <!-- Flip button -->
                <v-btn
                  v-if="card.cardFaces?.length > 1"
                  class="card-flip-trigger"
                  icon="mdi-sync"
                  size="small"
                  density="compact"
                  variant="flat"
                  aria-label="Flip card"
                  @click.stop="toggleCardFace(card); $event.currentTarget.blur()"
                />
              </div>
            </div>
          </div>
        </div>
      </div>   
      </v-card-text>
    </v-card>

  </main>
</template>

<style lang="scss" scoped>
@use "@/assets/variables" as *;

$radius: 12px;

// Page layout
.app {
  width: 100%;
  padding-bottom: 2rem;
}

// Deck banner
.deck-banner {
  position: relative;
  display: flex;
  align-items: flex-end;
  width: 100%;
  min-height: 210px;
  padding: 1.25rem;
  overflow: hidden;
  isolation: isolate;
  border-radius: 0;
  background: $color-surface;

  &__art {
    position: absolute;
    inset: 0 0 0 auto;
    z-index: -2;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      to right,
      $color-surface 0%,
      rgba(28, 30, 37, 0.92) 30%,
      rgba(28, 30, 37, 0.55) 65%,
      rgba(28, 30, 37, 0.12) 100%
    );
  }

  &--empty {
    background: linear-gradient(135deg, #292d38, #17191f);
  }

  &__info {
    position: relative;
    z-index: 1;
    max-width: 100%;
    color: white;

    h1 {
      margin-top: 0.35rem;
      font-size: clamp(1.45rem, 5vw, 2.2rem);
      font-weight: 600;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
  }

  &__format {
    color: $color-accent;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
}

// Search
.deck-editor-content,
.deck-section {
  width: calc(100% - 2rem);
  max-width: 1200px;
  margin-right: auto;
  margin-left: auto;
}

.deck-editor-content {
  margin-top: 1.25rem;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-height: 60dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.search-result {
  border-color: $color-border;
  background: $color-surface;

  :deep(.v-card-text) {
    padding: 0.75rem;
  }

  :deep(.v-row) {
    row-gap: 0.5rem;
  }

  :deep(.v-col) {
    min-width: 0;
  }
}

.search-result-name {
  overflow-wrap: anywhere;
  line-height: 1.35;
}

.search-result-type {
  overflow-wrap: anywhere;
}

// Mobile is the default layout: card details and actions stack vertically.
.search-result-layout {
  align-items: flex-start;
}

.search-result-info {
  width: 100%;
}

.search-result-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 0.25rem;
}

// Larger screens progressively place details and actions on the same row.
@media (min-width: 600px) {
  .search-result-layout {
    align-items: center;
  }

  .search-result-info {
    width: auto;
  }

  .search-result-actions {
    padding-top: 0;
  }
}

// Mainboard and sideboard
.deck-section {
  margin-top: 2rem;
  padding: 0;
}

.deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 1rem;
  padding: 0 0 0.75rem;
  border-bottom: 1px solid $color-border;

  h2 {
    margin: 0;
    font-size: 1.35rem;
  }
}

.deck-groups {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.5rem;
}

.deck-group {
  flex: 0 1 auto;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.deck-group-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid $color-border;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
}

.count-invalid {
  color: $color-error !important;
}

.empty-deck {
  padding: 1.5rem 0.75rem;
  color: $color-muted;
  text-align: center;
}

// Card layout
.deck-grid {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: 0.65rem;
}

// Two cards fill each row on small screens, including the space after card two.
.deck-item {
  width: calc((100% - 0.65rem) / 2);
  flex: 0 0 calc((100% - 0.65rem) / 2);
}

.deck-card {
  min-width: 0;
}

.deck-card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 5 / 7;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;

  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 5.5%;
  }
}

// Card-face flip
.card-flip-trigger {
  position: absolute;
  top: 35%;
  right: 8.5%;
  z-index: 2;
}

.flip-card {
  width: 100%;
  height: 100%;
  perspective: 1000px;

  .flip-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.4s ease-in-out;
    transform-style: preserve-3d;
  }

  &.is-flipped .flip-card-inner {
    transform: rotateY(180deg);
  }

  .flip-card-face {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .flip-card-back {
    transform: rotateY(180deg);
  }
}

// Card controls
.card-controls {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.card-controls-enter-active,
.card-controls-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.card-controls-enter-from,
.card-controls-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.card-quantity-overlay {
  position: absolute;
  top: 8%;
  left: 7%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.card-quantity-badge {
  width: 32px;
  min-width: 32px;
  justify-content: center;
  font-weight: 700;
  border-radius: 8px !important;
}

.quantity-controls--overlay {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  opacity: 1;
  pointer-events: auto;
  transition: opacity 0.15s ease;
}

// On mobile, quantity changes are accessed through the ellipsis menu.
.quantity-controls--overlay {
  display: none;
}

.quantity-menu-item {
  display: list-item;
}

.quantity-button {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  border-radius: 8px !important;
  background: rgba(17, 19, 24, 0.92);
  color: white;
}

.card-menu-trigger {
  position: absolute !important;
  top: 8%;
  right: 7%;
  z-index: 2;
  width: 30px !important;
  height: 30px !important;
  border-radius: 8px !important;
  background: rgba(17, 19, 24, 0.92);
  color: white;
}

// Larger screens progressively add space and increase card size.
@media (min-width: 600px) {
  .deck-group {
    width: fit-content;
  }

  .deck-item {
    width: clamp(120px, 19vw, 165px);
    flex: 0 0 auto;
  }

  .quantity-controls--overlay {
    display: flex;
  }

  .quantity-menu-item {
    display: none;
  }

  .deck-banner {
    min-height: 270px;
    padding: 2rem;
    border-radius: $radius;

    &__art {
      width: 82%;
    }

    &__overlay {
      background: linear-gradient(
        to right,
        $color-surface 0%,
        $color-surface 20%,
        rgba(28, 30, 37, 0.9) 38%,
        rgba(28, 30, 37, 0.55) 60%,
        rgba(28, 30, 37, 0.1) 100%
      );
    }
  }

  .deck-editor-content {
    margin-top: 1.75rem;
  }

  .deck-section {
    margin-top: 2.5rem;
  }

  .deck-groups {
    gap: 2rem;
  }

  .deck-grid {
    gap: 0.85rem;
  }

  .deck-item {
    width: clamp(120px, 19vw, 165px);
  }
}

@media (min-width: 960px) {
  .app {
    padding-bottom: 3rem;
  }

  .deck-banner {
    min-height: 340px;
    padding: 3rem;
  }

  .deck-editor-content,
  .deck-section {
    width: min(1200px, calc(100% - 3rem));
  }

  .deck-editor-content {
    margin-top: 2rem;
  }

  .deck-section {
    margin-top: 3rem;
  }

  .deck-header {
    margin: 1rem;

    h2 {
      font-size: 1.5rem;
    }
  }

  .deck-group-header {
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;

    h3 {
      font-size: 1.1rem;
    }
  }

  .deck-grid {
    gap: 1rem;
  }

  .deck-item {
    width: clamp(140px, 11vw, 180px);
  }

  // Hover-only enhancements are reserved for devices with a mouse or trackpad.
  @media (hover: hover) and (pointer: fine) {
    .deck-card-image:hover {
      transform: translateY(-4px);
      filter: drop-shadow(0 0 8px rgba($color-accent, 0.5));
    }

    .quantity-controls--overlay {
      opacity: 0;
      pointer-events: none;
    }

    .deck-card-image:hover .quantity-controls--overlay,
    .deck-card-image:focus-within .quantity-controls--overlay {
      opacity: 1;
      pointer-events: auto;
    }
  }
}
</style>