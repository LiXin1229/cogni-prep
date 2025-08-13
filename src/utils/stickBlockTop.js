export const stickBlockTop = () => {
  const codeBlocks = document.querySelectorAll('pre');
  
  codeBlocks.forEach(block => {
    const header = block.querySelector('.code-block-header');
    if (!header) return;
    
    // 获取代码块和视口的位置关系
    const blockRect = block.getBoundingClientRect();
    const headerHeight = header.offsetHeight;
    
    // 条件：代码块顶部已滚动出视口，且底部未完全离开视口
    if (blockRect.top < 50 && blockRect.bottom > headerHeight + 100) {
      // 固定定位到视口顶部
      header.style.position = 'fixed';
      header.style.top = '55px';
      header.style.left = `${blockRect.left}px`;
      header.style.width = `${blockRect.width}px`;
      header.style.zIndex = '100';
      header.style.border = '1px solid var(--light-border-color-1)';
      header.style.borderBottom = 'none';
    } else {
      // 恢复默认样式
      header.style.position = '';
      header.style.top = '';
      header.style.left = '';
      header.style.width = '';
      header.style.zIndex = '';
      header.style.border = 'none';
    }
  });
};
