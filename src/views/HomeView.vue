
<script setup>
import { ref, onMounted } from 'vue'
import {
  loadDecks,
  deleteDeck,
  saveDeck,
  getCardArtCrop
} from '../services/deckService'
import { useRouter } from 'vue-router'
import { getCurrentUser } from '../services/authService'

// Router and collection state used by the dashboard.
const router = useRouter()

const userId = ref('')
const savedDecks = ref([])
const authError = ref('')

const formats = [
  'Standard',
  'Modern',
  'Legacy',
  'Vintage',
  'Pauper',
  'Timeless',
  'Historic',
  'Commander'
]

// Dialog state and form values for creating/editing decks.
// Edit dialog
const createDialog = ref(false)
const editDialog = ref(false)
const editingDeck = ref(null)

const editDeckName = ref('')
const editDeckFormat = ref('Standard')

const editError = ref('')
const savingEdit = ref(false)

// Artwork enrichment: attach a cover image to each saved deck for the collection cards.
// Adds a coverUrl to each deck.
async function addDeckCovers(decks) {
  return Promise.all(
    decks.map(async (deck) => {
      const firstCard = deck.mainboard?.[0]

      if (!firstCard) {
        return {
          ...deck,
          coverUrl: ''
        }
      }

      const coverUrl = await getCardArtCrop(firstCard)

      return {
        ...deck,
        coverUrl
      }
    })
  )
}

// Loads decks from Firebase and adds artwork.
async function refreshDecks() {
  const decks = await loadDecks(userId.value)
  savedDecks.value = await addDeckCovers(decks)
}

// Opens the edit dialog with the selected deck's details.
function openEditDialog(deck) {
  editingDeck.value = deck
  editDeckName.value = deck.name
  editDeckFormat.value = deck.format

  editError.value = ''
  editDialog.value = true
}

// Closes the edit dialog.
function closeEditDialog() {
  editDialog.value = false
  editingDeck.value = null
  editError.value = ''
}

// Edit workflow: validate the form, persist the updated metadata, then refresh local UI state.
// Saves changes to an existing deck.
async function saveDeckChanges() {
  editError.value = ''

  if (!editDeckName.value.trim()) {
    editError.value = 'Please enter a deck name.'
    return
  }

  if (!editingDeck.value || !userId.value) return

  savingEdit.value = true

  try {
    const deckData = {
      name: editDeckName.value.trim(),
      format: editDeckFormat.value,
      mainboard: editingDeck.value.mainboard || [],
      sideboard: editingDeck.value.sideboard || [],
      folderId: editingDeck.value.folderId || ''
    }

    await saveDeck(
      userId.value,
      editingDeck.value.id,
      deckData
    )

    // Updates the local list after a successful save.
    editingDeck.value.name = deckData.name
    editingDeck.value.format = deckData.format

    closeEditDialog()

  } catch (error) {
    console.error('Could not update deck:', error)
    editError.value = error.message || 'Could not update deck.'
  } finally {
    savingEdit.value = false
  }
}

// Authentication and initial collection loading.
// Signs the user in and loads the decks.
async function loginAnonymously() {
  authError.value = ''

  try {
    const user = await getCurrentUser()
    userId.value = user.uid

    await refreshDecks()
  } catch (error) {
    console.error('Login failed:', error)
    authError.value = error.message
  }
}

// Delete workflow: confirm with the user before removing the deck from Firebase and the local list.
// Deletes a deck.
async function removeDeck(deck) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${deck.name}"?`
  )

  if (!confirmed) return

  try {
    await deleteDeck(userId.value, deck.id)

    savedDecks.value = savedDecks.value.filter(
      savedDeck => savedDeck.id !== deck.id
    )

  } catch (error) {
    console.error('Could not delete deck:', error)
    deckSaveError.value = error.message
  }
}

// Color display order follows the standard WUBRG sequence.
const manaColorOrder = ['W', 'U', 'B', 'R', 'G']

