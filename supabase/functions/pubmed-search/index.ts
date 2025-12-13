import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 10 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`PubMed search: "${query}", max: ${maxResults}`);

    // Step 1: Search for article IDs
    const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`PubMed search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const ids = searchData.esearchresult?.idlist || [];
    
    if (ids.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        articles: [],
        count: 0,
        query 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${ids.length} article IDs`);

    // Step 2: Fetch article details
    const fetchUrl = `${PUBMED_BASE_URL}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    
    const fetchResponse = await fetch(fetchUrl);
    if (!fetchResponse.ok) {
      throw new Error(`PubMed fetch failed: ${fetchResponse.status}`);
    }
    
    const fetchData = await fetchResponse.json();
    const result = fetchData.result || {};
    
    // Transform articles to a cleaner format
    const articles = ids.map((id: string) => {
      const article = result[id];
      if (!article) return null;
      
      return {
        pmid: id,
        title: article.title || 'No title',
        authors: article.authors?.map((a: any) => a.name).slice(0, 5).join(', ') || 'Unknown',
        journal: article.fulljournalname || article.source || 'Unknown journal',
        pubDate: article.pubdate || 'Unknown date',
        doi: article.elocationid?.replace('doi: ', '') || null,
        abstract: null, // Would need separate API call for abstracts
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        volume: article.volume,
        issue: article.issue,
        pages: article.pages,
      };
    }).filter(Boolean);

    console.log(`Returning ${articles.length} articles`);

    return new Response(JSON.stringify({ 
      success: true, 
      articles,
      count: articles.length,
      totalFound: parseInt(searchData.esearchresult?.count || '0'),
      query 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PubMed search error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
