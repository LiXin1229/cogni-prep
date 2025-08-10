const express = require('express')
const router = express.Router()

const perfer = require('./perfer.js')

router.use('/perfer', perfer)

module.exports = router
