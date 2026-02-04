// Socket.IO client connection and event handlers

let socket;
let playerData = {
    name: '',
    side: null,
    viewMode: 'full' // 'full' or 'half'
};

function initSocket() {
    socket = io();

    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    // Game state updates
    socket.on('gameState', (state) => {
        console.log('Game state received:', state);
        updateGameState(state);
    });

    socket.on('gameStarted', () => {
        console.log('Game started!');
        showScreen('game');
        startGame();
    });

    socket.on('paddleUpdate', (data) => {
        updateOpponentPaddle(data);
    });

    socket.on('ballUpdate', (ball) => {
        updateBall(ball);
    });

    socket.on('scoreUpdate', (score) => {
        updateScore(score);
    });

    socket.on('gameEnded', (data) => {
        console.log('Game ended:', data);
        endGame(data);
    });

    socket.on('gameRestarted', () => {
        console.log('Game restarted');
        showScreen('game');
        startGame();
    });

    socket.on('playerLeft', () => {
        alert('L\'altro giocatore ha abbandonato la partita');
        location.reload();
    });

    socket.on('error', (error) => {
        showError(error.message);
    });
}

function joinGame(name, side, viewMode) {
    playerData.name = name;
    playerData.side = side;
    playerData.viewMode = viewMode;
    
    socket.emit('joinGame', { name, side });
    
    showScreen('waiting');
    document.getElementById('yourName').textContent = name;
    document.getElementById('yourSide').textContent = side === 'left' ? 'Sinistra' : 'Destra';
}

function movePaddle(paddleY) {
    if (playerData.side && socket) {
        socket.emit('movePaddle', {
            side: playerData.side,
            paddleY: paddleY
        });
    }
}

function restartGame() {
    socket.emit('restartGame');
}

// Initialize socket connection when page loads
window.addEventListener('DOMContentLoaded', () => {
    initSocket();
});
