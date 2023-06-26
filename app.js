require("dotenv").config();
const express = require("express");
const app = express();
const port = 3001;
const mongoose = require("mongoose");
const path = require("path");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

mongoose.connect(
  `mongodb+srv://${process.env.MONGOUSR}:${process.env.MONGOPWD}@cluster0.1ktsf.mongodb.net/rb?retryWrites=true&w=majority`
);

app.use(express.json());

app.use(express.static(path.join(__dirname, "build")));

app.use((req, res, next) => {
  res.append("Access-Control-Allow-Origin", ["http://localhost:3000"]);
  res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH");
  res.append("Access-Control-Allow-Headers", "Content-Type");
  res.append("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  realname: String,
  username: String,
  googleId: String,
  resume: Object,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3001/auth/google/rb",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate(
        {
          googleId: profile.id,
          username: profile.emails[0].value,
          realname: profile.displayName
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/rb",
  passport.authenticate("google", { failureRedirect: "/" }),
  function (req, res) {
    res.redirect("http://localhost:3000");
    // res.redirect("/");
  }
);

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.get("/loginStatus", (req, res) => {
  if (req.isAuthenticated()) {
    res.send({ status: true, username: req.user.username });
  } else {
    res.send({ status: false });
  }
});

app.get("/getResume", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user.id, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        if (docs.resume == undefined) {
          res.send({
            name: "",
            designation: "",
            email: "",
            linkedin: "",
            github: "",
            summary: "",
            skills: "",
            experience: [],
            projects: [],
            education: [],
            certifications: [],
          });
        } else res.send(docs.resume);
      }
    });
  }
});

app.post("/saveResume", (req, res) => {
  if (req.isAuthenticated()) {
    User.findByIdAndUpdate(
      req.user.id,
      { resume: req.body },
      function (err, docs) {
        if (err) {
          console.log(err);
        } else {
          res.send("done");
        }
      }
    );
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.send({ logout: "success" });
    }
  });
});
