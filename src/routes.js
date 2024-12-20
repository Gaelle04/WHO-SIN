const express = require('express');
const db = require('./db'); // Import database connection
const bcrypt = require('bcrypt'); // For hashing passwords
const router = express.Router();
console.log(__dirname); // Outputs the current directory


// Route: Create a new user
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;


  if (!name || !email || !password) {
    return res.status(400).send('All fields are required.');
  }

  try{
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  const values = [username, email, hashedPassword];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error registering user');
    }
    res.status(201).send('User registered successfully!');
  
});
  } catch (err){
    console.error('Error:', err.message);
    res.status(500).send('Server error.');
  }

});

module.exports = router;
