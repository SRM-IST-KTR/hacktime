const mongoose = require('mongoose');

const PhaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  autoTransition: { type: Boolean, default: false }
});

const AnnouncementEntrySchema = new mongoose.Schema({
  text: { type: String, required: true },
  duration: { type: Number, default: 10 },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const HackathonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roomId: { type: String, required: true, unique: true, index: true },
  organizerSecret: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },

  eventStartTime: { type: String, default: "" },
  eventEndTime: { type: String, default: "" },
  timezone: { type: String, default: "UTC" },

  status: { type: String, enum: ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED'], default: 'DRAFT' },
  currentPhaseIndex: { type: Number, default: 0 },
  phaseEndTime: { type: Date, default: null },
  pausedRemainingMs: { type: Number, default: null },
  lastControlAction: {
    type: String,
    enum: ['PAUSE', 'RESUME', 'NEXT_PHASE', 'STOP', 'ANNOUNCE', 'RECALCULATE'],
    default: null
  },
  lastControlActionAt: { type: Date, default: null },

  // NEW: Advanced Broadcast Data
  announcement: { type: String, default: "" },
  announcementDuration: { type: Number, default: 10 },
  announcementTimestamp: { type: Date, default: null },
  announcementHistory: { type: [AnnouncementEntrySchema], default: [] },

  phases: [PhaseSchema],
  branding: {
    accentColor: { type: String, default: "#a2c9ff" },
    logoUrl: { type: String, default: "" }
  },

  participants: [{
    teamName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Hackathon = mongoose.models.Hackathon || mongoose.model('Hackathon', HackathonSchema);

module.exports = Hackathon;
module.exports.HackathonSchema = HackathonSchema;
