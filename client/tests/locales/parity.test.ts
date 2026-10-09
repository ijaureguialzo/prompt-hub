import { describe, it, expect } from 'vitest'
import en from '@/locales/en.js'
import es from '@/locales/es.js'
import eu from '@/locales/eu.js'

// Collects all dot-separated keys of a (possibly nested) locale object.
function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return v !== null && typeof v === 'object' ? keys(v as Record<string, unknown>, path) : [path]
  })
}

describe('i18n locale parity', () => {
  it('es has the same keys as en', () => {
    expect(new Set(keys(es))).toEqual(new Set(keys(en)))
  })

  it('eu has the same keys as en', () => {
    expect(new Set(keys(eu))).toEqual(new Set(keys(en)))
  })

  it('has no empty strings', () => {
    for (const [name, locale] of Object.entries({ en, es, eu })) {
      for (const k of keys(locale as Record<string, unknown>)) {
        const value = k
          .split('.')
          .reduce(
            (acc, part) => (acc as Record<string, unknown>)?.[part],
            locale as Record<string, unknown>
          )
        expect(value, `${name} -> ${k} is empty`).not.toBe('')
      }
    }
  })
})
