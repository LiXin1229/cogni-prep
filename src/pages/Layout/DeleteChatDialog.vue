<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref<any>(null)

const confirm = async () => {
  chatStore.deleteChat()
  
  dialogRef.value.closeDialog()
}
</script>

<template>
  <div class="user-add-node">
    <cust-dialog ref="dialogRef" title="是否删除该条消息" @confirm="confirm" :visible="showDialog">
      <div class="content">
        删除后，聊天记录不可恢复。
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
