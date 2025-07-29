const express = require('express')
const router = express.Router()
const pool = require('../../db')

router.get('/getUserInfo', async (req, res) => {
  const { id } = req.query

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      +id
    )

    const areaList = rows[0].mainarea.map(item => {
      return {
        areaId: item.areaId,
        name: item.name
      }
    })

    // console.log(areaList)

    res.send({
      code: 200,
      success: true,
      data: {
        areaList
      }
    })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router
