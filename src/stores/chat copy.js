import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session.js'
import { useUserInfoStore } from '@/stores/user.js'
import { request } from '@/utils/request.js'
import API from '@/utils/API.js'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

export const useChatStore = defineStore('chat', () => {
  const route = useRoute()
  const sessionStore = useSessionStore()
  const userStore = useUserInfoStore()

  const MSG_TYPE = {
    'user': 0, // 用户发言
    'question': 1, // AI提问
    'evaluation': 2, // AI评价
    'help': 3
  }

  // available: 可发送  waiting: 等待请求  writing: 流式写入中
  const status = ref('available')

  // 会话ID
  const sessionId = computed(() => +route.params.sessionId || '')

  // 当前展示的聊天记录
  const displayChat = ref([])

  watch(() => sessionId.value, () => {
    // console.log('watch sessionId', sessionId.value)
    initDisplayChat()
  })

  // 上一条消息
  const lastMessage = computed(() => {
    const lastMsg = displayChat.value[displayChat.value.length - 1]
    return lastMsg || ''
  })

  // 上一个问题
  const lastQuestion = computed(() => {
    const lastMsg = displayChat.value.findLast(item => item.messageType === MSG_TYPE['question'])
    return lastMsg?.content || ''
  })

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
  const funcType = reactive(['标准', '@回答思路 ', '@标准答案 ', '@思路+答案 '])

  // 选择的特殊功能
  const funcStatus = ref(0)

  // watch(() => funcStatus.value, (value) => console.log(value))

  const initDisplayChat = async () => {
    const { data } = await axios({
      url: API.getChatData,
      method: 'GET',
      params: {
        sessionId: sessionId.value
      }
    })
    
    displayChat.value = data.data.chatList
    console.log('状态', chatStatus.value)
  }

  const submit = async (content, status) => {
    if (!checkArea()) return

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

    if (!sessionId.value) {
      await sessionStore.initSession()
    }

    const res = await initChat(MSG_TYPE['question'])

    if (res.success) {
      await getStreamResponse(API.interviewStart, {
        sessionId: res.data.sessionId,
        mainArea: res.data.mainArea,
        surroundingPoint: res.data.surroundingPoint,
        customContent: content,
        areaId: sessionStore.mainArea.areaId
      }, res.data.chatId, MSG_TYPE['question'])
    }
  }

  const abortCurrentStream = () => {
    console.log('中断当前流')
    if (controller) {
      controller.abort()
    }
  }

  // 中断信号
  const controller = new AbortController()

  const getStreamResponse = async (url, data, chatId, msgType) => {
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

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
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
      saveChat(chatId, newText.content, data)
    }
  }

  const initChat = async (msgType) => {
    const { data } = await axios({
      url: API.initChat,
      method: 'POST',
      data: {
        sessionId: sessionId.value,
        msgType: msgType
      }
    })

    return data
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

    const userRes = await saveUserWords(MSG_TYPE['user'], content)
    pushUserText({ id: userRes.chatId}, true)

    const res = await initChat(MSG_TYPE['evaluation'])

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
  const getHelp = async (content, status) => {
    // 更新页面
    pushUserText({
      id: uuidv4(),
      content: customContent.value,
      sessionId: sessionId.value,
      messageType: MSG_TYPE['user']
    })

    const userRes = await saveUserWords(MSG_TYPE['user'], content)
    pushUserText({ id: userRes.chatId}, true)

    const res = await initChat(MSG_TYPE['help'])

    if (res.success) {
      await getStreamResponse(API.interviewHelp, {
        sessionId: res.data.sessionId,
        mainArea: res.data.mainArea,
        surroundingPoint: res.data.surroundingPoint,
        customContent: content,
        funcType: status,
        question: lastQuestion.value
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

  return {
    displayChat,
    initDisplayChat,
    chatStatus,
    funcStatus,
    funcType,
    sessionId,
    submit,
    customContent,
    getAIquestion,
    status,
    abortCurrentStream
  }
})
