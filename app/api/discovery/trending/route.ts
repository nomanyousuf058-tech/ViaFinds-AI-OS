import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Re-use credential fetching logic from connections route
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'viafinds-fallback-local-key-32b';
  return crypto.scryptSync(secret, 'salt', 32);
};

const decrypt = (encryptedText: string) => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
};

function getCredentials() {
  const credentialsPath = path.join(process.cwd(), 'data', 'credentials.json');
  if (fs.existsSync(credentialsPath)) {
    const fileContent = fs.readFileSync(credentialsPath, 'utf8');
    try { return JSON.parse(decrypt(fileContent)); } catch { return JSON.parse(fileContent); }
  }
  return {};
}

async function serpapiSearch(query: string): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];
  
  const url = `https://serpapi.com/search?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`;
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.organic_results as Record<string, unknown>[]) || [];
  } catch (e) {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    await adminOnly();
    
    const url = new URL(req.url);
    const search = url.searchParams.get('q') || '';
    
    const credentials = getCredentials();
    const digistoreConfig = credentials['digistore24'];
    
    let products: Record<string, unknown>[] = [];
    
    if (digistoreConfig && digistoreConfig.apiKey && !digistoreConfig.disabled) {
      const provider = new Digistore24Provider(digistoreConfig.apiKey);
      
      try {
        const digiProducts = await provider.discoverProducts(search);
        products = digiProducts.map((p, index) => {
          const baseScore = 95 - (index * 2); 
          const score = Math.max(baseScore, 65);
          
          return {
            id: p.id,
            name: p.name,
            category: 'Digital Products',
            score,
            demand: score > 85 ? 'High' : score > 75 ? 'Medium' : 'Low',
            comp: score > 90 ? 'High' : 'Medium',
            price: `${p.price} ${p.currency}`,
            image: null,
            affiliateUrl: p.affiliateUrl,
            vendor: p.vendorName
          };
        });
      } catch (apiError) {
        // Digistore24 failed, will fall back below
      }
    }
    
    // Fallback to SerpAPI if Digistore24 returned no results
    if (products.length === 0 && search) {
      const searchResults = await serpapiSearch(search);
      products = searchResults.slice(0, 10).map((item: { title?: string, link?: string, snippet?: string }, index: number) => {
        const baseScore = 95 - (index * 2);
        const score = Math.max(baseScore, 65);
        
        return {
          id: `serp-${index}`,
          name: item.title || 'Unknown Product',
          category: 'Web Discovery',
          score,
          demand: score > 85 ? 'High' : score > 75 ? 'Medium' : 'Low',
          comp: 'Medium',
          price: 'N/A',
          image: null,
          affiliateUrl: item.link || '',
          vendor: new URL(item.link || 'https://viafinds.com').hostname.replace('www.', ''),
          source: 'google_search',
          snippet: item.snippet || ''
        };
      });
    }
    
    return NextResponse.json({ products });
    
  } catch (err) {
    if ((err as Error).message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to discover trends', details: (err as Error).message }, { status: 500 });
  }
}
