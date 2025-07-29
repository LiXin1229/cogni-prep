export const getTextWidth = (text, style = {}) => {
  // 1. 创建临时元素（不会显示在页面上）
  const tempSpan = document.createElement('span');
  
  // 2. 设置文本内容
  tempSpan.textContent = text;
  
  // 3. 设置隐藏样式（不占据布局，不显示）
  tempSpan.style.position = 'absolute'; // 脱离文档流
  tempSpan.style.left = '-9999px'; // 移到可视区域外
  tempSpan.style.top = '-9999px';
  tempSpan.style.visibility = 'hidden'; // 隐藏但保留尺寸计算
  tempSpan.style.whiteSpace = 'nowrap'; // 禁止文本换行（确保单行宽度）
  tempSpan.style.overflow = 'hidden'; // 防止溢出影响测量
  
  // 4. 应用自定义样式（与目标文本保持一致）
  // 默认样式（可根据需求调整）
  const defaultStyle = {
    fontSize: '20px',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    letterSpacing: 'normal'
  };
  // 合并默认样式和用户传入样式
  const finalStyle = { ...defaultStyle, ...style };
  // 批量设置样式
  Object.keys(finalStyle).forEach(key => {
  // 检查是否是有效的CSS属性（排除数字索引）
  if (isNaN(Number(key)) && typeof key === 'string' && key.trim() !== '') {
    // 尝试设置样式，捕获可能的错误
    try {
      tempSpan.style[key] = finalStyle[key];
    } catch (e) {
      console.warn(`无法设置样式属性 ${key}:`, e);
    }
  }
});
  
  // 5. 插入到页面（必须插入DOM树才能触发渲染计算）
  document.body.appendChild(tempSpan);
  
  // 6. 获取宽度（offsetWidth 包含内容+内边距，clientWidth 仅内容，这里用 offsetWidth 更准确）
  const width = tempSpan.offsetWidth;
  
  // 7. 移除临时元素（清理DOM）
  document.body.removeChild(tempSpan);
  
  return width;
}