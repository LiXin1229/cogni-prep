export const isEmptyObj = (o: unknown): boolean =>
  o !== null &&
  typeof o === 'object' &&
  Object.getPrototypeOf(o) === Object.prototype &&
  Object.keys(o).length === 0
