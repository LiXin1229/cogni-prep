<script setup>
import { reactive, ref, watch } from 'vue'
import { useMindmapStore } from '@/stores/mindmap'

const mindmapStore = useMindmapStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref(null)

const formData = ref({
  number: 1
})

const submit = () => {
  console.log('submit')
  mindmapStore.getSubcategory(formData.value.number, pointList.value)
}

const pointList = ref([])

const confirm = async () => {
  // mindmapStore.triggerComponent('addNodes', formData.value)
  dialogRef.value.closeDialog()
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    formData.value = {
      number: 1
    }
  }
})
</script>

<template>
  <div class="add-node-dialog" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="AI生成子节点" @confirm="confirm">
      <div class="content">
        <el-form :model="formData">
          <el-form-item label="添加个数" prop="number">
            <el-input-number v-model="formData.number" :min="1" :max="30" style="--el-input-focus-border-color: var(--theme-color-1);" />

            <el-button type="primary" @click="submit" class="submit-btn">生成</el-button>
          </el-form-item>
        </el-form>
      </div>
    </cust-dialog>
  </div>
</template>

<style scoped lang="scss">
.add-node-dialog {
  .content {
    padding: 15px 0;

    .submit-btn {
      margin-left: 10px;
    }

    :deep(.el-form-item__content) {
      --el-input-focus-border: var(--theme-color-1);
      --el-input-focus-border-color: var(--theme-color-1);
    }
  }
}
</style>
