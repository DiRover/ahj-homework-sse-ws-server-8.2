const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const WS = require('ws');
const users = [];
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
  ws.on('message', msg => {
    console.log(new Date());
    console.log(msg);
    console.log(users);
    if (users.length === 0) {
      users.push(msg);
      ws.send(msg);
    } else {
      users.forEach((user) => {
        if (user === msg) {
          ws.send('User with the same has already exist');
        } else {
          users.push(msg);
          ws.send('User was added');
        }
      })
    }
    /*if (users.length === 0) {
      users.push(msg);
      ws.send('new user added'); //сообщение отправляется 2 раза, не понимаю почему
    } else {
      users.forEach((user) => {
        if (user === msg) {
            ws.send('User with the same has already exist') //сообщение отправляется 2 раза, не понимаю почему
        } else {
          console.log('tut');
          ws.send('new user added');
          users.push(msg);
          console.log(users);
        }
      })
    }
    //ws.send('response: ' + wsServer.clients.size + ' has ' + wsServer.clients.has(msg) + ' entries ' + wsServer.clients.entries());
    */
   /*
    [...wsServer.clients]
    .filter(channel => channel.readyState === WS.OPEN)
    .forEach(channel => {channel.send('some message')});
    */
  });

  ws.send('welcome');
});

server.listen(port);
