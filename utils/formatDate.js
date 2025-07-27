let today = new Date()

setTimeout(() => {
  today = new Date()
}, 1000 * 60 * 60 * 12)

const formatDate = () => {
  const year = today.getFullYear().toString().slice(-2) // 取年份后两位
  const month = today.getMonth() + 1 // 月份从0开始，需加1
  const day = today.getDate()
  const formattedDate = `${year}/${month}/${day}` // 拼接为 "25/7/26" 格式

  return formattedDate
}

module.exports = formatDate
