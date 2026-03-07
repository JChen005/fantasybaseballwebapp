const fs = require('fs');
const path = require('path');

const CSV_SOURCES = Object.freeze({
  lastYear: path.resolve(__dirname, '../../data/nl/2025-player-NL-stats.csv'),
  threeYear: path.resolve(__dirname, '../../data/nl/3Year-average-NL-stats.csv'),
  projections: path.resolve(__dirname, '../../data/nl/projections-NL.csv'),
});

const AL_TEAMS = new Set([
  'BAL',
  'BOS',
  'NYY',
  'TB',
  'TOR',
  'CHW',
  'CLE',
  'DET',
  'KC',
  'MIN',
  'HOU',
  'LAA',
  'ATH',
  'OAK',
  'SEA',
  'TEX',
]);

const POSITION_MAP = {
  U: 'UTIL',
  UT: 'UTIL',
  UTIL: 'UTIL',
  DH: 'UTIL',
  LF: 'OF',
  CF: 'OF',
  RF: 'OF',
  SP: 'P',
  RP: 'P',
};

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toNumber(rawValue, label) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value for ${label}: "${rawValue}"`);
  }
  return value;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsvFile(filePath, sourceLabel) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required CSV not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error(`CSV has no data rows: ${filePath}`);
  }

  const headers = parseCsvLine(lines[0]).map((header, index) => {
    const normalized = normalizeWhitespace(header).replace(/^\uFEFF/, '');
    return normalized || `col_${index}`;
  });

  return lines.slice(1).map((line, index) => {
    const rowNumber = index + 2;
    const values = parseCsvLine(line);
    if (values.length !== headers.length) {
      throw new Error(
        `Malformed CSV row at ${filePath}:${rowNumber}. Expected ${headers.length} fields, got ${values.length}.`
      );
    }

    const row = {
      __rowNumber: rowNumber,
      __source: sourceLabel,
    };

    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = values[i];
    }

    return row;
  });
}

function normalizePosition(position) {
  const token = normalizeWhitespace(position).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!token) return '';
  return POSITION_MAP[token] || token;
}

function parsePlayerDescriptor(rawPlayer, sourceLabel, rowNumber) {
  const normalized = normalizeWhitespace(rawPlayer);
  if (!normalized) {
    throw new Error(`Missing player descriptor at ${sourceLabel}:${rowNumber}`);
  }

  const [rawIdentity = '', rawTeam = '', ...extra] = normalized.split('|');
  if (extra.length > 0) {
    throw new Error(`Unexpected player descriptor format at ${sourceLabel}:${rowNumber} (${normalized})`);
  }

  const identity = normalizeWhitespace(rawIdentity);
  const team = normalizeWhitespace(rawTeam).split(' ')[0].toUpperCase();
  if (!identity || !team) {
    throw new Error(`Invalid player descriptor at ${sourceLabel}:${rowNumber} (${normalized})`);
  }

  const match = identity.match(/^(.*)\s+([A-Z0-9,\/]+)$/);
  if (!match) {
    throw new Error(`Unable to parse name/positions at ${sourceLabel}:${rowNumber} (${identity})`);
  }

  const name = normalizeWhitespace(match[1]);
  const positions = normalizeWhitespace(match[2])
    .split(/[\/,]/)
    .map(normalizePosition)
    .filter(Boolean);

  if (!name || positions.length === 0) {
    throw new Error(`Invalid player descriptor at ${sourceLabel}:${rowNumber} (${normalized})`);
  }

  return {
    name,
    team,
    positions,
  };
}

function buildStatsFromRow(row) {
  return {
    hr: toNumber(row.HR, 'HR'),
    rbi: toNumber(row.RBI, 'RBI'),
    sb: toNumber(row.SB, 'SB'),
    avg: Number(toNumber(row.AVG, 'AVG').toFixed(3)),
    w: 0,
    k: toNumber(row.K, 'K'),
    era: 0,
    whip: 0,
  };
}

function toLeague(team) {
  return AL_TEAMS.has(team) ? 'AL' : 'NL';
}

function toBaseValue(projectionFpts) {
  const raw = toNumber(projectionFpts, 'FPTS');
  return Number(Math.max(1, raw / 20).toFixed(2));
}

function toSourcePlayerKey(descriptorKey, projectionRow) {
  const normalizedDescriptorKey = normalizeWhitespace(descriptorKey);
  if (!normalizedDescriptorKey) {
    throw new Error('Cannot build source player key without descriptor key');
  }
  return `${normalizedDescriptorKey}::row:${projectionRow.__rowNumber}`;
}

function buildTransactions(player, index) {
  const month = String((index % 12) + 1).padStart(2, '0');
  return [
    {
      date: `2025-${month}-12`,
      type: 'Data Import',
      detail: `${player.name} seeded from NL CSV player datasets.`,
    },
  ];
}

function groupRowsByPlayerDescriptor(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const descriptorKey = normalizeWhitespace(row.Player);
    if (!descriptorKey) {
      throw new Error(`Missing Player column value in ${row.__source}:${row.__rowNumber}`);
    }

    if (!grouped.has(descriptorKey)) {
      grouped.set(descriptorKey, []);
    }
    grouped.get(descriptorKey).push(row);
  }
  return grouped;
}

function sortGroupRows(rows) {
  return [...rows].sort((a, b) => {
    const byFpts = toNumber(b.FPTS, 'FPTS') - toNumber(a.FPTS, 'FPTS');
    if (byFpts !== 0) return byFpts;
    return a.__rowNumber - b.__rowNumber;
  });
}

function loadCsvSeedPlayers() {
  const lastYearRows = parseCsvFile(CSV_SOURCES.lastYear, 'lastYear');
  const threeYearRows = parseCsvFile(CSV_SOURCES.threeYear, 'threeYear');
  const projectionRows = parseCsvFile(CSV_SOURCES.projections, 'projections');

  const grouped = {
    lastYear: groupRowsByPlayerDescriptor(lastYearRows),
    threeYear: groupRowsByPlayerDescriptor(threeYearRows),
    projections: groupRowsByPlayerDescriptor(projectionRows),
  };

  const allDescriptorKeys = new Set([
    ...grouped.lastYear.keys(),
    ...grouped.threeYear.keys(),
    ...grouped.projections.keys(),
  ]);

  const rawPlayers = [];

  for (const descriptorKey of allDescriptorKeys) {
    const sourceRows = {
      lastYear: grouped.lastYear.get(descriptorKey) || [],
      threeYear: grouped.threeYear.get(descriptorKey) || [],
      projections: grouped.projections.get(descriptorKey) || [],
    };

    if (!sourceRows.lastYear.length || !sourceRows.threeYear.length || !sourceRows.projections.length) {
      throw new Error(`CSV sources are misaligned for descriptor "${descriptorKey}"`);
    }

    if (
      sourceRows.lastYear.length !== sourceRows.threeYear.length ||
      sourceRows.lastYear.length !== sourceRows.projections.length
    ) {
      throw new Error(`CSV sources have duplicate-count mismatch for descriptor "${descriptorKey}"`);
    }

    const descriptor = parsePlayerDescriptor(
      descriptorKey,
      sourceRows.projections[0].__source,
      sourceRows.projections[0].__rowNumber
    );

    const lastYearSorted = sortGroupRows(sourceRows.lastYear);
    const threeYearSorted = sortGroupRows(sourceRows.threeYear);
    const projectionSorted = sortGroupRows(sourceRows.projections);
    const count = sourceRows.projections.length;

    for (let i = 0; i < count; i += 1) {
      const positions = descriptor.positions.length > 0 ? descriptor.positions : ['UTIL'];
      const projectionFpts = toNumber(projectionSorted[i].FPTS, 'FPTS');
      const canonicalName = descriptor.name;
      const playerName = count > 1 ? `${canonicalName} (${i + 1})` : canonicalName;
      const sourcePlayerKey = toSourcePlayerKey(descriptorKey, projectionSorted[i]);

      rawPlayers.push({
        name: playerName,
        canonicalName,
        sourcePlayerKey,
        team: descriptor.team,
        mlbLeague: toLeague(descriptor.team),
        positions,
        eligibility: positions,
        injuryStatus: 'HEALTHY',
        depthRole: 'STARTER',
        statsLastYear: buildStatsFromRow(lastYearSorted[i]),
        stats3Year: buildStatsFromRow(threeYearSorted[i]),
        statsProjection: buildStatsFromRow(projectionSorted[i]),
        baseValue: toBaseValue(projectionFpts),
        isCustom: false,
        isDrafted: false,
      });
    }
  }

  if (rawPlayers.length === 0) {
    throw new Error('No seed players were produced from CSV sources.');
  }

  const sortedPlayers = rawPlayers.sort(
    (a, b) => b.baseValue - a.baseValue || a.canonicalName.localeCompare(b.canonicalName) || a.name.localeCompare(b.name)
  );
  return sortedPlayers.map((player, index) => ({
    ...player,
    transactions: buildTransactions(player, index),
  }));
}

module.exports = {
  loadCsvSeedPlayers,
  CSV_SOURCES,
};
