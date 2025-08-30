<script setup lang="ts">
import { useUserInfoStore } from '@/stores/user'
import { computed } from 'vue'

const userStore = useUserInfoStore()

defineProps({
  title: {
    type: String,
    default: '标题'
  },
  exitBottom: {
    type: Boolean,
    default: true
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emits = defineEmits(['confirm', 'closeDialog'])

const confirm = () => {
  emits('confirm')
}

const ableClose = computed(() => userStore.ableClose)

const closeDialog = () => {
  if (!ableClose.value) return
  emits('closeDialog')
  userStore.showDialog = ''
}

defineExpose({
  closeDialog
})
</script>

<template>
  <transition name="fade">
    <div v-if="visible">
      <div class="cust-dialog" v-bind="$attrs">
        <div class="top">
          <div class="title">{{ title }}</div>
          <div class="close-btn" @click="closeDialog" v-if="ableClose">
            <img src="../assets/svgs/close.svg" alt="" style="width: 16px; height: 16px;">
          </div>
        </div>

        <div class="content">
          <slot></slot>
        </div>

        <div class="bottom" v-if="exitBottom">
          <div class="cancel-btn btn" @click="closeDialog" v-if="ableClose">取消</div>
          <div class="confirm-btn btn" @click="confirm">确定</div>
        </div>
      </div>
    </div>
  </transition>
  <transition name="mask">
    <div class="mask" @click="closeDialog" v-if="visible"></div>
  </transition>
</template>

<style scoped lang="scss">
.cust-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2000;
  padding: 20px;
  background-color: var(--normal-bgc);
  border-radius: 10px;
  min-width: 300px;

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      color: var(--theme-color-1);
      font-size: 18px;
      font-weight: bold;
    }

    .close-btn {
      width: 20px;
      height: 20px;
      text-align: center;
    }
  }

  .bottom {
    display: flex;
    justify-content: flex-end;

    .btn {
      padding: 8px 15px;
      border-radius: 10px;
      background-color: var(--uesr-bubble-bgc);
      font-weight: bold;
      font-size: 15px;
      cursor: pointer;
    }

    .confirm-btn { 
      background-color: var(--theme-color-1);
      color: var(--normal-bgc);
      margin-left: 10px;
    }
  }

  @media (max-aspect-ratio: 1/1) {
    width: 75vw;
    overflow-x: auto;
  }
}

.mask {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1999;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

// 进入动画 - 活跃状态
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-leave-from {
  opacity: 1;
}

.fade-leave-to {
  opacity: 0;
}

.mask-enter-active,
.mask-leave-active {
  transition: all 0.2s ease;
}

.mask-enter-from {
  // opacity: 0;
  background-color: rgba(0, 0, 0, 0);
}

.mask-enter-to {
  background-color: rgba(0, 0, 0, 0.5);
}

.mask-leave-from {
  background-color: rgba(0, 0, 0, 0.5);
}

.mask-leave-to {
  background-color: rgba(0, 0, 0, 0);
}
</style>
