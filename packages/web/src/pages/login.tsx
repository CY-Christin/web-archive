import type { FormEvent } from 'react'
import { useState } from 'react'
import { Button } from '@web-archive/shared/components/button'
import { Input } from '@web-archive/shared/components/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@web-archive/shared/components/card'
import toast, { Toaster } from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import router from '~/utils/router'

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
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <Card className="w-full max-w-[420px] shadow-card">
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-2xl tracking-tight">Web Archive</CardTitle>
          <CardDescription>{t('please-enter-your-key-to-login')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('enter-your-password-at-least-8-characters')}
                  value={key}
                  onChange={e => setKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye /> : <EyeOff />}
                </Button>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('logging-in') : t('login')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
