import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider';

async function testDigistore24() {
  console.log('Testing Digistore24 API...');
  console.log('API Key:', process.env.Digistore24_API_KEY ? 'SET' : 'NOT SET');
  console.log('Affiliate ID:', process.env.DIGISTORE24_AFFILIATE_ID ? 'SET' : 'NOT SET');
  
  const provider = new Digistore24Provider(process.env.Digistore24_API_KEY || '');
  
  try {
    const connected = await provider.testConnection();
    console.log('Connection test:', connected);
    
    if (connected) {
      // Test with empty query - let's see the raw response
      const searchParams = new URLSearchParams();
      searchParams.append('search', '');
      searchParams.append('limit', '10');
      const url = `https://www.digistore24.com/api/call/listMarketplaceEntries?${searchParams.toString()}`;
      
      console.log('\nFetching raw API response...');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-DS-API-KEY': process.env.Digistore24_API_KEY || '',
          'Accept': 'application/json',
        },
      });
      
      console.log('Response status:', response.status, response.statusText);
      const data = await response.json();
      console.log('Raw response keys:', Object.keys(data));
      console.log('Raw response:', JSON.stringify(data, null, 2).substring(0, 2000));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testDigistore24();