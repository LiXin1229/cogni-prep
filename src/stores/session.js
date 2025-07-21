import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useSessionStore = defineStore('session', () => {
  // 会话列表
  const sessionList = ref([])

  // 当前的会话
  const currSession = ref(null)

  return {

  }
})
