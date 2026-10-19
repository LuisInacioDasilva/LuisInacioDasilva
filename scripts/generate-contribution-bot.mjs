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
const height = 270;
const cell = 11;
const gap = 5;
const step = cell + gap;
const gridX = 68;
const gridY = 114;
const gridWidth = Math.max(1, weeks.length - 1) * step;
const robotDuration = 84;
const turnDistance = Math.PI * step / 2;
const travelDistance = 7 * gridWidth + 6 * turnDistance;
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
    const distance = day.weekday * (gridWidth + turnDistance)
      + (day.weekday % 2 === 0 ? weekIndex : weeks.length - 1 - weekIndex) * step;
    const arrival = distance / travelDistance * robotDuration;

    return `<rect class="cell" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${fill}" stroke="#9DD5CF" stroke-opacity=".42" stroke-width=".6">
      <title>${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'}</title>
      ${day.contributionCount ? `<animate attributeName="fill" values="${fill};#C7FFE5;${fill};${fill}" keyTimes="0;0.006;0.018;1" dur="${robotDuration}s" begin="${arrival.toFixed(2)}s" repeatCount="indefinite" />` : ''}
      ${day.contributionCount ? `<animate attributeName="stroke-width" values=".6;2;.6;.6" keyTimes="0;0.006;0.018;1" dur="${robotDuration}s" begin="${arrival.toFixed(2)}s" repeatCount="indefinite" />` : ''}
    </rect>`;
  }),
).join('\n');

const pathParts = [];
const left = gridX + cell / 2;
const right = gridX + gridWidth + cell / 2;
for (let row = 0; row < 7; row += 1) {
  const y = gridY + row * step + cell / 2;
  if (row === 0) pathParts.push(`M ${left} ${y}`);
  pathParts.push(row % 2 === 0 ? `H ${right}` : `H ${left}`);
  if (row < 6) pathParts.push(`A ${step / 2} ${step / 2} 0 0 ${row % 2 === 0 ? 1 : 0} ${row % 2 === 0 ? right : left} ${y + step}`);
}
const robotPath = pathParts.join(' ');

