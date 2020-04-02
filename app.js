// Requiring packages
require('dotenv').config()
const express = require('express');
const app = express();
const bp = require('body-parser');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const passportlocalmongoose = require('passport-local-mongoose');
const mongoose = require('mongoose');
var nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const cloudinary = require('cloudinary');
const fs = require('fs');
const cloudinaryStorage = require("multer-storage-cloudinary");

// Configure body-parser and static folder

app.use(bp.urlencoded({
    extended: true,
}));
app.use(express.static('public'));

// Express Session 

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

// Initialize and set up a session 

app.use(passport.initialize());
app.use(passport.session());

// Connecting to the database

mongoose.connect('mongodb+srv://unnati:unnati@propertydb-plw3z.mongodb.net/propertyDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Users schema and model

const userEstateSchema = new mongoose.Schema({
    username: String,
    password: String
});

userEstateSchema.plugin(passportlocalmongoose);
const User = new mongoose.model('UserEstate', userEstateSchema);

// Property schema and model

const PropertySchema = new mongoose.Schema({
    roomtype: String,
    status: String,
    location: String,
    address: String,
    price: String,
    image: Array,
    bathroom: String,
    balcony: String,
    furnish: String,
    parking: String
});
const Property = new mongoose.model('Property', PropertySchema);

// Passport setup

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

// Nodemailer setup

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.API_KEY
    }
}));

// Multer setup

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const storage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: "propertyImages",
});

const upload = multer({storage: storage}).array("propertyImage", 4);

// Home route

app.get('/', (req, res, next) => {
    res.render('home.ejs');
});

// Admin GET and POST route
 
app.get('/admin', (req, res, next) => {
    if (req.isAuthenticated()) {
        res.render('admin.ejs');
    } else {
        res.redirect('/admin-login');
    }
});

// cloudinary done password Lemme try once
app.post('/admin', upload, (req, res, next) => {

    const property = new Property({
        status: req.body.status,
        location: req.body.location,
        roomtype: req.body.roomtype,
        address: req.body.address,
        price: req.body.price,
        image: req.files,
        bathroom: req.body.bathroom,
        balcony: req.body.balcony,
        furnish: req.body.furnish,
        parking: req.body.parking
    });

    property.save();

    res.redirect('/project');
});

app.get('/house', (req,res,next)=>{
    res.send('<h1>Sorry, we dont have housing.com for now!</h1>')
})

// Project route 
// Listings of properties go here

app.get('/project', (req, res, next) => {
    Property.find({}, function (err, property) {
        res.render("project.ejs", {
            properties: property
        });
    });
});

// Admin control route
// Properties can be deleted or edited from here 

app.get('/admin-controll', (req, res, next) => {
    if (req.isAuthenticated()) {
        Property.find({}, function (err, property) {
            console.log("Test", property)
            res.render("admin-controll.ejs", {
                properties: property
            });
        });
    } else {
        res.redirect('/admin-login');
    }
});


// delete

app.post('/delete', (req, res, next) => {
    console.log(req.body.del_id);
    Property.deleteOne({
        _id: req.body.del_id
    }, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("deleted");
        }
    })
    res.redirect('/admin-controll');
})


// Enquire route

app.get('/enquire', (req, res, next) => {
    res.render('enquire.ejs');
})

app.post('/enquire', (req, res, next) => {

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'localhost:3000',
        auth: {
            user: process.env.GMAIL_ID,
            pass: process.env.GMAIL_PASS
        }

    });

    var mailOptions = {
        from: 'unnatibamania8@gmail.com',
        to: 'jyot.bamania@yahoo.com',
        subject: 'Sending Email using Node.js',
        text: 'That was easy!',
        html: `<h1>Hey there! New Client</h1>
                    <div><h3>Name: ${req.body.name}</h3><br>
                        <h3>Name: ${req.body.phone}</h3><br>
                        <h3>Name: ${req.body.email}</h3><br>
                        <h3>Name: ${req.body.city}</h3><br>
                        <h3>Name: ${req.body.message}</h3><br>
                    <div>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }

    })
    
    res.redirect('/');

})

// Single property route

app.post('/single', (req, res, next) => {
    Property.findById({
        _id: req.body.id
    }, function (err, property) {

        res.render('single.ejs', {
            property: property
        })
    })
    
});

app.get('/single', (req,res,next)=>{
    res.render('single.ejs');
})

// Find route  

app.post('/find', (req, res, next) => {
    Property.find({ $or:[{ location: req.body.place}, { roomtype: req.body.roomtype},{ price: {
        $lte: req.body.budget
    }}]
    }, function (err, property) {
        if (err) {
            console.log(err);
        } else {
            if (property) {

                res.render("find.ejs", {
                    properties: property
                })

            } else {
                res.send("<div><h1>NOT FOUND</h1></div>")
            }
        }
    });
});

app.get('/find', (req, res, next) => {
    res.render('find.ejs');
});


// ******************************************* EDIT *************************************************************************

app.get('/edit/:id', (req,res,next)=>{

    // Obviously yeh wala undefined hi dikhayega 
    // Need to get id from control page and pass it here
    const id = req.param.id;
    Property.find({_id: id}, function(err, properties){
        
        console.log(properties);

        res.render('edit.ejs', {
            property: properties
        })

    })
})

//################################################### ADMIN LOGIN #####################################################3

app.get('/admin-login', (req, res, next) => {
    res.render('admin-login.ejs');
})

app.post('/admin-login', (req, res, next) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/admin");
            });
        }
    })
})

app.use((req,res,next)=>{
    res.status(404).render("404.ejs");
})

//################################################### SERVER ############################################################
var port = process.env.PORT;
if (port === undefined) {
    port = 3000;
}

app.listen(port, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("server runs")
    }
});
