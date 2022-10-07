require('dotenv').config();
const formValidator = require('./form_validator');
const photoModel = require('./photo_model');
const {PubSub} = require('@google-cloud/pubsub');
const {Storage} = require('@google-cloud/storage');
const moment = require("moment");
const firebaseDB = require("./firebaseDB");

const db = firebaseDB;
const options = {
  action: 'read',
  expires: moment().add(2, 'days').unix() * 1000
};

const ejsLocalVariables = {
  tagsParameter: '',
  tagmodeParameter: '',
  photos: [],
  searchResults: false,
  invalidParameters: false,
  link: ''
};

function route(app) {
  let storage = new Storage();

  app.get('/', (req, res) => {
    const tags = ejsLocalVariables.tagsParameter = req.query.tags;
    const tagmode = ejsLocalVariables.tagmodeParameter = req.query.tagmode;

    if (tags) {
      const ref = db.ref('mem/jobs/' + tags);
      ref.on('value', async (snapshot) => {
        if (snapshot.val()) {
          const signedUrls = await storage
            .bucket('dmii2022bucket')
            .file(snapshot.val())
            .getSignedUrl(options);
          ejsLocalVariables.link = signedUrls;
        }
      }, (errorObject) => {
        console.log('The read failed: ' + errorObject.name);
      });
    }


    // if no input params are passed in then render the view with out querying the api
    if (!tags && !tagmode) {
      return res.render('index', ejsLocalVariables);
    }

    // validate query parameters
    if (!formValidator.hasValidFlickrAPIParams(tags, tagmode)) {
      ejsLocalVariables.invalidParameters = true;
      return res.render('index', ejsLocalVariables);
    }

    // get photos from flickr public feed api
    return photoModel
      .getFlickrPhotos(tags, tagmode)
      .then(photos => {
        ejsLocalVariables.photos = photos;
        ejsLocalVariables.searchResults = true;
        return res.render('index', ejsLocalVariables);
      })
      .catch(error => {
        return res.status(500).send({error});
      });
  });

  app.post('/createZip', async (req, res) => {
    const tags = ejsLocalVariables.tagsParameter = req.query.tags;
    const tagmode = ejsLocalVariables.tagmodeParameter = 'all';

    // if no input params are passed in then render the view with out querying the api
    if (!tags && !tagmode) {
      return res.render('index', ejsLocalVariables);
    }

    // validate query parameters
    if (!formValidator.hasValidFlickrAPIParams(tags, tagmode)) {
      ejsLocalVariables.invalidParameters = true;
      return res.render('index', ejsLocalVariables);
    }

    const pubsub = new PubSub({projectId: 'leadtechnique2022'});
    const dataBuffer = Buffer.from(tags);
    try {
      const messageId = await pubsub
        .topic('dmii2-5')
        .publishMessage({data: dataBuffer});
      console.log(`Message ${messageId} published.`);
    } catch (error) {
      console.error(`Received error while publishing: ${error.message}`);
      process.exitCode = 1;
    }

    // get photos from flickr public feed api
    return photoModel
      .getFlickrPhotos(tags, tagmode)
      .then(photos => {
        ejsLocalVariables.photos = photos;
        ejsLocalVariables.searchResults = true;
        return res.render('index', ejsLocalVariables);
      })
      .catch(error => {
        return res.status(500).send({error});
      });
  })

  app.get('/getZip', async (req, res) => {
    let filename = req.query.filename
    if (filename) {
      const signedUrls = await storage
        .bucket('dmii2022bucket')
        .file(filename)
        .getSignedUrl(options);
      ejsLocalVariables.link = signedUrls;
      res.send(signedUrls[0]);
    }
  })
}

module.exports = route;
