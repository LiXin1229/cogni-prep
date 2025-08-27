const express = require('express')
const app = express()
const handleError = require('./utils/handleError.js')
const { expressjwt } = require('express-jwt')
const cors = require('cors')

const userRouter = require('./router/user/index.js')
const chatRouter = require('./router/chat/index.js')
const mindmapRouter = require('./router/mindmap/index.js')
const noteRouter = require('./router/note/index.js')
const perferRouter = require('./router/perfer/index.js')

app.use(cors({ 
  origin: 'http://47.108.61.196',
  methods: ['GET', 'POST', 'OPTIONS'], // 指定允许的HTTP方法
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // 指定允许的请求头
  maxAge: 86400 // 预检请求的结果缓存24小时（86400秒）
}))

const secretKey = 'isomer 1229 ^.^'
app.use(expressjwt({ secret: secretKey, algorithms: ['HS256'] }).unless({ path: [/^\/user\//] }))

// 配置解析表单数据的中间件
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// 错误处理中间件
app.use(handleError)

app.use('/user', userRouter)
app.use('/chat', chatRouter)
app.use('/mindmap', mindmapRouter)
app.use('/note', noteRouter)
app.use('/perfer', perferRouter)

const port = 8000
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
