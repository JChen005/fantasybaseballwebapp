const mongoose = require('mongoose');

const leagueTeamSchema = new mongoose.Schema(
  {
    teamKey: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true, default: '' },
    teamName: { type: String, required: true, trim: true, default: '' },
    budget: { type: Number, required: true, min: 0, default: 260 },
  },
  { _id: false }
);

const leagueSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'My League',
    },
    config: {
      leagueType: {
        type: String,
        enum: ['AL', 'NL', 'MIXED'],
        default: 'MIXED',
      },
      budget: {
        type: Number,
        default: 260,
      },
      rosterSlots: {
        C: { type: Number, default: 2 },
        B1: { type: Number, default: 1 },
        B2: { type: Number, default: 1 },
        B3: { type: Number, default: 1 },
        SS: { type: Number, default: 1 },
        OF: { type: Number, default: 1 },
        UTIL: { type: Number, default: 1 },
        P: { type: Number, default: 5 },
        BN: { type: Number, default: 1 },
      },
      scoring: {
        type: String,
        enum: ['CATEGORY', 'POINTS'],
        default: 'CATEGORY',
      },
      teamCount: {
        type: Number,
        default: 5,
        min: 1,
      },
      teamNames: {
        type: [String],
        default: ['My Team', "Bob's Team", "Carl's Team", "Don's Team", "Ed's Team"],
      },
      teams: {
        type: [leagueTeamSchema],
        default: [],
      },
      userTeamKey: {
        type: String,
        trim: true,
        default: 'team-1',
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = mongoose.model('League', leagueSchema);
