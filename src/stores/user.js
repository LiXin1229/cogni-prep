import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from './chat'
import { useSessionStore } from './session'
import axios from 'axios'
import API from '@/utils/API.js'

export const useUserInfoStore = defineStore('user', () => {
  const router = useRouter()
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()

  const showDialog = ref('')

  const userInfo = reactive({
    userId: '',
    username: ''
  })

  const getUserInfo = async () => {
    const { data } = await axios({
      url: API.getUserInfo,
      method: 'GET',
      params: {
        id: 1
      }
    })
    // console.log(data.data)

    areaList.value = data.data.areaList
  }

  // 领域列表
  const areaList = ref([])

  // 新增领域
  const updateArea = async (area) => {
    const { data } = await axios({
      url: API.updateArea,
      method: 'POST',
      data: {
        id: 1,
        newArea: area,
        areaList: areaList.value
      }
    })

    if (data.success) {
      await router.push({
        name: '每日刷题'
      })
      areaList.value.push(data.data.newArea)
    }

    console.log(data.data)
  }

  // 设置选中领域
  const setArea = async (areaId) => {
    const { data } = await axios({
      url: API.setArea,
      method: 'POST',
      data: {
        id: 1,
        areaId
      }
    })

    if (data.success) {
      router.push({
        name: '每日刷题'
      })
    }
  }



  return {
    showDialog,
    userInfo,
    getUserInfo,
    areaList,
    updateArea,
    setArea,
  }
})
