<script setup lang="ts">
defineProps({
  showDialog: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="quote-mindmap">
    <cust-dialog title="选择图中节点" :exitBottom="false" :visible="showDialog">
      <div class="content">
        <mind-map :style="{ height: '100%' }" :mouseFacter="{ x: -150, y: -40 }" />
      </div>
    </cust-dialog>
  </div>
</template>

<style scoped lang="scss">
.quote-mindmap {
  .content {
    width: 80vw;
    height: 80vh;
    padding-top: 10px;
  }
}
</style>
