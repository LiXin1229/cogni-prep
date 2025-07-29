<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useUserInfoStore } from '@/stores/user'
import { useMindmapStore } from '@/stores/mindmap'
import { useDebounce } from '@/utils/useDebounce'
import { getTextWidth } from '@/utils/getTextWidth'
import { toggleFoldedNodes, removeFoldedNodes, addChildrenById, modifyNode, deleteNodeById } from '@/utils/treeUtils'
import * as d3 from 'd3'
import { v4 as uuidv4 } from 'uuid'

const userStore = useUserInfoStore()
const mindmapStore = useMindmapStore()
const { debounce } = useDebounce()

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
  saveData()

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

const saveData = () => {
  if (!treeData.value) return
  mindmapStore.saveMindmapData(treeData.value)
  isEdited.value = false
}

const resizeObserver = ref(null)

onMounted(async () => {
  initChart()
  await updateData()
  renderChart()

  const handleResize = debounce(() => adjustChartSize(), 100)

  // 监听页面尺寸
  resizeObserver.value = new ResizeObserver(entries => {
    handleResize()
  })

  if (chartRef.value) {
    resizeObserver.value.observe(chartRef.value)
  }
})

// 调整图表尺寸
const adjustChartSize = () => {
  if (!chartRef.value || !svg) return
  
  // 获取新的容器尺寸
  const newWidth = chartRef.value.clientWidth
  const newHeight = chartRef.value.clientHeight
  
  // 只有当尺寸真的发生变化时才更新
  if (newWidth !== chartWidth || newHeight !== chartHeight) {
    chartWidth = newWidth
    chartHeight = newHeight

    // 更新SVG尺寸
    svg.attr('width', chartWidth)
       .attr('height', chartHeight)

    // 重新计算布局并渲染图表
    renderChart()
  }
}

const treeData = ref(null) // 树数据（响应式存储）
const chartRef = ref(null) // D3绘图容器
let root
let chartWidth, chartHeight // 画布尺寸
let svg, chartGroup, zoom // D3核心对象
let currentTransform // 当前缩放状态
let isEdited = ref(false)

const colorMap = [
  '#949899', // 灰色
  '#008dff', // 蓝色
  '#E6C229', // 金色
  '#E55E6C' // 红色
]

// 初始化图表
const initChart = () => {
  // 清空容器（防止重复渲染）
  d3.select(chartRef.value).selectAll('*').remove()

  const chartContainer = d3.select(chartRef.value)

  // 固定画布尺寸
  chartWidth = chartContainer.node().clientWidth
  chartHeight = chartContainer.node().clientHeight

  // console.log(chartWidth, chartHeight)

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
  // console.log('treeData', treeData.value)

  // 加工原始数据(删除要折叠的节点的子节点)
  const foldedData = removeFoldedNodes(treeData.value)

  root = d3.hierarchy(foldedData)

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

  // 外层透明矩形（定义总宽度=内容+内边距）
  node.append('rect')
    .attr('class', 'padding-rect')
    .attr('width', (d) => {
      // console.log(d.data.name)
      const width = getTextWidth(d.data.name)
      return width + 35
    })
    .attr('height', 30)
    .attr('transform', (d) => `translate(${-(getTextWidth(d.data.name) + 15) / 2}, -15)`)

  // 筛选出isFolded == 0的节点
  const foldedNodes = node.filter(d => d.data.isFolded === 0 && d.data.children.length > 0);

  // 绘制灰色圆形背景
  foldedNodes.append('circle')
    .attr('r', 10) // 圆半径（12或16）
    .attr('transform', d => `translate(${(getTextWidth(d.data.name) + 50) / 2}, 0)`) // 定位到文本右侧
    .attr('class', 'unfolded-circle')
    .style('cursor', 'pointer')
    .on('click', clickBtn)

  // 用path绘制减号（水平直线）
  foldedNodes.append('path')
    .attr('d', d => {
      const r = 10
      const lineLength = r * 1.2 // 减号长度（半径的1.2倍）
      const startX = -lineLength / 2 // 线段起点X（左）
      const endX = lineLength / 2 // 线段终点X（右）
      // 路径指令：M（起点）到 L（终点）的水平直线（Y坐标为0，居中）
      return `M ${startX} 0 L ${endX} 0`
    })
    // 定位：和圆形使用相同的X坐标，确保在圆中心
    .attr('transform', d => `translate(${(getTextWidth(d.data.name) + 50) / 2}, 0)`)
    .style('pointer-events', 'none') // 减号不拦截点击（点击穿透到圆形）
    .on('click', clickBtn)


  // 筛选出isFolded > 0的节点
  node.filter(d => d.data.isFolded > 0)
    .append('circle')
    .attr('r', (d) => d.data.isFolded < 100 ? 12 : 16)
    .attr('transform', (d) => `translate(${(getTextWidth(d.data.name) + 50) / 2}, 0)`)
    .attr('class', 'folded-circle')
    .style('cursor', 'pointer')
    .on('click', clickBtn)

  // 在圆形内部添加文本
  node.filter(d => d.data.isFolded > 0) // 同样只给isFolded>0的节点添加文本
    .append('text')
    .attr('class', 'folded-circle-text')
    .attr('transform', (d) => `translate(${(getTextWidth(d.data.name) + 50) / 2}, 0)`) // 和圆形位置一致
    .attr('dy', '.35em')
    .text(d => d.data.isFolded) // 显示isFolded的值
    .style('pointer-events', 'none')
    .on('click', clickBtn)

  // 内层可见矩形
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
    .attr('stroke', (d) => colorMap[d.data.frequency])
    .style('cursor', 'pointer')
    .on('contextmenu', (e, d) => openCustMenu(e, 'node', d.data))
    .on('click', (e, d) => openCustMenu(e, 'node', d.data))

  // 添加文本标签
  node.append('text')
    .attr('dy', '.35em')
    .style('text-anchor', 'middle')
    .attr("fill", (d) => colorMap[d.data.frequency])
    .text(d => d.data.name)
    .style('pointer-events', 'none')
    .on('contextmenu', (e, d) => openCustMenu(e, 'node', d.data))
    .on('click', (e, d) => openCustMenu(e, 'node', d.data))
}

