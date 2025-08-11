export const securePassword = async (password, defSalt) => {
  try {
    // 生成盐值 (16字节)
    const salt = defSalt ? await generateSaltFromString(defSalt) : crypto.getRandomValues(new Uint8Array(16))
    
    // 派生密钥
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )
    
    // 返回结果
    return {
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      derivedKey: Array.from(new Uint8Array(derivedKey))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
    }
  } catch (error) {
    console.error('密码处理失败:', error)
    throw error
  }
}

const generateSaltFromString = async (inputString) => {
  try {
    // 1. 将字符串编码为ArrayBuffer
    const encoder = new TextEncoder()
    const data = encoder.encode(inputString)
    
    // 2. 使用SHA-256哈希字符串
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    // 3. 取前16字节作为盐值
    return new Uint8Array(hashBuffer.slice(0, 16))
  } catch (error) {
    console.error('生成盐值失败:', error)
    throw error
  }
}

const calculateOptimalIterations = async () => {
  const baseIterations = 100000 // 基础迭代次数
  try {
    // 简单的性能测试
    const start = performance.now()
    await crypto.subtle.digest('SHA-384', new Uint8Array(1024))
    const duration = performance.now() - start
    
    // 根据设备性能调整迭代次数
    return Math.max(
      100000, // 最低10万次
      Math.min(
        Math.round(baseIterations * (10 / duration)),
        1000000 // 最高100万次
      )
    )
  } catch {
    return baseIterations
  }
}
