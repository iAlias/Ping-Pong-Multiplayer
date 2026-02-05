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
    const orientationBtns = document.querySelectorAll('.orientation-btn');
    const sideGroup = document.getElementById('sideGroup');
    const replayBtn = document.getElementById('replayBtn');
    
    let selectedSide = null;
    let selectedView = 'full';
    let selectedOrientation = 'vertical'; // Default to vertical
    
    // Enable join button based on mode
    function updateJoinButton() {
        if (selectedOrientation === 'vertical') {
            // In vertical mode, only name is required
            joinBtn.disabled = !playerNameInput.value.trim();
        } else {
            // In horizontal mode, name and side are required
            joinBtn.disabled = !playerNameInput.value.trim() || !selectedSide;
        }
    }
    
    // Update side button labels based on orientation
    function updateSideLabels() {
        const label = sideGroup.querySelector('label');
        const leftBtn = document.querySelector('.side-btn[data-side="left"]');
        const rightBtn = document.querySelector('.side-btn[data-side="right"]');
        
        if (selectedOrientation === 'vertical') {
            label.textContent = 'Scegli la tua posizione:';
            leftBtn.textContent = 'Alto';
            rightBtn.textContent = 'Basso';
        } else {
            label.textContent = 'Scegli il tuo lato:';
            leftBtn.textContent = 'Sinistra';
            rightBtn.textContent = 'Destra';
        }
    }
    
    // Show/hide side selection based on orientation
    function updateSideGroupVisibility() {
        if (selectedOrientation === 'vertical') {
            sideGroup.style.display = 'none';
            selectedSide = null; // Clear selection in vertical mode
        } else {
            sideGroup.style.display = 'block';
        }
        updateJoinButton();
    }
    
    // Initialize the UI
    updateSideLabels();
    updateSideGroupVisibility();
    
    playerNameInput.addEventListener('input', updateJoinButton);
    
    // Orientation selection
    orientationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            orientationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedOrientation = btn.dataset.orientation;
            updateSideLabels();
            updateSideGroupVisibility();
        });
    });
    
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
        if (name) {
            // In vertical mode, auto-assign side (server will handle this)
            const side = selectedOrientation === 'vertical' ? 'auto' : selectedSide;
            if (selectedOrientation === 'horizontal' && !side) {
                return; // Don't join if horizontal and no side selected
            }
            joinGame(name, side, selectedView, selectedOrientation);
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
    
    // Don't resize if canvas has no dimensions yet
    if (rect.width === 0 || rect.height === 0) {
        console.warn('Canvas has no dimensions, skipping resize');
        return;
    }
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
}

