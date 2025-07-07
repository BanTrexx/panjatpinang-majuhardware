function startGameTimer(io) {
  const waitingTime = 10; // detik sebelum game mulai
  const gameTime = 15; // durasi game dalam detik

  let countdown = waitingTime;

  console.log(`Countdown starting for ${waitingTime} seconds...`);
  const countdownInterval = setInterval(() => {
    console.log(`Countdown: ${countdown}s`);
    io.emit('countdown', countdown);
    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);
      console.log('Game started!');
      io.emit('gameStart');

      let gameDuration = gameTime;
      const gameInterval = setInterval(() => {
        console.log(`Game time left: ${gameDuration}s`);
        io.emit('gameTime', gameDuration);
        gameDuration--;

        if (gameDuration < 0) {
          clearInterval(gameInterval);
          console.log('Game ended.');
          io.emit('gameEnd');
          
          // Restart otomatis
          setTimeout(() => startGameTimer(io), 5000);
        }
      }, 1000);
    }
  }, 1000);
}

module.exports = { startGameTimer };
