import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.config.errorHandler = (err) => {
    console.error('全局错误捕获:', err)
}

app.use(router)
app.mount('#app')
