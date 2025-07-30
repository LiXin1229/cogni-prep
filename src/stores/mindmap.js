import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user'
import { useChatStore } from './chat'
import { useSessionStore } from './session'
import { useLocalStorage } from '@/utils/useStorage'
import { findAncestorsById } from '@/utils/treeUtils'
import axios from 'axios'
import API from '@/utils/API.js'

export const useMindmapStore = defineStore('mindmap', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()

  const areaList = computed(() => userStore.areaList)

  const { value: selectedAreaId } = useLocalStorage('selectedAreaId', null)

  const getSelectedAreaId = async () => {
    await userStore.getUserInfo()
  }

  // 展示的树数据
  const treeData = ref({})

  const getMindmapData = async () => {
    if (!selectedAreaId.value) {
      await getSelectedAreaId()
      selectedAreaId.value = userStore.areaList[userStore.areaList.length - 1].id
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
    if (!selectedAreaId.value) return

    await axios({
      url: API.saveMindmapData,
      method: 'POST',
      data: {
        areaId: selectedAreaId.value,
        mindmap: data
      }
    })
  }

  // 是否正在编辑
  const isEdited = ref(false)

  // 右键选中的节点
  const selectedNode = ref(null)

  // AI生成子节点
  const getSubcategory = async (formData, pointList) => {
    console.log(selectedNode.value)
    const childrenPoints = [...pointList, ...selectedNode.value.children]

    let surroundingPoint = ''
    const { parent, grandparent } = findAncestorsById(treeData.value, selectedNode.value.id)
    
    if (parent && grandparent) {
      surroundingPoint = `“${grandparent.name}”中的“${parent.name}”下的“${selectedNode.value.name}”`
    } else if (parent) {
      surroundingPoint = `“${parent.name}”下的“${selectedNode.value.name}”`
    } else {
      surroundingPoint = `“${selectedNode.value.name}”`
    }

    const { data } = await axios({
      url: API.getSubcategory,
      method: 'POST',
      data: {
        mainArea: areaList.value.find(item => item.areaId === selectedAreaId.value).name,
        surroundingPoint,
        childrenPoints,
        number: formData.number,
        auto: formData.auto
      }
    })

    return data
  }

  // 组件回调
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
    treeData,
    getMindmapData,
    saveMindmapData,
    isEdited,
    selectedNode,
    registerCallback,
    triggerComponent,
    getSubcategory
  }
})