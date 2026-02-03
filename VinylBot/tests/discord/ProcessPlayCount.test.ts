import { beforeEach, describe, expect, it, vi } from 'vitest';
import {getSortedPlaysByQuery, getTopPlayedAlbumsByUserID} from '../../src/services/plays.api.js';

import { EmbeddedResponse } from '../../src/utils/discord/EmbeddedResponse.js';
import { ProcessPlayCount } from '../../src/discord/stats/ProcessPlayCount.js';
import { getNameById } from '../../src/services/users.api.js';
import { getVinylsByPlayCount } from '../../src/services/vinyls.api.js';
import { parseCommand } from '../../src/utils/parseCommand.js';

// Mock all external modules
vi.mock('../../src/utils/parseCommand.js');
vi.mock('../../src/services/users.api.js');
vi.mock('../../src/services/plays.api.js');
vi.mock('../../src/services/vinyls.api.js');
vi.mock('../../src/utils/discord/EmbeddedResponse.js');
describe('ProcessPlayCount', () => {
  let mockMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage = {
      reply: vi.fn().mockResolvedValue({}),
    };
  });

  it('should clean the search term by removing "plays" (case-insensitive)', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ type: 'search', term: 'plays Rise Against' });
    vi.mocked(getSortedPlaysByQuery).mockResolvedValue([{ title: 'Siren Song', count: 10 }]);

    await ProcessPlayCount(mockMessage);

    expect(getSortedPlaysByQuery).toHaveBeenCalledWith('Rise Against');
    
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Albums by Play Count matching "Rise Against"'
    }));
  });

  it('should fetch user-specific plays and names in parallel', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ type: 'user', term: 'user_123' });
    vi.mocked(getNameById).mockResolvedValue('VinylEnthusiast');
    vi.mocked(getTopPlayedAlbumsByUserID).mockResolvedValue([{ title: 'The Sufferer & the Witness', count: 5 }]);

    await ProcessPlayCount(mockMessage);

    expect(getNameById).toHaveBeenCalledWith('user_123');
    expect(getTopPlayedAlbumsByUserID).toHaveBeenCalledWith('user_123');
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Albums by Play Count for VinylEnthusiast'
    }));
  });

  it('should fallback to all-time counts in the default case', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ type: 'full', term: '' });
    vi.mocked(getVinylsByPlayCount).mockResolvedValue([{ title: 'Generic Album', count: 1 }]);

    await ProcessPlayCount(mockMessage);

    expect(getVinylsByPlayCount).toHaveBeenCalled();
    expect(EmbeddedResponse).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Top Albums by Play Count (All Time)'
    }));
  });

  it('should show a warning message if the resulting list is empty', async () => {
    vi.mocked(parseCommand).mockResolvedValue({ type: 'search', term: 'NonExistentBand' });
    vi.mocked(getSortedPlaysByQuery).mockResolvedValue([]);

    await ProcessPlayCount(mockMessage);

    expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('⚠️ No plays found'));
    expect(EmbeddedResponse).not.toHaveBeenCalled();
  });
});