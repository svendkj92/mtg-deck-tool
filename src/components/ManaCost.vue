<script setup>
import { ref, watch } from 'vue'
import { loadManaSymbols } from '../services/manaSymbolsService'

const props = defineProps({
  cost: {
    type: String,
    default: ''
  }
})

const symbols = ref([])

watch(
  () => props.cost,
  async (newCost) => {
    symbols.value = []

    if (!newCost) return

    try {
      const allSymbols = await loadManaSymbols()

      // Split mana cost ved Scryfalls // separator
      const parts = newCost.split(/\s*\/\/\s*/)

      symbols.value = parts.flatMap((part, index) => {
        const symbolNames = part.match(/\{[^}]+\}/g) || []

        const manaSymbols = symbolNames.map(symbol => {
          const match = allSymbols.find(
            item => item.symbol === symbol
          )

          return {
            name: symbol,
            image: match?.svg_uri
          }
        })

        // Tilføj separator mellem kortets faces
        if (index < parts.length - 1) {
          manaSymbols.push({
            name: 'separator',
            image: null
          })
        }

        return manaSymbols
      })
    } catch (error) {
      console.error('Could not load mana symbols:', error)
    }
  },
  { immediate: true }
)
</script>

<template>
  <span class="mana-cost">
    <template v-for="(symbol, index) in symbols" :key="index">
      <span v-if="symbol.name === 'separator'" class="mana-separator">
        /
      </span>

      <img
        v-else-if="symbol.image"
        :src="symbol.image"
        :alt="symbol.name"
        class="mana-symbol"
      />
    </template>
  </span>
</template>

<style scoped lang="scss">
.mana-cost {
  display: inline-flex;
  align-items: center;
  gap: 3px;

  img {
    width: 20px;
    height: 20px;
  }
}

.mana-separator {
  margin: 0 4px;
  font-weight: 500;
}
</style>