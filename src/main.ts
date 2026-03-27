import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import pinia from './store'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { useThemeStore } from './store/theme'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Antd)

const themeStore = useThemeStore(pinia)
themeStore.initTheme()

app.mount('#app')
