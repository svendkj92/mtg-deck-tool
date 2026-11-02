<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getCurrentUser } from '../services/authService'
import { loadDecks, saveDeck, getCardArtCrop } from '../services/deckService'
import { useRoute } from 'vue-router'
import ManaCost from '../components/ManaCost.vue'

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

// Reaktiv state
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


let searchTimeout = null
// Hent kort fra Scryfall
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
      // Multifaced cards kan have mana cost på de enkelte faces
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
  // Annuller den tidligere timer
  clearTimeout(searchTimeout)

  // Hvis søgefeltet er tomt, rydder vi op
  if (!newValue.trim()) {
    searchMenuOpen.value = false
    cards.value = []
    error.value = ''
    return
  }

  // Start en ny timer på 800 ms
  searchTimeout = setTimeout(() => {
    searchCards()
  }, 800)
})

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

const flippedCards = ref(new Set())
const animatingCards = ref(new Set())

function toggleCardFace(card) {
  // Start animationen
  const animating = new Set(animatingCards.value)
  animating.add(card.id)
  animatingCards.value = animating

  // Vend kortet
  const updatedCards = new Set(flippedCards.value)

  if (updatedCards.has(card.id)) {
    updatedCards.delete(card.id)
  } else {
    updatedCards.add(card.id)
  }

  flippedCards.value = updatedCards
}

// Kaldes, når CSS-transitionen er færdig
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

const totalCards = computed(() =>
  deck.value.mainboard.reduce(
    (total, card) => total + card.quantity,
    0
  )
)

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

