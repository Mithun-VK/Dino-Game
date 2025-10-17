import React, { useEffect, useRef, useState, useCallback , useMemo} from "react";
import "./DinoGame.css";

function DinoGame() {
  // Refs
  const dinoRef = useRef();
  const gameRef = useRef();
  const canvasRef = useRef();
  
  // State management
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem("dinoHighScore")) || 0
  );
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(6);
  const [isDayMode, setIsDayMode] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  
  // REMOVED: const gameLoopRef = useRef(); // This was unused
  const scoreIntervalRef = useRef();
  const obstaclesRef = useRef([]);
  const cloudsRef = useRef([]);
  const frameCountRef = useRef(0);

  // Obstacle types
  const obstacleTypes = useMemo(() => [
    { type: 'cactus-small', width: 17, height: 35, canDuck: false },
    { type: 'cactus-large', width: 25, height: 50, canDuck: false },
    { type: 'cactus-double', width: 35, height: 50, canDuck: false },
    { type: 'pterodactyl-high', width: 46, height: 40, canDuck: false, flying: true, y: 50 },
    { type: 'pterodactyl-low', width: 46, height: 40, canDuck: true, flying: true, y: 20 }
  ], []);

  // Play sound effect
  const playSound = useCallback((type) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'jump') {
        oscillator.frequency.value = 500;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } else if (type === 'score') {
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      } else if (type === 'gameOver') {
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }
    } catch (error) {
      // Silently handle audio context errors
      console.log('Audio not supported');
    }
  }, []);

  // Generate obstacle - MOVED outside useEffect
  const generateObstacle = useCallback(() => {
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    const minGap = 200 + gameSpeed * 10;
    
    if (!lastObstacle || lastObstacle.x < 600 - minGap) {
      const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      obstaclesRef.current.push({
        ...obstacleType,
        x: 600,
        id: Date.now()
      });
    }
  }, [gameSpeed, obstacleTypes]);

  // Initialize clouds
  const initializeClouds = useCallback(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * 600,
      y: 20 + Math.random() * 40,
      speed: 0.5 + Math.random() * 0.5
    }));
  }, []);

  // Start game - MOVED before useEffect
  const startGame = useCallback(() => {
    setGameOver(false);
    setIsPlaying(true);
    setScore(0);
    setGameSpeed(6);
    setIsRunning(true);
    obstaclesRef.current = [];
    cloudsRef.current = initializeClouds();
    frameCountRef.current = 0;
  }, [initializeClouds]);

  // Jump function
  const jump = useCallback(() => {
    if (
      !gameOver &&
      isPlaying &&
      dinoRef.current &&
      !dinoRef.current.classList.contains("jump") &&
      !dinoRef.current.classList.contains("duck")
    ) {
      dinoRef.current.classList.add("jump");
      playSound('jump');
      setTimeout(() => {
        if (dinoRef.current) {
          dinoRef.current.classList.remove("jump");
        }
      }, 500);
    }
  }, [gameOver, isPlaying, playSound]);

  // Duck function
  const duck = useCallback(() => {
    if (
      !gameOver &&
      isPlaying &&
      dinoRef.current &&
      !dinoRef.current.classList.contains("jump")
    ) {
      dinoRef.current.classList.add("duck");
      setIsRunning(false);
    }
  }, [gameOver, isPlaying]);

  const stopDuck = useCallback(() => {
    if (dinoRef.current) {
      dinoRef.current.classList.remove("duck");
      if (isPlaying) {
        setIsRunning(true);
      }
    }
  }, [isPlaying]);

  // Reset game
  const resetGame = useCallback(() => {
    setGameOver(false);
    setIsPlaying(false);
    setScore(0);
    setGameSpeed(6);
    setIsRunning(false);
    obstaclesRef.current = [];
    frameCountRef.current = 0;
  }, []);

  // Main game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCountRef.current++;

      if (frameCountRef.current % 90 === 0) {
        generateObstacle();
      }

      cloudsRef.current.forEach((cloud) => {
        cloud.x -= cloud.speed;
        if (cloud.x < -60) cloud.x = 600;
        
        ctx.fillStyle = isDayMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 20, 0, Math.PI * 2);
        ctx.arc(cloud.x + 15, cloud.y - 5, 15, 0, Math.PI * 2);
        ctx.arc(cloud.x + 30, cloud.y, 20, 0, Math.PI * 2);
        ctx.fill();
      });

      const dinoRect = dinoRef.current?.getBoundingClientRect();
      const gameRect = gameRef.current?.getBoundingClientRect();

      obstaclesRef.current = obstaclesRef.current.filter((obstacle) => {
        obstacle.x -= gameSpeed;
        if (obstacle.x < -50) return false;

        if (obstacle.flying) {
          ctx.fillStyle = isDayMode ? '#535353' : '#d0d0d0';
          const flap = Math.floor(frameCountRef.current / 10) % 2;
          ctx.save();
          ctx.translate(obstacle.x, 200 - obstacle.height - obstacle.y);
          ctx.fillRect(10, 15, 30, 10);
          ctx.fillRect(35, 10, 15, 15);
          if (flap === 0) {
            ctx.fillRect(0, 10, 15, 5);
            ctx.fillRect(0, 0, 20, 5);
          } else {
            ctx.fillRect(5, 15, 15, 5);
            ctx.fillRect(5, 20, 20, 5);
          }
          ctx.restore();
        } else {
          ctx.fillStyle = isDayMode ? '#1b5e20' : '#2e7d32';
          ctx.fillRect(obstacle.x, 200 - obstacle.height, obstacle.width, obstacle.height);
          
          if (obstacle.type === 'cactus-large' || obstacle.type === 'cactus-double') {
            ctx.fillRect(obstacle.x - 5, 200 - obstacle.height + 10, 8, 15);
            ctx.fillRect(obstacle.x + obstacle.width - 3, 200 - obstacle.height + 15, 8, 15);
          }
        }

        if (dinoRect && gameRect) {
          const dinoX = dinoRect.left - gameRect.left;
          const dinoY = dinoRect.top - gameRect.top;
          const dinoWidth = dinoRect.width;
          const dinoHeight = dinoRect.height;

          const obstacleY = obstacle.flying ? 
            (200 - obstacle.height - obstacle.y) : 
            (200 - obstacle.height);

          const collision =
            dinoX + 10 < obstacle.x + obstacle.width - 10 &&
            dinoX + dinoWidth - 10 > obstacle.x + 10 &&
            dinoY + 10 < obstacleY + obstacle.height - 5 &&
            dinoY + dinoHeight - 10 > obstacleY + 5;

          if (collision) {
            setGameOver(true);
            setIsPlaying(false);
            setIsRunning(false);
            playSound('gameOver');
            
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem("dinoHighScore", score.toString());
            }
          }
        }

        return true;
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, gameOver, gameSpeed, score, highScore, isDayMode, generateObstacle, playSound]); // FIXED: Added generateObstacle

  // Score increment
  useEffect(() => {
    if (!isPlaying || gameOver) {
      if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
      return;
    }

    scoreIntervalRef.current = setInterval(() => {
      setScore((prev) => {
        const newScore = prev + 1;
        if (newScore % 100 === 0) {
          playSound('score');
        }
        return newScore;
      });
    }, 100);

    return () => {
      if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
    };
  }, [isPlaying, gameOver, playSound]);

  // Progressive difficulty
  useEffect(() => {
    if (score > 0 && score % 100 === 0) {
      setGameSpeed((prev) => Math.min(prev + 0.5, 13));
    }
  }, [score]);

  // Day/Night cycle
  useEffect(() => {
    if (score > 0 && score % 700 === 0) {
      setIsDayMode((prev) => !prev);
    }
  }, [score]);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!isPlaying && !gameOver) {
          startGame();
        } else {
          jump();
        }
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        if (!isPlaying && gameOver) {
          resetGame();
        } else {
          duck();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "ArrowDown") {
        e.preventDefault();
        stopDuck();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [jump, duck, stopDuck, isPlaying, gameOver, startGame, resetGame]); // FIXED: Added startGame

  // Initialize clouds
  useEffect(() => {
    cloudsRef.current = initializeClouds();
  }, [initializeClouds]);

  return (
    <div className={`game-container ${isDayMode ? 'day' : 'night'}`}>
      <h1>🦖 Chrome Dino Game</h1>
      
      <div className="score-container">
        <div className="score">Score: {score.toString().padStart(5, "0")}</div>
        <div className="high-score">
          HI: {highScore.toString().padStart(5, "0")}
        </div>
        <div className="mode-indicator">{isDayMode ? '☀️ Day' : '🌙 Night'}</div>
      </div>

      <div className={`game ${isDayMode ? 'day-mode' : 'night-mode'}`} ref={gameRef}>
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={200}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
        
        <div 
          id="dino" 
          ref={dinoRef}
          className={isRunning ? 'running' : ''}
        >
          <div className="dino-eye"></div>
          <div className="dino-leg dino-leg-left"></div>
          <div className="dino-leg dino-leg-right"></div>
        </div>
        
        <div className="ground"></div>
      </div>

      {!isPlaying && !gameOver && (
        <div className="start-screen">
          <p className="instructions">Press SPACE or ↑ to start</p>
          <p className="instructions-secondary">↓ to duck | Avoid cacti and pterodactyls!</p>
        </div>
      )}

      {gameOver && (
        <div className="game-over-screen">
          <h2>GAME OVER!</h2>
          <p className="final-score">Final Score: {score}</p>
          {score === highScore && score > 0 && (
            <p className="new-record">🎉 NEW HIGH SCORE! 🎉</p>
          )}
          <button className="restart-button" onClick={resetGame}>
            Restart Game
          </button>
          <p className="instructions-small">or press SPACE</p>
        </div>
      )}

      <div className="controls-info">
        <span>🎮 SPACE/↑ = Jump | ↓ = Duck | Speed: {gameSpeed.toFixed(1)}x</span>
      </div>

      <div className="features-list">
        <span>✨ Features: Multiple Obstacles | Flying Pterodactyls | Day/Night Cycle | Sound Effects</span>
      </div>
    </div>
  );
}

export default DinoGame;
