var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var routes = require('./routes/index');
var users = require('./routes/users');
var passport = require('passport');
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var Config = require('./config');
var Linkedin = require('node-linkedin')(Config.clientID,Config.clientSecret,Config.callbackURL)
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
var linkedin;
var linkedin_work=[];
var fb_work=[];

var scrapedata=function(MAINURL){
  request(MAINURL, function (error, response, body)
  {
    if (!error && response.statusCode == 200)
      {
        $ = cheerio.load(body);
        $('.editable-item.section-item.current-position').find('h5 a').each(function(index,item)
        { 
          var boss= $(item).text();
          if(boss!="")
          linkedin_work[linkedin_work.length]=boss;
      });
      $ = cheerio.load(body);
        $('.editable-item.section-item.past-position').find('h5 a').each(function(index,item)
        { 
          var boss= $(item).text();
          if(boss!="")
          linkedin_work[linkedin_work.length]=boss;
      });
      console.log(linkedin_work);
    }
  });
}



passport.use(new LinkedInStrategy({
    clientID: Config.clientID,
    clientSecret: Config.clientSecret,
    callbackURL: Config.callbackURL,
     scope: ['r_basicprofile']
  },
  function(token, tokenSecret, profile, done) {
  linkedin = Linkedin.init(token);
   process.nextTick(function () {
   return done(null, profile);
 })
  }
));

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
done(null, user);
});
passport.deserializeUser(function(obj, done) {
done(null, obj);
});


app.get('/home',function(req,res,next){ 
  linkedin.people.me(function(err, $in) {
    var mainurl =$in.publicProfileUrl
      scrapedata(mainurl);
      //console.log($in);  
  });
  res.redirect('/');
});


app.get('/auth/linkedin',
  passport.authenticate('linkedin',{ state: 'SOME STATE'  }));

app.get('/auth/linkedin/callback', 
  passport.authenticate('linkedin', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/home');
  });







// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
