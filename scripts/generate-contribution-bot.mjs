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
const palette = ['#161B22', '#312E81', '#4F46E5', '#7C3AED', '#22D3EE'];

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
    const delay = ((weekIndex * 7 + day.weekday) % 53) / 53;

    return `<rect class="cell" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${fill}">
      <title>${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'}</title>
      ${day.contributionCount ? `<animate attributeName="opacity" values="0.55;1;0.75" dur="3.2s" begin="-${delay.toFixed(2)}s" repeatCount="indefinite" />` : ''}
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
      <stop offset="0" stop-color="#080B14" />
      <stop offset="0.55" stop-color="#111329" />
      <stop offset="1" stop-color="#07151B" />
    </linearGradient>
    <linearGradient id="bot" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A855F7" />
      <stop offset="1" stop-color="#22D3EE" />
    </linearGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <pattern id="microGrid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M22 0H0V22" fill="none" stroke="#6366F1" stroke-opacity="0.045" />
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
  </style>

  <rect width="${width}" height="${height}" rx="18" fill="url(#panel)" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="17" fill="none" stroke="#334155" />
  <rect width="${width}" height="${height}" rx="18" fill="url(#microGrid)" />

  <circle cx="24" cy="27" r="4" fill="#22D3EE" class="antenna" filter="url(#glow)" />
  <text x="38" y="32" class="mono" fill="#67E8F9" font-size="13" font-weight="700" letter-spacing="2">CONTRIBUTION BOT // ${year}</text>
  <text x="${width - 26}" y="32" class="mono" fill="#A78BFA" font-size="12" text-anchor="end">${calendar.totalContributions} COMMITS + EVENTS</text>
  <path d="M24 49H${width - 24}" stroke="#334155" />

  <g>${cells}</g>
  <path d="${robotPath}" fill="none" stroke="#22D3EE" stroke-opacity="0.08" stroke-width="2" stroke-dasharray="3 7" />

  <g filter="url(#glow)">
    <animateMotion dur="26s" repeatCount="indefinite" rotate="0" path="${robotPath}" />
    <line x1="0" y1="-13" x2="0" y2="-20" stroke="#C4B5FD" stroke-width="2" />
    <circle class="antenna" cx="0" cy="-23" r="3" fill="#22D3EE" />
    <rect x="-12" y="-13" width="24" height="20" rx="6" fill="#0B1020" stroke="url(#bot)" stroke-width="2" />
    <circle class="eye" cx="-5" cy="-5" r="2" fill="#22D3EE" />
    <circle class="eye" cx="5" cy="-5" r="2" fill="#22D3EE" />
    <path d="M-5 2H5" stroke="#A78BFA" stroke-width="1.5" stroke-linecap="round" />
    <path d="M-9 9V13M9 9V13" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" />
    <path class="scan" d="M14 -10L27 -16V12L14 5Z" fill="#22D3EE" opacity="0.35" />
  </g>

  <g class="mono" font-size="11">
    <text x="62" y="220" fill="#64748B">LOW</text>
    ${palette.map((color, index) => `<rect x="${92 + index * 18}" y="211" width="11" height="11" rx="2.5" fill="${color}" />`).join('')}
    <text x="187" y="220" fill="#64748B">HIGH</text>
    <text x="${width - 30}" y="220" fill="#64748B" text-anchor="end">STATUS: PATROLLING THE GRID</text>
  </g>
</svg>`;

await mkdir('dist', { recursive: true });
await writeFile('dist/contribution-bot.svg', svg, 'utf8');
console.log(`Generated contribution bot for ${login}: ${calendar.totalContributions} contributions.`);

