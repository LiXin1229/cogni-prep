// 引入 mysql2/promise 以使用 Promise 接口
const mysql = require('mysql2/promise')

// 创建连接池
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  database: 'cogni_prep',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// 测试连接
async function testConnection() {
  let connection
  try {
    connection = await pool.getConnection()
    const [rows] = await connection.query('SELECT 1 + 1 AS result')
    // console.log('Database connected successfully:', rows)
  } catch (err) {
    console.error('Database connection failed:', err)
  } finally {
    if (connection) connection.release()
  }
}

testConnection()

module.exports = pool
