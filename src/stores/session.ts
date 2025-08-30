import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user.js'
import { useChatStore } from './chat.js'
import { useMindmapStore } from './mindmap.js'
import request from '@/utils/request.js'
import API from '@/utils/API.js'
import type { SessionType, MainAreaType } from './types/session.type.js'

export const useSessionStore = defineStore('session', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const chatStore = useChatStore()
  const mindmapStore = useMindmapStore()

  const sessionNumber = ref(20)

  // 会话列表
  const sessionList = ref<SessionType[]>([])

  // 当前的会话
  const currSession = computed(() => {
    return sessionList.value.find(item => item.sessionId === chatStore.sessionId)
  })

  const mainArea = ref<MainAreaType>({})

  const surroundingPoint = ref('')

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
      // await nextTick()
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
      surroundingPoint.value = ''
    }
  }, { immediate: true })

  const getSessionList = async () => {
    if (!userStore.userInfo.userId) {
      return
    }

    const res = await request<{ sessionList: SessionType[] }>({
      url: API.getSessionList,
      method: 'GET',
      params: {
        id: userStore.userInfo.userId,
        number: sessionNumber.value
      }
    })
    // console.log(res)

    sessionList.value = [...sessionList.value, ...res.data.sessionList]
    return res.data.sessionList.length < 20
  }

  // 标记是否有节点需要挂载sessionId
  const markNode = ref(false)

  // 新建会话
  const initSession = async () => {
    // console.log('mainArea', mainArea.value)
    // console.log('point', surroundingPoint.value)
    try {
      const res = await request<SessionType>({
        url: API.initSession,
        method: 'POST',
        data: {
          userId: userStore.userInfo.userId,
          mainArea: mainArea.value!.name,
          areaId: mainArea.value!.areaId,
          surroundingPoint: surroundingPoint.value
        }
      })

      sessionList.value.unshift(res.data)

      // 更新sessionId
      await router.push(`/chat/${res.data.sessionId}`)

      // 清空目标节点
      if (markNode.value) {
        if (!currSession.value) return
        mindmapStore.modifyNodeProp(mindmapStore.selectedNode!.id, 'chatId', currSession.value.sessionId)
        markNode.value = false
      }
    } catch (err) {
      throw err
    }
  }

  // 删除会话
  const deleteSession = async (session: SessionType) => {
    try {
      await request({
        url: API.deleteSession,
        method: 'POST',
        data: {
          sessionId: session.sessionId,
          areaId: session.areaId,
          userId: userStore.userInfo.userId
        }
      })
      // console.log('res_session', data)

      if (chatStore.sessionId === session.sessionId) {
        router.push('/chat')
      }
      sessionList.value = sessionList.value.filter(item => item.sessionId !== session.sessionId)
    } catch (err) {
      console.log(err)
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
    surroundingPoint,
    deleteSession,
    sessionNumber
  }
})
