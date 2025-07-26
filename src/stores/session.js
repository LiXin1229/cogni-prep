import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user.js'
import { useChatStore } from './chat'
import axios from 'axios'
import API from '@/utils/API.js'

export const useSessionStore = defineStore('session', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const chatStore = useChatStore()

  // 会话列表
  const sessionList = ref([])

  // 当前的会话
  const currSession = computed(() => {
    return sessionList.value.find(item => item.sessionId === chatStore.sessionId)
  })

  const getSessionList = async () => {
    const { data } = await axios({
      url: API.getSessionList,
      method: 'GET',
      params: {
        id: 1
      }
    })
    // console.log(data)

    sessionList.value = data.data.sessionList
  }

  // 新建会话
  const initSession = async () => {
    try {
      const { data } = await axios({
        url: API.initSession,
        method: 'POST',
        data: {
          userId: 1,
          mainArea: userStore.mainArea,
          surroundingPoint: userStore.surroundingPoint,
        }
      })
      // console.log('res_session', data)

      sessionList.value.push(data.data)

      // 更新sessionId
      await router.push(`/chat/${data.data.sessionId}`)
    } catch (err) {
      throw err
    }
  }

  return {
    sessionList,
    getSessionList,
    initSession,
    currSession
  }
})
