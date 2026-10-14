import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { getStoreData, saveStoreData } from '@/lib/server-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const action = searchParams.get('action');

  const store = getStoreData();

  if (action === 'list') {
    const list = Object.values(store.presentations);
    return NextResponse.json({ success: true, presentations: list });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
  }

  const presentation = store.presentations[code];
  if (!presentation) {
    return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
  }

  const participants = store.participants[code] || [];
  const responses = store.responses[code] || [];

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

    const store = getStoreData();

    if (action === 'save_presentation') {
      const presentation: Presentation = body.presentation;
      store.presentations[code] = presentation;
      if (!store.participants[code]) store.participants[code] = [];
      if (!store.responses[code]) store.responses[code] = [];
      saveStoreData(store);
      return NextResponse.json({ success: true, presentation });
    }

    if (action === 'join') {
      const participant: Participant = body.participant;
      const list = store.participants[code] || [];
      const existingIdx = list.findIndex((p: Participant) => p.id === participant.id);
      if (existingIdx >= 0) {
        list[existingIdx] = participant;
      } else {
        list.push(participant);
      }
      store.participants[code] = list;
      saveStoreData(store);
      return NextResponse.json({ success: true, participant, count: list.length });
    }

    if (action === 'submit_response') {
      const submission: ResponseSubmission = body.submission;
      const list = store.responses[code] || [];
      const existingIdx = list.findIndex(
        (r: ResponseSubmission) =>
          r.participantId === submission.participantId && r.questionId === submission.questionId
      );
      if (existingIdx >= 0) {
        list[existingIdx] = submission;
      } else {
        list.push(submission);
      }
      store.responses[code] = list;
      saveStoreData(store);
      return NextResponse.json({ success: true, count: list.length });
    }

    if (action === 'update_slide') {
      const presentation = store.presentations[code];
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
      store.presentations[code] = presentation;
      saveStoreData(store);
      return NextResponse.json({ success: true, presentation });
    }

    if (action === 'reset_responses') {
      store.responses[code] = [];
      saveStoreData(store);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
