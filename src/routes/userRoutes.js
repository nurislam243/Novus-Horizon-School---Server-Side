const express = require('express');
const router = express.Router();
const { getUserRole } = require('../controllers/userController');


// Get User Role
router.get('/:email/role', getUserRole);

module.exports = router;