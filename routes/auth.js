const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, password, firstName, lastName]
 *             properties:
 *               login:
 *                 type: string
 *                 example: student123
 *               password:
 *                 type: string
 *                 example: secret123
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       200:
 *         description: Registration result
 */
router.post('/register', (req, res) => {
  res.status(200).json({ message: 'Handled by server.js' });
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login, password]
 *             properties:
 *               login:
 *                 type: string
 *                 example: student123
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login result
 */
router.post('/login', (req, res) => {
  res.status(200).json({ message: 'Handled by server.js' });
});

module.exports = router;
