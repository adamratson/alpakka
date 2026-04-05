import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddItemForm from '../components/AddItemForm'

function setup() {
  const onAdd = vi.fn()
  const onCancel = vi.fn()
  render(<AddItemForm onAdd={onAdd} onCancel={onCancel} />)
  return { onAdd, onCancel }
}

describe('AddItemForm', () => {
  it('renders title and description inputs', () => {
    setup()
    expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument()
  })

  it('Add button is disabled when title is empty', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('Add button is enabled once a title is typed', async () => {
    const user = userEvent.setup()
    setup()
    await user.type(screen.getByPlaceholderText('Item name'), 'Helmet')
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
  })

  it('calls onAdd with title and description on submit', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    await user.type(screen.getByPlaceholderText('Item name'), 'Helmet')
    await user.type(screen.getByPlaceholderText('Description (optional)'), 'Full face')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledWith('Helmet', 'Full face')
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('submits on Enter key', async () => {
    const user = userEvent.setup()
    const { onAdd } = setup()
    await user.type(screen.getByPlaceholderText('Item name'), 'Tape')
    await user.keyboard('{Enter}')
    expect(onAdd).toHaveBeenCalledWith('Tape', '')
  })

  it('cancels on Escape key', async () => {
    const user = userEvent.setup()
    const { onCancel } = setup()
    await user.type(screen.getByPlaceholderText('Item name'), 'Tape')
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })
})
