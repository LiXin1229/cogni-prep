<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { usePreferStore } from '@/stores/prefer'
import { computed, onMounted } from 'vue'
import { parseMarkdown } from '@/utils/markdown'
import type { ChatType } from '@/stores/types/chat.type'
import { writeInClipboard } from '@/utils/clipboard'

const router = useRouter()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

const route = useRoute()
const preferStore = usePreferStore()

const preferId = computed(() => +route.params.preferId)

onMounted(() => {
  preferStore.getdetailChats(preferId.value)
})

// 复制按钮
const handleCopy = (e: MouseEvent, data?: ChatType) => {
  // console.log(e.target.closest('.copy-btn'))
  const copyBtn = (e.target as HTMLElement).closest('.copy-btn')
  if (!copyBtn) return

  const preElement = copyBtn.closest('pre')
  const codeElement = preElement?.querySelector('code')

  const imgElement = copyBtn.querySelector('img.icon') as HTMLImageElement

  if (codeElement) {
    writeInClipboard(codeElement.textContent as string, imgElement)
  } else if (data) {
    writeInClipboard(data.content, imgElement)
  }
}
</script>

<template>
  <div class="prefer-detail">
    <!-- 顶部区 -->
    <div class="top">
      <div v-show="isSidebarFolded" class="toggle-sidebar" @click="emit('toggleSidebar')">
        <img src="../../assets/svgs/hide-sidebar.svg" alt="" class="icon">
      </div>
      <div class="right">
        <div class="back-btn" @click="router.push('/prefer')">
          <img src="../../assets/svgs/left-arrow.svg" alt="" class="icon">
        </div>
        <div class="delete-prefer" @click="preferStore.deletePrefer(preferId)">
          <img src="../../assets/svgs/bookmark.svg" alt="" class="icon">
          取消收藏
        </div>
      </div>
    </div>

    <!-- 滚动聊天记录区 -->
    <div ref="scrollRef" class="scroll-view">
      <!-- 对话内容区 -->
      <div :class="['text-view']">
        <!-- 每条聊天记录包裹层 -->
        <template v-for="chat in preferStore.detailChats" :key="chat.id">
          <div>
              <!-- 用户发言wrapper -->
            <div v-if="chat.messageType === 0" class="text-wrapper user-wrapper">
              <div v-if="chat.messageType === 0" class="user">{{ chat.content }}</div>
            </div>

            <!-- 助手发言wrapper -->
            <div v-else class="text-wrapper assistant-wrapper">
              <!-- 问题 -->
              <template v-if="chat.messageType === 1">
                <div class="assistant-question">{{ chat.content }}</div>
              </template>

              <template v-else>
                <div class="assistant-help" @click="handleCopy" v-html="parseMarkdown(chat.content)"></div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/mixin.scss" as *;

.prefer-detail {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);
  position: relative;

  .top {
    height: 50px;
    display: flex;
    justify-content: left;
    align-items: center;
    padding: 0 20px;

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

    .right {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;

      .back-btn {
        border-radius: 10px;
        width: 30px;
        height: 30px;
        position: relative;

        .icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-55%, -50%);
          width: 24px;
          height: 24px;
        }

        &:hover {
          background-color: var(--btn-hover);
        }
      }

      .delete-prefer {
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;

        .icon {
          width: 18px;
        }
      }
    }
  }

  .scroll-view {
    background-color: var(--primary-bgc);
    height: calc(100% - 50px);
    overflow-y: auto;
    padding-bottom: 30px;

    .text-view {
      width: calc(75vw - 300px);
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

      :deep(.text-wrapper.assistant-wrapper) {
        line-height: 1.9;

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
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .scroll-view {
      padding: 0 10px;

      .text-view {
        width: 100%;
      }
    }
  }
}
</style>
