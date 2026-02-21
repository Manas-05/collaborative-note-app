import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io(process.env.REACT_APP_SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};