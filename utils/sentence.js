// 系统提示语句
const useSystemSentence = (type, ...args) => { 
  if (type === 'startquest') {
    return `这是一场${args[0]}面试，你是面试官，问我一个有关${args[1]}的问题，不要重复提问相同知识点，主要使用中文。直接给出问题，无需添加无效内容。`
  }

  if (type === 'longterm') {
    return `这是一场${args[0]}面试，你是面试官，问我相关问题，不要重复提问相同知识点，主要使用中文。直接给出问题，无需添加无效内容。`
  }

  if (type === 'answer') {
    return `在${args[0]}面试中，面对问题：${args[1]}。以下是我的回答，给出该回答的优化建议，如果我的回答比较完善了，可以简要给出优化建议。可以使用Markdown语法格式`
  }

  if (type === 'help') {
    if (args[0] === 1) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的回答思路，主要语言为中文，严格按照Markdown语法格式返回内容。`
    else if (args[0] === 2) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的标准答案，主要语言为中文，严格按照Markdown语法格式返回内容。`
    else if (args[0] === 3) return `在${args[1]}面试中，面对问题：${args[2]}。我无法解答，给出该问题的回答思路和标准答案，主要语言为中文，严格按照Markdown语法格式返回内容。`
    else if (args[0] === 4) return `使用Markdown语法格式`
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
    if (args[0] === 4) return `${args[1]}`
  }
}

// 获取分类语句
const useSubcategorySentence = (type, ...args) => {
  if (type === 'auto') {
    return `${args[0]}面试/考试中，关于${args[1]}有哪些内容，选择合理分类尺度，尽量囊括${args[1]}的内容，但最多不超过15点，并给出面试/考试考察频率（或重要性）1-3分，已有 【${args[2].join('；').toString()}】，不要给出重复考点，主要使用中文，按照JSON{"response": [{"name": <分类名称>, "frequency": <重要程度>}, {"name": <分类名称>, "frequency": <重要程度>}, ...]}格式返回`
  }

  if (type === 'manual') { 
    return `${args[0]}面试/考试中，关于${args[1]}有哪些知识点，列出${args[2]}点，并给出面试/考试考察频率（或重要性）1-3分，已有 【${args[3].join('；').toString()}】，不要给出重复考点，主要使用中文，按照JSON{"response": [{"name": <知识点名称>, "frequency": <重要程度>}, {"name": <知识点名称>, "frequency": <重要程度>}, ...]}格式返回`
  }

  if (type === 'content') {
    return '按照JSON{"response": [{"name": <名称>, "frequency": <重要程度>}, {"name": <名称>, "frequency": <重要程度>}, ...]}格式返回'
  }
}

// 获取笔记语句
const useNoteSentence = (type, ...args) => {
  if (type === 'system') {
    return `
      请以<${args[1]}>专家的身份，面向<学习者>详细讲解以下内容：
      【主题】<${args[0]}>
      【要求】字数不限，越详细越好，最好每个知识点都有具体示例；主要语言为中文，并且使用标准markdown语法格式。
    `
    // 【要求】主要使用中文，按照JSON{"result": <详解>}格式返回，其中"result"为string类型，使用标准markdown语法格式，字数不限，越详细越好，最好每个知识点都有具体示例
  }

  if (type === 'content') {
    return `开始讲解`
  }
}

// 概括考点
const useSumPoint = (text) => {
  const system = `概括以下内容的考点/知识点，主要使用中文，按照JSON{"point": <考点/知识点>}格式返回，其中"point"为简短的字符串。`
  const user = `【内容】${text}`

  return {
    system,
    user
  }
}

module.exports = {
  useSystemSentence,
  useUserSentence,
  useSubcategorySentence,
  useNoteSentence,
  useSumPoint
}
