const express = require('express');
const router = express.Router();
const ctl = require('../controllers/authController');

router.post('/register', ctl.register);
router.post('/login', ctl.login);
router.post('/refresh', ctl.refresh);
router.post('/logout', ctl.logout);

module.exports = router;
