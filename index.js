// Importez les modules nécessaires
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Créez une instance d'Express et du serveur HTTP
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Ajoutez cette route pour servir la page de chat
app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/public/chat.html');
});

// Servez les fichiers statiques (HTML, CSS, etc.)
app.use(express.static(__dirname + '/public'));

// Définissez une route pour la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Stockez les utilisateurs en attente de matchmaking
const waitingUsers = [];
let roomCounter = 1; // Un compteur pour générer des noms de salle uniques

// Gérez les connexions Socket.IO
io.on('connection', (socket) => {
    console.log(`Nouvelle connexion: ${socket.id}`);
    let roomName = null;

    // Lorsqu'un utilisateur recherche un partenaire
    socket.on('searchPartner', (username) => {
        if (!socket.isSearching) { // Vérifiez si l'utilisateur n'est pas déjà en recherche
            socket.isSearching = true; // Marquez l'utilisateur comme étant en recherche
            socket.username = username; // Stockez le pseudo de l'utilisateur

            waitingUsers.push(socket);

            // Vérifiez s'il y a au moins deux utilisateurs en attente
            if (waitingUsers.length >= 2) {
                // Prenez les deux premiers utilisateurs en attente
                const user1 = waitingUsers.shift();
                const user2 = waitingUsers.shift();

                // Créez une salle privée pour les deux utilisateurs avec un nom unique
                roomName = `room-${roomCounter}`;
                roomCounter++; 
                user1.join(roomName);
                user2.join(roomName);

                // Réinitialisez l'état de recherche pour les deux utilisateurs
                user1.isSearching = false;
                user2.isSearching = false;

                // Stockez la salle associée à chaque utilisateur
                user1.roomName = roomName;
                user2.roomName = roomName;

                // Informez les utilisateurs qu'ils ont trouvé un partenaire et qu'ils peuvent passer au chat privé
                user1.emit('partnerFound', roomName);
                user2.emit('partnerFound', roomName);

                console.log(`Match trouvé: ${user1.id} et ${user2.id} dans la salle ${roomName}`);
            } else {
                // Informez l'utilisateur qu'il est en attente
                socket.emit('waiting');
            }
        } else {
            // L'utilisateur est déjà en recherche, ignorez la demande
            socket.emit('alreadySearching');
        }
    });

    // Dans la gestion de l'événement "sendMessage"
    socket.on('sendMessage', (message) => {
        if (socket.roomName) {
            console.log(`Message reçu de ${socket.username}: ${message}`); // Utilisez socket.username
            const messageObject = {
                sender: socket.username, // Utilisez socket.username pour le pseudo
                text: message
            };
            io.to(socket.roomName).emit('messageReceived', messageObject); // Envoyez l'objet du message
            console.log(`Message envoyé à la salle ${socket.roomName}: ${message}`);
        } else {
            console.log(`Erreur : utilisateur ${socket.id} n'est pas dans une salle.`);
        }
    });


    // Lorsque l'utilisateur quitte la salle
    socket.on('leaveRoom', () => {
        if (socket.roomName) {
            socket.leave(socket.roomName);
            console.log(`${socket.id} a quitté la salle ${socket.roomName}`);
            socket.roomName = null;
        }
    });

    // Gérez la déconnexion de l'utilisateur
    socket.on('disconnect', () => {
        const index = waitingUsers.indexOf(socket);
        if (index !== -1) {
            waitingUsers.splice(index, 1);
        }

        // Si l'utilisateur est dans une salle, quittez la salle et informez les autres utilisateurs
        if (socket.roomName) {
            socket.leave(socket.roomName);
            io.to(socket.roomName).emit('userDisconnected', socket.id);
            socket.roomName = null;
        }

        console.log(`Déconnexion: ${socket.id}`);
    });
});

// Démarrez le serveur sur le port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
