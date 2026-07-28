import { render, screen } from '@testing-library/react'
import Toast from './Toast'

describe('Toast', () => {
  it('renders the message text', () => {
    render(<Toast message="Saved!" />)
    expect(screen.getByText('Saved!')).toBeInTheDocument()
  })

  it('defaults to the "default" tone class', () => {
    render(<Toast message="Hi" />)
    expect(screen.getByText('Hi')).toHaveClass('toast', 'toast-default')
  })

  it('applies an error tone class when specified', () => {
    render(<Toast message="Oops" tone="error" />)
    expect(screen.getByText('Oops')).toHaveClass('toast-error')
  })
})