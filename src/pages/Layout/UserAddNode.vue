<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMindmapStore } from '@/stores/mindmap'
import { useNoteStore } from '@/stores/note'

const mindmapStore = useMindmapStore()
const route = useRoute()
const noteStore = useNoteStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const dialogRef = ref<any>(null)
const ruleFormRef = ref<any>(null)

const formData = ref({
  name: '',
  frequency: 0
})

const verifyName = (_: any, value: string, callback: any) => {
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
    if (route.name === '思维导图') {
      mindmapStore.triggerComponent('addNodes', [formData.value])
    } else if (route.name === '笔记') {
      noteStore.addNode(formData.value)
    }
    dialogRef.value.closeDialog()
  }
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    formData.value = {
      name: '',
      frequency: 0
    }
  }
})
</script>

<template>
  <div class="user-add-node">
    <cust-dialog ref="dialogRef" title="添加子节点" @confirm="confirm" :visible="showDialog">
      <div class="content">
        <el-form ref="ruleFormRef" :model="formData" :rules="rules" >
          <el-form-item label="名称" prop="name"> 
            <div class="custom">
              <el-input v-model="formData.name" placeholder="自定义节点" style="--el-input-focus-border-color: var(--theme-color-1);" />
            </div>
          </el-form-item>

          <el-form-item label="重要性">
            <el-rate v-model="formData.frequency" size="large" :max="3" clearable  />
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
