const express = require('express');
const { Worker, isMainThread } = require('worker_threads');
const app = express();
const server = app.listen(3000, function () {
  console.log('listening on *:3000');
});
const io = require('socket.io').listen(server);
const yargs = require('yargs');
const argv = yargs.argv;

const createGroupedArray = (arr, chunkSize) => {
  const groups = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    groups.push(arr.slice(i, i + chunkSize));
  }
  return groups;
}
const generateInitialCoords = () => {
  return {
    lat: (Math.floor(Math.random() * (5200 - 4400 + 1)) + 4400) / 100,
    lng: (Math.floor(Math.random() * (4000 - 2200 + 1)) + 2200) / 100,
  }
}
let initialCoords = Array(argv.length || 100).fill(1).map(item => generateInitialCoords());

const generateCoords = () => {
  for (let i = 0; i < initialCoords.length; i++) {
    const { lat, lng } = initialCoords[i];
    initialCoords[i] = { lat: +(lat + 0.1).toFixed(2), lng };
  }
  return initialCoords;
}

let index = 0;
const asyncIterator = {
  next: () => {
    if (index >= initialCoords.length) {
      return Promise.resolve({ done: true });
    }
    const value = initialCoords[index++];
    return Promise.resolve({ value, done: false });
  }
};

const asyncIterable = {
  [Symbol.asyncIterator]: () => asyncIterator
};

async function main() {
  for await (const value of asyncIterable) {
    const { lat, lng } = value;
    initialCoords[index - 1] = { lat: +(lat + 0.01).toFixed(2), lng };
  }
  index = 0
}

async function sendByAsyncIterator(socket) {
  await main().catch(error => console.error(error.stack));
  socket.emit('coordinates', initialCoords);
}

const generateCoordsByWorker = () => {
  return new Promise(function (resolve, reject) {
    if (isMainThread) {
      const result = [];
      createGroupedArray(initialCoords, initialCoords.length / 4).map(arrayPart => {
        let w = new Worker(__dirname + '/worker.js', { workerData: arrayPart });
        w.on('message', msg => {
          result.push(...msg)
          if (result.length === initialCoords.length) {
            initialCoords = result;
            return resolve();
          }
        })
        w.on('error', (e) => console.error('e', e));
        w.on('exit', (code) => {
          if (code != 0)
            console.error(new Error(`Worker stopped with exit code ${code}`))
        });
      });
    }
  })
}

async function sendByWorkers(socket) {
  await generateCoordsByWorker();
  socket.emit('coordinates', initialCoords);
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
      // async iterator
      // sendByAsyncIterator(socket);

      //workers
      sendByWorkers(socket);

      // for loop
      // socket.emit('coordinates', generateCoords());
    }, 1000);
  });
});
