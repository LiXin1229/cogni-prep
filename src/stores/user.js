import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from './chat'
import { useSessionStore } from './session'
import { useMindmapStore } from './mindmap'
import { useNoteStore } from './note'
import { useLocalStorage } from '@/utils/useStorage'
import request from '@/utils/request'
import API from '@/utils/API.js'

export const useUserInfoStore = defineStore('user', () => {
  const router = useRouter()
  const chatStore = useChatStore()
  const mindmapStore = useMindmapStore()
  const noteStore = useNoteStore()
  const sessionStore = useSessionStore()

  const isSidebarFolded = ref(true)

  const showDialog = ref('')
  const ableClose = ref(true)

  const { value: userInfo } = useLocalStorage('cogni_user_info', {})
  const { value: token } = useLocalStorage('cogni_token', '')

  const logout = async () => {
    userInfo.value = {}
    token.value = ''
    areaList.value = []
    noteStore.selectKey = []
    mindmapStore.selectedAreaId = {}

    router.push('/login')
  }

  const getUserInfo = async () => {
    if (!userInfo.value.userId) {
      return
    }

    const res = await request({
      url: API.getUserInfo,
      method: 'GET',
      params: {
        id: userInfo.value.userId
      }
    })
    // console.log(res.data)

    areaList.value = res.data.areaList
  }

  // 领域列表
  const { value: areaList } = useLocalStorage('cogni_area_list', []) 

  // 新增领域
  const updateArea = async (area) => {
    const res = await request({
      url: API.updateArea,
      method: 'POST',
      data: {
        id: userInfo.value.userId,
        newArea: area,
        areaList: areaList.value
      }
    })

    if (res.success) {
      areaList.value.push(res.data.newArea)
      mindmapStore.selectedAreaId = res.data.newArea.areaId
      sessionStore.mainArea = res.data.newArea
      router.push({
        name: '每日刷题'
      })
    }

    console.log(res.data)
  }

  // 设置选中领域
  const setArea = async (areaId) => {
    const res = await request({
      url: API.setArea,
      method: 'POST',
      data: {
        id: userInfo.value.userId,
        areaId
      }
    })

    if (res.success) {
      router.push({
        name: '每日刷题'
      })
    }
  }

  return {
    isSidebarFolded,
    showDialog,
    ableClose,
    token,
    userInfo,
    getUserInfo,
    areaList,
    updateArea,
    setArea,
    logout
  }
})
