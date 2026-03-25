/**
 *
 * @param {*} value - A value that can be a JSON string or an array representing stored user IDs (e.g., from giveaway winners or winner history)
 * @returns New array of unique user IDs parsed from the input value, which can be a JSON string or an array. The function ensures that all user IDs are strings and filters out any falsy values.
 */
function parseStoredUserIds(value) {
  if (!value) return [];

  try {
    const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsedValue)) return [];

    return [...new Set(parsedValue.map((userId) => String(userId)).filter(Boolean))];
  } catch {
    return [];
  }
}

/**
 *
 * @param {*} existingWinnerIds - An array of existing winner user IDs (e.g., from previous winners or winner history)
 * @param {*} newWinnerIds - An array of new winner user IDs to merge with the existing winner history
 * @returns New array combining existing and new winner IDs, ensuring uniqueness and filtering out any falsy values
 */
function mergeWinnerHistory(existingWinnerIds, newWinnerIds) {
  return [...new Set([...existingWinnerIds, ...newWinnerIds].map((userId) => String(userId)).filter(Boolean))];
}

/**
 *
 * @param {*} entryUserIds - An array of user IDs representing all entries for the giveaway
 * @param {*} excludedUserIds - User IDs to exclude from winning (e.g., previous winners)
 * @param {*} requestedWinnerCount - The number of winners to select
 * @returns {Object} containing the count of eligible entries and an array of selected winner user IDs
 */
function selectGiveawayWinners(entryUserIds, excludedUserIds, requestedWinnerCount) {
  const excludedIds = new Set(excludedUserIds.map((userId) => String(userId)));
  const eligibleEntries = [...new Set(entryUserIds.map((userId) => String(userId)).filter(Boolean))].filter(
    (userId) => !excludedIds.has(userId),
  );
  const winners = [];
  const winnerCount = Math.max(0, Math.min(requestedWinnerCount, eligibleEntries.length));

  while (winners.length < winnerCount && eligibleEntries.length > 0) {
    const randomIndex = Math.floor(Math.random() * eligibleEntries.length);
    winners.push(eligibleEntries.splice(randomIndex, 1)[0]);
  }

  return {
    eligibleEntryCount: eligibleEntries.length + winners.length,
    winners,
  };
}

module.exports = {
  mergeWinnerHistory,
  parseStoredUserIds,
  selectGiveawayWinners,
};
