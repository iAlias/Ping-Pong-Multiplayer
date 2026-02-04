# 🏓 Ping Pong Multiplayer

A real-time multiplayer Ping Pong game for mobile browsers. Two players, two phones, one game!

## Features

- 🎮 Real-time multiplayer gameplay
- 📱 Mobile-first design with touch controls
- 🎯 Two view modes: full field or your half only
- 🏆 Score tracking and win conditions (first to 10)
- 🌐 Web-based - no app installation needed
- ⚡ Low-latency WebSocket communication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/iAlias/Ping-Pong-Multiplayer.git
cd Ping-Pong-Multiplayer
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## How to Play

1. **Both players** open the same URL on their mobile devices
2. Enter your name
3. Choose your side (Left or Right)
4. Select view mode (Full field or Half field)
5. Tap "Entra in partita" (Join Game)
6. Wait for the other player to join
7. Game starts automatically when both players are ready!
8. Move your paddle up and down by touching and dragging
9. First player to reach 10 points wins!

## Deployment

### Deploy to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

### Deploy to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy!

### Deploy to Heroku

1. Install Heroku CLI
2. Login and create app:
```bash
heroku login
heroku create your-app-name
git push heroku main
```

## Technology Stack

- **Frontend**: HTML5 Canvas, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.IO (WebSockets)

## Project Structure

```
/Ping-Pong-Multiplayer
  /server
    server.js          # Backend server with game logic
  /public
    index.html         # Main HTML structure
    style.css          # Mobile-first styling
    game.js            # Game rendering and logic
    socket.js          # WebSocket client connection
  package.json         # Dependencies and scripts
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.