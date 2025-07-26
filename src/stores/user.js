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
    selectedAreaId.value = data.data.selectedArea
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
      areaList.value.push(data.data.newArea)
      selectedAreaId.value = data.data.newArea.id
      router.push({
        name: '每日刷题'
      })
    }

    console.log(data.data)
  }

  // 选中的领域
  const selectedAreaId = ref(null)

  const mainArea = computed(() => {
    const area = areaList.value.find(item => item.id === selectedAreaId.value)
    return area?.name || '未选择领域'
  })

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
      selectedAreaId.value = areaId
      router.push({
        name: '每日刷题'
      })
    }
  }

  // 围绕知识点
  const surroundingPoint = ref('')

  watch(() => sessionStore.currSession, (val) => {
    surroundingPoint.value = val?.surroundingPoint || ''
  })

  return {
    showDialog,
    userInfo,
    getUserInfo,
    areaList,
    updateArea,
    selectedAreaId,
    setArea,
    mainArea,
    surroundingPoint
  }
})
