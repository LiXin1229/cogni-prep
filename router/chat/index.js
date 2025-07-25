const express = require('express')
const router = express.Router()

const interview = require('./interview.js')
const session = require('./session.js')

router.use('/interview', interview)
router.use('/session', session)

module.exports = router
