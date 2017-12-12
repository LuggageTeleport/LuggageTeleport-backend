var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PromoCodeSchema = new Schema({
  promocode: {
    type: String,
    unique: true
  },
});

module.exports = mongoose.model('PromoCode', PromoCodeSchema);
