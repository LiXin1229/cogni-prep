<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from '@/stores/user'
import { useMindmapStore } from '@/stores/mindmap'
import { useSessionStore } from '@/stores/session'
import { useNoteStore } from '@/stores/note'
import throttle from '@/utils/throttle'
import { getTextWidth } from '@/utils/getTextWidth'
import {
  toggleFoldedNodes,
  removeFoldedNodes,
  addChildrenById,
  modifyNode,
  deleteNodeById,
} from '@/utils/treeUtils'
import { calculateDynamicTreeSize } from '@/utils/dynamicTreeSize'
import { v4 as uuidv4 } from 'uuid'
import * as d3 from 'd3'
import type { TreeNode } from '@/stores/types/mindmap.type'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserInfoStore()
const mindmapStore = useMindmapStore()
const sessionStore = useSessionStore()
const noteStore = useNoteStore()

const props = defineProps({
  style: {
    type: Object,
    default: () => ({
      height: 'calc(100% - 50px)',
    }),
  },
  mouseFacter: {
    // 鼠标修正值
    type: Object,
    default: () => ({
      x: -260,
      y: -5,
    }),
  },
})

// 更新数据
const updateData = async () => {
  const mindmap = await mindmapStore.getMindmapData()
  if (mindmap) treeData.value = mindmap
}

const saveData = () => {
  if (treeData.value) mindmapStore.saveMindmapData(treeData.value)
  isEdited.value = false
}

const resizeObserver = ref<ResizeObserver | null>(null)

onMounted(async () => {
  initChart()
  await updateData()
  renderChart()

  const handleResize = throttle(() => adjustChartSize(), 100)
  // const handleResize = () => adjustChartSize()

  // 监听页面尺寸
  resizeObserver.value = new ResizeObserver(() => {
    handleResize()
  })

  if (chartRef.value) {
    resizeObserver.value.observe(chartRef.value)
  }
})

const treeData = computed({
  // 树数据
  get: () => mindmapStore.treeData,
  set: (value) => (mindmapStore.treeData = value),
})

const chartRef = ref<HTMLElement | null>(null) // D3绘图容器
let root: d3.HierarchyNode<TreeNode> | null
let chartWidth: number, chartHeight: number // 画布尺寸
let svg: any, chartGroup: any, zoom: any // D3核心对象
let currentTransform: any // 当前缩放状态
let isEdited = computed({
  // 编辑状态
  get: () => mindmapStore.isEdited,
  set: (value) => (mindmapStore.isEdited = value),
})

const colorMap = [
  '#949899', // 灰色
  '#008dff', // 蓝色
  '#E6C229', // 金色
  '#E55E6C', // 红色
]

// 初始化图表
const initChart = () => {
  // 清空容器（防止重复渲染）
  d3.select(chartRef.value).selectAll('*').remove()

  const chartContainer = d3.select(chartRef.value)
  const element = chartContainer.node() as any

  // 固定画布尺寸
  chartWidth = element.clientWidth
  chartHeight = element.clientHeight

  // console.log(chartWidth, chartHeight)

  // 创建SVG容器
  svg = chartContainer.append('svg').attr('width', chartWidth).attr('height', chartHeight)

  // 创建可缩放/移动的图表组
  chartGroup = svg.append('g')

  // 存储当前变换状态
  currentTransform = d3.zoomIdentity

  // 初始化缩放行为
  zoom = d3
    .zoom()
    .scaleExtent([0.1, 5])
    .on('zoom', (event) => {
      currentTransform = event.transform
      chartGroup.attr('transform', currentTransform)
    })

  svg.call(zoom)
}

// 调整图表尺寸
const adjustChartSize = () => {
  if (!chartRef.value || !svg) return

  // 获取新的容器尺寸
  const newWidth = userStore.isMobile
    ? chartRef.value.clientWidth * 1.75
    : chartRef.value.clientWidth
  const newHeight = chartRef.value.clientHeight

  // 只有当尺寸真的发生变化时才更新
  if (newWidth !== chartWidth || newHeight !== chartHeight) {
    chartWidth = newWidth
    chartHeight = newHeight

    // 更新SVG尺寸
    svg.attr('width', chartWidth).attr('height', chartHeight)

    // 重新计算布局并渲染图表
    renderChart()
  }
}

