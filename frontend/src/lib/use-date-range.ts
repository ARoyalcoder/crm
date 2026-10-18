import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isPresetId, isValidRange, presetOf, rangeForPreset, type DateRange, type RangePresetId } from '@/lib/date-range'

/**
 * The date range of a dashboard, kept in the address bar (`?range=this-month` or `?from=...&to=...`)
 * so a view can be bookmarked, shared, and carried into the pages a chart drills down to.
 */
export function useDateRange(defaultPreset: RangePresetId = 'last-30-days') {
  const [params, setParams] = useSearchParams()
  const presetParam = params.get('range')
  const fromParam = params.get('from')
  const toParam = params.get('to')

  const range: DateRange = useMemo(() => {
    if (fromParam && toParam && isValidRange({ from: fromParam, to: toParam })) return { from: fromParam, to: toParam }
    return rangeForPreset(isPresetId(presetParam) ? presetParam : defaultPreset)
    // The preset is resolved against today's date when the page opens or the parameter changes.
  }, [presetParam, fromParam, toParam, defaultPreset])

  const preset: RangePresetId | null = useMemo(
    () => (fromParam && toParam ? presetOf(range) : (isPresetId(presetParam) ? presetParam : defaultPreset)),
    [fromParam, toParam, presetParam, defaultPreset, range],
  )

  const setPreset = useCallback(
    (id: RangePresetId) => {
      const next = new URLSearchParams(window.location.search)
      next.delete('from')
      next.delete('to')
      if (id === defaultPreset) next.delete('range')
      else next.set('range', id)
      setParams(next, { replace: true })
    },
    [setParams, defaultPreset],
  )

  const setCustom = useCallback(
    (custom: DateRange) => {
      if (!isValidRange(custom)) return
      const next = new URLSearchParams(window.location.search)
      next.delete('range')
      next.set('from', custom.from)
      next.set('to', custom.to)
      setParams(next, { replace: true })
    },
    [setParams],
  )

  /** Query string that carries the range into a page the dashboard links to. */
  const search = `from=${range.from}&to=${range.to}`

  return { range, preset, setPreset, setCustom, search }
}
