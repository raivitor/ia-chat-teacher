import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import MessageInput from './MessageInput'

describe('MessageInput', () => {
  it('renders textarea and send button', () => {
    render(
      <MessageInput
        value=''
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        disabled={false}
      />,
    )

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('calls onSubmit when Enter is pressed with non-empty value', async () => {
    const onSubmit = vi.fn()
    render(
      <MessageInput
        value='hello'
        onChange={vi.fn()}
        onSubmit={onSubmit}
        disabled={false}
      />,
    )

    const textarea = screen.getByRole('textbox')
    await userEvent.click(textarea)
    await userEvent.keyboard('{Enter}')

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('does not call onSubmit when Shift+Enter is pressed', async () => {
    const onSubmit = vi.fn()
    render(
      <MessageInput
        value='hello'
        onChange={vi.fn()}
        onSubmit={onSubmit}
        disabled={false}
      />,
    )

    const textarea = screen.getByRole('textbox')
    await userEvent.click(textarea)
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit on Enter when value is blank', async () => {
    const onSubmit = vi.fn()
    render(
      <MessageInput
        value='   '
        onChange={vi.fn()}
        onSubmit={onSubmit}
        disabled={false}
      />,
    )

    const textarea = screen.getByRole('textbox')
    await userEvent.click(textarea)
    await userEvent.keyboard('{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit on Enter when disabled', async () => {
    const onSubmit = vi.fn()
    render(
      <MessageInput
        value='hello'
        onChange={vi.fn()}
        onSubmit={onSubmit}
        disabled={true}
      />,
    )

    const textarea = screen.getByRole('textbox')
    await userEvent.click(textarea)
    await userEvent.keyboard('{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables textarea and button when disabled prop is true', () => {
    render(
      <MessageInput
        value='hello'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        disabled={true}
      />,
    )

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('disables send button when value is empty', () => {
    render(
      <MessageInput
        value=''
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        disabled={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('enables send button when value is non-empty and not disabled', () => {
    render(
      <MessageInput
        value='hello'
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        disabled={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('calls onChange when text is typed', async () => {
    const onChange = vi.fn()
    render(
      <MessageInput
        value=''
        onChange={onChange}
        onSubmit={vi.fn()}
        disabled={false}
      />,
    )

    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'hi')

    expect(onChange).toHaveBeenCalled()
  })
})
