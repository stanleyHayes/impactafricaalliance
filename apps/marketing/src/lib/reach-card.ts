import { brandColors, type PublicReachSummary } from '@iaa/shared';

/**
 * Draws the reach figures as a shareable image.
 *
 * Painted on a canvas rather than pulled in as a library: the whole card is a
 * background, four numbers, a bar chart and a wordmark, and a PDF renderer to
 * do that would be larger than the rest of the page.
 *
 * 1200x630 is the size every network crops link previews to, so the card
 * arrives whole on WhatsApp, LinkedIn and X rather than losing its edges.
 */
const WIDTH = 1200;
const HEIGHT = 630;

const number = new Intl.NumberFormat('en-GB');

/** The site's own faces, already loaded by the page that offers the download. */
const DISPLAY = "600 44px 'Fraunces', Georgia, serif";
const BODY = "500 20px 'Outfit', system-ui, sans-serif";

interface Figure {
  value: string;
  label: string;
}

const figuresFrom = (reach: PublicReachSummary): Figure[] => [
  { value: number.format(reach.totalViews), label: 'page views' },
  { value: number.format(reach.totalVisitors), label: 'people' },
  { value: number.format(reach.countryCount), label: 'countries' },
];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

const roundedRect = (ctx: CanvasRenderingContext2D, { x, y, width, height, radius }: Rect): void => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
};

/** The daily series as a bar chart along the foot of the card. */
const drawTrend = (ctx: CanvasRenderingContext2D, reach: PublicReachSummary): void => {
  const days = reach.daily;
  if (days.length === 0) return;

  const left = 72;
  const right = WIDTH - 72;
  const bottom = HEIGHT - 96;
  const maxHeight = 96;
  const peak = Math.max(...days.map((day) => day.views), 1);
  const gap = 3;
  const barWidth = Math.max(2, (right - left - gap * (days.length - 1)) / days.length);

  ctx.fillStyle = brandColors.mint;
  days.forEach((day, index) => {
    const height = Math.max(2, (day.views / peak) * maxHeight);
    const x = left + index * (barWidth + gap);
    ctx.globalAlpha = 0.35 + 0.65 * (day.views / peak);
    roundedRect(ctx, {
      x,
      y: bottom - height,
      width: barWidth,
      height,
      radius: Math.min(2, barWidth / 2),
    });
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

const drawFigures = (ctx: CanvasRenderingContext2D, figures: Figure[]): void => {
  const columnWidth = (WIDTH - 144) / figures.length;
  figures.forEach((figure, index) => {
    const x = 72 + index * columnWidth;
    ctx.fillStyle = brandColors.white;
    ctx.font = "700 72px 'Outfit', system-ui, sans-serif";
    ctx.fillText(figure.value, x, 366);
    ctx.fillStyle = brandColors.mint;
    ctx.font = BODY;
    ctx.fillText(figure.label, x, 400);
  });
};

/**
 * Renders the card and hands back a PNG.
 *
 * Returns null when the browser will not give us a 2D context, so the caller
 * can fall back to sharing a link rather than failing silently.
 */
export const drawReachCard = async (
  reach: PublicReachSummary,
  siteLabel: string,
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Wait for the brand faces, or the card renders in whatever the canvas
  // defaults to — which is not the site anyone recognises.
  try {
    await Promise.all([document.fonts.load(DISPLAY), document.fonts.load(BODY)]);
  } catch {
    // A fallback face is better than no card.
  }

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, brandColors.deepForest);
  background.addColorStop(1, '#0B2A1E');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = brandColors.gold;
  ctx.font = "700 20px 'Outfit', system-ui, sans-serif";
  ctx.fillText(`LAST ${reach.days} DAYS`, 72, 96);

  ctx.fillStyle = brandColors.white;
  ctx.font = DISPLAY;
  ctx.fillText('Impact Africa Alliance', 72, 168);
  ctx.font = "400 30px 'Fraunces', Georgia, serif";
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText('Who is reading our work', 72, 214);

  drawFigures(ctx, figuresFrom(reach));

  const countries = reach.topCountries
    .slice(0, 4)
    .map((country) => country.label)
    .join(' · ');
  if (countries !== '') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = BODY;
    ctx.fillText(countries, 72, 452);
  }

  drawTrend(ctx, reach);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = "500 18px 'Outfit', system-ui, sans-serif";
  ctx.fillText(siteLabel, 72, HEIGHT - 44);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
};
