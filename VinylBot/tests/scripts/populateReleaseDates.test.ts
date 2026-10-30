import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseReleaseDates, updateReleaseDates } from '../../src/scripts/populateReleaseDates';

const { fromMock, readFileMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock('../../src/services/supabase.js', () => ({ default: { from: fromMock } }));
vi.mock('node:fs', () => ({ default: { readFileSync: readFileMock } }));

const mockUpdateChain = (selectResult: (id: number) => { data: unknown; error: unknown }) => {
  const updateMock = vi.fn();
  const eqMock = vi.fn();
  updateMock.mockReturnValue({ eq: eqMock });
  eqMock.mockImplementation((_col: string, id: number) => ({
    select: vi.fn().mockResolvedValue(selectResult(id)),
  }));
  fromMock.mockReturnValue({ update: updateMock });
  return { updateMock, eqMock };
};

describe('parseReleaseDates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('parses id and release_date, handling quoted commas', () => {
    readFileMock.mockReturnValue(
      'id,artist,album,release_date\n' +
      '155,My Chemical Romance,The Black Parade,2006-10-24\n' +
      '182,Coheed and Cambria,"Good Apollo, I\'m Burning Star IV",2005-08-30\n'
    );

    expect(parseReleaseDates('file.csv')).toEqual([
      { id: 155, release_date: '2006-10-24' },
      { id: 182, release_date: '2005-08-30' },
    ]);
  });

  it('skips rows with invalid id or date', () => {
    readFileMock.mockReturnValue(
      'id,artist,album,release_date\n' +
      'abc,A,B,2006-10-24\n' +
      '1,A,B,10/24/2006\n' +
      '2,A,B,\n' +
      '3,A,B,2001-01-01\n'
    );

    expect(parseReleaseDates('file.csv')).toEqual([{ id: 3, release_date: '2001-01-01' }]);
    expect(console.warn).toHaveBeenCalledTimes(3);
  });
});

describe('updateReleaseDates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('updates release_date for each row by id', async () => {
    const { updateMock, eqMock } = mockUpdateChain((id) => ({ data: [{ id }], error: null }));

    const result = await updateReleaseDates([
      { id: 1, release_date: '2000-01-01' },
      { id: 2, release_date: '2001-02-03' },
    ]);

    expect(fromMock).toHaveBeenCalledWith('vinyls');
    expect(updateMock).toHaveBeenNthCalledWith(1, { release_date: '2000-01-01' });
    expect(updateMock).toHaveBeenNthCalledWith(2, { release_date: '2001-02-03' });
    expect(eqMock).toHaveBeenNthCalledWith(1, 'id', 1);
    expect(eqMock).toHaveBeenNthCalledWith(2, 'id', 2);
    expect(result).toEqual({ updated: 2, notFound: 0, failed: 0 });
  });

  it('counts errors and missing rows without stopping', async () => {
    mockUpdateChain((id) => {
      if (id === 1) return { data: null, error: { message: 'db' } };
      if (id === 2) return { data: [], error: null };
      return { data: [{ id }], error: null };
    });

    const result = await updateReleaseDates([
      { id: 1, release_date: '2000-01-01' },
      { id: 2, release_date: '2000-01-01' },
      { id: 3, release_date: '2000-01-01' },
    ]);

    expect(result).toEqual({ updated: 1, notFound: 1, failed: 1 });
    expect(console.error).toHaveBeenCalledWith('[1/3] Failed to update vinyl 1:', 'db');
  });
});
