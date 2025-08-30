import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserInfoStore } from './user'
import { useRouter } from 'vue-router'
import { getTextWidth } from '@/utils/getTextWidth'
import { formatDate } from '@/utils/formatDate'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import API from '@/utils/API.js'
import type { PreferItemType } from './types/prefer.type'
import type { ChatType } from './types/chat.type'

export const usePreferStore = defineStore('prefer', () => {
  const userStore = useUserInfoStore()
  const router = useRouter()

  const preferList = ref<PreferItemType[]>([])

  // 获取收藏列表
  const getPreferList = async () => {
    try {
      const res = await request<{ preferList: PreferItemType[] }>({
        url: API.getPreferList,
        method: 'GET',
        params: {
          userId: userStore.userInfo.userId
        }
      })
      // console.log(res)
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
    } catch (error: any) {
      console.log(error)
      // throw new Error(error)
    }
  }

  const detailChats = ref<ChatType[]>([])

  const getdetailChats = async (preferId: number) => {
    if (!preferId) return

    if (preferList.value.length === 0) await getPreferList()
    const [IdList] = preferList.value.filter(ele => ele.id === preferId)
    // console.log(IdList)

    try {
      const res = await request<{ chatList: ChatType[] }>({
        url: API.getdetailChats,
        method: 'GET',
        params: {
          chatIds: IdList.chat_id_list.join(',')
        }
      })

      detailChats.value = res.data.chatList
    } catch (error: any) {
      throw new Error(error)
    }
  }

  // 取消收藏
  const deletePrefer = async (preferId: number) => {
    // console.log(preferId)
    router.push('/prefer')
    try {
      await request({
        url: API.deletePrefer,
        method: 'POST',
        data: {
          preferId: preferId
        }
      })

      preferList.value = preferList.value.filter(ele => ele.id !== preferId)
      ElMessage({
        message: '删除成功',
        type: 'success'
      })
    } catch (error: any) {
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
