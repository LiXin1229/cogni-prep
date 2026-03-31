import { defineStore } from 'pinia'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useUserInfoStore } from '@/stores/user'
import API from '@/utils/API.js'
import request from '@/utils/request'
import { v4 as uuidv4 } from 'uuid'
import rfdc from 'rfdc'
import { MSG_TYPE } from './types/chat.type'
import type {
  ChatType,
  ChatMapValueTpye,
  SendStateType,
  ChatStatusType,
  FuncStatusType,
  StreamRequestConfigType,
  ChatInitRespType,
  TemTextType,
  CallbackMap,
} from './types/chat.type'

export const useChatStore = defineStore('chat', () => {
  const route = useRoute()
  const router = useRouter()
  const sessionStore = useSessionStore()
  const userStore = useUserInfoStore()
  const clone = rfdc({ circles: true })

  // 会话ID
  const sessionId = computed(() => +route.params.sessionId || -1)

  const chatMap = reactive(new Map<number, ChatMapValueTpye>())

  const chatQueue: number[] = []

  const pushChatQueue = (currentSessionId: number, data: ChatMapValueTpye) => {
    const length = chatQueue.length
    if (length >= 5) {
      const removeId = chatQueue.shift() as number
      chatMap.get(removeId)?.controller?.abort()
      chatMap.delete(removeId)
    }
    chatMap.set(currentSessionId, data)
    chatQueue.push(currentSessionId)
  }

  // 当前展示的聊天记录
  const displayChat = computed(() => chatMap.get(sessionId.value)?.chatList ?? [])
  const setDisplayChat = (value: ChatType[], currentSessionId: number) => {
    const chatMapValue = chatMap.get(currentSessionId)
    if (chatMapValue) chatMapValue.chatList = value
  }

  const sendState = computed(() => chatMap.get(sessionId.value)?.sendState ?? 'available')
  const setSendState = (value: SendStateType, currentSessionId: number) => {
    const chatMapValue = chatMap.get(currentSessionId)
    if (chatMapValue) chatMapValue.sendState = value
  }

  const nextState = computed(() => chatMap.get(sessionId.value)?.nextState ?? true)
  const setNextState = (value: boolean, currentSessionId: number) => {
    const chatMapValue = chatMap.get(currentSessionId)
    if (chatMapValue) chatMapValue.nextState = value
  }

  const abortStream = () => {
    const currentSessionId = sessionId.value
    const chatMapValue = chatMap.get(currentSessionId)
    if (chatMapValue) {
      chatMapValue.controller?.abort()
      chatMapValue.controller = null
    }
  }

  // 获取当前会话的聊天列表
  const initDisplayChat = async (currentSessionId: number) => {
    // console.log('initDisplayChat', currentSessionId)
    if (currentSessionId < 0) return

    if (!chatMap.has(currentSessionId)) {
      try {
        const res = await request<{ chatList: ChatType[] }>({
          url: API.getChatData,
          method: 'GET',
          params: {
            sessionId: currentSessionId,
          },
        })
        console.log('getChatData: ', res)

        pushChatQueue(currentSessionId, {
          chatList: res.data.chatList,
          backupChatList: clone(res.data.chatList),
          sendState: 'available',
          nextState: true,
          controller: null,
        })
      } catch (error) {
        // 获取聊天失败的处理
        console.log(error)
      }
    }
  }

  watch(
    () => sessionId.value,
    (sessionId) => {
      initDisplayChat(sessionId)
      // console.log('map', chatMap)
    },
    { immediate: true, flush: 'sync' }
  )

  // 上一条消息
  const lastMessage = computed(() => {
    const lastMsg = displayChat.value[displayChat.value.length - 1]
    return lastMsg || ''
  })

  const lastQuestion = computed(() => {
    const lastMsg = displayChat.value.findLast((item) => item.messageType === MSG_TYPE['question'])
    return lastMsg?.content || ''
  })

  // 选择的题
  const selectQuestion = ref('')

  // 当前的发言状态
  const chatStatus = computed<ChatStatusType>(() => {
    if (lastMessage.value.messageType !== MSG_TYPE['user'])
      return MSG_TYPE['user'] as ChatStatusType

    return MSG_TYPE['question'] as ChatStatusType
  })

  // 输入框内容
  const customContent = ref('')

  // 选择的特殊功能
  const funcStatus = ref<FuncStatusType>(0)

  const submit = async (content: string, status: FuncStatusType) => {
    if (!checkArea()) return

    const currentSessionId = sessionId.value

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
        type: 'info',
      })
      userStore.showDialog = 'selectArea'
      return false
    }
    return true
  }

  // 发送请求让AI开始提问
  const getAIquestion = async (content: string, currentSessionId: number) => {
    if (!checkArea()) return
    triggerComponent('scrollToBottom')

    if (currentSessionId < 0) {
      await sessionStore.initSession()
      currentSessionId = sessionId.value
      await initDisplayChat(currentSessionId)
    }

    try {
      const res = await initChat(MSG_TYPE['question'] as ChatStatusType, currentSessionId)

      if (res.success) {
        await getStreamResponse(
          API.interviewStart,
          {
            sessionId: res.data.sessionId,
            mainArea: res.data.mainArea,
            surroundingPoint: res.data.surroundingPoint,
            customContent: content,
            areaId: sessionStore.mainArea.areaId as number,
          },
          res.data.chatId,
          MSG_TYPE['question'] as ChatStatusType
        )
      } else {
        throw new Error('初始化会话失败')
      }
    } catch (error) {
      console.log(error)
      setSendState('available', currentSessionId)
      setNextState(true, currentSessionId)
    }
  }

  const getStreamResponse = async (
    url: string,
    data: StreamRequestConfigType,
    chatId: number,
    msgType: ChatStatusType
  ) => {
    // console.log('getStreamResponse', data)
    const chatMapValue = chatMap.get(data.sessionId)
    if (chatMapValue) chatMapValue.controller = new AbortController()

    // 保存信号，用于外部中断
    const abortSignal: AbortSignal | undefined = chatMapValue?.controller?.signal

    const newText = reactive({
      content: '',
      id: chatId,
      messageType: msgType,
      sessionId: data.sessionId,
    })

    try {
      const baseUrl = import.meta.env.VITE_BASE_URL + url
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (userStore.token) {
        headers['Authorization'] = `Bearer ${userStore.token}`
      }

      const response: Response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: abortSignal, // 关联中断信号
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      // 读取流式响应
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const chatMapValue = chatMap.get(data.sessionId)
      if (!chatMapValue) return
      chatMapValue.chatList.push(newText)

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setSendState('available', data.sessionId)
          saveChat(chatId, data.sessionId, newText.content, data, msgType)

          const chatMapValue = chatMap.get(data.sessionId)
          if (chatMapValue) chatMapValue.controller = null
          break
        }

        setSendState('streaming', data.sessionId)

        // 解析SSE格式数据（格式：data: [JSON]\n\n）
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n') // 按SSE分隔符分割

        lines.forEach((line) => {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // 去掉'data: '前缀
            if (data === '[DONE]') return // 结束标记
            const json: { content: string } = JSON.parse(data) // 解析为JSON
            // console.log('收到流式数据：', json)
            newText.content += json.content
          }
        })
      }
    } catch (err: any) {
      // 捕获中断错误（区别于其他错误）
      if (err.name === 'AbortError') {
        console.log('请求被主动中断')
      } else {
        console.error('请求错误:', err)
      }
      setSendState('loading', data.sessionId)
      saveChat(chatId, data.sessionId, newText.content, data, msgType)
      setSendState('available', data.sessionId)

      const chatMapValue = chatMap.get(data.sessionId)
      if (chatMapValue) chatMapValue.controller = null
    }
  }

  // 初始化对话
  const initChat = async (msgType: ChatStatusType, currentSessionId: number) => {
    setSendState('loading', currentSessionId)
    setNextState(false, currentSessionId)

    try {
      const res = await request<ChatInitRespType>({
        url: API.initChat,
        data: {
          sessionId: currentSessionId,
          msgType: msgType,
        },
      })
      // console.log(res)
      return res
    } catch (error: any) {
      throw new Error(error)
    }
  }

  const saveUserWords = async (
    msgType: ChatStatusType,
    content: string,
    currentSessionId: number
  ) => {
    try {
      const res = await request<{ chatId: number }>({
        url: API.saveUserWords,
        data: {
          sessionId: currentSessionId,
          msgType: msgType,
          customContent: content,
        },
      })

      const chatMapValue = chatMap.get(currentSessionId)
      if (chatMapValue)
        chatMapValue.backupChatList.push({
          id: res.data.chatId,
          content,
          messageType: msgType,
          sessionId: currentSessionId,
        })

      return res
    } catch (error: any) {
      console.log(error)
      const chatMapValue = chatMap.get(currentSessionId)
      if (chatMapValue) setDisplayChat(chatMapValue.backupChatList, currentSessionId)
    }
  }

  const saveChat = async (
    chatId: number,
    currentSessionId: number,
    content: string,
    data: StreamRequestConfigType,
    msgType: ChatStatusType
  ) => {
    // displayChat.value.find(item => item.id === chatId).content = content
    try {
      await request({
        url: API.saveChat,
        data: {
          chatId,
          content,
          surroundingPoint: data.surroundingPoint,
          areaId: data.areaId || null,
        },
      })
      setNextState(true, currentSessionId)
      // console.log('保存记录', res)

      const chatMapValue = chatMap.get(currentSessionId)
      if (chatMapValue)
        chatMapValue.backupChatList.push({
          id: chatId,
          content,
          messageType: msgType,
          sessionId: currentSessionId,
        })
    } catch (error) {
      console.log(error)
      const chatMapValue = chatMap.get(currentSessionId)
      if (chatMapValue) setDisplayChat(chatMapValue.backupChatList, currentSessionId)
    }
  }

  // 用户正常回答
  const userAnwer = async (content: string, currentSessionId: number) => {
    // 更新页面
    pushUserText(currentSessionId, {
      id: uuidv4(),
      content: customContent.value,
      sessionId: currentSessionId,
      messageType: MSG_TYPE['user'] as ChatStatusType,
    })

    triggerComponent('scrollToBottom')

    try {
      const userRes = await saveUserWords(
        MSG_TYPE['user'] as ChatStatusType,
        content,
        currentSessionId
      )
      if (!userRes?.success) return
      // console.log('userRes', userRes)

      pushUserText(currentSessionId, { id: userRes.data.chatId }, true)

      const res = await initChat(MSG_TYPE['evaluation'] as ChatStatusType, currentSessionId)

      if (res.success) {
        await getStreamResponse(
          API.interviewAnswer,
          {
            sessionId: res.data.sessionId,
            mainArea: res.data.mainArea,
            surroundingPoint: res.data.surroundingPoint,
            answer: content,
            question: lastQuestion.value,
          },
          res.data.chatId,
          MSG_TYPE['evaluation'] as ChatStatusType
        )
      }
    } catch (error) {
      console.log(error)
    }
  }

  // 获取答题模板或其他
  const getHelp = async (content: string, status: FuncStatusType, currentSessionId: number) => {
    if (status === 5) {
      return custQustion(content.slice(7), currentSessionId)
    }

    // 更新页面
    pushUserText(currentSessionId, {
      id: uuidv4(),
      content: customContent.value,
      sessionId: currentSessionId,
      messageType: MSG_TYPE['user'] as ChatStatusType,
    })

    triggerComponent('scrollToBottom')

    const userRes = await saveUserWords(
      MSG_TYPE['user'] as ChatStatusType,
      content,
      currentSessionId
    )
    if (!userRes?.success) return

    pushUserText(currentSessionId, { id: userRes.data.chatId }, true)

    const res = await initChat(MSG_TYPE['help'] as ChatStatusType, currentSessionId)

    if (res.success) {
      await getStreamResponse(
        API.interviewHelp,
        {
          sessionId: res.data.sessionId,
          mainArea: res.data.mainArea,
          surroundingPoint: res.data.surroundingPoint,
          customContent: content,
          funcType: status,
          question: selectQuestion.value,
        },
        res.data.chatId,
        MSG_TYPE['help'] as ChatStatusType
      )
    }
  }

  // 自定义问题
  const custQustion = async (content: string, currentSessionId: number) => {
    if (!content)
      return ElMessage({
        message: '请输入问题',
        type: 'info',
      })

    pushUserText(currentSessionId, {
      id: uuidv4(),
      content,
      sessionId: currentSessionId,
      messageType: MSG_TYPE['question'] as ChatStatusType,
    })

    triggerComponent('scrollToBottom')

    try {
      const res = await request<{ chatId: number }>({
        url: API.saveCust,
        data: {
          sessionId: sessionId.value,
          content: content,
          messageType: MSG_TYPE['question'],
        },
      })

      pushUserText(currentSessionId, { id: res.data.chatId }, true)

      const chatMapValue = chatMap.get(currentSessionId)
      if (chatMapValue)
        chatMapValue.backupChatList.push({
          id: res.data.chatId,
          content,
          messageType: MSG_TYPE['question'] as ChatStatusType,
          sessionId: currentSessionId,
        })
    } catch (error) {
      console.log(error)
      const chatMapValue = chatMap.get(currentSessionId)
      if (chatMapValue) setDisplayChat(chatMapValue.backupChatList, currentSessionId)
    }
  }

  const pushUserText = (currentSessionId: number, data: TemTextType, isReplace = false) => {
    const curr = chatMap.get(currentSessionId) as ChatMapValueTpye
    // console.log('pushUserText', data)
    if (isReplace) {
      const lastLength = curr.chatList.length - 1
      curr.chatList[lastLength].id = data.id as number
    } else {
      curr.chatList.push(data as ChatType)
    }
  }

  // 删除对话
  const selectChat = ref<ChatType | null>(null)

  const deleteChat = async () => {
    const currentSessionId = sessionId.value
    const selectedChat = selectChat.value
    if (selectedChat === null) return

    try {
      if (selectChat.value === null) return
      await request({
        url: API.deleteChat,
        data: {
          chatId: selectedChat.id,
        },
      })
      // console.log(res)

      const chatMapValue = chatMap.get(currentSessionId)
      if (chatMapValue) {
        chatMapValue.chatList = displayChat.value.filter((item) => item.id !== selectedChat.id)
        chatMapValue.backupChatList = clone(chatMapValue.chatList)
      }
    } catch (error) {
      console.log(error)
    }
  }

  // 是否在选择收藏
  const isChosePrefer = ref(false)

  // 已选中的对话
  const preferList = ref(new Map<number, ChatType>())

  // 是否全选
  const isChoseAll = computed(() => preferList.value.size === displayChat.value.length)

  // 提交收藏
  const submitPrefers = async () => {
    if (preferList.value.size === 0) {
      ElMessage({
        message: '请选择对话',
        type: 'info',
      })
      return
    }

    isChosePrefer.value = false

    try {
      const sortChats = Array.from(preferList.value, (chat) => chat[1]).sort((a, b) => a.id - b.id)
      const content: string =
        sortChats[0].content + sortChats?.[1]?.content || '' + sortChats?.[2]?.content || ''

      const res = await request<{ perferId: number }>({
        url: API.initPrefer,
        data: {
          userId: userStore.userInfo.userId,
          title: sessionStore.currSession?.title,
          content: content,
          chatIds: sortChats.map((chat) => chat.id),
        },
      })

      if (res.success) {
        const id = res.data.perferId
        ElMessage({
          dangerouslyUseHTMLString: true,
          message: `收藏成功，<span style="text-decoration: underline; cursor: pointer;" id="go-prefer-${id}">去看看</span>`,
          type: 'success',
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
    } catch (error: any) {
      throw new Error(error)
    }
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
    chatMap,
    displayChat,
    initDisplayChat,
    chatStatus,
    funcStatus,
    lastMessage,
    selectQuestion,
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
    registerCallback,
  }
})
