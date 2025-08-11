import { defineStore } from 'pinia'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session.js'
import { useUserInfoStore } from '@/stores/user.js'
import { usePreferStore } from './prefer'
import API from '@/utils/API.js'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

export const useChatStore = defineStore('chat', () => {
  const route = useRoute()
  const router = useRouter()
  const sessionStore = useSessionStore()
  const userStore = useUserInfoStore()
  const preferStore = usePreferStore()

  const MSG_TYPE = {
    'user': 0, // 用户发言
    'question': 1, // AI提问
    'evaluation': 2, // AI评价
    'help': 3
  }

  // 会话ID
  const sessionId = computed(() => +route.params.sessionId || '')

  const chatMap = reactive(new Map())

  // 当前展示的聊天记录
  const displayChat = ref([])

  watch(() => sessionId.value, () => {
    // console.log('watch sessionId', sessionId.value)
    initDisplayChat()
  })

  // 获取当前会话的聊天列表
  const initDisplayChat = async () => {
    const currentId = sessionId.value
    // console.log('initDisplayChat', currentId)

    if (!currentId) {
      displayChat.value = []
      return
    }

    if (chatMap.has(currentId)) {
      displayChat.value = chatMap.get(currentId)
    }

    else {
      const { data } = await axios({
        url: API.getChatData,
        method: 'GET',
        params: {
          sessionId: sessionId.value
        }
      })
      
      displayChat.value = data.data.chatList
      chatMap.set(currentId, displayChat.value)
      // console.log('状态', chatStatus.value)
    }
  }

  // 统一管理状态
  const createSessionState = (defaultValue) => {
    const stateMap = reactive(new Map())
    
    const getCurrentState = () => {
      const id = sessionId.value || 0 // 统一处理空会话
      if (!stateMap.has(id)) {
        stateMap.set(id, ref(defaultValue)) // 自动初始化
      }
      return stateMap.get(id)
    }
    
    // 生成当前会话的计算属性
    const state = computed({
      get: () => getCurrentState().value,
      set: (val) => getCurrentState().value = val
    })
  
    return { state, stateMap }
  }

  const { state: sendState } = createSessionState('available')
  const { state: nextState } = createSessionState(true)

  // 上一条消息
  const lastMessage = computed(() => {
    const lastMsg = displayChat.value[displayChat.value.length - 1]
    return lastMsg || ''
  })

  // 选择的题
  const selectQuestion = ref('')

  // 当前的发言状态
  const chatStatus = computed(() => {
    if (displayChat.value.length <= 0) return MSG_TYPE['question']

    if (lastMessage.value.messageType === MSG_TYPE['question']) {
      return MSG_TYPE['user']
    }

    if (lastMessage.value.messageType === MSG_TYPE['help']) {
      return MSG_TYPE['user']
    }

    if (lastMessage.value.messageType === MSG_TYPE['evaluation']) {
      return MSG_TYPE['user']
    }

    return MSG_TYPE['question']
  })

  // 输入框内容
  const customContent = ref('')

  // 特殊功能列表
  const funcType = reactive(['标准', '@回答思路 ', '@标准答案 ', '@思路+答案 ', '@自由对话 '])

  // 选择的特殊功能
  const funcStatus = ref(0)

  const submit = async (content, status) => {
    // testStream()
    if (!checkArea()) return
    // triggerComponent('scrollToBottom')

    // 初始化session
    if (!sessionId.value) {
      try {
        await sessionStore.initSession()
        await getAIquestion(content)
      } catch (err) {
        console.log(err)
      }

      return
    }

    // 发送请求让AI开始提问
    if (chatStatus.value === MSG_TYPE['question']) {
      getAIquestion(content)
    }

    // 用户回答问题
    else if (chatStatus.value === MSG_TYPE['user']) {
      // 用户正常回答
      if (funcStatus.value === 0) {
        userAnwer(content, status)
      }

      // 获取答题模板或其他
      else {
        getHelp(content, status)
      }
    }
  }

  // 检查是否选择领域
  const checkArea = () => {
    // console.log('sessionStore.mainArea', sessionStore.mainArea)
    if (sessionStore.mainArea.areaId === null) {
      ElMessage({
        message: '请选择领域',
        type: 'info'
      })
      userStore.showDialog = 'selectArea'
      return false
    }
    return true
  }

  // 发送请求让AI开始提问
  const getAIquestion = async (content) => {
    if (!checkArea()) return
    triggerComponent('scrollToBottom')

    if (!sessionId.value) {
      await sessionStore.initSession()
    }

    try {
      const res = await initChat(MSG_TYPE['question'])

      if (res.success) {
        await getStreamResponse(API.interviewStart, {
          sessionId: res.data.sessionId,
          mainArea: res.data.mainArea,
          surroundingPoint: res.data.surroundingPoint,
          customContent: content,
          areaId: sessionStore.mainArea.areaId
        }, res.data.chatId, MSG_TYPE['question'])
      } else {
        throw new Error('初始化会话失败')
      }
    } catch (error) {
      // console.log(error)
      sendState.value = 'available'
      nextState.value = true
    }
  }

  const abortCurrentStream = () => {
    if (controller) {
      controller.abort()
    }
  }

  // 中断信号
  let controller = null

  const getStreamResponse = async (url, data, chatId, msgType) => {
    controller = new AbortController()
    // 保存信号，用于外部中断
    const abortSignal = controller.signal

    const newText = reactive({
      content: '',
      id: chatId,
      messageType: msgType,
      sessionId: data.sessionId,
    })

    displayChat.value.push(newText)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: abortSignal // 关联中断信号
      })

      // 读取流式响应
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      sendState.value = 'streaming'

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          sendState.value = 'available'

          saveChat(chatId, newText.content, data)
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
            newText.content += json.content
          }
        })
      }
    } catch (err) {
      // 捕获中断错误（区别于其他错误）
      if (err.name === 'AbortError') {
        console.log('请求被主动中断')
      } else {
        console.error('请求错误:', err)
      }
      sendState.value = 'loading'
      saveChat(chatId, newText.content, data)
      sendState.value = 'available'
    }
  }

  const initChat = async (msgType) => {
    sendState.value = 'loading'
    nextState.value = false

    try {
      const { data } = await axios({
        url: API.initChat,
        method: 'POST',
        data: {
          sessionId: sessionId.value,
          msgType: msgType
        }
      })

      return data 
    } catch (error) {
      throw new Error(error)
    }
  }

  const saveUserWords = async (msgType, content) => { 
    const { data } = await axios({
      url: API.saveUserWords,
      method: 'POST',
      data: {
        sessionId: sessionId.value,
        msgType: msgType,
        customContent: content
      }
    })

    return data
  }

  const saveChat = async (chatId, content, data) => {
    const res = await axios({
      url: API.saveChat,
      method: 'POST',
      data: {
        chatId,
        content,
        surroundingPoint: data.surroundingPoint,
        areaId: data.areaId || null
      }
    })
    nextState.value = true
    console.log('保存记录', res)
  }

  // 用户正常回答
  const userAnwer = async (content) => {
    // 更新页面
    pushUserText({
      id: uuidv4(),
      content: customContent.value,
      sessionId: sessionId.value,
      messageType: MSG_TYPE['user']
    })

    triggerComponent('scrollToBottom')

    const userRes = await saveUserWords(MSG_TYPE['user'], content)
    console.log('userRes', userRes)
    pushUserText({ id: userRes.data.chatId }, true)

    const res = await initChat(MSG_TYPE['evaluation'])

    if (res.success) {
      await getStreamResponse(API.interviewAnswer, {
        sessionId: res.data.sessionId,
        mainArea: res.data.mainArea,
        surroundingPoint: res.data.surroundingPoint,
        answer: content,
        question: selectQuestion.value
      }, res.data.chatId, MSG_TYPE['evaluation'])
    }
  }

  // 获取答题模板或其他
  const getHelp = async (content, status) => {
    // 更新页面
    pushUserText({
      id: uuidv4(),
      content: customContent.value,
      sessionId: sessionId.value,
      messageType: MSG_TYPE['user']
    })

    triggerComponent('scrollToBottom')

    const userRes = await saveUserWords(MSG_TYPE['user'], content)
    pushUserText({ id: userRes.data.chatId }, true)

    const res = await initChat(MSG_TYPE['help'])

    if (res.success) {
      await getStreamResponse(API.interviewHelp, {
        sessionId: res.data.sessionId,
        mainArea: res.data.mainArea,
        surroundingPoint: res.data.surroundingPoint,
        customContent: content,
        funcType: status,
        question: selectQuestion.value
      }, res.data.chatId, MSG_TYPE['help'])
    }
  }

  const pushUserText = (data, isReplace = false) => {
    if (isReplace) {
      displayChat.value[displayChat.value.length - 1].id = data.id
    } else {
      displayChat.value.push(data)
    }
  }
  
  // 删除对话
  const selectChat = ref(null)

  const deleteChat = async () => {
    const { data } = await axios({
      url: API.deleteChat,
      method: 'POST',
      data: {
        chatId: selectChat.value.id
      }
    })
    // console.log(data)

    if (data.success) {
      displayChat.value = displayChat.value.filter(item => item.id !== selectChat.value.id)
    }
  }

  // 是否在选择收藏
  const isChosePrefer = ref(false)

  // 已选中的对话
  const preferList = ref(new Set())

  // 是否全选
  const isChoseAll = computed(() => {
    return preferList.value.size === displayChat.value.length
  })

  // 提交收藏
  const submitPrefers = async () => {
    if (preferList.value.size === 0) {
      ElMessage({
        message: '请选择对话',
        type: 'info'
      })
      return
    }

    isChosePrefer.value = false

    try {
      const sortChats = Array.from(preferList.value).sort((a, b) => a - b)
      const content = displayChat.value.find(item => item.id === sortChats[0]).content + displayChat.value.find(item => item.id === sortChats[1] || -1)?.content || ''

      const { data } = await axios({
        url: API.initPrefer,
        method: 'POST',
        data: {
          userId: 1,
          title: sessionStore.currSession.title,
          content: content,
          chatIds: sortChats
        }
      })

      if (data.success) {
        const id = data.data.perferId
        ElMessage({
          dangerouslyUseHTMLString: true,
          message: `收藏成功，<span style="text-decoration: underline; cursor: pointer;" id="go-prefer-${id}">去看看</span>`,
          type: 'success'
        })

        nextTick(() => {
          const link = document.querySelector(`#go-prefer-${id}`)
          console.log(link)
          if (link) {
            link.addEventListener('click', () => {
              router.push('/prefer')
            })
          }
        })
      }
    } catch (error) {
      throw new Error(error)
    }
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
    displayChat,
    initDisplayChat,
    chatStatus,
    funcStatus,
    lastMessage,
    selectQuestion,
    funcType,
    sessionId,
    submit,
    customContent,
    getAIquestion,
    sendState,
    nextState,
    abortCurrentStream,
    selectChat,
    deleteChat,
    isChosePrefer,
    isChoseAll,
    preferList,
    submitPrefers,
    registerCallback
  }
})
