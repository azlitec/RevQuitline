import { NextRequest, NextResponse } from 'next/server';

/**
 * Patient Vital Signs API has been removed to simplify the patient experience.
 * Returning 404 to indicate the feature is no longer available.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Feature removed: vital signs' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Feature removed: vital signs' }, { status: 404 });
}