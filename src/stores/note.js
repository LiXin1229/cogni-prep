import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user'
import { useMindmapStore } from './mindmap'
import { useLocalStorage } from '@/utils/useStorage'
import { findAncestorsById, modifyTreeNodeProp } from '@/utils/treeUtils'
import axios from 'axios'
import API from '@/utils/API.js'

export const useNoteStore = defineStore('note', () => {
  const router = useRouter()
  const userStore = useUserInfoStore()
  const mindmapStore = useMindmapStore()

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

  // 本地存储展开的树节点
  const { value: selectKey } = useLocalStorage('cogni_selectKey', [])

  // 更新当前选中的树节点
  const updateSelectKey = (data) => {
    if (!data) return
    const node = selectKey.value.find(item => item.areaId === selectedAreaId.value)

    if (node) {
      node.nodeId = data.id
      node.markId = data.markId
    } else {
      selectKey.value.push({
        areaId: selectedAreaId.value,
        nodeId: data.id,
        markId: data.markId
      })
    }
  }

  // 当前笔记
  const note = ref('')

  // AI生成笔记
  const getNote = async (node) => {
    let point = ''
    const { parent, grandparent } = findAncestorsById(treeData.value, node.id)
    
    if (parent && grandparent) {
      point = `“${grandparent.name}”中的“${parent.name}”下的“${node.name}”`
    } else if (parent) {
      point = `“${parent.name}”下的“${node.name}”`
    } else {
      point = `“${node.name}”`
    }
    // console.log('point', point)

    const area = areaList.value.find(item => item.areaId === selectedAreaId.value)
    const mainArea = area?.name || '该领域'

    const { data } = await axios({
      url: API.getNote,
      method: 'POST',
      data: {
        mainArea,
        point
      }
    })
    // console.log('data', data.data)

    note.value = data.data.result
    triggerComponent('insertText', note.value)
    modifyNodeProp(node.id, 'markId',  data.data.noteId)
    updateSelectKey({ id: node.id, markId: data.data.noteId })
  }

  // 获取节点笔记
  const getNoteData = async (node) => {
    if (!node.markId) {
      note.value = '### 暂无笔记'
      return
    }

    const { data } = await axios({
      url: API.getNoteData,
      method: 'GET',
      params: {
        markId: node.markId
      }
    })
    // console.log('获取节点笔记', data)

    note.value = data.data.content
  }

  // 修改节点笔记
  const updateNoteData = async (markId) => {
    if (!markId) return

    const { data } = await axios({
      url: API.updateNote,
      method: 'POST',
      data: {
        noteId: markId,
        content: note.value
      }
    })
    // console.log('修改节点笔记', data)

    if (data.success) {
      return true
    }

    return false
  }

  // 修改节点属性
  const modifyNodeProp = (targetId, propName, id) => {
    // console.log('!!!', treeData.value, targetId, propName, id)
    treeData.value = modifyTreeNodeProp(treeData.value, targetId, propName, id)
    saveMindmapData(treeData.value)
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
    getTreeData,
    selectKey,
    getNote,
    note,
    getNoteData,
    updateSelectKey,
    updateNoteData,
    registerCallback
  }
})