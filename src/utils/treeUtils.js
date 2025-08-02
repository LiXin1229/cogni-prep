// 展开或折叠节点
export const toggleFoldedNodes = (treeData, node) => {
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
export const addChildrenById = (treeData, parentId, newNodes) => {
  const newTree = JSON.parse(JSON.stringify(treeData))
  // 统一处理为数组，方便后续操作
  const nodesToAdd = Array.isArray(newNodes) ? newNodes : [newNodes]

  // 定义递归函数（处理单个节点及其子节点）
  const findAndAdd = (node) => {
    // 若当前节点是目标父节点，添加子节点
    if (node.id === parentId) {
      // 确保 children 存在（避免 undefined.push 错误）
      if (!node.children) node.children = []
      // 添加所有节点（单个或多个）
      node.children.push(...nodesToAdd)
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

  // 从根节点开始查找
  const isAdded = findAndAdd(newTree)

  // 返回添加结果：若成功，返回修改后的新树；否则返回 null
  return isAdded ? newTree : null
}

export const modifyNode = (treeData, targetId, newName, newFrequency) => {
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

export const deleteNodeById = (treeData, targetId, mode = 'node') => {
  const newTree = JSON.parse(JSON.stringify(treeData));

  // 递归查找并删除节点
  const traverse = (parentNode) => {
    if (!parentNode.children || parentNode.children.length === 0) {
      return false;
    }

    for (let i = 0; i < parentNode.children.length; i++) {
      const currentNode = parentNode.children[i];
      
      // 找到目标节点
      if (currentNode.id === targetId) {
        if (mode === 'node') {
          // 模式1：删除节点本身（及其子节点）
          parentNode.children.splice(i, 1);
        } else if (mode === 'children') {
          // 模式2：仅删除节点的所有子节点（保留节点本身）
          currentNode.children = []; // 清空子节点数组
        }
        return true;
      }

      // 递归查找子节点
      const isDeleted = traverse(currentNode);
      if (isDeleted) {
        return true;
      }
    }

    return false;
  }

  // 处理根节点特殊情况
  if (newTree.id === targetId) {
    if (mode === 'node') {
      // 若删除根节点，返回空对象（或根据业务需求返回默认根节点）
      return {};
    } else if (mode === 'children') {
      // 清空根节点的子节点
      newTree.children = [];
      return newTree;
    }
  }

  // 从根节点的子节点开始查找
  traverse(newTree);

  return newTree;
}

// 查找祖先节点
export const findAncestorsById = (treeData, targetId) => {
  // 存储查找结果
  const result = {
    parent: null,
    grandparent: null
  };

  // 递归遍历树结构
  function traverse(node, parentNode, grandparentNode) {
    // 若当前节点是目标节点，记录其父节点和爷节点
    if (node.id === targetId) {
      result.parent = parentNode;
      result.grandparent = grandparentNode;
      return true; // 找到目标，终止递归
    }

    // 若当前节点有子节点，继续递归查找
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        // 递归时更新父节点为当前节点，爷节点为当前节点的父节点
        const found = traverse(child, node, parentNode);
        if (found) return true; // 找到后终止遍历
      }
    }

    return false; // 未找到目标节点
  }

  // 从根节点开始遍历（根节点的父节点和爷节点均为null）
  traverse(treeData, null, null);

  return result;
};

// 修改树结构中指定ID节点的属性
export const modifyTreeNodeProp = (treeData, targetId, propName, propValue) => {
  // console.log('函数内部', treeData, targetId, propName, propValue)
  // 深拷贝原树，避免修改源数据
  const newTree = JSON.parse(JSON.stringify(treeData));

  // 递归查找并修改节点属性
  const traverse = (node) => {
    // 找到目标节点
    if (node.id === targetId) {
      // 修改指定属性（支持新增属性）
      node[propName] = propValue;
      return true; // 标记已找到并修改
    }

    // 若有子节点，递归查找
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const found = traverse(child);
        if (found) return true; // 找到后终止遍历
      }
    }

    return false; // 未找到目标节点
  };

  // 从根节点开始查找
  traverse(newTree);

  return newTree;
}
