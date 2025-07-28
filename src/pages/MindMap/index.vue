<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useUserInfoStore } from '@/stores/user'
import { useMindmapStore } from '@/stores/mindmap'
import { getTextWidth } from '@/utils/getTextWidth'
import * as d3 from 'd3'
import { v4 as uuidv4 } from 'uuid'

const userStore = useUserInfoStore()
const mindmapStore = useMindmapStore()

defineProps({
  isSidebarFolded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleSidebar'])

// 切换头部领域
const selectArea = async (id) => {
  if (id === mindmapStore.selectedAreaId) return

  // 保存上一次数据
  mindmapStore.saveMindmapData(treeData.value)

  mindmapStore.selectedAreaId = id
  
  console.log('selectedAreaId', mindmapStore.selectedAreaId)

  // 更新图表
  await updateData()
  renderChart()
}

// 更新数据
const updateData = async () => {
  const { mindmap } = await mindmapStore.getMindmapData()
  treeData.value = mindmap
}

onMounted(async () => {
  initChart()
  await updateData()
  renderChart()
})

const treeData = ref(null) // 树数据（响应式存储）
const chartRef = ref(null) // D3绘图容器
let chartWidth, chartHeight // 画布尺寸
let svg, chartGroup, zoom // D3核心对象
let currentTransform // 当前缩放状态

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
  
  // svg.append('rect')
  //   .attr('class', 'test-rect')
  //   .attr('x', 0)
  //   .attr('y', 0)
  //   .attr('width', chartWidth)
  //   .attr('height', chartHeight)
  
  // 创建可缩放/移动的图表组
  chartGroup = svg.append('g')

  // 存储当前变换状态
  currentTransform = d3.zoomIdentity

  // 初始化缩放行为
  zoom = d3.zoom()
    .scaleExtent([0.1, 5])
    .on('zoom', (event) => {
      currentTransform = event.transform
      chartGroup.attr('transform', currentTransform)
    })

  svg.call(zoom)
}

// 更新数据
const renderChart = () => {
  // 清除旧元素
  chartGroup.selectAll("*").remove()

  // console.log(treeData.value)

  // 加工原始数据(删除要折叠的节点的子节点)
  const foldedData = removeFoldedNodes(treeData.value)

  const root = d3.hierarchy(foldedData)

  console.log('初始化', root)

  d3.tree().size([chartWidth, chartWidth]) (root)

  const svgDimensions = calculateSVGDimensions(root)

  // 更新SVG尺寸（超出画布部分可通过滚动查看）
  svg.attr('width', svgDimensions.width)
    .attr('height', svgDimensions.height)

  // 应用初始缩放
  applyInitialZoom(svgDimensions)

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
    .on('contextmenu', (e, d) => openCustMenu(e, 'node', d.data))

  // 筛选出isFolded == 0的节点
  node.filter(d => d.data.isFolded == 0)
    .append('circle')
    .attr('r', (d) => d.data.isFolded < 100 ? 12 : 16)
    .attr('transform', (d) => `translate(${(getTextWidth(d.data.name) + 50) / 2}, 0)`)
    .attr('class', 'unfolded-circle')
    .on('click', click)

  // 筛选出isFolded > 0的节点
  node.filter(d => d.data.isFolded > 0)
    .append('circle')
    .attr('r', (d) => d.data.isFolded < 100 ? 12 : 16)
    .attr('transform', (d) => `translate(${(getTextWidth(d.data.name) + 50) / 2}, 0)`)
    .attr('class', 'folded-circle')
    .on('click', click)

  // 在圆形内部添加文本
  node.filter(d => d.data.isFolded > 0) // 同样只给isFolded>0的节点添加文本
    .append('text')
    .attr('class', 'folded-circle-text')
    // .attr('font-size', (d) => d.data.isFolded < 10 ? 24 : 16)
    .attr('transform', (d) => `translate(${(getTextWidth(d.data.name) + 50) / 2}, 0)`) // 和圆形位置一致
    .attr('dy', '.35em')
    .text(d => d.data.isFolded) // 显示isFolded的值
    .on('click', click)

  // 内层可见矩形（内容区）
  node.append('rect')
    .attr('class', 'content-rect')
    .attr('width', (d) => {
      // console.log(d.data.name)
      const width = getTextWidth(d.data.name)
      return width + 15
    })
    .attr('height', 30)
    .attr('rx', 10) // 圆角
    .attr('ry', 10)
    .attr('transform', (d) => `translate(-${(getTextWidth(d.data.name) + 15) / 2}, -15)`) // 居中于外层矩形左侧
    .attr('fill', '#fff')
    .attr('stroke', 'steelblue')

  // 添加文本标签（仅显示非叶节点或特定层级的标签）
  node.append('text')
    .attr('dy', '.35em')
    .style('text-anchor', 'middle')
    .text(d => d.data.name)
}

onUnmounted(() => {
  mindmapStore.saveMindmapData(treeData.value)
  d3.select(chartRef.value).selectAll('*').remove()
})

const click = (event, d) => {
  // console.log('click', d.data)
  treeData.value = toggleFoldedNodes(d.data)
  renderChart()
}

// 展开或折叠节点
const toggleFoldedNodes = (node) => {
  // 深拷贝数据以避免修改原对象
  const newTreeData = JSON.parse(JSON.stringify(treeData.value));

  const targetId = node.id
  
  // 递归查找并更新目标节点
  function findAndUpdate(node) {
      if (node.id === targetId) {
          // 根据当前isFolded状态切换
          if (node.isFolded === 0) {
              // 设为子节点数量
              node.isFolded = node.children ? node.children.length : 0;
          } else {
              // 重置为0
              node.isFolded = 0;
          }
          return true; // 找到并更新，停止递归
      }
      
      // 递归查找子节点
      if (node.children && node.children.length > 0) {
          for (let child of node.children) {
              if (findAndUpdate(child)) {
                  return true
              }
          }
      }
      
      return false;
  }
  
  // 从根节点开始查找
  findAndUpdate(newTreeData);
  
  return newTreeData;
}

// 折叠节点
const removeFoldedNodes = (node) => {
  // 深拷贝当前节点，避免修改原数据
  const newNode = JSON.parse(JSON.stringify(node))
  
  // 检查当前节点的isFolded是否不为0
  if (newNode.isFolded !== 0) {
    // 清空子节点
    newNode.children = []
  } else if (newNode.children && newNode.children.length) {
    // 如果有子节点且isFolded为0，则递归处理每个子节点
    newNode.children = newNode.children.map(child => removeFoldedNodes(child))
  }
  
  return newNode
}

// 添加节点
const addChildrenById = (treeData, parentId, newNode) => {
  const newTree = JSON.parse(JSON.stringify(treeData))

  // 定义递归函数（处理单个节点及其子节点）
  const findAndAdd = (node) => {
    // 若当前节点是目标父节点，直接添加子节点
    if (node.id === parentId) {
      // 确保 children 存在（避免 undefined.push 错误）
      if (!node.children) node.children = []
      node.children.push(newNode)
      return true; // 标记已添加
    }

    // 若当前节点有子节点，递归查找子节点
    if (node.children && node.children.length) {
      for (let i = 0; i < node.children.length; i++) {
        const added = findAndAdd(node.children[i])
        if (added) return true // 找到并添加后，终止递归
      }
    }

    return false // 未找到父节点
  }

  // 从根节点开始查找（因为 treeData 是单个根节点对象）
  const isAdded = findAndAdd(newTree)

  // 返回添加结果：若成功，返回修改后的新树；否则返回 null
  return isAdded ? newTree : null
}

// 计算SVG实际需要的尺寸（根据树的大小动态调整）
const calculateSVGDimensions = (root) => {
  const descendants = root.descendants()
  // console.log('descendants', descendants)
  const minX = d3.min(descendants, d => d.x)
  const maxX = d3.max(descendants, d => d.x)
  const minY = d3.min(descendants, d => d.y)
  const maxY = d3.max(descendants, d => d.y)
  
  // 计算需要的额外空间
  const extraWidth = Math.max(0, maxY - minY - chartWidth)
  const extraHeight = Math.max(0, maxX - minX - chartHeight + 500)
  // console.log(extraWidth, extraHeight)
  
  return {
    width: chartWidth + extraWidth,
    height: chartHeight + extraHeight
  }
}

const applyInitialZoom = (svgDimensions) => {
  const scale = Math.min(
    chartWidth / svgDimensions.width,
    chartHeight / svgDimensions.height
  ) // 留出边距
  
  const translateX = (chartWidth - svgDimensions.width * scale) / 2
  const translateY = (chartHeight - svgDimensions.height * scale) / 2
  
  currentTransform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale)
  
  // 平滑过渡到初始视图
  chartGroup.attr("transform", currentTransform)
  
  // 更新缩放行为的状态
  svg.call(zoom.transform, currentTransform)
}

