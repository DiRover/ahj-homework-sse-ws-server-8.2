const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const WS = require('ws');

let users = new Set();
let sockets = new Set();
const app = new Koa();

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUD, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

const router = new Router();

router.get('/index', async (ctx) => {
  ctx.response.body = 'hello';
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => {
  sockets.add(ws);
  ws.on('message', data => {
    const request = JSON.parse(data);
    console.log(request);
    if (request.type === 'add user' && users.has(request.nickname)) {
      const msg = {type: 'error', text: 'User with the same has already exist'};
      const response = JSON.stringify(msg);
      ws.send(response);
    } else if (request.type === 'add user') {
      users.add(request.nickname);
      const msg = {type: 'user added', users: [...users]};
      const response = JSON.stringify(msg);
      console.log('---new user---');
      console.log(response);
      console.log('---new user---');

      const nicknameValid = {type: 'nickname is valid', nickname: request.nickname};
      const responseNickname = JSON.stringify(nicknameValid);
      ws.send(responseNickname);

      sendResponse(response);
    } else if (request.type === 'get users') {
      const msg = { type: 'users list', users: [...users]}
      const response = JSON.stringify(msg);
      ws.send(response);
    } else if (request.type === 'message') {
      console.log(request.nickname);
      const msg = {type: 'message', text: request.text, name: request.nickname };
      const response = JSON.stringify(msg);
      console.log('---message text---');
      console.log(response);
      console.log('---message text---')
      sendResponse(response)
    }



    

    /*
    [...wsServer.clients]
    .filter(channel => channel.readyState === WS.OPEN)
    .forEach(channel => {channel.send('some message')});
    */
  });

  ws.send('welcome');
});

function sendResponse(response) {
  [...wsServer.clients]
    .filter(channel => channel.readyState === WS.OPEN)
    .forEach(channel => {channel.send(response)});
}

server.listen(port);