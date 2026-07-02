import type { DefaultToastOptions } from 'react-hot-toast'

// react-hot-toast defaults to a white pill (#fff/#363636); restyle to the
// design's surface tokens so toasts match both themes.
const toastOptions: DefaultToastOptions = {
  style: {
    background: 'var(--surface)',
    color: 'hsl(var(--foreground))',
    border: '1px solid var(--border-strong)',
    boxShadow: 'var(--shadow)',
  },
}

export { toastOptions }
