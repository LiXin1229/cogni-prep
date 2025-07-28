<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useUserInfoStore } from '@/stores/user'
import { useMindmapStore } from '@/stores/mindmap'
import * as d3 from 'd3'

const userStore = useUserInfoStore()
const mindmapStore = useMindmapStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

const selectArea = (id) => {
  if (id === mindmapStore.selectedAreaId) return

  mindmapStore.selectedAreaId = id
  
  console.log('selectedAreaId', mindmapStore.selectedAreaId)
}

// 图表容器
const chartRef = ref(null)

let chartGroup, svg // D3核心对象（全局存储）
let chartWidth, chartHeight
let currentTransform, zoom

// 初始化图表
const initChart = () => {
  // 清空容器（防止重复渲染）
  d3.select(chartRef.value).selectAll('*').remove()

  const chartContainer = d3.select(chartRef.value)

  // 固定画布尺寸
  chartWidth = chartContainer.node().clientWidth
  chartHeight = chartContainer.node().clientHeight

  console.log(chartWidth, chartHeight)

  // 创建SVG容器
  svg = chartContainer
    .append('svg')
    .attr('width', chartWidth)
    .attr('height', chartHeight)

  // 创建可缩放/移动的图表组
  chartGroup = svg.append('g')

  // 存储当前变换状态
  currentTransform = d3.zoomIdentity

  // 初始化缩放行为
  zoom = d3.zoom()
    .scaleExtent([0.1, 5])
    .on("zoom", (event) => {
      currentTransform = event.transform
      chartGroup.attr("transform", currentTransform)
    })

  svg.call(zoom)
}