// 菜单
const showCustMenu = ref('')
const position = ref({})

const openCustMenu = (e, type, node) => {
  e.stopPropagation()
  e.preventDefault()
  // console.log(node)
  // console.log(type)
  position.value = {
    x: e.clientX - 260,
    y: e.clientY - 5
  }
  showCustMenu.value = type

  if (type === 'node') {
    selectedNode = node
  }
}

let selectedNode = null

const openDialog = (type) => {
  userStore.showDialog = type
}

const addNodes = (data) => {
  console.log('addNodes', data)
  const newNode = { id: uuidv4(), name: data.name, children: [], isFolded: 0, frequency: data.rating }
  console.log('selectedNode', selectedNode.id)
  treeData.value = addChildrenById(treeData.value, selectedNode.id, newNode)
  renderChart()
}

mindmapStore.registerCallback('addNodes', addNodes)

onUnmounted(() => {
  mindmapStore.registerCallback({})
})
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
      <div ref="chartRef" class="chart-wrapper" @contextmenu.stop="(e) => openCustMenu(e, 'normal')"></div>
    </div>

    <!-- 自定义菜单 -->
    <cust-menu
      v-model:showCustMenu="showCustMenu"
      :position="position"
      @resetView="() => renderChart()"
      @saveView="() => mindmapStore.saveMindmapData(treeData)"
      @userAddNode="openDialog('userAddNode')"
      @AIAddNode="openDialog('AIAddNode')"
    />
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

    :deep(.chart-wrapper) {
      width: 100%;
      height: 100%;
      // background-color: aqua;

      .test-rect {
        fill: var(--light-main-color);
      }

      .link {
        fill: none;
        stroke: #bbb;
        stroke-width: 1px;
      }

      .node circle {
        fill: #fff;
        stroke: steelblue;
        stroke-width: 2px;
      }

      .node rect {
        fill: #fff;
        stroke: steelblue;
        stroke-width: 2px;
      }

      .node text {
        font: 16px sans-serif;
      }

      .node .folded-circle-text {
        font: 16px sans-serif;
        color: #222;
        text-anchor: middle;
      }
    }
  }
}
</style>
