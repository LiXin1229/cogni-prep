<script setup>
import InputBox from './InputBox.vue'
import { faAngleDown, faCheck } from '@fortawesome/free-solid-svg-icons'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useUserInfoStore } from '@/stores/user'
import { useSessionStore } from '@/stores/session'
import { parseMarkdown } from '@/utils/markdown'
import { stickBlockTop } from '@/utils/stickBlockTop'
import { useThrottle } from '@/utils/useThrottle'

const { throttle } = useThrottle()
const userStore = useUserInfoStore()
const sessionStore = useSessionStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

const chatStore = useChatStore()

const chatList = computed(() => chatStore.displayChat)

onMounted(() => {
  chatStore.initDisplayChat()
})

const sendState = computed(() => chatStore.sendState)

const inputRef = ref(null)

const quillRef = computed(() => inputRef.value.quillRef)
const inputHeight = computed(() => inputRef.value?.inputHeight)

const funcBtn = (type, data) => {
  // 先清除上个@的内容
  if (chatStore.funcStatus > 0) {
    quillRef.value?.deleteText(chatStore.funcType[chatStore.funcStatus].length)
    chatStore.customContent = chatStore.customContent.slice(chatStore.funcType[chatStore.funcStatus].length)
  }
  
  // 设置当前功能
  chatStore.funcStatus = type

  // 将功能显示到输入框开头
  quillRef.value?.insertText(chatStore.funcType[type])
  chatStore.customContent = chatStore.funcType[type] + chatStore.customContent
  quillRef.value?.focus()

  chatStore.selectQuestion = data.content
}

// 复制按钮
const handleCopy = (e, data) => {
  // console.log(e.target.closest('.copy-btn'))
  const copyBtn = e.target.closest('.copy-btn')
  if (!copyBtn) return

  const preElement = copyBtn.closest('pre')
  const codeElement = preElement?.querySelector('code')

  const imgElement = copyBtn.querySelector('img.icon')

  if (codeElement) {
    writeInClipboard(codeElement.textContent, imgElement)
  } else {
    writeInClipboard(data.content, imgElement)
  }
}

// 写入剪贴板
const writeInClipboard = (text, imgElement) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      if (!imgElement) return

      const originalSrc = imgElement.src

      // 切换为"已复制"图片
      imgElement.src = '/src/assets/svgs/gou.svg'

      setTimeout(() => {
        imgElement.src = originalSrc
        imgElement.classList.remove('copied-animation')
      }, 5000)
    })
    .catch((err) => {
      console.log(err)
      ElMessage({
        message: '复制失败',
        type: 'info'
      })
    })
}

// 删除对话
const deleteChat = (chat) => {
  chatStore.selectChat = chat
  userStore.showDialog = 'deleteChat'
}

// 切换收藏状态
const togglePreferState = () => {
  chatStore.preferList.clear()
  chatStore.isChosePrefer = !chatStore.isChosePrefer
}

// 选中对话
const toggleChecked = (chat) => { 
  console.log(chat.id)
  if (chatStore.preferList.has(chat.id)) {
    chatStore.preferList.delete(chat.id)
  } else {
    chatStore.preferList.add(chat.id)
  }
}

// 全选/全不选
const checkAll = () => { 
  if (chatStore.isChoseAll) {
    // 全选
    chatStore.preferList.clear()
  } else {
    chatStore.displayChat.forEach(chat => {
      chatStore.preferList.add(chat.id)
    })
  }
}

// 自动滚动
const isAutoToBottom = ref(true)
const SCROLL_THRESHOLD = 60

const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.value

  const distanceFromBottom = scrollHeight - scrollTop - clientHeight

  // 如果向上滚动超过阈值，取消自动滚动
  if (distanceFromBottom > SCROLL_THRESHOLD) {
    isAutoToBottom.value = false
  } 
  // 如果向下滚动到接近底部（距离小于阈值），开启自动滚动
  else if (distanceFromBottom <= SCROLL_THRESHOLD && !isAutoToBottom.value) {
    isAutoToBottom.value = true
  }
}

