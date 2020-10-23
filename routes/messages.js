var express = require("express");
var router = express.Router();
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const url = process.env.mongodbURL || "mongodb://localhost:27017/";
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* GET users Info. */

var allSockets = {
  // A storage object to hold the sockets
  sockets: {},

  // Adds a socket to the storage object so it can be located by name
  addSocket: function (socket, name) {
    this.sockets[name] = socket;
  },

  // Removes a socket from the storage object based on its name
  removeSocket: function (name) {
    if (this.sockets[name] !== undefined) {
      this.sockets[name] = null;
      delete this.sockets[name];
    }
  },

  // Returns a socket from the storage object based on its name
  // Throws an exception if the name is not valid
  getSocketByName: function (name) {
    if (this.sockets[name] !== undefined) {
      return this.sockets[name];
    } else {
      return null;
    }
  },
};

module.exports = function (io) {
  router.post("/", async function (req, res, next) {
    let client;
    let { token, friend } = req.body;

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
          let friendLastMessage = user.friends.filter(
            (userfriend) => userfriend.name === friend
          )[0];

          await db.collection("chat-users").findOneAndUpdate(
            { name: user.name, "friends.name": friend },
            {
              $set: {
                "friends.$.lastMessageRead": friendLastMessage.lastMessage,
              },
            }
          );
          res.json({
            status: 200,
            messages: messageInfo.messages,
            id: messageInfo._id,
          });
        } else {
          await db.collection("messages").insertOne({
            room: chatRoom,
            messages: [],
          });

          res.json({
            status: 200,
            messages: [],
          });
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

  function getCurrentTime() {
    let date = new Date();
    let year = date.getFullYear().toString().split("").splice(0, 2).join("");
    let hours = date.getHours();
    var meridiem = "am";
    if (hours > 12) {
      hours -= 12;
      meridiem = "pm";
    }
    let minutes = date.getMinutes();
    if(minutes < 10) minutes = '0' + minutes
    let time = date.getDate() + "-" + (date.getMonth() + 1) + "-" + year + "  " + hours +
      ":" + minutes + meridiem;
    return time;
  }

  try {
    io.on("connection", async function (socket) {
      let client = await mongoClient.connect(url);
      let db = client.db("zenClass");

      console.log("User has connected to Index");

      socket.on("remove", async ({ token }) => {
        if (token) {
          let decrypted = jwt.verify(token, "secret key");
          let user = await db.collection("chat-users").findOne({
            email: decrypted.id,
          });
          let a1 = allSockets.getSocketByName(user.name) && allSockets.removeSocket(user.name);
          let a2 = allSockets.getSocketByName("common-" + user.name) && allSockets.removeSocket("common-" + user.name);
        }
      });

      socket.on("join", async ({ token, friend, callback }) => {
        console.log("joining");
        if (token) {
          let decrypted = jwt.verify(token, "secret key");

          let user = await db.collection("chat-users").findOne({
            email: decrypted.id,
          });
          let friendStatus =
            (allSockets.getSocketByName(friend) &&
              allSockets.getSocketByName(friend).connected) ||
            (allSockets.getSocketByName("common-" + friend) &&
              allSockets.getSocketByName("common-" + friend).connected);
          socket.emit("friendStatus", { user: "admin", friendStatus });
          allSockets.addSocket(socket, user.name);
          console.log("joined", socket.id);
        }
      });

      socket.on("join common", async ({ token, callback }) => {
        if (token) {
          console.log("joining common");
          let decrypted = jwt.verify(token, "secret key");

          let user = await db.collection("chat-users").findOne({
            email: decrypted.id,
          });

          allSockets.addSocket(socket, "common-" + user.name);
          console.log("joined", socket.id);
        }
      });

      socket.on("updateLastMessage", async ({ token, user, mesg }) => {
        let decrypted = jwt.verify(token, "secret key");

        let friend = await db.collection("chat-users").findOne({
          email: decrypted.id,
        });

        await db.collection("chat-users").findOneAndUpdate(
          { name: friend.name, "friends.name": user },
          {
            $set: { "friends.$.lastMessageRead": mesg.text },
          }
        );

        let updated = await db
          .collection("chat-users")
          .findOne({ name: user, "friends.name": friend.name });
      });

      socket.on("sendMessage", async ({ mesg, friend, token }) => {
        let decrypted = jwt.verify(token, "secret key");

        let user = await db.collection("chat-users").findOne({
          email: decrypted.id,
        });

        let currentTime = getCurrentTime();
        let millsecs = Date.now();

        let newMesg = {
          info: { sender: user.name, time: currentTime, millsecs: millsecs },
          available: [user.name, friend],
          editHistory: [],
          text: mesg,
        };

        let uname = user.name.trim().toLowerCase();
        let friendName = friend.trim().toLowerCase();
        let chatRoom = uname + "-" + friendName;
        if (friendName !== "bot")
          chatRoom = uname > friendName ? friendName + "-" + uname : chatRoom;

        await db.collection("chat-users").findOneAndUpdate(
          { name: user.name, "friends.name": friend },
          {
            $set: {
              "friends.$.lastMessage": mesg,
              "friends.$.lastMesgTime": millsecs,
              "friends.$.lastMessageRead": mesg,
            },
          }
        );

        await db.collection("chat-users").findOneAndUpdate(
          { name: friend, "friends.name": user.name },
          {
            $set: {
              "friends.$.lastMessage": mesg,
              "friends.$.lastMesgTime": millsecs,
            },
          }
        );

        await db.collection("messages").findOneAndUpdate(
          {
            room: chatRoom,
          },
          {
            $push: { messages: newMesg },
          }
        );

        chatRoomMessages = await db
          .collection("messages")
          .findOne({ room: chatRoom });

        allSockets.getSocketByName(user.name).emit("recieved Message", {
          user: "admin",
          recMesg: chatRoomMessages.messages,
          sender: user.name,
          sendByMe: true,
        });

        console.log("sending room", friend);
        if (
          allSockets.getSocketByName("common-" + friend) &&
          allSockets.getSocketByName("common-" + friend).connected
        ) {
          console.log("sending to friend-common");
          allSockets
            .getSocketByName("common-" + friend)
            .emit("recieved common Message", {
              user: "admin",
              recMesg: chatRoomMessages.messages,
              sender: user.name,
              sendByMe: false,
            });
        } 
        else if (
          allSockets.getSocketByName(friend) &&
          allSockets.getSocketByName(friend).connected
        ) {
          allSockets.getSocketByName(friend).emit("recieved Message", {
            user: "admin",
            recMesg: chatRoomMessages.messages,
            sender: user.name,
            sendByMe: false,
          });
        } else {
          console.log("user Offline");
        }
      });
    });
  } catch (error) {
    console.log(error);
  }

  return router;
};
