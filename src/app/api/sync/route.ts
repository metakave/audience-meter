import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';

// In-memory global store for fallback / local live testing
// Keyed by presentation code
const globalStore = (global as any).__AUDIENCE_STORE__ || {
  presentations: new Map<string, Presentation>(),
  participants: new Map<string, Participant[]>(),
  responses: new Map<string, ResponseSubmission[]>(),
};

if (!(global as any).__AUDIENCE_STORE__) {
  (global as any).__AUDIENCE_STORE__ = globalStore;
  // Initialize with demo presentation
  for (const pres of DEFAULT_PRESENTATIONS) {
    globalStore.presentations.set(pres.code, pres);
    globalStore.participants.set(pres.code, []);
    globalStore.responses.set(pres.code, []);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const action = searchParams.get('action');

  if (action === 'list') {
    const list = Array.from(globalStore.presentations.values() as IterableIterator<Presentation>);
    return NextResponse.json({ success: true, presentations: list });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
  }

  const presentation = globalStore.presentations.get(code);
  if (!presentation) {
    return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
  }

  const participants = globalStore.participants.get(code) || [];
  const responses = globalStore.responses.get(code) || [];

  return NextResponse.json({
    success: true,
    presentation,
    participantCount: participants.length,
    responses,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    if (action === 'save_presentation') {
      const presentation: Presentation = body.presentation;
      globalStore.presentations.set(code, presentation);
      if (!globalStore.participants.has(code)) globalStore.participants.set(code, []);
      if (!globalStore.responses.has(code)) globalStore.responses.set(code, []);
      return NextResponse.json({ success: true, presentation });
    }

    if (action === 'join') {
      const participant: Participant = body.participant;
      const list = globalStore.participants.get(code) || [];
      const existingIdx = list.findIndex((p: Participant) => p.id === participant.id);
      if (existingIdx >= 0) {
        list[existingIdx] = participant;
      } else {
        list.push(participant);
      }
      globalStore.participants.set(code, list);
      return NextResponse.json({ success: true, participant, count: list.length });
    }

    if (action === 'submit_response') {
      const submission: ResponseSubmission = body.submission;
      const list = globalStore.responses.get(code) || [];
      // Replace existing response if same participant on same question
      const existingIdx = list.findIndex(
        (r: ResponseSubmission) =>
          r.participantId === submission.participantId && r.questionId === submission.questionId
      );
      if (existingIdx >= 0) {
        list[existingIdx] = submission;
      } else {
        list.push(submission);
      }
      globalStore.responses.set(code, list);
      return NextResponse.json({ success: true, count: list.length });
    }

    if (action === 'update_slide') {
      const presentation = globalStore.presentations.get(code);
      if (!presentation) {
        return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
      }
      if (typeof body.currentQuestionIndex === 'number') {
        presentation.currentQuestionIndex = body.currentQuestionIndex;
      }
      if (typeof body.isLocked === 'boolean') {
        presentation.isLocked = body.isLocked;
      }
      if (typeof body.showResults === 'boolean') {
        presentation.showResults = body.showResults;
      }
      presentation.updatedAt = new Date().toISOString();
      globalStore.presentations.set(code, presentation);
      return NextResponse.json({ success: true, presentation });
    }

    if (action === 'reset_responses') {
      globalStore.responses.set(code, []);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
