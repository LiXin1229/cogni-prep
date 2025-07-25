import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import API from '@/utils/API.js'

export const useSessionStore = defineStore('session', () => {
  const router = useRouter()

  // 会话列表
  const sessionList = ref([])

  // 当前的会话
  const currSession = ref(null)

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
          mainArea: '前端',
          surroundingPoint: 'ES6规范',
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
    initSession
  }
})
