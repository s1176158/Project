var cookieSession = require('cookie-session')
var express = require('express')
var fileUpload = require('express-fileupload')
var MongoClient = require('mongodb').MongoClient
var bodyParser = require('body-parser')
var assert = require('assert')
var app = express()
var mongourl = "mongodb://123:123@ds123956.mlab.com:23956/381pj";

app.set('view engine', 'ejs')

app.use(fileUpload())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cookieSession({
  name: 'session',
	keys: ['key'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

app.get('/', function(req,res) {
  res.redirect('/login')
});

app.get('/login', function(req,res) {
	res.status(200)
	res.render("login")
});

app.post('/login', function(req,res) {
	uid = req.body.uid
	pw = req.body.pw
	MongoClient.connect(mongourl, function (err, db) {
		assert.equal(err,null)
		console.log('Connected to MongoDB')

		db.collection('user').find({ uid:uid, pw:pw }).each(function(err, result){
			if(result != null) {
				console.log(result)
				console.log("success login")
				req.session.uid = uid
				return res.redirect("restaurants")
			}
			if(!res.headersSent){
				console.log("login failed")
				res.redirect("login")
			}
		});
	})
});

app.get('/signup', function(req,res) {
	res.status(200)
	res.render("signup")
})

app.post('/signup', function(req,res) {
	uid = req.body.uid
	pw = req.body.pw
	MongoClient.connect(mongourl, function (err, db) {
		assert.equal(err,null)
		console.log('Connected to MongoDB')

		db.collection('user').insert( { uid:uid, pw:pw } )
		db.close()
		console.log('Disconnected MongoDB')

		res.status(200)
    res.render("login")
	})
})

app.get('/restaurants', function(req,res) {
	res.status(200)
	if (req.session.uid != null){
		return(res.render("restaurants", {uid: req.session.uid}));
	} else {
		return(res.redirect("login"));
	}
})

app.listen(process.env.PORT || 8099)
