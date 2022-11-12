const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const logEvents = require('./helpers/logEvents');
const EventEmitter = require('events');
const contentTypeHelper = require('./helpers/contetntTypeHelper');
class Emitter extends EventEmitter {};
// initialise the object
const myEmitter = new Emitter();
myEmitter.on('log', (msg, fileName) => logEvents(msg, fileName));
const PORT = process.env.PORT || 3500;

// Process file operations
const serveFile = async (filePath, contentType, response) => {
    try {
        const rawData = await fsPromises.readFile(
            filePath,
            !contentType.includes('image') ? 'utf-8' : ''
        );
        const data = contentType === 'application/json'
            ? JSON.parse(rawData) : rawData;
        response.writeHead(
            filePath.includes('404.html') ? 404 : 200,
            {'Content-Type': contentType}
        );
        response.end(
            contentType === 'application/json' ? JSON.stringify(data) : data
        );
    } catch (err) {
        console.log(err);
        myEmitter.emit('log', `${err.name}: ${err.message}`, 'errLog.txt');
        response.statusCode = 500;
        response.end();
    }
}

const server = http.createServer((req, resp) => {
    console.log(req.url, req.method);
    myEmitter.emit('log', `${req.url}\t${req.method}`, 'reqLog.txt');

    const extension = path.extname(req.url);
    let contentType = contentTypeHelper[extension] || 'text/html';

    let filePath =
        contentType === 'text/html' && req.url === '/'
    ? path.join(__dirname, 'views', 'index.html')
    : contentType === 'text/html' && req.url.slice(-1) === '/'
        ? path.join(__dirname, 'views', req.url, 'index.html')
        : contentType === 'text/html'
            ? path.join(__dirname, 'views', req.url)
            : path.join(__dirname, req.url);

    if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

    const fileExits = fs.existsSync(filePath)

    if (fileExits) {
        serveFile(filePath, contentType, resp);
    } else {
        switch(path.parse(filePath).base) {
            case 'old-page.html':
                resp.writeHead(301, { location: '/new-page.html'});
                resp.end();
                break;
            case 'www-page.html':
                resp.writeHead(301, { location: '/'});
                resp.end();
                break;
            default:
                serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', resp);
        }
    }
});

server.listen(PORT, () => console.log(`Server running on: http://localhost:${PORT}`));