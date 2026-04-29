import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KitSection from '../components/KitSection'
import type { KitSection as KitSectionType } from '../data'

const makeSection = (overrides: Partial<KitSectionType> = {}): KitSectionType => ({
  id: 'sec-1',
  title: 'Repair Kit',
  items: [
    { id: 'i1', title: 'Tape', quantity: 1, perDay: false, description: '', checked: false },
    { id: 'i2', title: 'Chain lube', quantity: 1, perDay: false, description: '', checked: false },
  ],
  ...overrides,
})

describe('KitSection', () => {
  it('renders the section title and all items', () => {
    const props = {
      section: makeSection(),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    expect(screen.getByRole('heading', { name: 'Repair Kit' })).toBeInTheDocument()
    expect(screen.getByText('Tape')).toBeInTheDocument()
    expect(screen.getByText('Chain lube')).toBeInTheDocument()
  })

  it('shows "No items yet" when the section is empty', () => {
    const props = {
      section: makeSection({ items: [] }),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    expect(screen.getByText('No items yet')).toBeInTheDocument()
  })

  it('shows "Pack all" when no items are checked', () => {
    const props = {
      section: makeSection(),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    expect(screen.getByRole('button', { name: 'Pack all' })).toBeInTheDocument()
  })

  it('shows "Unpack all" when all items are checked', () => {
    const section = makeSection({
      items: [
        { id: 'i1', title: 'Tape', quantity: 1, perDay: false, description: '', checked: true },
        { id: 'i2', title: 'Chain lube', quantity: 1, perDay: false, description: '', checked: true },
      ],
    })
    const props = {
      section, days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    expect(screen.getByRole('button', { name: 'Unpack all' })).toBeInTheDocument()
  })

  it('shows "Pack rest" when some items are checked', () => {
    const section = makeSection({
      items: [
        { id: 'i1', title: 'Tape', quantity: 1, perDay: false, description: '', checked: true },
        { id: 'i2', title: 'Chain lube', quantity: 1, perDay: false, description: '', checked: false },
      ],
    })
    const props = {
      section, days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    expect(screen.getByRole('button', { name: 'Pack rest' })).toBeInTheDocument()
  })

  it('clicking "Pack all" calls onToggleAll(true)', async () => {
    const user = userEvent.setup()
    const props = {
      section: makeSection(),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    await user.click(screen.getByRole('button', { name: 'Pack all' }))
    expect(props.onToggleAll).toHaveBeenCalledWith(true)
  })

  it('clicking "Unpack all" calls onToggleAll(false)', async () => {
    const user = userEvent.setup()
    const section = makeSection({
      items: [
        { id: 'i1', title: 'Tape', quantity: 1, perDay: false, description: '', checked: true },
      ],
    })
    const props = {
      section, days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    await user.click(screen.getByRole('button', { name: 'Unpack all' }))
    expect(props.onToggleAll).toHaveBeenCalledWith(false)
  })

  it('trash icon shows section delete confirmation', async () => {
    const user = userEvent.setup()
    const props = {
      section: makeSection(),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    await user.click(screen.getByTitle('Remove section'))
    expect(screen.getByText('Remove section?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('confirming section delete calls onRemoveSection', async () => {
    const user = userEvent.setup()
    const props = {
      section: makeSection(),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    await user.click(screen.getByTitle('Remove section'))
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(props.onRemoveSection).toHaveBeenCalled()
  })

  it('"Add item" button reveals the add item form', async () => {
    const user = userEvent.setup()
    const props = {
      section: makeSection(),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    await user.click(screen.getByRole('button', { name: /add item/i }))
    expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument()
  })

  it('submitting the add item form calls onAddItem', async () => {
    const user = userEvent.setup()
    const props = {
      section: makeSection(),
      days: 7,
      onToggleItem: vi.fn(), onToggleAll: vi.fn(), onUpdateQuantity: vi.fn(),
      onUpdatePerDay: vi.fn(), onUpdateItemDetails: vi.fn(), onRemoveItem: vi.fn(), onRemoveSection: vi.fn(),
      onAddItem: vi.fn(), onRenameSection: vi.fn(),
      index: 0, total: 1, onMoveTo: vi.fn(),
    }
    render(<KitSection {...props} />)
    await user.click(screen.getByRole('button', { name: /add item/i }))
    await user.type(screen.getByPlaceholderText('Item name'), 'Rope')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(props.onAddItem).toHaveBeenCalledWith('Rope', '')
  })
})
