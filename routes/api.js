var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
var mailgun_keys = require('../config/mailgun')
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");


router.post('/sendmail', function(req, res) {
  var api_key = mailgun_keys.api_key;
  var domain = mailgun_keys.domain;
  var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
  
  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var username = req.body.userName;
  var email = req.body.email;
  var phone = req.body.phone;
  var numOfBags = req.body.numOfBags
  var profileInfo = "";
  profileInfo += firstName?"<tr><td>First Name</td><td>" + firstName + "</td></tr>":"";
  profileInfo += lastName?"<tr><td>Last Name</td><td>" + lastName + "</td></tr>":"";
  profileInfo += username?"<tr><td>Username</td><td>" + username + "</td></tr>":"";
  profileInfo += email?"<tr><td>Email</td><td>" + email + "</td></tr>":"";
  profileInfo += phone?"<tr><td>Phone Number</td><td>" + phone + "</td></tr>":"";
  profileInfo += numOfBags?"<tr><td>Number of bags</td><td>" + numOfBags + "</td></tr>":"";


  var listAirNameTml = req.body.listAirNameTml
  var airline = req.body.airline
  var flightNumber = req.body.flightNumber
  var estTimeArrival = req.body.estTimeArrival
  var listHtlNameCity = req.body.listHtlNameCity
  var guestName = req.body.guestName
  var htlConfNumber = req.body.htlConfNumber
  var pickDate = req.body.pickDate
  var overngtStorage = req.body.overngtStorage==1?"YES":"NO"
  var deliveryDate = req.body.deliveryDate
  var htmlContent = "<html><head>"
    + "<meta name='viewport' content='width=device-width' />"
    + "<meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body><table><tbody>";

  htmlContent += profileInfo;
  htmlContent += "<tr><td>Airport</td><td>" + listAirNameTml + "</td></tr>";
  htmlContent += "<tr><td>Airline</td><td>" + airline + "</td></tr>";
  htmlContent += "<tr><td>Flight Number</td><td>" + flightNumber + "</td></tr>";
  htmlContent += "<tr><td>Pick up Date</td><td>" + pickDate + "</td></tr>";
  htmlContent += "<tr><td>Estimated Time of Arrival</td><td>" + estTimeArrival + "</td></tr>";
  htmlContent += "<tr><td>Hotel for Drop off</td><td>" + listHtlNameCity + "</td></tr>";
  htmlContent += "<tr><td>Hotel Booking Reference</td><td>" + htlConfNumber + "</td></tr>";
  htmlContent += "<tr><td>Name under Hotel Reservation</td><td>" + guestName + "</td></tr>";
  htmlContent += "<tr><td>Overnight Storage</td><td>" + overngtStorage + "</td></tr>";
  htmlContent += "<tr><td>Drop off Date</td><td>" + deliveryDate + "</td></tr>";
  htmlContent += "</tbody></table></body></html>";
  var data = {
    from: 'LuggageTransport <postmaster@sandbox6a3da5aa8d6d40e79c1bca42f7ac1c9d.mailgun.org>',
    to: 'luggageteleport2017@gmail.com', //'mobile.worldev@gmail.com', //,
    subject: 'LuggageTransport',
    html: htmlContent
  };
   
  mailgun.messages().send(data, function (error, body) {
    if (error){
      res.json({success: false, msg: body});
    } else {
      res.json({success: true, msg: body});
    }
  });
});

router.post('/book', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body);
    var newBook = new Book({
      isbn: req.body.isbn,
      title: req.body.title,
      author: req.body.author,
      publisher: req.body.publisher
    });

    newBook.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Save book failed.'});
      }
      res.json({success: true, msg: 'Successful created new book.'});
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});

