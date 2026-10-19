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
const width = 980;
const height = 300;
const cell = 11;
const gap = 5;
const step = cell + gap;
const gridX = 66;
const gridY = 114;
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
  <desc id="desc">Um robô animado percorre e ilumina as células da grade real de contribuições do GitHub.</desc>
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#071522" />
      <stop offset="0.55" stop-color="#0B1C2A" />
      <stop offset="1" stop-color="#0A2A24" />
    </linearGradient>
    <linearGradient id="edge" x1="0" x2="1">
      <stop offset="0" stop-color="#4ADE80" />
      <stop offset="0.52" stop-color="#22D3EE" />
      <stop offset="1" stop-color="#818CF8" />
    </linearGradient>
    <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5EC9EA" />
      <stop offset="0.56" stop-color="#28799B" />
      <stop offset="1" stop-color="#18536B" />
    </linearGradient>
    <linearGradient id="visor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#153F59" />
      <stop offset="1" stop-color="#082536" />
    </linearGradient>
    <radialGradient id="eyes">
      <stop offset="0" stop-color="#E5FFFF" />
      <stop offset="0.55" stop-color="#84F2FF" />
      <stop offset="1" stop-color="#2DD4BF" />
    </radialGradient>
    <radialGradient id="halo">
      <stop offset="0" stop-color="#22D3EE" stop-opacity="0.28" />
      <stop offset="1" stop-color="#22D3EE" stop-opacity="0" />
    </radialGradient>
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
    .scan { animation: scan 1.6s ease-in-out infinite alternate; }
    .body { animation: hover 2.4s ease-in-out infinite; }
    .trail { animation: flow 8s linear infinite; }
    @keyframes blink { 46%, 54% { opacity: .12; } }
    @keyframes ping { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
    @keyframes scan { from { opacity: .28; } to { opacity: .8; } }
    @keyframes hover { 50% { transform: translateY(-2px); } }
    @keyframes flow { to { stroke-dashoffset: -80; } }
    @media (prefers-reduced-motion: reduce) { .eye, .antenna, .scan, .body, .trail { animation: none; } }
  </style>

  <rect width="${width}" height="${height}" rx="22" fill="url(#panel)" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="21" fill="none" stroke="#3B6673" stroke-width="2" />
  <path d="M25 1H${width - 25}" stroke="url(#edge)" stroke-width="3" />
  <rect x="32" y="84" width="${width - 64}" height="162" rx="14" fill="#06141D" stroke="#234856" />
  <rect x="32" y="84" width="${width - 64}" height="162" rx="14" fill="url(#microGrid)" />
  <ellipse cx="${width / 2}" cy="215" rx="400" ry="76" fill="url(#halo)" />

  <circle cx="35" cy="35" r="5" fill="#39D353" class="antenna" filter="url(#glow)" />
  <text x="53" y="41" class="mono" fill="#D8F8F4" font-size="17" font-weight="700" letter-spacing="1.4">CONTRIBUTION SYSTEM</text>
  <text x="53" y="59" class="mono" fill="#789EAC" font-size="12" letter-spacing="1.1">CALENDÁRIO REAL / ${year}</text>
  <rect x="${width - 207}" y="22" width="174" height="46" rx="10" fill="#123341" stroke="#378B87" />
  <text x="${width - 47}" y="44" class="mono" fill="#E9FFFA" font-size="21" font-weight="700" text-anchor="end">${calendar.totalContributions.toLocaleString('pt-BR')}</text>
  <text x="${width - 47}" y="59" class="mono" fill="#8DDCB8" font-size="10" letter-spacing="1" text-anchor="end">CONTRIBUIÇÕES</text>
  <path d="M33 74H${width - 33}" stroke="#315362" />

  <path class="trail" d="${robotPath}" fill="none" stroke="#22D3EE" stroke-opacity="0.14" stroke-width="2" stroke-dasharray="3 9" />
  <g>${cells}</g>

  <g>
    <animateMotion dur="${robotDuration}s" repeatCount="indefinite" rotate="0" path="${robotPath}" />
    <circle cx="0" cy="-2" r="34" fill="url(#halo)" />
    <ellipse cx="0" cy="28" rx="22" ry="4" fill="#22D3EE" opacity=".24" />
    <path class="scan" d="M20 -11L47 -18V21L20 8Z" fill="#22D3EE" opacity=".22" />
    <g class="body">
      <path d="M-20 11L-33 13L-36 5M20 11L33 13L36 5" fill="none" stroke="#64CFE7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="-36" cy="4" r="4" fill="#194D65" stroke="#8BE8E8" stroke-width="2" />
      <circle cx="36" cy="4" r="4" fill="#194D65" stroke="#8BE8E8" stroke-width="2" />
      <rect x="-20" y="9" width="40" height="18" rx="7" fill="#124055" stroke="#79D9E4" stroke-width="2" />
      <path d="M-7 17H7M-7 21H3" stroke="#39D353" stroke-width="2" stroke-linecap="round" />
      <path d="M-11 25L-13 29M11 25L13 29" stroke="#6CD5E7" stroke-width="3" stroke-linecap="round" />
      <path d="M-18 30H-9M9 30H18" stroke="#9BE9D9" stroke-width="3" stroke-linecap="round" />
      <rect x="-31" y="-12" width="7" height="19" rx="3" fill="#225E75" stroke="#8BE8E8" />
      <rect x="24" y="-12" width="7" height="19" rx="3" fill="#225E75" stroke="#8BE8E8" />
      <path d="M-29 -10Q-29 -26 -13 -27H13Q29 -26 29 -10V8Q29 18 17 19H-17Q-29 18 -29 8Z" fill="url(#shell)" stroke="#B1F1EC" stroke-width="2.4" />
      <path d="M-24 -15Q-22 -23 -12 -23H12Q22 -23 24 -15" fill="none" stroke="#F2FFFF" stroke-opacity=".65" stroke-width="2" />
      <rect x="-23" y="-16" width="46" height="24" rx="8" fill="url(#visor)" stroke="#1D7189" stroke-width="1.5" />
      <path d="M-17 -13H17" stroke="#9DE9EC" stroke-opacity=".28" stroke-width="2" stroke-linecap="round" />
      <circle class="eye" cx="-10" cy="-4" r="5" fill="url(#eyes)" filter="url(#glow)" />
      <circle class="eye" cx="10" cy="-4" r="5" fill="url(#eyes)" filter="url(#glow)" />
      <circle cx="-9" cy="-6" r="1.5" fill="#F8FFFF" />
      <circle cx="11" cy="-6" r="1.5" fill="#F8FFFF" />
      <path d="M-6 7Q0 12 6 7" fill="none" stroke="#B0F4C3" stroke-width="2" stroke-linecap="round" />
      <path d="M0 -27V-34" stroke="#8CE5E8" stroke-width="3" stroke-linecap="round" />
      <circle class="antenna" cx="0" cy="-38" r="5" fill="#4ADE80" filter="url(#glow)" />
    </g>
  </g>

  <path d="M33 258H${width - 33}" stroke="#315362" />
  <g class="mono" font-size="12">
    <text x="48" y="281" fill="#81A5B4">MENOS</text>
    ${palette.map((color, index) => `<rect x="${110 + index * 20}" y="269" width="12" height="12" rx="3" fill="${color}" />`).join('')}
    <text x="220" y="281" fill="#81A5B4">MAIS</text>
    <circle cx="${width - 223}" cy="276" r="4" fill="#39D353" class="antenna" />
    <text x="${width - 207}" y="281" fill="#9BE9A8">ROBÔ EM MOVIMENTO</text>
  </g>
</svg>`;

await mkdir('dist', { recursive: true });
await writeFile('dist/contribution-bot.svg', svg, 'utf8');
console.log(`Generated contribution bot for ${login}: ${calendar.totalContributions} contributions (${payload.data.user.contributionsCollection.restrictedContributionsCount} private counts shared).`);

