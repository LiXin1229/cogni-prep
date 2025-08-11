export const verifyUsername = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入用户名'))
  } else if (value.length > 12) {
    callback(new Error('用户名不能超过12个字符'))
  } else {
    callback()
  }
}

export const verifyPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else {
    if (value.length < 6) {
      callback(new Error('密码长度不能少于 6 位'))
    }
    if (value.length > 20) {
      return callback(new Error('密码长度不能超过 20 位'))
    }
    callback()
  }
}
