import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from './pages/Dashboard.vue'
import Forum from './pages/Forum.vue'
import Resaltar from './pages/Resaltar.vue'
import Threads from './pages/Threads.vue'
import Usuarios from './pages/Usuarios.vue'
import Settings from './pages/Settings.vue'
import About from './pages/About.vue'

const routes = [
    { path: '/', component: Dashboard },
    { path: '/ocultar', component: Forum },
    { path: '/resaltar', component: Resaltar },
    { path: '/posts', component: Threads },
    { path: '/usuarios', component: Usuarios },
    { path: '/settings', component: Settings },
    { path: '/about', component: About },
    { path: '/:pathMatch(.*)*', component: Dashboard }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router
