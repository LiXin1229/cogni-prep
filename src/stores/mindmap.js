import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user'
import { useChatStore } from './chat'
import { useSessionStore } from './session'
import { useSessionStorage } from '@/utils/useStorage'
import axios from 'axios'
import API from '@/utils/API.js'

export const useMindmapStore = defineStore('mindmap', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()

  const areaList = computed(() => userStore.areaList)

  // const selectedAreaId = ref(null)
  // 获取用户当前选择的领域
  const { value: selectedAreaId } = useSessionStorage('selectedAreaId', null)

  // const mindmapData = ref(null)

  const getSelectedAreaId = async () => {
    await userStore.getUserInfo()
  }

  const getMindmapData = async () => {
    if (!selectedAreaId.value) {
      await getSelectedAreaId()
    }

    const { data } = await axios({
      url: API.getMindmapData,
      method: 'GET',
      params: {
        areaId: selectedAreaId.value
      }
    })

    return data.data.mindmap
  }

  return {
    areaList,
    selectedAreaId,
    getMindmapData,
    // mindmapData
  }
})