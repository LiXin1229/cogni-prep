<script setup lang="ts">
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
    z-index: 10;
    box-shadow: 0 2px 8px var(--box-shadow-color);
  }
}
</style>
