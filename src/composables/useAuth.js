import { ref } from 'vue'
import { observeAuthState } from '../services/authService'

// Shared authentication state
const currentUser = ref(null)
const authReady = ref(false)

let unsubscribeAuth = null
let resolveAuthReady

// A promise that resolves when Firebase has checked the initial auth state.
const authReadyPromise = new Promise((resolve) => {
  resolveAuthReady = resolve
})

// Start the Firebase listener only once.
function initializeAuth() {
  if (unsubscribeAuth) return

  unsubscribeAuth = observeAuthState((user) => {
    currentUser.value = user
    authReady.value = true

    resolveAuthReady(user)
  })
}

// Expose the shared state to components.
export function useAuth() {
  initializeAuth()

  return {
    currentUser,
    authReady,
  }
}

// Wait until Firebase has determined whether a user is logged in.
export function waitForAuth() {
  initializeAuth()

  if (authReady.value) {
    return Promise.resolve(currentUser.value)
  }

  return authReadyPromise
}