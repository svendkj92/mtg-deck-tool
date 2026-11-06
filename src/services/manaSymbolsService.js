// Cache the in-flight request (and its resolved promise) so components share one
// Scryfall symbology request rather than fetching it independently.
let manaSymbolsPromise = null

// Fetch Scryfall's symbol catalog on first use; subsequent calls reuse the cached promise.
export function loadManaSymbols() {
  if (!manaSymbolsPromise) {
    manaSymbolsPromise = fetch(
      'https://api.scryfall.com/symbology'
    )
      .then(response => {
        if (!response.ok) {
          throw new Error('Could not load mana symbols.')
        }

        return response.json()
      })
      .then(data => data.data)
  }

  return manaSymbolsPromise
}