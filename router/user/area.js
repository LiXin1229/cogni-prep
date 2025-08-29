const express = require('express')
const router = express.Router()
const pool = require('../../db')
const { v4: uuidv4 } = require('uuid')

// 添加领域
router.post('/updateArea', async (req, res) => {
  let { id, newArea, areaList } = req.body

  const mindmap = JSON.stringify({
    id: uuidv4(),
    name: newArea,
    markId: null,
    chatId: null,
    frequency: 0,
    isFolded: 0,
    isRoot: true,
    children: []
  })

  try {
    const [result] = await pool.query(
      'INSERT INTO areas (name, mindmap) VALUES (?, ?)',
      [newArea, mindmap]
    )

    newArea = {
      areaId: result.insertId,
      name: newArea
    }
  } catch (err) {
    console.log(err)
    res.errHandle('导图创建失败')
  }

  const area = JSON.stringify([...areaList, newArea])
  // console.log(area)

  try {
    await pool.query(
      'UPDATE users SET mainarea = ? WHERE id = ?',
      [area, id]
    )
  } catch (err) {
    console.log(err)
    res.errHandle('添加新领域失败')
  }

  res.send({
    code: 200,
    success: true,
    data: {
      newArea
    }
  })
})

router.post('/deleteArea', async (req, res) => {
  let { id, areaId, areaList } = req.body

  try {
    await pool.query(
      'DELETE FROM areas WHERE id = ?',
      [areaId]
    )

    const newAreaList = areaList.filter(item => item.areaId !== areaId)

    await pool.query(
      'UPDATE users SET mainarea = ? WHERE id = ?',
      [JSON.stringify(newAreaList), id]
    )

    res.send({
      code: 200,
      success: true,
      data: {
        areaList: newAreaList
      }
    })
  } catch (err) {
    console.log(err)
    res.errHandle('删除领域失败')
  }
})

module.exports = router
