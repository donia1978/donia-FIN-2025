import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// RSS feeds by category and country
const RSS_FEEDS: Record<string, Record<string, string[]>> = {
  politics: {
    FR: [
      'https://www.lemonde.fr/politique/rss_full.xml',
      'https://www.lefigaro.fr/rss/figaro_politique.xml',
      'https://www.francetvinfo.fr/politique.rss'
    ],
    US: [
      'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
      'https://feeds.washingtonpost.com/rss/politics'
    ],
    GB: [
      'https://feeds.bbci.co.uk/news/politics/rss.xml',
      'https://www.theguardian.com/politics/rss'
    ],
    DE: [
      'https://www.tagesschau.de/xml/rss2_inland/'
    ],
    ES: [
      'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana/portada'
    ]
  },
  culture: {
    FR: [
      'https://www.lemonde.fr/culture/rss_full.xml',
      'https://www.telerama.fr/rss/sortir.xml',
      'https://www.franceculture.fr/rss'
    ],
    US: [
      'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml'
    ],
    GB: [
      'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
      'https://www.theguardian.com/culture/rss'
    ],
    DE: [
      'https://www.tagesschau.de/xml/rss2_kultur/'
    ],
    ES: [
      'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/cultura/portada'
    ]
  },
  sports: {
    FR: [
      'https://www.lequipe.fr/rss/actu_rss.xml',
      'https://www.lemonde.fr/sport/rss_full.xml',
      'https://rmcsport.bfmtv.com/rss/fil-sport/'
    ],
    US: [
      'https://www.espn.com/espn/rss/news',
      'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml'
    ],
    GB: [
      'https://feeds.bbci.co.uk/sport/rss.xml',
      'https://www.theguardian.com/sport/rss'
    ],
    DE: [
      'https://www.tagesschau.de/xml/rss2_sport/'
    ],
    ES: [
      'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/deportes/portada'
    ]
  }
};

// Simple XML parser for RSS feeds
function parseRSSItem(itemXml: string): { title: string; summary: string; link: string; pubDate: string; imageUrl: string | null } | null {
  try {
    const getTagContent = (xml: string, tag: string): string => {
      // Handle CDATA sections
      const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
      const cdataMatch = xml.match(cdataRegex);
      if (cdataMatch) return cdataMatch[1].trim();
      
      // Regular tag content
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1].trim() : '';
    };

    const title = getTagContent(itemXml, 'title');
    if (!title) return null;

    let summary = getTagContent(itemXml, 'description') || getTagContent(itemXml, 'content:encoded');
    // Strip HTML tags from summary
    summary = summary.replace(/<[^>]*>/g, '').substring(0, 500);

    const link = getTagContent(itemXml, 'link');
    const pubDate = getTagContent(itemXml, 'pubDate') || getTagContent(itemXml, 'dc:date');

    // Try to find image in different formats
    let imageUrl: string | null = null;
    
    // Check for media:content
    const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"[^>]*>/i);
    if (mediaMatch) imageUrl = mediaMatch[1];
    
    // Check for enclosure
    if (!imageUrl) {
      const enclosureMatch = itemXml.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image[^"]*"/i);
      if (enclosureMatch) imageUrl = enclosureMatch[1];
    }
    
    // Check for media:thumbnail
    if (!imageUrl) {
      const thumbMatch = itemXml.match(/<media:thumbnail[^>]*url="([^"]+)"[^>]*>/i);
      if (thumbMatch) imageUrl = thumbMatch[1];
    }

    // Check for image in description
    if (!imageUrl) {
      const imgMatch = summary.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
      if (imgMatch) imageUrl = imgMatch[1];
    }

    return { title, summary, link, pubDate, imageUrl };
  } catch (e) {
    console.error('Error parsing RSS item:', e);
    return null;
  }
}

async function fetchRSSFeed(url: string): Promise<{ title: string; summary: string; link: string; pubDate: string; imageUrl: string | null; sourceName: string }[]> {
  try {
    console.log(`Fetching RSS: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DONIA/1.0; +https://donia.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      console.error(`RSS fetch failed for ${url}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    
    // Extract channel title for source name
    const channelTitleMatch = xml.match(/<channel>[\s\S]*?<title>([^<]+)<\/title>/i);
    const sourceName = channelTitleMatch ? channelTitleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : new URL(url).hostname;

    // Extract items
    const items: { title: string; summary: string; link: string; pubDate: string; imageUrl: string | null; sourceName: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const parsed = parseRSSItem(match[1]);
      if (parsed) {
        items.push({ ...parsed, sourceName });
      }
    }

    console.log(`Parsed ${items.length} items from ${sourceName}`);
    return items;
  } catch (error) {
    console.error(`Error fetching RSS ${url}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, country = 'FR', action } = await req.json();
    
    console.log(`Fetching ${category} news for ${country}, action: ${action}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'get') {
      // Just fetch from database
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('category', category)
        .eq('country', country)
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from RSS feeds
    const feeds = RSS_FEEDS[category]?.[country] || RSS_FEEDS[category]?.['FR'] || [];
    
    if (feeds.length === 0) {
      console.log(`No feeds configured for ${category}/${country}`);
      return new Response(JSON.stringify({ 
        success: true, 
        data: [], 
        message: 'No RSS feeds configured for this category/country' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all feeds in parallel
    const feedPromises = feeds.map(feedUrl => fetchRSSFeed(feedUrl));
    const feedResults = await Promise.all(feedPromises);
    
    // Flatten and deduplicate by title
    const seenTitles = new Set<string>();
    const allArticles: any[] = [];
    
    for (const items of feedResults) {
      for (const item of items) {
        const normalizedTitle = item.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          allArticles.push(item);
        }
      }
    }

    console.log(`Total unique articles fetched: ${allArticles.length}`);

    // Insert into database
    const articlesToInsert = allArticles.map((article) => ({
      category,
      country,
      title: article.title.substring(0, 500),
      summary: article.summary.substring(0, 1000),
      source_name: article.sourceName,
      source_url: article.link,
      published_at: article.pubDate ? new Date(article.pubDate).toISOString() : new Date().toISOString(),
      image_url: article.imageUrl || `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/800/400`
    }));

    if (articlesToInsert.length > 0) {
      // Delete old articles for this category/country first (keep fresh)
      await supabase
        .from('news_articles')
        .delete()
        .eq('category', category)
        .eq('country', country);

      const { error: insertError } = await supabase
        .from('news_articles')
        .insert(articlesToInsert);

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log(`Inserted ${articlesToInsert.length} articles`);
      }
    }

    // Fetch all articles
    const { data: savedArticles, error: fetchError } = await supabase
      .from('news_articles')
      .select('*')
      .eq('category', category)
      .eq('country', country)
      .order('published_at', { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    return new Response(JSON.stringify({ 
      success: true, 
      data: savedArticles, 
      fetched: allArticles.length,
      sources: feeds.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-news:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