// 滚动到底部
const scrollToBottom = async () => { 
  await nextTick()
  if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
}

const throttleToBottom = throttle(() => {
  scrollToBottom()
}, 100, { leading: true, trailing: false })

watch(() => chatStore.displayChat[chatStore.displayChat.length - 1]?.content, () => {
  if (isAutoToBottom.value) {
    throttleToBottom()
  }
})

watch(() => chatStore.sessionId, () => {
  throttleToBottom()
})

onMounted(async () => {
  await nextTick()
  scrollToBottom()
})

// 代码块吸顶
const scrollRef = ref(null)
onMounted(() => {
  scrollRef.value.addEventListener('scroll', stickBlockTop)
  stickBlockTop()

  chatStore.registerCallback('scrollToBottom', scrollToBottom)
})
// 卸载时移除滚动监听
onUnmounted(() => {
  if (scrollRef.value) scrollRef.value.removeEventListener('scroll', stickBlockTop)
  chatStore.abortCurrentStream()

  chatStore.registerCallback({})
})

const title = computed(() => {
  const _title = sessionStore.currSession?.title.split('- ')[1] || ''
  if (/^\d{1,2}\/\d{1,2}\/\d{1,2}$/.test(_title) || _title == '') return '每日刷题'
  return _title
})
</script>

