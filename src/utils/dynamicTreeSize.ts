import type { TreeNode } from '@/stores/types/mindmap.type'

/**
 * 计算任意树结构的合理size值
 * @param {Object} tree 树结构的根节点
 * @param {Object} options 配置选项
 * @param {number} options.minSize 最小size值，默认0.5
 * @param {number} options.maxSize 最大size值，默认5
 * @param {number} options.depthWeight 树深度的权重，默认0.3
 * @param {number} options.densityWeight 节点密度的权重，默认0.7
 * @returns {number} 计算出的size值
 */
export const calculateDynamicTreeSize = (tree: TreeNode, options = {}) => {
  // 合并默认配置
  const config = {
    minSize: 0.8,
    maxSize: 8,
    depthWeight: 0.25,
    densityWeight: 0.75,
    ...options
  }

  // 计算树的基本属性
  const treeStats = analyzeTreeStructure(tree)
    
  // 计算深度因子（基于树的最大深度）
  const depthFactor = Math.min(1 + (treeStats.maxDepth - 1) * 0.36, 10)
    
  // 计算密度因子（基于节点分布密度）
  // 密度 = 总节点数 / 最大深度，归一化到0-3范围
  const density = treeStats.totalNodes / treeStats.maxDepth
  const densityFactor = Math.min(1 + (density - 1) * 0.12, 6)
    
  // 计算分支因子（基于平均子节点数）
  // 平均子节点数越多，需要的空间越大
  const branchFactor = Math.min(1 + (treeStats.avgChildren - 1) * 0.3, 5)

  const countFactor = Math.max(1, treeStats.totalNodes * 0.003 + 0.8)
    
  // 综合计算基础size
  let baseSize = 1
  baseSize *= (depthFactor * config.depthWeight)
  baseSize *= (densityFactor * config.densityWeight)
  baseSize *= branchFactor
  baseSize *= countFactor
    
  // 确保size在合理范围内
  const finalSize = Math.max(
    config.minSize, 
    Math.min(baseSize, config.maxSize)
  )
    
  // 保留两位小数
  return Math.round(finalSize * 100) / 100
}

/**
 * 分析树结构，获取关键统计信息
 * @param {Object} tree 树的根节点
 * @returns {Object} 包含树统计信息的对象
 */
const analyzeTreeStructure = (tree: TreeNode) => {
  let totalNodes = 0
  let maxDepth = 0
  let totalChildren = 0
  let nodesWithChildren = 0

  // 递归遍历树
  const traverse = (node: TreeNode, currentDepth: number) => {
    totalNodes++
        
    // 更新最大深度
    if (currentDepth > maxDepth) {
      maxDepth = currentDepth;
    }
        
    // 检查是否有子节点
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      totalChildren += node.children.length;
      nodesWithChildren++;
            
      // 递归处理子节点
      node.children.forEach(child => {
        traverse(child, currentDepth + 1)
      })
    }
  }
    
  // 从根节点开始遍历，根节点深度为1
  traverse(tree, 1)

  // 计算平均子节点数（避免除以0）
  const avgChildren = nodesWithChildren > 0  ? totalChildren / nodesWithChildren : 0
  
  return {
    totalNodes,         // 总节点数
    maxDepth,           // 树的最大深度
    totalChildren,      // 所有节点的子节点总数
    nodesWithChildren,  // 有子节点的节点数量
    avgChildren         // 平均每个节点的子节点数
  }
}