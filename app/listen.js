require('dotenv').config();
const {PubSub} = require("@google-cloud/pubsub");
const {Storage} = require('@google-cloud/storage');
const photoModel = require('./photo_model');
const request = require('request');
const ZipStream = require('zip-stream');
const express = require('express');
const firebaseDB = require("./firebaseDB");

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

const db = firebaseDB;

listen = (app) => {
  let timeout = Number(60);
  let messageCount = 0;
  let pics = [];

  const pubsub = new PubSub({projectId: 'leadtechnique2022'});

  const subscription = pubsub.subscription('dmii2-5');
  let storage = new Storage();
  let tags;

  const messageHandler = async (message) => {
    //console.log(`Received message ${message.id}:`);
    //console.log(`\tData: ${message.data}`);
    //console.log(`\tAttributes: ${message.attributes}`);
    messageCount += 1;
    tags = message.data;

    await photoModel
      .getFlickrPhotos(message.data, 'all')
      .then(photos => {
        pics = photos.slice(0, 10)
      })
      .catch(error => {
        console.log(error)
      });

    // "Ack" (acknowledge receipt of) the message
    message.ack();

    sendToStorage(pics);
  };

  subscription.on('message', messageHandler)

  async function sendToStorage(pics) {
    console.log('sendToStorage start')
    let queue = pics;

    let filename = 'public/users/mem-' + makeid(6) + '.zip';
    const file = await storage.bucket('dmii2022bucket').file(filename);
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'application/zip',
        cacheControl: 'private'
      },
      resumable: false
    })
    const zip = new ZipStream();
    zip.pipe(stream);

    function addNextFile() {
      console.log('addNextFile', queue.length);
      const elem = queue.shift()
      const stream = request(elem.media.t)
      zip.entry(stream, {name: 'picture' + queue.length + '.jpg'}, err => {
        if (err)
          throw err;
        if (queue.length > 0)
          addNextFile();
        else {
          zip.finalize();
          //console.log('zip finalised', zip);
        }
      })
    }

    addNextFile();

    return new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        reject(err);
      });
      stream.on('finish', () => {
        const ref = db.ref('mem/jobs/' + tags);
        resolve('Ok :' + filename);
        ref.set(filename)
        /*
        let jobs = app.get('jobs');
        if (!jobs) {
          jobs = []
        }
        jobs[tags] = filename;
        app.set('jobs', jobs);
         */
        console.log('sendToStorage end :' + filename);
      });
      //stream.end();
    });
  }

  setTimeout(() => {
    //subscription.removeListener('message', messageHandler);
    //console.log(`${messageCount} message(s) received.`);
  }, timeout * 1000);
}

module.exports = listen;