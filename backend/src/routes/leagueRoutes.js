const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  validateObjectId,
  validateLeagueName,
  validateLeagueConfigPayload,
  validateDraftStatePayload,
} = require("../validators/leagueValidators");
const {
  listLeaguesForUser,
  getLeagueForUser,
  createLeagueForUser,
  deleteLeagueForUser,
  updateLeagueConfigForUser,
  getOrCreateDraftStateForLeague,
  updateDraftStateForLeague,
} = require("../services/leagueService");

const router = express.Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const leagues = await listLeaguesForUser(req.userId);
    res.json({ leagues });
  }),
);

router.get(
  "/:leagueId",
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, "league ID");
    const league = await getLeagueForUser(leagueId, req.userId);
    res.json({ league });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const name = validateLeagueName(req.body?.name);
    const league = await createLeagueForUser(req.userId, name);
    res.status(201).json({ league });
  }),
);

router.post(
  "/:leagueId",
  asyncHandler(async (req, res) => {  
    const { leagueId } = req.params;
    validateObjectId(leagueId, "league ID");
    const league = await getLeagueForUser(leagueId, req.userId);
    const newLeague = req.body;
    Object.assign(league.config, newLeague);
    await league.save();
    await getOrCreateDraftStateForLeague(leagueId, req.userId);
    res.send()
  }))


router.delete(
  "/:leagueId",
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, "league ID");
    await deleteLeagueForUser(leagueId, req.userId);
    res.status(204).send();
  }),
);

router.put(
  "/:leagueId",
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, "league ID");
    const payload = validateLeagueConfigPayload(req.body || {});
    const league = await updateLeagueConfigForUser(leagueId, req.userId, payload);
    res.json({ league });
  }),
);

router.get(
  "/:leagueId/draft-state",
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, "league ID");
    const draftState = await getOrCreateDraftStateForLeague(leagueId, req.userId);
    res.json({ draftState });
  }),
);

router.put(
  "/:leagueId/draft-state",
  asyncHandler(async (req, res) => {
    const { leagueId } = req.params;
    validateObjectId(leagueId, "league ID");
    const payload = validateDraftStatePayload(req.body || {});
    const draftState = await updateDraftStateForLeague(leagueId, req.userId, payload);
    res.json({ draftState });
  }),
);


module.exports = router;