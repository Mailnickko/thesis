const { consultNetwork } = require('../consultationHelpers/neuralHelpers');
const Event = require('../db/models/Event');
const User = require('../db/models/User');
const { sendNotification } = require('../notificationHelpers/emailHelpers');
const { deepEquals } = require('../consultationHelpers/apiHelpers');
const io = require('../server');
const _ = require('lodash');

module.exports.createEvent = (constraints, creator) => {

  return Event.create({
    date: constraints.date,
    time: constraints.time,
    name: constraints.name,
    isVoting: false,
    voteCompleted: false,
    winnerDecided: false,
    creator: creator,
    users: [creator],
    bulletinBoard: {},
    constraints: constraints,
    choice: [],
    choices: [],
    userTags: {},
    userVoteStatus: []
  });

};

module.exports.getEvents = userId => {
  //Gets all events stored in database, filters for only those events where userId is in event.users array
  return Event.find({})
    .then( events => {
      return events.filter( event => {
        return event.users.indexOf(userId) > -1;
      });
    });
};

module.exports.getEvent = (eventId, userId) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      if (event.users.indexOf(userId) === -1) {
        event.users.push(userId);
        event.save();
      }
      return event;
    });
};

module.exports.beginEventVote = (eventId, userId) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      if (event.creator === userId) {
        event.startVoting();
        return module.exports.getTags(event)
          .then(tags => {
            return event.getRecommendations(tags, event.constraints.location);
          });
      } else {
        return 'Not event creator!';
      }
    });
};

module.exports.getTags = event => {
  const orArray = event.users.map(user => ({userId: user}));
  return User.find({$or: orArray}, { tags: 1, _id: 0})
    .then(userTags => {
      return _.map(userTags, 'tags').map(arrayOfTags => {
        return arrayOfTags.map(tags => ({tags: tags}));
      });
    });
};

module.exports.endEventVote = (winningEvent, eventId, userId) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      if (event.creator === userId) {
        module.exports.assignTags(event);
        event.completeVoting();
        event.setWinner(winningEvent);
        Event.findOneAndUpdate({'_id': eventId},
      { 'choices': [] })
        .then(updatedEvent => {
          return updatedEvent;
        });
      } else {
        return 'Not event creator!';
      }
    });
};

module.exports.assignTags = event => {
  Object.keys(event.userTags).forEach(userId =>{
    return User.findOne({userId: userId})
      .then(user => {
        User.findOneAndUpdate({userId: userId},
        {tags: [...user.tags, ...event.userTags[userId]]})
        .then(user =>{
          return user;
        });
      });
  });
};

module.exports.upVote = (index, eventId, userId) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      let current = event.choices;
      //Handles if user hasn't voted at all on a suggestion
      if (!current[index]['upVotedUsers'][userId] && !current[index]['downVotedUsers'][userId]) {
        current[index]['upVotedUsers'][userId] = true;
        current[index]['netVotes'] += 1;
        //check if user is in userTags object
        if (!event['userTags'][userId]) {
            //if not assign user to tags in object
          event['userTags'][userId] = [current[index]['tags']];
        } else {
            //if so push tags to user array
          event['userTags'][userId] = [...event['userTags'][userId], current[index]['tags']];
        }
      } else if (!current[index]['upVotedUsers'][userId] && current[index]['downVotedUsers'][userId]) {
        delete current[index]['downVotedUsers'][userId];
        current[index]['netVotes'] += 1;
      }
      return Event.findOneAndUpdate({'_id': eventId}, { 'choices': current,
        'userTags': event['userTags']});
    })
    .then(updatedEvent => {
      return updatedEvent;
    });
};

module.exports.downVote = (index, eventId, userId) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      let current = event.choices;
      if (!current[index]['upVotedUsers'][userId] && !current[index]['downVotedUsers'][userId]) {
        current[index]['downVotedUsers'][userId] = true;
        current[index]['netVotes'] -= 1;
      } else if (current[index]['upVotedUsers'][userId] && !current[index]['downVotedUsers'][userId]) {
        delete current[index]['upVotedUsers'][userId];
        current[index]['netVotes'] -= 1;
        let deletedTag = false;
        let newTags = event['userTags'][userId].reduce((tags, nextTag) => {
          if (!deletedTag && deepEquals(nextTag, current[index]['tags'])) {
            deletedTag = true;
            return tags;
          } else {
            return [...tags, nextTag];
          }
        }, []);
        event['userTags'][userId] = newTags;
      }
      return Event.findOneAndUpdate({'_id': eventId},
      { 'choices': current,
        'userTags': event['userTags']})
      .then(updatedEvent => {
        return updatedEvent;
      });
    });
};

module.exports.inviteUser = (userId, creatorId, inviteeEmail, eventId) => {
  let creatorEmail, creatorName, subject, body;
  //retrieve creator email from creator's user object, set subject, set body trigger email helper function
  return User.findOne({userId})
    .then(user => {
      subject = `${user.name} has invited you to an event!`;
      body = `Please go to https://socializenow.herokuapp.com/polling/${eventId} for more details.`;
      sendNotification(user.email, inviteeEmail, subject, body);
    })
    .catch(err => console.log(err));
};

module.exports.deleteEvent = (eventId, userId) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      let userIndex = event.users.indexOf(userId);
      if (userIndex > -1) {
        event.users.splice(userIndex, 1);
        event.save();
      }
      return event;
    });
};

module.exports.addUserStatus = (eventId, userId, name, picture) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      let found = false;

      let userStat = {
        userId,
        name,
        picture,
        status: false
      };

      event.userVoteStatus.forEach(item => {
        if (item.userId === userId) {
          return found = true;
        }
      });

      if (!found) {
        event.userVoteStatus.push(userStat);
        event.save();
      }

      io.io.sockets.in(eventId).emit('userStatus', event.userVoteStatus);
      return event;
    });
};

module.exports.lockInVote = (eventId, userId) => {
  return Event.findOne({_id: eventId})
    .then( event => {
      let personIndex;
      event.userVoteStatus.forEach( (item, index) => {
        if (item.userId === userId) {
          return personIndex = index;
        }
      });

      event.userVoteStatus[personIndex].status = true;

      Event.findOneAndUpdate({'_id': eventId},
      { 'userVoteStatus': event.userVoteStatus })
        .then(updatedEvent => {
          io.io.sockets.in(eventId).emit('userStatus', event.userVoteStatus);

          let allVoted = event.userVoteStatus.reduce((memo, curr) => {
            return memo && curr.status;
          }, true);

          if (allVoted) {
            io.io.sockets.in(eventId).emit('allvote', true);
          }
          return updatedEvent;
        });
    });
};
