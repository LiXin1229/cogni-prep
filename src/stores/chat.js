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

  const submit = async () => {
    if (!checkArea()) return

    // 初始化session
    if (!sessionId.value) {
      try {
        await sessionStore.initSession()
        await getAIquestion()
      } catch (err) {
        console.log(err)
      }

      return
    }

    // 发送请求让AI开始提问
    if (chatStatus.value === MSG_TYPE['question']) {
      getAIquestion()
    }

    // 用户回答问题
    else if (chatStatus.value === MSG_TYPE['user']) {
      // 用户正常回答
      if (funcStatus.value === 0) {
        userAnwer()
      }

      // 获取答题模板或其他
      else {
        getHelp()
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
  const getAIquestion = async () => {
    if (!checkArea()) return

    if (!sessionId.value) {
      await sessionStore.initSession()
    }

    const res = await initChat()

    if (res.success) {
      getStreamResponse({
        sessionId: res.data.sessionId,
        mainArea: res.data.mainArea,
        surroundingPoint: res.data.surroundingPoint,
        customContent: customContent.value,
        areaId: sessionStore.mainArea.areaId
      }, res.data.chatId)
    }
  }

  const getStreamResponse = async (data, chatId) => {
    const newText = reactive({
      content: '',
      id: chatId,
      messageType: MSG_TYPE['question'],
      sessionId: data.sessionId,
    })

    displayChat.value.push(newText)

    try {
      const response = await fetch('/api/chat/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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
      saveChat(chatId, newText.value.content, data)
    }
  }

  const initChat = async () => {
    const { data } = await axios({
      url: API.initChat,
      method: 'POST',
      data: {
        sessionId: sessionId.value
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
        areaId: data.areaId
      }
    })
    console.log('保存记录', res)
  }

  // 用户正常回答
  const userAnwer = async () => {
    // 更新页面
    pushUserText({
      id: uuidv4(),
      content: customContent.value,
      sessionId: sessionId.value,
      messageType: MSG_TYPE['user']
    })

    const { data } = await axios({
      url: API.interviewAnswer,
      method: 'POST',
      data: {
        sessionId: sessionId.value,
        question: lastQuestion.value,
        answer: customContent.value,
        mainArea: sessionStore.mainArea.name
      }
    })
    console.log(data.data)

    displayChat.value.push(data.data)
  }

  // 获取答题模板或其他
  const getHelp = async () => {
    // 更新页面
    pushUserText({
      id: uuidv4(),
      content: customContent.value,
      sessionId: sessionId.value,
      messageType: MSG_TYPE['user']
    })

    const res = await initChat()

    if (res.success) {
      getStreamResponse({
        sessionId: res.data.sessionId,
        mainArea: res.data.mainArea,
        customContent: customContent.value,
        areaId: sessionStore.mainArea.areaId,
        funcType: funcStatus.value,
        question: lastQuestion.value
      }, res.data.chatId)
    }

    return

    const { data } = await axios({
      url: API.interviewHelp,
      method: 'POST',
      data: {
        sessionId: sessionId.value,
        question: lastQuestion.value,
        funcType: funcStatus.value,
        customContent: customContent.value,
        mainArea: sessionStore.mainArea.name
      }
    })
    // console.log(data.data)

    displayChat.value.push(data.data)
  }

  const pushUserText = (data) => {
    displayChat.value.push(data)
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
    status
  }
})
