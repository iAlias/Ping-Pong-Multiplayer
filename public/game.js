// Game logic and rendering

let canvas, ctx;
let gameActive = false;
let myPaddle = { y: 0.5 };
let opponentPaddle = { y: 0.5 };
let ball = { x: 0.5, y: 0.5 };
let score = { left: 0, right: 0 };
let players = { left: null, right: null };

// Game dimension constants (normalized 0-1 range, not pixels)
// These represent proportions of the canvas dimensions
const PADDLE_WIDTH = 0.02;   // 2% of canvas width
const PADDLE_HEIGHT = 0.15;  // 15% of canvas height
const BALL_SIZE = 0.015;     // 1.5% of canvas width

// UI Elements
const screens = {
    lobby: document.getElementById('lobby'),
    waiting: document.getElementById('waiting'),
    game: document.getElementById('game'),
    gameOver: document.getElementById('gameOver')
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initLobby();
    initCanvas();
    setupTouchControls();
});

function initLobby() {
    const playerNameInput = document.getElementById('playerName');
    const joinBtn = document.getElementById('joinBtn');
    const sideBtns = document.querySelectorAll('.side-btn');
    const viewBtns = document.querySelectorAll('.view-btn');
    const replayBtn = document.getElementById('replayBtn');
    
    let selectedSide = null;
    let selectedView = 'full';
    
    // Enable join button when name and side are selected
    function updateJoinButton() {
        joinBtn.disabled = !playerNameInput.value.trim() || !selectedSide;
    }
    
    playerNameInput.addEventListener('input', updateJoinButton);
    
    // Side selection
    sideBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sideBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedSide = btn.dataset.side;
            updateJoinButton();
        });
    });
    
    // View mode selection
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedView = btn.dataset.view;
        });
    });
    
    // Join game
    joinBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        if (name && selectedSide) {
            joinGame(name, selectedSide, selectedView);
        }
    });
    
    // Replay button
    replayBtn.addEventListener('click', () => {
        restartGame();
    });
}

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
}

function setupTouchControls() {
    const touchArea = document.getElementById('touchArea');
    let isDragging = false;
    
    function handleMove(clientY) {
        if (!gameActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const relativeY = (clientY - rect.top) / rect.height;
        const clampedY = Math.max(PADDLE_HEIGHT / 2, Math.min(1 - PADDLE_HEIGHT / 2, relativeY));
        
        myPaddle.y = clampedY;
        movePaddle(clampedY);
    }
    
    // Touch events
    touchArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        handleMove(e.touches[0].clientY);
    });
    
    touchArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDragging) {
            handleMove(e.touches[0].clientY);
        }
    });
    
    touchArea.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDragging = false;
    });
    
    // Mouse events (for desktop testing)
    touchArea.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleMove(e.clientY);
    });
    
    touchArea.addEventListener('mousemove', (e) => {
        if (isDragging) {
            handleMove(e.clientY);
        }
    });
    
    touchArea.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    touchArea.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    setTimeout(() => {
        errorDiv.textContent = '';
    }, 3000);
}

function updateGameState(state) {
    players = state.players;
    score = state.score;
    
    // Update side buttons to disable taken sides (only in lobby)
    if (screens.lobby.classList.contains('active')) {
        const leftBtn = document.querySelector('.side-btn[data-side="left"]');
        const rightBtn = document.querySelector('.side-btn[data-side="right"]');
        
        if (players.left) {
            leftBtn.disabled = true;
            // textContent is XSS-safe - it treats all content as plain text
            leftBtn.textContent = `Sinistra (${players.left.name})`;
            leftBtn.classList.add('taken');
        } else {
            leftBtn.disabled = false;
            leftBtn.textContent = 'Sinistra';
            leftBtn.classList.remove('taken');
        }
        
        if (players.right) {
            rightBtn.disabled = true;
            // textContent is XSS-safe - it treats all content as plain text
            rightBtn.textContent = `Destra (${players.right.name})`;
            rightBtn.classList.add('taken');
        } else {
            rightBtn.disabled = false;
            rightBtn.textContent = 'Destra';
            rightBtn.classList.remove('taken');
        }
    }
    
    // Update scoreboard with player names
    if (players.left) {
        document.getElementById('leftPlayer').textContent = players.left.name;
        if (playerData.side !== 'left') {
            opponentPaddle.y = players.left.paddleY;
        }
    }
    if (players.right) {
        document.getElementById('rightPlayer').textContent = players.right.name;
        if (playerData.side !== 'right') {
            opponentPaddle.y = players.right.paddleY;
        }
    }
    
    updateScore(state.score);
}

function updateOpponentPaddle(data) {
    if (data.side !== playerData.side) {
        opponentPaddle.y = data.paddleY;
    }
}

function updateBall(ballData) {
    ball = ballData;
}

function updateScore(scoreData) {
    score = scoreData;
    document.getElementById('score').textContent = `${score.left} - ${score.right}`;
}

function startGame() {
    gameActive = true;
    resizeCanvas(); // Resize canvas now that it's visible
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (!gameActive) return;
    
    render();
    requestAnimationFrame(gameLoop);
}

function render() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, width, height);
    
    // Determine what to render based on view mode
    const isHalfView = playerData.viewMode === 'half';
    const isLeftPlayer = playerData.side === 'left';
    
    let offsetX = 0;
    let scaleX = 1;
    
    if (isHalfView) {
        // Show only player's half
        scaleX = 2;
        offsetX = isLeftPlayer ? 0 : -width;
    }
    
    ctx.save();
    ctx.translate(offsetX, 0);
    
    // Draw center line (dashed)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    const paddleWidth = PADDLE_WIDTH * width * scaleX;
    const paddleHeight = PADDLE_HEIGHT * height;
    
    // Left paddle
    if (!isHalfView || isLeftPlayer) {
        const leftPaddleY = (isLeftPlayer ? myPaddle.y : opponentPaddle.y) * height;
        ctx.fillStyle = '#4ecca3';
        ctx.fillRect(
            10 * scaleX,
            leftPaddleY - paddleHeight / 2,
            paddleWidth,
            paddleHeight
        );
    }
    
    // Right paddle
    if (!isHalfView || !isLeftPlayer) {
        const rightPaddleY = (isLeftPlayer ? opponentPaddle.y : myPaddle.y) * height;
        ctx.fillStyle = '#f093fb';
        ctx.fillRect(
            (width - 10) * scaleX - paddleWidth,
            rightPaddleY - paddleHeight / 2,
            paddleWidth,
            paddleHeight
        );
    }
    
    // Draw ball
    const ballX = ball.x * width * scaleX;
    const ballY = ball.y * height;
    const ballRadius = BALL_SIZE * width * scaleX;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow effect to ball
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.restore();
}

function endGame(data) {
    gameActive = false;
    showScreen('gameOver');
    
    const winner = data.winner;
    const isWinner = winner.side === playerData.side;
    
    document.getElementById('winnerText').textContent = 
        isWinner ? '🎉 Hai vinto!' : `${winner.name} ha vinto!`;
    document.getElementById('finalScore').textContent = 
        `${score.left} - ${score.right}`;
}
