export const stickBlockTop = () => {
  const codeBlocks = document.querySelectorAll('pre');
  
  codeBlocks.forEach(block => {
    const header = block.querySelector('.code-block-header');
    if (!header) return;
    
    // 获取代码块和视口的位置关系
    const blockRect = block.getBoundingClientRect();
    const headerHeight = header.offsetHeight;
    
    // 检查是否已创建占位元素（避免重复创建）
    let placeholder = block.querySelector('.header-placeholder');
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.className = 'header-placeholder';
      placeholder.style.height = '0'; // 默认不占空间
      // 将占位元素插入到 header 前面（保持布局位置对应）
      block.insertBefore(placeholder, header);
    }
    
    // 条件：代码块顶部已滚动出视口，且底部未完全离开视口
    if (blockRect.top < 50 && blockRect.bottom > headerHeight + 75) {
      // 1. 固定定位 header
      header.style.position = 'fixed';
      header.style.top = '55px';
      header.style.left = `${blockRect.left}px`;
      header.style.width = `${blockRect.width}px`;
      header.style.zIndex = '100';
      header.style.border = '1px solid var(--light-border-color-1)';
      header.style.borderBottom = 'none';
      
      // 2. 用占位元素补偿空间（关键：设置与 header 等高的高度）
      placeholder.style.height = `${headerHeight}px`;
    } else {
      // 1. 恢复 header 默认样式
      header.style.position = '';
      header.style.top = '';
      header.style.left = '';
      header.style.width = '';
      header.style.zIndex = '';
      header.style.border = 'none';
      
      // 2. 清除占位空间
      placeholder.style.height = '0';
    }
  });
};
