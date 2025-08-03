<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useMindmapStore } from '@/stores/mindmap'

const mindmapStore = useMindmapStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref(null)
const ruleFormRef = ref(null)

const formData = ref({
  name: '',
  rating: 0
})

const verifyName = (rule, value, callback) => {
  if (!value) callback(new Error('请输入节点名'))
  callback()
}

const rules = reactive({
  name: [
    { validator: verifyName, trigger: 'blur' }
  ]
})

const confirm = async () => {
  const isValid = await ruleFormRef.value.validate()
  
  if (isValid) {
    mindmapStore.triggerComponent('editNode', formData.value)
    dialogRef.value.closeDialog()
  }
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    formData.value = {
      name: mindmapStore.selectedNode.name,
      rating: mindmapStore.selectedNode.frequency
    }
  }
})
</script>

<template>
  <div class="user-add-node" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="编辑节点" @confirm="confirm">
      <div class="content">
        <el-form ref="ruleFormRef" :model="formData" :rules="rules" >
          <el-form-item label="名称" prop="name"> 
            <div class="custom">
              <el-input v-model="formData.name" placeholder="自定义节点" style="--el-input-focus-border-color: var(--theme-color-1);" />
            </div>
          </el-form-item>

          <el-form-item label="重要程度">
            <el-rate v-model="formData.rating" size="large" :max="3" clearable  />
          </el-form-item>
        </el-form>
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
