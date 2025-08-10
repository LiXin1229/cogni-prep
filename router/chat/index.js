const express = require('express')
const router = express.Router()

const interview = require('./interview.js')
const session = require('./session.js')
const chat = require('./chat.js')

router.use('/interview', interview)
router.use('/session', session)
router.use('/chat', chat)

module.exports = router
