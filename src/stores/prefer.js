import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session.js'
import { useUserInfoStore } from '@/stores/user.js'
import { useChatStore } from './chat'
import { getTextWidth } from '@/utils/getTextWidth.js'
import API from '@/utils/API.js'
import axios from 'axios'
import { th } from 'element-plus/es/locales.mjs'

export const usePreferStore = defineStore('prefer', () => {
  const route = useRoute()
  const router = useRouter()
  const sessionStore = useSessionStore()
  const userStore = useUserInfoStore()

  const preferList = ref([])

  // 获取收藏列表
  const getPreferList = async () => {
    try {
      const { data } = await axios({
        url: API.getPreferList,
        method: 'GET',
        params: {
          userId: 1
        }
      })

      preferList.value = data.data.preferList.map(ele => {
        const length = getTextWidth(ele.content, { fontSize: '14px' })
        // console.log(length)
        const content = length > 2800 ? ele.content.slice(0, 140) + '...' : ele.content

        return {
          ...ele,
          content
        }
      })
    } catch (error) {
      throw new Error(error)
    }
  }

  const detailChats = ref([])

  const getdetailChats = async (preferId) => {
    if (!preferId) return

    if (preferList.value.length === 0) await getPreferList()
    const [IdList] = preferList.value.filter(ele => ele.id === preferId)
    // console.log(IdList)

    try {
      const { data } = await axios({
        url: API.getdetailChats,
        method: 'GET',
        params: {
          chatIds: IdList.chat_id_list.join(',')
        }
      })

      if (data.success) {
        // console.log(data)
        detailChats.value = data.data.chatList
      }
    } catch (error) {
      throw new Error(error)
    }
  }

  // 取消收藏
  const deletePrefer = async (preferId) => {
    // console.log(preferId)
    router.push('/prefer')
    try {
      const { data } = await axios({
        url: API.deletePrefer,
        method: 'POST',
        data: {
          preferId: preferId
        }
      })

      if (data.success) {
        preferList.value = preferList.value.filter(ele => ele.id !== preferId)
        ElMessage({
          message: '删除成功',
          type: 'success'
        })
      }
    } catch (error) {
      throw new Error(error)
    }
  }

  return {
    preferList,
    getPreferList,
    detailChats,
    getdetailChats,
    deletePrefer
  }
})
