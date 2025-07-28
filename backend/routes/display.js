const express = require('express');
const router = express.Router();

router.get('/display', (req, res) => {
    res.render("display/led", { title: "led" })
})

module.exports = router;