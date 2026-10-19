import { mkdir, writeFile } from 'node:fs/promises';

const token = process.env.GITHUB_TOKEN;
const login = process.env.GITHUB_USER;

if (!token || !login) {
  throw new Error('GITHUB_TOKEN and GITHUB_USER are required.');
}

const query = `
  query ContributionCalendar($login: String!) {
    user(login: $login) {
      contributionsCollection {
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              weekday
            }
          }
        }
      }
    }
  }
`;

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': `${login}-profile-contribution-bot`,
  },
  body: JSON.stringify({ query, variables: { login } }),
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL returned ${response.status}.`);
}

const payload = await response.json();
if (payload.errors?.length) {
  throw new Error(payload.errors.map(({ message }) => message).join('; '));
}

const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar) {
  throw new Error(`No contribution calendar found for ${login}.`);
}

const weeks = calendar.weeks;
const width = 920;
const height = 250;
const cell = 11;
const gap = 4;
const step = cell + gap;
const gridX = 62;
const gridY = 84;
const gridWidth = Math.max(1, weeks.length - 1) * step;
const robotDuration = 105;
const travelDistance = 7 * gridWidth + 6 * step;
const palette = ['#111D24', '#0E4429', '#006D32', '#26A641', '#39D353'];

const levelFor = (count) => {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
};

const cells = weeks.flatMap((week, weekIndex) =>
  week.contributionDays.map((day) => {
    const x = gridX + weekIndex * step;
    const y = gridY + day.weekday * step;
    const fill = palette[levelFor(day.contributionCount)];
    const distance = day.weekday * (gridWidth + step)
      + (day.weekday % 2 === 0 ? weekIndex : weeks.length - 1 - weekIndex) * step;
    const arrival = distance / travelDistance * robotDuration;

    return `<rect class="cell" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${fill}" stroke="#CFFFE8">
      <title>${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'}</title>
      ${day.contributionCount ? `<animate attributeName="fill" values="${fill};#D1FAE5;${fill};${fill}" keyTimes="0;0.005;0.015;1" dur="${robotDuration}s" begin="${arrival.toFixed(2)}s" repeatCount="indefinite" />` : ''}
      ${day.contributionCount ? `<animate attributeName="stroke-width" values="0;2.5;0;0" keyTimes="0;0.005;0.015;1" dur="${robotDuration}s" begin="${arrival.toFixed(2)}s" repeatCount="indefinite" />` : ''}
    </rect>`;
  }),
).join('\n');

const pathParts = [];
for (let row = 0; row < 7; row += 1) {
  const y = gridY + row * step + cell / 2;
  const left = gridX + cell / 2;
  const right = gridX + gridWidth + cell / 2;
  if (row === 0) pathParts.push(`M ${left} ${y}`);
  pathParts.push(row % 2 === 0 ? `H ${right}` : `H ${left}`);
  if (row < 6) pathParts.push(`V ${y + step}`);
}
const robotPath = pathParts.join(' ');

const year = new Date().getUTCFullYear();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Contribution Bot de ${login}</title>
  <desc id="desc">Um robô animado percorre a grade real de contribuições do GitHub.</desc>
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07111D" />
      <stop offset="0.55" stop-color="#0B1721" />
      <stop offset="1" stop-color="#092319" />
    </linearGradient>
    <linearGradient id="bot" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7DD3FC" />
      <stop offset="1" stop-color="#39D353" />
    </linearGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <pattern id="microGrid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M22 0H0V22" fill="none" stroke="#7DD3FC" stroke-opacity="0.055" />
    </pattern>
  </defs>
  <style>
    .sans { font-family: Inter, "Segoe UI", Arial, sans-serif; }
    .mono { font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace; }
    .eye { animation: blink 3.4s steps(2, start) infinite; }
    .antenna { animation: ping 1.8s ease-in-out infinite; }
    .scan { animation: scan 1.2s ease-in-out infinite alternate; transform-origin: center; }
    @keyframes blink { 46%, 54% { opacity: .12; } }
    @keyframes ping { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
    @keyframes scan { from { opacity: .28; } to { opacity: .8; } }
    @media (prefers-reduced-motion: reduce) { .eye, .antenna, .scan { animation: none; } }
  </style>

  <rect width="${width}" height="${height}" rx="18" fill="url(#panel)" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="17" fill="none" stroke="#334155" />
  <rect width="${width}" height="${height}" rx="18" fill="url(#microGrid)" />

  <circle cx="24" cy="27" r="4" fill="#39D353" class="antenna" filter="url(#glow)" />
  <text x="38" y="32" class="mono" fill="#9BE9A8" font-size="13" font-weight="700" letter-spacing="2">CONTRIBUTION GRID // ${year}</text>
  <text x="${width - 26}" y="32" class="mono" fill="#B6C8D0" font-size="12" text-anchor="end">${calendar.totalContributions.toLocaleString('pt-BR')} CONTRIBUIÇÕES</text>
  <path d="M24 49H${width - 24}" stroke="#334155" />

  <g>${cells}</g>
  <path d="${robotPath}" fill="none" stroke="#22D3EE" stroke-opacity="0.18" stroke-width="2" stroke-dasharray="3 7" />

  <g filter="url(#glow)">
    <animateMotion dur="${robotDuration}s" repeatCount="indefinite" rotate="0" path="${robotPath}" />
    <ellipse cx="0" cy="25" rx="20" ry="5" fill="#22D3EE" opacity=".27" />
    <path class="scan" d="M16 -8L37 -16V24L16 7Z" fill="#22D3EE" opacity=".2" />
    <path d="M-13 13L-17 21M13 13L17 21M-23 -2L-31 5M23 -2L31 5" fill="none" stroke="#7DD3FC" stroke-width="3" stroke-linecap="round" />
    <rect x="-25" y="-21" width="50" height="38" rx="12" fill="#081B2B" stroke="url(#bot)" stroke-width="3" />
    <rect x="-18" y="-14" width="36" height="22" rx="7" fill="#0D3042" />
    <circle class="eye" cx="-9" cy="-4" r="4" fill="#7DD3FC" />
    <circle class="eye" cx="9" cy="-4" r="4" fill="#7DD3FC" />
    <path d="M-7 8Q0 13 7 8" fill="none" stroke="#9BE9A8" stroke-width="2" stroke-linecap="round" />
    <path d="M0 -21V-29" stroke="#7DD3FC" stroke-width="3" stroke-linecap="round" />
    <circle class="antenna" cx="0" cy="-33" r="4" fill="#39D353" />
    <rect x="-7" y="16" width="14" height="4" rx="2" fill="#39D353" />
  </g>

  <g class="mono" font-size="11">
    <text x="62" y="220" fill="#64748B">LOW</text>
    ${palette.map((color, index) => `<rect x="${92 + index * 18}" y="211" width="11" height="11" rx="2.5" fill="${color}" />`).join('')}
    <text x="187" y="220" fill="#64748B">HIGH</text>
    <text x="${width - 30}" y="220" fill="#7D9EAB" text-anchor="end">BOT ONLINE · GITHUB DATA</text>
  </g>
</svg>`;

await mkdir('dist', { recursive: true });
await writeFile('dist/contribution-bot.svg', svg, 'utf8');
console.log(`Generated contribution bot for ${login}: ${calendar.totalContributions} contributions (${payload.data.user.contributionsCollection.restrictedContributionsCount} private counts shared).`);

