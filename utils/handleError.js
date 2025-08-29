const handleError = (req, res, next) => {
  res.errHandle = (err, success = false) => {
    res.send({
      code: 200,
      success,
      data: {
        message: err instanceof Error ? err.message : err
      }
    })
  }
  next()
}

module.exports = handleError
