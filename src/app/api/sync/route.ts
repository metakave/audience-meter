import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { getStoreData, saveStoreData } from '@/lib/server-store';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const action = searchParams.get('action');

  const supabase = getSupabase();

  if (action === 'list') {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: presList, error } = await supabase
          .from('presentations')
          .select('*')
          .order('created_at', { ascending: false });

        if (presList && !error) {
          // If Supabase has zero presentations on initial launch, auto-seed DEFAULT_PRESENTATIONS
          if (presList.length === 0) {
            for (const defaultPres of DEFAULT_PRESENTATIONS) {
              await supabase.from('presentations').upsert({
                id: defaultPres.id,
                title: defaultPres.title,
                code: defaultPres.code,
                current_question_index: defaultPres.currentQuestionIndex,
                is_live: defaultPres.isLive,
                is_locked: defaultPres.isLocked,
                show_results: defaultPres.showResults,
                questions: defaultPres.questions,
                created_at: defaultPres.createdAt,
                updated_at: new Date().toISOString(),
              });
            }
            return NextResponse.json({ success: true, presentations: DEFAULT_PRESENTATIONS });
          }

          // Fetch participant and response counts
          const { data: participantsData } = await supabase
            .from('participants')
            .select('presentation_id, room_code');
          const { data: responsesData } = await supabase
            .from('responses')
            .select('presentation_id, room_code');

          const partCountMap: Record<string, number> = {};
          (participantsData || []).forEach((p: any) => {
            if (p.presentation_id) partCountMap[p.presentation_id] = (partCountMap[p.presentation_id] || 0) + 1;
            if (p.room_code) partCountMap[p.room_code] = (partCountMap[p.room_code] || 0) + 1;
          });

          const respCountMap: Record<string, number> = {};
          (responsesData || []).forEach((r: any) => {
            if (r.presentation_id) respCountMap[r.presentation_id] = (respCountMap[r.presentation_id] || 0) + 1;
            if (r.room_code) respCountMap[r.room_code] = (respCountMap[r.room_code] || 0) + 1;
          });

          const formatted: Presentation[] = presList.map((p: any) => ({
            id: p.id,
            title: p.title,
            code: p.code,
            currentQuestionIndex: p.current_question_index,
            isLive: p.is_live,
            isLocked: p.is_locked,
            showResults: p.show_results,
            questions: p.questions,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            participantCount: partCountMap[p.id] ?? partCountMap[p.code] ?? 0,
            responseCount: respCountMap[p.id] ?? respCountMap[p.code] ?? 0,
          }));

          return NextResponse.json({ success: true, presentations: formatted });
        }
      } catch (e) {
        console.warn('Supabase list fetch error:', e);
      }
    }

    const store = getStoreData();
    const list = Object.values(store.presentations).map((p) => ({
      ...p,
      participantCount: (store.participants[p.code] || []).length,
      responseCount: (store.responses[p.code] || []).length,
    }));
    return NextResponse.json({ success: true, presentations: list });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
  }

  // Fetch individual presentation
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: pData } = await supabase
        .from('presentations')
        .select('*')
        .eq('code', code)
        .single();

      if (pData) {
        const { count: partCount } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('presentation_id', pData.id);

        const { data: respData } = await supabase
          .from('responses')
          .select('*')
          .eq('presentation_id', pData.id);

        const presentation: Presentation = {
          id: pData.id,
          title: pData.title,
          code: pData.code,
          currentQuestionIndex: pData.current_question_index,
          isLive: pData.is_live,
          isLocked: pData.is_locked,
          showResults: pData.show_results,
          questions: pData.questions,
          createdAt: pData.created_at,
          updatedAt: pData.updated_at,
        };

        const responses: ResponseSubmission[] = (respData || []).map((r: any) => ({
          id: r.id,
          presentationId: r.presentation_id,
          questionId: r.question_id,
          participantId: r.participant_id,
          participantName: r.participant_name,
          participantWhatsapp: r.participant_whatsapp,
          participantEmail: r.participant_email,
          value: r.value,
          createdAt: r.created_at,
        }));

        return NextResponse.json({
          success: true,
          presentation,
          participantCount: partCount || 0,
          responses,
        });
      } else {
        const store = getStoreData();
        const wasDeleted = store.deletedCodes?.includes(code);
        if (!wasDeleted) {
          // Auto-seed into Supabase if it exists in DEFAULT_PRESENTATIONS
          const defaultPres = DEFAULT_PRESENTATIONS.find((dp) => dp.code === code);
          if (defaultPres) {
            try {
              await supabase.from('presentations').upsert({
                id: defaultPres.id,
                title: defaultPres.title,
                code: defaultPres.code,
                current_question_index: defaultPres.currentQuestionIndex,
                is_live: defaultPres.isLive,
                is_locked: defaultPres.isLocked,
                show_results: defaultPres.showResults,
                questions: defaultPres.questions,
                created_at: defaultPres.createdAt,
                updated_at: new Date().toISOString(),
              });
            } catch (e) {
              console.warn('Auto-seed presentation into Supabase failed:', e);
            }

            return NextResponse.json({
              success: true,
              presentation: defaultPres,
              participantCount: 0,
              responses: [],
            });
          }
        }
      }
    } catch (e) {
      console.warn('Supabase fetch presentation failed in GET /api/sync:', e);
    }
  }

  // Fallback to local store
  const store = getStoreData();
  if (store.deletedCodes?.includes(code)) {
    return NextResponse.json({ error: 'Presentation not found' }, { status: 404 });
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

    const supabase = getSupabase();
    const store = getStoreData();

    if (action === 'save_presentation') {
      const presentation: Presentation = body.presentation;

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('presentations').upsert({
            id: presentation.id,
            title: presentation.title,
            code: presentation.code,
            current_question_index: presentation.currentQuestionIndex,
            is_live: presentation.isLive,
            is_locked: presentation.isLocked,
            show_results: presentation.showResults,
            questions: presentation.questions,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Supabase save presentation failed:', e);
        }
      }

      if (store.deletedCodes) {
        store.deletedCodes = store.deletedCodes.filter((c) => c !== code);
      }
      store.presentations[code] = presentation;
      if (!store.participants[code]) store.participants[code] = [];
      if (!store.responses[code]) store.responses[code] = [];
      saveStoreData(store);
      return NextResponse.json({ success: true, presentation });
    }

    if (action === 'join') {
      const participant: Participant = body.participant;

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('participants').upsert({
            id: participant.id,
            presentation_id: participant.presentationId,
            room_code: participant.roomCode,
            first_name: participant.firstName,
            last_name: participant.lastName,
            whatsapp: participant.whatsapp,
            email: participant.email,
            joined_at: participant.joinedAt,
          });
        } catch (e) {
          console.warn('Supabase participant upsert failed:', e);
        }
      }

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

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('responses').upsert(
            {
              id: submission.id,
              presentation_id: submission.presentationId,
              question_id: submission.questionId,
              participant_id: submission.participantId,
              participant_name: submission.participantName,
              participant_whatsapp: submission.participantWhatsapp,
              participant_email: submission.participantEmail,
              value: submission.value,
              created_at: submission.createdAt,
            },
            { onConflict: 'id' }
          );
        } catch (e) {
          console.warn('Supabase response upsert failed:', e);
        }
      }

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
      if (isSupabaseConfigured && supabase) {
        try {
          const dbUpdates: any = { updated_at: new Date().toISOString() };
          if (typeof body.currentQuestionIndex === 'number') {
            dbUpdates.current_question_index = body.currentQuestionIndex;
          }
          if (typeof body.isLocked === 'boolean') {
            dbUpdates.is_locked = body.isLocked;
          }
          if (typeof body.showResults === 'boolean') {
            dbUpdates.show_results = body.showResults;
          }
          await supabase.from('presentations').update(dbUpdates).eq('code', code);
        } catch (e) {
          console.warn('Supabase update slide failed:', e);
        }
      }

      const presentation = store.presentations[code];
      if (presentation) {
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
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'reset_responses') {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('responses').delete().eq('room_code', code);
        } catch (e) {
          console.warn('Supabase reset responses failed:', e);
        }
      }

      store.responses[code] = [];
      saveStoreData(store);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_presentation') {
      const id = body.id;
      if (isSupabaseConfigured && supabase) {
        try {
          if (id) {
            await supabase.from('presentations').delete().eq('id', id);
          }
          await supabase.from('presentations').delete().eq('code', code);
          // Also clean up any orphan participants or responses
          if (id) {
            await supabase.from('participants').delete().eq('presentation_id', id);
            await supabase.from('responses').delete().eq('presentation_id', id);
          }
          await supabase.from('participants').delete().eq('room_code', code);
          await supabase.from('responses').delete().eq('room_code', code);
        } catch (e) {
          console.warn('Supabase delete presentation failed:', e);
        }
      }

      if (!store.deletedCodes) store.deletedCodes = [];
      if (!store.deletedCodes.includes(code)) {
        store.deletedCodes.push(code);
      }
      delete store.presentations[code];
      delete store.participants[code];
      delete store.responses[code];
      saveStoreData(store);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