// 更新数据
const updateData = (data) => { 
  chartGroup.selectAll("*").remove()

  const root = d3.hierarchy(data)

  console.log('初始化', root)

  // 计算树形图实际需要的尺寸
  const treeLayout = d3.tree().size([chartWidth, chartWidth])

  treeLayout(root)

  const svgDimensions = calculateSVGDimensions(root)

  // 更新SVG尺寸（超出画布部分可通过滚动查看）
  svg.attr('width', svgDimensions.width)
    .attr('height', svgDimensions.height)

  // 应用初始缩放
  applyInitialZoom(svgDimensions)

  // 绘制连线
  chartGroup.selectAll('.link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x))

  // 创建节点组
  const node = chartGroup.selectAll('.node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.y},${d.x})`)

  // 外层透明矩形（定义总宽度=内容+内边距）
  node.append('rect')
    .attr('class', 'padding-rect')
    .attr('width', 115) // 75(内容) + 30(内边距)
    .attr('height', 30)
    .attr('transform', 'translate(-57.5, -15)') // 居中：105/2=52.5
    .attr('opacity', 0.5) // 完全透明

  node.append('circle')
    .attr('r', 8)
    .attr('transform', 'translate(50, 0)')
    .attr('class', 'temp-circle') // 添加类名标识
    .attr('opacity', 0)
    .on('click', (event, d) => {
      // console.log('点击圆', d)
      console.log(d.data)

      // const res = removeChildrenById(data, d.data.id)
      // console.log('删除子节点', res)
      // renderChart(res)

      // 添加子节点
      const res = addChildrenById(data, d.data.id, {
        "id": 114,
        "name": `新节点`,
        "children": []
      })
      updateData(res)
    })

  // 内层可见矩形（内容区）
  node.append('rect')
    .attr('class', 'content-rect')
    .attr('width', 75)
    .attr('height', 30)
    .attr('rx', 10) // 圆角
    .attr('ry', 10)
    .attr('transform', 'translate(-37.5, -15)') // 居中于外层矩形左侧
    .attr('fill', '#fff')
    .attr('stroke', 'steelblue')

  // 添加文本标签（仅显示非叶节点或特定层级的标签）
  const text = node.append('text')
    .attr('dy', '.35em')
    .style('text-anchor', 'middle')
    .text(d => d.data.name)

  // 添加交互
  node.on('mouseover', (event, d) => {
    d3.select(event.currentTarget).attr("fill", "orange")

    d3.select(event.currentTarget)
      .selectAll('.temp-circle')
      .attr('opacity', 1)
    
  })
  .on("mouseout", (event, d) => {
    d3.select(event.currentTarget).attr("fill", "#333")

    d3.select(event.currentTarget)
      .selectAll('.temp-circle')
      .attr('opacity', 0)
  })
}

watch(() => mindmapStore.mindmapData, (data) => {
  console.log(data)
  updateData(data)
})

onMounted(async () => {
  initChart()
  await mindmapStore.getMindmapData()
})

onUnmounted(() => {
  d3.select(chartRef.value).selectAll('*').remove()
})

// 计算SVG实际需要的尺寸（根据树的大小动态调整）
const calculateSVGDimensions = (root) => {
  const descendants = root.descendants()
  const minX = d3.min(descendants, d => d.x)
  const maxX = d3.max(descendants, d => d.x)
  const minY = d3.min(descendants, d => d.y)
  const maxY = d3.max(descendants, d => d.y)
  
  // 计算需要的额外空间
  const extraWidth = Math.max(0, maxY - minY - chartWidth + 200)
  const extraHeight = Math.max(0, maxX - minX - chartHeight + 100)
  
  return {
    width: chartWidth + extraWidth,
    height: chartHeight + extraHeight
  }
}

const applyInitialZoom = (svgDimensions) => {
  const scale = Math.min(
    chartWidth / svgDimensions.width,
    chartHeight / svgDimensions.height
  ); // 留出边距
  
  const translateX = (chartWidth - svgDimensions.width * scale) / 2;
  const translateY = (chartHeight - svgDimensions.height * scale) / 2;
  
  currentTransform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale);
  
  // 平滑过渡到初始视图
  chartGroup.attr("transform", currentTransform);
  
  // 更新缩放行为的状态
  svg.call(zoom.transform, currentTransform);
}

// 添加节点
const addChildrenById = (treeData, parentId, newNode) => {
  const newTree = JSON.parse(JSON.stringify(treeData));

  // 2. 定义递归函数（处理单个节点及其子节点）
  const findAndAdd = (node) => {
    // 若当前节点是目标父节点，直接添加子节点
    if (node.id === parentId) {
      // 确保 children 存在（避免 undefined.push 错误）
      if (!node.children) node.children = [];
      node.children.push(newNode);
      return true; // 标记已添加
    }

    // 若当前节点有子节点，递归查找子节点
    if (node.children && node.children.length) {
      for (let i = 0; i < node.children.length; i++) {
        const added = findAndAdd(node.children[i]);
        if (added) return true; // 找到并添加后，终止递归
      }
    }

    return false; // 未找到父节点
  };

  // 3. 从根节点开始查找（因为 treeData 是单个根节点对象）
  const isAdded = findAndAdd(newTree);

  // 4. 返回添加结果：若成功，返回修改后的新树；否则返回 null
  return isAdded ? newTree : null;
}
</script>

<template>
  <div class="mind-map">
    <!-- 顶部区 -->
    <div class="top">
      <div class="toggleSidebar" @click="emit('toggleSidebar')" v-show="isSidebarFolded">打开侧栏</div>

      <div class="area-list">
        <div
          :class="['area-item', area.areaId === mindmapStore.selectedAreaId && 'selected-area']"
          v-for="area in mindmapStore.areaList"
          :key="area.id"
          @click="selectArea(area.areaId)"
        >
          {{ area.name }}
        </div>
      </div>
    </div>

    <div class="map-container">
      <div ref="chartRef" class="chart-wrapper"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mind-map {
  width: 100%;
  height: 100%;
  background-color: var(--primary-bgc);
  position: relative;

  .top {
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 20px;

    .toggleSidebar {
      position: absolute;
      left: 10px;
      top: 10px;
    }

    .area-list {
      display: flex;
      justify-content: flex-start;
      gap: 20px;

      .area-item {
        padding: 6px 12px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 15px;
      }

      .selected-area {
        background-color: var(--theme-color-1);
        color: var(--normal-bgc);
      }
    }
  }

  .map-container {
    height: calc(100% - 50px);

    .chart-wrapper {
      width: 100%;
      height: 100%;
      // background-color: aqua;

      .link {
        fill: none;
        stroke: #bbb;
        stroke-width: 1px;
      }
      .node circle {
        fill: #fff;
        stroke: steelblue;
        stroke-width: 1px;
      }
      .node rect {
        fill: #fff;
        stroke: steelblue;
        stroke-width: 2px;
      }
      .node text {
        font: 10px sans-serif;
      }
    }
  }
}
</style>
