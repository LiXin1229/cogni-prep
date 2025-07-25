// 系统提示语句
const useSystemSentence = (type, ...args) => { 
  if (type === 'startquest') {
    return `假设这是一场${args[0]}面试，你是面试官，问我一个有关${args[1]}的问题，不要重复提问相同知识点，按照JSON{"question": "问题"}格式返回。`
  }

  if (type === 'answer') {
    return `在${args[0]}面试中，面对问题：${args[1]}。以下是我的回答，给出该回答的优化建议，按照JSON{"result": "优化建议"}格式返回，其中result的value为string类型，使用标准markdown语法格式`
  }

  if (type === 'help') {
    if (args[0] === 1) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的回答思路，按照JSON{"result": "回答模板"}格式返回，其中result的value为string类型，使用标准markdown语法格式`
    else if (args[0] === 2) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的标准答案，按照JSON{"result": "标准答案"}格式返回，其中result的value为string类型，使用标准markdown语法格式`
    else if (args[0] === 3) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的回答思路和标准答案，按照JSON{"result": "回答模板+标准答案"}格式返回，其中result的value为string类型，使用标准markdown语法格式`
  }
}

// 用户语句
const useUserSentence = (type, ...args) => {
  if (type === 'answer') {
    return `我的回答如下：“${args[0]}”。`
  }

  if (type === 'help') {
    if (args[0] === 1) return `给出该问题的回答思路，${args[1]}`
    if (args[0] === 2) return `给出该问题的标准答案，${args[1]}`
    if (args[0] === 3) return `给出该问题的回答思路和标准答案，${args[1]}`
  }
}

module.exports = {
  useSystemSentence,
  useUserSentence,
}