<template>
  <div class="chat-view">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggle-sidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">
        <img src="../../assets/svgs/hide-sidebar.svg" alt="" class="icon">
      </div>
      <div>
        <div class="title">{{ title }}</div>
        <div class="tip">内容由 <span style="font-style: italic;">DeepSeek-V3</span> 生成</div>
      </div>
    </div>

    <!-- 滚动聊天记录区 -->
    <div class="scroll-view" ref="scrollRef" :style="{height: `calc(100vh - 50px - 172px - ${inputHeight}px + 65px)`}" @scroll="handleScroll">
      <!-- 吸底按钮 -->
      <div class="scroll-to-bottom" v-if="!isAutoToBottom && sendState === 'streaming'" @click="scrollToBottom">
        <!-- 原有的向下箭头 -->
        <font-awesome-icon :icon="faAngleDown" class="icon" />
      </div>
      
      <!-- 旋转圆环SVG -->
      <svg width="40" height="40" viewBox="0 0 40 40" class="rotate-ring" @click="scrollToBottom" v-if="!isAutoToBottom && sendState === 'streaming'">
        <defs>
          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="#f5f5f5"/>
            <stop offset="80%"  stop-color="#f5f5f5"/>
            <stop offset="100%" stop-color="#7fabfe"/>
          </linearGradient>
        </defs>

        <circle cx="20" cy="20" r="18" fill="none" stroke="url(#blueGradient)" stroke-width="2"/>
      </svg>

      <div class="scroll-to-bottom normal" v-else-if="!isAutoToBottom" @click="scrollToBottom">
        <font-awesome-icon :icon="faAngleDown" class="icon" />
      </div>

      <!-- 对话内容区 -->
      <div :class="['text-view', chatStore.isChosePrefer && 'chose-prefer']">
        <div class="blank" v-if="!chatList.length">
          <blank />
        </div>

        <!-- 每条聊天记录包裹层 -->
        <template v-for="chat in chatList" :key="chat.id">
          <div class="left" @click="() => toggleChecked(chat)" v-if="chatStore.isChosePrefer">
            <div :class="['check-box', chatStore.preferList.has(chat.id) && 'checked']">
              <font-awesome-icon :icon="faCheck" class="icon" />
            </div>
          </div>

          <div @click="() => toggleChecked(chat)">
              <!-- 用户发言wrapper -->
            <div class="text-wrapper user-wrapper" v-if="chat.messageType === 0">
              <div class="user" v-if="chat.messageType === 0">{{ chat.content }}</div>

              <!-- 功能按钮 -->
              <div class="functionList user-right">
                <!-- 复制按钮 -->
                <div class="btn copy copy-btn" @click="(e) => handleCopy(e, chat)">
                  <img src="../../assets/svgs/copy.svg" alt="" class="icon">
                </div>
                <!-- 收藏按钮 -->
                <div class="btn prefer prefer-btn" @click="togglePreferState">
                  <img src="../../assets/svgs/tag.svg" alt="" class="icon">
                </div>
                <!-- 其他按钮 -->
                <el-dropdown placement="right">
                  <div class="btn other">
                    <img src="../../assets/svgs/ellipsis-bold.svg" alt="" class="icon">
                  </div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="funcBtn(4, chat)">
                        自由对话
                      </el-dropdown-item>
                      <el-dropdown-item @click="deleteChat(chat)">
                        删除对话
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>

            <!-- 助手发言wrapper -->
            <div class="text-wrapper assistant-wrapper" v-else>
              <!-- 问题 -->
              <template v-if="chat.messageType === 1">
                <div class="assistant-question">{{ chat.content }}</div>
              </template>

              <template v-else>
                <div class="assistant-help" v-html="parseMarkdown(chat.content)" @click="handleCopy"></div>
              </template>

              <!-- 功能按钮 -->
              <div :class="['functionList', (chat.id === chatStore.lastMessage.id && sendState === 'available') && 'visiable', sendState !== 'available' && 'hidden']">
                <!-- 复制按钮 -->
                <div class="btn copy copy-btn" @click="(e) => handleCopy(e, chat)">
                  <img src="../../assets/svgs/copy.svg" alt="" class="icon">
                </div>
                <!-- 收藏按钮 -->
                <div class="btn prefer prefer-btn" @click="togglePreferState">
                  <img src="../../assets/svgs/tag.svg" alt="" class="icon">
                </div>
                <!-- 帮助按钮 -->
                <el-dropdown placement="right" v-if="chat.messageType === 1">
                  <div class="btn help">
                    <img src="../../assets/svgs/help.svg" alt="" class="icon">
                  </div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="funcBtn(1, chat)">
                        回答思路
                      </el-dropdown-item>
                      <el-dropdown-item @click="funcBtn(2, chat)">
                        标准答案
                      </el-dropdown-item>
                      <el-dropdown-item @click="funcBtn(3, chat)">
                        思路+答案
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <!-- 其他按钮 -->
                <el-dropdown placement="right">
                  <div class="btn other">
                    <img src="../../assets/svgs/ellipsis-bold.svg" alt="" class="icon">
                  </div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="funcBtn(4, chat)">
                        自由对话
                      </el-dropdown-item>
                      <el-dropdown-item @click="deleteChat(chat)">
                        删除该对话
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </template>

        <!-- 等待响应的图标 -->
        <div class="loading-icon" v-show="sendState === 'loading'">
          <div class="left-ball"></div>
          <div class="right-ball"></div>
        </div>
      </div>
    </div>

    <!-- 输入框区 -->
    <input-box ref="inputRef" v-if="!chatStore.isChosePrefer" />
    <div class="prefer-bottom" v-else>
      <div class="left">
        <div class="check-all-box" @click="checkAll">
          <div :class="['check-box', chatStore.isChoseAll && 'checked']">
            <font-awesome-icon :icon="faCheck" class="icon" />
          </div>
          全选
        </div>
      </div>
      <div class="middle" @click="togglePreferState">
        取消
      </div>
      <div class="right" @click="chatStore.submitPrefers">
        收藏
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/mixin.scss" as *;
@use "@/styles/loading.scss" as *;

