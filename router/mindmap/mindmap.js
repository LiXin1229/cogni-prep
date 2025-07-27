const express = require('express')
const router = express.Router()
const pool = require('../../db')

router.get('/getMindmapData', async (req, res) => {
  const { areaId } = req.query

  console.log(areaId)
  try {
    const [rows] = await pool.query(
      'SELECT * FROM areas WHERE id = ?',
      +areaId
    )

    console.log(rows)

    res.send({
      code: 200,
      success: true,
      data: {
        mindmap: rows[0]
      }
    })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router