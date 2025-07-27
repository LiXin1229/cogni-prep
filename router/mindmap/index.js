const express = require('express')
const router = express.Router()

const mindmap = require('./mindmap.js')

router.use('/mindmap', mindmap)

module.exports = router
