var express = require("express");
var router = express.Router();
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const url = process.env.mongodbURL || "mongodb://localhost:27017/";
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* GET users Info. */
router.post("/", async function (req, res, next) {
  let client;
  let token = req.body.token;

  try {
    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let decrypted = jwt.verify(token, "secret key");
    
    let user = await db.collection("chat-users").findOne({
      email: decrypted.id,
    });

    if (user) {
      res.json({
        status: 200,
        friends: user.friends,
        reqRecieved: user.req_rec,
        reqSend: user.req_sent,
      });
    } else {
      res.json({
        status: 404,
        message: "No Data Found",
      });
    }
    client.close();
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Something went wrong in server",
    });
  }
});


router.post("/friends", async function (req, res, next) {
  let client;
  let token = req.body.token;
  try {
    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let decrypted = jwt.verify(token, "secret key");
    let user = await db.collection("chat-users").findOne({
      email: decrypted.id,
    });

    if (user) {
      res.json({
        status: 200,
        friends: user.friends,
      });
    } else {
      res.json({
        status: 404,
        message: "No Data Found",
      });
    }
    client.close();
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Something went wrong in server",
    });
  }
});

router.post("/search", async function (req, res, next) {
  let client;
  let { token, searchString } = req.body;
  try {

    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let decrypted = jwt.verify(token, "secret key");
    
    let user = await db.collection("chat-users").findOne({
      email: decrypted.id,
    });

    let userName = user.name

    let regg = new RegExp(searchString, "i");
    let regQuery = { name: regg };

    if (user) {
      let friendSearch = await db
        .collection("chat-users")
        .find(
          { $and: [regQuery, { name: { $ne: user.name } }] },
          {
            projection: {
              name: 1,
              _id: 0,
            },
          }
        )
        .toArray();

        friendSearch.map(friend => {
          if(user.friends.filter(userFriend => userFriend.name == friend.name).length) friend.isFriend = true
          else friend.isFriend = false;
          return friend
        })

      res.json({
        status: 200,
        result: friendSearch,
      });
    } else {
      res.json({
        status: 404,
        message: "Not a valid user",
      });
    }
    client.close();
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Something went wrong in server",
    });
  }
});

module.exports = router;
