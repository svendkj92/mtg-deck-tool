
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginUser } from '../services/authService'

const router = useRouter()

const email = ref('')
const password = ref('')

const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''
  loading.value = true

  try {
    await loginUser(email.value.trim(), password.value)

    await router.push({ name: 'home' })
  } catch (error) {
    console.error('Login failed:', error)

    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found'
    ) {
      errorMessage.value = 'Incorrect email or password.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage.value = 'Please enter a valid email address.'
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
        Welcome back
      </v-card-title>

      <v-card-text>
        <p class="text-medium-emphasis mb-6">
          Log in to access your decks.
        </p>

        <v-form @submit.prevent="handleLogin">
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
            autocomplete="current-password"
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
            :disabled="!email.trim() || !password"
          >
            Log in
          </v-btn>
        </v-form>

        <div class="text-center mt-6">
          <span class="text-medium-emphasis">
            Don't have an account?
          </span>

          <v-btn
            variant="text"
            color="primary"
            to="/register"
          >
            Register
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
