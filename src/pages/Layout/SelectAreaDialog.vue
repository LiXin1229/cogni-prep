<script setup>
import { ref, watch } from 'vue'
import { useUserInfoStore } from '@/stores/user'

const userStore = useUserInfoStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref(null)

const custom = ref('')

const confirm = () => {
  if (!custom.value) {
    ElMessage({
      message: '请选择领域',
      type: 'info'
    })
    return
  }
  // else if (userStore.areaList.map(ele => ele.name).includes(custom.value)) {
  //   ElMessage({
  //     message: '已添加过该领域',
  //     type: 'info'
  //   })
  //   return
  // }

  userStore.updateArea(custom.value)
  dialogRef.value.closeDialog()
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    custom.value = ''
  }
})
</script>

<template>
  <div class="select-area-dialog" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="选择领域" @confirm="confirm">
      <div class="content">
        <div class="area-category">分类</div>
        <div class="custom">
          <el-input v-model="custom" placeholder="自定义领域" style="--el-input-focus-border-color: var(--theme-color-1);" />
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
