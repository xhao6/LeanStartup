import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock uni
vi.stubGlobal('uni', {
  showModal: vi.fn(({ success }) => success({ confirm: true })),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showToast: vi.fn()
})

// Mock pinia store
const mockLogin = vi.fn().mockResolvedValue(undefined)
const mockLogout = vi.fn()
vi.mock('@/store', () => ({
  useUserStore: () => ({
    isLoggedIn: false,
    login: mockLogin,
    logout: mockLogout
  })
}))

import { useLogin } from '@/composables/useLogin'

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ensureLoggedIn returns true after login', async () => {
    const { ensureLoggedIn } = useLogin()
    const result = await ensureLoggedIn()
    expect(result).toBe(true)
    expect(mockLogin).toHaveBeenCalled()
  })

  it('loginAndDo executes callback after login', async () => {
    const callback = vi.fn()
    const { loginAndDo } = useLogin()
    const result = await loginAndDo(callback)
    expect(result).toBe(true)
    expect(callback).toHaveBeenCalled()
  })

  it('loginAndDo returns false when user cancels', async () => {
    // Override showModal to simulate cancel
    vi.mocked(uni.showModal).mockImplementationOnce(({ success }: any) => success({ confirm: false }))
    const callback = vi.fn()
    const { loginAndDo } = useLogin()
    const result = await loginAndDo(callback)
    expect(result).toBe(false)
    expect(callback).not.toHaveBeenCalled()
  })

  it('ensureLoggedIn returns false when user cancels modal', async () => {
    vi.mocked(uni.showModal).mockImplementationOnce(({ success }: any) => success({ confirm: false }))
    const { ensureLoggedIn } = useLogin()
    const result = await ensureLoggedIn()
    expect(result).toBe(false)
    expect(mockLogin).not.toHaveBeenCalled()
  })
})
