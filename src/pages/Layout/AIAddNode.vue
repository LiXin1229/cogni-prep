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
  number: 1,
  auto: false
})

const submit = async () => {
  console.log('submit')
  const res = await mindmapStore.getSubcategory(formData.value, pointList.value)

  if (res.success) {
    pointList.value = [...pointList.value, ...res.data.pointList]
  }
}

const pointList = ref([])

const confirm = async () => {
  mindmapStore.triggerComponent('addNodes', pointList.value)
  dialogRef.value.closeDialog()
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    pointList.value = []
  }
})
</script>

<template>
  <div class="add-node-dialog" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="AI生成子节点" @confirm="confirm">
      <div class="content">
        <el-form :model="formData">
          <el-form-item label="添加个数" prop="number">
            <el-input-number v-model="formData.number" :min="1" :max="30" :disabled="formData.auto" />

            <el-radio-group v-model="formData.auto" class="radio-btn">
              <el-radio :value="true" border>自动</el-radio>
            </el-radio-group>

            <el-button type="primary" @click="submit" class="submit-btn">生成</el-button>
          </el-form-item>
        </el-form>

        <div class="point-list">
          <div class="point-item" v-for="(point, index) in pointList" :key="index">
            {{ point }}
          </div>
        </div>
      </div>
    </cust-dialog>
  </div>
</template>

<style scoped lang="scss">
.add-node-dialog {
  .content {
    padding: 15px 0;

    .radio-btn {
      margin-left: 10px;
    }

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
