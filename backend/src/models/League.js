const mongoose = require('mongoose');

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
        "1B": { type: Number, default: 1 },
        "3B": { type: Number, default: 1 },
        CI: { type: Number, default: 1 },
        "2B": { type: Number, default: 1 },
        SS: { type: Number, default: 1 },
        MI: { type: Number, default: 1 },
        OF: { type: Number, default: 5 },
        U: { type: Number, default: 1 },
        P: { type: Number, default: 9 },
      },
      scoring: {
        type: String,
        enum: ['CATEGORY', 'POINTS'],
        default: 'CATEGORY',
      },
      teamNames: {
        type: [String],
        default: ['My Team', "Bob's Team", "Carl's Team", "Don's Team", "Ed's Team"],
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = mongoose.model('League', leagueSchema);
