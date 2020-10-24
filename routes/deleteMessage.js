var express = require("express");
var router = express.Router();
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const url = process.env.mongodbURL || "mongodb://localhost:27017/";
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

router.post("/", async function (req, res, next) {
  let client;
  let { token, friend, message, changeLast } = req.body;

  try {
    client = await mongoClient.connect(url);
    let db = client.db("zenClass");
    let decrypted = jwt.verify(token, "secret key");

    let user = await db.collection("chat-users").findOne({
      email: decrypted.id,
    });

    if (user) {
      let uname = user.name.trim().toLowerCase();
      let friendName = friend.trim().toLowerCase();
      let chatRoom = uname + "-" + friendName;
      if (friendName !== "bot")
        chatRoom = uname > friendName ? friendName + "-" + uname : chatRoom;

      let messageInfo = await db.collection("messages").findOne({
        room: chatRoom,
      });

      if (messageInfo) {

        let deleteMessage = await db.collection("messages").findOneAndUpdate(
          { $and : [ { room: chatRoom }, { "messages.info.millsecs" : message.info.millsecs } ] },
          { $pull: { "messages.$.available" :  user.name } }
        );
        
        let messagedel = await db.collection("messages").findOne(
            { $and : [ { room: chatRoom }, { "messages.info.millsecs" : message.info.millsecs } ] },
        );
        console.log(changeLast);
        if(deleteMessage){
            if(changeLast !== ''){
                await db.collection("chat-users").findOneAndUpdate(
                    { name: user.name, "friends.name": friend },
                    {
                      $set: {
                        "friends.$.lastMessage": changeLast.text,
                        "friends.$.lastMesgTime": changeLast.info.millsecs,
                        "friends.$.lastMessageRead": changeLast.text,
                      },
                    }
                  );
            }

            res.json({
              status: 200,
              messages: 'Message Deleted',
            });
        }
        else{
            console.log('Message Not Deleted');
            res.json({
                status: 404,
                messages: 'Message Not Deleted',
              });
        }
      } 
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

module.exports = router;
