import {
  getPlaylistIds,
  isInPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  togglePlaylist,
} from './playlist'

describe('playlist utils (localStorage-backed)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns an empty array when nothing is stored', () => {
    expect(getPlaylistIds()).toEqual([])
  })

  it('adds an id to the playlist', () => {
    addToPlaylist('movie-1')
    expect(getPlaylistIds()).toEqual(['movie-1'])
    expect(isInPlaylist('movie-1')).toBe(true)
  })

  it('does not add duplicate ids', () => {
    addToPlaylist('movie-1')
    addToPlaylist('movie-1')
    expect(getPlaylistIds()).toEqual(['movie-1'])
  })

  it('removes an id from the playlist', () => {
    addToPlaylist('movie-1')
    addToPlaylist('movie-2')
    removeFromPlaylist('movie-1')
    expect(getPlaylistIds()).toEqual(['movie-2'])
  })

  it('toggles an id in and out, returning the new membership state', () => {
    expect(togglePlaylist('movie-1')).toBe(true)
    expect(isInPlaylist('movie-1')).toBe(true)

    expect(togglePlaylist('movie-1')).toBe(false)
    expect(isInPlaylist('movie-1')).toBe(false)
  })

  it('recovers gracefully from corrupted localStorage data', () => {
    window.localStorage.setItem('pv-playlist-ids', 'not valid json')
    expect(getPlaylistIds()).toEqual([])
  })
})