// 渲染图表
const renderChart = () => {
  // 清除旧元素
  chartGroup.selectAll('*').remove()
  // console.log('treeData', treeData.value)

  // 加工原始数据(删除要折叠的节点的子节点)
  if (!treeData.value) return
  const foldedData = removeFoldedNodes(treeData.value)

  let sizeFactor = 1

  try {
    sizeFactor = calculateDynamicTreeSize(foldedData)
    // console.log('sizeFactor', sizeFactor)
  } catch (err) {
    console.log(err)
  }

  root = d3.hierarchy(foldedData)
  // console.log('初始化', root)

  const treeLayout = d3.tree().size([chartHeight * sizeFactor, chartWidth * sizeFactor]) // 根据树的大小决定sizeFactor的大小调整树占据的尺寸

  treeLayout(root as d3.HierarchyNode<unknown>)

  // console.log('calculateDynamicTreeSize', calculateDynamicTreeSize(root))

  const svgDimensions = calculateSVGDimensions()

  if (!svgDimensions) return

  // 应用初始缩放
  applyInitialZoom(svgDimensions)

  // 绘制路径
  chartGroup
    .selectAll('.link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr(
      'd',
      d3
        .linkHorizontal<d3.HierarchyLink<unknown>, d3.HierarchyPointNode<unknown>>()
        .x((d) => d.y)
        .y((d) => d.x)
    )

  // 创建节点组
  const node = chartGroup
    .selectAll('.node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', (d: any) => `translate(${d.y},${d.x})`)

  // 展开的节点
  const foldedNodes = node.filter((d: any) => d.data.isFolded === 0 && d.data.children.length > 0)

  // 绘制灰色圆形按钮
  foldedNodes
    .append('circle')
    .attr('r', 12) // 圆半径
    .attr('transform', (d: any) => `translate(${(getTextWidth(d.data.name) + 48) / 2}, 0)`) // 定位到文本右侧
    .attr('fill', (d: any) => colorMap[d.data.frequency])
    .attr('class', 'unfolded-circle')
    .style('cursor', 'pointer')
    .on('click', clickBtn)

  // 用path绘制减号（水平直线）
  foldedNodes
    .append('path')
    .attr('d', () => {
      const r = 12
      const lineLength = r * 1.2 // 减号长度（半径的1.2倍）
      const startX = -lineLength / 2 // 线段起点X（左）
      const endX = lineLength / 2 // 线段终点X（右）
      // 路径指令：M（起点）到 L（终点）的水平直线（Y坐标为0，居中）
      return `M ${startX} 0 L ${endX} 0`
    })
    // 定位：和圆形使用相同的X坐标，确保在圆中心
    .attr('transform', (d: any) => `translate(${(getTextWidth(d.data.name) + 48) / 2}, 0)`)
    .style('pointer-events', 'none') // 减号不拦截点击（点击穿透到圆形）
    .on('click', clickBtn)

  // 折叠的节点
  node
    .filter((d: any) => d.data.isFolded > 0)
    .append('circle')
    .attr('r', (d: any) => (d.data.isFolded < 100 ? 14 : 16))
    .attr('transform', (d: any) => `translate(${(getTextWidth(d.data.name) + 60) / 2}, 0)`)
    .attr('class', 'folded-circle')
    .style('cursor', 'pointer')
    .on('click', clickBtn)

  // 在圆形内部添加文本
  node
    .filter((d: any) => d.data.isFolded > 0) // 同样只给isFolded>0的节点添加文本
    .append('text')
    .attr('class', 'folded-circle-text')
    .attr('transform', (d: any) => `translate(${(getTextWidth(d.data.name) + 60) / 2}, 0)`) // 和圆形位置一致
    .attr('dy', '.35em')
    .text((d: any) => d.data.isFolded) // 显示isFolded的值
    .style('pointer-events', 'none')
    .on('click', clickBtn)

  // 内层可见矩形
  node
    .append('rect')
    .attr('class', 'content-rect')
    .attr('width', (d: any) => {
      // console.log(d.data.name)
      const width = getTextWidth(d.data.name)
      return width + 15
    })
    .attr('height', 30)
    .attr('rx', 10) // 圆角
    .attr('ry', 10)
    .attr('transform', (d: any) => `translate(-${(getTextWidth(d.data.name) + 15) / 2}, -15)`) // 居中于外层矩形左侧
    .attr('stroke', (d: any) => {
      if (d.data.isRoot) return '#191919'
      return colorMap[d.data.frequency]
    })
    .style('cursor', 'pointer')
    .on('contextmenu', (e: any, d: any) => openCustMenu(e, 'node', d.data))
    .on('click', (e: any, d: any) => openCustMenu(e, 'node', d.data))

  // 添加文本标签
  node
    .append('text')
    .attr('dy', '.35em')
    .style('text-anchor', 'middle')
    .text((d: any) => d.data.name)
    .style('pointer-events', 'none')
    .on('contextmenu', (e: any, d: any) => openCustMenu(e, 'node', d.data))
    .on('click', (e: any, d: any) => openCustMenu(e, 'node', d.data))
}

