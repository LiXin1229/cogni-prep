<script setup>
import InputBox from './InputBox.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { parseMarkdown } from '@/utils/markdown'

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

const inputRef = ref(null)

const quillRef = computed(() => inputRef.value.quillRef)
const inputHeight = computed(() => inputRef.value?.inputHeight)

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

</script>

<template>
  <div class="chat-view">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggleSidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">打开侧栏</div>
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
                      回答思路
                    </el-dropdown-item>
                    <el-dropdown-item @click="funcBtn(2)">
                      标准答案
                    </el-dropdown-item>
                    <el-dropdown-item @click="funcBtn(3)">
                      思路+答案
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
    <input-box ref="inputRef" />
  </div>
</template>

<style scoped lang="scss">
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

    .toggleSidebar {
      position: absolute;
      left: 10px;
      top: 10px;
    }
  }

  .scroll-view {
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

      .text-wrapper.assistant-wrapper {
        line-height: 2;
        font-size: 1.1em;
      }

      .text-wrapper.user-wrapper {
        text-align: end;
      }
    }
  }
}
</style>
