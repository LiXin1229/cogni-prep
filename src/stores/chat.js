import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { request } from '@/utils/request.js'
import API from '@/utils/API.js'
import axios from 'axios'

export const useChatStore = defineStore('chat', () => {
  const MSG_TYPE = {
    'user': 0, // 用户发言
    'question': 1, // AI提问
    'evaluation': 2 // AI评价
  }

  // 已经加载的聊天记录
  const chatList = ref([])

  // 当前展示的聊天记录
  const displayChat = ref([])

  // 会话ID
  const sessionId = ref(5)

  // 当前的发言状态(1: AI待发言  0: 用户待发言)
  const chatStatus = computed(() => {
    if (displayChat.value.length <= 0) return MSG_TYPE['question']

    if (displayChat.value[displayChat.value.length - 1].messageType === MSG_TYPE['question']) {
      return MSG_TYPE['user']
    }

    return MSG_TYPE['question']
  })

  // 输入框内容
  const customContent = ref('')

  // @特殊功能
  const funcStatus = ref('')

  const initDisplayChat = async () => {
    const { data } = await axios({
      url: API.initChatData,
      method: 'GET',
      params: {
        sessionId: sessionId.value
      }
    })
    // console.log('chatList', data)
    
    displayChat.value = data.data.chatList
    console.log(chatStatus.value)
  }

  const submit = async () => {
    console.log(customContent.value)
    
    return
    // 发送请求让AI开始提问
    if (chatStatus.value === 1) {
      // 初始化session
      if (!sessionId.value) {
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

    // 用户回答问题
    else if (chatStatus.value === 0) {
      const { data } = await axios({
        url: API.interviewAnswer,
        method: 'POST',
        data: {
          sessionId: sessionId.value,
          question: displayChat.value[displayChat.value.length - 1].content,
          answer: customContent.value,
          mainArea: '前端'
        }
      })
      // console.log(data.data)

      displayChat.value.push(data.data)
    }
  }

  return {
    displayChat,
    initDisplayChat,
    chatStatus,
    funcStatus,
    submit,
    customContent
  }
})
