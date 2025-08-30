<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMindmapStore } from '@/stores/mindmap'
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { getTextWidth } from '@/utils/getTextWidth.js'
import type { PointListType } from '@/stores/types/mindmap.type'
import { ElMessage } from 'element-plus'

const mindmapStore = useMindmapStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const colorMap = [
  '#949899', // 灰色
  '#008dff', // 蓝色
  '#E6C229', // 金色
  '#E55E6C' // 红色
]

const dialogRef = ref<any>(null)

const formData = ref({
  number: 1,
  auto: false
})

const submit = async () => {
  console.log('submit')
  const res = await mindmapStore.getSubcategory(formData.value, pointList.value)

  if (res?.success) {
    console.log('res', res)
    pointList.value = [...pointList.value, ...res.data.pointList].map(point => {
      return {
        ...point,
        width: getTextWidth(point.name, { fontSize: '14px' }) + 'px'
      }
    })
  }
}

const pointList = ref<PointListType[]>([])

watch(() => pointList.value, (pointList) => {
  pointList.forEach(point => {
    point.width = point.name ? getTextWidth(point.name, { fontSize: '14px' }) + 'px' : '40px'
  })
}, { deep: true })

const deletePoint = (index: number) => {
  pointList.value.splice(index, 1)
}

const confirm = async () => {
  if (pointList.value.length === 0) {
    ElMessage({
      message: '请先生成子节点',
      type: 'info'
    })
    return
  }

  if (!checkList(pointList.value)) {
    ElMessage({
      message: '所有子节点名称均不能为空',
      type: 'info'
    })
    return
  }

  mindmapStore.triggerComponent('addNodes', pointList.value)
  dialogRef.value.closeDialog()
}

const closeDialog = () => {
  mindmapStore.sendState = false
}

const checkList = (list: PointListType[]) => {
  // 检查list中的每个元素的name都不为空
  return list.every(item => item.name !== '')
}

watch(() => props.showDialog, (showDialog) => {
  if (showDialog) {
    pointList.value = []
  }
})
</script>

<template>
  <div class="add-node-dialog" v-if="showDialog">
    <cust-dialog ref="dialogRef" title="AI生成子节点" @confirm="confirm" @closeDialog="closeDialog">
      <div class="content">
        <el-form :model="formData">
          <el-form-item label="添加个数" prop="number" class="form">
            <el-input-number v-model="formData.number" :min="1" :max="30" @click="() => formData.auto = false" class="number-input" />

            <span>
              <el-radio-group v-model="formData.auto" class="radio-btn">
                <el-radio :value="true" border>自动</el-radio>
              </el-radio-group>

              <el-button type="primary" @click="submit" class="submit-btn">生成</el-button>
            </span>
          </el-form-item>
        </el-form>

        <div class="point-list">
          <!-- 等待响应的图标 -->
          <div class="loading-icon" v-show="mindmapStore.sendState">
            <div class="left-ball"></div>
            <div class="right-ball"></div>
          </div>

          <div class="point-item" v-for="(point, index) in pointList" :key="index">
            <div class="tag" :style="{ borderColor: colorMap[point.frequency] }">
              <el-input v-model="point.name" :style="{ width: point.width }" :maxlength="36" />
            </div>
            <div class="frequency">
              <el-rate v-model="point.frequency" size="large" :max="3" clearable  />
            </div>
            <div class="delete-btn" @click="deletePoint(index)">
              <font-awesome-icon :icon="faCircleXmark" />
            </div>
          </div>
        </div>
      </div>
    </cust-dialog>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/loading.scss" as *;

.add-node-dialog {
  .content {
    padding: 15px 0;

    .number-input {
      margin-right: 10px;
    }

    span {
      display: flex;
      align-items: center;
    }

    .submit-btn {
      margin-left: 10px;
    }

    :deep(.el-form-item__content) {
      --el-input-focus-border: var(--theme-color-1);
      --el-input-focus-border-color: var(--theme-color-1);
    }

    .point-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-height: 400px;
      overflow-y: auto;
      padding: 0 30px;

      .point-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 10px;
        margin-right: -30px;

        .tag {
          padding: 0 5px;
          border: 1.5px solid var(--theme-color-1);
          border-radius: 8px;
          margin-right: 15px;
        }

        .delete-btn {
          margin-left: 15px;
          scale: 0.6;
          opacity: 0;
          transition: 0.1s all ease-in-out;
        }

        &:hover {
          .delete-btn {
            opacity: 1;
            scale: 1;
          }
        }

        :deep(.el-input__wrapper) {
          box-shadow: none !important; // 移除 input 边框
          padding: 0;
        }
      }

      .loading-icon {
        display: flex;
        justify-content: space-between;
        width: 20px;
        height: 15px;
        margin: 10px 0;

        @include loading;
      }
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .form {
      span {
        margin-top: 10px;

        .submit-btn {
          width: 65px;
        }
      }
    }
  }
}
</style>
