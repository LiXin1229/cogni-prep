import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from './session'
import { useMindmapStore } from './mindmap'
import { useNoteStore } from './note'
import { useLocalStorage } from '@/utils/useStorage'
import request from '@/utils/request'
import API from '@/utils/API'
import type { UserInfoType, AreaType, AreaListType } from './types/user.type'

export const useUserInfoStore = defineStore('user', () => {
  const router = useRouter()
  const mindmapStore = useMindmapStore()
  const noteStore = useNoteStore()
  const sessionStore = useSessionStore()

  const isMobile = ref(window.innerWidth / window.innerHeight < 1 ? true : false)

  const isSidebarFolded = ref(isMobile.value ? true : false)

  const showDialog = ref('')
  const ableClose = ref(true)

  const { value: userInfo } = useLocalStorage<UserInfoType>('cogni_user_info', {})
  const { value: token } = useLocalStorage<string>('cogni_token', '')

  const logout = async () => {
    userInfo.value = {}
    token.value = ''
    areaList.value = []
    noteStore.selectKey = []
    mindmapStore.selectedAreaId = null
    
    await new Promise(resolve => setTimeout(resolve, 0))

    router.push('/login')
  }

  const getUserInfo = async () => {
    // console.log('获取用户信息', userInfo.value?.userId)
    if (!userInfo.value?.userId) {
      return logout()
    }

    const res = await request<AreaListType>({
      url: API.getUserInfo,
      method: 'GET',
      params: {
        id: userInfo.value.userId
      }
    })

    areaList.value = res.data.areaList

    if (areaList.value.length === 0) {
      showDialog.value = 'selectArea'
      ableClose.value = false
    }
  }

  // 领域列表
  const { value: areaList } = useLocalStorage<AreaType[]>('cogni_area_list', []) 

  // 新增领域
  const updateArea = async (area: string) => {
    try {
      const res = await request<{ newArea: AreaType }>({
        url: API.updateArea,
        method: 'POST',
        data: {
          id: userInfo.value.userId,
          newArea: area,
          areaList: areaList.value
        },
        showLoading: true
      })

      await router.push({
        name: '每日刷题'
      })
      areaList.value.push(res.data.newArea)
      mindmapStore.selectedAreaId = res.data.newArea.areaId
      sessionStore.mainArea = res.data.newArea
      sessionStore.surroundingPoint = '' 
    } catch (error) {
      console.log(error)
    }
  }

  // 删除领域
  const deleteArea = async () => {
    try {
      const res = await request<{ areaList: AreaType[] }>({
        url: API.deleteArea,
        method: 'POST',
        data: {
          id: userInfo.value.userId,
          areaList: areaList.value,
          areaId: mindmapStore.selectedAreaId,
        },
        showLoading: true
      })

      // console.log(res)
      areaList.value = res.data.areaList

      if (areaList.value.length === 0) {
        showDialog.value = 'selectArea'
        ableClose.value = false
        return
      }

      // 重新渲染mindmap和note页面
      mindmapStore.selectedAreaId = areaList.value[areaList.value.length - 1].areaId
      mindmapStore.triggerComponent('reloadChart')
      noteStore.triggerComponent('reLoadNote')
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  return {
    isMobile,
    isSidebarFolded,
    showDialog,
    ableClose,
    token,
    userInfo,
    getUserInfo,
    areaList,
    updateArea,
    deleteArea,
    logout
  }
})
