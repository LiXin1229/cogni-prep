// import { remark } from 'remark'
// import axios from 'axios'

self.onmessage = async (event) => {
  const { id } = event.data
  // console.log(event)

  try {
    // const ast = remark().parse(markdown)
    const ast = null
    self.postMessage({ id, ast: ast, error: null })
  } catch (error: any) {
    self.postMessage({ id, ast: null, error: error.message })
  }
}
