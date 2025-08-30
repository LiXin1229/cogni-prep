import type { AxiosRequestConfig } from 'axios'
import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading'

export interface RequestOptions {
  // 请求的接口地址
  url: string
  // 请求的参数
  params?: any
  // 请求的方法
  method?: AxiosRequestConfig['method']
  // 请求的数据
  data?: any
  // 响应的数据类型
  responseType?: AxiosRequestConfig['responseType']
  // 是否显示加载中
  showLoading?: boolean
  // 是否显示提示信息
  showMessage?: boolean
}

export interface CustomConfigType {
  // 是否显示加载中
  showLoading?: boolean
  // 是否显示提示信息
  showMessage?: boolean
  loading?: LoadingInstance | null
}

export interface ApiResponse<T = any> {
  code: number
  success: boolean
  data: T
}
