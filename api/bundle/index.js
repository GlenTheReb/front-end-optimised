(function (){
  'use strict';

  var async     = require("async")
    , express   = require("express")
    , request   = require("request")
    , helpers   = require("../../helpers")
    , endpoints = require("../endpoints")
    , app       = express()

  // Bundle endpoint for basket page - aggregates cart, payment, address, and recommendations
  app.get("/bundle/basket", function (req, res, next) {
    console.log("Request received for basket bundle: " + req.url);
    
    try {
      var custId = helpers.getCustomerId(req, app.get("env"));
      console.log("Customer ID for bundle: " + custId);
      
      // Parallel requests to all required services
      async.parallel({
        cart: function(callback) {
          var cartUrl = endpoints.cartsUrl + "/" + custId + "/items";
          console.log("Fetching cart from: " + cartUrl);
          request(cartUrl, function (error, response, body) {
            if (error) {
              console.error("Cart request error:", error);
              return callback(null, { statusCode: 500, body: null });
            }
            callback(null, { statusCode: response.statusCode, body: body });
          });
        },
        
        card: function(callback) {
          var cardUrl = endpoints.cardsUrl + "/" + custId;
          console.log("Fetching card from: " + cardUrl);
          request(cardUrl, function (error, response, body) {
            if (error) {
              console.error("Card request error:", error);
              return callback(null, { statusCode: 500, body: null });
            }
            callback(null, { statusCode: response.statusCode, body: body });
          });
        },
        
        address: function(callback) {
          var addressUrl = endpoints.addressUrl + "/" + custId;
          console.log("Fetching address from: " + addressUrl);
          request(addressUrl, function (error, response, body) {
            if (error) {
              console.error("Address request error:", error);
              return callback(null, { statusCode: 500, body: null });
            }
            callback(null, { statusCode: response.statusCode, body: body });
          });
        },
        
        recommendations: function(callback) {
          var catalogueUrl = endpoints.catalogueUrl + "/catalogue?size=3";
          console.log("Fetching recommendations from: " + catalogueUrl);
          request(catalogueUrl, function (error, response, body) {
            if (error) {
              console.error("Catalogue request error:", error);
              return callback(null, { statusCode: 500, body: null });
            }
            callback(null, { statusCode: response.statusCode, body: body });
          });
        }
        
      }, function(err, results) {
        if (err) {
          console.error("Bundle request error:", err);
          return next(err);
        }
        
        try {
          // Parse and bundle all responses
          var bundledResponse = {
            cart: results.cart.statusCode === 200 && results.cart.body ? JSON.parse(results.cart.body) : null,
            card: results.card.statusCode === 200 && results.card.body ? JSON.parse(results.card.body) : { status_code: 500 },
            address: results.address.statusCode === 200 && results.address.body ? JSON.parse(results.address.body) : { status_code: 500 },
            recommendations: results.recommendations.statusCode === 200 && results.recommendations.body ? JSON.parse(results.recommendations.body) : null
          };
          
          console.log("Bundle response prepared successfully");
          res.json(bundledResponse);
          
        } catch (parseError) {
          console.error("Error parsing bundle responses:", parseError);
          return next(parseError);
        }
      });
      
    } catch (customerError) {
      console.error("Error getting customer ID:", customerError);
      // Handle case where user is not logged in
      res.status(401).json({ error: "User not logged in" });
    }
  });

  module.exports = app;
}());