router.post('/sendCodeToMobile', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  var user = jwt.verify(token, config.secret);
  var decoded = jwt.decode(token, {
    complete: true
  });
  var userID = decoded.payload._doc._id;

  User.findById(userID).exec(function (err, user) {
    if (err) {
      res.status(500).send({
        success: false,
        msg: 'db server Error.'
      });
    }
    if (!user) {
      res.status(500).send({
        success: false,
        msg: 'user not found.'
      });
      return;
    }
    user.sendAuthyToken(req.body.countryCode,req.body.phoneNumber,function(err) {
      if (err) {
         return  res.json({result:false, message: "There was error to sending code, please try again"});
      }

      // Send to token verification page
      return  res.json({result:true, message: "Successfully sent verfication Code, please check message"});
  });
  })

});
router.post('/verifyMobileCode', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;
      User.findById(userID, function(err, doc) {
        if (err || !doc) {
            return res.status(401).send({
              success: false,
              msg: 'Authentication failed.'
            });
        }

        // If we find the user, let's validate the token they entered
        user = doc;
        console.log("verify code",req.body.code)
        user.verifyAuthyToken(req.body.code, postVerify);
        function postVerify(err) {
          if (err) {
              return res.status(401).send({
                success: false,
                msg: 'The token you entered was invalid - please retry.'
              });
          }

          // If the token was valid, flip the bit to validate the user account
          return res.status(401).send({
                success: true,
                msg: 'Mobile verfication successed'
          });
        }
      });
      } catch (err) {
        res.status(401).send({
          success: false,
          msg: 'Authentication failed. Wrong password.'
        });
      }
  } else {
    return res.status(403).send({
      success: false,
      msg: 'Unauthorized.'
    });
  }
  
});
router.get('/sendCodeToMail', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  var user = jwt.verify(token, config.secret);
  var decoded = jwt.decode(token, {
    complete: true
  });
  var userID = decoded.payload._doc._id;

  User.findById(userID).exec(function (err, user) {
    if (err) {
      res.status(500).send({
        success: false,
        msg: 'db server Error.'
      });
    }
    if (!user) {
      res.status(500).send({
        success: false,
        msg: 'user not found.'
      });
      return;
    }
    var api_key = mailgun_keys.api_key;
    var domain = mailgun_keys.domain;
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

    var verifyCode = Date.now().toString().split("").reverse().join("").substring(0,6);
    var htmlContent = "<html><head>"
      + "<meta name='viewport' content='width=device-width' />"
      + "<meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body><table><tbody>";
  
    htmlContent += "<tr><td>Verify Code: </td><td>" + verifyCode + "</td></tr>";
    htmlContent += "</tbody></table></body></html>";
    var data = {
      from: 'LuggageTransport <postmaster@sandbox6a3da5aa8d6d40e79c1bca42f7ac1c9d.mailgun.org>',
      to: 'nomuranori9291@gmail.com',//user.email, //'mobile.worldev@gmail.com', //,
      subject: 'Email Verification for LuggageTransport',
      html: htmlContent
    };
    // console.log(data)
    mailgun.messages().send(data, function (error, body) {
      if (error){
        res.json({success: false, msg: body});
      } else {
        user.emailVerifyCode = verifyCode;
        user.save(function (err) {
          console.log(err)
          if (err) {
            return res.json({
              success: false,
              msg: 'Database server error, please send code again'
            });
          }
          return res.json({
            success: true,
            msg: 'Successfully sent verification code to your email',
            email: user.email
          });
        }); 
      }//end of error
    });
  })

});
router.post('/verifyEmailCode', passport.authenticate('jwt', { session: false}), function(req, res) {
  if (req.body.code=="000000"){
    return res.status(401).send({
      success: false,
      msg: 'The token you entered was invalid - please retry.'
    });
  }
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;
      User.findById(userID, function(err, doc) {
        if (err || !doc) {
            return res.status(401).send({
              success: false,
              msg: 'Authentication failed.'
            });
        }

        // If we find the user, let's validate the token they entered
        user = doc;
        console.log("verify code",req.body.code)
        user.verifyEmailToken(req.body.code, postVerify);
        function postVerify(err) {
          if (err) {
              return res.status(401).send({
                success: false,
                msg: 'The token you entered was invalid - please retry.'
              });
          }

          // If the token was valid, flip the bit to validate the user account
          return res.status(401).send({
                success: true,
                msg: 'Email verfication successed'
          });
        }
      });
      } catch (err) {
        res.status(401).send({
          success: false,
          msg: 'Authentication failed. Wrong password.'
        });
      }
  } else {
    return res.status(403).send({
      success: false,
      msg: 'Unauthorized.'
    });
  }
  
});
router.post('/sendSupportMail', function(req, res) {
  var api_key = mailgun_keys.api_key;
    var domain = mailgun_keys.domain;
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

    var username = req.body.username;
    var email = req.body.email;
    var message = req.body.message;

    var htmlContent = "<html><head>"
      + "<meta name='viewport' content='width=device-width' />"
      + "<meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body><table><tbody>";
  
    htmlContent += "<tr><td><h1>Support Message</h1></td></tr>";
    // htmlContent += "<tr><td><h2>Just now new customer have register to your app.</h2></td></tr>";
    htmlContent += "<tr><td>User Name: </td><td>" + username + "</td></tr>";
    htmlContent += "<tr><td>Email: </td><td>" + email + "</td></tr>";
    htmlContent += "<tr><td>Message: </td><td>" + message + "</td></tr>";
    htmlContent += "</tbody></table></body></html>";
    var data = {
      from: 'LuggageTransport <postmaster@sandbox6a3da5aa8d6d40e79c1bca42f7ac1c9d.mailgun.org>',
      to: 'support@luggageteleport.com', // 'mobile.worldev@gmail.com', //,'luggageteleport2017@gmail.com',
      subject: 'LuggageTransport',
      html: htmlContent
    };
     
    mailgun.messages().send(data, function (error, body) {
      if (error){
        return res.json({success: false, msg: body});
      } else {
        return res.json({success: true, msg: body});
      }
    });
});

router.get('/book', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    Book.find(function (err, books) {
      if (err) return next(err);
      res.json(books);
    });
  } else {
    return res.status(403).send({success: false, msg: 'Unauthorized.'});
  }
});


getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;
