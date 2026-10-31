
<script setup>
import { ref, onMounted } from 'vue'
import { createDeck, loadDecks, deleteDeck } from '../services/deckService'
import { useRouter, useRoute } from 'vue-router'
import { getCurrentUser } from '../services/authService'

const router = useRouter()
const route = useRoute()

const userId = ref('')
const savedDecks = ref([])
const authError = ref('')
const deckSaveError = ref('')
const deckSaveMessage = ref('')

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

async function loginAnonymously() {
  authError.value = ''

  try {
    const user = await getCurrentUser()
    userId.value = user.uid
    savedDecks.value = await loadDecks(userId.value)
  } catch (error) {
    console.error('Login fejlede:', error)
    authError.value = error.message
  }
}

async function createNewDeck() {
  deckSaveError.value = ''
  deckSaveMessage.value = ''

  try {
    if (!userId.value) {
      throw new Error('Please wait for login to complete.')
    }

    if (!deckName.value.trim()) {
      throw new Error('Please enter a deck name.')
    }

    const deckId = await createDeck(
      userId.value,
      deckName.value.trim(),
      deckFormat.value
    )

    savedDecks.value = await loadDecks(userId.value)

    router.push(`/deck/${deckId}`)
  } catch (error) {
    console.error('Could not create deck:', error)
    deckSaveError.value = error.message
  }
}

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

onMounted(() => {
  loginAnonymously()
})
</script>

<template>
  <main class="dashboard">
  <v-card class="dashboard-section" variant="outlined">
    <v-card-title>
      My Decks
    </v-card-title>

    <v-card-text>
      <v-alert
        v-if="authError"
        type="error"
        variant="tonal"
      >
        {{ authError }}
      </v-alert>

      <div v-else-if="!userId">
        Logging in...
      </div>

      <v-list
        v-else-if="savedDecks.length"
        bg-color="transparent"
      >
        <v-list-item
          v-for="savedDeck in savedDecks"
          :key="savedDeck.id"
          :title="savedDeck.name"
          :subtitle="savedDeck.format"
          prepend-icon="mdi-cards"
          @click="router.push(`/deck/${savedDeck.id}`)"
        >
          <template #append>
            <v-btn
              icon="mdi-delete"
              color="error"
              variant="text"
              aria-label="Delete deck"
              @click.stop="removeDeck(savedDeck)"
            />
          </template>
        </v-list-item>
      </v-list>

      <p v-else>
        No saved decks yet.
      </p>
    </v-card-text>
  </v-card>

  <v-card class="dashboard-section" variant="outlined">
    <v-card-title>Create a New Deck</v-card-title>

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
        >
          {{ deckSaveError }}
        </v-alert>

        <v-alert
          v-if="deckSaveMessage"
          type="success"
          variant="tonal"
        >
          {{ deckSaveMessage }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          :disabled="!userId"
        >
          Create deck
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
  </main>
</template>

<style lang="scss" scoped>
.dashboard {
  width: min(1400px, 94%);
  margin: 0 auto;
  padding: 3rem 0;
}

.dashboard-section {
  margin-bottom: 2rem;
  border: 1px solid #30323a;
  border-radius: 12px;
  background: #1c1e25;
}
</style>

