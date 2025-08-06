const express = require('express')
const router = express.Router()

const note = require('./note.js')

router.use('/note', note)

module.exports = router
