<script setup>
import { nextTick, ref, watch } from 'vue'
import { useUserInfoStore } from '@/stores/user'

const userStore = useUserInfoStore()

const props = defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})

const selectCategory = ref('大学水课')
const selectCategoryChildren = ref('')

const categorys = [
  {
    name: '大学水课',
    children: ['测绘学漫谈', '工程制图', '数字地形测量学', '普通测量实验', '大地测量学基础', '人文地理学', '摄影测量学基础', '数字测图实习', '控制测量与平差实习']
  },
  {
    name: '互联网/AI',
    children: ['Java', 'C++', '后端开发', '前端/移动开发', '算法工程师', '运维', '测试']
  },
  {
    name: '产品',
    children: ['产品经理', '产品设计', '游戏策划']
  },
  {
    name: '运营/客服',
    children: ['客服', 'SEO/SEM', '内容运营', '新媒体运营', '业务运营', '线下运营']
  },
  {
    name: '设计',
    children: ['UI 设计', 'UX 设计', '平面设计', '视觉设计', '游戏设计']
  },
  {
    name: '影视/传媒',
    children: ['影视导演', '影视制作', '影视后期', '影视剪辑', '影视特效', '影视设计']
  },
  {
    name: '销售',
    children: ['销售', '销售经理', '销售总监', '销售代表', '销售代理', '销售执行', '销售咨询', '销售代理']
  }
]

const selectArea = async (area) => {
  custom.value = ''
  await nextTick()
  selectCategoryChildren.value = area
}

const dialogRef = ref(null)

const custom = ref('')

watch(() => custom.value, () => {
  selectCategoryChildren.value = ''
})

const confirm = async () => {
  if (!custom.value && !selectCategoryChildren.value) {
    ElMessage({
      message: '请选择领域',
      type: 'info'
    })
    return
  }
  else if (userStore.areaList.map(ele => ele.name).includes(custom.value || selectCategoryChildren.value)) {
    ElMessage({
      message: '已添加过该领域',
      type: 'info'
    })
    return
  }

  await userStore.updateArea(custom.value || selectCategoryChildren.value)
  userStore.ableClose = true
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
        <div class="custom">
          <el-input v-model="custom" placeholder="自定义领域" style="--el-input-focus-border-color: var(--theme-color-1);" />
        </div>
        <div class="area-category">
          <div class="category-list">
            <div
              :class="['category-item', cate.name === selectCategory && 'selected']"
              v-for="cate in categorys"
              @click="selectCategory = cate.name"
            >
              {{ cate.name }}
            </div>
          </div>
          <div class="area-list">
            <div class="wrapper">
              <div
                class="area-item"
                v-for="area in categorys.find(cate => cate.name === selectCategory).children"
                @click="selectArea(area)"
              >
                <div>{{ area }}</div>
                <img
                  src="../../assets/svgs/gou.svg"
                  alt=""
                  class="icon"
                  style="width: 16px; height: 16px;"
                  v-if="selectCategoryChildren === area"
                ></img>
              </div>
            </div>
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
      padding-bottom: 10px;
    }

    .area-category {
      display: flex;
      justify-content: left;
      gap: 50px;
      border-top: 1px solid var(--light-border-color-3);
      border-bottom: 1px solid var(--light-border-color-3);
      margin-bottom: 15px;

      .category-list {
        .category-item {
          width: 90px;
          border-radius: 10px;
          margin: 10px 0;
          padding: 5px;
          cursor: pointer;
        }

        .category-item.selected {
          background-color: var(--primary-bgc);
          box-shadow: 1px 1px 3px 3px var(--box-shadow-color);
        }
      }

      .area-list {
        width: 200px;
        max-height: 300px;
        overflow: auto;

        .area-item {
          margin: 10px 0;
          padding: 5px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
        }
      }

      .wrapper {
        width: 190px;
      }
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .area-category {
      gap: 20px !important;
    }
    .wrapper {
      width: 175px !important;
    }
  }
}
</style>
