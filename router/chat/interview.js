const express = require('express')
const router = express.Router()
const { sendToMainAIStream, sendSpareAIStream } = require('../../utils/useDeepseekStream')
const { useUserSentence, useSystemSentence } = require('../../utils/sentence')
const pool = require('../../db')

const MSG_TYPE = {
  'user': 0, // 用户发言
  'question': 1, // AI提问
  'evaluation': 2, // AI评价
  'help': 3 // AI帮助
}

// const funcType = ['标准', '@回答模板 ', '@标准答案 ', '@模板+答案 ']

// 开始提问
router.post('/start', async (req, res) => {
  const { sessionId, mainArea, surroundingPoint, customContent, areaId } = req.body
  // console.log('sessionId', sessionId)

  let isLongTerm = false
  if (!surroundingPoint) isLongTerm = true
  
  // 获取上下文
  const questions = await getContext(isLongTerm, sessionId, areaId)
  // console.log('questions', questions)

  let content = ''
  if (questions.length > 0) {
    content = `已经问过的问题：【${questions.join('；').toString()}】。开始下一个问题${customContent ? `，${customContent}。` : '。'}`
  } else {
    content = `开始下一个问题${customContent ? `，${customContent}。` : '。'}`
  }

  let system = ''
  if (isLongTerm) {
    system = useSystemSentence('longterm', mainArea, surroundingPoint)
  } else {
    system = useSystemSentence('startquest', mainArea, surroundingPoint)
  }

  try {
    // 设置响应头，告诉前端这是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const response = await sendToMainAIStream(system, content)
    // console.log(response)

    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`)
    }

    // 获取响应的可读流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    // 监听客户端断开连接
    req.on('close', () => {
      console.log('Client disconnected, canceling stream')
      reader.cancel() // 取消读取流
    })

    // 循环读取流数据
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        res.write('data: [DONE]\n\n')
        res.end()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        // console.log('line', line)
        const dataStr = line.replace(/^data: /, '')
        
        if (dataStr === '[DONE]') {
          res.write(`data: ${dataStr}\n\n`)
          res.end()
          return
        }
        
        try {
          const data = JSON.parse(dataStr)
          if (data.choices && data.choices[0]?.delta?.content) {
            // console.log('AI返回结果', data.choices[0].delta.content)
            // 直接写入数据，流会自动处理缓冲
            res.write(`data: ${JSON.stringify({
              content: data.choices[0].delta.content
            })}\n\n`)
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e)
        }
      }
    }
  } catch (error) {
    useSpareAI(res, system, content)
    console.log(error)
  }
})

// 用户回答提问
router.post('/answer', async (req, res) => {
  const { sessionId, question, answer, mainArea } = req.body

  const system = useSystemSentence('answer', mainArea, question)
  const content = useUserSentence('answer', answer)

  try {
    // 设置响应头，告诉前端这是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const response = await sendToMainAIStream(system, content)
    // console.log(response)

    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`)
    }

    // 获取响应的可读流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    // 监听客户端断开连接
    req.on('close', () => {
      console.log('Client disconnected, canceling stream')
      reader.cancel() // 取消读取流
    })

    // 循环读取流数据
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        res.write('data: [DONE]\n\n')
        res.end()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        // console.log('line', line)
        const dataStr = line.replace(/^data: /, '')
        
        if (dataStr === '[DONE]') {
          res.write(`data: ${dataStr}\n\n`)
          res.end()
          return
        }
        
        try {
          const data = JSON.parse(dataStr)
          if (data.choices && data.choices[0]?.delta?.content) {
            // console.log('AI返回结果', data.choices[0].delta.content)
            // 直接写入数据，流会自动处理缓冲
            res.write(`data: ${JSON.stringify({
              content: data.choices[0].delta.content
            })}\n\n`)
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e)
        }
      }
    }
  } catch (error) {
    useSpareAI(res, system, content)
    console.log(error)
  }
})