function getDeckColors(deck) {
  const allCards = [
    ...(deck.mainboard || []),
    ...(deck.sideboard || [])
  ]

  const colors = new Set()

  allCards.forEach(card => {
    card.colors?.forEach(color => {
      colors.add(color)
    })
  })

  return manaColorOrder.filter(color => colors.has(color))
}

// Navigation: open the editor route for the selected deck.
// Navigates to the deck editor.
async function openDeck(deckId) {
  console.log('1. Clicked deck:', deckId)

  try {
    const result = await router.push(`/deck/${deckId}`)

    console.log('2. Router result:', result)
    console.log('3. Current route:', router.currentRoute.value.fullPath)

  } catch (error) {
    console.error('Navigation error:', error)
  }
}

// Authenticate and populate the deck collection when the dashboard mounts.
onMounted(() => {
  loginAnonymously()
})
</script>

<template>
  <main class="dashboard">

    <!-- Deck collection -->
    <section class="dashboard-section">

      <div class="section-header">
        <h2>My Decks</h2>
      </div>

      <v-alert
        v-if="authError"
        type="error"
        variant="tonal"
      >
        {{ authError }}
      </v-alert>

      <div v-else-if="!userId" class="loading-state">
        Logging in...
      </div>

      <div v-else-if="savedDecks.length" class="deck-grid">

        <v-card
          v-for="savedDeck in savedDecks"
          :key="savedDeck.id"
          class="deck-card"
          variant="flat"
          @click="openDeck(savedDeck.id)"
        >

          <!-- Artwork -->
          <div
            class="deck-card__art"
            :class="{ 'deck-card__art--empty': !savedDeck.coverUrl }"
            :style="savedDeck.coverUrl
              ? { backgroundImage: `url('${savedDeck.coverUrl}')` }
              : {}"
          >

            <div class="deck-card__overlay"></div>

            <!-- Manasymbols -->
            <div class="deck-card__mana-symbols">
              <img
                v-for="color in getDeckColors(savedDeck)"
                :key="color"
                :src="`https://svgs.scryfall.io/card-symbols/${color}.svg`"
                :alt="`${color} mana`"
              />
            </div>
            <!-- Deck information -->
            <div class="deck-card__info">
              <span class="deck-card__format">
                {{ savedDeck.format }}
              </span>

              <h3>{{ savedDeck.name }}</h3>
            </div>

            <!-- Edit and delete buttons -->
            <div class="deck-card__actions">

              <v-btn
                icon="mdi-pencil-outline"
                color="white"
                variant="text"
                size="small"
                aria-label="Edit deck"
                @click.stop="openEditDialog(savedDeck)"
              />

              <v-btn
                icon="mdi-delete-outline"
                color="white"
                variant="text"
                size="small"
                aria-label="Delete deck"
                @click.stop="removeDeck(savedDeck)"
              />

            </div>

          </div>
        </v-card>

      </div>

      <p v-else class="empty-state">
        No saved decks yet. Create your first deck!
      </p>

    </section>

    <!-- Edit deck dialog -->
    <v-dialog
      v-model="editDialog"
      max-width="450"
    >
      <v-card class="edit-dialog">

        <v-card-title>
          Edit Deck
        </v-card-title>

        <v-card-text>
          <v-form @submit.prevent="saveDeckChanges">

            <v-text-field
              v-model="editDeckName"
              label="Deck name"
              required
            />

            <v-select
              v-model="editDeckFormat"
              :items="formats"
              label="Format"
            />

            <v-alert
              v-if="editError"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ editError }}
            </v-alert>

            <div class="edit-dialog__actions">

              <v-btn
                variant="text"
                @click="closeEditDialog"
              >
                Cancel
              </v-btn>

              <v-btn
                color="primary"
                type="submit"
                :loading="savingEdit"
                :disabled="!editDeckName.trim()"
              >
                Save changes
              </v-btn>

            </div>

          </v-form>
        </v-card-text>

      </v-card>
    </v-dialog>

    <!-- Create deck dialog -->
    <v-dialog
      v-model="createDialog"
      max-width="450"
    >
      <v-card class="edit-dialog">

        <v-card-title>
          Create New Deck
        </v-card-title>

        <v-card-text>
          <v-form @submit.prevent="createNewDeck">

            <v-text-field
              v-model="deckName"
              label="Deck name"
              placeholder="e.g. Mono Red Aggro"
              required
            />

            <v-select
              v-model="deckFormat"
              :items="formats"
              label="Format"
            />

            <v-alert
              v-if="deckSaveError"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ deckSaveError }}
            </v-alert>

            <div class="edit-dialog__actions">

              <v-btn
                variant="text"
                @click="closeCreateDialog"
              >
                Cancel
              </v-btn>

              <v-btn
                color="primary"
                type="submit"
                :disabled="!deckName.trim()"
              >
                Create Deck
              </v-btn>

            </div>

          </v-form>
        </v-card-text>

      </v-card>
    </v-dialog>

  </main>
