import './assets/main.scss'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

// Vores farvetema
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'mtgDark',

    themes: {
      mtgDark: {
        dark: true,

        colors: {
          primary: '#ffa81b',
          secondary: '#a1a1aa',

          background: '#111318',
          surface: '#1c1e25',

          error: '#ff9292',
        },
      },
    },
  },
})

const app = createApp(App)

app.use(router)
app.use(vuetify)

app.mount('#app')