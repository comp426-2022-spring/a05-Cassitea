// Place your server entry point code here

// from server.js
// Require Express
var express = require("express")
var app = express()

// Require minimist
const args = require('minimist')(process.argv.slice(2))

// Require fs
const fs = require('fs')

// Require morgan 
const morgan = require('morgan')

// Require db script file
const db = require('./src/services/database.js')

app.use(express.json());
app.use(express.static('./public'));
app.use(express.urlencoded({extended:true}));

//creating and starting port
const port = args.port || args.p || 5000
const server = app.listen(port, () => {
    console.log("Server running on port %PORT%".replace("%PORT%",port))
});

// test if its working
app.get("/app/", (req, res, next) => {
    res.json({"message":"The API is working(200)"});
	res.status(200);
});


if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log")
} else {
    const accessLog = fs.createWriteStream('access.log', { flags: 'a' })
    app.use(morgan('combined', { stream: accessLog }))
}

// the stored help text
const help = (`
server.js [options]
--port, -p	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug, -d If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help, -h	Return this message and exit.
`)

//echos the text
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

//loging the database
app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referrer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    console.log(logdata)
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent)
    //console.log(info)
    next();
})

// new endpoints
app.post('/app/flip/coins/', (req, res, next) => {
    const flips = coinFlips(req.body.number)
    const count = countFlips(flips)
    res.status(200).json({"raw":flips,"summary":count})
})

app.post('/app/flip/call/', (req, res, next) => {
    const game = flipACoin(req.body.guess)
    res.status(200).json(game)
})

// debug
if (args.debug || args.d) {
    app.get('/app/log/access/', (req, res) => {
        const stmt = db.prepare("SELECT * FROM accesslog").all();
	    res.status(200).json(stmt);
    })

    app.get('/app/error/', (req, res) => {
        throw new Error('Error, test works.')
    })
}

//API
app.get('/app/', (req, res) => {
    res.status(200).end('OK')
    res.type('text/plain')
});

app.get('/app/flip/', (req, res) => {
    const flip = coinFlip();
    res.status(200).json({'flip' : coinFlip()})
});

app.get('/app/flips/:number', (req, res) => {
    const flips = coinFlips(req.params.number);
    const count = countFlips(flips);
    res.status(200).json({'raw': flips, 'summary': count})
});

app.get('/app/flip/call/heads', (req, res) => {
    res.status(200).json(flipACoin("heads"))
});

app.get('/app/flip/call/tails', (req, res) => {
    res.status(200).json(flipACoin("tails"))
});

app.use(function (req, res) {
    res.status(404).end('404 NOT FOUND')
    res.type('text/plain')
});


//COIN FUNCTIONS

function coinFlip() {
    return Math.random() > 0.5 ? "heads" : "tails"
  }
  
  function coinFlips(flips) {
    const result = [];
    for (var i=0; i<flips; i++) {
      result[i] = coinFlip();
    }
    return result;
  }
  
  function countFlips(array) {
    var headCount = 0;
    var tailCount = 0;
  
    for(var i=0;i<array.length; i++) {
      if (array[i] === 'heads'){
        headCount++;
      } else {
        tailCount++;
      }
    }
    return {heads: headCount, tails: tailCount};
  }
  
  function flipACoin(call) {
    var flip = coinFlip();
  
    if (call == flip) {
      return {call: call, flip: flip, result: 'win'}
    } else {
      return {call: call, flip: flip, result: 'lose'}
    }
  }