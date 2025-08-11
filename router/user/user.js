const express = require('express')
const router = express.Router()
const pool = require('../../db')
const jwt = require('jsonwebtoken')

const secretKey = 'isomer 1229 ^.^'

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  try {
    const [user] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )

    if (user.length === 0) {
      return res.send({
        code: 200,
        success: false,
        data: {
          message: '用户不存在'
        }
      })
    }

    if (user[0].password !== password) {
      return res.send({
        code: 200,
        success: false,
        data: {
          message: '密码错误'
        }
      })
    } else {
      const token = jwt.sign({ username: username }, secretKey, {
        expiresIn: '7d' // 有效期 7天
      })

      res.send({
        code: 200,
        success: true,
        data: {
          message: '登录成功',
          userInfo: {
            userId: user[0].id,
            username
          },
          token
        }
      })
    }
  } catch (error) {
    console.log(error)
  }
})

router.post('/register', async (req, res) => {
  const { username, password } = req.body

  try {
    const [selectRows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )

    if (selectRows.length > 0) {
      return res.send({
        code: 200,
        success: false,
        data: {
          message: '用户已存在'
        }
      })
    }
 
    const [rows] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, password]
    )

    const token = jwt.sign({ username: username }, secretKey, {
      expiresIn: '7d' // 有效期 7天
    })

    res.send({
      code: 200,
      success: true,
      data: {
        message: '注册成功',
        userInfo: {
          userId: rows.insertId,
          username
        },
        token
      }
    })
  } catch (error) {
    console.log(error)
  }
})

router.get('/getUserInfo', async (req, res) => {
  const { id } = req.query

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      +id
    )

    if (!rows[0].mainarea) {
      return res.send({
        code: 200,
        success: true,
        data: {
          areaList: []
        }
      })
    }

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
