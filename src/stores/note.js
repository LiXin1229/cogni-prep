import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from './user'
import { useMindmapStore } from './mindmap'
import { useChatStore } from './chat'
import { useSessionStore } from './session'
import { useLocalStorage } from '@/utils/useStorage'
import { findAncestorsById } from '@/utils/treeUtils.js'
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

  // 本地存储展开的树节点
  const { value: selectKey } = useLocalStorage('cogni_selectKey', []) 

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

    console.log(data.data)
    note.value = data.data.result
  }

  return {
    areaList,
    selectedAreaId,
    treeData,
    getTreeData,
    selectKey,
    getNote,
    note
  }
})