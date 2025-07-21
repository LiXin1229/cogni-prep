<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { faChevronDown, faPaperPlane } from '@fortawesome/free-solid-svg-icons'

const chatStore = useChatStore()

const sendBtnActive = ref(true)

const chatList = computed(() => chatStore.displayChat)

onMounted(() => {
  chatStore.initDisplayChat()
})

const submit = () => {
  chatStore.submit()
}

const inputHeight = ref(60)
const textareaHeight = ref(null)

watch(() => textareaHeight.value, (newHeight, oldHeight) => {
  if (newHeight === oldHeight) return
  // console.log(newHeight)

  if (newHeight >= 210) return

  inputHeight.value = newHeight
})
</script>

<template>
  <div class="chat-view">
  
    <!-- 顶部区 -->
    <div class="top"></div>

    <!-- 滚动聊天记录区 -->
    <div class="scroll-view" :style="{height: `calc(100vh - 50px - 172px - ${inputHeight}px + 64px)`}">
      <!-- 对话内容区 -->
      <div class="text-view">
        <!-- 每条聊天记录包裹层 -->
        <div :class="['text-wrapper', chat.messageType === 0 ? 'system-wrapper' : 'user-wrapper']" v-for="chat in chatList" :key="chat.id">
          <div :class="[chat.messageType === 0 ? 'system' : 'user']">{{ chat.content }}</div>
        </div>
      </div>
    </div>

    <!-- 输入框区 -->
    <div class="input-box">
      <div class="input-panel" :style="{height: `${inputHeight + 64}px`}">

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
            v-model="chatStore.customContent"
            v-model:height="textareaHeight"
            ref="textareaRef"
            placeholder="描述"
            resize="none"
            type="textarea"
            :input-style="`height: ${inputHeight}px; box-shadow: none; color: var(--theme-font-color1); font-size: 16px;`"
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
        .user {
          display: inline-block;
          background-color: var(--uesr-bubble-bgc);
          padding: 10px 15px;
          border-radius: 10px;
        }
      }

      .text-wrapper.user-wrapper {
        text-align: end;
        color: var(--text-color-1);
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
            border: 1px solid var(--light-main-color);
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
