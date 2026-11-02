
<script setup>
import CreateDeckDialog from './components/CreateDeckDialog.vue'
</script>

<template>
  <v-app>
    <!-- Header -->
    <v-app-bar>
      <v-app-bar-title>
        MTG Deck Tool
      </v-app-bar-title>
    </v-app-bar>

    <!-- Navigation -->
    <v-navigation-drawer permanent>
      <v-list nav>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="My Decks"
          to="/"
          exact
        />

        <v-divider class="my-2" />

        <CreateDeckDialog />
      </v-list>
    </v-navigation-drawer>

    <!-- Main content -->
    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
