import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user'
import { useChatStore } from './chat'
import { useSessionStore } from './session'
import axios from 'axios'
import API from '@/utils/API.js'

export const useMindmapStore = defineStore('mindmap', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()

  const areaList = computed(() => userStore.areaList)

  const selectedAreaId = ref(null)

  const mindmapData = ref(null)

  const getMindmapData = async () => {
    if (!selectedAreaId.value) return

    const { data } = await axios({
      url: API.getMindmapData,
      method: 'GET',
      params: {
        areaId: selectedAreaId.value
      }
    })

    mindmapData.value = data.data.mindmap
    console.log('mindmapData', mindmapData.value)
  }

  watch(() => areaList.value, (list) => {
    selectedAreaId.value = list[list.length - 1]?.areaId
  }, { immediate: true })

  watch(() => selectedAreaId.value, () => {
    getMindmapData()
  })

  return {
    areaList,
    selectedAreaId,
    getMindmapData,
    mindmapData
  }
})