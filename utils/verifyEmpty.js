const isEmptyObj = (o) => o != null && typeof o === 'object' && Object.keys(o).length === 0

module.exports = {
  isEmptyObj
}
