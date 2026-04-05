import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppHeader from '../components/AppHeader'

function setup(overrides = {}) {
  const props = {
    days: 7,
    onDaysChange: vi.fn(),
    checkedItems: 3,
    totalItems: 10,
    onReset: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    ...overrides,
  }
  render(<AppHeader {...props} />)
  return props
}

describe('AppHeader', () => {
  it('renders the app title', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Pakka' })).toBeInTheDocument()
  })

  it('shows the packed item count', () => {
    setup({ checkedItems: 4, totalItems: 12 })
    expect(screen.getByText('4 / 12 packed')).toBeInTheDocument()
  })

  it('shows the trip days value in the input', () => {
    setup({ days: 5 })
    expect(screen.getByRole('spinbutton')).toHaveValue(5)
  })

  it('calls onDaysChange when the days input changes', async () => {
    const user = userEvent.setup()
    const props = setup({ days: 7 })
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '10')
    expect(props.onDaysChange).toHaveBeenCalledWith(10)
  })

  it('resets the days input to the prop value on blur if left empty', async () => {
    const user = userEvent.setup()
    setup({ days: 7 })
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.tab()
    expect(input).toHaveValue(7)
  })

  it('calls onReset when Reset is clicked', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(props.onReset).toHaveBeenCalled()
  })

  it('calls onExport when the export button is clicked', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByRole('button', { name: /export/i }))
    expect(props.onExport).toHaveBeenCalled()
  })

  it('an import button is present in the header', () => {
    setup()
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
  })

  it('progress bar width reflects the ratio of checked items', () => {
    setup({ checkedItems: 5, totalItems: 10 })
    // 50% progress
    const fill = document.querySelector('.progress__fill') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })

  it('progress bar is 0% when no items exist', () => {
    setup({ checkedItems: 0, totalItems: 0 })
    const fill = document.querySelector('.progress__fill') as HTMLElement
    expect(fill.style.width).toBe('0%')
  })
})
