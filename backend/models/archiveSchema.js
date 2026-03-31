const mongoose = require('mongoose');
const Hackathon = require('./dataSchema');

const ArchiveHackathonSchema = Hackathon.schema.clone();

ArchiveHackathonSchema.set('collection', 'AllHackathons');

const blockArchiveMutations = function blockArchiveMutations(next) {
  next(new Error('AllHackathons is append-only.'));
};

ArchiveHackathonSchema.pre('deleteOne', { document: true, query: false }, blockArchiveMutations);
ArchiveHackathonSchema.pre('deleteMany', blockArchiveMutations);
ArchiveHackathonSchema.pre('findOneAndDelete', blockArchiveMutations);
ArchiveHackathonSchema.pre('findOneAndReplace', blockArchiveMutations);
ArchiveHackathonSchema.pre('findOneAndUpdate', blockArchiveMutations);
ArchiveHackathonSchema.pre('replaceOne', blockArchiveMutations);
ArchiveHackathonSchema.pre('updateOne', blockArchiveMutations);
ArchiveHackathonSchema.pre('updateMany', blockArchiveMutations);

module.exports = mongoose.models.AllHackathons || mongoose.model('AllHackathons', ArchiveHackathonSchema);
