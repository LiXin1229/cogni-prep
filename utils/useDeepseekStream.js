require('dotenv').config()

const AImodel = {
  qwen: {
    apiKey: process.env.QWEN_API_KEY,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen3-coder-plus'
    // model: 'qwen-plus-2025-07-28'
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  },
  doubao: {
    apiKey: process.env.DOUBAO_API_KEY,
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-seed-1-6-flash-250715'
  }
}

const mainModel = 'qwen'
const spareModel = 'deepseek'

const sendToMainAIStream = async (system, content) => {
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
    "model": AImodel[mainModel].model,
    "frequency_penalty": 0,
    "max_tokens": 8192,
    "presence_penalty": 0,
    "stream": true,
    "temperature": 0.5,
    "top_p": 1
  })

  return await fetch(AImodel[mainModel].baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AImodel[mainModel].apiKey}`
    },
    body: data
  })
}

const sendSpareAIStream = async (system, content) => {
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
    "model": AImodel[spareModel].model,
    "frequency_penalty": 0,
    "max_tokens": 8192,
    "presence_penalty": 0,
    "stream": true,
    "temperature": 1.0,
    "top_p": 1
  })

  return await fetch(AImodel[spareModel].baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AImodel[spareModel].apiKey}`
    },
    body: data
  })
}

module.exports = {
  sendToMainAIStream,
  sendSpareAIStream
}
