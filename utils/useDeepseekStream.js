const deepseek = {
  apiKey: 'sk-2650ba5290754d82930171b2022fdb10',
  baseUrl: 'https://api.deepseek.com/chat/completions'
}

const sendToDSStream = async (system, content) => {
  const systemArr = [{
      "role": "system",
      "content": system
    }]

  const contentArr = [{
    "role": "user",
    "content": content
  }]

  const messages = [...systemArr, ...contentArr]
  console.log('messages', messages)

  const data = JSON.stringify({
    "messages": messages,
    "model": "deepseek-chat",
    "frequency_penalty": 0,
    "max_tokens": 8192,
    "presence_penalty": 0,
    "stop": null,
    "stream": true,
    "temperature": 1.0,
    "top_p": 1,
    "tools": null,
    "tool_choice": "none",
    "logprobs": false,
    "top_logprobs": null
  })

  return await fetch(deepseek.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseek.apiKey}`
    },
    body: data
  })
}

const doubao = {
  apiKey: '8b0b4298-18e2-4b57-a265-65d4679519a0',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
}

const sendToDoubaoStream = async (system, content) => {
  const systemArr = [{
      "role": "system",
      "content": system
    }]

  const contentArr = [{
    "role": "user",
    "content": content
  }]

  const messages = [...systemArr, ...contentArr]
  console.log('messages', messages)

  const data = JSON.stringify({
    "messages": messages,
    "model": "doubao-seed-1-6-flash-250715",
    "frequency_penalty": 0,
    "max_tokens": 8192,
    "presence_penalty": 0,
    "stop": null,
    "stream": true,
    "temperature": 1.0,
    "top_p": 1,
    "tools": null,
    "tool_choice": "none",
    "logprobs": false,
    "top_logprobs": null
  })

  return await fetch(doubao.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doubao.apiKey}`
    },
    body: data
  })
}

module.exports = {
  sendToDSStream,
  sendToDoubaoStream
}
