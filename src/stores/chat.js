import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { request } from '@/utils/request.js'
import API from '@/utils/API.js'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

export const useChatStore = defineStore('chat', () => {
  const MSG_TYPE = {
    'user': 0, // 用户发言
    'question': 1, // AI提问
    'evaluation': 2, // AI评价
    'help': 3
  }

  // 已经加载的聊天记录
  const chatList = ref([])

  // 会话ID
  const sessionId = ref(5)

  // 当前展示的聊天记录
  const displayChat = ref([])

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

  // 当前的发言状态(0: 用户待发言  1: AI待发言)
  const chatStatus = computed(() => {
    if (displayChat.value.length <= 0) return MSG_TYPE['question']

    if (lastMessage.value.messageType === MSG_TYPE['question']) {
      return MSG_TYPE['user']
    }

    if (lastMessage.value.messageType === MSG_TYPE['help']) {
      return MSG_TYPE['user']
    }

    return MSG_TYPE['question']
  })

  // 输入框内容
  const customContent = ref('')

  // 特殊功能列表
  const funcType = reactive(['标准', '@回答模板 ', '@标准答案 ', '@模板+答案 '])

  // 选择的特殊功能
  const funcStatus = ref(0)

  // watch(() => funcStatus.value, (value) => console.log(value))

  const initDisplayChat = async () => {
    const { data } = await axios({
      url: API.initChatData,
      method: 'GET',
      params: {
        sessionId: sessionId.value
      }
    })
    console.log('chatList', data)
    
    displayChat.value = data.data.chatList
    console.log(chatStatus.value)
  }

  const initSession = async () => {
    const { data } = await axios({
      url: API.initSession,
      method: 'POST',
      data: {
        userId: 1,
        mainArea: '前端',
        surroundingPoint: 'Vue3',
      }
    })

    console.log('res_session', data)

    sessionId.value = data.data.sessionId
  }

  const submit = async () => {
    // 初始化session
    if (!sessionId.value) {
      initSession()
    }

    // 发送请求让AI开始提问
    if (chatStatus.value === MSG_TYPE['question']) {
      getAIquestion()
    }

    // 用户回答问题
    else if (chatStatus.value === MSG_TYPE['user']) {
      // console.log(funcStatus.value)
      // console.log(customContent.value)

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

  // 发送请求让AI开始提问
  const getAIquestion = async () => {
    const { data } = await axios({
      url: API.interviewStart,
      method: 'POST',
      data: {
        sessionId: sessionId.value,
        customContent: customContent.value
      }
    })
    // console.log(data)

    displayChat.value.push(data.data)

    // console.log(displayChat.value)

    console.log(chatStatus.value)
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
        mainArea: '前端'
      }
    })
    // console.log(data.data)

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

    const { data } = await axios({
      url: API.interviewHelp,
      method: 'POST',
      data: {
        sessionId: sessionId.value,
        question: lastQuestion.value,
        funcType: funcStatus.value,
        customContent: customContent.value,
        mainArea: '前端'
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
    submit,
    customContent,
    getAIquestion
  }
})
