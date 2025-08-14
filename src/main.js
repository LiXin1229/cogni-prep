import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import 'element-plus/dist/index.css'
import './styles/main.scss'

import { clickOutside, resizableDirective } from '@/utils/custDirective'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('font-awesome-icon', FontAwesomeIcon)
app.directive('click-outside', clickOutside) // 自定义指令
app.directive('resizable', resizableDirective) // 自定义指令

app.mount('#app')
