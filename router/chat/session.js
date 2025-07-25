const express = require('express')
const router = express.Router()
const sendToDS = require('../../utils/useDeepseek')
const { useInterviewSentence } = require('../../utils/sentence')
const pool = require('../../db')

// 新建会话
router.post('/initSession', async (req, res) => {
  const { userId, mainArea, surroundingPoint } = req.body

  const title = `${mainArea} - ${surroundingPoint}相关`

  try {
    const [result] = await pool.query(
      'INSERT INTO sessions (user_id, title, main_area, surrounding_point) VALUES (?, ?, ?, ?)',
      [userId, title, mainArea, surroundingPoint]
    )
    // console.log(result)

    res.send({
      code: 200,
      success: true,
      data: {
        sessionId: result.insertId,
        title,
        prefer: 0,
        mainArea,
        surroundingPoint
      }
    })
  } catch (err) {
    console.error(err)
  }
})

// 获取会话列表
router.get('/getSessionList', async (req, res) => {
  const { id } = req.query

  const sessionList = []

  try {
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ?',
      id
    )

    rows.forEach(row => {
      sessionList.push({
        sessionId: row.session_id,
        title: row.title,
        mainArea: row.main_area,
        surroundingPoint: row.surrounding_point,
        prefer: row.prefer,
        updatedTime: row.updated_at,
        createdTime: row.created_at
      })
    })

    res.send({
      code: 200,
      success: true,
      data: {
        sessionList
      }
    })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router
