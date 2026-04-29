import {
  prepareWithSegments,
  layoutNextLineRange,
  materializeLineRange,
} from "@chenglou/pretext";

// --- CONFIG ---
const FONT = "18px Georgia";
const LINE_HEIGHT = 28;
const CANVAS_WIDTH = 720;
const PADDING = 30;
const TEXT_WIDTH = CANVAS_WIDTH - PADDING * 2;
const IMAGE_GAP = 20; // gap between text and image edge

// --- ARTICLE TEXT ---
const ARTICLE = `The mountains have always held a particular kind of silence, one that is not the absence of sound but the presence of something deeper. When the wind moves through the pines it carries with it the memory of centuries, of snowmelt and stone, of paths worn smooth by generations of travelers who came before.

There is a quality to morning light at elevation that photographers spend entire careers chasing. It arrives not all at once but in stages, first as a pale suggestion along the eastern ridge, then as a golden flood that pours down the valleys and sets the meadows ablaze. The shadows retreat slowly, pulling back like a tide, revealing wildflowers still heavy with dew.

The dog was the first to notice the change in the trail. She stopped, ears forward, nose working the air with an intensity that made her whole body tremble. Somewhere ahead, the path divided, and the choice mattered in ways that only an animal's instinct could fully appreciate. She had been this way before, perhaps, in some other season, when the creek ran higher and the undergrowth was less forgiving.

In the valleys between the peaks, small communities have persisted for generations, their rhythms dictated not by clocks or calendars but by the angle of the sun and the behavior of the wind. They know when the storms are coming not from weather apps but from the way the birds fly, from the particular shade of gray that gathers along the western horizon in late afternoon.

The relationship between a landscape and its inhabitants is never one-directional. The mountains shape the people who live among them, carving patience into their temperaments and a certain stubbornness into their expectations. But the people shape the mountains too, in ways both visible and invisible: trails cut through granite, meadows maintained by careful burning, streams redirected to feed terraced gardens that climb the hillsides like green staircases.

Every photograph tells two stories. The first is the obvious one, the subject, the composition, the interplay of light and shadow that the photographer intended. The second is the story of the moment itself, the wind that almost knocked the tripod over, the five hours of waiting for the clouds to part, the argument with a companion about whether to stay or descend before the weather turned.

Writing about place is an act of translation. The writer takes something inherently spatial and sensory, the smell of pine resin, the shock of cold water, the vertigo of a cliff edge, and converts it into something sequential and abstract: words on a page. Something is always lost in this conversion, but something is gained too. Language can hold contradictions that a photograph cannot. A sentence can contain both the beauty of a sunset and the sadness of knowing it will end.

The trail continued upward through a series of switchbacks, each turn revealing a slightly different perspective on the valley below. What had seemed like a single unbroken forest from the trailhead now resolved into distinct groves separated by rock slides and seasonal streams. The geography of the place became legible, like a text whose meaning only emerges when you step back far enough to see the full page.

By afternoon the wind had shifted, carrying with it the mineral smell of distant rain. The dog lay in a patch of sun near the summit cairn, occasionally lifting her head to track the movement of a hawk that circled overhead in lazy, purposeful spirals. There was nowhere else to be, nothing else to do. The mountain had, for the moment, absorbed them completely.

The descent is always different from the climb. What was hidden on the way up is now visible: the wildflowers you walked past without seeing, the rock face that catches the late light in a way that transforms gray stone into something almost luminous. Your knees remind you that gravity is not merely a concept but a force, insistent and personal. The trail that took four hours to ascend takes two and a half going down, but those hours feel longer somehow, stretched by fatigue and the reluctance to leave.

Some places resist description not because they are unremarkable but because they are too full. Every detail demands attention, every angle offers a different composition. The writer's notebook fills with fragments, half-sentences, single words circled and underlined. Later, at a desk far from the mountains, these fragments will need to be assembled into something coherent, something that captures not just what was seen but what was felt. This is the real work, and it never gets easier.`;

// --- SETUP ---
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const container = document.getElementById("container");
const img1El = document.getElementById("img1");
const img2El = document.getElementById("img2");

// Prepare text once (this is the expensive part — only done once)
const prepared = prepareWithSegments(ARTICLE, FONT);

// --- RENDER FUNCTION ---
// Called on every scroll to reflow text around fixed images
function render() {
  const dpr = window.devicePixelRatio || 1;
  const containerRect = container.getBoundingClientRect();

  // Get the fixed images' bounding rects in viewport coordinates,
  // then convert to canvas-relative coordinates
  const obstacles = [img1El, img2El]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        // Convert viewport coords to canvas content coords
        top: r.top - containerRect.top,
        bottom: r.bottom - containerRect.top,
        left: r.left - containerRect.left,
        right: r.right - containerRect.left,
        width: r.width,
      };
    });

  // --- LAY OUT TEXT LINE BY LINE ---
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = PADDING;
  const lines = [];

  while (true) {
    let lineWidth = TEXT_WIDTH;
    let xOffset = PADDING;

    // Check each obstacle for overlap with this line
    for (const obs of obstacles) {
      const lineTop = y;
      const lineBottom = y + LINE_HEIGHT;

      if (lineBottom > obs.top && lineTop < obs.bottom) {
        // Obstacle overlaps this line vertically
        const obsCenter = (obs.left + obs.right) / 2;
        const canvasCenter = CANVAS_WIDTH / 2;

        if (obsCenter > canvasCenter) {
          // Image is on the right — shrink from right
          const availableRight = obs.left - IMAGE_GAP;
          lineWidth = Math.max(50, availableRight - PADDING);
        } else {
          // Image is on the left — push text right
          const imgRight = obs.right + IMAGE_GAP;
          xOffset = Math.max(PADDING, imgRight);
          lineWidth = Math.max(50, CANVAS_WIDTH - PADDING - xOffset);
        }
      }
    }

    const range = layoutNextLineRange(prepared, cursor, lineWidth);
    if (range === null) break;

    const line = materializeLineRange(prepared, range);
    lines.push({ text: line.text, x: xOffset, y });

    cursor = range.end;
    y += LINE_HEIGHT;
  }

  // --- SIZE CANVAS ---
  const totalHeight = y + PADDING;
  canvas.width = CANVAS_WIDTH * dpr;
  canvas.height = totalHeight * dpr;
  canvas.style.width = CANVAS_WIDTH + "px";
  canvas.style.height = totalHeight + "px";
  ctx.scale(dpr, dpr);

  // --- DRAW ---
  // Background
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, CANVAS_WIDTH, totalHeight);

  // Text
  ctx.font = FONT;
  ctx.fillStyle = "#2a2a2a";
  ctx.textBaseline = "top";
  for (const line of lines) {
    ctx.fillText(line.text, line.x, line.y + 4);
  }
}

// --- SCROLL HANDLER ---
// Reflow on every scroll since fixed images shift relative to the text
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      render();
      ticking = false;
    });
    ticking = true;
  }
});

// Also reflow on resize
window.addEventListener("resize", () => render());

// Initial render
render();
