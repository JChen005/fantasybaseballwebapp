const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/appError');
const {
  validateObjectId,
  validateLeagueName,
  validateLeagueConfigPayload,
  validateDraftStatePayload,
} = require('../validators/leagueValidators');
const {
  listLeaguesForUser,
  getLeagueForUser,
  createLeagueWithConfigForUser,
  deleteLeagueForUser,
  updateLeagueConfigForUser,
  getOrCreateDraftStateForLeague,
  updateDraftStateForLeague,
} = require('../services/leagueService');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const leagues = await listLeaguesForUser(req.userId);
    res.json({ leagues });
  })
);

router.get(
  '/:leagueId',
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, 'league ID');
    const league = await getLeagueForUser(leagueId, req.userId);
    res.json({ league });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = validateLeagueName(req.body?.name);
    const season = req.body?.season == null || req.body.season === ''
      ? undefined
      : Number(req.body.season);
    if (season !== undefined && (!Number.isInteger(season) || season < 1901 || season > 2100)) {
      throw new AppError('season must be a valid year', 400);
    }
    const league = await createLeagueWithConfigForUser(req.userId, {
      name,
      config: season ? { season } : undefined,
    });
    res.status(201).json({ league });
  })
);

router.delete(
  '/:leagueId',
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, 'league ID');
    await deleteLeagueForUser(leagueId, req.userId);
    res.status(204).send();
  })
);

router.put(
  '/:leagueId',
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, 'league ID');
    const payload = validateLeagueConfigPayload(req.body || {});
    const league = await updateLeagueConfigForUser(leagueId, req.userId, payload);
    res.json({ league });
  })
);

router.get(
  '/:leagueId/draft-state',
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, 'league ID');
    const draftState = await getOrCreateDraftStateForLeague(leagueId, req.userId);
    res.json({ draftState });
  })
);

router.put(
  '/:leagueId/draft-state',
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, 'league ID');
    const payload = validateDraftStatePayload(req.body || {});
    console.log(req.body.teams[0].players);
    const draftState = await updateDraftStateForLeague(leagueId, req.userId, payload);
    res.json({ draftState });
  })
);

router.post(
  '/:leagueId/player-notes',
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, 'league ID');

    const league = await getLeagueForUser(leagueId, req.userId);

    const incomingNote = req.body;
    const incomingPlayerId = String(incomingNote.playerId);

    league.playerNotes = (league.playerNotes || []).filter(
      (note) => String(note.playerId) !== incomingPlayerId
    );

    league.playerNotes.push(incomingNote);

    await league.save();
    res.send();
  })
);

module.exports = router;
