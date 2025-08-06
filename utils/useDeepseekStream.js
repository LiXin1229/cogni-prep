const sendToDS = (system, content, isStream) => {
  // 构建消息数组
  const messages = [
    { "role": "system", "content": system },
    { "role": "user", "content": content }
  ];

  // 构建请求参数
  const requestData = {
    "messages": messages,
    "model": "deepseek-chat",
    "frequency_penalty": 0,
    "max_tokens": 8192,
    "presence_penalty": 0,
    "response_format": { "type": "json_object" },
    "stop": null,
    "stream": isStream,
    "stream_options": null,
    "temperature": 1.0,
    "top_p": 1,
    "tools": null,
    "tool_choice": "none",
    "logprobs": false,
    "top_logprobs": null
  };

  // 创建AbortController用于取消请求
  const controller = new AbortController();

  // 发起Fetch请求
  const fetchPromise = fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': isStream ? 'text/event-stream' : 'application/json',
      'Authorization': 'Bearer sk-2650ba5290754d82930171b2022fdb10'
    },
    body: JSON.stringify(requestData),
    signal: controller.signal
  });

  // 非流式处理
  if (!isStream) {
    return new Promise((resolve, reject) => {
      fetchPromise
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          resolve(JSON.parse(data.choices[0].message.content));
        })
        .catch(reject);
    });
  }

  // 流式处理 - 返回读取器和取消函数
  return {
    async *stream() {
      try {
        const response = await fetchPromise;
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 解码并处理流式数据
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留不完整的行

          for (const line of lines) {
            if (!line.trim()) continue;
            
            // 解析SSE格式数据
            const data = line.replace(/^data: /, '');
            if (data === '[DONE]') break;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                yield content; // 逐个片段返回
              }
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      } catch (error) {
        console.error('流式请求错误:', error);
        throw error;
      }
    },
    cancel: () => controller.abort() // 提供取消请求的方法
  };
};

module.exports = sendToDS;
