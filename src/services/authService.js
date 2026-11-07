
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'

import { auth } from './firebase'

// Register a new user
export async function registerUser(email, password) {
  const result = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )

  return result.user
}

// Log in an existing user
export async function loginUser(email, password) {
  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  )

  return result.user
}

// Log out the current user
export async function logoutUser() {
  await signOut(auth)
}

// Get the currently logged-in user
export function getCurrentUser() {
  return auth.currentUser
}

// Listen for changes to the authentication state
export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback)
}