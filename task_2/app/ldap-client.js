const ldap = require('ldapjs');
const http = require('http');
const express = require('express');
var assert = require('assert');
var promise = require('promise');
const { callbackify } = require('util');

const server = http.createServer(getFromUrl);

 async function getFromUrl(req, res){
    console.log(req.url);
    if (req.url.startsWith('/addUser?email=')){
        var splitReq = req.url.split('/addUser?email=').join().split('password=').join().split('&');
        var emailVal = splitReq[0].substring(1);
        var passVal = splitReq[1].substring(1);
        let ans = await search(/* 'o=example', opts,*/ emailVal, passVal);
        console.log('after validateCred. ' + ans);
        if(ans === 'true'){
            console.log('returning true to client.');
            res.write('true');
        }
        else{
            res.write('false');
        }
        res.end();
    }
  }

    const client = ldap.createClient({
    url: 'ldap://0.0.0.0:1389'
    });

    client.on('error', (err) => {
    // handle connection error
        console.log('connection failed.')
    })
    console.log('connection successful.')

    client.bind('cn=root', 'secret', (err) => {
    });

    console.log('bind successful.')

    let search = function(emailVal, passVal){
        const opts = {
            filter: "(email="+emailVal+")",
            scope: 'sub'
        };
    
        console.log('opts successful ' + opts.filter);
        return new promise((resolve, reject) => {
            let isInDatabase = 'false';
            client.search('o=example', opts, (err, res) => {
                res.on('searchRequest', (searchRequest) => {
                    console.log('searchRequest: ', searchRequest.messageID);
                });
                res.on('searchEntry', (entry) => {
                    const emailLDAP = entry.object.email;
                    const passwordLDAP = entry.object.password;
                    console.log(emailLDAP, passwordLDAP);
                    if(emailVal === emailLDAP && passVal === passwordLDAP){
                        isInDatabase = 'true';
                    }
                    console.log(isInDatabase);
                });
                res.on('searchReference', (referral) => {
                    console.log('referral: ' + referral.uris.join());
                });
                res.on('error', (err) => {
                    console.error('error: ' + err.message);
                    reject(err);
                });
                res.on('end', (result) => {
                    console.log('status: ' + result.status);
                    resolve(isInDatabase);
                });
            });
        });
    }

server.listen(3003);
console.log("Listen on port 3003");
