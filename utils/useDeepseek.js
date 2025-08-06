const axios = require('axios')

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
  console.log('messages', messages)

  const data = JSON.stringify({
    "messages": messages,
    "model": "deepseek-chat",
    "frequency_penalty": 0,
    "max_tokens": 8192,
    "presence_penalty": 0,
    "response_format": {
      "type": "json_object"
    },
    "stop": null,
    "stream": false,
    "stream_options": null,
    "temperature": 1.0,
    "top_p": 1,
    "tools": null,
    "tool_choice": "none",
    "logprobs": false,
    "top_logprobs": null
  })
  
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api.deepseek.com/chat/completions',
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json', 
      'Authorization': 'Bearer sk-2650ba5290754d82930171b2022fdb10'
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
