import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ItemRow from '../components/ItemRow'
import type { KitItem } from '../data'

const baseItem: KitItem = {
  id: 'item-1',
  title: 'Tape',
  quantity: 2,
  perDay: false,
  description: 'Gaffer tape',
  checked: false,
}

function setup(overrides: Partial<KitItem> = {}, days = 7) {
  const item = { ...baseItem, ...overrides }
  const props = {
    item,
    days,
    onToggle: vi.fn(),
    onUpdateQuantity: vi.fn(),
    onUpdatePerDay: vi.fn(),
    onRemove: vi.fn(),
  }
  render(<ul><ItemRow {...props} /></ul>)
  return props
}

describe('ItemRow', () => {
  it('renders title and description', () => {
    setup()
    expect(screen.getByText('Tape')).toBeInTheDocument()
    expect(screen.getByText('Gaffer tape')).toBeInTheDocument()
  })

  it('clicking the row calls onToggle', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByText('Tape'))
    expect(props.onToggle).toHaveBeenCalled()
  })

  it('applies checked styling when item is checked', () => {
    setup({ checked: true })
    const li = screen.getByRole('listitem')
    expect(li).toHaveClass('item--checked')
  })

  it('quantity input shows the current quantity', () => {
    setup({ quantity: 4 })
    expect(screen.getByRole('spinbutton')).toHaveValue(4)
  })

  it('changing quantity calls onUpdateQuantity', async () => {
    const user = userEvent.setup()
    const props = setup()
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '5')
    expect(props.onUpdateQuantity).toHaveBeenCalledWith(5)
  })

  it('shows "total" toggle when perDay is false', () => {
    setup({ perDay: false })
    expect(screen.getByRole('button', { name: /total/i })).toBeInTheDocument()
  })

  it('shows "/day" toggle when perDay is true', () => {
    setup({ perDay: true })
    expect(screen.getByRole('button', { name: /\/day/i })).toBeInTheDocument()
  })

  it('clicking the per-day toggle calls onUpdatePerDay', async () => {
    const user = userEvent.setup()
    const props = setup({ perDay: false })
    await user.click(screen.getByRole('button', { name: /total/i }))
    expect(props.onUpdatePerDay).toHaveBeenCalledWith(true)
  })

  it('shows trip total when perDay is true', () => {
    setup({ perDay: true, quantity: 3 }, 5)
    expect(screen.getByText('= 15')).toBeInTheDocument()
  })

  it('does not show trip total when perDay is false', () => {
    setup({ perDay: false, quantity: 3 }, 5)
    expect(screen.queryByText(/^= /)).not.toBeInTheDocument()
  })

  it('clicking the trash icon shows a confirmation', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByTitle('Remove item'))
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('confirming remove calls onRemove', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByTitle('Remove item'))
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(props.onRemove).toHaveBeenCalled()
  })

  it('cancelling confirmation restores the trash icon', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByTitle('Remove item'))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByTitle('Remove item')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('clicking the quantity area does not toggle the row', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByRole('spinbutton'))
    expect(props.onToggle).not.toHaveBeenCalled()
  })

  it('does not show description element when description is empty', () => {
    setup({ description: '' })
    expect(screen.queryByText('Gaffer tape')).not.toBeInTheDocument()
  })
})

describe('ItemRow — confirm region does not propagate clicks', () => {
  it('clicking Remove does not call onToggle', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByTitle('Remove item'))
    const removeBtn = screen.getByRole('button', { name: 'Remove' })
    // The confirmation span has stopPropagation, so onToggle should not fire
    within(removeBtn.closest('li')!).getByRole('button', { name: 'Remove' })
    await user.click(removeBtn)
    expect(props.onToggle).not.toHaveBeenCalled()
  })
})
