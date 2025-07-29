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
  }

  res.send({
    code: 200,
    success: true,
    data: {
      newArea
    }
  })
})

module.exports = router
