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
  let { token } = req.body;

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
        requestSent: user.req_sent,
      });
    } else {
      res.json({
        status: 404,
        message: "No such user found",
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

router.post("/recieved", async function (req, res, next) {
  let client;
  let { token } = req.body;

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
        requestRecieved: user.req_rec,
      });
    } else {
      res.json({
        status: 404,
        message: "No such user found",
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

router.put("/decision", async function (req, res, next) {
  let client;
  let { token, friend, decision } = req.body;

  try {
    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let decrypted = jwt.verify(token, "secret key");

    if (decision) {
      let user = await db.collection("chat-users").findOne({
        email: decrypted.id,
      });

      let userUpdate = await db.collection("chat-users").findOneAndUpdate(
        {
          name: user.name,
        },
        { 
            $push: { friends: {name : friend, lastMessage : null} } ,
            $pull: {  req_rec: friend } 
        }
      );

      let friendUpdate = await db.collection("chat-users").findOneAndUpdate(
        {
          name: friend,
        },
        { 
            $push: { friends: {name : user.name, lastMessage : null} },
            $pull: {  req_sent: user.name } 
        }
      );

      res.json({
        status: 200,
        message: 'Data Updated sucessfully',
      });

    } else {
      let user = await db.collection("chat-users").findOne({
        email: decrypted.id,
      });

      await db.collection("chat-users").findOneAndUpdate(
        {
          name: user.name,
        },
        { 
            $pull: {  req_rec: friend } 
        }
      );

      await db.collection("chat-users").findOneAndUpdate(
        {
          name: friend,
        },
        { 
            $pull: {  req_sent: user.name } 
        }
      );

      res.json({
        status: 200,
        message: 'Data Updated sucessfully',
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

router.put("/addRequest", async function (req, res, next) {
  let client;
  let { token, friend } = req.body;
  
  try {
    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let decrypted = jwt.verify(token, "secret key");

    let reqSender = await db.collection("chat-users").findOne({
      email: decrypted.id,
    });

    let user = await db.collection("chat-users").findOneAndUpdate(
      {
        email: decrypted.id,
      },
      { $push: { req_sent: friend } }
    );

    let reqReciever = await db.collection("chat-users").findOneAndUpdate(
      {
        name: friend,
      },
      { $push: { req_rec: reqSender.name } }
    );

    res.json({
      status: 200,
      message: "Request Send",
    });
  } catch (error) {
    console.log(error);
    res.json({
      status: 500,
      message: "Something went wrong in server",
    });
  }
});

module.exports = router;
