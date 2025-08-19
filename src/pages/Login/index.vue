<script setup>
import { reactive, ref } from 'vue'
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons'
import { verifyUsername, verifyPassword } from "@/utils/validate"
// import { securePassword } from "@/utils/securePassword"
import request from '@/utils/request'
import API from '@/utils/API'
import { useRouter } from 'vue-router'
import { useUserInfoStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserInfoStore()

const loginFormRef = ref(null)
const registerFormRef = ref(null)

const ruleForm =  reactive({
  username: '',
  password: ''
})

const rules = reactive({
  username: [{ validator: verifyUsername, trigger: "blur" }],
  password: [{ validator: verifyPassword, trigger: "blur" }],
})

const panelType = ref('login')

const switchPanel = (type) => {
  panelType.value = type
  Object.assign(ruleForm, { username: '', password: '' })
}

const submit = (formRef) => {
  if (panelType.value === 'login') {
    formRef.validate(async (valid) => {
      if (!valid) return

      const username = ruleForm.username
      // const { derivedKey } = await securePassword(ruleForm.password, username)
      const derivedKey = ruleForm.password

      const res = await request({
        url: API.login,
        method: 'POST',
        data: {
          username: username,
          password: derivedKey
        }
      })

      if (res.success) {
        userStore.userInfo = res.data.userInfo
        userStore.token = res.data.token
        // console.log('userStore.token', userStore.token)
        await userStore.getUserInfo()

        router.push('/')
      }
    })
  }
  else if (panelType.value === 'register') {
    formRef.validate(async (valid) => {
      if (!valid) return

      const username = ruleForm.username
      // const { derivedKey } = await securePassword(ruleForm.password, username)
      const derivedKey = ruleForm.password

      const res = await request({
        url: API.register,
        method: 'POST',
        data: {
          username: username,
          password: derivedKey
        }
      })

      if (res.success) {
        userStore.userInfo = res.data.userInfo
        userStore.token = res.data.token
        await userStore.getUserInfo()
        // userStore.showDialog = ''

        router.push('/')
      }
    })
  }
}
</script>

<template>
  <div class="login">
    <div class="login-panel panel" v-show="panelType === 'login'">
      <el-row justify="space-between" class="top">
        <el-col :span="6">
          <div class="title">登录</div>
        </el-col>
        <el-col :span="6" class="switch" @click="switchPanel('register')">
          <div class="switch">
            前往注册
            <font-awesome-icon :icon="faAngleRight" style="color: var(--theme-font-color2);" />
          </div>
        </el-col>
      </el-row>
      <div class="card">
        <el-form
          ref="loginFormRef"
          style="max-width: 600px"
          :model="ruleForm"
          :rules="rules"
          label-width="auto"
        >
          <el-form-item prop="username" class="form-item">
            <el-input v-model="ruleForm.username" placeholder="输入用户名" size="large" />
          </el-form-item>
          <el-form-item prop="password" class="form-item">
            <el-input v-model="ruleForm.password" placeholder="输入密码" type="password" show-password size="large" />
          </el-form-item>
        </el-form>

        <el-button type="primary" style=" width: 100%;" size="large" @click="submit(loginFormRef)">
          立即登录
        </el-button>
      </div>
    </div>

    <div class="register-panel panel" v-show="panelType === 'register'">
      <el-row justify="space-between" class="top">
        <el-col :span="6">
          <div class="title">注册</div>
        </el-col>
        <el-col :span="6" class="switch">
          <div class="switch" @click="switchPanel('login')">
            <font-awesome-icon :icon="faAngleLeft" style="color: var(--theme-font-color2);" />
            返回登录
          </div>
        </el-col>
      </el-row>
      <div class="card">
        <el-form
          ref="registerFormRef"
          style="max-width: 600px"
          :model="ruleForm"
          :rules="rules"
          label-width="auto"
        >
          <el-form-item prop="username" class="form-item">
            <el-input v-model="ruleForm.username" placeholder="输入用户名" size="large" />
          </el-form-item>
          <el-form-item prop="password" class="form-item">
            <el-input v-model="ruleForm.password" placeholder="输入密码" type="password" show-password  size="large" />
          </el-form-item>
        </el-form>

        <el-button type="primary" style=" width: 100%;" size="large" @click="submit(registerFormRef)">
          立即注册
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login {
  width: 100vw;
  height: 100vh;
  background-image: url('https://img.alicdn.com/imgextra/i3/O1CN01XPGaD31cwcc5WQBM2_!!6000000003665-0-tps-3840-2160.jpg');
  background-size: cover; /* 图片覆盖整个元素 */
  background-position: center; /* 图片居中 */
  background-repeat: no-repeat; /* 不重复图片 */
  background-attachment: fixed; /* 固定背景不随滚动条移动 */
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center;     /* 垂直居中 */

  .panel {
    width: 600px;
    padding: 30px 60px 40px 60px;
    background-color: #fbfbfb;

    .title {
      font-size: 30px;
      margin-bottom: 20px;
      font-weight: bold;
      color: var(--theme-color-1);
    }

    .switch {
      text-align: right;
      height: 48px;
      line-height: 48px;
      color: var(--text-color-4);
      cursor: default;
    }

    .card {
      .form-item {
        margin-bottom: 25px;
      }
    }
  }
}
</style>
