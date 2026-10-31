<script setup>
import { ref, onMounted } from 'vue'
import { loadManaSymbols } from '../services/manaSymbolsService'

const props = defineProps({
  cost: {
    type: String,
    default: ''
  }
})

const symbols = ref([])

onMounted(async () => {
  if (!props.cost) return

  try {
    const allSymbols = await loadManaSymbols()

    // Find alle mana-symboler i kortets mana cost
    const symbolNames = props.cost.match(/\{[^}]+\}/g) || []

    // Find SVG-adressen til hvert symbol
    symbols.value = symbolNames.map(symbol => {
      const match = allSymbols.find(
        item => item.symbol === symbol
      )

      return {
        name: symbol,
        image: match?.svg_uri
      }
    })
  } catch (error) {
    console.error('Could not load mana symbols:', error)
  }
})
</script>

<template>
  <div class="mana-cost">
    <template v-if="symbols.length">
      <template v-for="(symbol, index) in symbols" :key="index">
        <img
          v-if="symbol.image"
          :src="symbol.image"
          :alt="symbol.name"
          :title="symbol.name"
        />
        <span v-else>{{ symbol.name }}</span>
      </template>
    </template>

    <span v-else-if="cost">{{ cost }}</span>
    <span v-else>—</span>
  </div>
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
</style>