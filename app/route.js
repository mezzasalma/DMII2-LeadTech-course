require('dotenv').config();
const formValidator = require('./form_validator');
const photoModel = require('./photo_model');
const {PubSub} = require('@google-cloud/pubsub');
const { Storage } = require('@google-cloud/storage');
const moment = require("moment");
const {doc} = require("prettier");

function route(app) {
  let storage = new Storage();

  app.get('/', async(req, res) => {
    const tags = req.query.tags;
    const tagmode = req.query.tagmode;

    const ejsLocalVariables = {
      tagsParameter: tags || '',
      tagmodeParameter: tagmode || '',
      photos: [],
      searchResults: false,
      invalidParameters: false,
      link: ''
    };

    let jobs = app.get('jobs')
    if (jobs) {
      let found = Object.keys(jobs).find(key => key === tags)
      if(found) {
        const options = {
          action: 'read',
          expires: moment().add(2, 'days').unix() * 1000
        };
        const signedUrls = await storage
          .bucket('dmii2022bucket')
          .file(jobs[found])
          .getSignedUrl(options);

        ejsLocalVariables.link = signedUrls
      }
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

  app.post('/zip', async (req, res) => {
    const tags = req.query.tags;
    const tagmode = 'all'

    const ejsLocalVariables = {
      tagsParameter: tags || '',
      tagmodeParameter: tagmode || '',
      photos: [],
      searchResults: false,
      invalidParameters: false,
      link: ''
    };

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
}

module.exports = route;
