const express = require('express')
const router = express.Router()
const pool = require('../../db')
const formatDate = require('../../utils/formatDate')
const { modifyTreeNodeChatId } = require('../../utils/treeUtils')

// 新建会话
router.post('/initSession', async (req, res) => {
  const { userId, mainArea, areaId, surroundingPoint } = req.body

  console.log('areaId', areaId)
  const title = surroundingPoint ? `${mainArea} - ${surroundingPoint}` : `${mainArea} - ${formatDate()}`

  try {
    const [result] = await pool.query(
      'INSERT INTO sessions (user_id, title, main_area, area_id, surrounding_point) VALUES (?, ?, ?, ?, ?)',
      [userId, title, mainArea, areaId, surroundingPoint]
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
        areaId,
        surroundingPoint
      }
    })
  } catch (err) {
    console.error(err)
  }
})

// 获取会话列表
router.get('/getSessionList', async (req, res) => {
  const { id, number } = req.query

  if (!id) {
    return res.send({
      code: 400,
      success: false,
      message: '用户id不能为空'
    })
  }
  const sessionList = []

  try {
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
      id
    )

    const slicedArr = rows.slice(number - 20, number)

    slicedArr.forEach(row => {
      sessionList.push({
        sessionId: row.session_id,
        title: row.title,
        mainArea: row.main_area,
        areaId: row.area_id,
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

router.post('/deleteSession', async (req, res) => {
  const { sessionId, areaId, userId } = req.body

  try {
    // 删除会话
    await pool.query(
      'DELETE FROM sessions WHERE session_id = ?',
      sessionId
    )

    // 删除会话聊天记录
    await pool.query(
      'DELETE FROM chats WHERE session_id = ?',
      sessionId
    )

    // 修改思维导图的关联
    const [rows] = await pool.query(
      'SELECT mindmap FROM areas WHERE id = ?',
      areaId
    )

    const mindmap = modifyTreeNodeChatId(rows[0].mindmap, sessionId)

    await pool.query(
      'UPDATE areas SET mindmap = ? WHERE id = ?',
      [JSON.stringify(mindmap), areaId]
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
