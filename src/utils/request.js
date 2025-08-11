import axios from 'axios'
import { ElLoading } from 'element-plus'
import { useUserInfoStore } from '@/stores/user'
import router from '@/router'

const customConfig = {
  showLoading: false,
  showMessage: false,
  loading: null
}

let isTokenExpiredShown = false

// 创建axios实例
const instance = axios.create({
  timeout: 60000,
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
})

console.log('VITE_BASE_URL', import.meta.env.VITE_BASE_URL)

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const userStore = useUserInfoStore()
    // console.log('token', userStore.token)
    if (userStore.getToken) {
      config.headers.Authorization = `Bearer ${userStore.getToken}`
    }

    if (customConfig.showLoading) {
      // loading 动画
      const loading = ElLoading.service({
        lock: true,
        text: '加载中......',
        background: 'rgba(0, 0, 0, 0.7)'
      })
      customConfig.loading = loading
    }
    return config
  },
  (error) => {
    if (customConfig.loading) {
      customConfig.loading.close()
    }
    // 弹框提示错误
    ElMessage({
      message: '请求发送失败',
      type: 'error'
    })
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    if (customConfig.loading) {
      customConfig.loading.close()
    }
    if (response.data instanceof Blob) {
      return response
    }

    if (!response.data.success) {
      ElMessage({
        message: response.data.data.message,
        type: 'error'
      })
    }

    if (customConfig.showMessage && response.data.success) {
      ElMessage({
        message: response.data.data.message,
        type: 'success',
        duration: 2000
      })
    }
    return response.data
  },
  (error) => {
    if (customConfig.loading) {
      customConfig.loading.close()
    }

    console.log('error: ', error)

    // 超时处理
    if (error.code === 'ECONNABORTED') {
      ElMessage({
        message: '请求超时',
        type: 'info'
      })
    }

    // token失效
    if (error.response.status === 401) {
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
      const userStore = useUserStore()
      userStore.logout()

      router.replace({
        name: 'login'
      })
    }

    // 错误处理
    else if (error.response.status !== 401) {
      ElMessage({
        message: '请求失败',
        type: 'error'
      })
    }
    return Promise.reject(error)
  }
)

// 请求函数
const request = ({ url, params = {}, showLoading = false, showMessage = false, method = 'post', data = {}, responseType = 'json' }) => {
  customConfig.showLoading = showLoading
  customConfig.showMessage = showMessage

  const config = {
    url,
    method,
    params,
    data,
    responseType
  }

  return instance(config).catch((error) => {
    // ElMessage({
    //   message: error.message,
    //   type: 'error'
    // })
    return null
  })
}

export default request
