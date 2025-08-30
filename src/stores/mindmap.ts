import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserInfoStore } from './user'
import { useNoteStore } from './note'
import { useLocalStorage } from '@/utils/useStorage'
import { findAncestorsById, modifyTreeNodeProp } from '@/utils/treeUtils'
import { isEmptyObj } from '@/utils/verifyEmpty'
import rfdc from 'rfdc'
import request from '@/utils/request'
import API from '@/utils/API.js'
import type { AIAddFormDataType, CallbackMap, PointListType, TreeNode } from './types/mindmap.type'

export const useMindmapStore = defineStore('mindmap', () => {
  const userStore = useUserInfoStore()
  const noteStore = useNoteStore()
  const clone = rfdc({ circles: true })

  const areaList = computed(() => userStore.areaList)

  const { value: selectedAreaId } = useLocalStorage<number | null>('cogni_selected_area_id', null)

  const getSelectedAreaId = async () => {
    await userStore.getUserInfo()
  }

  // 展示的树数据
  const treeData = ref<TreeNode | null>(null)
  let backupData: TreeNode | null = null

  const getMindmapData = async () => {
    if (isEmptyObj(userStore.userInfo)) return

    if (selectedAreaId.value === null) {
      await getSelectedAreaId()
      selectedAreaId.value = userStore.areaList[userStore.areaList.length - 1].areaId
    }

    try {
      const res = await request<{ mindmap: TreeNode }>({
        url: API.getMindmapData,
        method: 'GET',
        params: {
          areaId: selectedAreaId.value
        }
      })

      backupData = clone(res.data.mindmap)
      return res.data.mindmap
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  // 保存导图数据
  const saveMindmapData = async (data: TreeNode) => {
    // console.log('saveMindmapData', data)
    if (isEmptyObj(data) || selectedAreaId.value === null || isEmptyObj(userStore.userInfo)) return

    try {
      await request({
        url: API.saveMindmapData,
        method: 'POST',
        data: {
          areaId: selectedAreaId.value,
          mindmap: data
        }
      })

      noteStore.treeData = data
      backupData = clone(data)
    } catch (error) {
      treeData.value = backupData
      triggerComponent('renderChart')
    }
  }

  // 是否正在编辑
  const isEdited = ref(false)

  // 右键选中的节点
  const selectedNode = ref<TreeNode | null>(null)

  const sendState = ref(false)

  // AI生成子节点
  const getSubcategory = async (formData: AIAddFormDataType, pointList: PointListType[]) => {
    // console.log(selectedNode.value)
    const childrenPoints = [...pointList, ...(selectedNode.value?.children ?? [])]

    let surroundingPoint = ''
    if (treeData.value === null) return
    const { parent, grandparent } = findAncestorsById(treeData.value, selectedNode.value!.id)

    if (parent && grandparent) {
      surroundingPoint = `“${grandparent.name}”中的“${parent.name}”下的“${selectedNode.value!.name}”`
    } else if (parent) {
      surroundingPoint = `“${parent.name}”下的“${selectedNode.value!.name}”`
    } else {
      surroundingPoint = `“${selectedNode.value!.name}”`
    }

    try {
      sendState.value = true
      const res = await request<{ pointList: { name: string, frequency: number }[] }>({
        url: API.getSubcategory,
        method: 'POST',
        data: {
          mainArea: areaList.value.find(item => item.areaId === selectedAreaId.value)?.name,
          surroundingPoint,
          childrenPoints,
          number: formData.number,
          auto: formData.auto
        }
      })

      sendState.value = false
      return res 
    } catch (error: any) {
      sendState.value = false
      throw new Error(error)
    }
  }

  // 节点修改属性
  const modifyNodeProp = (targetId: string, propName: string, id: number) => {
    // console.log('!!!', treeData.value, targetId, propName, id)
    if (treeData.value === null) return
    treeData.value = modifyTreeNodeProp(treeData.value, targetId, propName, id)
    saveMindmapData(treeData.value)
  }

  // 组件回调
  const componentCallback = ref<Partial<CallbackMap>>({})

  // 注册组件方法
  const registerCallback = <K extends keyof CallbackMap>(funcName: K, callback: CallbackMap[K]) => {
    componentCallback.value[funcName] = callback
  }

  // 触发组件方法
  const triggerComponent = <K extends keyof CallbackMap>(
    funcName: K,
    ...args: Parameters<CallbackMap[K]>
  ): ReturnType<CallbackMap[K]> | undefined => {
    const fn = componentCallback.value[funcName]
    if (typeof fn !== 'function') return undefined
    return (fn as Function)(...args) as ReturnType<CallbackMap[K]>
  }

  return {
    areaList,
    getSelectedAreaId,
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