.chat-view {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);
  position: relative;

  .top {
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 20px;

    .title {
      font-weight: 600;
      color: var(--theme-color-1);
    }

    .tip {
      font-size: 12px;
      color: var(--text-color-4);
    }

    .toggle-sidebar {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 24px;
      height: 24px;
      border-radius: 5px;
      margin-right: 15px;

      .icon {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background-color: var(--btn-hover);
      }
    }
  }

  .scroll-view {
    background-color: var(--primary-bgc);
    overflow-y: auto;
    padding-bottom: 30px;

    mask-image: linear-gradient(
      to top,
      transparent,
      #fff 30px,
      #fff 100%
    );

    .scroll-to-bottom {
      background-color: var(--normal-bgc);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      position: fixed;
      bottom: 220px;
      left: calc(50% + 110px);

      .icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -55%);
        color: var(--text-color-3);
      }

      &:hover {
        box-shadow: 0px 3px 10px 1px var(--box-shadow-color);
      }
    }

    .scroll-to-bottom.normal {
      border: 1px solid var(--light-border-color-1);
    }

    .rotate-ring {
      animation: rotate 2s linear infinite;
      transform-origin: center;
      position: fixed;
      bottom: 219px;
      left: calc(50% + 109px);
    }

    .text-view {
      width: calc(75vw - 300px);
      margin: 0 auto;

      .text-wrapper {
        margin-bottom: 10px;
        color: var(--text-color-0);
        line-height: 1.5;

        .user {
          display: inline-block;
          background-color: var(--uesr-bubble-bgc);
          padding: 10px 15px;
          border-radius: 10px;
        }

        &:hover {
          .functionList {
            visibility: visible;
          }
        }

        .functionList {
          display: flex;
          justify-content: left;
          margin: 10px 0;
          height: 30px;
          visibility: hidden;

          .btn {
            width: 24px;
            height: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 5px;
            margin-right: 10px;

            &:hover {
              background-color: var(--btn-hover);
            }
          }

          .icon {
            width: 16px;
            height: 16px;
          }
        }

        .functionList.user-right {
          justify-content: right;
        }

        .functionList.visiable {
          visibility: visible;
        }

        .functionList.hidden {
          visibility: hidden;
        }
      }

      :deep(.text-wrapper.assistant-wrapper ) {
        line-height: 1.9;
        // font-size: 0.9em;

        @include code-box;

        .assistant-question {
          color: var(--theme-color-1);
          font-size: 20px;
          font-weight: bold;
        }
      }

      .text-wrapper.user-wrapper {
        text-align: end;
      }

      .loading-icon {
        display: flex;
        justify-content: space-between;
        width: 20px;
        height: 15px;

        @include loading;
      }
    }

    .chose-prefer {
      display: grid;
      grid-template-columns: 35px 1fr;

      .left {
        height: calc(100% - 10px);
        display: flex;
        align-items: center;
        background-color: var(--selected-chat);
      }

      .text-wrapper {
        padding: 20px;
        background-color: var(--selected-chat);

        .functionList {
          display: none;
        }
      }
    }
  }

  .prefer-bottom {
    display: flex;
    justify-content: space-around;
    align-items: center;
    height: 80px;
    width: calc(75vw - 300px);
    background-color: #fff;
    border: 1px solid var(--light-border-color-1);
    margin: 0 auto;
    border-radius: 20px;
    box-shadow: 0 2px 8px var(--box-shadow-color);
    padding: 5px 0;

    .check-all-box {
      display: flex;
      justify-content: left;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-color-3);
      cursor: pointer;
    }

    .middle { 
      font-weight: 500;
      cursor: pointer;
    }

    .right {
      background-color: var(--main-color);
      padding: 6px 12px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 15px;
      color: var(--normal-bgc);
      cursor: pointer;
    }
  }

  .check-box {
    width: 18px;
    height: 18px;
    border: 1.5px solid var(--border-color-1);
    border-radius: 5px;
    position: relative;
    margin-left: 10px;

    .icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -45%);
      width: 13px;
      height: 13px;
      color: var(--normal-bgc);
    }

    &:hover {
      border: 1.5px solid var(--main-color);
    }
  }

  .check-box.checked {
    background-color: var(--main-color);
    border: 1.5px solid var(--main-color);
  }
}
</style>
