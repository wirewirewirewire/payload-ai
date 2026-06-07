import { describe, expect, it, vi } from 'vitest'

import { validateAccess } from './validateAccess.js'

describe('validateAccess', () => {
  it('requires an authenticated user when no access rule is available', () => {
    expect(validateAccess({}, {})).toBe(false)
    expect(validateAccess({ user: { id: 'user-1' } }, {})).toBe(true)
  })

  it('uses collection update access when available', () => {
    const updateAccess = vi.fn(() => false)
    const req = {
      collection: {
        config: {
          slug: 'posts',
          access: {
            update: updateAccess,
          },
        },
      },
      user: { id: 'user-1' },
    }

    expect(validateAccess(req, {})).toBe(false)
    expect(updateAccess).toHaveBeenCalledWith({ req })
  })

  it('lets plugin collection access override collection update access', () => {
    const pluginAccess = vi.fn(() => true)
    const updateAccess = vi.fn(() => false)
    const req = {
      collection: {
        config: {
          slug: 'posts',
          access: {
            update: updateAccess,
          },
        },
      },
    }

    expect(
      validateAccess(req, {
        collections: {
          posts: {
            access: pluginAccess,
          },
        },
      }),
    ).toBe(true)
    expect(pluginAccess).toHaveBeenCalledWith({ req })
    expect(updateAccess).not.toHaveBeenCalled()
  })
})
