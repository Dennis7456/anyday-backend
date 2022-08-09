const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { request, response } = require('express');

//body parser config
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (request, response, next) => {
    response.json({
        message: "Hey this is your server response!"
    });
    next();
})


module.exports = app;