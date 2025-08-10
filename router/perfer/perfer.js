const express = require('express')
const router = express.Router()
const pool = require('../../db')

router.post('/initPrefer', async (req, res) => {
  const { userId, title, content, chatIds } = req.body
  // console.log(title, content, chatIds)

  try {
    const [insertRes] = await pool.query(
      'INSERT INTO prefers (user_id, title, content, chat_id_list) VALUES (?, ?, ?, ?)',
      [userId, title, content, JSON.stringify(chatIds)]
    )

    res.send({
      code: 200,
      success: true,
      data: {
        perferId: insertRes.insertId
      }
    })
  } catch (error) {
    console.log(error)
  }
})

router.get('/getPreferList', async (req, res) => {
  const { userId } = req.query

  try {
    const [rows] = await pool.query(
      'SELECT * FROM prefers WHERE user_id = ?',
      userId
    )

    res.send({
      code: 200,
      success: true,
      data: {
        preferList: rows
      }
    })
  } catch (error) {
    console.log(error)
  }
})

router.get('/getdetailChats', async (req, res) => {
  const { chatIds } = req.query
  const chatIdList = chatIds.split(',').map(item => Number(item))
  const placeholders = chatIdList.map(() => '?').join(',')

  const chatList = []

  try {
    const [rows] = await pool.query(
      `SELECT * FROM chats WHERE id IN (${placeholders})`,
      chatIdList
    )

    rows.forEach(row => {
      chatList.push({
        id: row.id,
        content: row.content,
        messageType: row.message_type
      })
    })

    res.send({
      code: 200,
      success: true,
      data: {
        chatList: chatList
      }
    })
  } catch (error) {
    console.log(error)
  }
})

router.post('/deletePrefer', async (req, res) => {
  const { preferId } = req.body

  try {
    await pool.query(
      'DELETE FROM prefers WHERE id = ?',
      [preferId]
    )

    res.send({ 
      code: 200,
      success: true
    })
  } catch (error) {
    
  }
})

module.exports = router