// 用户获取答题帮助
router.post('/help', async (req, res) => {
  const { question, funcType, customContent, mainArea } = req.body

  const system = useSystemSentence('help', funcType, mainArea, question)
  const content = useUserSentence('help', funcType, customContent)

  try {
    // 设置响应头，告诉前端这是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const response = await sendToMainAIStream(system, content)
    // console.log(response)

    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`)
    }

    // 获取响应的可读流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    // 监听客户端断开连接
    req.on('close', () => {
      console.log('Client disconnected, canceling stream')
      reader.cancel() // 取消读取流
    })

    // 循环读取流数据
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        res.write('data: [DONE]\n\n')
        res.end()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        // console.log('line', line)
        const dataStr = line.replace(/^data: /, '')
        
        if (dataStr === '[DONE]') {
          res.write(`data: ${dataStr}\n\n`)
          res.end()
          return
        }
        
        try {
          const data = JSON.parse(dataStr)
          if (data.choices && data.choices[0]?.delta?.content) {
            // console.log('AI返回结果', data.choices[0].delta.content)
            // 直接写入数据，流会自动处理缓冲
            res.write(`data: ${JSON.stringify({
              content: data.choices[0].delta.content
            })}\n\n`)
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e)
        }
      }
    }
  } catch (error) {
    useSpareAI(res, system, content)
    console.log(error)
  }
})

// 获取曾经问过的问题
const getContext = async (isLongTerm, sessionId, areaId) => {
  let questions = []

  if (isLongTerm) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM questions WHERE area_id = ?',
        [areaId]
      )
      // console.log('查询结果:', rows)

      rows.forEach(row => questions.push(row.question))
    } catch (err) {
      console.log(err)
      throw err
    }
  } else {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM chats WHERE session_id = ?',
        sessionId
      )
      // console.log('查询结果:', rows)

      rows.forEach(row => {
        if (row.message_type === MSG_TYPE['question'] && row.point) {
          questions.push(row.point)
        }
      })
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  return questions
}

const useMainAI = async (res, system, content) => {
  const response = await sendToMainAIStream(system, content)

  if (!response.ok) {
    throw new Error(`Doubao API request failed: ${response.statusText}`)
  }

  try {
    // 获取响应的可读流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        res.write('data: [DONE]\n\n')
        res.end()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        // console.log('line', line) keep-alive
        const dataStr = line.replace(/^data: /, '')
        
        if (dataStr === '[DONE]') {
          res.write(`data: ${dataStr}\n\n`)
          res.end()
          return
        }
        
        try {
          const data = JSON.parse(dataStr)
          if (data.choices && data.choices[0]?.delta?.content) {
            // console.log('AI返回结果', data.choices[0].delta.content)
            // 直接写入数据，流会自动处理缓冲
            res.write(`data: ${JSON.stringify({
              content: data.choices[0].delta.content
            })}\n\n`)
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e)
        }
      }
    } 
  } catch (err) {
    console.log(err)
  }
}

const useSpareAI = async (res, system, content) => {
  const response = await sendSpareAIStream(system, content)

  if (!response.ok) {
    throw new Error(`Doubao API request failed: ${response.statusText}`)
  }

  try {
    // 获取响应的可读流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        res.write('data: [DONE]\n\n')
        res.end()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        // console.log('line', line) keep-alive
        const dataStr = line.replace(/^data: /, '')
        
        if (dataStr === '[DONE]') {
          res.write(`data: ${dataStr}\n\n`)
          res.end()
          return
        }
        
        try {
          const data = JSON.parse(dataStr)
          if (data.choices && data.choices[0]?.delta?.content) {
            // console.log('AI返回结果', data.choices[0].delta.content)
            // 直接写入数据，流会自动处理缓冲
            res.write(`data: ${JSON.stringify({
              content: data.choices[0].delta.content
            })}\n\n`)
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e)
        }
      }
    } 
  } catch (err) {
    console.log(err)
    res.errHandle('请求失败')
  }
}

module.exports = router
