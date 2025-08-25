import { createRouter, createWebHistory } from 'vue-router'

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
      component: () => import('@/pages/Layout/index.vue'),
      redirect: '/chat',
      children: [
        {
          path: 'chat',
          name: '每日刷题',
          component: () => import('@/pages/ChatView/index.vue'),
          meta: { keepAlive: true }
        },
        {
          path: 'chat/:sessionId',
          name: '会话',
          component: () => import('@/pages/ChatView/index.vue'),
          meta: { keepAlive: true }
        },
        {
          path: 'mindmap',
          name: '思维导图',
          component: () => import('@/pages/MindMap/index.vue'),
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
              component: () => import('@/pages/Prefer/PreferDetail.vue'),
            }
          ]
        }
      ]
    }
  ]
})

// router.afterEach(async (to, from) => {
//   const userStore = useUserInfoStore()

//   // console.log('全局后置守卫', userStore.areaList)
//   // if (userStore.areaList.length === 0) {
//   //   await userStore.getUserInfo()

//   //   if (userStore.areaList.length === 0) {
//   //     userStore.showDialog = 'selectArea'
//   //     userStore.ableClose = false
//   //   }
//   // }
// })

export default router