onUnmounted(() => {
  saveData()
  d3.select(chartRef.value).selectAll('*').remove()

  if (resizeObserver.value) resizeObserver.value.disconnect()
})

const clickBtn = (_: MouseEvent, d: any) => {
  if (!treeData.value) return
  treeData.value = toggleFoldedNodes(treeData.value, d.data)
  renderChart()
}

// 计算SVG实际需要的尺寸（根据树的大小动态调整）
const calculateSVGDimensions = () => {
  if (!root) return
  const descendants = root.descendants()
  // console.log('descendants', descendants)
  const minX = d3.min(descendants, (d) => d.x)
  const maxX = d3.max(descendants, (d) => d.x)
  const minY = d3.min(descendants, (d) => d.y)
  const maxY = d3.max(descendants, (d) => d.y)

  // 计算需要的额外空间
  const extraWidth = Math.max(0, maxY! - minY! - chartWidth)
  const extraHeight = Math.max(0, maxX! - minX! - chartHeight + 500)
  // console.log(extraWidth, extraHeight)

  return {
    width: chartWidth + extraWidth,
    height: chartHeight + extraHeight,
  }
}

const applyInitialZoom = (svgDimensions: any) => {
  const scale = Math.min(chartWidth / svgDimensions.width, chartHeight / svgDimensions.height) // 留出边距

  let translateX = (chartWidth - svgDimensions.width * scale) / 2 - 100
  let translateY = (chartHeight - svgDimensions.height * scale) / 2

  if (!root) return
  if (treeData.value && root.data.children.length <= 0) {
    // 向右移动200px
    const rootOffset = 200
    translateX += rootOffset
    translateY -= rootOffset
  }

  currentTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale * 1.1)

  // 平滑过渡到初始视图
  chartGroup.attr('transform', currentTransform)

  // 更新缩放行为的状态
  svg.call(zoom.transform, currentTransform)
}

// 菜单
const showCustMenu = ref<'node' | 'normal'>('node')
const position = ref<{ x: number; y: number }>({ x: 0, y: 0 })

// 打开菜单
const openCustMenu = (e: MouseEvent, type: 'node' | 'normal', node?: TreeNode) => {
  e.stopPropagation()
  e.preventDefault()
  position.value = {
    x: e.clientX + props.mouseFacter.x,
    y: e.clientY + props.mouseFacter.y,
  }
  showCustMenu.value = type

  if (type === 'node' && node) {
    mindmapStore.selectedNode = node
  }
}

// 打开对话框
const openDialog = (type: string) => {
  userStore.showDialog = type
}

// 选中节点
const selectNode = async () => {
  userStore.showDialog = ''
  await router.push({ name: '每日刷题' })
  sessionStore.surroundingPoint = mindmapStore.selectedNode!.name
  sessionStore.mainArea =
    userStore.areaList.find((item) => item.areaId === mindmapStore.selectedAreaId) || {}

  // console.log(sessionStore.mainArea, sessionStore.surroundingPoint)
  sessionStore.markNode = true
}

// 取消更改
const resetView = async () => {
  await updateData()
  renderChart()
  isEdited.value = false
}

// 添加节点
const addNodes = (data: { name: string; frequency: number }[]) => {
  // console.log('添加节点', data)
  const dataArray = Array.isArray(data) ? data : [data]
  const newNodes = dataArray.map((node) => ({
    id: uuidv4(),
    name: node.name,
    children: [],
    isFolded: 0,
    frequency: node.frequency,
    markId: null,
    chatId: null,
  }))
  // console.log('newNodes', newNodes)
  if (!treeData.value) return
  treeData.value = addChildrenById(treeData.value, mindmapStore.selectedNode!.id, newNodes)
  renderChart()
  isEdited.value = true
}

