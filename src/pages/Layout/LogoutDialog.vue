<script setup lang="ts">
import { ref } from 'vue'
import { useUserInfoStore } from '@/stores/user'

const userStore = useUserInfoStore()

defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref<any>(null)

const confirm = async () => {
  userStore.logout()
  dialogRef.value.closeDialog()
}
</script>

<template>
  <div class="user-add-node" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="确认退出登录" @confirm="confirm">
      <div class="content">
        退出登录不会丢失任何数据，你仍可以登录此账号。
      </div>
    </cust-dialog>
  </div>
</template>

<style scoped lang="scss">
.user-add-node {
  .content {
    padding: 15px 0;
  }
}
</style>
