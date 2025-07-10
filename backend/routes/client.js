const express = require('express');
const router = express.Router();
const { playerID, home, games } = require('../controllers/clientController')

router.get('/', home)
router.get('/game', games)
router.post('/game', playerID)

module.exports = router;