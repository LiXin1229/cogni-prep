import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserInfoStore } from './user'
import { useNoteStore } from './note'
import { useLocalStorage } from '@/utils/useStorage'
import { findAncestorsById, modifyTreeNodeProp } from '@/utils/treeUtils'
import request from '@/utils/request'
import API from '@/utils/API.js'

export const useMindmapStore = defineStore('mindmap', () => {
  const userStore = useUserInfoStore()
  const noteStore = useNoteStore()

  const areaList = computed(() => userStore.areaList)

  const { value: selectedAreaId } = useLocalStorage('cogni_selected_area_id', {})

  const getSelectedAreaId = async () => {
    await userStore.getUserInfo()
  }

  // 展示的树数据
  const treeData = ref({})

  const isEmptyObj = (o) => o != null && typeof o === 'object' && Object.keys(o).length === 0

  const getMindmapData = async () => {
    if (isEmptyObj(selectedAreaId.value)) {
      await getSelectedAreaId()
      selectedAreaId.value = userStore.areaList[userStore.areaList.length - 1].areaId
    }

    try {
      const res = await request({
        url: API.getMindmapData,
        method: 'GET',
        params: {
          areaId: selectedAreaId.value
        }
      })

      if (res.success) {
        return res.data.mindmap
      }
    } catch (error) {
      throw error
    }
  }

  // 保存导图数据
  const saveMindmapData = async (data) => {
    if (!selectedAreaId.value) return

    await request({
      url: API.saveMindmapData,
      method: 'POST',
      data: {
        areaId: selectedAreaId.value,
        mindmap: data
      }
    })

    noteStore.getTreeData()
  }

  // 是否正在编辑
  const isEdited = ref(false)

  // 右键选中的节点
  const selectedNode = ref(null)

  const sendState = ref(false)

  // AI生成子节点
  const getSubcategory = async (formData, pointList) => {
    // console.log(selectedNode.value)
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

    try {
      sendState.value = true
      const res = await request({
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

      sendState.value = false
      return res 
    } catch (error) {
      sendState.value = false
      throw new Error(error)
    }
  }

  // 节点修改属性
  const modifyNodeProp = (targetId, propName, id) => {
    // console.log('!!!', treeData.value, targetId, propName, id)
    treeData.value = modifyTreeNodeProp(treeData.value, targetId, propName, id)
    saveMindmapData(treeData.value)
  }

  // 组件回调
  const componentCallback = ref({})

  // 注册组件方法
  const registerCallback = (funcName, callback) => {
    componentCallback.value[funcName] = callback
  }

  // 触发组件方法
  const triggerComponent = (funcName, ...args) => {
    if (typeof componentCallback.value[funcName] === 'function') {
      componentCallback.value[funcName](...args) // 调用组件方法并传参
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
    getSubcategory,
    modifyNodeProp,
    sendState
  }
})