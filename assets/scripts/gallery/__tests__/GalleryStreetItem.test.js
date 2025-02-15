/* eslint-env jest */
import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../../../test/helpers/render'
import MOCK_STREET from '../../../../test/fixtures/street.json'
import GalleryStreetItem from '../GalleryStreetItem'

// Mock dependencies
jest.mock('../../streets/thumbnail', () => ({
  drawStreetThumbnail: jest.fn()
}))
jest.mock('../../app/page_url', () => ({
  getStreetUrl: jest.fn()
}))

describe('GalleryStreetItem', () => {
  it('renders', () => {
    // This uses jsdom + canvas packages under the hood to render canvas element
    const { asFragment } = render(<GalleryStreetItem street={MOCK_STREET} />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('does not display street owner when we ask it not to', () => {
    render(<GalleryStreetItem street={MOCK_STREET} showStreetOwner={false} />)

    expect(screen.queryByText(MOCK_STREET.creatorId)).not.toBeInTheDocument()
  })

  it('displays "Unnamed St" without a street name', () => {
    render(
      <GalleryStreetItem
        street={{
          ...MOCK_STREET,
          name: null
        }}
      />
    )

    expect(screen.getByText('Unnamed St')).toBeInTheDocument()
  })

  it('displays "Anonymous" for anonymous streets', async () => {
    render(
      <GalleryStreetItem
        street={{
          ...MOCK_STREET,
          creatorId: null
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Anonymous')).toBeInTheDocument()
    })
  })

  it('handles select', async () => {
    const doSelect = jest.fn()
    render(<GalleryStreetItem street={MOCK_STREET} doSelect={doSelect} />)

    await userEvent.click(screen.getByText(MOCK_STREET.name))
    expect(doSelect).toBeCalled()
  })

  it('handles delete when confirmed', async () => {
    const doDelete = jest.fn()
    window.confirm = jest.fn(() => true)

    render(
      <GalleryStreetItem
        street={MOCK_STREET}
        doDelete={doDelete}
        allowDelete={true}
      />
    )

    await userEvent.click(screen.getByTitle('Delete street'))
    expect(doDelete).toBeCalled()
  })

  it('does not delete when confirmation is cancelled', async () => {
    const doDelete = jest.fn()
    window.confirm = jest.fn(() => false)

    render(
      <GalleryStreetItem
        street={MOCK_STREET}
        doDelete={doDelete}
        allowDelete={true}
      />
    )

    await userEvent.click(screen.getByTitle('Delete street'))
    expect(doDelete).not.toBeCalled()
  })
})
