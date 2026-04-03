const Hackathon = require('../models/dataSchema');
const AllHackathons = require('../models/archiveSchema');
const User = require('../models/userSchema');

const buildArchivePayload = (record) => {
  const payload = typeof record.toObject === 'function' ? record.toObject() : { ...record };
  delete payload._id;
  delete payload.__v;
  return payload;
};

const syncArchiveByRoomId = async (roomId, updatePayload) => {
  const archivedHackathon = await AllHackathons.findOneAndUpdate(
    { roomId },
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!archivedHackathon) {
    throw new Error(`Archive sync failed for room ${roomId}.`);
  }

  return archivedHackathon;
};

const NEXT_PHASE_DEBOUNCE_MS = 1200;

const getCurrentPhaseDurationMs = (room) => {
  const currentPhase = room?.phases?.[room.currentPhaseIndex];
  const minutes = currentPhase?.durationMinutes || 0;
  return minutes > 0 ? minutes * 60000 : 0;
};

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
    const normalizedRoomId = req.params.roomId.toUpperCase();
    const { organizerSecret } = req.body;
    const flow = await Hackathon.findOne({ roomId: normalizedRoomId, isDeleted: false });
    if (!flow) return res.status(404).json({ error: "Flow not found." });
    if (flow.organizerSecret !== organizerSecret) return res.status(403).json({ error: "Unauthorized." });

    await Promise.all([
      Hackathon.findOneAndUpdate(
        { roomId: normalizedRoomId, isDeleted: false },
        { $set: { isDeleted: true } },
        { new: true, runValidators: true }
      ),
      syncArchiveByRoomId(normalizedRoomId, { isDeleted: true })
    ]);

    // If this was the active room for the user, clear it
    await User.findOneAndUpdate({ email: organizerSecret, activeRoomId: normalizedRoomId }, { activeRoomId: null });

    res.status(200).json({ message: "Flow deleted successfully." });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateFlow = async (req, res) => {
  try {
    const normalizedRoomId = req.params.roomId.toUpperCase();
    const { name, organizerSecret, eventStartTime, eventEndTime, timezone, branding, phases } = req.body;

    const flow = await Hackathon.findOne({ roomId: normalizedRoomId, isDeleted: false });
    if (!flow) return res.status(404).json({ error: "Flow not found." });
    if (flow.organizerSecret !== organizerSecret) return res.status(403).json({ error: "Unauthorized." });

    const updatePayload = {
      name: name || flow.name,
      eventStartTime: eventStartTime || flow.eventStartTime,
      eventEndTime: eventEndTime || flow.eventEndTime,
      timezone: timezone || flow.timezone,
      branding: branding || flow.branding,
      phases: phases || flow.phases
    };

    // If the active phase duration is edited, refresh the active timer baseline.
    if (phases && Array.isArray(phases) && phases[flow.currentPhaseIndex]) {
      const updatedCurrentPhase = phases[flow.currentPhaseIndex];
      const nextDurationMs = (updatedCurrentPhase.durationMinutes || 0) * 60000;

      if (nextDurationMs > 0 && flow.status === 'RUNNING') {
        updatePayload.phaseEndTime = new Date(Date.now() + nextDurationMs);
      }

      if (nextDurationMs > 0 && flow.status === 'PAUSED') {
        updatePayload.pausedRemainingMs = nextDurationMs;
      }
    }

    const [updatedFlow] = await Promise.all([
      Hackathon.findOneAndUpdate(
        { roomId: normalizedRoomId, isDeleted: false },
        { $set: updatePayload },
        { new: true, runValidators: true }
      ),
      syncArchiveByRoomId(normalizedRoomId, updatePayload)
    ]);

    res.status(200).json({ message: "Flow updated successfully.", roomId: updatedFlow.roomId });
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

    if (action === 'NEXT_PHASE') {
      const now = Date.now();
      const lastActionAt = room.lastControlActionAt ? room.lastControlActionAt.getTime() : 0;
      const isRapidDuplicate = room.lastControlAction === 'NEXT_PHASE' && now - lastActionAt < NEXT_PHASE_DEBOUNCE_MS;

      if (isRapidDuplicate) {
        return res.status(429).json({ error: 'Duplicate NEXT_PHASE request ignored. Please wait and retry.' });
      }
    }

    if (action === 'PAUSE' && room.status === 'RUNNING') {
      const fallbackDurationMs = getCurrentPhaseDurationMs(room);
      const phaseDistance = room.phaseEndTime ? room.phaseEndTime.getTime() - Date.now() : 0;
      room.pausedRemainingMs = phaseDistance > 0 ? phaseDistance : fallbackDurationMs;
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
        const fallbackDurationMs = getCurrentPhaseDurationMs(room);
        const resumeDurationMs = room.pausedRemainingMs > 0 ? room.pausedRemainingMs : fallbackDurationMs;
        room.phaseEndTime = new Date(Date.now() + resumeDurationMs);
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
    else if (action === 'RECALCULATE') {
      const fallbackDurationMs = getCurrentPhaseDurationMs(room);

      if (!fallbackDurationMs) {
        return res.status(400).json({ error: 'Cannot recalculate timer for an empty or invalid current phase.' });
      }

      if (room.status === 'RUNNING') {
        room.phaseEndTime = new Date(Date.now() + fallbackDurationMs);
        room.pausedRemainingMs = null;
      } else if (room.status === 'PAUSED') {
        room.pausedRemainingMs = fallbackDurationMs;
        room.phaseEndTime = null;
      } else if (room.status === 'DRAFT') {
        room.pausedRemainingMs = fallbackDurationMs;
        room.phaseEndTime = null;
        room.status = 'PAUSED';
      } else {
        return res.status(400).json({ error: 'Cannot recalculate timer for a completed room.' });
      }
    }

    if (['PAUSE', 'RESUME', 'NEXT_PHASE', 'STOP', 'ANNOUNCE', 'RECALCULATE'].includes(action)) {
      room.lastControlAction = action;
      room.lastControlActionAt = new Date();
    }

    await room.save();
    await syncArchiveByRoomId(room.roomId, buildArchivePayload(room));
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
      await syncArchiveByRoomId(room.roomId, buildArchivePayload(room));
    }
    res.status(200).json({ message: "Joined successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { deployFlow, getAllFlows, deleteFlow, updateFlow, getRoomData, updateRoomState, joinRoom };
