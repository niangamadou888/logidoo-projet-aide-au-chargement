// Script pour tester l'envoi de logs au backend
const http = require('http');

// Format du log simulant celui de ngx-logger
const logData = {
  level: 2, // INFO level in ngx-logger
  message: "Test log from script",
  additional: {
    source: 'test-script',
    timestamp: new Date().toISOString()
  }
};

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/logs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(logData))
  }
};

console.log('Sending log to backend:', logData);

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  res.setEncoding('utf8');
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(JSON.stringify(logData));
req.end();
