const express = require('express')
const router = express.Router()

const user = require('./user.js')
const area = require('./area.js')

router.use('/user', user)
router.use('/area', area)

module.exports = router