function setupTouchControls() {
    const touchArea = document.getElementById('touchArea');
    let isDragging = false;
    
    function handleMove(clientX, clientY) {
        if (!gameActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const isVertical = playerData.orientation === 'vertical';
        
        if (isVertical) {
            // In vertical mode, move paddle left-right based on X position
            const relativeX = (clientX - rect.left) / rect.width;
            const clampedX = Math.max(PADDLE_HEIGHT / 2, Math.min(1 - PADDLE_HEIGHT / 2, relativeX));
            
            myPaddle.y = clampedX; // Store as Y but represents X position in vertical mode
            movePaddle(clampedX);
        } else {
            // In horizontal mode, move paddle up-down based on Y position
            const relativeY = (clientY - rect.top) / rect.height;
            const clampedY = Math.max(PADDLE_HEIGHT / 2, Math.min(1 - PADDLE_HEIGHT / 2, relativeY));
            
            myPaddle.y = clampedY;
            movePaddle(clampedY);
        }
    }
    
    // Touch events
    touchArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    });
    
    touchArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDragging) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
    });
    
    touchArea.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDragging = false;
    });
    
    // Mouse events (for desktop testing)
    touchArea.addEventListener('mousedown', (e) => {
        isDragging = true;
        handleMove(e.clientX, e.clientY);
    });
    
    touchArea.addEventListener('mousemove', (e) => {
        if (isDragging) {
            handleMove(e.clientX, e.clientY);
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
    
    // Update orientation from game state
    if (state.orientation) {
        playerData.orientation = state.orientation;
    }
    
    // Update side buttons to disable taken sides (only in lobby)
    if (screens.lobby.classList.contains('active')) {
        const leftBtn = document.querySelector('.side-btn[data-side="left"]');
        const rightBtn = document.querySelector('.side-btn[data-side="right"]');
        
        const isVertical = state.orientation === 'vertical';
        
        if (players.left) {
            leftBtn.disabled = true;
            const sideText = isVertical ? 'Alto' : 'Sinistra';
            // textContent is XSS-safe - it treats all content as plain text
            leftBtn.textContent = `${sideText} (${players.left.name})`;
            leftBtn.classList.add('taken');
        } else {
            leftBtn.disabled = false;
            leftBtn.textContent = isVertical ? 'Alto' : 'Sinistra';
            leftBtn.classList.remove('taken');
        }
        
        if (players.right) {
            rightBtn.disabled = true;
            const sideText = isVertical ? 'Basso' : 'Destra';
            // textContent is XSS-safe - it treats all content as plain text
            rightBtn.textContent = `${sideText} (${players.right.name})`;
            rightBtn.classList.add('taken');
        } else {
            rightBtn.disabled = false;
            rightBtn.textContent = isVertical ? 'Basso' : 'Destra';
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
    // Wait for canvas to have dimensions before starting
    const initCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            resizeCanvas();
            requestAnimationFrame(gameLoop);
        } else {
            // Retry on next animation frame
            requestAnimationFrame(initCanvas);
        }
    };
    requestAnimationFrame(initCanvas);
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
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, width, height);
    
    // Determine what to render based on view mode and orientation
    const isHalfView = playerData.viewMode === 'half';
    const isLeftPlayer = playerData.side === 'left';
    const isVertical = playerData.orientation === 'vertical';
    
    let offsetX = 0;
    let offsetY = 0;
    let scaleX = 1;
    let scaleY = 1;
    
    if (isHalfView && !isVertical) {
        // Show only player's half (horizontal mode)
        scaleX = 2;
        offsetX = isLeftPlayer ? 0 : -width;
    } else if (isHalfView && isVertical) {
        // Show only player's half (vertical mode)
        // In vertical mode, player always sees bottom half (their half)
        scaleY = 2;
        offsetY = -height; // Always show bottom half from player's perspective
    }
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    
    if (isVertical) {
        // VERTICAL MODE - Each player sees their paddle at bottom, opponent at top
        // Draw horizontal center line (dashed)
        ctx.strokeStyle = 'rgba(78, 204, 163, 0.3)';
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw paddles (horizontal in vertical mode)
        const paddleWidth = PADDLE_HEIGHT * width; // Swap dimensions
        const paddleHeight = PADDLE_WIDTH * height * scaleY;
        
        // Get paddle positions from game state
        const myPlayerData = players[playerData.side];
        const opponentSide = playerData.side === 'left' ? 'right' : 'left';
        const opponentPlayerData = players[opponentSide];
        
        // Determine ball position for current player's perspective
        // In vertical mode: ball.x represents vertical movement (0=top, 1=bottom)
        // ball.y represents horizontal position
        let ballVerticalPos = ball.x;
        
        // If player is on "right" side (bottom in server coords), flip the vertical position
        // so they see themselves at bottom of their screen
        if (!isLeftPlayer) {
            ballVerticalPos = 1 - ball.x;
        }
        
        // Opponent paddle (at top of screen) -  pink/purple
        if (opponentPlayerData && opponentPlayerData.paddleY !== undefined) {
            const opponentPaddleX = opponentPlayerData.paddleY * width;
            ctx.fillStyle = '#f093fb';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#f093fb';
            ctx.fillRect(
                opponentPaddleX - paddleWidth / 2,
                10 * scaleY,
                paddleWidth,
                paddleHeight
            );
            ctx.shadowBlur = 0;
        }
        
        // My paddle (at bottom of screen) - green
        if (myPlayerData && myPlayerData.paddleY !== undefined) {
            const myPaddleX = myPlayerData.paddleY * width;
            const myPaddleY = (height - 10) * scaleY - paddleHeight;
            ctx.fillStyle = '#4ecca3';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#4ecca3';
            ctx.fillRect(
                myPaddleX - paddleWidth / 2,
                myPaddleY,
                paddleWidth,
                paddleHeight
            );
            ctx.shadowBlur = 0;
        }
        
        // Draw ball
        const ballX = ball.y * width; // Horizontal position
        const ballY = ballVerticalPos * height * scaleY; // Vertical position (adjusted for player perspective)
        const ballRadius = BALL_SIZE * width;
        
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
    } else {
        // HORIZONTAL MODE - Traditional left-right
        // Draw center line (dashed)
        ctx.strokeStyle = 'rgba(78, 204, 163, 0.3)';
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
        
        // Left paddle - always show
        const leftPaddleY = (isLeftPlayer ? myPaddle.y : opponentPaddle.y) * height;
        ctx.fillStyle = isLeftPlayer ? '#4ecca3' : '#f093fb';
        ctx.shadowBlur = 15;
        ctx.shadowColor = isLeftPlayer ? '#4ecca3' : '#f093fb';
        ctx.fillRect(
            10 * scaleX,
            leftPaddleY - paddleHeight / 2,
            paddleWidth,
            paddleHeight
        );
        ctx.shadowBlur = 0;
        
        // Right paddle - always show
        const rightPaddleY = (isLeftPlayer ? opponentPaddle.y : myPaddle.y) * height;
        ctx.fillStyle = isLeftPlayer ? '#f093fb' : '#4ecca3';
        ctx.shadowBlur = 15;
        ctx.shadowColor = isLeftPlayer ? '#f093fb' : '#4ecca3';
        ctx.fillRect(
            (width - 10) * scaleX - paddleWidth,
            rightPaddleY - paddleHeight / 2,
            paddleWidth,
            paddleHeight
        );
        ctx.shadowBlur = 0;
        
        // Draw ball
        const ballX = ball.x * width * scaleX;
        const ballY = ball.y * height;
        const ballRadius = BALL_SIZE * width * scaleX;
        
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
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
