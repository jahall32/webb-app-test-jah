const express = require("express");
const app = express();
app.listen(3006, () => console.log("listening at port 3006"));
const mongoose = require("mongoose");
const multer = require("multer");
app.use(express.static("public"));
app.use(express.json());


require("dotenv").config();
const mongoDBPassword = process.env.MYMONGOPASSWORD;
const sessionSecret=process.env.MYSESSIONSECRET

app.use(express.urlencoded({ extended: false }));
mongoose.connect(`mongodb+srv://CCO6005-07:${mongoDBPassword}@cluster0.lpfnqqx.mongodb.net/JoeNewApp?retryWrites=true&w=majority`);
const path = require("path");


const User = require("./models/User");
const upload = multer({ dest: "./public/uploads/" });
const threeMins = 1000 * 60 * 3;
const oneHour = 1000 * 60 * 60;
const sessions = require("express-session");
const cookieParser = require("cookie-parser");

const postData = require("./models/Post");
const users = require("./models/User");


app.use(cookieParser());


//load sessions middleware, with some config
app.use(
    sessions({
      secret: "joes secret",
      saveUninitialized: true,
      cookie: { maxAge: oneHour },
      resave: false,
    })
  );

function checkLoggedIn(request, response, nextAction) {
  if (request.session) {
    if (request.session.userid) {
      nextAction();
    } else {
      request.session.destroy();
      return response.redirect("/login.html");
    }
  }
}

app.get("/app", checkLoggedIn, (request, response) => {
  response.sendFile(path.resolve(__dirname,'views/pages/viewposts.html')) //to make sure the user cant access the page without being logged in
});


//--------------------- login and logout controllers ------------------------------//

app.post("/logout", async (request, response) => {
    await users.setLoggedIn(request.session.userid, false);
    request.session.destroy();
    await console.log(users.getUsers());
    response.redirect("./login.html");
  });
  
  app.post("/login", async (request, response) => {
    console.log(request.body);
    let userData = request.body;
    console.log(userData);
  
    if (await User.findUser(userData.username)) {
      console.log("user found");
      if (await User.checkPassword(userData.username, userData.password)) {
        console.log("password matches");
        request.session.userid = userData.username; 
        await users.setLoggedIn(userData.username, true);
        response.redirect("/welcomepage.html");
      } else {
        console.log("password wrong");
        response.redirect("/login.html"); 
      }
    } else {
      console.log("no such user");
      response.redirect("/login.html"); 
    }
  });
  
// -----------------------------------------------------------------------------//

app.get("/categories.html", checkLoggedIn, (request, response) => {
    response.sendFile(path.resolve(__dirname,'views/pages/categories.html')) 
    });

app.get("/profile.html", checkLoggedIn, (request, response) => {
    response.sendFile(path.resolve(__dirname,'views/pages/profile.html')) 
    });

app.get("/welcomepage.html", checkLoggedIn, (request, response) => {
    response.sendFile(path.resolve(__dirname,'views/pages/welcomepage.html')) 
    });
    

//------------------------------- posts ---------------------------//

app.post("/newpost", upload.single("myImage"), async (request, response) => {
  console.log(request.file);
  let filename = null;
  if (request.file && request.file.filename) {
    filename = "uploads/" + request.file.filename;
  }
  await postData.addNewPost(request.session.userid, request.body, filename);
  response.redirect("/app");
});

app.get("/getposts", async (request, response) => {
  response.json(
    { posts: await postData.getPosts(12) } // number of posts that will be retrieved
  );
});

// --- controller for handling a post being liked --- //

app.post("/like", async (request, response) => {
  likedPostID = request.body.likedPostID;
  likedByUser = request.session.userid;
  await postData.likePost(likedPostID, likedByUser);
  response.json({ posts: await postData.getPosts(12) }); // number of posts that will be retrieved
});

//------------------------- posts by category by searching ----------------------//

app.get("/search", (req, res) => {
  const category = req.query.category;

  postData
    .searchPostsByCategory(category)
    .then((posts) => {
      res.json({ posts });
    })
    .catch((error) => {
      console.error("Error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while searching for posts." });
    });
});

// ---------------------------  Update Bio  ------------------------------------//

app.post("/updatebio", async (req, res) => {
  console.log(req.file);
  let filename = null;
  if (req.file && req.file.filename) {
    //check that a file was passes with a valid name
    filename = "uploads/" + req.file.filename;
  }
  await users.updateBio(req.session.userid, req.body, filename);
  res.redirect("/profile.html");
});

//---------------------------------------------------------------------------------//

app.post("/getonepost", async (request, response) => {
  let postid = request.body.post;
  console.log(request.body);
  response.json({ post: await postData.getPost(request.body.post) });
});

// --------------- controller for registering a new user -------------------------- //

app.post("/register", async (request, response) => {
  console.log(request.body);
  let userData = request.body;
  if (await users.findUser(userData.username)) {
    console.log("user exists");
    response.json({
      status: "failed",
      error: "user exists",
    });
  } else {
    users.newUser(userData.username, userData.password);
    response.redirect("/login.html");
  }
  console.log(users.getUsers());
});


