const express = require('express');
const db = require('./db');
const session = require('express-session');
const collection = require("./routes");
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Import UUID library


const app = express();
const userRoutes = require('./routes');

app.use(
    session({
        secret: 'your_secret_key', // Replace with a secure random string
        resave: false,            // Prevents resaving unchanged sessions
        saveUninitialized: false, // Prevents saving uninitialized sessions
        cookie: { secure: false }, // Use `true` only if running on HTTPS
    })
);

app.get('/test-session', (req, res) => {
    if (!req.session.views) {
        req.session.views = 1;
    } else {
        req.session.views++;
    }
    res.send(`You have visited this page ${req.session.views} times`);
});


app.use(bodyParser.urlencoded({ extended: true })); // To parse form data
app.use(bodyParser.json()); // To parse JSON data

app.post('/signup', async(req,res)=>{
    console.log('Request body:', req.body);

    const username = Array.isArray(req.body.username) ? req.body.username[0] : req.body.username;
    const email = Array.isArray(req.body.username) ? req.body.username[1] : req.body.email;
    const password = req.body.password;

    console.log('Parsed data:', { username, email, password });

    //valid input
    if(!username || !email ||!password){
        return res.status(400).send('All feilds are required.');

    }

    try{
        const hashedPassword = await bcrypt.hash(password,10);
        const query = `INSERT INTO users (username, email, password) VALUES(?,?,?)`;
        db.query(query,[username, email, hashedPassword],(err,results)=>{
            if(err) {
                console.error('Error inserting data:', err);
                return res.status(500).send('Error signing up.');

            }
            console.log('User added:', results);
            
            res.redirect('/login');
        });

    } catch (error){
        console.error('Error:', error);
        res.status(500).send('Server error.');
    }
});


        
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.redirect('/login_error?error=All%20fields%20are%20required.');
    }

    const query = `SELECT * FROM users WHERE username = ?`;
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Database error.');
        }

        if (results.length === 0) {
            return res.redirect('login_error');
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.redirect('login_error');
        }

        // Save session and redirect to home_logged_in
        req.session.user = { id: user.id, username: user.username, email: user.email };
        res.redirect('/home_logged_in');
    });
});
app.get('/login_error', (req, res) => {
    // Render the login_error.ejs view and pass the error from the query parameter (if available)
    const error = req.query.error || '';
    res.render('login_error', { error: decodeURIComponent(error) });
});

app.post('/login_error', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.redirect('/login_error?error=All%20fields%20are%20required.');
    }

    const query = `SELECT * FROM users WHERE username = ?`;
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Database error.');
        }

        if (results.length === 0) {
            return res.redirect('login_error');
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.redirect('login_error');
        }

        // Save session and redirect to home_logged_in
        req.session.user = { id: user.id, username: user.username, email: user.email };
        res.redirect('/home_logged_in');
    });
});



app.get('/home', (req, res) => {
    console.log('Session User:', req.session.user);
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }

    // Render the home page with user data
    const user = req.session.user;
    res.render('home', { username: user.username, email: user.email });
});


app.get('/home_logged_in', (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }

    // Extract user data from the session
    const user = req.session.user;

    // Render the logged-in home page with user data
    res.render('home_logged_in', { username: user.username, email: user.email });
});

app.get('/projects_loggedin', (req,res)=>{
    res.render('projects_loggedin');
});

app.get('/explore_logged_in', (req,res)=>{
    res.render('explore_logged_in');
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/login'); // Redirect to login page after logout
    });
});


app.use('/api', userRoutes);


app.use(express.json());


app.use(express.static(path.join(__dirname, '../public')));

app.use(express.urlencoded({ extended: true }));

//use EJS as the view engine
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../views'));


app.get('/project_form', (req, res) => {
    res.render('project_form'); // Render views/about.ejs
});



 app.get('/about', (req, res) => {
    res.render('about'); // Render views/about.ejs
});




  app.get('/projects',(req,res)=>{
    res.render('projects');
  });

  app.get('/about_logged_in',(req,res)=>{
    res.render('about_logged_in');
  });


app.get('/', (req, res) => {
    res.render('home');
    });


app.get('/apply', (req,res)=>{
    res.render('apply');
});
 

app.get("/signup", (req, res) => {
    res.render("signup");
});

let loggedIn = false;

app.get('/login', (req, res) => {
    res.render('login', { errorMessage: req.query.error });
});

//To retrieve skills for a specific project by traversing through TASK_SKILL
app.get('/project/:id/skills', (req, res) => {
    const projectID = req.params.id;

    const query = `
        SELECT 
            p.title AS projectTitle,
            t.title AS taskTitle,
            s.skillName,
            s.category
        FROM projects p
        JOIN tasks t ON p.projectID = t.projectID
        JOIN TASK_SKILL ts ON t.taskID = ts.taskID
        JOIN skills s ON ts.skillID = s.skillID
        WHERE p.projectID = ?`;

    db.query(query, [projectID], (err, results) => {
        if (err) {
            console.error('Error fetching project skills:', err);
            return res.status(500).send('Database error.');
        }

        if (results.length === 0) {
            return res.status(404).send('No tasks or skills found for this project.');
        }

        res.render('project_skills', { projectSkills: results });
    });
});



app.post('/submit-project', (req, res) => {
    const { title, description, duration, nbOfContributor, status, createdBy } = req.body;

    // Validate input
    if (!title || !description || !duration || !nbOfContributor || !status || !createdBy) {
        return res.status(400).send('All fields are required.');
    }

    // Insert into the database
    const query = `INSERT INTO project (title, description, duration, nbOfContributor, status, createdBy) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [title, description, duration, nbOfContributor, status, createdBy];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Error inserting project:', err);
            return res.status(500).send('Error saving project.');
        }

        console.log('Project created successfully:', results);
        res.redirect('/projects'); // Redirect to the projects page
    });
});

app.get('/explore', (req, res) => {
    const query = 'SELECT * FROM SKILL'; 
    db.query(query, (err, results) => {
      if (err) throw err; // Handle the database query error
      console.log(results); // Log the results to ensure the query works correctly
      res.render('explore', { skill: results }); // Pass 'skills' to the template
    });
  });







app.get('/projects', (req, res) => {
    const query = 'SELECT * FROM PROJECT';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching projects:', err);
            return res.status(500).send('Database error.');
        }

        res.render('projects', { projects: results }); // Pass projects data to the EJS template
    });
});





const port = 4000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});