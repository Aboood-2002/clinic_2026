// socket/index.js
import { Server } from 'socket.io';

const users = {}; // or use Map/Set for better performance
let io;
export const initSocket = (server) => {
   io = new Server(server, {
    cors: {
      origin: '*', // change to your frontend URL in production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. User joins with role
    socket.on('join', (role) => {
      users[socket.id] = role;
      io.emit('onlineStatus', getOnlineCounts());
    });

    // 2. Queue events
    socket.on('queueUpdated', () => {
      // Send to doctors only (you can create rooms later)
      io.emit('queueUpdated'); // or io.to('doctors').emit(...)
    });

    // 3. Disconnect
    socket.on('disconnect', () => {
      delete users[socket.id];
      io.emit('onlineStatus', getOnlineCounts());
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

export { io };

// Helper function
function getOnlineCounts() {
  return {
    receptionists: Object.values(users).filter(r => r === 'receptionist').length,
    doctors: Object.values(users).filter(r => r === 'doctor').length,
    admins: Object.values(users).filter(r => r === 'admin').length,
  };
}