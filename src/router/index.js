import { createRouter, createWebHashHistory } from 'vue-router'

import Layout from '@/pages/Layout/index.vue'
import ChatView from '@/pages/ChatView/index.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/chat',
      children: [
        {
          path: 'chat',
          name: '每日刷题',
          component: ChatView
        },
        {
          path: 'chat/:sessionId',
          name: '会话',
          component: ChatView
        }
      ]
    }
  ]
})

export default router
