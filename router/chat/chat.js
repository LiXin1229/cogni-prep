const express = require('express')
const router = express.Router()
const pool = require('../../db')
const sendToDS = require('../../utils/useDeepseek')
const { useSumPoint } = require('../../utils/sentence')

const MSG_TYPE = {
  'user': 0, // 用户发言
  'question': 1, // AI提问
  'evaluation': 2, // AI评价
  'help': 3 // AI帮助
}

// 创建chat
router.post('/init', async (req, res) => {
  const { sessionId, msgType } = req.body

  try {
    const [rows] = await pool.query(
      'SELECT main_area, surrounding_point FROM sessions WHERE session_id = ?',
      sessionId
    )

    const sessionData = rows[0] // 获取第一条记录

    if (!sessionData) {
      throw new Error('未找到sessionId')
    }

    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type) VALUES (?, ?)',
      [sessionId, msgType]
    )

    res.send({ 
      code: 200,
      success: true,
      data: {
        sessionId,
        mainArea: sessionData.main_area,
        surroundingPoint: sessionData.surrounding_point,
        chatId: insertRes.insertId
      }
    })
  } catch (err) {
    console.log(err)
    return res.errHandle(err)
  }
})

// 保存chat
router.post('/save', async (req, res) => {
  const { chatId, content, surroundingPoint, areaId } = req.body

  let isLongTerm = false
  if (!surroundingPoint) isLongTerm = true

  // 保存到数据库
  try {
    // 有areaId则作为question保存
    if (areaId) {
      const { system, user } = useSumPoint(content)
      const { point } = await sendToDS(system, user)

      const pointToSave = typeof point === 'string' ? point : content

      await pool.query(
        'UPDATE chats SET content = ?, point = ? WHERE id = ?',
        [content, pointToSave, chatId]
      )

      if (isLongTerm) {
        await pool.query(
          'INSERT INTO questions (question, area_id) VALUES (?, ?)',
          [pointToSave, areaId]
        )
      }
    }
    // 无areaId则作为普通对话保存
    else {
      await pool.query(
        'UPDATE chats SET content = ? WHERE id = ?',
        [content, chatId]
      )
    }

    res.send({
      code: 200,
      success: true
    })
  } catch (error) {
    console.log(error)
  }
})

router.post('/saveUserWords', async (req, res) => {
  const { sessionId, customContent } = req.body

  // 存数据库
  try {
    const [insertRes] = await pool.query(
      'INSERT INTO chats (session_id, message_type, content) VALUES (?, ?, ?)',
      [sessionId, MSG_TYPE['user'], customContent]
    )

    res.send({
      code: 200,
      success: true,
      data: {
        chatId: insertRes.insertId
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

router.post('/deleteChat', async (req, res) => {
  const { chatId } = req.body

  console.log(chatId)

  try {
    await pool.query(
      'DELETE FROM chats WHERE id = ?',
      [chatId]
    )

    res.send({
      code: 200,
      success: true
    })
  } catch (error) {
    console.log(error)
  }
})

module.exports = router
