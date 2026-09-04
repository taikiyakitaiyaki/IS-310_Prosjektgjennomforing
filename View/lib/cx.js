/* Joins class names, dropping anything falsy. */
export function cx(...names) {
  return names.filter(Boolean).join(' ')
}
