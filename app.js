const express=require("express")
const app=express();
const env=require("dotenv").config();
const db = require("./config/db");
const path = require("path");
db();


app.use(express.json());
app.use(express.urlencoded({extended:true}))


const PORT=3003 || process.env.PORT;


app.listen(PORT,()=>{console.log("http://localhost:3003")});


module.exports =app