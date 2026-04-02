const Hackathon = require('../models/dataSchema');
const AllHackathons = require('../models/archiveSchema');
const User = require('../models/userSchema');

const deployFlow = async (req, res) => {
  try {
    const { name, organizerSecret, eventStartTime, eventEndTime, timezone, branding, phases, status } = req.body;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const isDraft = status === 'DRAFT';
    let phaseEndTime = null;
    
    if (!isDraft) {
      const firstPhaseDuration = phases[0]?.durationMinutes || 60;
      phaseEndTime = new Date(Date.now() + firstPhaseDuration * 60000);
    }

    const hackathonPayload = {
      roomId, name, organizerSecret, eventStartTime, eventEndTime, timezone, branding, phases,
      status: isDraft ? 'DRAFT' : 'RUNNING', 
      currentPhaseIndex: 0, 
      phaseEndTime
    };

    await Promise.all([
      new Hackathon(hackathonPayload).save(),
      new AllHackathons(hackathonPayload).save()
    ]);
    
    // Only set as active room if it's NOT a draft
    if (organizerSecret && !isDraft) {
      await User.findOneAndUpdate({ email: organizerSecret }, { activeRoomId: roomId });
    }
    
    res.status(201).json({ roomId, message: isDraft ? "Draft saved successfully." : "Flow deployed successfully." });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAllFlows = async (req, res) => {
  try {
    const { organizerSecret } = req.query;
    if (!organizerSecret) return res.status(400).json({ error: "Missing organizerSecret." });
    const flows = await Hackathon.find({ organizerSecret, isDeleted: false }).sort({ createdAt: -1 });
    res.status(200).json(flows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const deleteFlow = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { organizerSecret } = req.body;
    const flow = await Hackathon.findOne({ roomId: roomId.toUpperCase(), isDeleted: false });
    if (!flow) return res.status(404).json({ error: "Flow not found." });
    if (flow.organizerSecret !== organizerSecret) return res.status(403).json({ error: "Unauthorized." });
    
    await Hackathon.findByIdAndUpdate(flow._id, { isDeleted: true });
    
    // If this was the active room for the user, clear it
    await User.findOneAndUpdate({ email: organizerSecret, activeRoomId: roomId.toUpperCase() }, { activeRoomId: null });
    
    res.status(200).json({ message: "Flow deleted successfully." });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateFlow = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, organizerSecret, eventStartTime, eventEndTime, timezone, branding, phases } = req.body;
    
    const flow = await Hackathon.findOne({ roomId: roomId.toUpperCase(), isDeleted: false });
    if (!flow) return res.status(404).json({ error: "Flow not found." });
    if (flow.organizerSecret !== organizerSecret) return res.status(403).json({ error: "Unauthorized." });

    flow.name = name || flow.name;
    flow.eventStartTime = eventStartTime || flow.eventStartTime;
    flow.eventEndTime = eventEndTime || flow.eventEndTime;
    flow.timezone = timezone || flow.timezone;
    flow.branding = branding || flow.branding;
    flow.phases = phases || flow.phases;

    await flow.save();
    res.status(200).json({ message: "Flow updated successfully.", roomId: flow.roomId });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getRoomData = async (req, res) => {
  try {
    const { roomId } = req.params;
    const hackathon = await Hackathon.findOne({ roomId: roomId.toUpperCase(), isDeleted: false });
    if (!hackathon) return res.status(404).json({ error: "Room not found." });
    res.status(200).json(hackathon);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateRoomState = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { action, organizerSecret, announcementText, announcementDuration } = req.body;
    
    const room = await Hackathon.findOne({ roomId: roomId.toUpperCase(), isDeleted: false });
    if (!room) return res.status(404).json({ error: "Room not found." });
    if (room.organizerSecret !== organizerSecret) return res.status(403).json({ error: "SECURITY FAULT: Unauthorized." });

    if (action === 'PAUSE' && room.status === 'RUNNING') {
      room.pausedRemainingMs = room.phaseEndTime.getTime() - Date.now();
      room.phaseEndTime = null;
      room.status = 'PAUSED';
    } 
    else if (action === 'RESUME' && (room.status === 'PAUSED' || room.status === 'DRAFT')) {
      if (room.status === 'DRAFT') {
        const duration = room.phases[room.currentPhaseIndex]?.durationMinutes || 60;
        room.phaseEndTime = new Date(Date.now() + duration * 60000);
        // Also update the user's activeRoomId if it's their first time launching
        await User.findOneAndUpdate({ email: organizerSecret }, { activeRoomId: roomId.toUpperCase() });
      } else {
        room.phaseEndTime = new Date(Date.now() + room.pausedRemainingMs);
      }
      room.pausedRemainingMs = null;
      room.status = 'RUNNING';
    } 
    else if (action === 'NEXT_PHASE') {
      room.currentPhaseIndex += 1;
      if (room.currentPhaseIndex >= room.phases.length) {
        room.status = 'COMPLETED';
        room.phaseEndTime = null;
      } else {
        const nextDuration = room.phases[room.currentPhaseIndex].durationMinutes;
        room.phaseEndTime = new Date(Date.now() + nextDuration * 60000);
        room.status = 'RUNNING';
        room.pausedRemainingMs = null;
      }
    }
    else if (action === 'STOP') {
      room.status = 'COMPLETED';
      room.phaseEndTime = null;
      room.pausedRemainingMs = null;
    }
    // NEW: Handle Broadcast Overrides
    else if (action === 'ANNOUNCE') {
      room.announcement = announcementText || "";
      room.announcementDuration = announcementDuration || 10;
      room.announcementTimestamp = new Date(); // Logs the exact moment of broadcast
    }

    await room.save();
    res.status(200).json(room);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { teamName } = req.body;
    const room = await Hackathon.findOne({ roomId: roomId.toUpperCase(), isDeleted: false });
    if (!room) return res.status(404).json({ error: "Room not found." });
    if (!room.participants.some(p => p.teamName === teamName)) {
       room.participants.push({ teamName });
       await room.save();
    }
    res.status(200).json({ message: "Joined successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { deployFlow, getAllFlows, deleteFlow, updateFlow, getRoomData, updateRoomState, joinRoom };
