'use strict';
var express = require('express');
var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('authorizenet').Constants;
var utils = require('./utils.js');
var constants = require('./constants.js');
var router = express.Router();

var PromoCode = require("../models/promocode");

router.post('/chargeCreditCard', function (req, res) {
	var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
	merchantAuthenticationType.setName(constants.apiLoginKey);
	merchantAuthenticationType.setTransactionKey(constants.transactionKey);
	let amount = req.body.amount; // 100; 
	let cardNumber = req.body.cardNumber; // '4242424242424242'; 
	let expDate = req.body.expDate.replace('/', ''); // '08/22'.replace('/','');  
	let cardCode = req.body.cardCode; // '999';   // CVV
	console.log("cardNumber---------------------->",cardNumber)
	console.log("cardCode---------------------->",cardCode)
	console.log("amount---------------------->",amount)
	console.log("expDate---------------------->",expDate)
	var creditCard = new ApiContracts.CreditCardType();
	creditCard.setCardNumber(cardNumber);
	creditCard.setExpirationDate(expDate);
	creditCard.setCardCode(cardCode);

	var paymentType = new ApiContracts.PaymentType();
	paymentType.setCreditCard(creditCard);

	var orderDetails = new ApiContracts.OrderType();
	orderDetails.setInvoiceNumber(utils.getRandomString('INV-'));
	orderDetails.setDescription('Luggage Transport Description');
// unnecesary part
/*
	var tax = new ApiContracts.ExtendedAmountType();
	tax.setAmount('4.26');
	tax.setName('level2 tax name');
	tax.setDescription('level2 tax');

	var duty = new ApiContracts.ExtendedAmountType();
	duty.setAmount('8.55');
	duty.setName('duty name');
	duty.setDescription('duty description');

	var shipping = new ApiContracts.ExtendedAmountType();
	shipping.setAmount('8.55');
	shipping.setName('shipping name');
	shipping.setDescription('shipping description');

	var billTo = new ApiContracts.CustomerAddressType();
	billTo.setFirstName('Ellen');
	billTo.setLastName('Johnson');
	billTo.setCompany('Souveniropolis');
	billTo.setAddress('14 Main Street');
	billTo.setCity('Pecan Springs');
	billTo.setState('TX');
	billTo.setZip('44628');
	billTo.setCountry('USA');

	var shipTo = new ApiContracts.CustomerAddressType();
	shipTo.setFirstName('China');
	shipTo.setLastName('Bayles');
	shipTo.setCompany('Thyme for Tea');
	shipTo.setAddress('12 Main Street');
	shipTo.setCity('Pecan Springs');
	shipTo.setState('TX');
	shipTo.setZip('44628');
	shipTo.setCountry('USA');

	var lineItem_id1 = new ApiContracts.LineItemType();
	lineItem_id1.setItemId('1');
	lineItem_id1.setName('vase');
	lineItem_id1.setDescription('cannes logo');
	lineItem_id1.setQuantity('18');
	lineItem_id1.setUnitPrice(45.00);

	var lineItem_id2 = new ApiContracts.LineItemType();
	lineItem_id2.setItemId('2');
	lineItem_id2.setName('vase2')
	lineItem_id2.setDescription('cannes logo2');
	lineItem_id2.setQuantity('28');
	lineItem_id2.setUnitPrice('25.00');

	var lineItemList = [];
	lineItemList.push(lineItem_id1);
	lineItemList.push(lineItem_id2);

	var lineItems = new ApiContracts.ArrayOfLineItem();
	lineItems.setLineItem(lineItemList);

	var userField_a = new ApiContracts.UserField();
	userField_a.setName('A');
	userField_a.setValue('Aval');

	var userField_b = new ApiContracts.UserField();
	userField_b.setName('B');
	userField_b.setValue('Bval');

	var userFieldList = [];
	userFieldList.push(userField_a);
	userFieldList.push(userField_b);

	var userFields = new ApiContracts.TransactionRequestType.UserFields();
	userFields.setUserField(userFieldList);

	var transactionSetting1 = new ApiContracts.SettingType();
	transactionSetting1.setSettingName('testRequest');
	transactionSetting1.setSettingValue('s1val');

	var transactionSetting2 = new ApiContracts.SettingType();
	transactionSetting2.setSettingName('testRequest');
	transactionSetting2.setSettingValue('s2val');

	var transactionSettingList = [];
	transactionSettingList.push(transactionSetting1);
	transactionSettingList.push(transactionSetting2);

	var transactionSettings = new ApiContracts.ArrayOfSetting();
	transactionSettings.setSetting(transactionSettingList);
	*/
// not required -end
	var transactionRequestType = new ApiContracts.TransactionRequestType();
	transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
	transactionRequestType.setPayment(paymentType);
	transactionRequestType.setAmount(amount);
// not required
	// transactionRequestType.setLineItems(lineItems);
	// transactionRequestType.setUserFields(userFields);
// not required - end
	transactionRequestType.setOrder(orderDetails);
// not required
	// transactionRequestType.setTax(tax);
	// transactionRequestType.setDuty(duty);
	// transactionRequestType.setShipping(shipping);
	// transactionRequestType.setBillTo(billTo);
	// transactionRequestType.setShipTo(shipTo);
	// transactionRequestType.setTransactionSettings(transactionSettings);
// not required -end
	var createRequest = new ApiContracts.CreateTransactionRequest();
	createRequest.setMerchantAuthentication(merchantAuthenticationType);
	createRequest.setTransactionRequest(transactionRequestType);

	//pretty print request
	//console.log(JSON.stringify(createRequest.getJSON(), null, 2));

	var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
	//Defaults to sandbox
	ctrl.setEnvironment(SDKConstants.endpoint.production);
	//ctrl.setEnvironment(SDKConstants.endpoint.sandbox);
	ctrl.execute(function () {

		var apiResponse = ctrl.getResponse();

		var response = new ApiContracts.CreateTransactionResponse(apiResponse);

		//pretty print response
		//console.log(JSON.stringify(response, null, 2));

		if (response != null) {
			if (response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK) {
				if (response.getTransactionResponse().getMessages() != null) {
					res.json({
						success: true,
						message: 'Successfully created transaction.',
						transaction: response.getTransactionResponse()
					})
					return;
					// console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
					// console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
					// console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
					// console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());
				} else {

					//console.log('Failed Transaction.');
					if (response.getTransactionResponse().getErrors() != null) {
						res.json({
							success: false,
							message: 'Failed Transaction.',
							errorcode: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
							errormessage: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
						})
						return;
						// console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
						// console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
					} else {
						res.json({
							success: false,
							message: 'Failed Transaction.'
						})
						return;
					}
				}
			} else {
				if (response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null) {
					res.json({
						success: false,
						message: 'Failed Transaction.',
						errorcode: response.getTransactionResponse().getErrors().getError()[0].getErrorCode(),
						errormessage: response.getTransactionResponse().getErrors().getError()[0].getErrorText()
					})
					return;
					// console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
					// console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
				} else {
					res.json({
						success: false,
						message: 'Failed Transaction.',
						errorcode: response.getMessages().getMessage()[0].getCode(),
						errormessage: response.getMessages().getMessage()[0].getText()
					})
					return;
				}
				//console.log('Failed Transaction. ');
				if(response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null){

					// console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
					// console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
				}
				else {
					// console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
					// console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
				}
			}
		} else {
			res.json({
				success: false,
				message: 'Null Response.',
			})
			return;
			//console.log('Null Response.');
		}

		//console.log(response);
	});
});
router.post('/chargePromoCode', function (req, res) {
	let code = req.body.promoCode;
	PromoCode.findOne({
		'promocode': code
	}, function (err, code) {
		if (err) {
			res.json({
				success: false,
				message: 'Error Found'
			})
			return
		}
		if (!code) {
			res.json({
				success: false,
				message: 'No PromoCode Found'
			})
			return
		} else {
			res.json({
				success: true,
				message: 'Successfully found'
			})
			return
		}
	})
});
router.post('/addPromoCode', function (req, res) {

	var newPromoCode = new PromoCode({
		promocode: req.body.promoCode
	});
	// save the promocode
	newPromoCode.save(function (err) {
		if (err) {
			return res.json({
				success: false,
				msg: 'duplicate error or database server error.'
			});
		} else {
			res.json({
				success: true,
				msg: 'Successful created new promocode.',
				promoCode: newPromoCode
			});
		}
	});
})
router.post('/updatePromoCode', function (req, res) {
	let promoId = req.body.promoID
	let promoCode = req.body.promoCode
	PromoCode.findById(promoId).exec(function (err, doc) {
		if (err) {
			res.status(500).send({
				success: false,
				msg: 'db server Error.'
			});
		}
		if (!doc) {
			res.status(500).send({
				success: false,
				msg: 'promoCode not found.'
			});
			return;
		}
		doc.promocode = promoCode
		doc.isNew = false;
		// save the user

		doc.save(function (err) {
			console.log(err)
			if (err) {
				return res.json({
					success: false,
					msg: 'Promo Save failed.(PromoCode might be duplicated)'
				});
			}
			res.json({
				success: true,
				msg: 'Successful updated PromoCode.'
			});
		});
	})
})
router.post('/deletePromoCode', function (req, res) {
	let promoId = req.body.promoID
	PromoCode.remove({ _id: promoId }, function(err) {
		if (err) {
			return res.json({
				success: false,
				msg: 'Promo remove failed.(PromoCode might be duplicated)'
			});
		}
		else {
			res.json({
				success: true,
				msg: 'Successful removed PromoCode.'
			});
		}
	});
})
router.post('/getPromoCode', function (req, res) {
	let promoId = req.body.promoID
	PromoCode.find({ _id: promoId }, function(err,doc) {
		if (err) {
			return res.json({
				success: false,
				msg: 'Promo find failed.'
			});
		}
		else {
			res.json({
				success: true,
				msg: 'Successful removed PromoCode.',
				promo: doc
			});
		}
	});
})
router.post('/initPromoCode', function (req, res) {
	let prePromoCode = ['wsgr0', 'LT0', 'SVB0', 'SF0'];
	var promocodes = [];
	prePromoCode.forEach(function (element) {
		for (let i = 20; i < 51; i++) {
			let promoCode = element + i;
			promocodes.push({
				'promocode': promoCode
			})
		}
	}, this);
	PromoCode.insertMany(promocodes)
		.then(function (doc) {
			res.json({
				success: true,
				msg: 'Successful created all promocodes.',
			});
		}).catch(function (err) {
			return res.json({
				success: false,
				msg: 'database server error.'
			});
		})
	// PromoCode.collection.insert(promocodes, function (err) {
	// 	console.log(err)
	//   if (err) {
	// 	return res.json({
	// 	  success: false,
	// 	  msg: 'database server error.'
	// 	});
	//   } else {
	// 	res.json({
	// 	  success: true,
	// 	  msg: 'Successful created all promocodes.',
	// 	});
	//   }
	// });

	// var newPromoCode = new PromoCode({
	// 	promocode: req.body.promoCode
	//   });
	//   // save the promocode
	//   newPromoCode.save(function (err) {
	// 	  console.log(err)
	// 	if (err) {
	// 	  return res.json({
	// 		success: false,
	// 		msg: 'database server error.'
	// 	  });
	// 	} else {
	// 	  res.json({
	// 		success: true,
	// 		msg: 'Successful created new promocode.',
	// 	  });
	// 	}
	//   });
})
module.exports = router;