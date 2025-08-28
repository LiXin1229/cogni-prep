import { defineStore } from 'pinia'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session.js'
import { useUserInfoStore } from '@/stores/user.js'
import API from '@/utils/API.js'
import request from '@/utils/request'
import { v4 as uuidv4 } from 'uuid'

export const useChatStore = defineStore('chat', () => {
  const route = useRoute()
  const router = useRouter()
  const sessionStore = useSessionStore()
  const userStore = useUserInfoStore()

  const MSG_TYPE = {
    'user': 0, // 用户发言
    'question': 1, // AI提问
    'evaluation': 2, // AI评价
    'help': 3
  }

  // 会话ID
  const sessionId = computed(() => +route.params.sessionId || '')

  const chatMap = reactive(new Map())

  const chatQueue = []

  const pushChatQueue = (currentSessionId, data) => {
    const length = chatQueue.length
    if (length >= 5) {
      const removeId = chatQueue.shift()
      chatMap.get(removeId).controller?.abort()
      chatMap.delete(removeId)
    }
    chatMap.set(currentSessionId, data)
    chatQueue.push(currentSessionId)
  }

  // 当前展示的聊天记录
  const displayChat = computed(() => chatMap.get(sessionId.value)?.chatList ?? [])
  const setDisplayChat = (value, currentSessionId) => chatMap.get(currentSessionId) && (chatMap.get(currentSessionId).chatList = value)

  const sendState = computed(() => chatMap.get(sessionId.value)?.sendState ?? 'available')
  const setSendState = (value, currentSessionId) => chatMap.get(currentSessionId) && (chatMap.get(currentSessionId).sendState = value)

  const nextState = computed(() => chatMap.get(sessionId.value)?.nextState ?? true)
  const setNextState = (value, currentSessionId) => chatMap.get(currentSessionId) && (chatMap.get(currentSessionId).nextState = value)

  const abortStream = () => {
    const currentSessionId = sessionId.value
    if (chatMap.get(currentSessionId)?.controller) {
      chatMap.get(currentSessionId).controller?.abort()
      chatMap.get(currentSessionId).controller = null
    }
  }

  // 获取当前会话的聊天列表
  const initDisplayChat = async () => {
    const currentSessionId = sessionId.value

    if (!currentSessionId) return

    if (!chatMap.has(currentSessionId)) {
      const res = await request({
        url: API.getChatData,
        method: 'GET',
        params: {
          sessionId: currentSessionId
        }
      })

      if (res.data.chatList.length === 0) return
      
      pushChatQueue(currentSessionId, {
        chatList: res.data.chatList,
        backupChatList: JSON.parse(JSON.stringify(res.data.chatList)),
        sendState: 'available',
        nextState: true,
        controller: null
      })
    }
  }

  watch(() => sessionId.value, () => {
    initDisplayChat()
    // console.log('map', chatMap)
  }, { immediate: true })

  // 上一条消息
  const lastMessage = computed(() => {
    const lastMsg = displayChat.value[displayChat.value.length - 1]
    return lastMsg || ''
  })

  const lastQuestion = computed(() => {
    const lastMsg = displayChat.value.findLast(item => item.messageType === MSG_TYPE['question'])
    return lastMsg?.content || ''
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
  const FUNC_TYPE = reactive(['标准', '@回答思路 ', '@标准答案 ', '@思路+答案 ', '@自由对话 ', '@自定义问题 '])

  // 选择的特殊功能
  const funcStatus = ref(0)

  const submit = async (content, status) => {
    if (!checkArea()) return

    let currentSessionId = sessionId.value

    // 初始化session
    if (!currentSessionId) {
      try {
        await sessionStore.initSession()
        currentSessionId = sessionId.value
        await getAIquestion(content, currentSessionId)
      } catch (err) {
        console.log(err)
      }

      return
    }

    // 发送请求让AI开始提问
    if (chatStatus.value === MSG_TYPE['question']) {
      getAIquestion(content, currentSessionId)
    }

    // 用户回答问题
    else if (chatStatus.value === MSG_TYPE['user']) {
      // 用户正常回答
      if (funcStatus.value === 0) {
        userAnwer(content, currentSessionId)
      }

      // 获取答题模板或其他
      else {
        getHelp(content, status, currentSessionId)
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
  const getAIquestion = async (content, currentSessionId) => {
    if (!checkArea()) return
    triggerComponent('scrollToBottom')

    if (!currentSessionId) {
      await sessionStore.initSession()
      currentSessionId = sessionId.value
      pushChatQueue(currentSessionId, {
        chatList: [],
        backupChatList: [],
        sendState: 'available',
        nextState: true,
        controller: null
      })
    }

    try {
      const res = await initChat(MSG_TYPE['question'], currentSessionId)

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
      console.log(error)
      setSendState('available', currentSessionId)
      setNextState(true, currentSessionId)
    }
  }

  const getStreamResponse = async (url, data, chatId, msgType) => {
    // console.log('getStreamResponse', data)
    chatMap.get(data.sessionId).controller = new AbortController()

    // 保存信号，用于外部中断
    const abortSignal = chatMap.get(data.sessionId).controller.signal

    const newText = reactive({
      content: '',
      id: chatId,
      messageType: msgType,
      sessionId: data.sessionId,
    })

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
        signal: abortSignal // 关联中断信号
      })

      // 读取流式响应
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      chatMap.get(data.sessionId).chatList.push(newText)

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setSendState('available', data.sessionId)
          saveChat(chatId, data.sessionId, newText.content, data, msgType)
          chatMap.get(data.sessionId).controller = null
          break
        }

        setSendState('streaming', data.sessionId)

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
      setSendState('loading', data.sessionId)
      saveChat(chatId, data.sessionId, newText.content, data, msgType)
      setSendState('available', data.sessionId)

      chatMap.get(data.sessionId) && (chatMap.get(data.sessionId).controller = null)
    }
  }

  const initChat = async (msgType, currentSessionId) => {
    setSendState('loading', currentSessionId)
    setNextState(false, currentSessionId)

    try {
      const res = await request({
        url: API.initChat,
        method: 'POST',
        data: {
          sessionId: currentSessionId,
          msgType: msgType
        }
      })

      return res 
    } catch (error) {
      throw new Error(error)
    }
  }

  const saveUserWords = async (msgType, content, currentSessionId) => {
    try {
      const res = await request({
        url: API.saveUserWords,
        method: 'POST',
        data: {
          sessionId: currentSessionId,
          msgType: msgType,
          customContent: content
        }
      })

      chatMap.get(currentSessionId).backupChatList.push({
        id: res.data.chatId,
        content,
        messageType: msgType,
        sessionId: currentSessionId
      })

      return res
    } catch (error) {
      setDisplayChat(chatMap.get(currentSessionId).backupChatList, currentSessionId)
    }
  }

  const saveChat = async (chatId, currentSessionId, content, data, msgType) => {
    // displayChat.value.find(item => item.id === chatId).content = content
    try {
      const res = await request({
        url: API.saveChat,
        method: 'POST',
        data: {
          chatId,
          content,
          surroundingPoint: data.surroundingPoint,
          areaId: data.areaId || null
        }
      })
      setNextState(true, currentSessionId)
      // console.log('保存记录', res)

      chatMap.get(currentSessionId).backupChatList.push({
        id: chatId,
        content,
        messageType: msgType,
        sessionId: currentSessionId
      })
    } catch (error) {
      setDisplayChat(chatMap.get(currentSessionId).backupChatList, currentSessionId)
    }
  }

  // 用户正常回答
  const userAnwer = async (content, currentSessionId) => {
    // 更新页面
    pushUserText(currentSessionId, {
      id: uuidv4(),
      content: customContent.value,
      sessionId: currentSessionId,
      messageType: MSG_TYPE['user']
    })

    triggerComponent('scrollToBottom')

    const userRes = await saveUserWords(MSG_TYPE['user'], content, currentSessionId)
    if (!userRes?.success) return
    // console.log('userRes', userRes)

    pushUserText(currentSessionId, { id: userRes.data.chatId }, true)

    const res = await initChat(MSG_TYPE['evaluation'], currentSessionId)

    if (res.success) {
      await getStreamResponse(API.interviewAnswer, {
        sessionId: res.data.sessionId,
        mainArea: res.data.mainArea,
        surroundingPoint: res.data.surroundingPoint,
        answer: content,
        question: lastQuestion.value
      }, res.data.chatId, MSG_TYPE['evaluation'])
    }
  }

  // 获取答题模板或其他
  const getHelp = async (content, status, currentSessionId) => {
    if (status === 5) {
      return custQustion(content.slice(7), currentSessionId)
    }

    // 更新页面
    pushUserText(currentSessionId, {
      id: uuidv4(),
      content: customContent.value,
      sessionId: currentSessionId,
      messageType: MSG_TYPE['user']
    })

    triggerComponent('scrollToBottom')

    const userRes = await saveUserWords(MSG_TYPE['user'], content, currentSessionId)
    if (!userRes?.success) return

    pushUserText(currentSessionId, { id: userRes.data.chatId }, true)

    const res = await initChat(MSG_TYPE['help'], currentSessionId)

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

  // 自定义问题
  const custQustion = async (content, currentSessionId) => {
    if (!content) return ElMessage({
      message: '请输入问题',
      type: 'info'
    })

    pushUserText(currentSessionId, {
      id: uuidv4(),
      content,
      sessionId: currentSessionId,
      messageType: MSG_TYPE['question']
    })

    triggerComponent('scrollToBottom')

    try {
      const res = await request({
        url: API.saveCust,
        post: 'POST',
        data: {
          sessionId: sessionId.value,
          content: content,
          messageType: MSG_TYPE['question']
        }
      }) 

      if (res.success) {
        pushUserText(currentSessionId, { id: res.data.chatId }, true)

        chatMap.get(currentSessionId).backupChatList.push({
          id: res.data.chatId,
          content,
          messageType: MSG_TYPE['question'],
          sessionId: currentSessionId
        })
      }
    } catch (error) {
      setDisplayChat(chatMap.get(currentSessionId).backupChatList, currentSessionId)
    }
  }

  const pushUserText = (currentSessionId, data, isReplace = false) => {
    const curr =  chatMap.get(currentSessionId)
    // console.log('pushUserText', data)
    if (isReplace) {
      curr.chatList.at(-1).id = data.id
    } else {
      curr.chatList.push(data)
    }
  }
  
  // 删除对话
  const selectChat = ref(null)

  const deleteChat = async () => {
    const currentSessionId = sessionId.value

    const res = await request({
      url: API.deleteChat,
      method: 'POST',
      data: {
        chatId: selectChat.value.id
      }
    })
    // console.log(res)

    if (res.success) {
      chatMap.get(currentSessionId).chatList = displayChat.value.filter(item => item.id !== selectChat.value.id)
    }
  }

  // 是否在选择收藏
  const isChosePrefer = ref(false)

  // 已选中的对话
  const preferList = ref(new Set())

  // 是否全选
  const isChoseAll = computed(() => preferList.value.size === displayChat.value.length)

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

      const res = await request({
        url: API.initPrefer,
        method: 'POST',
        data: {
          userId: userStore.userInfo.userId,
          title: sessionStore.currSession.title,
          content: content,
          chatIds: sortChats
        }
      })

      if (res.success) {
        const id = res.data.perferId
        ElMessage({
          dangerouslyUseHTMLString: true,
          message: `收藏成功，<span style="text-decoration: underline; cursor: pointer;" id="go-prefer-${id}">去看看</span>`,
          type: 'success'
        })

        nextTick(() => {
          const link = document.querySelector(`#go-prefer-${id}`)
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
    chatMap,
    displayChat,
    initDisplayChat,
    chatStatus,
    funcStatus,
    lastMessage,
    selectQuestion,
    FUNC_TYPE,
    sessionId,
    submit,
    customContent,
    getAIquestion,
    sendState,
    nextState,
    abortStream,
    selectChat,
    deleteChat,
    isChosePrefer,
    isChoseAll,
    preferList,
    submitPrefers,
    registerCallback
  }
})
