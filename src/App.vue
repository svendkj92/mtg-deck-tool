
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { logoutUser } from './services/authService'
import CreateDeckDialog from './components/CreateDeckDialog.vue'

// Router
const router = useRouter()

// The drawer is controlled on smaller screens.
const drawer = ref(null)

// Shared authentication state
const { currentUser, authReady } = useAuth()

// Log out the current user.
async function handleLogout() {
  try {
    await logoutUser()
    await router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
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

      <v-spacer />

      <template v-if="authReady">
        <template v-if="currentUser">
          <v-btn
            variant="text"
            prepend-icon="mdi-logout"
            @click="handleLogout"
          >
            Log out
          </v-btn>
        </template>

        <template v-else>
          <v-btn
            variant="text"
            to="/login"
          >
            Log in
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            to="/register"
            class="mr-2"
          >
            Register
          </v-btn>
        </template>
      </template>
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

        <CreateDeckDialog v-if="currentUser" />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
