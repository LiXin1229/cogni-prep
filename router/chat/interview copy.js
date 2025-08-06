const express = require('express')
const router = express.Router()
const sendToDS = require('../../utils/useDeepseek')
// const sendToDSStream = require('../../utils/useDeepseekStreamAxios')
const sendToDSStream = require('../../utils/useDeepseekStream')
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
  const { sessionId, customContent } = req.body
  // console.log('sessionId', sessionId)

  let system = ''
  let content = ''
  const questions = []

  // 获取session的system设定(如此会话将围绕system展开)
  try {
    const [rows, fields] = await pool.query(
      'SELECT main_area, surrounding_point FROM sessions WHERE session_id = ?',
      sessionId
    )

    const sessionData = rows[0] // 获取第一条记录
    // console.log('查询结果:', sessionData)
  
    system = useSystemSentence('startquest', sessionData.main_area, sessionData.surrounding_point)
    // console.log('system', system)
  } catch (err) {
    console.log(err)
  }

  // 获取上下文
  try {
    const [rows] = await pool.query(
      'SELECT * FROM chats WHERE session_id = ?',
      sessionId
    )
    // console.log('查询结果:', rows)

    rows.forEach(row => {
      if (row.message_type === MSG_TYPE['question']) {
        questions.push(row.point)
      }
    })
  } catch (err) {
    console.log(err)
  }

  content = `已经问过的问题：【${questions.join('；').toString()}】。开始下一个问题${customContent ? `，${customContent}。` : '。'}`

  try {
    // 设置响应头，告诉前端这是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders() // 发送头信息

    const response = await sendToDSStream(system, content)
    // console.log(response)

    if (!response.ok) {
      throw new Error(`Deepseek API request failed: ${response.statusText}`);
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
      const { done, value } = await reader.read();
      
      if (done) {
        res.write('data: [DONE]\n\n');
        res.end();
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        console.log('line', line)
        const dataStr = line.replace(/^data: /, '');
        
        if (dataStr === '[DONE]') {
          res.write(`data: ${dataStr}\n\n`);
          res.end();
          return;
        }
        
        try {
          const data = JSON.parse(dataStr);
          if (data.choices && data.choices[0]?.delta?.content) {
            // console.log('AI返回结果', data.choices[0].delta.content)
            // 直接写入数据，流会自动处理缓冲
            res.write(`data: ${JSON.stringify({
              content: data.choices[0].delta.content
            })}\n\n`);
          }
        } catch (e) {
          console.error('Error parsing stream chunk:', e);
        }
      }
    }
  } catch (error) {
    console.log(error)
  }

  return

  // 将AI的结果存入数据库
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type, content, point) VALUES (?, ?, ?, ?)',
      [sessionId, MSG_TYPE['question'], result.question, result.point]
    )

    res.send({
      code: 200,
      success: true,
      data: {
        id: insertRes.insertId,
        content: result.question,
        sessionId: sessionId,
        messageType: MSG_TYPE['question']
      }
    })
  } catch (err) {
    console.log(err)
  }
})

// 每日提问
router.post('/daily', async (req, res) => {
  const { sessionId, customContent, areaId } = req.body
  // console.log('sessionId', sessionId)

  let system = ''
  let content = ''
  const questions = []

  // 获取session的system设定(如此会话将围绕system展开)
  try {
    const [rows, fields] = await pool.query(
      'SELECT main_area, surrounding_point FROM sessions WHERE session_id = ?',
      sessionId
    )

    const sessionData = rows[0] // 获取第一条记录
    // console.log('查询结果:', sessionData)
  
    system = useSystemSentence('dailyquest', sessionData.main_area)
    // console.log('system', system)
  } catch (err) {
    console.log(err)
  }

  // 获取上下文
  try {
    const [rows] = await pool.query(
      'SELECT * FROM chats WHERE area_id = ?',
      areaId
    )
    // console.log('查询结果:', rows)

    rows.forEach(row => {
      if (row.message_type === MSG_TYPE['question']) {
        questions.push(row.point)
      }
    })
  } catch (err) {
    console.log(err)
  }

  content = `已经问过的问题：【${questions.join('；').toString()}】。开始下一个问题${customContent ? `，${customContent}。` : '。'}`

  const result = await sendToDS(system, content)
  // console.log('AI返回结果', result)

  // 将AI的结果存入数据库
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type, content, area_id, point) VALUES (?, ?, ?, ?, ?)',
      [sessionId, MSG_TYPE['question'], result.question, areaId, result.point]
    )

    res.send({
      code: 200,
      success: true,
      data: {
        id: insertRes.insertId,
        content: result.question,
        sessionId: sessionId,
        messageType: MSG_TYPE['question']
      }
    })
  } catch (err) {
    console.log(err)
  }
})

// 用户回答提问
router.post('/answer', async (req, res) => {
  const { sessionId, question, answer, mainArea } = req.body

  // 将回答存入数据库
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type, content) VALUES (?, ?, ?)',
      [sessionId, MSG_TYPE['user'], answer]
    )
  } catch (err) {
    console.log(err)
  }

  const system = useSystemSentence('answer', mainArea, question)
  const content = useUserSentence('answer', answer)

  const result = await sendToDS(system, content)

  console.log('AI结果', result)

  // 将AI评价存入数据库
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type, content) VALUES (?, ?, ?)',
      [sessionId, MSG_TYPE['evaluation'], result.result]
    )

    res.send({
      code: 200,
      success: true,
      data: {
        id: insertRes.insertId,
        content: result.result,
        sessionId: sessionId,
        messageType: MSG_TYPE['evaluation']
      }
    })
  } catch (err) {
    console.log(err)
  }

  // console.log('AI返回结果', result)
})

// 用户获取答题帮助
router.post('/help', async (req, res) => {
  const { sessionId, question, funcType, customContent, mainArea } = req.body

  // 存数据库
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type, content) VALUES (?, ?, ?)',
      [sessionId, MSG_TYPE['user'], customContent]
    )
  } catch (err) {
    console.log(err)
  }

  const system = useSystemSentence('help', funcType, question, mainArea)
  const content = useUserSentence('help', funcType, customContent)

  const result = await sendToDS(system, content)

  console.log('AI help', result)

  // 将AI的帮助存入数据库
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type, content) VALUES (?, ?, ?)',
      [sessionId, MSG_TYPE['help'], result.result]
    )

    res.send({
      code: 200,
      success: true,
      data: {
        id: insertRes.insertId,
        content: result.result,
        sessionId: sessionId,
        messageType: MSG_TYPE['help']
      }
    })
  } catch (err) {
    console.log(err)
  }
})

// 获取该会话的聊天数据
router.get('/getChatData', async (req, res) => {
  const { sessionId } = req.query
  const chatList = []

  try {
    const [rows] = await pool.query(
      'SELECT * FROM chats WHERE session_id = ?',
      sessionId
    )

    rows.forEach(row => {
      chatList.push({
        id: row.id,
        content: row.content,
        sessionId: sessionId,
        messageType: row.message_type
      })
    })

    res.send({
      code: 200,
      success: true,
      data: {
        chatList
      }
    })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router
