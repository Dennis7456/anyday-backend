const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please provide an email address!'],
        unique: [true, 'The is an account associated with that email']
    },
    password: {
        type: String,
        required: [true, 'Please input password'],
        unique: false
    }
})

module.exports = mongoose.model.Users || mongoose.model('Users', UserSchema);