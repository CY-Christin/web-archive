import { useEffect, useState } from 'react'

type Breakpoints = {
  'sm': boolean
  'md': boolean
  'lg': boolean
  'xl': boolean
  '2xl': boolean
}

const breakpointQueries = {
  'sm': '(min-width: 640px)',
  'md': '(min-width: 768px)',
  'lg': '(min-width: 1024px)',
  'xl': '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
}

export function useMediaQuery(): Breakpoints
export function useMediaQuery<T extends string>(query: T): boolean

export function useMediaQuery(query?: string): Breakpoints | boolean {
  // Initialize synchronously so layout code (e.g. the mobile drawer) doesn't
  // render one desktop frame before the effect runs.
  const [matches, setMatches] = useState(() => (query ? window.matchMedia(query).matches : false))
  const [breakpoints, setBreakpoints] = useState<Breakpoints>({
    'sm': false,
    'md': false,
    'lg': false,
    'xl': false,
    '2xl': false,
  })

  useEffect(() => {
    if (query) {
      const mediaQuery = window.matchMedia(query)
      setMatches(mediaQuery.matches)

      let timeoutId: NodeJS.Timeout

      const handler = (event: MediaQueryListEvent) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
          setMatches(event.matches)
        }, 100)
      }

      mediaQuery.addEventListener('change', handler)

      return () => {
        mediaQuery.removeEventListener('change', handler)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }
    else {
      const mediaQueries = Object.entries(breakpointQueries).map(([key, query]) => ({
        key,
        mq: window.matchMedia(query),
      }))

      const updateBreakpoints = () => {
        const newBreakpoints = mediaQueries.reduce(
          (acc, { key, mq }) => ({
            ...acc,
            [key]: mq.matches,
          }),
          {} as Breakpoints,
        )
        setBreakpoints(newBreakpoints)
      }

      updateBreakpoints()

      mediaQueries.forEach(({ mq }) => {
        mq.addEventListener('change', updateBreakpoints)
      })

      return () => {
        mediaQueries.forEach(({ mq }) => {
          mq.removeEventListener('change', updateBreakpoints)
        })
      }
    }
  }, [query])

  return query ? matches : breakpoints
}
