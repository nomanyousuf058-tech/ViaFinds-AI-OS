import { NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try { await adminOnly(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  // In the current architecture, workflows would need to check a stop signal.
  // We'll write to a simple stop-signal file or state.
  
  try {
    const signalPath = path.join(process.cwd(), 'data', 'stop-signal.json');
    
    if (!fs.existsSync(path.dirname(signalPath))) {
      fs.mkdirSync(path.dirname(signalPath), { recursive: true });
    }
    
    fs.writeFileSync(signalPath, JSON.stringify({ stopRequested: true, timestamp: Date.now() }));

    return NextResponse.json({ success: true, message: 'Graceful stop requested' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to stop sequence', details: (err as Error).message }, { status: 500 });
  }
}

