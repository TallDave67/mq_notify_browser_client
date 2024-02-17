const socket = io.connect("http://localhost:3000", {
  withCredentials: true,
});
const socket_id = document.querySelector('#socket_id');
const notification = document.querySelector('#notification');

const listener_new_socket_id = (data) => {
  console.log('listener_new_socket_id: %s', data)
  socket_id.textContent = data;
}

const listener_new_message = (data) => {
  console.log('listener_new_message: %s', data)
  notification.textContent = data;
}

var event_new_socket_id = 'new_socket_id';
var event_new_message = 'new_message';
socket.on('connect', () => {
  console.log('client connected')
  socket.on(event_new_socket_id, listener_new_socket_id);
  socket.on(event_new_message, listener_new_message);
});

