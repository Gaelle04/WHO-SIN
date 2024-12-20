const mysql = require('mysql2');


const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'G02262004!', // Replace with your MySQL password
  database: 'WhosIN' // Replace with your database name
  
});


pool.query("select * from users ",(err,results)=>{
  if(err) {
    return console.log('Error executing query:', err);
    
  }
  return console.log('Query successfully executed:',results);
});

module.exports = pool;

