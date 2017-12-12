var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");
var mailgun_keys = require("../config/mailgun")

var multer = require('multer')
const UPLOAD_PATH = 'uploads';
const upload = multer({
  dest: `${UPLOAD_PATH}/`
}); // multer configuration
const formdata = multer()
router.post('/signup', upload.single('avatar'), function (req, res) {
  if (!req.body.email || !req.body.username || !req.body.password) {
    res.json({
      success: false,
      msg: 'Please pass email and password.'
    });
  } else {
    User.findOne({ $or:[ {'username':req.body.username}, {'email':req.body.email} ]}, function (err, user) {
      if (user) {
        return res.json({
          success: false,
          type: 'duplicated',
          msg: 'same user already exists.'
        });
      } else {
        let avatar = req.file ? req.file.filename : '';
        var newUser = new User({
          email: req.body.email,
          username: req.body.username,
          password: req.body.password,
          phoneNumber: req.body.phoneNumber,
          avatar: avatar,
        });
        console.log(newUser)
        // save the user
        newUser.save(function (err) {
          if (err) {
            return res.json({
              success: false,
              type: 'servererror',
              msg: 'database not working or network disconnected.'
            });
          } else {
            var api_key = mailgun_keys.api_key;
            var domain = mailgun_keys.domain;
            var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

            var username = newUser.username;
            var email = newUser.email;
            var phoneNumber = newUser.phoneNumber;

            var htmlContent = "<html><head>"
              + "<meta name='viewport' content='width=device-width' />"
              + "<meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body><table><tbody>";
          
            htmlContent += "<tr><td><h1>Welcome to new customer</h1></td></tr>";
            htmlContent += "<tr><td><h2>Just now new customer have register to your app.</h2></td></tr>";
            htmlContent += "<tr><td>User Name: </td><td>" + username + "</td></tr>";
            htmlContent += "<tr><td>Email: </td><td>" + email + "</td></tr>";
            htmlContent += "<tr><td>Phone Number: </td><td>" + phoneNumber + "</td></tr>";
            htmlContent += "</tbody></table></body></html>";
            var data = {
              from: 'LuggageTransport <postmaster@sandbox6a3da5aa8d6d40e79c1bca42f7ac1c9d.mailgun.org>',
              to: 'luggageteleport2017@gmail.com', //'luggageteleport2017@gmail.com',//'mobile.worldev@gmail.com', //,'luggageteleport2017@gmail.com',
              subject: 'LuggageTransport',
              html: htmlContent
            };
             
            mailgun.messages().send(data, function (error, body) {
              if (error){
                console.log('email not delivered successfully')
                // res.json({success: false, msg: body});
              } else {
                // res.json({success: true, msg: body});
                console.log('email delivered successfully')
              }
            });
            var token = jwt.sign(newUser, config.secret);
            res.json({
              success: true,
              msg: 'Successful created new user.',
              token: 'JWT ' + token
            });
          }

        });
      }
    });

  }
});

