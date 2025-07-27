<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const sessionStore = useSessionStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref(null)

const custom = ref('')

const confirm = async () => {
  if (!custom.value) {
    ElMessage({
      message: '请选择问题范围',
      type: 'info'
    })
    return
  }

  dialogRef.value.closeDialog()

  await router.push({ name: '每日刷题' })

  sessionStore.surroundingPoint = custom.value
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    custom.value = ''
  }
})
</script>

<template>
  <div class="select-area-dialog" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="限定问题范围" @confirm="confirm">
      <div class="content">
        <div class="custom">
          <el-input v-model="custom" placeholder="自定义知识点" style="--el-input-focus-border-color: var(--theme-color-1);" />
        </div>
      </div>
    </cust-dialog>
  </div>
</template>

<style scoped lang="scss">
.select-area-dialog {
  .content {
    padding: 15px 0;
  }
}
</style>
