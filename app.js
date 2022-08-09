const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dbConnect = require('./db/dbConnect');
const User  = require('./db/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('./auth');

//DB Connection
dbConnect();

//Curb Cors Error using header
app.use((request, response, next) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
    );
    response.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    next();
});

//body parser config
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (request, response, next) => {
    response.json({
        message: "Hey this is your server response!"
    });
    next();
})

app.post("/register", (request, response) => {
    //hash password
    bcrypt.hash(request.body.password, 10)
    .then( (hashedPassword) => {
        
        //create new user instance and collect data
        const user = new User({
            email: request.body.email,
            password: hashedPassword,
        });

        //save user
        user.save()

        //return success if the new user is added to the DB successfully
        .then((result) => {
            response.status(201).send({
                message: 'User created successfully',
                result,
            });
        })

        //catch error if the new user wasn't added successfully to the database
        .catch((error) => {
            response.status(500).send({
                message: 'Error creating user',
                error,
            })
        });
    })
    .catch((error) => {
        response.status(500).send({
            message: 'Password was not hashed successfully!',
            error,
        });
    });
});

app.post('/login', (request, response) => {
    User.findOne({ email: request.body.email })
    .then((user) => {
        bcrypt.compare(request.body.password, user.password)
        .then((passwordCheck) => {

            //check if password matches
            if(!passwordCheck) {
                return response.status(400).send({
                    message: "Password does not match",
                    error,
                })
            }

            // create JWT token
            const token = jwt.sign({
                userId: user._id,
                userEmail: user.email,
            },
            "RANDOM-TOKEN",
            { expiresIn: "24h"});

            //return success response
            response.status(200).send({
                message: "Login successful",
                email: user.email,
                token,
            });
        })
        .catch((error) => {
            response.status(400).send({
                message: "Passwords don't match",
                error,
            });
        })
    })
    .catch((error) => {
        response.status(404).send({
            message: "Email not found",
        })
    })
})

app.get('/free-endpoint', (request, response) => {
    response.json({
        message: "I am a free endpoint"
    });
});

app.get('/auth-endpoint', auth, (request, response) => {
    response.json({
        message: "I am an authorized endpoint"
    });
});

module.exports = app;