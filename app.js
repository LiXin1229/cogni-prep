const express = require('express')
const app = express()
const handleError = require('./utils/handleError.js')

const chatRouter = require('./router/chat/index.js')

// 解析 token 的中间件 (以 /login 开头的 以及 下载头像的 不需要检验 token)
// const secretKey = 'isomer 1229 ^.^'
// app.use(expressjwt({ secret: secretKey, algorithms: ['HS256'] }).unless({ path: [/^\/users\//, /^\/upload\//] }))

// 配置解析表单数据的中间件
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// 错误处理中间件
app.use(handleError)

app.use('/chat', chatRouter)

const port = 8000
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
