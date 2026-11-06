import { signInAnonymously } from 'firebase/auth'
import { auth } from './firebase'

// Return the existing Firebase user when available; otherwise start anonymous sign-in.
// Callers receive the Firebase User object and can use its UID for database paths.
export async function getCurrentUser() {
  if (auth.currentUser) {
    return auth.currentUser
  }

  const result = await signInAnonymously(auth)
  return result.user
}