let manaSymbolsPromise = null

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