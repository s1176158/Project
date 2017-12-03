var cookieSession = require('cookie-session')
var express = require('express')
var fileUpload = require('express-fileupload')
var MongoClient = require('mongodb').MongoClient
var bodyParser = require('body-parser')
var assert = require('assert')
var app = express()
var mongourl = "mongodb://123:123@ds123956.mlab.com:23956/381pj";
var ObjectId = require('mongodb').ObjectID
var fs = require('fs')
var formidable = require('formidable')

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
  if(!uid || !pw){
    console.log("Null name or pw")
    return res.redirect("signup")
  }
	MongoClient.connect(mongourl, function (err, db) {
		assert.equal(err,null)
    console.log(uid)
		console.log('Connected to MongoDB')
    db.collection('user').find({uid: uid}).count().then(function(count){
      if (count == 0) {
        console.log(count)
    		db.collection('user').insertOne( { uid:uid, pw:pw }, function(err, result){
          console.log("New Account: "+ uid)
        	res.status(200)
          return res.redirect("login")
        })
      }
      console.log("Name already used")
      return res.redirect("signup")
    })
  	db.close()
  	console.log('Disconnected MongoDB')
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
  borough  = req.body.borough
  street   = req.body.street
  building = req.body.building
  zipcode  = req.body.zipcode
  lon      = req.body.lon
  lat      = req.body.lat

  photomimetype = null
  base64str = null

  if (req.files.photo){
    photomimetype = req.files.photo.mimetype
    photoname = req.files.photo.name
    photo    = req.files.photo

    photo.mv('photo/'+ photoname, function(err) { // temp save photo in folder
      if (err) {
        return res.status(500).send(err)
      }
      console.log('Photo uploaded!')
      base64str = base64_encode('photo/'+ photoname);
      fs.unlink('photo/'+ photoname) //delete image in case of duplicate file name
    })
  }
  MongoClient.connect(mongourl, function (err, db) {
    assert.equal(err,null)
    console.log('Connected to MongoDB')

    db.collection('restaurants').insertOne({
       name: name,
       cuisine: cuisine,
       borough: borough,
       photo: base64str,
       photomimetype: photomimetype,
       address: {
         street: street,
         building: building,
         zipcode: zipcode,
         coord: {
           lon: lon,
           lat: lat
         }
       },
       grades: [],

       owner: req.session.uid
     },
     function(err, result){
       assert.equal(err, null)
       if(result != null) {
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

app.get('/display', function(req,res) {
	if (req.session.uid != null){
    MongoClient.connect(mongourl, function (err, db) {
  		assert.equal(err,null)
  		console.log('Connected to MongoDB')
  		db.collection('restaurants').find( { _id: ObjectId(req.query.id) } ).toArray(
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

app.get('/update', function(req,res) {
  MongoClient.connect(mongourl, function (err, db) {
    assert.equal(err,null)
    console.log('Connected to MongoDB')
    db.collection('restaurants').find( { _id: ObjectId(req.query.id) } ).toArray(
      function(err, result){
        assert.equal(err,null)
        db.close()
        console.log('Disconnected MongoDB')
        res.status(200)
        return res.render("update", {uid: req.session.uid, result: result})
      }
    )
  })
})

app.post('/update', function(req,res) {
  name     = req.body.name
  cuisine  = req.body.cuisine
  borough  = req.body.borough
  street   = req.body.street
  building = req.body.building
  zipcode  = req.body.zipcode
  lon      = req.body.lon
  lat      = req.body.lat
  id       = req.body.id

  photomimetype = null
  base64str = null

  if (req.files.photo){
    photomimetype = req.files.photo.mimetype
    photoname = req.files.photo.name
    photo    = req.files.photo

    photo.mv('photo/'+ photoname, function(err) { // temp save photo in folder
      if (err) {
        return res.status(500).send(err)
      }
      console.log('Photo uploaded!')
      base64str = base64_encode('photo/'+ photoname);
      fs.unlink('photo/'+ photoname) //delete image in case of duplicate file name
    })
  }
  MongoClient.connect(mongourl, function (err, db) {
    assert.equal(err,null)
    console.log('Connected to MongoDB')

    db.collection('restaurants').update({ _id: ObjectId(req.body.id)},{
      $set: {
       name: name,
       cuisine: cuisine,
       borough: borough,
       photo: base64str,
       photomimetype: photomimetype,
       address: {
         street: street,
         building: building,
         zipcode: zipcode,
         coord: {
           lon: lon,
           lat: lat
         }
       }
     }
   },
     function(err, result){
       assert.equal(err, null)
       if(result != null) {
        console.log("Restaurant updated")
        return res.redirect("display?id="+req.body.id)
       }
      if(!res.headersSent){
        console.log("Restaurants cannot be added")
        res.redirect("display?id="+req.body.id)
      }
    })
  })
})

app.get('/delete', function(req,res) {
	res.status(200)
	console.log('delete request from '+req.session.uid+' : '+req.query.id)
	if (req.session.uid != null){
    MongoClient.connect(mongourl, function (err, db) {
  		assert.equal(err,null)
  		console.log('Connected to MongoDB')
  		db.collection('restaurants').find( { _id: ObjectId(req.query.id) } ).toArray(
        function(err, result){

			console.log('owner : '+result[0].owner)

			if(result[0].owner == req.session.uid){
				db.collection('restaurants').deleteOne( { _id: ObjectId(req.query.id) } , function(err,result){
					assert.equal(null,err)
					console.log('restaurant deleted')
					db.close()
					console.log('Disconnected mongoDB')
        	res.status(200)
					return res.render("deleted")
				})

			}
			else{
				console.log('Unauthorized request')
				db.close();
				console.log('Disconnected mongoDB');
        res.status(200)
				return res.render("unauthorized");
			}

        }
      )
  	})
	} else {
		return res.redirect("login")
	}
})

app.get('/grade', function(req,res) {
  if (req.session.uid != null){
    MongoClient.connect(mongourl, function (err, db) {
      assert.equal(err,null)
      console.log('Connected to MongoDB')
      db.collection('restaurants').find( { _id: ObjectId(req.query.id) } ).toArray(
      function(err, result){
        db.close()
        console.log(result[0].name)
        console.log('Disconnected MongoDB')

        return res.render("grade",{name: result[0].name, id: req.query.id })
      })
    })
  } else {
      return res.redirect("login")
    }
});

app.post('/grade', function(req,res) {
  if (req.session.uid != null){

    rating = req.body.rating

    MongoClient.connect(mongourl, function (err, db) {
      assert.equal(err,null)
      console.log('Connected to MongoDB')
      db.collection('restaurants').findOne( { "_id": ObjectId(req.query.id),"grades.uid":req.session.uid },
        function(err, result){
          if(!result){
            db.collection('restaurants').update({ _id: ObjectId(req.query.id) },
              {
               $push: { grades: { "uid" : req.session.uid ,
               "rating" : rating,
                } }
              },function(err,result){
                assert.equal(null,err)
                console.log('Grading success')
                db.close()
                console.log('Disconnected mongoDB')
                res.status(200)
                return res.render("rated",{id:req.query.id})
              })
            } else{
            console.log('Already rated')
            db.close();
            console.log('Disconnected mongoDB');
            res.status(200)
            return res.render("alreadyrated",{id:req.query.id});
            }
        }
      )
    })
  } else {
    return res.redirect("login")
  }
})

app.get('/search', function(req, res){
  name = req.query.name
  borough = req.query.borough
  cuisine = req.query.cuisine
  json = {}
  if(name){
    json.name = name
  }
  if(borough){
    json.borough = borough
  }
  if(cuisine){
    json.cuisine = cuisine
  }
  if (req.session.uid != null){
    MongoClient.connect(mongourl, function (err, db) {
  		assert.equal(err,null)
  		console.log('Connected to MongoDB')

  		db.collection('restaurants').find(json).count().then(function(count){
        db.collection('restaurants').find(json, {name: 1}).toArray(
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

app.post('/api/restaurant/create', function(req,res) {
  new Promise(function (resolve, reject) {
    addRestaurant(req, resolve, reject)
    }).then((docsInserted) => {
  	     console.log(docsInserted.ops)
            res.send({
                status: 'ok',
                _id: docsInserted.ops[0]._id
            })
        }).catch(function (err) {
            res.send({
                status: 'failed'
            })
        })
})

app.get('/api/restaurant/read/:para1/:para2', function(req,res) {
  para1 = req.params.para1
  para2 = req.params.para2
  switch (para1) {
    case "name":
    case "borough":
    case "cuisine":
      json = {[para1]: para2}
      MongoClient.connect(mongourl, function (err, db) {
        assert.equal(err,null)
        db.collection('restaurants').find(json).toArray(function(err, result){
          if(err != null){
            res.send({})
          }
          res.send(data)
        })
      })
      break;
    default:
      res.send({})
  }
})

app.get('/', function(req,res) {
  res.redirect('/login')
})

app.listen(process.env.PORT || 8099)

function addRestaurant(req, resolve, reject){
  name     = req.body.name
  cuisine  = req.body.cuisine
  street   = req.body.street
  building = req.body.building
  zipcode  = req.body.zipcode
  lon      = req.body.lon
  lat      = req.body.lat
  id       = req.body.id
  photo    = req.body.photo
  photomimetype = req.body.photomimetype
  owner    = req.body.owner

  MongoClient.connect(mongourl, function (err, db) {
    assert.equal(err,null)

    db.collection('restaurants').insertOne({
       name: name,
       cuisine: cuisine,
       borough: null,
       photo: photo,
       photomimetype: photomimetype,
       address: {
         street: street,
         building: building,
         zipcode: zipcode,
         coord: {
           lon: lon,
           lat: lat
         }
       },
       grades: [],
       owner: owner
     }, function(err, docsInserted){
       resolve(docsInserted)
     })
  })
}

function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}
