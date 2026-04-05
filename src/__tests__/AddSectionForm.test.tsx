import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddSectionForm, AddSectionButton } from '../components/AddSectionForm'

describe('AddSectionForm', () => {
  it('renders the section name input', () => {
    render(<AddSectionForm onAdd={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByPlaceholderText('Section name')).toBeInTheDocument()
  })

  it('Add section button is disabled when input is empty', () => {
    render(<AddSectionForm onAdd={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add section' })).toBeDisabled()
  })

  it('calls onAdd with the section title', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<AddSectionForm onAdd={onAdd} onCancel={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Section name'), 'Electronics')
    await user.click(screen.getByRole('button', { name: 'Add section' }))
    expect(onAdd).toHaveBeenCalledWith('Electronics')
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<AddSectionForm onAdd={vi.fn()} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('submits on Enter and cancels on Escape', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const onCancel = vi.fn()
    render(<AddSectionForm onAdd={onAdd} onCancel={onCancel} />)
    await user.type(screen.getByPlaceholderText('Section name'), 'Tools{Enter}')
    expect(onAdd).toHaveBeenCalledWith('Tools')
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('AddSectionButton', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<AddSectionButton onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: /add section/i }))
    expect(onClick).toHaveBeenCalled()
  })
})
