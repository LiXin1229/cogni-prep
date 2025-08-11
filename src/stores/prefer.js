import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserInfoStore } from './user'
import { useRouter } from 'vue-router'
import { getTextWidth } from '@/utils/getTextWidth.js'
import { formatDate } from '@/utils/formatDate.js'
import request from '@/utils/request'
import API from '@/utils/API.js'

export const usePreferStore = defineStore('prefer', () => {
  const userStore = useUserInfoStore()
  const router = useRouter()

  const preferList = ref([])

  // 获取收藏列表
  const getPreferList = async () => {
    try {
      const res = await request({
        url: API.getPreferList,
        method: 'GET',
        params: {
          userId: userStore.userInfo.userId
        }
      })

      preferList.value = res.data.preferList
        .map(ele => {
          const length = getTextWidth(ele.content, { fontSize: '14px' })
          // console.log(length)
          const content = length > 2800 ? ele.content.slice(0, 140) + '...' : ele.content

          return {
            ...ele,
            content,
            date: formatDate(ele.created_at, 'YYYY-MM-DD')
          }
        })
        .sort((a, b) => b.id - a.id)
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
      const res = await request({
        url: API.getdetailChats,
        method: 'GET',
        params: {
          chatIds: IdList.chat_id_list.join(',')
        }
      })

      if (res.success) {
        // console.log(data)
        detailChats.value = res.data.chatList
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
      const res = await request({
        url: API.deletePrefer,
        method: 'POST',
        data: {
          preferId: preferId
        }
      })

      if (res.success) {
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
