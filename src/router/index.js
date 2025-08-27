import { createRouter, createWebHistory } from 'vue-router'

import Layout from '@/pages/Layout/index.vue'
import Chat from '@/pages/ChatView/index.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: '登录',
      component: () => import('@/pages/Login/index.vue')
    },
    {
      path: '/',
      component: Layout,
      redirect: '/chat',
      children: [
        {
          path: 'chat',
          name: '每日刷题',
          component: Chat,
          meta: { keepAlive: true }
        },
        {
          path: 'chat/:sessionId',
          name: '会话',
          component: Chat,
          meta: { keepAlive: true }
        },
        {
          path: 'mindmap',
          name: '思维导图',
          component: () => import('@/pages/MindMap/index.vue')
        },
        {
          path: 'note',
          name: '笔记',
          component: () => import('@/pages/Note/index.vue'),
          meta: { keepAlive: true }
        },
        {
          path: 'prefer',
          name: '收藏',
          component: () => import('@/pages/Prefer/index.vue'),
          children: [
            {
              path: ':preferId',
              name: '收藏详情',
              component: () => import(/* @vite-ignore  */ '@/pages/Prefer/PreferDetail.vue', {
                name: 'preferDetail'
              })
            }
          ]
        }
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => { 
  if (to.path === '/prefer') {
    // 预加载 about 页面的资源
    import(/* @vite-ignore */ '@/pages/Prefer/PreferDetail.vue', { name: 'preferDetail', preload: true })
      .catch(err => console.log('预加载失败:', err))
  }
  next()
})

export default router
