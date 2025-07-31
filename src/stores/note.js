import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user'
import { useMindmapStore } from './mindmap'
import { useChatStore } from './chat'
import { useSessionStore } from './session'
import { useLocalStorage } from '@/utils/useStorage'
import axios from 'axios'
import API from '@/utils/API.js'

export const useNoteStore = defineStore('note', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const mindmapStore = useMindmapStore()
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()

  const areaList = computed(() => mindmapStore.areaList)

  const selectedAreaId = computed({
    get: () => mindmapStore.selectedAreaId,
    set: (value) => mindmapStore.selectedAreaId = value
  })

  const getSelectedAreaId = async () => {
    await userStore.getUserInfo()
  }

  const treeData = ref({})

  const getTreeData = async () => {
    if (!selectedAreaId.value) {
      await getSelectedAreaId()
      selectedAreaId.value = userStore.areaList[userStore.areaList.length - 1].areaId
    }

    const { data } = await axios({
      url: API.getMindmapData,
      method: 'GET',
      params: {
        areaId: selectedAreaId.value
      }
    })
    // console.log(data.data)

    treeData.value = data.data.mindmap
  }

  const { value: selectKey } = useLocalStorage('cogni_selectKey', []) 

  return {
    areaList,
    selectedAreaId,
    treeData,
    getTreeData,
    selectKey
  }
})