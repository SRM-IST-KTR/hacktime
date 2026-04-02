const crypto = require('crypto');
const Hackathon = require('../models/dataSchema');
const AllHackathons = require('../models/archiveSchema');

const createHackathon = async (data) => {
  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  const organizerSecret = crypto.randomBytes(16).toString('hex');

  const hackathonPayload = {
    name: data.name || "Untitled Hackathon",
    roomId: roomId,
    organizerSecret: organizerSecret,
    phases: data.phases || [],
    branding: data.branding || {}
  };

  const [hackathon] = await Promise.all([
    new Hackathon(hackathonPayload).save(),
    new AllHackathons(hackathonPayload).save()
  ]);

  return hackathon;
};

const getHackathonByRoomId = async (roomId) => {
  return await Hackathon.findOne({ roomId, isDeleted: false });
};

module.exports = {
  createHackathon,
  getHackathonByRoomId
};
