"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { draftkitApi } from "lib/draftkitApi";
import SideBar from "components/sidebar";

const defaultConfig = {
  rosterSlots: {
    C: 1,
    B1: 1,
    B2: 1,
    B3: 1,
    SS: 1,
    OF: 3,
    UTIL: 1,
    P: 9,
    BN: 3,
  },
  leagueType: "MIXED",
  budget: 260,
  scoring: "CATEGORY",
  teamNames: [
    "My Team",
    "Bob's Team",
    "Carl's Team",
    "Don's Team",
    "Ed's Team",
  ],
};

export default function Page({ params }) {
  const { leagueId } = useParams();
  const [config, setConfig] = useState(defaultConfig);

  const updateRosterSlot = (slot, value) => {
    setConfig((prev) => ({
      ...prev,
      rosterSlots: {
        ...prev.rosterSlots,
        [slot]: Number(value),
      },
    }));
  };

  const updateField = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: field === "budget" ? Number(value) : value,
    }));
  };

  const updateTeamName = (index, value) => {
    setConfig((prev) => {
      const nextTeamNames = [...prev.teamNames];
      nextTeamNames[index] = value;
      return {
        ...prev,
        teamNames: nextTeamNames,
      };
    });
  };

  const addTeam = () => {
    setConfig((prev) => ({
      ...prev,
      teamNames: [...prev.teamNames, ""],
    }));
  };

  const removeTeam = (index) => {
    setConfig((prev) => ({
      ...prev,
      teamNames: prev.teamNames.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let configuration = {
      ...config,
      teamNames: config.teamNames.filter((t) => t.trim() !== ""),
    };
    draftkitApi.updateLeague(leagueId, configuration);
  };

  return (
    <div>
      <SideBar />
      <div className="panel mb-5">
        <h1 className="text-lg font-bold">Configuration</h1>
      </div>
      <form onSubmit={handleSubmit} className="panel space-y-6">
        <h2 className="text-lg font-semibold">League Settings</h2>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">League Type</span>
            <select
              className="select select-bordered select-sm"
              value={config.leagueType}
              onChange={(e) => updateField("leagueType", e.target.value)}
            >
              <option value="MIXED">MIXED</option>
              <option value="AL">AL</option>
              <option value="NL">NL</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Budget</span>
            <input
              type="number"
              min="0"
              className="input input-bordered input-sm w-20 text-center"
              value={config.budget}
              onChange={(e) => updateField("budget", e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Scoring</span>
            <select
              className="select select-bordered select-sm"
              value={config.scoring}
              onChange={(e) => updateField("scoring", e.target.value)}
            >
              <option value="CATEGORY">CATEGORY</option>
              <option value="POINTS">POINTS</option>
              <option value="ROTO">ROTO</option>
            </select>
          </label>
        </div>

        <h2 className="text-lg font-semibold">Roster Slots</h2>

        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(config.rosterSlots).map(([slot, value]) => (
            <label key={slot} className="flex items-center gap-2">
              <span className="w-10 text-sm font-medium">{slot}</span>
              <input
                type="number"
                min="0"
                className="input input-bordered input-sm w-14 px-1 text-center"
                value={value}
                onChange={(e) => updateRosterSlot(slot, e.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Team Names</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={addTeam}
          >
            Add Team
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {config.teamNames.map((teamName, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-8 text-sm text-slate-600">{index + 1}.</span>
              <input
                type="text"
                className="input input-bordered input-sm flex-1"
                value={teamName}
                onChange={(e) => updateTeamName(index, e.target.value)}
                placeholder={`Team ${index + 1}`}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => removeTeam(index)}
                disabled={config.teamNames.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm">
            Save Config
          </button>
        </div>
      </form>
    </div>
  );
}
