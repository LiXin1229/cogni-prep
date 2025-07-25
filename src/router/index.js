import { createRouter, createWebHashHistory } from 'vue-router'

import Layout from '@/pages/Layout/index.vue'
import ChatView from '@/pages/ChatView/index.vue'
import MindMap from '@/pages/MindMap/index.vue'
import Note from '@/pages/Note/index.vue'
import Prefer from '@/pages/Prefer/index.vue'
import Interview from '@/pages/Interview/index.vue'

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
        },
        {
          path: 'mindmap',
          name: '知识点图',
          component: MindMap
        },
        {
          path: 'note',
          name: '笔记',
          component: Note
        },
        {
          path: 'prefer',
          name: '收藏',
          component: Prefer
        },
        {
          path: 'interview',
          name: '模拟面试',
          component: Interview
        }
      ]
    }
  ]
})

export default router
