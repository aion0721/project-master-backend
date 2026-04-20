const uncPathPattern = /^\\\\[^\\/:*?"<>|\r\n]+\\[^\\/:*?"<>|\r\n]+(?:\\[^\\/:*?"<>|\r\n]+)*\\?$/

export function isNetworkPath(value: string) {
  return uncPathPattern.test(value)
}

export function isValidProjectLinkTarget(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return isNetworkPath(value)
  }
}
