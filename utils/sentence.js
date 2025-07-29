// 系统提示语句
const useSystemSentence = (type, ...args) => { 
  if (type === 'startquest') {
    return `这是一场${args[0]}面试，你是面试官，问我一个有关${args[1]}的问题并提供该问题的考点名称，不要重复提问相同知识点，主要使用中文，按照JSON{"question": <问题>, "point": <考点名称>}格式返回。`
  }

  if (type === 'dailyquest') {
    return `这是一场${args[0]}面试，你是面试官，问我相关问题并提供该问题的考点名称，不要重复提问相同问题，主要使用中文，按照JSON{"question": <问题>, "point": <考点名称>}格式返回。`
  }

  if (type === 'answer') {
    return `在${args[0]}面试中，面对问题：${args[1]}。以下是我的回答，给出该回答的优化建议，主要使用中文，按照JSON{"result": <优化建议>}格式返回，其中result的value为string类型，使用标准markdown语法格式`
  }

  if (type === 'help') {
    if (args[0] === 1) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的回答思路，主要使用中文，按照JSON{"result": <回答模板>}格式返回，其中result的value为string类型，使用标准markdown语法格式`
    else if (args[0] === 2) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的标准答案，主要使用中文，按照JSON{"result": <标准答案>}格式返回，其中result的value为string类型，使用标准markdown语法格式`
    else if (args[0] === 3) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的回答思路和标准答案，主要使用中文，按照JSON{"result": <回答模板+标准答案>}格式返回，其中result的value为string类型，使用标准markdown语法格式`
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

const useSubcategorySentence = (...args) => {
  return `${args[0]}面试中，关于${args[1]}有哪些知识点，列出${args[2]}点，并给出面试考察频率1-3分，已有 【${args[3].join('；').toString()}】，主要使用中文，按照JSON{"response": [{"title": <第一点>, "frequency": <频率分值>}, {"title": <第二点>, "frequency": <频率分值>}, ...]}格式返回`
}

module.exports = {
  useSystemSentence,
  useUserSentence,
  useSubcategorySentence
}
