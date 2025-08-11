import { createRouter, createWebHashHistory } from 'vue-router'

import Layout from '@/pages/Layout/index.vue'
import ChatView from '@/pages/ChatView/index.vue'
import MindMap from '@/pages/MindMap/index.vue'
import Note from '@/pages/Note/index.vue'
import Prefer from '@/pages/Prefer/index.vue'
import PreferDetail from '@/pages/Prefer/PreferDetail.vue'
import Interview from '@/pages/Interview/index.vue'

import { useUserInfoStore } from '../stores/user'

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
          component: ChatView,
          meta: { keepAlive: true }
        },
        {
          path: 'chat/:sessionId',
          name: '会话',
          component: ChatView,
          meta: { keepAlive: true }
        },
        {
          path: 'mindmap',
          name: '知识点图',
          component: MindMap
        },
        {
          path: 'note',
          name: '笔记',
          component: Note,
          meta: { keepAlive: true }
        },
        {
          path: 'prefer',
          name: '收藏',
          component: Prefer,
          children: [
            {
              path: ':preferId',
              name: '收藏详情',
              component: PreferDetail
            }
          ]
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

router.afterEach(async (to, from) => {
  const userStore = useUserInfoStore()

  // console.log('全局后置守卫', userStore.areaList)
  if (userStore.areaList.length === 0) {
    await userStore.getUserInfo()

    if (userStore.areaList.length === 0) {
      userStore.showDialog = 'selectArea'
      userStore.ableClose = false
    }
  }
})

export default router
