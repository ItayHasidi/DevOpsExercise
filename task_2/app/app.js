const http = require('http');
const https = require('https');
const axios = require("axios");
var unirest = require('unirest');
const prompt = require("prompt-sync")({ sigint: true });

var isUser = false;
const email = prompt("Enter email: ");
const password = prompt.hide("Enter password: ");

let request = http.get(`http://172.17.0.2:80/addUser?email=${email}&password=${password}`, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Did not get an OK from the server. Code: ${res.statusCode}`);
    res.resume();
    return;
  }

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('close', () => {
    if(data === 'true'){
      isUser = true;
      const googleCode = prompt("Enter the code from Google: ");
      const options = {
        method: 'GET',
        url: 'https://google-authenticator.p.rapidapi.com/validate/',
        params: {code: googleCode, secret: '7H3JY3IO32JDUGLF'},
        headers: {
          'X-RapidAPI-Key': '944c08d788mshae9ba7f103f8b86p1c3352jsn119847168b40',
          'X-RapidAPI-Host': 'google-authenticator.p.rapidapi.com'
        }
      };
      axios.request(options).then(function (response) {
        if(response.data === 'True'){
          console.log('You have successfully logged in!');
        }
        else{
          console.log('Wrong code!');
        }
      }).catch(function (error) {
        console.error(error);
      });
    }
  });  
});