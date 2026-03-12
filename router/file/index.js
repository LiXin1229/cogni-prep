const express = require('express')
const router = express.Router()

const file = require('./file.js')

router.use('/file', file)

module.exports = router