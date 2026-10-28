import { signInAnonymously } from 'firebase/auth'
import { auth } from './firebase'

export async function getCurrentUser() {
  if (auth.currentUser) {
    return auth.currentUser
  }

  const result = await signInAnonymously(auth)
  return result.user
}