// 修改节点
const editNode = (data: { name: string; rating: number }) => {
  // console.log('editNode', data)
  if (!treeData.value) return
  treeData.value = modifyNode(treeData.value, mindmapStore.selectedNode!.id, data.name, data.rating)
  renderChart()
  isEdited.value = true
}

// 删除节点
const deleteNode = async () => {
  if (!treeData.value) return
  const resTree = deleteNodeById(treeData.value, mindmapStore.selectedNode!.id)
  if (resTree === null) {
    try {
      await userStore.deleteArea()
      ElMessage({
        message: '已删除该领域',
        type: 'info',
      })
    } catch (error) {
      console.log(error)
    }
    return
  }
  treeData.value = resTree
  renderChart()
  isEdited.value = true
}

// 删除子节点
const deleteChildren = () => {
  if (!treeData.value) return
  treeData.value = deleteNodeById(treeData.value, mindmapStore.selectedNode!.id, 'children')
  renderChart()
  isEdited.value = true
}

// 开始对话
const startChat = async (chatId: number | null) => {
  if (mindmapStore.selectedNode!.isRoot) {
    ElMessage({
      message: '不能选择根节点',
      type: 'info',
    })
    return
  }

  // 该节点没有chatId则开启新对话
  if (chatId === null) {
    await router.push({ name: '每日刷题' })
    sessionStore.mainArea =
      userStore.areaList.find((item) => item.areaId === mindmapStore.selectedAreaId) || {}
    sessionStore.surroundingPoint = mindmapStore.selectedNode!.name
    // 记录当前节点的ID
    sessionStore.markNode = true
  }
  // 该节点有chatId则跳转
  else {
    router.push({
      name: '会话',
      params: { sessionId: chatId },
    })
  }
}

// 生成笔记
const startNote = async (id: string, markId: number | null) => {
  await router.push({ name: '笔记' })
  if (noteStore.sendState !== 'available') return
  noteStore.updateSelectKey({ id, markId })
  noteStore.getNoteData({ markId })
  noteStore.triggerComponent('openSelectedNode')
}

// store注册方法, 便于在Dialog组件中触发
mindmapStore.registerCallback('addNodes', addNodes)
mindmapStore.registerCallback('editNode', editNode)
mindmapStore.registerCallback('deleteNode', deleteNode)
mindmapStore.registerCallback('deleteChildren', deleteChildren)
mindmapStore.registerCallback('renderChart', renderChart)
mindmapStore.registerCallback('reloadChart', async () => {
  await updateData()
  renderChart()
})

defineExpose({
  saveData,
  updateData,
  renderChart,
})
</script>

<template>
  <div class="map-container" :style="style">
    <div
      ref="chartRef"
      class="chart-wrapper"
      @contextmenu.stop="(e) => openCustMenu(e, 'normal')"
    ></div>
  </div>

  <!-- 自定义菜单 -->
  <cust-menu
    v-model:show-cust-menu="showCustMenu"
    :position="position"
    :node="mindmapStore.selectedNode"
    @select-node="selectNode"
    @reset-view="resetView"
    @save-view="saveData"
    @ai-add-node="openDialog('aiAddNode')"
    @user-add-node="openDialog('userAddNode')"
    @edit-node="openDialog('editNode')"
    @delete-node="openDialog('deleteNode')"
    @delete-children="openDialog('deleteChildren')"
    @start-chat="startChat"
    @start-note="startNote"
  />
</template>

<style scoped lang="scss">
.map-container {
  overflow: hidden;

  :deep(.chart-wrapper) {
    width: 100%;
    height: 100%;

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
      font-size: 18.5px;
      font-family: 'Microsoft YaHei', 'SimHei', 'Heiti SC', sans-serif !important;
      fill: #222;
    }

    .node .unfolded-circle {
      stroke: none;
    }

    .node path {
      stroke: #fff;
      stroke-width: 2px;
    }

    .node .folded-circle {
      fill: #aaa;
    }

    .node .folded-circle-text {
      font: 20px sans-serif;
      fill: #fff;
      text-anchor: middle;
    }
  }
}
</style>
