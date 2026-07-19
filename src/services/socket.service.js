let io;

const init = (ioInstance) => {
  io = ioInstance;
};

// emit to a specific user's socket room
const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

module.exports = { init, emitToUser };
