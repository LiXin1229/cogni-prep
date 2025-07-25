<script setup>
defineProps({
  position: {
    type: Object,
    default: () => ({
      top: '0px',
      left: '0px',
      right: '0px',
      bottom: '0px'
    })
  }
})
</script>

<template>
  <div class="cust-popup">
    <slot />

    <div class="popup" :style="position">
      <slot name="popup"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cust-popup {
  position: relative;

  .popup {
    position: absolute;
    // bottom: 60px;
    // left: -15px;
    z-index: 10;
  }
}
</style>
