export const clickOutside = {
  beforeMount(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event) // 执行绑定的回调函数
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

export const resizableDirective = {
  mounted(el) {
    let init
    let initWidth
    const parent = el.parentElement

    const startResize = (e) => {
      const end = e.clientX

      const newWidth = end - init + initWidth
      parent.style.width = newWidth + "px"
    }

    const stopResize = () => {
      document.removeEventListener('mousemove', startResize)
      document.removeEventListener('mouseup', stopResize)
    }

    el.addEventListener('mousedown', (e) => {
      init = e.clientX
      initWidth = parent.offsetWidth

      document.addEventListener('mousemove', startResize)
      setTimeout(() => {
        document.addEventListener('mouseup', stopResize)
      }, 10)
    })
  }
}
