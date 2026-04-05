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
    listTitle: 'Bikepacking kit list',
    onListTitleChange: vi.fn(),
    onClearAll: vi.fn(),
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

  it('shows the list title as a button', () => {
    setup({ listTitle: 'My adventure list' })
    expect(screen.getByRole('button', { name: /My adventure list/i })).toBeInTheDocument()
  })

  it('clicking the list title button shows an editable input', async () => {
    const user = userEvent.setup()
    setup({ listTitle: 'My adventure list' })
    await user.click(screen.getByRole('button', { name: /My adventure list/i }))
    expect(screen.getByRole('textbox', { name: 'List title' })).toBeInTheDocument()
  })

  it('pressing Enter on the title input commits the new title', async () => {
    const user = userEvent.setup()
    const props = setup({ listTitle: 'Old title' })
    await user.click(screen.getByRole('button', { name: /Old title/i }))
    const input = screen.getByRole('textbox', { name: 'List title' })
    await user.clear(input)
    await user.type(input, 'New title{Enter}')
    expect(props.onListTitleChange).toHaveBeenCalledWith('New title')
  })

  it('pressing Escape on the title input cancels editing', async () => {
    const user = userEvent.setup()
    const props = setup({ listTitle: 'Original title' })
    await user.click(screen.getByRole('button', { name: /Original title/i }))
    const input = screen.getByRole('textbox', { name: 'List title' })
    await user.clear(input)
    await user.type(input, 'Discard me{Escape}')
    expect(props.onListTitleChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Original title/i })).toBeInTheDocument()
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

  it('Clear all button shows confirmation UI when clicked', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.getByText('Clear all gear?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('confirming Clear all calls onClearAll', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByRole('button', { name: /clear all/i }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(props.onClearAll).toHaveBeenCalled()
  })

  it('cancelling Clear all does not call onClearAll', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByRole('button', { name: /clear all/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onClearAll).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
  })
})
