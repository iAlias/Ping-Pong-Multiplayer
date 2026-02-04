// Socket.IO client connection and event handlers

let socket;
let playerData = {
    name: '',
    side: null,
    viewMode: 'full', // 'full' or 'half'
    orientation: 'horizontal' // 'horizontal' or 'vertical'
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

    socket.on('sideAssigned', (data) => {
        console.log('Side assigned:', data.side);
        // Update playerData with the assigned side
        if (playerData.side === 'auto') {
            playerData.side = data.side;
            
            // Update the waiting screen text
            const isVertical = playerData.orientation === 'vertical';
            const sideText = isVertical 
                ? (data.side === 'left' ? 'Alto' : 'Basso')
                : (data.side === 'left' ? 'Sinistra' : 'Destra');
            
            const yourSideElement = document.getElementById('yourSide');
            if (yourSideElement) {
                yourSideElement.textContent = sideText;
            }
        }
    });
}

function joinGame(name, side, viewMode, orientation) {
    playerData.name = name;
    playerData.side = side; // May be 'auto' initially
    playerData.viewMode = viewMode;
    playerData.orientation = orientation;
    
    socket.emit('joinGame', { name, side, orientation });
    
    showScreen('waiting');
    document.getElementById('yourName').textContent = name;
    
    // If side is auto, we'll update the text when we receive gameState
    if (side === 'auto') {
        document.getElementById('yourSide').textContent = 'Assegnazione automatica...';
    } else {
        const sideText = orientation === 'vertical' 
            ? (side === 'left' ? 'Alto' : 'Basso')
            : (side === 'left' ? 'Sinistra' : 'Destra');
        document.getElementById('yourSide').textContent = sideText;
    }
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
