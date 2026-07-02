// D1 timestamps are UTC 'YYYY-MM-DD HH:MM:SS'; show the local calendar date.
function formatLocalDate(value: Date | string | null | undefined) {
  const raw = String(value ?? '')
  const date = new Date(raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime()))
    return raw.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export { formatLocalDate }