watch(
  [deck, deckName, deckFormat],
  () => {
    // Gem ikke, mens et eksisterende deck indlæses
    if (isLoadingDeck) return

    // Nulstil den tidligere timer, hvis brugeren laver
    // endnu en ændring inden for 800 millisekunder
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



async function loadDeckBannerArt(card) {
  deckBannerArt.value = ''

  const artCrop = await getCardArtCrop(card)

  // Kontrollér, at kortet stadig er det første i mainboardet.
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
                <v-row align="center">
                  <!-- Kortinformation -->
                  <v-col>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{ card.name }}
                    </div>

                    <div class="text-body-2 text-medium-emphasis">
                      {{ card.type_line }}
                    </div>

                    <div class="text-caption text-medium-emphasis">
                      <ManaCost :cost="card.mana_cost" />
                    </div>
                  </v-col>

                  <!-- Mainboard-knapper -->
                  <v-col cols="auto">
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

                  <!-- Sideboard-knapper -->
                  <v-col
                    v-if="currentFormatRules.sideboardEnabled"
                    cols="auto"
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
      <v-card-title class="deck-header">
        <h2>Mainboard</h2>

        <v-chip
          :color="mainboardIsValid ? 'primary' : 'error'"
          size="small"
          variant="tonal"
        >
          {{ totalCards }}/{{ currentFormatRules.mainboardMin }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <p v-if="deck.mainboard.length === 0" class="empty-deck">
          Your deck is empty. Search for cards and add them!
        </p>

        <div v-else class="deck-grid">
          <div
            v-for="card in deck.mainboard"
            :key="card.id"
            class="deck-item"
          >
          <div class="deck-card-image">
            <!-- Kortets 3D-flip -->
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

            <!-- Controls animeres væk under flip -->
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
                      @click.stop="changeQuantity(card, 1, 'mainboard')"
                    />

                    <v-btn
                      class="quantity-button"
                      icon="mdi-minus"
                      size="small"
                      density="compact"
                      variant="flat"
                      aria-label="Remove one copy"
                      @click.stop="changeQuantity(card, -1, 'mainboard')"
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
                    <v-list-item
                      title="Remove card"
                      prepend-icon="mdi-delete-outline"
                      @click="removeCard(card.id, 'mainboard')"
                    />
                  </v-list>
                </v-menu>
              </div>
            </Transition>

            <!-- Flip-knappen forbliver synlig -->
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
      </v-card-text>
    </v-card>
    
    <v-card
      v-if="currentFormatRules.sideboardEnabled"
      class="deck-section"
      variant="flat"
    >
      <v-card-title class="deck-header">
        <h2>Sideboard</h2>

        <v-chip
          :color="sideboardIsValid ? 'primary' : 'error'"
          size="small"
          variant="tonal"
        >
          {{ totalSideboardCards }}/{{ currentFormatRules.sideboardLimit }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <p v-if="deck.sideboard.length === 0" class="empty-deck">
          Your sideboard is empty. Add cards to get started!
        </p>

        <div v-else class="deck-grid">
          <div
            v-for="card in deck.sideboard"
            :key="card.id"
            class="deck-card"
          >
            <div class="deck-card-image">
            <!-- Kortets 3D-flip -->
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

            <!-- Controls animeres væk under flip -->
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
                      @click.stop="changeQuantity(card, 1, 'sideboard')"
                    />

                    <v-btn
                      class="quantity-button"
                      icon="mdi-minus"
                      size="small"
                      density="compact"
                      variant="flat"
                      aria-label="Remove one copy"
                      @click.stop="changeQuantity(card, -1, 'sideboard')"
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
                    <v-list-item
                      title="Remove card"
                      prepend-icon="mdi-delete-outline"
                      @click="removeCard(card.id, 'sideboard')"
                    />
                  </v-list>
                </v-menu>
              </div>
            </Transition>

            <!-- Flip-knappen forbliver synlig -->
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
      </v-card-text>
    </v-card>
  </main>
</template>

<style lang="scss" scoped>
@use "@/assets/variables" as *;

// ==========================================
// 1. Variabler
// Samler farver og værdier, der bruges flere steder.
// Gør det nemmere at ændre designets grundelementer.
// ==========================================

$color-surface: #1c1e25;
$color-muted: #a1a1aa;
$color-border: #30323a;
$color-error: #ff9292;

$radius: 12px;


// ==========================================
// 2. Globale styles
// Sørger for ensartet beregning af elementers størrelse
// og fjerner browserens standardmargin på body.
// ==========================================

:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: Arial, sans-serif;
}


// ==========================================
// 3. Appens overordnede layout
// Begrænser indholdets maksimale bredde og centrerer
// det på siden. Tilføjer luft omkring indholdet.
// ==========================================

.app {
  width: 100%;
  margin: 0;
  padding: 0 0 3rem;
}


// ==========================================
// 4. Sidens header
// Styler sidens overskrift og tilhørende beskrivende tekst.
// ==========================================

.deck-banner {
  position: relative;
  display: flex;
  align-items: flex-end;

  width: 100%;
  min-height: 340px;
  padding: 3rem;

  overflow: hidden;
  isolation: isolate;

  border-radius: $radius;
  background: #1c1e25;

  // Artwork placeres i højre side
  &__art {
    position: absolute;
    inset: 0 0 0 auto;
    z-index: -2;

    width: 70%;
    height: 100%;

    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  // Gradient der blander venstre baggrund med artwork
  &__overlay {
    position: absolute;
    inset: 0;
    z-index: -1;

    background: linear-gradient(
      to right,
      #1c1e25 0%,
      #1c1e25 25%,
      rgba(28, 30, 37, 0.95) 40%,
      rgba(28, 30, 37, 0.65) 55%,
      rgba(28, 30, 37, 0.15) 75%,
      transparent 100%
    );
  }

  // Fjern artwork og gradient, hvis decket er tomt
  &--empty {
    background: linear-gradient(
      135deg,
      #292d38,
      #17191f
    );
  }

  &__info {
    position: relative;
    z-index: 1;

    color: white;

    h1 {
      margin-top: 0.35rem;
      font-size: 2.2rem;
      font-weight: 600;
      line-height: 1.2;
    }
  }

  &__format {
    color: $color-accent;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
}

@media (max-width: 600px) {
  .deck-banner {
    min-height: 240px;
    padding: 1.5rem;

    &__art {
      width: 85%;
    }

    &__overlay {
      background: linear-gradient(
        to right,
        #1c1e25 0%,
        rgba(28, 30, 37, 0.95) 35%,
        rgba(28, 30, 37, 0.6) 65%,
        rgba(28, 30, 37, 0.15) 100%
      );
    }

    &__info h1 {
      font-size: 1.6rem;
    }
  }
}


// ==========================================
// 5. Søgeresultater
// Arrangerer søgeresultaterne lodret med afstand imellem.
// Tilpasser Vuetify-kortenes kant og baggrund.
// ==========================================

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-left: 3%;
  margin-right: 3%;
  max-height: 60vh;
  overflow-y: auto;
}

.search-result {
  border-color: $color-border;
  background: $color-surface;
}

.deck-editor-content {
  width: min(1200px, 94%);
  margin: 2rem auto 0;
}


// ==========================================
// 6. Mainboard og sideboard
// Styler de overordnede sektioner, deres overskrifter
// samt teksten, der vises, når et deck er tomt.
// ==========================================

.deck-section {
  width: min(1200px, 94%);
  margin: 3rem auto 0;
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
}

// Markerer ugyldige kortantal med en fejlfarve.
.count-invalid {
  color: $color-error !important;
}

// Centrerer beskeden, når et deck ikke indeholder kort.
.empty-deck {
  padding: 2rem 1rem;
  color: $color-muted;
  text-align: center;
}


// ==========================================
// 7. Kort-grid
// Arrangerer kortene i et responsivt grid.
// Hvert kort får sin egen plads i grid'et.
// ==========================================

.deck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 180px));
  gap: 1rem;
}

.deck-card {
  min-width: 0;
}


// ==========================================
// 8. Kortbilleder
// Sørger for korrekt visning af kortbillederne
// og skaber en positioneringsramme for overlays.
// ==========================================

.deck-card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 5 / 7;
  transition:
    transform 0.2s ease,
    filter 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    filter: drop-shadow(0 0 8px rgba($color-accent, 0.5));
  }  
    
  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 5.5%;
    transition:
      transform 0.2s ease,
      filter 0.2s ease;    
  }
}

