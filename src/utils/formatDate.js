export const formatDate = (date = new Date(), format = 'YY/M/D') => {
  // 确保传入的是有效的日期对象
  const today = new Date(date)
  
  const year = today.getFullYear()
  const shortYear = year.toString().slice(-2) // 年份后两位
  const month = today.getMonth() + 1 // 月份从0开始，需加1
  const day = today.getDate()
  
  // 数字补零辅助函数
  const padZero = (num) => num.toString().padStart(2, '0')
  
  switch (format) {
    case 'YY/M/D':
      return `${shortYear}/${month}/${day}`
      
    case 'YY-MM-DD':
      return `${shortYear}-${padZero(month)}-${padZero(day)}`
      
    // 可以根据需要扩展其他格式
    case 'YYYY-MM-DD':
      return `${year}-${padZero(month)}-${padZero(day)}`
      
    default:
      console.warn(`不支持的日期格式: ${format}`)
      return ''
  }
}
