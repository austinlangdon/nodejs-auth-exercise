var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var csrf = require('csurf');
var express = require('express');
var mongoose = require('mongoose');
var sessions = require('client-sessions');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User = mongoose.model('User', new Schema({
	id: ObjectId,
	firstName: String,
	lastName: String,
	email: {type: String, unique: true},
	password: String,
}));

var app = express();

app.set('view engine', 'jade');

app.locals.pretty = true;

// connect to db
mongoose.connect('mongodb://localhost/newauth');

// middleware
app.use(bodyParser.urlencoded({ extended:true }));

app.use(sessions({
	cookieName: 'session',
	secret: 'dasd90asd8989af8dg9898eq9',
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000
}));

app.use(function(req, res, next) {
	if(req.session && req.session.user) {
		User.findOne({ email: req.session.user.email }, function(err, user) {
			if(user) {
				req.user = user;
				delete req.user.password;
				req.session.user = user;
				res.locals.user = user;
			}
			next();
		});
	
	} else {
		next();
	}
});

function requireLogin(req, res, next) {
	if(!req.user) {
		res.direct('login');
	} else {
		next();
	}
}

app.use(csrf());

app.get('/', function (req, res) {
	res.render('index.jade');
});

app.get('/register', function (req, res) {
	res.render('register.jade', { csrfToken: req.csrfToken() });
});

app.post('/register', function (req, res) {
	var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
	var user = new User({
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
		password: hash
	});
	
	user.save(function(err) {
		if (err) {
			var error = 'Something bad happened. Try again!';
			
			if (err.code === 11000) {
				error = 'That email is already taken, try another.';
			}

			res.render('register.jade', {error: error});
			
		} else {
			res.redirect('/dashboard');
		}
	});
});

app.get('/login', function (req, res) {
	res.render('login.jade', { csrfToken: req.csrfToken() });
});

app.get('/dashboard', requireLogin,  function (req, res) {
	res.redirect('/login');
});

app.get('/logout', function (req, res) {
	res.redirect('/login');
});

app.post('/login', function (req, res) {
	User.findOne({ email: req.body.email }, function(err, user) {
		if(!user) {
			res.render('login.jade', {error: 'Invalid email or password' });
		} else {
			if(bcrypt.compareSync(req.body.password, user.password)) {
				req.session.user = user; // set-cookie
				res.render('dashboard.jade', {user: user});
			} else {
				res.render('login.jade', {error: 'Invalid email or password' });
			}
		}
	});

	
});

app.listen(3000);

