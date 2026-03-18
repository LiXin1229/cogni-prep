const express = require('express')
const router = express.Router()
const pool = require('../../db')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const { v4: uuidv4 } = require('uuid')

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // 你可以根据 file.originalname 或 req.body 自定义路径
    const uploadDir = path.join(__dirname, '../../uploads')
    await fs.mkdir(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // 保留原始文件名（或加时间戳防重名）
    cb(null, file.originalname +'_' + uuidv4().slice(0, 8))
  },
})

const upload = multer({ storage })

router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const { path } = req.body
    // console.log('path: ', path)
    const files = req.files // multer 注入的文件数组

    if (!files || files.length === 0) {
      return res.status(400).json({ code: 400, success: false, message: '未上传任何文件' })
    }

    // console.log('接收到的文件数量:', files.length)
    files.forEach(async (file, index) => {
      // console.log('📄 文件:', file.filename, '路径:', path[index])
      await pool.query(
        'INSERT INTO files (file_path, file_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE file_name = VALUES(file_name)',
        [path[index], file.filename]
      )
    })

    res.send({
      code: 200,
      success: true,
      data: {
        count: files.length,
        files: files.map(f => ({
          name: f.originalname,
          size: f.size,
          path: f.path,
        })),
      },
    })
  } catch (error) {
    console.log(error)
    res.errHandle('请求失败')
  }
})

router.post('/fileTree', async (req, res) => {
  try {
    const { fileTree, userId, name } = req.body
    // console.log('fileTree: ', fileTree)
    await pool.query(
      `INSERT INTO filetrees (name, tree, user_id) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE tree = VALUES(tree)`,
      [name, JSON.stringify(fileTree), userId]
    )
    res.send({
      code: 200,
      success: true,
      data: {
        fileTree
      },
    })
  } catch (error) {
    console.log(error)
    res.errHandle('请求失败')
  }
})

router.get('/fileTree', async (req, res) => {
  try {
    const { userId } = req.query
    const [rows] = await pool.query(
      'SELECT * FROM filetrees WHERE user_id = ?',
      userId
    )
    res.send({
      code: 200,
      success: true,
      data: {
        list: rows
      },
    })
  } catch (error) {
    console.log(error)
    res.errHandle('请求失败')
  }
})

router.get('/getContentbyFilePath', async (req, res) => {
  try {
    const { filePath } = req.query
    // console.log('filePath: ', filePath)

    const [rows] = await pool.query(
      'SELECT * FROM files WHERE file_path = ?',
      filePath
    )

    // console.log(rows[0])
    if (rows.length === 0) {
      throw new Error('未找到对应文件')
    }
    const fileName = rows[0].file_name // å¦\x82ä½\x95å\x85¼å®¹ä¸ºes5.md
    const content = await readFileContent(fileName)

    res.send({
      code: 200,
      success: true,
      data: {
        content
      },
    })
  } catch (error) {
    console.log(error)
    res.errHandle('请求失败')
  }
})

async function readFileContent(fileName) {
  // 安全校验：防止路径穿越
  if (fileName.includes('..') || path.isAbsolute(fileName)) {
    // return res.status(403).json({ code: 403, success: false, message: '非法文件名' })
    throw new Error('非法文件名')
  }

  // 拼接真实文件路径（假设 uploads 在项目根目录）
  const uploadDir = path.join(__dirname, '../../uploads')
  const realPath = path.join(uploadDir, fileName)

  // 再次防御：确保路径在 uploads 目录内（防符号链接等）
  const resolvedUploadDir = path.resolve(uploadDir)
  const resolvedRealPath = path.resolve(realPath)
  if (!resolvedRealPath.startsWith(resolvedUploadDir)) {
    // return res.status(403).json({ code: 403, success: false, message: '访问被拒绝' })
    throw new Error('访问被拒绝')
  }

  // 读取文件内容（假设是文本文件）
  let content
  try {
    content = await fs.readFile(realPath, 'utf-8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      // return res.status(404).json({ code: 404, success: false, message: '物理文件不存在' })
      throw new Error('物理文件不存在')
    }
    throw err
  }
  return content
}

module.exports = router
