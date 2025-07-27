import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
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

  const mainArea = ref({})

  const surroundingPoint = ref('')

  // const latestArea = computed(() => {
  //   sessionList.value[0].
  // })

  watch(() => currSession.value, (session) => {
    console.log('currSession', currSession.value)
    if (session) {
      mainArea.value = {
        areaId: session.areaId,
        name: session.mainArea
      }
      surroundingPoint.value = session.surroundingPoint
    }
    else {
      const lastestSession = sessionList.value[0]
      mainArea.value = lastestSession ? {
        areaId: lastestSession.areaId,
        name: lastestSession.mainArea
      } : {
        areaId: null,
        name: '未选择领域'
      }
    }
  }, { immediate: true })

  // watch(() => [currSession.value, userStore.areaList], ([session, list]) => {
  //   // console.log('currSession', currSession.value)
  //   if (session) {
  //     mainArea.value = {
  //       areaId: session.areaId,
  //       name: session.mainArea
  //     }
  //     surroundingPoint.value = session.surroundingPoint
  //   }
  //   else {
  //     // console.log(list)
  //     if (list.length) {
  //       const area = list[list.length - 1]
  //       mainArea.value = {
  //         areaId: area.areaId,
  //         name: area.name
  //       }
  //     } else {
  //       mainArea.value = {
  //         areaId: null,
  //         name: '未选择领域'
  //       }
  //     }
  //     surroundingPoint.value = ''
  //   }
  // }, { immediate: true })

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
    // console.log('mainArea', mainArea.value)
    // console.log('point', surroundingPoint.value)
    try {
      const { data } = await axios({
        url: API.initSession,
        method: 'POST',
        data: {
          userId: 1,
          mainArea: mainArea.value.name,
          areaId: mainArea.value.areaId,
          surroundingPoint: surroundingPoint.value,
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
    currSession,
    mainArea,
    surroundingPoint
  }
})
