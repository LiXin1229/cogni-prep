import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserInfoStore } from './user'
import { useMindmapStore } from './mindmap'
import { useLocalStorage } from '@/utils/useStorage'
import { findAncestorsById, modifyTreeNodeProp, addChildrenById } from '@/utils/treeUtils'
import { isEmptyObj } from '@/utils/verifyEmpty'
import request from '@/utils/request'
import API from '@/utils/API.js'
import { v4 as uuidv4 } from 'uuid'

export const useNoteStore = defineStore('note', () => {
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
    if (isEmptyObj(selectedAreaId.value)) {
      await getSelectedAreaId()
      selectedAreaId.value = userStore.areaList[userStore.areaList.length - 1].areaId
    }

    const res = await request({
      url: API.getMindmapData,
      method: 'GET',
      params: {
        areaId: selectedAreaId.value
      }
    })
    // console.log('getTreeData', res.data)

    treeData.value = res.data.mindmap
  }

  // 本地存储展开的树节点
  const { value: selectKey } = useLocalStorage('cogni_select_key', [])

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
    // console.log(selectKey.value)
  }

  // 查看/编辑模式
  const isMarkdownMode = ref(true)

  // 当前状态
  const sendState = ref('available')

  // 当前笔记
  const note = ref('')

  const initNote = async () => {
    note.value = ''
    sendState.value = 'loading'

    try {
      const res = await request({
        url: API.initNote,
        method: 'POST'
      })
      // console.log(res)

      return res
    } catch (error) {
      throw new Error(error)
    }
  }

  const saveNote = async (noteId, content, node) => {
    // console.log('!noteId || !content', !noteId || !content)
    if (!noteId || !content) return

    const res = await request({
      url: API.saveNote,
      method: 'POST',
      data: {
        noteId,
        content
      }
    })

    console.log('保存记录', res)
    updateSelectKey({ id: node.id, markId: noteId })
  }

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

    try {
      const res = await initNote()

      if (res.success) {
        modifyNodeProp(node.id, 'markId', res.data.noteId)

        await getStreamResponse(API.getNote, {
          mainArea,
          point
        }, res.data.noteId, node)
      }
    } catch (error) {
      sendState.value = 'available'
    }
  }

  const abortCurrentStream = () => {
    if (controller) {
      controller.abort()
    }
  }

  // 中断信号
  let controller = null

  const getStreamResponse = async (url, data, noteId, node) => {
    controller = new AbortController()
    // 保存信号，用于外部中断
    const abortSignal = controller.signal

    try {
      const baseUrl = import.meta.env.VITE_BASE_URL + url
      const headers = {
        'Content-Type': 'application/json'
      }
      if (userStore.token) {
        headers['Authorization'] = `Bearer ${userStore.token}`
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: abortSignal
      })

      // 读取流式响应
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      sendState.value = 'streaming'
      isMarkdownMode.value = true

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          sendState.value = 'available'

          saveNote(noteId, note.value, node)
          break
        }

        // 解析SSE格式数据（格式：data: [JSON]\n\n）
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n') // 按SSE分隔符分割

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // 去掉'data: '前缀
            if (data === '[DONE]') return // 结束标记
            const json = JSON.parse(data) // 解析为JSON
            // console.log('收到流式数据：', json)
            note.value += json.content
          }
        })
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('请求被主动中断')
      } else {
        console.error('请求错误:', err)
      }
      sendState.value = 'loading'
      saveNote(noteId, note.value, node)
      sendState.value = 'available'
    }
  }

  // 获取节点笔记
  const getNoteData = async (node) => {
    // console.log(node.markId)
    const res = await request({
      url: API.getNoteData,
      method: 'GET',
      params: {
        markId: node.markId ?? -1
      }
    })
    // console.log('获取节点笔记', res)

    note.value = res.data.content || '### 暂无笔记'
  }

  // 修改节点笔记
  const updateNoteData = async (markId) => {
    console.log(markId)
    if (!markId) return

    const res = await request({
      url: API.updateNote,
      method: 'POST',
      data: {
        noteId: markId,
        content: note.value
      }
    })
    console.log('修改节点笔记', res)

    if (res.success) {
      return true
    }

    return false
  }

  // 修改节点markId属性
  const modifyNodeProp = (targetId, propName, id) => {
    // console.log('!!!', treeData.value, targetId, propName, id)
    treeData.value = modifyTreeNodeProp(treeData.value, targetId, propName, id)
    saveMindmapData(treeData.value)
  }

  const selectedNode = ref(null)

  const addNode = (data) => {
    console.log(selectedNode.value)
    console.log(data)

    const newNode = { id: uuidv4(), name: data.name, children: [], isFolded: 0, frequency: data.frequency, markId: null, chatId: null }
    treeData.value = addChildrenById(treeData.value, selectedNode.value.id, newNode)

    try {
      mindmapStore.saveMindmapData(treeData.value) 
    } catch (err) {
      throw new Error(err)
    }
  }

  // 保存导图数据
  const saveMindmapData = async (data) => {
    if (isEmptyObj(data) || selectedAreaId.value === null) return

    await request({
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
    isMarkdownMode,
    getNote,
    sendState,
    note,
    getNoteData,
    selectedNode,
    addNode,
    abortCurrentStream,
    updateSelectKey,
    updateNoteData,
    registerCallback
  }
})