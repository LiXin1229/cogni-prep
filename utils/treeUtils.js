// 修改树结构中所有chatId等于指定数值的节点，将其chatId设为null
const modifyTreeNodeChatId = (treeData, targetNumber) => {
  // 深拷贝原树，避免修改源数据
  const newTree = JSON.parse(JSON.stringify(treeData));

  // 递归遍历所有节点
  const traverse = (node) => {
    // 检查当前节点是否有chatId属性且值等于目标数值
    if (node.chatId === targetNumber) {
      node.chatId = null;
    }

    // 若有子节点，递归处理子节点
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  };

  // 处理树结构（兼容单根节点或多根节点数组）
  if (Array.isArray(newTree)) {
    // 多根节点情况，遍历每个根节点
    newTree.forEach(node => traverse(node));
  } else {
    // 单根节点情况，直接处理根节点
    traverse(newTree);
  }

  return newTree;
}

module.exports = {
  modifyTreeNodeChatId
}
