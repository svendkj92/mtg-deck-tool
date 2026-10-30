
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
    <header class="page-header">
      <h1>MTG Deck Tool</h1>
    </header>

<section class="dashboard-section">
  <h2>My Decks</h2>

  <p v-if="authError" class="error">
    {{ authError }}
  </p>

  <p v-else-if="!userId">
    Logging in...
  </p>

  <ul v-else-if="savedDecks.length">
    <li v-for="savedDeck in savedDecks" :key="savedDeck.id">
      <button
        type="button"
        class="deck-button"
        @click="router.push(`/deck/${savedDeck.id}`)"
      >
        {{ savedDeck.name }} — {{ savedDeck.format }}
      </button>
      <button
        type="button"
        class="delete-button"
        @click="removeDeck(savedDeck)"
      >
        Delete
      </button>
    </li>
  </ul>

  <p v-else>
    No saved decks yet.
  </p>
</section>

    <section class="dashboard-section">
      <h2>Create a New Deck</h2>

      <form @submit.prevent="createNewDeck">
        <label for="deck-name">Deck name</label>
        <input
          id="deck-name"
          v-model="deckName"
          placeholder="e.g. Mono Red Aggro"
          required
        />

        <label for="deck-format">Format</label>
        <select id="deck-format" v-model="deckFormat">
          <option
            v-for="format in formats"
            :key="format"
            :value="format"
          >
            {{ format }}
          </option>
        </select>
        <p v-if="deckSaveError" class="error">
          {{ deckSaveError }}
        </p>
        
        <p v-if="deckSaveMessage" class="status">
          {{ deckSaveMessage }}
        </p>
        <button
          type="submit"
          :disabled="!userId" 
          class="create-button">
          Create deck
        </button>
      </form>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.dashboard {
  width: min(1400px, 94%);
  margin: 0 auto;
  padding: 3rem 0;
  ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }
}

.page-header {
  margin-bottom: 2.5rem;

  h1 {
    margin-bottom: 0.5rem;
  }

  p {
    opacity: 0.7;
  }
}

.dashboard-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #30323a;
  border-radius: 12px;
  background: #1c1e25;

  h2 {
    margin-top: 0;
  }

  form {
    display: grid;
    gap: 0.75rem;
    max-width: 450px;
  }

  input,
  select {
    padding: 0.8rem;
    border: 1px solid #30323a;
    border-radius: 8px;
    background: #202229;
    color: #f4f4f5;
    font: inherit;
  }

  .create-button, .deck-button {
    margin-top: 0.5rem;
    padding: 0.8rem;
    border: 0;
    border-radius: 8px;
    background: #ffa81b;
    color: #171a13;
    font-weight: bold;
    cursor: pointer;
  }
}

.delete-button {
  padding: 0.6rem 0.9rem;
  border: 1px solid rgba(255, 146, 146, 0.3);
  border-radius: 8px;
  background: rgba(255, 146, 146, 0.08);
  color: #ff9292;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: #ff9292;
    background: rgba(255, 146, 146, 0.18);
  }

  &:active {
    background: rgba(255, 146, 146, 0.28);
  }
}

@media (min-width: 800px) {
  .dashboard-section form {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    max-width: 700px;
  }

  .dashboard-section form label {
    grid-column: 1 / -1;
  }
}
</style>

