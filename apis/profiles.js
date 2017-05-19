'use strict';
var DocumentDBClient = require('documentdb').DocumentClient;

var Profile = function(config) {
  this.config = Object.assign({}, {
    CollLink: 'dbs/reporting/colls/events',
    }, config);
}

// Gets the full name from the event
Profile.prototype.getNameFromEvent = function(event) {
    switch(event.response.platform.toLowerCase()) {
        case 'instagram':
            return event.response.data.full_name;
        case 'facebook':
            return event.response.data.first_name + ' ' + event.response.data.last_name;
        case 'twitter':
            return event.response.data.name;
        default:
            return "unknown";
    }
}

// Gets the users profile photo from the event
Profile.prototype.getUserPhotoFromEvent = function(event) {
    switch(event.response.platform.toLowerCase()) {
        case 'instagram':
            return event.response.data.profile_picture;
        case 'facebook':
            return event.response.data.picture.data.url;
        case 'twitter':
            // by removing '_normal' you get a much higher resolution image from Twitter
            return event.response.data.profile_image_url.replace('_normal.', '.');
        default:
            return null;
    }
}

// Gets the users birthday from the event
Profile.prototype.getUserBirthdayFromEvent = function(event) {
    if (event.response.platform.toLowerCase() === 'facebook') {
        return event.response.data.birthday;
    }

    if (event.user && event.user.facebook && event.user.facebook.birthday) {
        return event.user.facebook.birthday;
    }

    return null;
}

// Gets the users gender from the event
Profile.prototype.getUserGenderFromEvent = function(event) {
    if (event.user && event.user.facebook && event.user.facebook.gender) {
        return event.user.facebook.gender;
    }

    return null;
}

// Gets the users twitter hande from the event
Profile.prototype.getTwitterHandleFromEvent = function(event) {
    if (event.user && event.user.twitter && event.user.twitter.username) {
        return event.user.twitter.username;
    }

    return null;
}


// Gets the users instagram hande from the event
Profile.prototype.getInstagramHandleFromEvent = function(event) {
    if (event.user && event.user.instagram && event.user.instagram.username) {
        return event.user.instagram.username;
    }

    return null;
}

// Gets the users instagram hande from the event
Profile.prototype.getFacebookHandleFromEvent = function(event) {
    if (event.user && event.user.facebook && event.user.facebook.$id) {
        return event.user.facebook.$id;
    }

    return null;
}

Profile.prototype.assignIfNotNull = function(object, parameter, value) {
     if (value != null && value !== "") {
         object[parameter] = value;
     }
 }

Profile.prototype.getList = function() {
    return new Promise((resolve, reject) => {
      let data = [];
      const docDbClient = new DocumentDBClient(this.config.Host, { masterKey: this.config.AuthKey });
      const query = 'SELECT * FROM c WHERE c.response.type =\'profile\' ORDER BY c.triggeredOn DESC';
      const options = {
          enableCrossPartitionQuery: true
      }
      docDbClient.queryDocuments(this.config.CollLink, query, options).toArray((err, results) => {
          let profiles = {};
          results.forEach((event) => {
              let userid = event.user.id;
              
              let profile = profiles[userid] || {
                  id: userid,
                  eventCount: 0,
                  mostRecentPlatform: event.response.platform,
                  triggeredOn: event.triggeredOn,
                  name: this.getNameFromEvent(event),
                  photo: this.getUserPhotoFromEvent(event),
                  birthday: null,
                  social: {}
              };

              profile.eventCount++;

              this.assignIfNotNull(profile, 'gender', this.getUserGenderFromEvent(event));
              this.assignIfNotNull(profile, 'birthday', this.getUserBirthdayFromEvent(event));
              this.assignIfNotNull(profile.social, 'twitter', this.getTwitterHandleFromEvent(event));
              this.assignIfNotNull(profile.social, 'instagram', this.getInstagramHandleFromEvent(event));
              this.assignIfNotNull(profile.social, 'facebook', this.getFacebookHandleFromEvent(event));

              profiles[userid] = profile;
          });

          // convert to array
          let profileArray = [];
          for (var key in profiles) {
              profileArray.push(profiles[key]);
          }

          resolve(profileArray);
      });
    });
}

Profile.prototype.get = function(id) {
    return new Promise((resolve, reject) => {
      let data = [];
      const docDbClient = new DocumentDBClient(this.config.Host, { masterKey: this.config.AuthKey });
      const query = 'SELECT * FROM c WHERE c.response.type =\'profile\' AND c.user.id = \'' + id + '\' ORDER BY c.triggeredOn DESC';
      const options = {
          enableCrossPartitionQuery: true
      }
      console.log(query);
      docDbClient.queryDocuments(this.config.CollLink, query, options).toArray((err, results) => {
          let profile = null;
          results.forEach((event) => {
              let userid = event.user.id;
              let p = profile || {
                  id: userid,
                  eventCount: 0,
                  mostRecentPlatform: event.response.platform,
                  triggeredOn: event.triggeredOn,
                  name: this.getNameFromEvent(event),
                  photo: this.getUserPhotoFromEvent(event),
                  birthday: null,
                  social: {}
              };
              p.eventCount++;

              this.assignIfNotNull(p, 'gender', this.getUserGenderFromEvent(event));
              this.assignIfNotNull(p, 'birthday', this.getUserBirthdayFromEvent(event));
              this.assignIfNotNull(p.social, 'twitter', this.getTwitterHandleFromEvent(event));
              this.assignIfNotNull(p.social, 'instagram', this.getInstagramHandleFromEvent(event));
              this.assignIfNotNull(p.social, 'facebook', this.getFacebookHandleFromEvent(event));

              profile = p;
          });

          resolve(profile);
      });
    });
}

module.exports = Profile;