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

  const { value: selectedAreaId } = useSessionStorage('selectedAreaId', null)

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

  // 保存导图数据
  const saveMindmapData = async (data) => {
    await axios({
      url: API.saveMindmapData,
      method: 'POST',
      data: {
        areaId: selectedAreaId.value,
        mindmap: data
      }
    })
  }

  // 添加节点
  const componentCallback = ref({})

  // 注册组件方法
  const registerCallback = (funcName, callback) => {
    componentCallback.value[funcName] = callback
  }

  // 触发组件方法
  const triggerComponent = (funcName, data) => {
    if (typeof componentCallback.value[funcName] === 'function') {
      componentCallback.value[funcName](data) // 调用组件方法并传参
    }
  }

  return {
    areaList,
    selectedAreaId,
    getMindmapData,
    saveMindmapData,
    registerCallback,
    triggerComponent
  }
})