import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import i18n from './i18n/index.js'

import './assets/css/theme.css'
import './assets/css/themes.css'
import './assets/css/layout.css'
import './assets/css/components.css'
import './assets/css/book.css'
import './assets/css/dice.css'
import './assets/css/print.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
