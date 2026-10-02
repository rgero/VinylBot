import { beforeEach, describe, expect, it, vi } from 'vitest';
import { populateAlbumArt } from '../../src/scripts/populateAlbumArt';

const { fromMock, getAlbumArtMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getAlbumArtMock: vi.fn(),
}));

vi.mock('../../src/services/supabase.js', () => ({ default: { from: fromMock } }));
vi.mock('../../src/services/spotify.api.js', () => ({ getAlbumArtFromSpotify: getAlbumArtMock }));

describe('populateAlbumArt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects and updates snake_case artwork only for albums missing it', async () => {
    const selectMock = vi.fn().mockResolvedValue({ data: [
      { id: 1, artist: 'A', album: 'One', image_url: null },
      { id: 2, artist: 'B', album: 'Two', image_url: ' ' },
      { id: 3, artist: 'C', album: 'Three', image_url: 'existing' },
    ], error: null });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock, update: updateMock });
    getAlbumArtMock.mockResolvedValue('new-art');

    await populateAlbumArt();

    expect(selectMock).toHaveBeenCalledWith('id, artist, album, image_url');
    expect(getAlbumArtMock).toHaveBeenCalledTimes(2);
    expect(getAlbumArtMock).toHaveBeenNthCalledWith(1, 'A', 'One');
    expect(getAlbumArtMock).toHaveBeenNthCalledWith(2, 'B', 'Two');
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledWith({ image_url: 'new-art' });
    expect(eqMock).toHaveBeenNthCalledWith(1, 'id', 1);
    expect(eqMock).toHaveBeenNthCalledWith(2, 'id', 2);
  });

  it('does not update when Spotify returns no artwork', async () => {
    const updateMock = vi.fn();
    fromMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ artist: 'A', album: 'B', image_url: '' }], error: null }),
      update: updateMock,
    });
    getAlbumArtMock.mockResolvedValue(null);

    await populateAlbumArt();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('throws on a database fetch error', async () => {
    fromMock.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: { message: 'db' } }) });

    await expect(populateAlbumArt()).rejects.toThrow('Supabase fetch error: db');
    expect(getAlbumArtMock).not.toHaveBeenCalled();
  });
});