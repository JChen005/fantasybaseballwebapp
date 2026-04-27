const mongoose = require('mongoose');

const draftedPlayerSchema = new mongoose.Schema(
  {
    playerId: {
      type: Number,
      required: true,
      trim: true,
    },
    playerName: {
      type: String,
      trim: true,
      default: '',
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['DRAFTED', 'KEEPER', 'MINOR', 'TAXI'],
      required: true,
    },
    countsAgainstBudget: {
      type: Boolean,
      default: true,
    },
    assignedSlot: {
      type: String,
      default: '',
      trim: true,
    },
    assignedSlots: {
      type: [String],
      default: [],
    },
    contract: {
      type: String,
      enum: ['F3', 'F2', 'F1', 'S3', 'S2', 'S1', 'X', 'LX'],
      default: 'S1'
    },
    taxiSlot: {
      type: Number,
      default: null
    }
  },
  { _id: false }
);

const teamDraftStateSchema = new mongoose.Schema(
  {
    teamKey: {
      type: String,
      required: true,
      trim: true,
    },
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
      default: 260,
    },
    spentBudget: {
      type: Number,
      min: 0,
      default: 0,
    },
    filledSlots: {
      type: Map,
      of: Number,
      default: {},
    },
    players: {
      type: [draftedPlayerSchema],
      default: [],
    },
  },
  { _id: false }
);

const draftPickSchema = new mongoose.Schema(
  {
    pickNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    round: {
      type: Number,
      min: 0,
      default: 1,
    },
    teamKey: {
      type: String,
      required: true,
      trim: true,
    },
    playerId: {
      type: String,
      required: true,
      trim: true,
    },
    playerName: {
      type: String,
      trim: true,
      default: '',
    },
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['DRAFTED', 'KEEPER', 'MINOR', 'TAXI'],
      default: 'DRAFTED',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const draftStateSchema = new mongoose.Schema(
  {
    leagueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'League',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userTeamKey: {
      type: String,
      trim: true,
      default: '',
    },
    nominationTeamKey: {
      type: String,
      trim: true,
      default: '',
    },
    currentPickNumber: {
      type: Number,
      min: 1,
      default: 1,
    },
    teams: {
      // Canonical current draft state. Valuations derive from team rosters, not pick history.
      type: [teamDraftStateSchema],
      default: [],
    },
    picks: {
      // Optional append-only draft history/audit log.
      type: [draftPickSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

draftStateSchema.index({ leagueId: 1, ownerId: 1 }, { unique: true });

module.exports = mongoose.model('DraftState', draftStateSchema);