// ==========================================
// 9. Antal-chip og quantity controls
// Placering af kortets antal og plus/minus-knapper
// oven på kortbilledet.
// ==========================================

.card-quantity-overlay {
  position: absolute;
  top: 12%;
  left: 8.5%;
  z-index: 2;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

// ==========================================
// Korrekt visning af flipped cards
// ==========================================
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

.card-controls {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;

  // Sørg for at de enkelte controls stadig kan klikkes
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

// Tilpasser Vuetify-chippen, der viser antal kopier.
.card-quantity-badge {
  width: 32px;
  min-width: 32px;
  justify-content: center;
  font-weight: 700;
  border-radius: 8px !important;
}

// Arrangerer plus/minus-knapperne lodret.
// Knapperne er skjult som standard.
.quantity-controls--overlay {
  display: flex;
  flex-direction: column;
  gap: 5px;

  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

// Viser knapperne, når brugeren holder musen over kortet
// eller navigerer til dem med tastaturet.
.deck-card-image:hover .quantity-controls--overlay,
.deck-card-image:focus-within .quantity-controls--overlay {
  opacity: 1;
  pointer-events: auto;
}

// Fælles udseende og størrelse på plus/minus-knapperne.
.quantity-button {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  border-radius: 8px !important;

  background: rgba(17, 19, 24, 0.92);
  color: white;
}


// ==========================================
// 10. Ellipsemenu
// Positionerer menu-knappen øverst til højre på kortet.
// ==========================================

.card-menu-trigger {
  position: absolute !important;
  top: 12%;
  right: 8%;
  z-index: 2;

  width: 22px !important;
  height: 32px !important;
  border-radius: 8px !important;

  background: rgba(17, 19, 24, 0.92);
  color: white;
}


// ==========================================
// 11. Responsivt design
// Tilpasser grid, afstande og knapper til mindre skærme.
// ==========================================

@media (max-width: 480px) {
  .app {
    padding: 2rem 0;
  }

  .page-header h1 {
    font-size: 2rem;
  }

  .deck-section {
    padding: 1rem;
  }

  // Viser to kort pr. række på små skærme.
  .deck-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }

  // Gør antal-chip og knapper lidt mindre.
  .card-quantity-badge {
    width: 28px;
    min-width: 28px;
  }

  .quantity-button {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
  }
}


// Touch-enheder:
// Viser altid plus/minus-knapperne, da hover ikke
// fungerer på samme måde som på en computer.

@media (hover: none) {
  .quantity-controls--overlay {
    opacity: 1;
    pointer-events: auto;
  }
}

</style>

