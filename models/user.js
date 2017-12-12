var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

const twilio_config = require('../config/twilio_config');

// Create authenticated Authy and Twilio API clients
const authy = require('authy')(twilio_config.authyKey);
const twilioClient = require('twilio')(twilio_config.accountSid, twilio_config.authToken);

var UserSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    firstname: {
        type: String,
    },
    lastname: {
        type: String,
    },
    password: {
        type: String,
        required: true
    },
    countryCode: {
        type: String,
    },
    phoneNumber: {
        type: String
    },
    avatar: {
        type: String
    },
    authyId: {
        type: String
    },
    emailVerifyCode: {
        type: String
    },
    cards: []
}, { strict: false });

UserSchema.pre('save', function (next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, null, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

UserSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

// Send a verification token to this user
UserSchema.methods.sendAuthyToken = function(countryCode,phoneNumber,cb) {
    var self = this;

    if (!self.authyId) {
        // Register this user if it's a new user
        console.log(self.email+phoneNumber+countryCode)
        authy.register_user(self.email, phoneNumber, countryCode,
            function(err, response) {
            if (err || !response.user) return cb.call(self, err);
            self.authyId = response.user.id;
            self.save(function(err, doc) {
                if (err || !doc) return cb.call(self, err);
                self = doc;
                sendToken();
            });
        });
    } else {
        // Otherwise send token to a known user
        sendToken();
    }

    // With a valid Authy ID, send the 2FA token for this user
    function sendToken() {
        authy.request_sms(self.authyId, true, function(err, response) {
            cb.call(self, err);
        });
    }
};

// Test a 2FA token
UserSchema.methods.verifyAuthyToken = function(otp, cb) {
    const self = this;
    authy.verify(self.authyId, otp, function(err, response) {
        cb.call(self, err, response);
    });
};
// Test a Email token
UserSchema.methods.verifyEmailToken = function(code, cb) {
    const self = this;
    if (this.emailVerifyCode == code) {
        this.emailVerifyCode = "000000"
        this.save(function (err) {
            console.log(err)
            cb.call(self,err)
        });
        
    } else {
        var err = "incorrect code"
        this.emailVerifyCode = "000000"
        cb.call(self,err)
    }
};

module.exports = mongoose.model('User', UserSchema);