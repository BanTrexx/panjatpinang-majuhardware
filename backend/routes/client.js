const express = require('express');
const router = express.Router();
const { playerID, home, tutor, index, games } = require('../controllers/clientController')

router.get('/', index)
router.get('/form', home)
router.get('/tutor', tutor)
router.get('/game', games)
router.post('/tutor', tutor);
router.post('/game', playerID)

module.exports = router;