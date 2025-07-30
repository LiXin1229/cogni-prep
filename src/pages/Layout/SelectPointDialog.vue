<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { faAngleRight } from '@fortawesome/free-solid-svg-icons'

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

const quote = () => {

}

const noLimit = async () => {
  dialogRef.value.closeDialog()
  await router.push({ name: '每日刷题' })
  sessionStore.surroundingPoint = ''
}

const confirm = async () => {
  if (!custom.value) {
    ElMessage({
      message: '请选择问题范围',
      type: 'info'
    })
    return
  }

  if (custom.value.length >= 20) {
    ElMessage({
      message: '不能超过20个字',
      type: 'info'
    })
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

        <div class="quote layer" @click="quote">
          <div class="text">从导图中引用</div>
          <div class="icon">
            <font-awesome-icon :icon="faAngleRight" />
          </div>
        </div>
        
        <div class="nolimit layer" @click="noLimit">
          <div class="text">内容不限</div>
          <div class="icon">
            <font-awesome-icon :icon="faAngleRight" />
          </div>
        </div>
      </div>
    </cust-dialog>
  </div>
</template>

<style scoped lang="scss">
.select-area-dialog {
  .content {
    padding: 15px 0;

    .custom {
      margin-bottom: 15px;
    }

    .layer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 30px;
      margin: 10px 0;
      padding: 0 5px;
      color: var(--text-color-2);
    }
  }
}
</style>
