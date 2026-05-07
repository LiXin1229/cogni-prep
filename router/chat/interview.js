const express = require('express')
const router = express.Router()
const { sendToMainAIStream, sendSpareAIStream } = require('../../utils/useDeepseekStream')
const { useUserSentence, useSystemSentence } = require('../../utils/sentence')
const pool = require('../../db')

const MSG_TYPE = {
  'user': 0,
  'question': 1,
  'evaluation': 2,
  'help': 3
}

const setupSSEHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

const streamAIResponse = async (response, res, req) => {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  if (req) {
    req.on('close', () => {
      console.log('Client disconnected, canceling stream')
      reader.cancel()
    })
  }

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      if (buffer.trim()) {
        const dataStr = buffer.replace(/^data: /, '')
        if (dataStr === '[DONE]') {
          res.write('data: [DONE]\n\n')
        } else {
          try {
            const data = JSON.parse(dataStr)
            if (data.choices && data.choices[0]?.delta?.content) {
              res.write(`data: ${JSON.stringify({
                content: data.choices[0].delta.content
              })}\n\n`)
            }
          } catch (e) {
            console.error('Error parsing remaining buffer:', e)
          }
        }
      }
      res.write('data: [DONE]\n\n')
      res.end()
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.trim() === '') continue
      const dataStr = line.replace(/^data: /, '')

      if (dataStr === '[DONE]') {
        res.write(`data: ${dataStr}\n\n`)
        res.end()
        return
      }

      try {
        const data = JSON.parse(dataStr)
        if (data.choices && data.choices[0]?.delta?.content) {
          res.write(`data: ${JSON.stringify({
            content: data.choices[0].delta.content
          })}\n\n`)
        }
      } catch (e) {
        console.error('Error parsing stream chunk:', e)
      }
    }
  }
}

router.post('/start', async (req, res) => {
  const { sessionId, mainArea, surroundingPoint, customContent, areaId } = req.body

  let isLongTerm = false
  if (!surroundingPoint) isLongTerm = true

  const questions = await getContext(isLongTerm, sessionId, areaId)

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
    setupSSEHeaders(res)

    const response = await sendToMainAIStream(system, content)
    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`)
    }

    await streamAIResponse(response, res, req)
  } catch (error) {
    useSpareAI(res, system, content)
    console.log(error)
  }
})

router.post('/answer', async (req, res) => {
  const { sessionId, question, answer, mainArea } = req.body

  const system = useSystemSentence('answer', mainArea, question)
  const content = useUserSentence('answer', answer)

  try {
    setupSSEHeaders(res)

    const response = await sendToMainAIStream(system, content)
    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`)
    }

    await streamAIResponse(response, res, req)
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
    setupSSEHeaders(res)

    const response = await sendToMainAIStream(system, content)
    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`)
    }

    await streamAIResponse(response, res, req)
  } catch (error) {
    useSpareAI(res, system, content)
    console.log(error)
  }
})

const getContext = async (isLongTerm, sessionId, areaId) => {
  let questions = []

  if (isLongTerm) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM questions WHERE area_id = ?',
        [areaId]
      )
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
    await streamAIResponse(response, res)
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
    await streamAIResponse(response, res)
  } catch (err) {
    console.log(err)
    res.errHandle('请求失败')
  }
}

module.exports = router
