<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { faChevronDown, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { parseMarkdown } from '@/utils/markdown'
// import hljs from 'highlight.js'
// import 'highlight.js/styles/github-dark.css' // 导入代码高亮样式

const emit = defineEmits(['toggleSidebar'])

const chatStore = useChatStore()

const sendBtnActive = ref(true)

const chatList = computed(() => chatStore.displayChat)

onMounted(() => {
  chatStore.initDisplayChat()
  // console.log('displayChat', chatStore.displayChat)
})

const quillRef = ref(null)

const funcBtn = (type) => {
  // 不能重复按相同按钮
  if (chatStore.funcStatus === type) return

  // 先清除上个@的内容
  if (chatStore.funcStatus > 0) {
    quillRef.value?.deleteText(chatStore.funcType[chatStore.funcStatus].length)
  }
  
  // 设置当前功能
  chatStore.funcStatus = type

  // 将功能显示到输入框开头
  quillRef.value?.insertText(chatStore.funcType[type])
  chatStore.customContent = chatStore.funcType[type] + chatStore.customContent
}

// 下一题
const nextQuestion = () => {
  chatStore.getAIquestion()
}

const submit = () => {
  chatStore.submit()

  // 重置输入框
  quillRef.value?.resetForm(chatStore.customContent.length)
}

const inputHeight = ref(52)
const textareaHeight = ref(null)

watch(() => textareaHeight.value, (newHeight, oldHeight) => {
  if (newHeight === oldHeight) return
  // console.log(newHeight)

  inputHeight.value = Math.min(Math.max(newHeight, 52), 210)
})

</script>

<template>
  <div class="chat-view">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggleSidebar" @click="emit('toggleSidebar')">打开侧栏</div>
    </div>

    <!-- 滚动聊天记录区 -->
    <div class="scroll-view" :style="{height: `calc(100vh - 50px - 172px - ${inputHeight}px + 65px)`}">
      <!-- 对话内容区 -->
      <div class="text-view">

        <!-- 每条聊天记录包裹层 -->
        <template v-for="chat in chatList" :key="chat.id">
          <!-- 用户发言wrapper -->
          <div class="text-wrapper user-wrapper" v-if="chat.messageType === 0">
            <div class="user" v-if="chat.messageType === 0">{{ chat.content }}</div>

            <!-- 功能按键 -->
            
          </div>

          <!-- 助手发言wrapper -->
          <div class="text-wrapper assistant-wrapper" v-else>
            <div class="assistant" v-html="parseMarkdown(chat.content)"></div>

            <!-- 功能按钮 -->
            <div class="functionList">
              <!-- 帮助按钮 -->
              <el-dropdown placement="right" v-if="chat.messageType === 1">
                <div class="btn help">
                  <img src="../../assets/svgs/help.svg" alt="" class="icon">
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="funcBtn(1)">
                      回答模板
                    </el-dropdown-item>
                    <el-dropdown-item @click="funcBtn(2)">
                      标准答案
                    </el-dropdown-item>
                    <el-dropdown-item @click="funcBtn(3)">
                      模板+答案
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 输入框区 -->
    <div class="input-box">
      <div class="input-panel" :style="{height: `${inputHeight + 65}px`}">

        <!-- 功能按钮区 -->
        <div class="tool-btns">
          <div class="left">
            <div class="main-area">
              前端
              <font-awesome-icon :icon="faChevronDown" />
            </div>
            <div class="surrounding-point">
              知识点
              <font-awesome-icon :icon="faChevronDown" />
            </div>
          </div>
          <div class="right">
            <div :class="['send-btn', sendBtnActive && 'active']" @click="submit">
              <font-awesome-icon :icon="faPaperPlane" class="icon" />
            </div>
          </div>
        </div>

        <!-- 文字输入区 -->
        <div class="text-area">
          <cust-textarea
            ref="quillRef"
            v-model="chatStore.customContent"
            v-model:height="textareaHeight"
            :placeholder="chatStore.chatStatus ? '开始提问' : '回答问题'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-view {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);

  .top {
    height: 50px;

    .toggleSidebar {
      position: absolute;
      left: 10px;
      top: 10px;
    }
  }

  .scroll-view {
    // height: calc(100vh - 50px - 172px);
    // background-color: bisque;
    background-color: var(--primary-bgc);
    overflow-y: auto;
    padding-bottom: 50px;

    mask-image: linear-gradient(
      to top,
      transparent,
      #fff 30px,
      #fff 100%
    );

    .text-view {
      width: 960px;
      margin: 0 auto;

      .text-wrapper {
        margin-bottom: 30px;
        color: var(--text-color-0);
        line-height: 1.5;

        .user {
          display: inline-block;
          background-color: var(--uesr-bubble-bgc);
          padding: 10px 15px;
          border-radius: 10px;
        }

        .functionList {
          display: flex;
          justify-content: left;
          margin: 10px 0;

          .btn {
            width: 24px;
            height: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 5px;

            &:hover {
              background-color: var(--uesr-bubble-bgc);
            }
          }

          .icon {
            width: 16px;
            height: 16px;
          }
        }
      }

      .assistant-wrapper {
        line-height: 2;
      }

      .text-wrapper.user-wrapper {
        text-align: end;
      }
    }
  }

  .input-box {
    // height: 161px;

    .input-panel {
      width: 960px;
      // height: 125px;
      background-color: #fff;
      border: 1px solid var(--light-border-color-1);
      margin: 0 auto;
      border-radius: 20px;
      box-shadow: 0 2px 8px var(--box-shadow-color);
      padding: 5px 0;

      .tool-btns {
        height: 50px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 15px;

        .left {
          display: flex;
          justify-content: left;
          font-size: 15px;

          .main-area {
            background-color: var(--main-bgc);
            padding: 5px 10px;
            border: 1px solid var(--light-blue-color);
            color: var(--main-color);
            border-radius: 10px;
            margin-right: 10px;
          }

          .surrounding-point {
            padding: 5px 10px;
            border: 1px solid var(--light-border-color-1);
            border-radius: 10px;
            color: var(--text-color-2)
          }
        }

        .right {
          .send-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: var(--btn-locked);
            position: relative;

            .icon {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-60%, -60%);
              color: #fff;
            }
          }

          .active {
            background-color: var(--main-color);
          }
        }
      }

      .text-area {
        padding: 0 15px;
      }
    }
  }
}
</style>
