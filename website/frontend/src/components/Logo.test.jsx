import { render } from '@testing-library/react'
import Logo from './Logo'

describe('Logo', () => {
  it('renders an SVG at the default size', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '28')
    expect(svg).toHaveAttribute('height', '28')
  })

  it('accepts a custom size', () => {
    const { container } = render(<Logo size={48} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '48')
    expect(svg).toHaveAttribute('height', '48')
  })
})