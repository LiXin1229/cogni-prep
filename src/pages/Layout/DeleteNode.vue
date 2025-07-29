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
const ruleFormRef = ref(null)

const formData = ref({
  name: ''
})

const confirm = async () => {
  mindmapStore.triggerComponent('deleteNode', formData.value)
  dialogRef.value.closeDialog()
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    formData.value = {
      name: mindmapStore.selectedNode.name
    }
  }
})
</script>

<template>
  <div class="user-add-node" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="确认删除该节点吗" @confirm="confirm">
      <div class="content">
        <el-form :model="formData" >
          <el-form-item label="名称" prop="name"> 
            <div class="custom">
              <el-input v-model="formData.name" placeholder="自定义节点" disabled />
            </div>
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
