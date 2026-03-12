export function isMobileDevice(): boolean {
  // 检查 UA
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(
      navigator.userAgent
    )

  // 检查是否支持触摸（且不是仅鼠标）
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // 检查屏幕是否较小
  // const isSmallScreen = window.innerWidth <= 768

  // 组合判断：UA 是移动设备，或有触摸
  // console.log('是否是移动设备: ', isMobileUA || hasTouch)
  return isMobileUA || hasTouch
}
