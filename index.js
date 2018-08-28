const express = require('express');
const app = express();
const server = app.listen(3000, function () {
  console.log('listening on *:3000');
});
const io = require('socket.io').listen(server);
const yargs = require('yargs');
const argv = yargs.argv;

const generateCoordinates = () => {
  return {
    lat: (Math.floor(Math.random() * (5200 - 4400 + 1)) + 4400) / 100,
    long: (Math.floor(Math.random() * (4000 - 2200 + 1)) + 2200) / 100,
  }
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

io.on('connection', (socket) => {
  console.log('user connected');
  socket.on('fetchCoordinates', () => {
    setInterval(() => {
      socket.emit('coordinates', Array(argv.length || 100).fill(1).map(item => generateCoordinates()));
    }, 1000);
  });
});
