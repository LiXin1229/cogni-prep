import { defineStore } from 'pinia'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user.js'
import { useChatStore } from './chat'
import { useMindmapStore } from './mindmap.js'
import axios from 'axios'
import API from '@/utils/API.js'

export const useSessionStore = defineStore('session', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const chatStore = useChatStore()
  const mindmapStore = useMindmapStore()

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

  watch(() => currSession.value, async (session) => {
    // console.log('currSession', currSession.value)
    if (session) {
      mainArea.value = {
        areaId: session.areaId,
        name: session.mainArea
      }
      surroundingPoint.value = session.surroundingPoint
    }
    else {
      await nextTick()
      if (userStore.areaList.length === 0) {
        await userStore.getUserInfo()
      }

      const area = userStore.areaList.find(item => item.areaId === mindmapStore.selectedAreaId)
      mainArea.value = area ? {
        areaId: area.areaId,
        name: area.name
      } : {
        areaId: null,
        name: '未选择领域'
      }
      // console.log('mainArea', mainArea.value)
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

  // 标记是否有节点需要挂载sessionId
  const markNode = ref(false)

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
          surroundingPoint: surroundingPoint.value
        }
      })
      // console.log('res_session', data)

      sessionList.value.unshift(data.data)

      // 更新sessionId
      await router.push(`/chat/${data.data.sessionId}`)

      // 清空目标节点
      if (markNode.value) {
        mindmapStore.modifyNodeProp(mindmapStore.selectedNode.id, 'chatId', currSession.value.sessionId)
        markNode.value = false
      }
    } catch (err) {
      throw err
    }
  }

  watch(() => surroundingPoint.value, () => {
    markNode.value = false
  }, { flush: 'sync' })

  return {
    sessionList,
    getSessionList,
    markNode,
    initSession,
    currSession,
    mainArea,
    surroundingPoint
  }
})
