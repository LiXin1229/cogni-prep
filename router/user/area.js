const express = require('express')
const router = express.Router()
const pool = require('../../db')

// 添加领域
router.post('/updateArea', async (req, res) => {
  let { id, newArea, areaList } = req.body

  const mindmap = JSON.stringify({
    id: 0,
    name: newArea,
    children: [],
    markId: null
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
  console.log(area)

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

// 更换选中的领域
// router.post('/setArea', async (req, res) => {
//   const { id, areaId } = req.body

//   try {
//     await pool.query(
//       'UPDATE users SET selectedarea = ? WHERE id = ?',
//       [areaId, id]
//     )
//   } catch (err) {
//     console.log(err)
//   }

//   res.send({
//     code: 200,
//     success: true,
//     data: {
//       areaId
//     }
//   })
// })

module.exports = router
