const express = require('express')
const router = express.Router()
const pool = require('../../db')
const sendToDS = require('../../utils/useDeepseek')
const { useSubcategorySentence } = require('../../utils/sentence')

router.get('/getMindmapData', async (req, res) => {
  const { areaId } = req.query

  // console.log(areaId)
  try {
    const [rows] = await pool.query(
      'SELECT * FROM areas WHERE id = ?',
      +areaId
    )

    res.send({
      code: 200,
      success: true,
      data: {
        mindmap: rows[0].mindmap
      }
    })
  } catch (err) {
    console.log(err)
  }
})

router.post('/saveMindmapData', async (req, res) => {
  const { areaId, mindmap } = req.body
  // console.log('areaId', areaId)
  // console.log(JSON.stringify(mindmap))

  try {
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

router.post('/getSubcategory', async (req, res) => {
  const { mainArea, surroundingPoint, childrenPoints, number, auto } = req.body

  const exitPoints = childrenPoints.map(item => item.name)

  let system

  if (auto) {
    system = useSubcategorySentence('auto', mainArea, surroundingPoint, exitPoints)
  } else {
    system = useSubcategorySentence('manual', mainArea, surroundingPoint, number, exitPoints)
  }

  const content = useSubcategorySentence('content')

  const result = await sendToDS(system, content)
  // console.log('AI返回结果', result)
  const pointList = result.response

  res.send({
    code: 200,
    success: true,
    data: {
      pointList
    }
  })
})

module.exports = router