onUnmounted(() => {
  saveData()
  d3.select(chartRef.value).selectAll('*').remove()

  resizeObserver.value.disconnect()
})

const clickBtn = (event, d) => {
  treeData.value = toggleFoldedNodes(treeData.value, d.data)
  renderChart()
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
  
  let translateX = (chartWidth - svgDimensions.width * scale) / 2 - 100
  let translateY = (chartHeight - svgDimensions.height * scale) / 2

  if (treeData.value && root.data.children.length <= 0) {
    // 向右移动200px
    const rootOffset = 200
    translateX += rootOffset
    translateY -= rootOffset * 2
  }
  
  currentTransform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale * 1.1)
  
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
    mindmapStore.selectedNode = node
  }
}

const openDialog = (type) => {
  userStore.showDialog = type
}

// 取消更改
const resetView = async () => {
  await updateData()
  renderChart()
  isEdited.value = false
}

// 添加节点
const addNodes = (data) => {
  // console.log('addNodes', data)
  const newNode = { id: uuidv4(), name: data.name, children: [], isFolded: 0, frequency: data.rating }
  console.log('selectedNode', mindmapStore.selectedNode.id)
  treeData.value = addChildrenById(treeData.value, mindmapStore.selectedNode.id, newNode)
  renderChart()
  isEdited.value = true
}

// 修改节点
const editNode = (data) => {
  console.log('editNode', data)
  treeData.value = modifyNode(treeData.value, mindmapStore.selectedNode.id, data.name, data.rating)
  renderChart()
  isEdited.value = true
}

// 删除节点
const deleteNode = () => {
  treeData.value = deleteNodeById(treeData.value, mindmapStore.selectedNode.id)
  renderChart()
  isEdited.value = true
}

// store注册方法, 便于在Dialog组件中触发
mindmapStore.registerCallback('addNodes', addNodes)
mindmapStore.registerCallback('editNode', editNode)
mindmapStore.registerCallback('deleteNode', deleteNode)

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
          :class="['area-item', area.areaId === mindmapStore.selectedAreaId && 'selected-area', isEdited && 'edited-icon']"
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
      :isEdited="isEdited"
      @resetView="resetView"
      @saveView="saveData"
      @AIAddNode="openDialog('AIAddNode')"
      @userAddNode="openDialog('userAddNode')"
      @editNode="openDialog('editNode')"
      @deleteNode="openDialog('deleteNode')"
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
        position: relative;
      }

      .selected-area {
        background-color: var(--theme-color-1);
        color: var(--normal-bgc);
      }

      .edited-icon {
        &::before {
          content: '';
          display: inline-block;
          // font-size: 16px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--normal-bgc);
          position: absolute;
          top: 5px;
          left: 6px;
        }
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

      .node rect {
        fill: #fff;
        stroke-width: 2px;
      }

      .node text {
        font: 20px sans-serif;
        fill: #222;
      }

      .node .unfolded-circle {
        fill: #bbb;
        stroke: none;
      }

      .node path {
        stroke: #fff;
        stroke-width: 2px;
      }

      .node .folded-circle {
        fill: #bbb;
      }

      .node .folded-circle-text {
        font: 20px sans-serif;
        fill: #fff;
        text-anchor: middle;
      }
    }
  }
}
</style>
