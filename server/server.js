const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// CORS configuration for Socket.IO
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : "*";
if (!process.env.ALLOWED_ORIGINS) {
  console.warn('WARNING: CORS is set to allow all origins (*). For production, set ALLOWED_ORIGINS environment variable.');
}

const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Game constants
const BALL_INITIAL_SPEED = 0.01;
const BALL_SPEED_INCREASE_FACTOR = 1.05;
const BALL_SPIN_FACTOR = 0.005;
const PADDLE_WIDTH = 0.02;
const PADDLE_HEIGHT = 0.15;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Game state
let gameState = {
  players: {},
  ball: {
    x: 0.5,
    y: 0.5,
    vx: 0.01,
    vy: 0.01,
    speed: 1
  },
  score: {
    left: 0,
    right: 0
  },
  gameStarted: false,
  gameEnded: false,
  winner: null,
  orientation: 'horizontal' // 'horizontal' or 'vertical'
};

let playerCount = 0;

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send current game state to new player
  socket.emit('gameState', gameState);

  // Handle player join
  socket.on('joinGame', (data) => {
    const { name, side, orientation } = data;

    // Check if side is already taken
    if (gameState.players[side]) {
      socket.emit('error', { message: 'Side already taken' });
      return;
    }

    gameState.players[side] = {
      id: socket.id,
      name: name,
      side: side,
      paddleY: 0.5
    };

    // Set orientation from first player
    if (playerCount === 0 && orientation) {
      gameState.orientation = orientation;
    }

    playerCount++;
    console.log(`Player ${name} joined as ${side}. Total players: ${playerCount}`);

    // Broadcast updated game state
    io.emit('gameState', gameState);

    // Start game if both players are ready
    if (playerCount === 2 && !gameState.gameStarted) {
      gameState.gameStarted = true;
      gameState.ball = {
        x: 0.5,
        y: 0.5,
        vx: BALL_INITIAL_SPEED,
        vy: BALL_INITIAL_SPEED,
        speed: 1
      };
      io.emit('gameStarted');
      console.log('Game started!');
    }
  });

  // Handle paddle movement
  socket.on('movePaddle', (data) => {
    const { side, paddleY } = data;
    
    if (gameState.players[side] && gameState.players[side].id === socket.id) {
      gameState.players[side].paddleY = paddleY;
      // Broadcast paddle position to other player
      socket.broadcast.emit('paddleUpdate', { side, paddleY });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and remove the player
    for (let side in gameState.players) {
      if (gameState.players[side].id === socket.id) {
        delete gameState.players[side];
        playerCount--;
        console.log(`Player ${side} left. Total players: ${playerCount}`);
        break;
      }
    }

    // Reset game if a player leaves
    if (gameState.gameStarted) {
      gameState.gameStarted = false;
      gameState.gameEnded = true;
      gameState.ball = { x: 0.5, y: 0.5, vx: BALL_INITIAL_SPEED, vy: BALL_INITIAL_SPEED, speed: 1 };
      gameState.orientation = 'horizontal'; // Reset orientation
      io.emit('playerLeft');
    }

    io.emit('gameState', gameState);
  });

  // Handle game restart
  socket.on('restartGame', () => {
    if (playerCount === 2) {
      gameState.score = { left: 0, right: 0 };
      gameState.ball = {
        x: 0.5,
        y: 0.5,
        vx: BALL_INITIAL_SPEED,
        vy: BALL_INITIAL_SPEED,
        speed: 1
      };
      gameState.gameStarted = true;
      gameState.gameEnded = false;
      gameState.winner = null;
      io.emit('gameRestarted');
      console.log('Game restarted!');
    }
  });
});

// Game loop - update ball position on server
setInterval(() => {
  if (gameState.gameStarted && !gameState.gameEnded) {
    updateBall();
    io.emit('ballUpdate', gameState.ball);
  }
}, 1000 / 60); // 60 FPS

function updateBall() {
  const ball = gameState.ball;
  
  // Update position
  ball.x += ball.vx * ball.speed;
  ball.y += ball.vy * ball.speed;

  // Bounce off top and bottom
  if (ball.y <= 0 || ball.y >= 1) {
    ball.vy *= -1;
    ball.y = Math.max(0, Math.min(1, ball.y));
  }

  // Check paddle collision
  const paddleWidth = PADDLE_WIDTH;
  const paddleHeight = PADDLE_HEIGHT;

  // Left paddle
  if (gameState.players.left && ball.x <= paddleWidth && ball.vx < 0) {
    const paddle = gameState.players.left;
    if (ball.y >= paddle.paddleY - paddleHeight / 2 && 
        ball.y <= paddle.paddleY + paddleHeight / 2) {
      ball.vx *= -1;
      ball.x = paddleWidth;
      // Add spin based on where ball hits paddle
      const hitPos = (ball.y - paddle.paddleY) / (paddleHeight / 2);
      ball.vy += hitPos * BALL_SPIN_FACTOR;
    }
  }

  // Right paddle
  if (gameState.players.right && ball.x >= 1 - paddleWidth && ball.vx > 0) {
    const paddle = gameState.players.right;
    if (ball.y >= paddle.paddleY - paddleHeight / 2 && 
        ball.y <= paddle.paddleY + paddleHeight / 2) {
      ball.vx *= -1;
      ball.x = 1 - paddleWidth;
      // Add spin based on where ball hits paddle
      const hitPos = (ball.y - paddle.paddleY) / (paddleHeight / 2);
      ball.vy += hitPos * BALL_SPIN_FACTOR;
    }
  }

  // Score points
  if (ball.x < 0) {
    // Right player scores
    gameState.score.right++;
    io.emit('scoreUpdate', gameState.score);
    checkWinner();
    resetBall();
  } else if (ball.x > 1) {
    // Left player scores
    gameState.score.left++;
    io.emit('scoreUpdate', gameState.score);
    checkWinner();
    resetBall();
  }
}

function resetBall() {
  gameState.ball = {
    x: 0.5,
    y: 0.5,
    vx: (Math.random() > 0.5 ? BALL_INITIAL_SPEED : -BALL_INITIAL_SPEED),
    vy: (Math.random() - 0.5) * BALL_INITIAL_SPEED,
    speed: 1 // Keep speed constant
  };
}

function checkWinner() {
  if (gameState.score.left >= 10) {
    gameState.gameEnded = true;
    gameState.winner = 'left';
    io.emit('gameEnded', { winner: gameState.players.left });
  } else if (gameState.score.right >= 10) {
    gameState.gameEnded = true;
    gameState.winner = 'right';
    io.emit('gameEnded', { winner: gameState.players.right });
  }
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
