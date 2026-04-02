const mongoose = require('mongoose');
const { HackathonSchema } = require('./dataSchema');

const ArchiveHackathonSchema = HackathonSchema.clone();

ArchiveHackathonSchema.set('collection', 'AllHackathons');

const blockArchiveMutations = function blockArchiveMutations(next) {
  next(new Error('AllHackathons blocks hard deletes and replacements.'));
};

ArchiveHackathonSchema.pre('deleteOne', { document: true, query: false }, blockArchiveMutations);
ArchiveHackathonSchema.pre('deleteMany', blockArchiveMutations);
ArchiveHackathonSchema.pre('findOneAndDelete', blockArchiveMutations);
ArchiveHackathonSchema.pre('findOneAndReplace', blockArchiveMutations);
ArchiveHackathonSchema.pre('replaceOne', blockArchiveMutations);

module.exports = mongoose.models.AllHackathons || mongoose.model('AllHackathons', ArchiveHackathonSchema);