</template>

<style lang="scss" scoped>
@use "@/assets/variables" as *;

.dashboard {
  width: min(1400px, 94%);
  margin: 0 auto;
  padding: 3rem 0;
}

.dashboard-section {
  margin-bottom: 2rem;
}

.section-header {
  margin-bottom: 1.5rem;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
  }
}

// Deck grid
.deck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1.5rem;
}

// Deck cards
.deck-card {
  display: flex;
  overflow: hidden;
  border-radius: 12px;
  background: #1c1e25;

  aspect-ratio: 16 / 9;
  min-height: unset;
  height: auto;

  cursor: pointer;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow:
      0 0 0 1px rgba($color-accent, 0.7),
      0 8px 24px rgba($color-accent, 0.2);
  }

  // Mana Symbols
  .deck-card__mana-symbols {
  position: absolute;
  top: 1.25rem;
  left: 1.25rem;
  z-index: 2;

  display: flex;
  align-items: center;
  gap: 0.25rem;

  img {
    width: 24px;
    height: 24px;

    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
  }
}

  // Artwork
  &__art {
    position: relative;
    display: flex;
    flex: 1;
    align-items: flex-end;

    width: 100%;
    height: 100%;
    min-height: unset;
    padding: 1.25rem;

    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;

    &--empty {
      background: linear-gradient(
        135deg,
        #292d38,
        #17191f
      );
    }
  }

  // Gradient overlay
  &__overlay {
    position: absolute;
    inset: 0;

    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.95) 0%,
      rgba(0, 0, 0, 0.75) 30%,
      rgba(0, 0, 0, 0.35) 65%,
      rgba(0, 0, 0, 0.05) 100%
    );
  }

  // Deck name and format
  &__info {
    position: relative;
    z-index: 1;
    color: white;

    h3 {
      margin-top: 0.35rem;
      font-size: 1.3rem;
      font-weight: 600;
      line-height: 1.2;
    }
  }

  &__format {
    color: $color-accent;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  // Edit and delete buttons
  &__actions {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;

    display: flex;
    gap: 0.25rem;

    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover &__actions {
    opacity: 1;
  }
}

// Empty and loading states
.empty-state,
.loading-state {
  padding: 2rem 0;
  color: rgba(255, 255, 255, 0.6);
}

// Edit dialog
.edit-dialog {
  border: 1px solid #30323a;
  border-radius: 12px;
  background: #1c1e25;

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
}

// Mobile
@media (max-width: 600px) {
  .deck-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .deck-card {
    &__art {
      padding: 0.85rem;
    }

    &__info h3 {
      font-size: 1.05rem;
    }

    &__actions {
      opacity: 1;
    }
  }
}
</style>
