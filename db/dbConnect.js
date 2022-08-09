const mongoose = require('mongoose');
require('dotenv').config();

async function dbConnect() {

    mongoose.connect(
        process.env.DB_URL,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            //useCreateIndex: true
        })
        .then(() => {
            console.log('Successfuly connected to MongDB Atlas.');
        })
        .catch((error) => {
            console.log('Unable to connect to MongoDB Atlas');
            console.error(error);
        })
}

module.exports = dbConnect;