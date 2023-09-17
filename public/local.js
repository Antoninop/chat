//event index
const socket = io();
let roomName = null;

$('#searchBtn').click(() => {
    const username = $('#Username').val();
    socket.emit('searchPartner', username);
});

socket.on('partnerFound', (room) => {
    roomName = room;
    console.log('Match trouvé! Vous êtes dans la salle: ' + roomName);

    $('#searchBtn').hide();
    $('#Username').hide();
    $('#chatContainer').show();
});

socket.on('waiting', () => {
    console.log('En attente d\'un partenaire...');
});

const messageInput = $('#messageInput');
const sendMessageBtn = $('#sendMessageBtn');
const leaveRoomBtn = $('#leaveRoomBtn');

sendMessageBtn.click(() => {
    const message = messageInput.val();
    if (message.trim() !== '') {
        socket.emit('sendMessage', message);
        messageInput.val('');
        console.log('Message envoyé: ' + message);
    }
});

leaveRoomBtn.click(() => {
    if (roomName) {
        socket.emit('leaveRoom');
        roomName = null;

        $('#chatContainer').hide();
        $('#searchBtn').show();
    }
});

//event chat
socket.on('messageReceived', (message) => {
    console.log('Message reçu de ' + message.sender + ': ' + message.text);
    const chatMessages = $('#chatMessages');
    chatMessages.append($('<p></p>').text(`${message.sender}: ${message.text}`));
});

$('#chatForm').submit((e) => {
    e.preventDefault();
    const messageInput = $('#messageInput');
    const message = messageInput.val().trim();
    
    if (message !== '') {
        console.log('Message envoyé :', message);
        socket.emit('sendMessage', message);
        messageInput.val('');
    }
});
