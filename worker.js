const { parentPort, workerData } = require('worker_threads');
const result = workerData.map(item => ({ lat: +(item.lat + 0.1).toFixed(2), lng: item.lng }));
parentPort.postMessage(result);
