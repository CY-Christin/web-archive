import type { FormEvent } from 'react'
import { useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Archive, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import router from '~/utils/router'
import { toastOptions } from '~/utils/toast'

export default function LoginPage() {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (key.length < 8) {
      toast.error(t('password-must-be-at-least-8-characters'))
      return
    }
    setLoading(true)
    fetch('api/auth', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
      .then(async (res) => {
        if (res.status === 200) {
          localStorage.setItem('token', key)
          router.navigate('/')
          return
        }
        if (res.status === 201) {
          toast.success(t('password-set-success-toast'))
          return
        }
        const json = await res.json()
        toast.error(json.error)
      })
      .catch(() => {
        toast.error(t('something-went-wrong'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={toastOptions}
      />

      {/* Brand pane (desktop only) */}
      <div className="hidden min-w-0 flex-[1.15] flex-col justify-between bg-[linear-gradient(160deg,hsl(var(--primary))_0%,#2a49a6_100%)] px-[52px] py-14 text-white desk:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.16]">
            <Archive size={22} strokeWidth={1.8} />
          </div>
          <span className="text-lg font-extrabold tracking-[-0.01em]">Web Archive</span>
        </div>
        <div>
          <h1 className="mb-[18px] max-w-[11ch] whitespace-pre-line text-[38px] font-extrabold leading-[1.15] tracking-[-0.02em]">
            {t('login-hero-title')}
          </h1>
          <p className="max-w-[34ch] text-[15px] leading-[1.6] text-white/[.82]">{t('login-hero-desc')}</p>
          <div className="mt-[26px] flex flex-wrap gap-2.5">
            {[t('login-chip-d1'), t('login-chip-r2'), t('login-chip-ai')].map(chip => (
              <span key={chip} className="rounded-full bg-white/[.14] px-[11px] py-1.5 font-mono text-xs">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <span className="font-mono text-xs text-white/60">{t('login-copyright')}</span>
      </div>

      {/* Form pane */}
      <div className="flex min-w-0 flex-1 items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          <h2 className="mb-1.5 text-2xl font-extrabold tracking-[-0.01em] text-foreground">{t('login-welcome-back')}</h2>
          <p className="mb-7 text-sm text-muted-foreground">{t('please-enter-your-key-to-login')}</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="access-key" className="mb-2 block text-xs font-semibold text-muted-foreground">
              {t('login-access-key')}
            </label>
            <div className="relative mb-[18px]">
              <input
                id="access-key"
                type={showPassword ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                className="h-[46px] w-full rounded-xl border border-border-strong bg-surface pl-3.5 pr-11 font-mono text-sm text-foreground outline-none focus:border-primary focus:shadow-focus-ring"
              />
              <button
                type="button"
                aria-label={t('toggle-password-visibility')}
                className="absolute right-1.5 top-1.5 flex h-[34px] w-[34px] items-center justify-center rounded-iconbtn text-faint hover:bg-surface-2 hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-[46px] w-full rounded-xl bg-primary text-[15px] font-bold tracking-[0.01em] text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? t('logging-in') : t('login')}
            </button>
          </form>
          <p className="mt-[18px] text-center text-xs leading-[1.6] text-faint">{t('login-footnote')}</p>
        </div>
      </div>
    </div>
  )
}
