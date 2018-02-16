'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening port %d in %s mode', server.address().port, app.settings.env);
});

const apiaiApp = require('apiai')('42a731d9bb77473cb3002578c4d4acbe');

app.post('/ai', (req, res) => {
  if (req.body.result.action === 'weather'){
    let city = req.body.result.parameters['geo-city'];
    let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+'e9100276675f9b1b73ee8bc943e84dda'+'&q='+city;

    request.get(restUrl, (err, response, body) => {
      if (!err && response.statusCode == 200){
        let json = JSON.parse(body);
        let tempF = ~~(json.main.temp * 9/5 - 459.67);
        let tempC = ~~(json.main.temp - 273.15);
        let msg = 'The current condition in ' + json.name + ' is ' + json.weather[0].description + ' and the temperature is ' + tempF + ' ℉ (' +tempC+ ' ℃).'

        return res.json({
          speech: msg,
          displayText: msg,
          source: 'weather'
        });
      } else {
        return res.status(400).json({
          status: {
            code: 400,
            errorType: 'I failed to look up the city name'
          }
        });
      }
    });
  }
});

//Routes
//Facebook validation
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'fr_bear'){
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

//Headling all messages
app.post('/webhook', (req, res) => {
  console.log(req.body);
  if (req.body.object === 'page'){
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text){
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

//GET query from API.ai
function sendMessage(event){
  let sender = event.sender.id;
  let text = event.message.text;

  let apiai = apiaiApp.textRequest(text, {
    sessionId: 'panda_bear'
  });

  apiai.on('response', (response) => {
    console.log(response)
    let aiText = response.result.fulfillment.speech;

    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: 'EAAdINsEX2hQBANvHPL84KE0zkNqZC5vxoySZBirhU9ZBLWgWMzNqW8JSESRVIpCzPtdxtEdZAf6mUrw7G6Sj6nM96O8ltPZC7jbi4NF4c82eudkvcxEa4xOX4ZB6nM4QwplGwEB295RLVJQonRB5vP5oHZA4z50QKgPgAZCZBYZAQU2wZDZD'},
      method: 'POST',
      json: {
        recipient: {id: sender},
        message: {text: aiText}
      }
    }, function (error, response){
      if (error){
        console.log('Error sending message: ', error);
      } else if (response.body.error){
        console.log('Error: ', response.body.error);
      }
    });
  });

  apiai.on('error', (error) => {
    console.log(error);
  });
  apiai.end();
}
