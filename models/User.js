const mongoose = require("mongoose")

// Creating user schema
const userShcema = new mongoose.Schema({
    email : {
    type : String ,
    required : true ,
    unique : true ,
    trim : true 
    } ,
    password : {
    type : String ,
    // required : true 
    } ,
    name : {
    type : String,
    required: false
    } ,
    picture : { 
    type : String,
    required: false
    }
})
 
module.exports = mongoose.model("User", userShcema)

