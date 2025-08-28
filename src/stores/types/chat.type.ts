export const MSG_TYPE = {
  'user': 0,        // 用户发言
  'question': 1,    // AI提问
  'evaluation': 2,  // AI评价
  'help': 3         // 获取帮助
}

export type ChatStatusType = 0 | 1 | 2 | 3

export interface ChatType {
  id: number
  sessionId: number
  messageType: ChatStatusType
  content: string
}

export interface TemTextType {
  id: string | number
  sessionId?: number
  messageType?: ChatStatusType
  content?: string
}

export type SendStateType = 'available' | 'loading' | 'streaming'

export interface ChatMapValueTpye {
  chatList: ChatType[]
  backupChatList: ChatType[]
  sendState: SendStateType
  nextState: boolean
  controller: AbortController | null
}

export const FUNC_TYPE = ['标准', '@回答思路 ', '@标准答案 ', '@思路+答案 ', '@自由对话 ', '@自定义问题 ']

export type FuncStatusType = 0 | 1 | 2 | 3 | 4 | 5

interface MainAreaType {
  areaId?: number | null
  name?: string
}

export interface StreamRequestConfigType {
  sessionId: number,
  mainArea: string,
  surroundingPoint: string,
  customContent?: string,
  answer?: string
  question?: string
  areaId?: number
  funcType?: FuncStatusType
}

export interface ChatInitRespType {
  chatId: number
  sessionId: number
  mainArea: string
  surroundingPoint: string
}
