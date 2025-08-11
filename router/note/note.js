const express = require('express')
const router = express.Router()
const pool = require('../../db')
const sendToDSStream = require('../../utils/useDeepseekStream')
const { useNoteSentence } = require('../../utils/sentence')

router.post('/initNote', async (req, res) => {
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO notes (content) VALUES (?)',
      ['']
    )

    res.send({
      code: 200,
      success: true,
      data: {
        noteId: insertRes.insertId
      }
    })
  } catch (error) {
    console.log(error)
  }
})

router.post('/getNote', async (req, res) => {
  const { mainArea, point } = req.body

  const system = useNoteSentence('system', point, mainArea)
  const content = useNoteSentence('content', point)

  try {
    // 设置响应头，告诉前端这是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders() // 发送头信息

    const response = await sendToDSStream(system, content)
    // console.log(response)

    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`)
    }

    // 获取响应的可读流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    // 循环读取流数据
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        res.write('data: [DONE]\n\n')
        res.end()
        break
      }

      const chunk = decoder.decode(value, { stream: true });
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
    console.log(error)
  }
})

router.post('/saveNote', async (req, res) => {
  const { noteId, content } = req.body
  // console.log('saveNote', noteId, content)

  try {
    await pool.query(
      'UPDATE notes SET content = ? WHERE note_id = ?',
      [content, noteId]
    )

    res.send({
      code: 200,
      success: true
    })
  } catch (err) {
    console.log(err)
  }
})

router.get('/getNoteData', async (req, res) => {
  const { markId } = req.query

  try {
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE note_id = ?',
      +markId
    )
    // console.log(rows[0].content)

    res.send({
      code: 200,
      success: true,
      data: {
        content: rows[0].content
      }
    })
  } catch (err) {
    console.log(err)
  }
})

router.post('/updateNote', async (req, res) => {
  const { noteId, content } = req.body

  try {
    await pool.query(
      'UPDATE notes SET content = ? WHERE note_id = ?',
      [content, +noteId]
    )
    res.send({
      code: 200,
      success: true
    })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router
