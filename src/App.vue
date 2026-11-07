<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { observeAuthState } from './services/authService'
import CreateDeckDialog from './components/CreateDeckDialog.vue'

// The drawer is controlled on smaller screens and remains visible on desktop.
const drawer = ref(null)

// Authentication state
const currentUser = ref(null)
const authReady = ref(false)

let unsubscribeAuth = null

// Listen for authentication changes when the app starts.
onMounted(() => {
  unsubscribeAuth = observeAuthState((user) => {
    currentUser.value = user
    authReady.value = true
  })
})

// Stop listening when the app is unmounted.
onBeforeUnmount(() => {
  unsubscribeAuth?.()
})
</script>

<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-nav-icon
        v-if="$vuetify.display.mdAndDown"
        aria-label="Open navigation"
        @click="drawer = !drawer"
      />

      <v-app-bar-title>
        MTG Deck Tool
      </v-app-bar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :permanent="$vuetify.display.lgAndUp"
      :temporary="$vuetify.display.mdAndDown"
      width="260"
    >
      <v-list nav>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="My Decks"
          to="/"
          exact
          @click="drawer = false"
        />

        <v-divider class="my-2" />

        <CreateDeckDialog />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>