export function rand(...a) {
  if (a.length >= 2) {
    return Math.floor(Math.random() * a[1]) + a[0]
  }
  else {
    return Math.floor(Math.random() * a[0])
  }
}