const year = new Date().getUTCFullYear();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Contribution Bot de ${login}</title>
  <desc id="desc">Um robô animado percorre e ilumina as células da grade real de contribuições do GitHub.</desc>
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07111B" />
      <stop offset="0.55" stop-color="#0A1E2A" />
      <stop offset="1" stop-color="#0A2624" />
    </linearGradient>
    <linearGradient id="edge" x1="0" x2="1">
      <stop offset="0" stop-color="#4ADE80" />
      <stop offset="0.52" stop-color="#22D3EE" />
      <stop offset="1" stop-color="#818CF8" />
    </linearGradient>
    <linearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#A7F3E5" />
      <stop offset="0.55" stop-color="#43BDD1" />
      <stop offset="1" stop-color="#238199" />
    </linearGradient>
    <linearGradient id="visor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#123747" />
      <stop offset="1" stop-color="#06202E" />
    </linearGradient>
    <radialGradient id="eyes">
      <stop offset="0" stop-color="#E5FFFF" />
      <stop offset="0.55" stop-color="#84F2FF" />
      <stop offset="1" stop-color="#2DD4BF" />
    </radialGradient>
    <radialGradient id="halo">
      <stop offset="0" stop-color="#5EEAD4" stop-opacity="0.35" />
      <stop offset="1" stop-color="#5EEAD4" stop-opacity="0" />
    </radialGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <pattern id="microGrid" width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M26 0H0V26" fill="none" stroke="#7DD3FC" stroke-opacity="0.035" />
    </pattern>
  </defs>
  <style>
    .sans { font-family: Inter, "Segoe UI", Arial, sans-serif; }
    .mono { font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace; }
    .eye { animation: blink 4.2s steps(2, start) infinite; }
    .antenna { animation: ping 2.2s ease-in-out infinite; }
    .body { animation: hover 2.8s ease-in-out infinite; }
    .status { animation: ping 3s ease-in-out infinite; }
    @keyframes blink { 48%, 53% { opacity: .14; } }
    @keyframes ping { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    @keyframes hover { 50% { transform: translateY(-1.5px); } }
    @media (prefers-reduced-motion: reduce) { .eye, .antenna, .body, .status { animation: none; } }
  </style>

  <rect width="${width}" height="${height}" rx="18" fill="url(#panel)" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="17" fill="none" stroke="#315563" stroke-width="2" />
  <path d="M26 1H${width - 26}" stroke="url(#edge)" stroke-opacity=".8" stroke-width="2" />
  <rect x="47" y="89" width="886" height="146" rx="14" fill="#071720" stroke="#254B57" />
  <rect x="47" y="89" width="886" height="146" rx="14" fill="url(#microGrid)" />
  <ellipse cx="${width / 2}" cy="204" rx="395" ry="70" fill="url(#halo)" opacity=".55" />

  <rect x="43" y="27" width="4" height="36" rx="2" fill="url(#edge)" />
  <text x="61" y="45" class="sans" fill="#F0FBFA" font-size="22" font-weight="700">Contribuições</text>
  <text x="62" y="64" class="mono" fill="#83AEB7" font-size="11" letter-spacing="1.3">${year}  /  GITHUB ACTIVITY</text>
  <text x="${width - 48}" y="48" class="sans" fill="#F0FBFA" font-size="25" font-weight="700" text-anchor="end">${calendar.totalContributions.toLocaleString('pt-BR')}</text>
  <text x="${width - 49}" y="65" class="mono" fill="#86C9B3" font-size="11" letter-spacing="1" text-anchor="end">CONTRIBUIÇÕES NO ANO</text>

  <g>${cells}</g>

  <g>
    <animateMotion dur="${robotDuration}s" calcMode="paced" repeatCount="indefinite" rotate="0" path="${robotPath}" />
    <circle cx="0" cy="0" r="24" fill="url(#halo)" />
    <circle cx="0" cy="0" r="13" fill="none" stroke="#9CF5D5" stroke-opacity=".56" stroke-width="1" />
    <g class="body">
      <path d="M-12 5L-18 8M12 5L18 8" fill="none" stroke="#8CE6DE" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="-18" cy="8" r="2" fill="#4ADE80" />
      <circle cx="18" cy="8" r="2" fill="#4ADE80" />
      <rect x="-11" y="6" width="22" height="11" rx="5" fill="#0F5566" stroke="#7BE4D7" stroke-width="1.2" />
      <path d="M-4 12H4" stroke="#8DF5C3" stroke-width="1.5" stroke-linecap="round" />
      <path d="M-6 17L-7 19M6 17L7 19" stroke="#8CE6DE" stroke-width="2" stroke-linecap="round" />
      <rect x="-16" y="-13" width="32" height="26" rx="9" fill="url(#shell)" stroke="#D5FFF4" stroke-width="1.5" />
      <rect x="-12" y="-9" width="24" height="14" rx="6" fill="url(#visor)" />
      <circle class="eye" cx="-5" cy="-3" r="2.6" fill="url(#eyes)" />
      <circle class="eye" cx="5" cy="-3" r="2.6" fill="url(#eyes)" />
      <path d="M-3 9Q0 11 3 9" fill="none" stroke="#176479" stroke-width="1.2" stroke-linecap="round" />
      <path d="M0 -13V-17" stroke="#B5F8E8" stroke-width="1.8" stroke-linecap="round" />
      <circle class="antenna" cx="0" cy="-19" r="2.6" fill="#4ADE80" filter="url(#glow)" />
    </g>
  </g>

  <g class="mono" font-size="10">
    <text x="62" y="255" fill="#7FA7AF">MENOS</text>
    ${palette.map((color, index) => `<rect x="${114 + index * 16}" y="247" width="10" height="10" rx="2" fill="${color}" />`).join('')}
    <text x="205" y="255" fill="#7FA7AF">MAIS</text>
    <circle cx="${width - 222}" cy="252" r="3" fill="#4ADE80" class="status" />
    <text x="${width - 210}" y="255" fill="#93C8B2" letter-spacing=".7">CADA PONTO CONTA</text>
  </g>
</svg>`;

await mkdir('dist', { recursive: true });
await writeFile('dist/contribution-bot.svg', svg, 'utf8');
console.log(`Generated contribution bot for ${login}: ${calendar.totalContributions} contributions (${payload.data.user.contributionsCollection.restrictedContributionsCount} private counts shared).`);

