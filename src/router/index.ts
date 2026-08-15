import { createRouter, createWebHistory }from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import History from '@/views/History.vue'
import HistoryDetail from '@/views/HistoryDetail.vue'


const routes = [
    {path: '/', component: HomeView},
    {path: '/history', component: History},
    {path: '/history/:caseId', component: HistoryDetail, props: true}
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
