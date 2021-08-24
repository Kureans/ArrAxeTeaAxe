if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const app = express();
const port = process.env.PORT || 3000; 
const sqlite3 = require('better-sqlite3');
const ejs = require('ejs');
const path = require('path');
const socket = require('socket.io');       //import socket server    
const passport = require('passport');
const bcrypt = require('bcrypt');    
const flash = require('express-flash');
const session = require('express-session');   
const initializePassport = require('./passport-config');
const methodOverride = require('method-override');

const server = app.listen(port, () => console.log(`Server started on port ${port}`));

initializePassport(
    passport, 
    getUserbyEmail,
    getUserbyId
)


function getUserbyEmail(email) {

    let sql = `SELECT * from userinfo WHERE email = '${email}'`;

        return db.prepare(sql, (err, row) => {
            if (err) {
                return console.error(err.message);
            }
            if (row) {
                return row;
            }
        }).get();
};

function getUserbyId(id) {

    let sql = `SELECT * from userinfo WHERE id = ${id}`;

    return db.prepare(sql, (err, row) => {
            if (err) {
                return console.error(err.message);
            }
            return row;
        }).get();
};

var auth = false;

/************************************ COMMENT OUT if not using RPI  **********************************/
// const gpio = require('./gpio-toggle'); //import gpio functions and variables
// const videoStream = require('raspberrypi-node-camera-web-streamer/videoStream');

// videoStream.acceptConnections(app, {
//     width: 1280,
//     height: 720,
//     // width: 1920,
//     // height: 1080,
//     fps: 20,
//     encoding: 'JPEG',
//     quality: 7 //lower is faster
// }, '/stream.mjpg', true); 

/************************************ COMMENT OUT if not PI  **********************************/

let db = new sqlite3(path.resolve('./userinfo.db'));                                         

app.use(session({
    secret: 'somevalue',
    resave: true,
    saveUninitialized: true
}));


/* import all web sockets required */
const online = 0; //number of online users
const { main_sockets } = require('./websockets-server/main-sockets.js');

main_sockets(socket(server), db, online); 



app.use(express.static(__dirname+'/public')); //render static files like images
app.set('views', path.join(__dirname, 'public/views')); //sets view engine to ejs
app.set('view engine', 'ejs'); //sets view engine to ejs

app.use(express.urlencoded({ extended: false}));
app.use(flash());
app.use(session({
    secret: 'fdsbdasifdaisbfdaisfbdasifb',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


app.get('/', (req, res) => {
    console.log(res.statusCode);
    auth = req.isAuthenticated();
    function topthree () {
        let sql = 'SELECT name, score FROM userinfo ORDER BY score DESC LIMIT 3';
        return db.prepare(sql).all();
    }

    let entries = topthree();
   
    
    

    if (!auth) {
        res.render('pages/index', {
            auth: auth,
            entries: entries,
            online: online,
        });
    } else {
        let sql2 = `SELECT * FROM userachievements WHERE (id = ${req.user.id})`;
        let isAchieve = db.prepare(sql2).all();
        res.render('pages/index', {
            auth: auth,
            userid: req.user.name,
            entries: entries,
            online: online,
            dpindex: req.user.dpindex,
            isAchieve: isAchieve
        });
    }
    console.log(`Global ${online}`);
});

app.get('/about', (req, res) => {
    auth = req.isAuthenticated();
    if (!auth) {
        res.render('pages/about', {
            auth: auth 
        });
    } else {
    res.render('pages/about', {
        auth: auth,
        userid: req.user.name,
        dpindex: req.user.dpindex,
    });
    }
});

app.get('/signup', (req, res) => {
    auth = req.isAuthenticated();
    if (!auth) {
        res.render('pages/signup', {
            auth: auth 
        });
    } else {
        res.render('pages/signup', {
            auth: auth,
            userid: req.user.name,
            dpindex: req.user.dpindex,
        });
    }
    
});

app.get('/profile', (req, res) => {
    auth = req.isAuthenticated();
    if (!auth) {
        res.status(404).send('Error: Invalid Access, not logged in');
    } else {

    let sql = `SELECT * FROM userachievements WHERE (id = ${req.user.id})`;

    let isAchieve = db.prepare(sql).all();

    res.render('pages/profile', {
        auth: auth,
        userid: req.user.name,
        usermail: req.user.email,
        userscore: req.user.score,
        online: online,
        dpindex: req.user.dpindex,
        isAchieve: isAchieve
    });
    }
});

app.post('/profile', async (req, res) => {
    try {
        let newindex = req.body.profileimg;
        let name = req.user.name;
        console.log(newindex);
        console.log(req.user.name);
        let sql = `UPDATE userinfo SET dpindex = ${newindex} WHERE name = '${name}';`;
        db.prepare(sql).run();
        res.redirect('/profile');
        
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});


app.get('/leaderboard', (req, res) => {
    auth = req.isAuthenticated();

    function topthree () {
        let sql = 'SELECT name, score FROM userinfo ORDER BY score DESC;';
        return db.prepare(sql).all();
    }

    let entries = topthree();

    if (!auth) {
        res.render('pages/leaderboard', {
            auth: auth,
            entries: entries
        });
    } else {
    res.render('pages/leaderboard', {
        auth: auth,
        userid: req.user.name,
        entries: entries,
        dpindex: req.user.dpindex,
    });
    }
});

app.post('/', passport.authenticate('local', { successRedirect: '/profile', failureRedirect: '/', failureFlash: true }));

app.post('/profile', passport.authenticate('local', { successRedirect: '/profile', failureRedirect: '/', failureFlash: true }));

app.post('/signup', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);       
            initUser(req.body.username, req.body.email, hashedPassword, 0);
            db.prepare('SELECT * FROM userinfo;').all();
        res.redirect('/');
        
    } catch (error) {
        console.error(error);
        res.redirect('/signup');
    }
});

app.delete('/logout', (req, res) => {
    req.logOut();
    res.redirect('/');
});

function initUser (name, email, password, score) {
    db.prepare(`INSERT INTO userinfo (name, email, password, score) VALUES ('${name}', '${email}', '${password}', ${score});`).run();
    let id = db.prepare(`SELECT (id) FROM userinfo WHERE (name = '${name}');`).all();
    db.prepare(`INSERT INTO userachievements (id,ach1) VALUES (${id[0].id}, 0);`).run();

    //score table
    db.prepare(`CREATE TABLE ${name} (Id INTEGER PRIMARY KEY, Start TEXT, End TEXT, Score INTEGER) `).run();
}

module.exports = {
    server
}


