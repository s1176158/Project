var cookieSession = require('cookie-session')
var express = require('express')
var fileUpload = require('express-fileupload')
var MongoClient = require('mongodb').MongoClient
var bodyParser = require('body-parser')
var assert = require('assert')
var app = express()
var mongourl = "mongodb://123:123@ds123956.mlab.com:23956/381pj";
var ObjectId = require('mongodb').ObjectID

app.set('view engine', 'ejs')

app.use(fileUpload())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cookieSession({
  name: 'session',
	keys: ['key'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))



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

		db.collection('user').find({ uid:uid, pw:pw }).limit( 1 ).each(function(err, result){
      assert.equal(err,null)
			if(result != null) {
				console.log("success login")
				req.session.uid = uid
				res.redirect("restaurants")
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

		db.collection('user').insertOne( { uid:uid, pw:pw } )
		db.close()
		console.log('Disconnected MongoDB')

		res.status(200)
    res.redirect("login")
	})
})

app.get('/restaurants', function(req,res) {
	if (req.session.uid != null){
    MongoClient.connect(mongourl, function (err, db) {
  		assert.equal(err,null)
  		console.log('Connected to MongoDB')

  		db.collection('restaurants').find().count().then(function(count){
        db.collection('restaurants').find({}, {name: 1}).toArray(
          function(err, result){
            assert.equal(err,null)
            db.close()
            console.log('Disconnected MongoDB')
            res.status(200)
            return res.render("restaurants", {count: count, uid: req.session.uid, result: result})
          }
        )
      })
  	})

	} else {
		return res.redirect("login")
	}
})

app.get('/new', function(req,res) {
	res.status(200)
	if (req.session.uid != null){
		return res.render("new")
	} else {
		return res.redirect("login")
	}
})

app.post('/new', function(req,res) {
	res.status(200)

  name     = req.body.name
  cuisine  = req.body.cuisine
  street   = req.body.street
  building = req.body.building
  zipcode  = req.body.zipcode
  lon      = req.body.lon
  lat      = req.body.lat

  MongoClient.connect(mongourl, function (err, db) {
		assert.equal(err,null)
		console.log('Connected to MongoDB')

		db.collection('restaurants').insertOne({
       name: name,
       cuisine: cuisine,
       borough: null,
       photo: null,
       photomimetype: null,
       address: {
         street: street,
         building: building,
         zipcode: zipcode,
         coord: {
           lon: lon,
           lat: lat
         }
       },
       grades: {
       },
       owner: req.session.uid
     },
     function(err, result){
       assert.equal(err, null)
			 if(result != null) {
				console.log(result)
				console.log("New restaurants added")
				return res.redirect("restaurants")
			 }
			if(!res.headersSent){
				console.log("Restaurants cannot be added")
				res.redirect("restaurants")
			}
		})

	})
})



app.get('/display/:id', function(req,res) {
	res.status(200)
	console.log(req.params.id)
	if (req.session.uid != null){
    MongoClient.connect(mongourl, function (err, db) {
  		assert.equal(err,null)
  		console.log('Connected to MongoDB')
  		db.collection('restaurants').find( { _id: ObjectId(req.params.id) } ).toArray(
        function(err, result){
          console.log(result)
          assert.equal(err,null)
          db.close()
          console.log('Disconnected MongoDB')
          res.status(200)
          return res.render("display", {uid: req.session.uid, result: result})
        }
      )
  	})
	} else {
		return res.redirect("login")
	}
})

app.get('/delete/:id', function(req,res) {
	res.status(200)
	console.log('delete request from '+req.session.uid+' : '+req.params.id)
	if (req.session.uid != null){
    MongoClient.connect(mongourl, function (err, db) {
  		assert.equal(err,null)
  		console.log('Connected to MongoDB')
  		db.collection('restaurants').find( { _id: ObjectId(req.params.id) } ).toArray(
        function(err, result){
			
			console.log('owner : '+result[0].owner)
						
			if(result[0].owner == req.session.uid){
				db.collection('restaurants').deleteOne( { _id: ObjectId(req.params.id) } , function(err,result){
					assert.equal(null,err)
					console.log('restaurant deleted')
					db.close()
					console.log('Disconnected mongoDB')
					return res.render("deleted")
				})
				
			}
			else{
				console.log('Unauthorized request')
				db.close();
				console.log('Disconnected mongoDB');
				return res.render("unauthorized");
			}
          
        }
      )
  	})
	} else {
		return res.redirect("login")
	}
})

app.get('/', function(req,res) {
  res.redirect('/login')
});

app.listen(process.env.PORT || 8099)
