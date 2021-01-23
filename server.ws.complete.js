const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const WS = require('ws');


app.use(async (ctx, next) => {
  ctx.body = 'Server is working...';
})

let users = new Set();
let sockets = new Set();
const app = new Koa();

console.log('server is working');

app.get('/', async (ctx) => {
  ctx.response.body = 'hello';
});

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

router.get('', async (ctx) => {
  ctx.response.body = 'server is running...';
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => { //подписываемся на событие конэкшн
  sockets.add(ws);
  ws.on('message', data => {
    const request = JSON.parse(data); //парсим запрос
    console.log(request); //чтение запроса
    console.log(wsServer.clients.size); //информация о кол-ве подключённых пользователей
    if (request.type === 'add user' && users.has(request.nickname)) { //проверяем огригинальность имени
      const msg = {type: 'error', text: 'User with the same has already exist'};
      const response = JSON.stringify(msg); //если имя существует
      ws.send(response);
    } else if (request.type === 'add user') { //если имя оригинально
      users.add(request.nickname);
      const msg = {type: 'user added', users: [...users]};
      const response = JSON.stringify(msg); //создаём ответ
      console.log(wsServer.clients.size); //информация о кол-ве подключённых пользователей
      const nicknameValid = {type: 'nickname is valid', nickname: request.nickname};
      const responseNickname = JSON.stringify(nicknameValid);
      ws.send(responseNickname); //отправляем юзеру выславшему запрос положитенльный ответ
      sendResponse(response); //отправляем всем юзерам новый список
    } else if (request.type === 'get users') { //отправляем список юзеров на запрос при загрузке страници
      const msg = { type: 'users list', users: [...users]}
      const response = JSON.stringify(msg);
      ws.send(response);
    } else if (request.type === 'message') { //отправляем сообщения
      console.log(request.nickname);
      const msg = {type: 'message', text: request.text, name: request.nickname };
      const response = JSON.stringify(msg);
      sendResponse(response); //направляем сообщение всем пользователям
    } else if (request.type === 'delete') { //юзер покинул чат
      users.delete(request.nickname); //удаляем пользователя
      console.log(users);
      const msg = { type: 'users list', users: [...users]}
      const response = JSON.stringify(msg);
      sendResponse(response);
      console.log('user delete');
    }
  });

  ws.on('close', (event) => { //удаляем клиента при ws.close
    wsServer.clients.delete(ws);
    console.log(wsServer.clients.size)
  })
});

function sendResponse(response) { //функция для отправки сообщения всем пользователям
  [...wsServer.clients]
    .filter(channel => channel.readyState === WS.OPEN)
    .forEach(channel => {channel.send(response)});
}

server.listen(port);