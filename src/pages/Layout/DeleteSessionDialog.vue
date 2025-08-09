<script setup>
import { ref } from 'vue'
import { useSessionStore } from '@/stores/session'

const sessionStore = useSessionStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  },
  selectSession: {
    type: Object,
    default: () => ({})
  }
})

const dialogRef = ref(null)

const confirm = async () => {
  sessionStore.deleteSession(props.selectSession)
  dialogRef.value.closeDialog()
}
</script>

<template>
  <div class="user-add-node" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="是否删除该会话" @confirm="confirm">
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
