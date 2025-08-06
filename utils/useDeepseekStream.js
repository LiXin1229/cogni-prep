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

  return await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-2650ba5290754d82930171b2022fdb10'
    },
    body: data
  })
}

module.exports = sendToDSStream
