const express = require('express');
const router = express.Router();

router.get('/display', (req, res) => {
    res.render("display/display", {title: "display"})
})

module.exports = router;