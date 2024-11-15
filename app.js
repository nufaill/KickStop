const express=require("express")
const app=express();
const env=require("dotenv").config();
const db = require("./config/db");
const path = require("path");
const userRouter = require("./routes/userRouter");
db();


app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,"views/admin")])
app.use(express.static("public"));


app.use("/",userRouter);

const PORT=3003 || process.env.PORT;
app.listen(PORT,()=>{console.log("http://localhost:3003")});


module.exports =app