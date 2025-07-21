export const useInterviewSentence = (type, ...args) => {
  if (type === 'start1') {
    return `假设这是一场${args[0]}面试，你是面试官，问我一个有关${args[1]}的问题，按照JSON{"question": "问题"}格式返回`
  }
}
