const dates = Array.from({ length: 53 }, (_, weekIndex) => ({
  contributionDays: Array.from({ length: 7 }, (_, weekday) => ({
    contributionCount: (weekIndex * 3 + weekday * 7) % 13,
    date: new Date(Date.UTC(2025, 9, 19 + weekIndex * 7 + weekday)).toISOString().slice(0, 10),
    weekday,
  })),
}));

const totalContributions = dates.reduce(
  (total, week) => total + week.contributionDays.reduce((sum, day) => sum + day.contributionCount, 0),
  0,
);

process.env.GITHUB_TOKEN = 'local-preview';
process.env.GITHUB_USER = 'LuisInacioDasilva';

globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    data: {
      user: {
        contributionsCollection: {
          restrictedContributionsCount: 0,
          contributionCalendar: { totalContributions, weeks: dates },
        },
      },
    },
  }),
});

await import('./generate-contribution-bot.mjs');

