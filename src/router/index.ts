import { createRouter, createWebHistory }from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import History from '@/views/History.vue'


const routes = [
    {path: '/', component: HomeView},
    {path: '/history', component: History}
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router