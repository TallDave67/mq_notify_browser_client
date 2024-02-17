const express = require('express');
var favicon = require('serve-favicon');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
app.use(favicon(__dirname + '/favicon.ico')); 

const server = createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const amqp = require('amqplib');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

var connection, channel;  //global variables
async function connectQueue() {   
  try {       
      connection = await amqp.connect("amqp://localhost");
      channel    = await connection.createChannel();
      
      // Inside the channel, define the message exchange and queue.
      // For simplicity, let’s use a direct exchange and create a queue named ‘chat_messages’
      await channel.assertExchange('direct_exchange', 'direct', { durable: false });
      await channel.assertQueue('chat_messages', { durable: false });
      await channel.bindQueue('chat_messages', 'direct_exchange', 'chat');

      // Channel is ready for use
      // console.log(channel);

  } catch (error) {
    console.error('Error connecting to RabbitMQ', error);
  }
}

var clients = {}
var event_new_socket_id = 'new_socket_id';
io.on('connection', (socket) => {
  console.log('User %s connected', socket.id);
  clients[socket.id] = socket;
  socket.emit(event_new_socket_id, socket.id)

  // Emit message to connected sockets
  var event_new_message = 'new_message';
  function emit_message(message) {
    for(client_id in clients)
    {
      console.log('... emit to socket %s', client_id)
      clients[client_id].emit('new_message', data);
    };
  }

  // Consume messages from RabbitMQ
  channel.consume('chat_messages', (message) => {
    data = message.content.toString();
    console.log('consumed message from rmq: %s', data);
    emit_message(data);

  }, { noAck: true });

  socket.on('disconnect', () => {
    console.log('User %s disconnected', socket.id);
    delete clients[socket.id];
  });
});

server.listen(3000, () => {
  console.log('Server started on port 3000');

  // Establish a connection to RabbitMQ and create a channel using the amqplib library
  connectQueue();
});

// To publish a message, create an API endpoint in your Express application
var new_message_counter = 0;
app.post('/message', (req, res) => {
  new_message_counter++;
  const message = "[" + new_message_counter.toString() + "] " + req.body.message;
  console.log('recieved message in POST, publish to rmq: %s', message);

  // Publish the message to RabbitMQ
  // console.log(channel);
  channel.publish('direct_exchange', 'chat', Buffer.from(message));

  res.sendStatus(200);
});
