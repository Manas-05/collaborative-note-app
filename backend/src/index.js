require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://collaborative-note-app-ten.vercel.app/',
  'https://collaborative-note-app-manas-projects-c3e25fed.vercel.app',
  'http://localhost:3000',
];

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

require('./socket/handlers')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});