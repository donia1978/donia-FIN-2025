import express from "express";
import cors from "cors";
import Parser from "rss-parser";

const app = express();
app.use(cors());
const parser = new Parser({ timeout: 15000 });

const FEEDS = {
  politics: [
    { name: "TAP", url: "https://www.tap.info.tn/fr/rss" },
    { name: "Kapitalis", url: "https://kapitalis.com/tunisie/feed/" },
    { name: "Business News", url: "https://www.businessnews.com.tn/rss.xml" }
  ],
  culture: [
    { name: "Webdo", url: "https://www.webdo.tn/fr/feed/" },
    { name: "Leaders", url: "https://leaders.com.tn/rss" },
    { name: "TAP Culture", url: "https://www.tap.info.tn/fr/rss" }
  ],
  sport: [
    { name: "Mosaique FM Sport", url: "https://www.mosaiquefm.net/fr/rss/sport/" },
    { name: "Sport Express", url: "https://www.sport-express.tn/rss" },
    { name: "Foot24", url: "https://www.foot24.tn/feed/" }
  ]
};

function pickMedia(item) {
  // Try: enclosure, media:content, content html <img>, etc.
  let imageUrl = null;
  let videoUrl = null;

  if (item.enclosure && item.enclosure.url) {
    const u = item.enclosure.url;
    if (u.match(/\\.(mp4|webm)(\\?.*)?$/i)) videoUrl = u;
    if (u.match(/\\.(jpg|jpeg|png|webp)(\\?.*)?$/i)) imageUrl = u;
  }

  const content = (item.content || item["content:encoded"] || item.summary || "");
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!imageUrl && imgMatch) imageUrl = imgMatch[1];

  return { imageUrl, videoUrl };
}

async function readFeeds(list, maxPerFeed) {
  const out = [];
  for (const f of list) {
    try {
      const feed = await parser.parseURL(f.url);
      const items = (feed.items || []).slice(0, maxPerFeed);
      for (const it of items) {
        const { imageUrl, videoUrl } = pickMedia(it);
        out.push({
          title: it.title || "",
          url: it.link || "",
          summary: (it.contentSnippet || it.summary || "").slice(0, 300),
          publishedAt: it.isoDate || it.pubDate || null,
          source: f.name,
          attribution: { sourceName: f.name, sourceUrl: f.url, itemUrl: it.link || "" },
          imageUrl,
          videoUrl
        });
      }
    } catch (e) {
      // keep going
    }
  }

  // sort by date desc
  out.sort((a,b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  return out;
}

app.get("/health", (req,res) => res.json({ ok: true }));

app.get("/api/info", async (req, res) => {
  const category = (req.query.category || "tunisia").toString();
  const max = Math.max(5, Math.min(50, parseInt((req.query.max || "25").toString(), 10) || 25));

  const feeds = FEEDS[category] || FEEDS.tunisia;
  const items = await readFeeds(feeds, Math.ceil(max / Math.max(1, feeds.length)));

  res.json({ category, count: Math.min(max, items.length), items: items.slice(0, max) });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5178;
app.listen(port, () => console.log("info-proxy listening on http://localhost:" + port));
