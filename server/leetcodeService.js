const LEETCODE_URL = 'https://leetcode.com/graphql';
const debugBadges = (username, badges) => {
  if (process.env.LEETCLASS_DEBUG !== 'true') return;
  const sample = (badges || []).map(badge => ({ id: badge.id || null, name: badge.displayName || null, hasImage: Boolean(badge.icon) }));
  console.info(`[LeetClass] ${username}: received ${sample.length} LeetCode badge(s)`, sample);
};

function usernameFrom(value) {
  const input = String(value || '').trim();
  const match = input.match(/^https?:\/\/(?:www\.)?leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i);
  if (!match) throw new Error('Please enter a valid LeetCode profile URL.');
  return match[1];
}

async function fetchProfile(profileUrl) {
  const username = usernameFrom(profileUrl);
  const query = `query userProfile($username: String!) {
    matchedUser(username: $username) {
      username profile { ranking userAvatar }
      badges { id displayName icon creationDate category }
      submitStatsGlobal { acSubmissionNum { difficulty count submissions } }
    }
    userContestRanking(username: $username) { rating globalRanking }
  }`;
  let response;
  try {
    response = await fetch(LEETCODE_URL, {
      method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'LeetClass/1.0' },
      body: JSON.stringify({ query, variables: { username } }), signal: AbortSignal.timeout(12000)
    });
  } catch { throw new Error('LeetCode is currently unavailable. Please try again shortly.'); }
  if (!response.ok) throw new Error('LeetCode could not load this profile. Please try again shortly.');
  const payload = await response.json();
  if (payload?.errors?.length) {
    const message = payload.errors.map(error => error.message).join('; ');
    throw new Error(`LeetCode returned an incomplete profile response: ${message}`);
  }
  const user = payload?.data?.matchedUser;
  if (!user) throw new Error('We could not find that LeetCode profile.');
  debugBadges(user.username, user.badges);
  const stats = Object.fromEntries((user.submitStatsGlobal?.acSubmissionNum || []).map(item => [item.difficulty, item]));
  const total = stats.All?.count || 0;
  return {
    username: user.username, avatar: user.profile?.userAvatar || '', totalSolved: total,
    easySolved: stats.Easy?.count || 0, mediumSolved: stats.Medium?.count || 0, hardSolved: stats.Hard?.count || 0,
    totalSubmissions: stats.All?.submissions ?? null, acceptanceRate: null, activeDays: null,
    badges: Array.isArray(user.badges) ? user.badges.filter(badge => badge?.displayName).map(badge => ({
      id: badge.id || null, name: badge.displayName, image: badge.icon || null,
      earnedDate: badge.creationDate || null, category: badge.category || null
    })) : null,
    contestRating: userContestRating(payload?.data?.userContestRanking?.rating),
    ranking: user.profile?.ranking || null, contestRanking: payload?.data?.userContestRanking?.globalRanking || null
  };
}
function userContestRating(value) { return typeof value === 'number' ? Math.round(value) : null; }
module.exports = { usernameFrom, fetchProfile };
