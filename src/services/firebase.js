import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDAKC2bqcMR4w8pyhMlKNH_yJRPw6l6m7I",
  authDomain: "mtg-deck-tool.firebaseapp.com",
  databaseURL: "https://mtg-deck-tool-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mtg-deck-tool",
  storageBucket: "mtg-deck-tool.firebasestorage.app",
  messagingSenderId: "908190754113",
  appId: "1:908190754113:web:82d9dd4379d0853ac1adc0"
};

const app = initializeApp(firebaseConfig)

export const db = getDatabase(app)
export const auth = getAuth(app)