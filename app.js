const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { request, response } = require('express');
const dbConnect = require('./db/dbConnect');
const User  = require('./db/userModel');
const bcrypt = require('bcrypt');

//DB Connection
dbConnect();

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
    bcrypt.hash(request.body.password, 10)
    .then( (hashedPassword) => {
        console.log(hashedPassword);
        const user = new User({
            email: request.body.email,
            password: hashedPassword
        })
        user.save()
        .then((result) => {
            result.status(201).send({
                message: 'User created successfully'
            })
        })
        .catch((error) => {
            response.status(500).send({
                message: 'Error creating user',
                error
            })
        });
    })
    .catch((error) => {
        response.status(500).send({
            message: 'Password was not hashed successfully!',
            error
        });
    });
})



module.exports = app;