router.post('/signin', function (req, res) {
  User.findOne({ $or:[ {'username':req.body.usernameOrEmail}, {'email':req.body.usernameOrEmail} ]}, function (err, user) {
    if (err) throw err;
    if (!user) {
      res.status(401).send({
        success: false,
        msg: 'Authentication failed. User not found.'
      });
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.sign(user, config.secret);
          // return the information including token as JSON
          res.json({
            success: true,
            token: 'JWT ' + token
          });
        } else {
          res.status(401).send({
            success: false,
            msg: 'Authentication failed. Wrong password.'
          });
        }
      });
    }
  });
});
router.post('/getProfile', passport.authenticate('jwt', {
  session: false
}),function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;

      User.findById(userID).exec(function (err, doc) {
        if (err) {
          res.status(500).send({
            success: false,
            msg: 'db server Error.'
          });
        }
        if (!doc) {
          res.status(500).send({
            success: false,
            msg: 'user not found.'
          });
          return;
        }
        res.json({
          success: true,
          profile: doc,
        });
      })
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
router.post('/update', passport.authenticate('jwt', {
  session: false
}), upload.single('avatar'), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;

      if (!req.body.email || !req.body.username || !req.body.password) {
        res.json({
          success: false,
          msg: 'Please pass email and password.'
        });
      } else {
        User.findById(userID).exec(function (err, doc) {
          if (err) {
            res.status(500).send({
              success: false,
              msg: 'db server Error.'
            });
          }
          if (!doc) {
            res.status(500).send({
              success: false,
              msg: 'user not found.'
            });
            return;
          }
          let avatar = req.file ? req.file.filename : '';
          doc.email = req.body.email;
          doc.password = req.body.password;
          doc.username = req.body.username;
          doc.avatar = avatar;
          doc.firstname = req.body.firstname;
          doc.lastname = req.body.lastname;
          doc.phoneNumber = req.body.phoneNumber;
          doc.isNew = false;
          // save the user
          
          doc.save(function (err) {
            console.log(err)
            if (err) {
              return res.json({
                success: false,
                msg: 'User Save failed.(username or email might be duplicated)'
              });
            }
            var api_key = mailgun_keys.api_key;
            var domain = mailgun_keys.domain;
            var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

            var firstname = doc.firstname;
            var lastname = doc.lastname;
            var phonenumber = doc.phoneNumber
            var email = doc.email;

            var htmlContent = "<html><head>"
              + "<meta name='viewport' content='width=device-width' />"
              + "<meta http-equiv='Content-Type' content='text/html; charset=UTF-8' /></head><body><table><tbody>";
          
            htmlContent += "<tr><td><h2>Just now new customer have upgraded their profile.</h2></td></tr>";
            htmlContent += firstname?"<tr><td>First Name: </td><td>" + firstname + "</td></tr>":'';
            htmlContent += lastname?"<tr><td>Last Name: </td><td>" + lastname + "</td></tr>":'';
            htmlContent += phonenumber?"<tr><td>Phone Number: </td><td>" + phonenumber + "</td></tr>":'';
            htmlContent += email?"<tr><td>Email: </td><td>" + email + "</td></tr>":'';
            htmlContent += "</tbody></table></body></html>";
            var data = {
              from: 'LuggageTransport <postmaster@sandbox6a3da5aa8d6d40e79c1bca42f7ac1c9d.mailgun.org>',
              to: 'luggageteleport2017@gmail.com', // 'mobile.worldev@gmail.com', //,'nomuranori9291@gmail.com',
              subject: 'LuggageTransport',
              html: htmlContent
            };
             
            mailgun.messages().send(data, function (error, body) {
              if (error){
                console.log('email not delivered successfully')
                // res.json({success: false, msg: body});
              } else {
                // res.json({success: true, msg: body});
                console.log('email delivered successfully')
              }
            });
            res.json({
              success: true,
              msg: 'Successful updated user.'
            });
          });
        })

      }
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
router.post('/resetpassword', passport.authenticate('jwt', {
  session: false
}), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;

      User.findById(userID).exec(function (err, doc) {
        if (err) {
          res.status(500).send({
            success: false,
            msg: 'db server Error.'
          });
        }
        if (!doc) {
          res.status(500).send({
            success: false,
            msg: 'user not found.'
          });
          return;
        }
        doc.password = req.body.password;
        doc.isNew = false;
        // save the user
        
        doc.save(function (err) {
          console.log(err)
          if (err) {
            return res.json({
              success: false,
              msg: 'Reset password faild.database server error'
            });
          }
          res.json({
            success: true,
            msg: 'Successful updated user.'
          });
        });
      })
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
router.post('/addCard', passport.authenticate('jwt', {
  session: false
}),function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;
      var cardInfo = req.body.cardInfo
      User.findById(userID).exec(function (err, doc) {
        if (err) {
          res.status(500).send({
            success: false,
            msg: 'db server Error.'
          });
        }
        if (!doc) {
          res.status(500).send({
            success: false,
            msg: 'user not found.'
          });
          return;
        }

        let cards = doc.cards;
        if (!cards) {
          cards = [];
        }

        for (let i = 0; i < cards.length; i++){
          let element = cards[i]
          cardInfo.id = element.id
          if (JSON.stringify(element)==JSON.stringify(cardInfo)){
            res.json({
              success: false,
              msg: 'Duplicate card info already exist.'
            });
            return
          }
        }
        cardInfo.id = Date.now().toString();
        cards.push(cardInfo);
        // save the user
        doc["cards"] = cards;
        doc.save(function (err) {
          if (err) {
            return res.json({
              success: false,
              msg: 'Card add error'
            });
          }
          res.json({
            success: true,
            msg: 'Successful added card.'
          });
        });
      })
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
router.post('/updateCard', passport.authenticate('jwt', {
  session: false
}),function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;
      var cardInfo = req.body.cardInfo
      var cardIndex = req.body.cardIndex;
      User.findById(userID).exec(function (err, doc) {
        if (err) {
          res.status(500).send({
            success: false,
            msg: 'db server Error.'
          });
        }
        if (!doc) {
          res.status(500).send({
            success: false,
            msg: 'user not found.'
          });
          return;
        }

        let cards = doc.cards;
        if (!cards) {
          cards = [];
        }
        let cid = -1;
        for (let i = 0; i < cards.length; i++){
          let element = cards[i]
          cardInfo.id = element.id
          if (element.id!=cardIndex && JSON.stringify(element)==JSON.stringify(cardInfo)){
            res.json({
              success: false,
              msg: 'Duplicate card info already exist.'
            });
            return
          }
          if (element.id == cardIndex) {
            cid = i;
          }
        }
        if (cid == -1) {
          return res.json({
            success: false,
            msg: 'Incorrect Card ID'
          });
        }
        cardInfo.id = cardIndex
        // save the user
        doc["cards"].set(cid, cardInfo)
        doc.save(function (err) {
          if (err) {
            return res.json({
              success: false,
              msg: 'Card add error'
            });
          }
          res.json({
            success: true,
            msg: 'Successful updated card.'
          });
        });
      })
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

router.post('/deleteCard', passport.authenticate('jwt', {
  session: false
}),function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    try {
      var user = jwt.verify(token, config.secret);
      var decoded = jwt.decode(token, {
        complete: true
      });
      var userID = decoded.payload._doc._id;
      var cardInfo = req.body.cardInfo
      var cardIndex = req.body.cardIndex;
      User.findById(userID).exec(function (err, doc) {
        if (err) {
          res.status(500).send({
            success: false,
            msg: 'db server Error.'
          });
        }
        if (!doc) {
          res.status(500).send({
            success: false,
            msg: 'user not found.'
          });
          return;
        }

        let cards = doc.cards;
        if (!cards) {
          cards = [];
        }
        let newCards = [];
        for (let i = 0; i < cards.length; i++){
          if (cards[i].id!=cardIndex) {
            newCards.push(cards[i])
          }
        }
        //cards.push(cardInfo);
        // save the user
        doc["cards"] = newCards;

        doc.save(function (err) {
          if (err) {
            return res.json({
              success: false,
              msg: 'Card remove error'
            });
          }
          res.json({
            success: true,
            msg: 'Successful removed card.'
          });
        });
      })
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