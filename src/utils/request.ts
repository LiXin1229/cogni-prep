import axios from 'axios'
import { useUserInfoStore } from '@/stores/user'
import { ElLoading, ElMessage } from 'element-plus'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { RequestOptions, CustomConfigType, ApiResponse } from './types/request.type'

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 60000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
})

const customConfig: CustomConfigType = {
  showLoading: false,
  showMessage: false,
  loading: null
}

let isTokenExpiredShown: boolean = false

instance.interceptors.request.use(
  (config) => {
    const userStore = useUserInfoStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    if (customConfig.showLoading) {
      customConfig.loading = ElLoading.service({
        lock: true,
        background: 'rgba(0, 0, 0, 0.3)'
      })
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (customConfig.loading) {
      customConfig.loading.close()
    }

    const data = response.data as ApiResponse

    if (!data.success) {
      ElMessage({
        message: data.data.message,
        type: 'info'
      })
      return Promise.reject(data.data.message)
    }

    if (customConfig.showMessage && data.success) {
      ElMessage({
        message: response.data.data.message,
        type: 'success',
        duration: 2000
      })
    }

    return response
  },
  (error) => {
    if (customConfig.loading) {
      customConfig.loading.close()
    }

    if (error.status === 401) {
      if (!isTokenExpiredShown) {
        ElMessage({
          message: 'token失效，请重新登录',
          type: 'info'
        })

        isTokenExpiredShown = true

        setTimeout(() => {
          isTokenExpiredShown = false
        }, 1000)
      }
      const userStore = useUserInfoStore()
      userStore.logout()
    }

    return Promise.reject(error)
  }
)

// 请求函数
const request = <T = any> ({
    url,
    params = {},
    showLoading = false,
    showMessage = false,
    method = 'post',
    data = {},
    responseType = 'json'
  }: RequestOptions): Promise<ApiResponse<T>> => {
  customConfig.showLoading = showLoading
  customConfig.showMessage = showMessage

  const config: AxiosRequestConfig = {
    url,
    method,
    params,
    data,
    responseType
  }

  return instance(config)
    .then(res => {
      return res.data
    })
    .catch(err => {
      throw Error(`请求失败 ${err}`)
    })
}

export default request
