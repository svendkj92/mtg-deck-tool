<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser } from '../services/authService'

const router = useRouter()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const loading = ref(false)
const errorMessage = ref('')

async function handleRegister() {
  errorMessage.value = ''

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }

  loading.value = true

  try {
    await registerUser(email.value.trim(), password.value)

    // Firebase automatically updates the shared authentication state.
    await router.push({ name: 'home' })
  } catch (error) {
    console.error('Registration failed:', error)

    if (error.code === 'auth/email-already-in-use') {
      errorMessage.value = 'An account with this email already exists.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage.value = 'Please enter a valid email address.'
    } else if (error.code === 'auth/weak-password') {
      errorMessage.value = 'Please choose a stronger password.'
    } else {
      errorMessage.value = 'Something went wrong. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="auth-page" fluid>
    <v-card class="auth-card" max-width="450" variant="flat">
      <v-card-title class="text-h5">
        Create an account
      </v-card-title>

      <v-card-text>
        <p class="text-medium-emphasis mb-6">
          Create an account to save and manage your decks.
        </p>

        <v-form @submit.prevent="handleRegister">
          <v-text-field
            v-model="email"
            label="Email"
            type="email"
            autocomplete="email"
            required
          />

          <v-text-field
            v-model="password"
            label="Password"
            type="password"
            autocomplete="new-password"
            required
          />

          <v-text-field
            v-model="confirmPassword"
            label="Confirm password"
            type="password"
            autocomplete="new-password"
            required
          />

          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ errorMessage }}
          </v-alert>

          <v-btn
            type="submit"
            color="primary"
            block
            :loading="loading"
            :disabled="!email.trim() || !password || !confirmPassword"
          >
            Create account
          </v-btn>
        </v-form>

        <div class="text-center mt-6">
          <span class="text-medium-emphasis">
            Already have an account?
          </span>

          <v-btn
            variant="text"
            color="primary"
            to="/login"
          >
            Log in
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style lang="scss" scoped>
@use "@/assets/variables" as *;

.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - 64px);
  padding: 1.5rem;
}

.auth-card {
  width: 100%;
  padding: 1rem;
  border: 1px solid $color-border;
  border-radius: 12px;
  background: $color-surface;
}
</style>