var express = require("express");
var router = express.Router();
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const url = process.env.mongodbURL || "mongodb://localhost:27017/";
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Login
router.post("/", async function (req, res, next) {
  // var io = req.app.get('socketio');
  // console.log(io);
  
  let client;
  try {
    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let { email, pass } = req.body;

    let existing = await db.collection("chat-users").findOne({
      email: email,
    });

    if (!existing) {
      res.json({
        status: 404,
        message: "No such user exists",
      });
    } else {
      let comparedResult = await bcryptjs.compare(pass, existing.pass);

      if (!comparedResult) {
        res.json({
          status: 500,
          message: "Password did not match",
        });
      } else {
        let token = jwt.sign({ id: email }, "secret key");
        res.json({
          status: 200,
          message: "Valid User",
          token,
        });
      }
      client.close();
    }
  } catch (error) {
    client.close();
    console.log(error);
    res.json({
      status: 404,
      message: "Something went wrong in server",
    });
  }
});

//SignUp
router.post("/newUser", async function (req, res, next) {
  let client;
  try {
    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let user = { ...req.body };
    
    let emailExists = await db.collection("chat-users").findOne({
      email: user.email,
    });
    
    let usernameExist = await db.collection("chat-users").findOne({
      name: user.uname,
    });
    
    if (emailExists) {
      res.json({
        status: 404,
        message: "Email Id already exists",
      });
    }

    else if (usernameExist) {
      res.json({
        status: 404,
        message: "User Name already Taken",
      });

    } else {
      let salt = bcryptjs.genSaltSync(10);
      let hashedPassword = bcryptjs.hashSync(user.pass, salt)
      user.pass = hashedPassword;
            
      await db.collection("chat-users").insertOne({
        name : user.uname,
        email : user.email,
        pass : user.pass,
        phoneNumber : user.phnum,
        status : 'Offline',
        friends : [{name : 'Bot', lastMessage : 'Welcome', lastMessageRead : null, lastMesgTime : 0}],
        req_rec : [],
        req_sent : []
      });

      await db.collection("messages").insertOne({
        room : user.uname.trim().toLowerCase()+'-bot',
        messages : [
          { info:
            { sender : 'bot', time : '10:00' },
            available : [user.uname],
            editHistory : [],
            text:'Welcome User'
          }
        ]
      });

      res.json({
        status: 200,
        message: "New User Account Created"
      });
    }
    client.close();
  } catch (error) {
    console.log(error);
    client.close();
    res.json({
      status: 404,
      message: "Something went wrong in server",
    });
  }
});
module.exports = router;
