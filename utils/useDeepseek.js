require('dotenv').config()
const axios = require('axios')

const model = 'qwen'

const AImodel = {
  qwen: {
    apiKey: process.env.QWEN_API_KEY,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen3-coder-plus-2025-09-23'
  }
}

const sendToDS = (system, content) => {
  const systemArr = [{
      "role": "system",
      "content": system
    }]

  const contentArr = [{
    "role": "user",
    "content": content
  }]

  const messages = [...systemArr, ...contentArr]
  // console.log('messages', messages)

  const data = JSON.stringify({
    "messages": messages,
    "model": AImodel[model].model,
    "frequency_penalty": 0,
    "max_tokens": 8192,
    "presence_penalty": 0,
    "response_format": {
      "type": "json_object"
    },
    "stream": false,
    "temperature": 0.5,
    "top_p": 1
  })
  
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: AImodel[model].baseUrl,
    headers: {
      'Content-Type': 'application/json', 
      'Accept': 'application/json', 
      'Authorization': `Bearer ${AImodel[model].apiKey}`
    },
    data : data
  }

  return new Promise((resolve, reject) => {
    axios(config).then(res => {
      resolve(JSON.parse(res.data.choices[0].message.content))
    }).then((err) => {
      reject(err)
    })
  })
}

module.exports = sendToDS
