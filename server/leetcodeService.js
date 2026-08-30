const LEETCODE_URL = 'https://leetcode.com/graphql';

function usernameFrom(value) {
    const input = String(value || '').trim();

    const match = input.match(
        /^https?:\/\/(?:www\.)?leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i
    );

    if (!match) {
        throw new Error(
            'Please enter a valid LeetCode profile URL.'
        );
    }

    return match[1];
}

function todayInIndia() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function dateFromTimestamp(timestamp) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(Number(timestamp) * 1000));
}

async function fetchProfile(profileUrl) {
    const username = usernameFrom(profileUrl);

    const query = `
        query userProfile($username: String!) {

            matchedUser(username: $username) {

                username

                profile {
                    ranking
                    userAvatar
                }

                badges {
                    id
                    displayName
                    icon
                    creationDate
                    category
                }

                submissionCalendar

                submitStatsGlobal {

                    acSubmissionNum {
                        difficulty
                        count
                        submissions
                    }

                    totalSubmissionNum {
                        difficulty
                        count
                        submissions
                    }
                }
            }

            userContestRanking(username: $username) {
                rating
                globalRanking
            }
        }
    `;

    let response;

    try {
        response = await fetch(
            LEETCODE_URL,
            {
                method: 'POST',

                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 LeetClass/1.0'
                },

                body: JSON.stringify({
                    query,
                    variables: {
                        username
                    }
                }),

                signal: AbortSignal.timeout(15000)
            }
        );
    } catch (error) {
        console.error('LeetCode request failed:', error);

        throw new Error(
            'LeetCode is currently unavailable. Please try again shortly.'
        );
    }

    if (!response.ok) {
        throw new Error(
            'LeetCode could not load this profile.'
        );
    }

    const payload = await response.json();

    if (
        Array.isArray(payload?.errors) &&
        payload.errors.length
    ) {
        console.error(
            'LeetCode GraphQL errors:',
            payload.errors
        );

        throw new Error(
            'LeetCode returned an incomplete profile response.'
        );
    }

    const user = payload?.data?.matchedUser;

    if (!user) {
        throw new Error(
            'We could not find that LeetCode profile.'
        );
    }

    /* =========================
       ACCEPTED PROBLEMS
    ========================= */

    const acceptedStats =
        Object.fromEntries(
            (
                user.submitStatsGlobal?.acSubmissionNum || []
            ).map(item => [
                item.difficulty,
                item
            ])
        );

    /* =========================
       TOTAL SUBMISSIONS
    ========================= */

    const submissionStats =
        Object.fromEntries(
            (
                user.submitStatsGlobal?.totalSubmissionNum || []
            ).map(item => [
                item.difficulty,
                item
            ])
        );

    const allAccepted =
        acceptedStats.All || {};

    const easyAccepted =
        acceptedStats.Easy || {};

    const mediumAccepted =
        acceptedStats.Medium || {};

    const hardAccepted =
        acceptedStats.Hard || {};

    const allSubmissions =
        submissionStats.All || {};

    const totalSolved =
        Number(allAccepted.count || 0);

    const easySolved =
        Number(easyAccepted.count || 0);

    const mediumSolved =
        Number(mediumAccepted.count || 0);

    const hardSolved =
        Number(hardAccepted.count || 0);

    const totalAcceptedSubmissions =
        Number(allAccepted.submissions || 0);

    const totalSubmissions =
        Number(allSubmissions.submissions || 0);

    /* =========================
       ACCEPTANCE RATE
    ========================= */

    let acceptanceRate = null;

    if (
        totalSubmissions > 0 &&
        Number.isFinite(totalSubmissions)
    ) {
        acceptanceRate = Number(
            (
                (
                    totalAcceptedSubmissions /
                    totalSubmissions
                ) * 100
            ).toFixed(2)
        );
    }

    /* =========================
       ACTIVE TODAY
    ========================= */

    let activeToday = false;

    try {
        const calendar =
            typeof user.submissionCalendar === 'string'
                ? JSON.parse(user.submissionCalendar)
                : user.submissionCalendar;

        if (
            calendar &&
            typeof calendar === 'object'
        ) {
            const today = todayInIndia();

            for (const [timestamp, count] of Object.entries(calendar)) {

                if (
                    Number(count) > 0 &&
                    dateFromTimestamp(timestamp) === today
                ) {
                    activeToday = true;
                    break;
                }
            }
        }
    } catch (error) {
        console.error(
            'Could not read submission calendar:',
            error
        );
    }

    /* =========================
       BADGES
    ========================= */

    const badges =
        Array.isArray(user.badges)
            ? user.badges
                .filter(
                    badge =>
                        badge &&
                        badge.displayName
                )
                .map(
                    badge => ({
                        id:
                            badge.id || null,

                        name:
                            badge.displayName,

                        image:
                            badge.icon || null,

                        earnedDate:
                            badge.creationDate ||
                            null,

                        category:
                            badge.category ||
                            null
                    })
                )
            : [];

    /* =========================
       CONTEST
    ========================= */

    const contest =
        payload?.data?.userContestRanking;

    /* =========================
       RETURN
    ========================= */

    return {

        username:
            user.username,

        avatar:
            user.profile?.userAvatar || '',

        totalSolved,

        easySolved,

        mediumSolved,

        hardSolved,

        totalSubmissions,

        totalAcceptedSubmissions,

        acceptanceRate,

        activeToday,

        badges,

        contestRating:
            typeof contest?.rating === 'number'
                ? Math.round(contest.rating)
                : null,

        ranking:
            user.profile?.ranking || null,

        contestRanking:
            contest?.globalRanking || null
    };
}

module.exports = {
    usernameFrom,
    fetchProfile
};