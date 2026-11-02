
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createDeck } from '../services/deckService'
import { getCurrentUser } from '../services/authService'

const router = useRouter()

// Dialog state
const dialog = ref(false)

// Form state
const deckName = ref('')
const deckFormat = ref('Standard')

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

// Feedback state
const errorMessage = ref('')
const creatingDeck = ref(false)

function openDialog() {
  deckName.value = ''
  deckFormat.value = 'Standard'
  errorMessage.value = ''
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  errorMessage.value = ''
}

async function handleCreateDeck() {
  errorMessage.value = ''

  if (!deckName.value.trim()) {
    errorMessage.value = 'Please enter a deck name.'
    return
  }

  creatingDeck.value = true

  try {
    // Get the currently authenticated Firebase user
    const user = await getCurrentUser()

    // Create the deck in Firebase
    const deckId = await createDeck(
      user.uid,
      deckName.value.trim(),
      deckFormat.value
    )

    console.log('New deck ID:', deckId)

    // Close dialog and navigate to the new deck
    dialog.value = false
    await router.push(`/deck/${deckId}`)

  } catch (error) {
    console.error('Could not create deck:', error)
    errorMessage.value = error.message || 'Something went wrong.'
  } finally {
    creatingDeck.value = false
  }
}
</script>

<template>
  <div>
    <!-- Sidebar button -->
    <v-list-item
      prepend-icon="mdi-plus-circle-outline"
      title="Create New Deck"
      @click="openDialog"
    />

    <!-- Create deck dialog -->
    <v-dialog
      v-model="dialog"
      max-width="450"
    >
      <v-card class="edit-dialog">
        <v-card-title>
          Create New Deck
        </v-card-title>

        <v-card-text>
          <v-form @submit.prevent="handleCreateDeck">
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
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ errorMessage }}
            </v-alert>

            <div class="edit-dialog__actions">
              <v-btn
                variant="text"
                @click="closeDialog"
                :disabled="creatingDeck"
              >
                Cancel
              </v-btn>

              <v-btn
                color="primary"
                type="submit"
                :loading="creatingDeck"
                :disabled="!deckName.trim()"
              >
                Create Deck
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
</div>
</template>
