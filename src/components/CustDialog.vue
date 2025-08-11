<script setup>
import { useUserInfoStore } from '@/stores/user'
import { computed } from 'vue'

const userStore = useUserInfoStore()

const props = defineProps({
  title: {
    type: String,
    default: '标题'
  },
  exitBottom: {
    type: Boolean,
    default: true
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

  <div class="mask" @click="closeDialog"></div>
</template>

<style scoped lang="scss">
.cust-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 30;
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
}

.mask {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
