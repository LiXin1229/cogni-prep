<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { faChevronDown, faPaperPlane } from '@fortawesome/free-solid-svg-icons'

const emit = defineEmits(['toggleSidebar'])

const chatStore = useChatStore()

const sendBtnActive = ref(true)
const showAreaPopup = ref(false)

const togglePopup = (e) => {
  console.log(e.target.className.includes('toggle'))
  if (e.target.className.includes('toggle')) {
    console.log(showAreaPopup.value)
    showAreaPopup.value = !showAreaPopup.value
  } else {
    showAreaPopup.value = false
  }
}

onMounted(() => {
})

const quillRef = ref(null)

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

defineExpose({
  quillRef,
  inputHeight
})
</script>

<template>
  <div class="input-box">
    <div class="input-panel" :style="{height: `${inputHeight + 65}px`}">
      <!-- 功能按钮区 -->
      <div class="tool-btns">
        <div class="left">
          <cust-popup :position="{ bottom: '55px', left: '-15px' }">
            <div class="main-area toggle" @click.stop="togglePopup" >
              前端
              <img src="../../assets/svgs/arrow-main-color.svg" alt="" class="icon toggle">
            </div>

            <template #popup>
              <div class="area-list" v-show="showAreaPopup" v-click-outside.stop="togglePopup">
                <div class="item add-area">
                  <img src="../../assets/svgs/add.svg" alt="" style="width: 16px; height: 16px; margin: 0 5px 0 -8px;">
                  <div>添加领域</div>
                </div>
                <div class="item area-item">
                  <div>前端</div>
                  <img src="../../assets/svgs/gou.svg" alt="" class="icon" style="width: 16px; height: 16px;">
                </div>
              </div>
            </template>
          </cust-popup>

          <div class="surrounding-point">
            内容不限
            <img src="../../assets/svgs/arrow.svg" alt="" class="icon">
          </div>
        </div>

        <div class="right">
          <div class="nextquestion" @click="nextQuestion">
            下一题
          </div>
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
</template>

<style scoped lang="scss">
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
          color: var(--text-color-4);
        }

        .area-list {
          padding: 5px 10px;
          border-radius: 10px;
          border: 1px solid var(--light-border-color-2);
          background-color: var(--primary-bgc);
          white-space: nowrap;
          color: var(--text-color-2);

          .add-area {
            display: flex;
            justify-content: left;
            color: var(--light-blue-color);
          }

          .item {
            height: 40px;
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        }

        .icon {
          width: 12px;
          height: 12px;
          margin-left: 5px;
        }
      }

      .right {
        display: flex;
        justify-content: left;

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
</style>
