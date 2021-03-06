var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var http = require("http");
var socketio = require("socket.io")
var app = express();
app.io = require('socket.io')();
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var messageRouter = require('./routes/messages')(app.io);
var requestRouter = require('./routes/requests');
var deleteRouter = require('./routes/deleteMessage');

// // Create the http server 
// const server = http.createServer(app); 
  
// Create the Socket IO server on  
// the top of http server 
// const io = socketio(server);

// app.set('socketio', io);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors({
  origin : "*"
}))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/messages', messageRouter);
app.use('/requests', requestRouter);
app.use('/delete', deleteRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app; 
