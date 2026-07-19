const { init, emitToUser } = require('../../src/services/socket.service');

describe('socket.service', () => {
  it('should emit event to correct user room', () => {
    const mockEmit = jest.fn();
    const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
    const mockIO = { to: mockTo };

    init(mockIO);
    emitToUser('usr_42', 'notification:new', { id: 'ntf_1' });

    expect(mockTo).toHaveBeenCalledWith('user:usr_42');
    expect(mockEmit).toHaveBeenCalledWith('notification:new', { id: 'ntf_1' });
  });

  it('should not throw when io is not initialized', () => {
    init(null);

    expect(() => {
      emitToUser('usr_42', 'notification:new', { id: 'ntf_1' });
    }).not.toThrow();
  });
});
