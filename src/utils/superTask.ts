type Task<T> = {
  fn: () => Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

export class SuperTask<T = any> {
  poolSize: number
  private taskQueue: Task<T>[] = []
  private runningCount: number = 0

  constructor(poolSize: number) {
    this.poolSize = poolSize
  }

  add(task: Task<T>['fn']): Promise<T> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        fn: task,
        resolve,
        reject,
      })
      this.runTask()
    })
  }

  private runTask() {
    while (this.runningCount < this.poolSize && this.taskQueue.length) {
      this.runningCount++
      const task = this.taskQueue.shift()!
      task
        .fn()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.runningCount--
          this.runTask()
        })
    }
  }
}
