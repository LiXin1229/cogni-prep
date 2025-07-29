// 展开或折叠节点
export const toggleFoldedNodes = (treeData, node) => {
  // 深拷贝数据以避免修改原对象
  const newTreeData = JSON.parse(JSON.stringify(treeData));

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
export const removeFoldedNodes = (node) => {
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
export const addChildrenById = (treeData, parentId, newNode) => {
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

export const modifyNode = (treeData, targetId, newName, newFrequency) => {
  // 深拷贝原对象，避免修改源数据
  const newTree = JSON.parse(JSON.stringify(treeData));
  
  // 递归查找并修改节点
  const traverse = (node) => {
    if (node.id === targetId) {
      // 找到目标节点，更新属性
      node.name = newName;
      node.frequency = newFrequency;
      return true; // 标记已找到并修改
    }
    
    // 如果有子节点，递归查找
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (traverse(child)) {
          return true; // 找到后停止递归
        }
      }
    }
    
    return false; // 未找到目标节点
  }
  
  // 从根节点开始查找
  traverse(newTree);
  
  return newTree;
}

export const deleteNodeById = (treeData, targetId) => {
  // 深拷贝原对象，避免修改源数据
  const newTree = JSON.parse(JSON.stringify(treeData));

  // 递归查找并删除节点
  function traverse(parentNode) {
    // 如果当前父节点没有子节点，直接返回
    if (!parentNode.children || parentNode.children.length === 0) {
      return false;
    }

    // 遍历子节点，查找目标ID
    for (let i = 0; i < parentNode.children.length; i++) {
      const currentNode = parentNode.children[i];
      
      // 找到目标节点：从父节点的children中删除该节点（及其子节点）
      if (currentNode.id === targetId) {
        parentNode.children.splice(i, 1); // 从数组中移除当前节点
        return true; // 标记已删除，终止后续查找
      }

      // 未找到目标节点，递归遍历当前节点的子节点
      const isDeleted = traverse(currentNode);
      if (isDeleted) {
        return true; // 子节点中已删除，终止上层遍历
      }
    }

    // 遍历完所有子节点仍未找到
    return false;
  }

  // 从根节点的子节点开始查找（根节点本身一般不删除，除非明确需要）
  // 如果要允许删除根节点，可添加判断：if (newTree.id === targetId) return {};
  traverse(newTree);

  return newTree;
}
