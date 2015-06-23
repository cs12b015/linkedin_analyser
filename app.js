var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var users = require('./routes/users');
var passport = require('passport');
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var Config = require('./inconfig');
var Linkedin = require('node-linkedin')(Config.clientID,Config.clientSecret,Config.callbackURL)
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

var FacebookStrategy = require('passport-facebook').Strategy;
var graph = require('fbgraph');

var mongoose= require('mongoose');
mongoose.connect('mongodb://localhost/newdb');


var app = express();
var linkedin;
var linkedin_edu1=[];
var linkedin_work1=[];
var fb_work1=[];
var fb_edu1=[];


var linkedin_work=mongoose.model('linkedin_work',{name:String,id:String},'linkedin_work');
var linkedin_edu=mongoose.model('linkedin_edu',{name:String,id:Number},'linkedin_edu');
var facebook_work=mongoose.model('facebook_work',{name:String,id:Number},'facebook_work');
var facebook_edu=mongoose.model('facebook_edu',{name:String,id:Number},'facebook_edu');


passport.use(new FacebookStrategy({
 clientID: "1591772771103115",
 clientSecret: "6c5304df365dc4d048a34fb9aebfbb24",
 callbackURL: "http://localhost:3000/auth/facebook/callback"
},
function(accessToken, refreshToken, profile, done) {
  graph.setAccessToken(accessToken);
 process.nextTick(function () {
   return done(null, profile);
 });
}
));



var scrapedata=function(MAINURL,linid){
  request(MAINURL, function (error, response, body)
  {
    if (!error && response.statusCode == 200)
    {
      $ = cheerio.load(body);
      $('.editable-item.section-item.current-position').find('h5 a').each(function(index,item)
      { 
        var boss= $(item).text();
        if(boss!=""){
          linkedin_work1[linkedin_work1.length]=boss;
          linkedin_work.count({name:boss,id:linid},function(err,count){
            if(!count){
                var inworkitem= new linkedin_work({name:boss,id:linid});
                inworkitem.save(function (err) {
                  if (err) throw err;
                  else
                  console.log('inserted');
                });
              }
              else{
                console.log('Already Exists')
              }
          });


        }        
      });
      $ = cheerio.load(body);
      $('.editable-item.section-item.past-position').find('h5 a').each(function(index,item)
      { 
        var boss= $(item).text();
        if(boss!=""){
          linkedin_work1[linkedin_work1.length]=boss;
          linkedin_work.count({name:boss,id:linid},function(err,count){
            if(!count){
                var inworkitem= new linkedin_work({name:boss,id:linid});
                inworkitem.save(function (err) {
                  if (err) throw err;
                  else
                  console.log('inserted');
                });
              }
              else{
                console.log('Already Exists')
              }
          });
        }
      });
      console.log(linkedin_work1);
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

app.use(passport.initialize());

passport.serializeUser(function(user, done) {
done(null, user);
});
passport.deserializeUser(function(obj, done) {
done(null, obj);
});

app.get('/start',function(req,res,next){ 
 res.redirect('/auth/linkedin');
});


app.get('/inhome',function(req,res,next){ 
  linkedin.people.me(function(err, $in) {
    var mainurl =$in.publicProfileUrl
    var linid= $in.id;
      scrapedata(mainurl,linid);
      console.log($in);  
  });
  res.redirect('/auth/facebook');
});

var putinfbedu=function(data2,papid){
  facebook_edu.count(data2,function(err,count){
    if(!count){
      var fbeduitem= new facebook_edu(data2);
      fbeduitem.save(function (err) {
        if (err) throw err;
        else
        console.log('fb edu inserted');
      });
    }
    else{
      console.log('Already Exists fb edu')
    }
  });
}

var putinfbwork=function(data1,papid){
  facebook_work.count(data1,function(err,count){
    if(!count){
      var fbworkitem= new facebook_work(data1);
      fbworkitem.save(function (err) {
        if (err) throw err;
        else
        console.log('fb work inserted');
      });
    }
    else{
      console.log('Already Exists fb work')
    }
  });
}




app.get('/fbhome',function(req,res,next){ 
  graph.get('me?fields=education,work', function(err, res) {
   // console.log(res);
    var edu=res.education;
    var workk=res.work;
    var papid= res.id;
    
    for(var i=0;i<edu.length;i++){
      fb_edu1[i]=edu[i].school.name;
      var pap =edu[i].school.name;
      var data2= {name:pap,id:papid}
      putinfbedu(data2,papid);
    }



    for(var i=0;i<workk.length;i++){
      fb_work1[i]=workk[i].employer.name;
      var pat=workk[i].employer.name;
      var data1={name:pat,id:papid};
      putinfbwork(data1,papid);
    }

    console.log(fb_edu1);
    console.log(fb_work1);
  });
  res.redirect('/');
});


app.get('/auth/facebook',passport.authenticate('facebook'),function(req, res){});

app.get('/auth/facebook/callback',
passport.authenticate('facebook', { failureRedirect: '/' }),
function(req, res) {
  res.redirect('/fbhome');
});


app.get('/auth/linkedin',
  passport.authenticate('linkedin',{ state: 'SOME STATE'  }));

app.get('/auth/linkedin/callback', 
  passport.authenticate('linkedin', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/inhome');
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
