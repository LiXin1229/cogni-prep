<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useUserInfoStore } from '@/stores/user'
import { useSessionStore } from '../../stores/session'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'

const emit = defineEmits(['toggleSidebar'])

const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserInfoStore()
const sessionStore = useSessionStore()

const sendState = computed(() => chatStore.sendState)
const nextState = computed(() => chatStore.nextState)

const showAreaPopup = ref(false)

const togglePopup = (e) => {
  // console.log(e)
  const svgs = ['svg', 'path', 'g', 'circle', 'rect']
  if (svgs.includes(e.target.tagName)) return
  if (e.target.className?.includes('toggleAreaPopup')) {
    showAreaPopup.value = !showAreaPopup.value
  } else {
    showAreaPopup.value = false
  }
}

// 打开添加领域输入框
const addArea = () => {
  userStore.showDialog = 'selectArea'
  showAreaPopup.value = false
}

// 当前领域
const mainArea = computed(() => sessionStore.mainArea)

// 选择领域
const setArea = async (areaId) => {
  await router.push({
    name: '每日刷题'
  })
  sessionStore.mainArea = userStore.areaList.find((item) => item.areaId === areaId)
  sessionStore.surroundingPoint = ''
  showAreaPopup.value = false
}

const quillRef = ref(null)

// 下一题
const nextQuestion = () => {
  chatStore.getAIquestion()
}

const submit = () => {
  // console.log('mainArea', sessionStore.mainArea)

  chatStore.submit(chatStore.customContent, chatStore.funcStatus)

  // 重置输入框
  quillRef.value?.resetForm(chatStore.customContent.length)
}

const handleEnter = (e) => {
  if (e.ctrlKey) {
    console.log('ctrl+enter')
    quillRef.value?.insertText('\n', chatStore.customContent.length)
  } else {
    if (sendState.value !== 'available' || chatStore.customContent.length === 0) return
    console.log('enter')
    submit()
  }
}

const abortStream = () => {
  chatStore.abortCurrentStream()
  ElMessage({
    message: '取消生成',
    type: 'info'
  })
}

// 围绕知识点
const surroundingPoint = computed(() => sessionStore.surroundingPoint || '内容不限')

// 设置知识点
const setPoint = () => {
  userStore.showDialog = 'selectPoint'
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
            <div class="main-area toggleAreaPopup" @click.stop="togglePopup" >
              {{ mainArea.name }}
              <img src="../../assets/svgs/arrow-main-color.svg" alt="" class="icon toggleAreaPopup">
            </div>

            <template #popup>
              <div class="area-list" v-show="showAreaPopup" v-click-outside.stop="togglePopup">
                <div class="item add-area" @click="addArea">
                  <img src="../../assets/svgs/add.svg" alt="" style="width: 16px; height: 16px; margin: 0 5px 0 -8px;">
                  <div>添加领域</div>
                </div>
                <div class="item area-item" v-for="area in userStore.areaList" :key="area.areaId" @click="setArea(area.areaId)">
                  <div style="margin-right: 10px;">{{ area.name }}</div>
                  <img src="../../assets/svgs/gou.svg" alt="" class="icon" style="width: 16px; height: 16px;" v-if="area.areaId === mainArea.areaId">
                </div>
              </div>
            </template>
          </cust-popup>

          <div class="surrounding-point" @click="setPoint">
            {{ surroundingPoint }}
            <!-- <img src="../../assets/svgs/arrow.svg" alt="" class="icon"> -->
          </div>
        </div>

        <div class="right">
          <div class="nextquestion" @click="nextQuestion" v-if="nextState">
            <img src="../../assets/svgs/next.svg" alt="" class="icon"></img>
            <div class="text">下一题</div>
          </div>
          <div class="nextquestion locked" v-else>
            <img src="../../assets/svgs/next-locked.svg" alt="" class="icon"></img>
            <div class="text">下一题</div>
          </div>
          <div :class="['send-btn', 'active']" @click.stop="submit" v-if="sendState === 'available' && chatStore.customContent.length">
            <font-awesome-icon :icon="faPaperPlane" class="icon" />
          </div>
          <div class="abort-btn" v-if="sendState === 'streaming'" @click.stop="abortStream">
            <div class="rect"></div>
          </div>
          <div :class="['send-btn']" v-else-if="sendState === 'loading' || chatStore.customContent.length === 0">
            <font-awesome-icon :icon="faPaperPlane" class="icon" />
          </div>
        </div>
      </div>

      <!-- 文字输入区 -->
      <div class="text-area">
        <cust-textarea
          class="quill"
          ref="quillRef"
          v-model="chatStore.customContent"
          v-model:height="textareaHeight"
          @keydown.enter.prevent.stop="handleEnter"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.input-box {
  .input-panel {
    width: calc(75vw - 300px);
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
          margin-right: 15px;
          cursor: pointer;
        }

        .surrounding-point {
          padding: 5px 10px;
          border: 1px solid var(--light-border-color-1);
          border-radius: 10px;
          color: var(--text-color-4);
          cursor: pointer;

          &:hover {
            background-color: var(--uesr-bubble-bgc);
          }
        }

        .area-list {
          padding: 5px 10px;
          border-radius: 10px;
          border: 1px solid var(--light-border-color-2);
          background-color: var(--primary-bgc);
          white-space: nowrap;
          color: var(--text-color-2);

          .item {
            height: 40px;
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
          }

          .add-area {
            display: flex;
            justify-content: left;
            color: var(--light-blue-color);
            cursor: pointer;
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
        align-items: center;

        .nextquestion {
          margin-right: 20px;
          font-size: 15px;
          color: var(--main-color);
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px 2px 6px;
          border: 1.5px solid var(--main-color);
          border-radius: 50px;
          cursor: pointer;

          .icon {
            width: 17px;
            height: 17px;
          }

          .text {
            transform: translateY(-5%);
          }
        }

        .locked {
          color: var(--btn-locked);
          border-color: var(--btn-locked);
        }

        .send-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--btn-locked);
          position: relative;
          cursor: pointer;

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

        .abort-btn {
          width: 26px;
          height: 26px;
          margin-left: 6px;
          border-radius: 50%;
          border: 2px solid var(--theme-color-2);
          display: flex;
          justify-content: center;
          align-items: center;

          .rect {
            width: 10px;
            height: 10px;
            background-color: var(--theme-color-2);
            border-radius: 3px;
          }
        }
      }
    }

    .text-area {
      padding: 0 15px;
    }
  }
}
</style>
