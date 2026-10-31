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
      </v-list>
    </v-navigation-drawer>

    <!-- Sideindhold -->
    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>