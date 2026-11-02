import { ref, get, set, remove, push } from 'firebase/database'
import { db } from './firebase'

export async function createDeck(uid, name, format) {
  const decksRef = ref(db, `users/${uid}/decks`)
  const newDeckRef = push(decksRef)

  const newDeck = {
    name: name,
    format: format,
    mainboard: [],
    sideboard: [],
    folderId: ''
  }

  await set(newDeckRef, newDeck)

  return newDeckRef.key
}

export async function loadDecks(uid) {
  const decksRef = ref(db, `users/${uid}/decks`)

  const snapshot = await get(decksRef)

  if (!snapshot.exists()) {
    return []
  }

  const data = snapshot.val()

  return Object.entries(data).map(([deckId, deck]) => ({
    ...deck,
    id: deckId,
    mainboard: Array.isArray(deck.mainboard)
      ? deck.mainboard
      : Object.values(deck.mainboard || {}),
    sideboard: Array.isArray(deck.sideboard)
      ? deck.sideboard
      : Object.values(deck.sideboard || {})
  }))
}

export async function saveDeck(uid, deckId, deck) {
  const deckRef = ref(db, `users/${uid}/decks/${deckId}`)

  const { id, ...deckData } = deck

  await set(deckRef, deckData)
}

export async function deleteDeck(uid, deckId) {
  const deckRef = ref(db, `users/${uid}/decks/${deckId}`)

  await remove(deckRef)
}


/**
 * Fetches the art_crop image for a Scryfall card.
 * Supports both regular and double-faced cards.
 */
export async function getCardArtCrop(card) {
  if (!card?.id) return card?.imageUrl || ''

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/${encodeURIComponent(card.id)}`
    )

    if (!response.ok) {
      throw new Error('Could not fetch card artwork.')
    }

    const cardData = await response.json()

    return (
      cardData.image_uris?.art_crop ||
      cardData.card_faces?.[0]?.image_uris?.art_crop ||
      card.imageUrl ||
      ''
    )
  } catch (error) {
    console.error(`Could not load artwork for ${card.name}:`, error)
    return card.imageUrl || ''
  }
}
