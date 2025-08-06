const express = require('express')
const router = express.Router()
const pool = require('../../db')
const sendToDS = require('../../utils/useDeepseek')
const { useNoteSentence } = require('../../utils/sentence')

router.post('/getNote', async (req, res) => {
  const { mainArea, point } = req.body

  const system = useNoteSentence('system', point, mainArea)
  const content = useNoteSentence('content', point)

  const result = await sendToDS(system, content)
  console.log('AI返回结果', result)

  try {
    const [rows] = await pool.query(
      'INSERT INTO notes (content) VALUES (?)',
      [result.result]
    )
    // console.log('插入成功', rows)

    res.send({
      code: 200,
      success: true,
      data: {
        result: result.result,
        noteId: rows.insertId
      }
    })
  } catch (err) {
    console.log(err)
  }
})

router.get('/getNoteData', async (req, res) => {
  const { markId } = req.query

  try {
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE note_id = ?',
      +markId
    )
    // console.log(rows[0].content)

    res.send({
      code: 200,
      success: true,
      data: {
        content: rows[0].content
      }
    })
  } catch (err) {
    console.log(err)
  }
})

router.post('/updateNote', async (req, res) => {
  const { noteId, content } = req.body

  try {
    await pool.query(
      'UPDATE notes SET content = ? WHERE note_id = ?',
      [content, +noteId]
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
