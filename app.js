const express=require("express")
const app=express();
const env=require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
const db = require("./config/db");
const path = require("path");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
db();

app.get('/contact', (req, res) => { res.render('contact', { title: 'Contact Us' });});
app.get('/about', (req, res) => { res.render('about', { title: 'About Us' });});
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
      secure:false,
      httpOnly:true,
      maxAge:72*60*60*1000
   }
}))
app.use((req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
});

app.use(passport.initialize());
app.use(passport.session());


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})
app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname,"public")));



app.use('/admin',adminRouter);
app.use("/",userRouter);

const PORT=3003 || process.env.PORT;
app.listen(PORT,()=>{console.log("http://localhost:3003")});


module.exports =app 