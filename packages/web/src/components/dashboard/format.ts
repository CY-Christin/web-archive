const GB = 1024 ** 3
const MB = 1024 ** 2

// The design mock renders sizes with one decimal ("3.1 GB", "0.9 GB", "2.5 MB").
// Below ~0.1 GB we fall back to MB so tiny archives don't read "0.0 GB".
function formatSize(bytes: number): { value: string, unit: 'GB' | 'MB' } {
  if (bytes >= 0.1 * GB)
    return { value: (bytes / GB).toFixed(1), unit: 'GB' }
  return { value: (bytes / MB).toFixed(1), unit: 'MB' }
}

function formatSizeText(bytes: number): string {
  const { value, unit } = formatSize(bytes)
  return `${value} ${unit}`
}

// Thousands separator like the mock's "1,284".
function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

export { formatCount, formatSize, formatSizeText }
