<script setup lang="ts">
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { onMounted, ref } from 'vue'

const typeTitle = ref('')

const typeText = (text: string) => {
  for (let i = 0; i < text.length; i++) {
    setTimeout(() => {
      typeTitle.value += text[i]
    }, 50 * i)
  }
}

onMounted(() => {
  typeText('欢迎使用， 灵犀刷题')
})
</script>

<template>
  <div class="blank">
    <h1 class="title">{{ typeTitle }}</h1>

    <div class="layer">
      选择
      <div class="main-area">
        领域
      </div>

      限定
      <div class="surrounding-point">
        范围
      </div>
    </div>

    <div class="layer">
      点击
      <div class="nextquestion">
        <img src="../assets/svgs/next.svg" alt="" class="icon"></img>
        <div class="text">下一题</div>
      </div>
      开始出题
    </div>

    <div class="layer">
      点击
      <div class="send-btn">
        <font-awesome-icon :icon="faPaperPlane" class="icon" />
      </div>
      回答问题
    </div>

    <div class="layer">
      点击题目下方的
      <div class="btn help">
        <img src="../assets/svgs/help.svg" alt="" class="icon">
      </div>
      获取帮助
    </div>
  </div>
</template>

<style scoped lang="scss">
.blank {
  .title {
    margin-bottom: 25px;
  }

  .layer {
    display: flex;
    margin: 10px 0;
    align-items: center;
  }

  .main-area {
    background-color: var(--main-bgc);
    padding: 5px 10px;
    border: 1px solid var(--light-blue-color);
    color: var(--main-color);
    border-radius: 10px;
    margin-right: 15px;
    transform: scale(0.8);
  }

  .surrounding-point {
    padding: 5px 10px;
    border: 1px solid var(--light-border-color-1);
    border-radius: 10px;
    color: var(--text-color-4);
    transform: scale(0.8);

    &:hover {
      background-color: var(--uesr-bubble-bgc);
    }
  }

  .nextquestion {
    font-size: 15px;
    color: var(--main-color);
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px 2px 6px;
    border: 1.5px solid var(--main-color);
    border-radius: 50px;
    transform: scale(0.8);

    .icon {
      width: 17px;
      height: 17px;
    }

    .text {
      transform: translateY(-5%);
    }
  }

  .send-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--main-color);
    position: relative;
    transform: scale(0.8);
    margin: 0 5px;

    .icon {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 17px;
      transform: translate(-60%, -60%);
      color: #fff;
    }
  }

  .btn {
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 5px;
    margin: 0 5px;

    &:hover {
      background-color: var(--btn-hover);
    }
  }

  .icon {
    width: 20px;
    height: 20px;
  }
}
</style>
