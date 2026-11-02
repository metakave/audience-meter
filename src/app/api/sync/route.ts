import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { getStoreData, saveStoreData } from '@/lib/server-store';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';

async function ensurePresentationInSupabase(
  supabase: any,
  code: string,
  preferredPresentation?: Presentation
): Promise<string | null> {
  try {
    const { data: dbPres } = await supabase
      .from('presentations')
      .select('id, code')
      .eq('code', code)
      .maybeSingle();

    if (dbPres?.id) {
      return dbPres.id;
    }

    const store = getStoreData();
    const pToSeed =
      preferredPresentation ||
      store.presentations[code] ||
      DEFAULT_PRESENTATIONS.find((dp) => dp.code === code);

    if (pToSeed) {
      const dbPayload: any = {
        id: pToSeed.id,
        title: pToSeed.title,
        code: pToSeed.code,
        type: pToSeed.type || (pToSeed.id?.startsWith('survey_') ? 'survey' : 'presentation'),
        description: pToSeed.description || '',
        survey_settings: pToSeed.surveySettings || {},
        current_question_index: pToSeed.currentQuestionIndex || 0,
        is_live: typeof pToSeed.isLive === 'boolean' ? pToSeed.isLive : true,
        is_locked: typeof pToSeed.isLocked === 'boolean' ? pToSeed.isLocked : false,
        lock_forward_slides: pToSeed.lockForwardSlides ?? false,
        show_results: typeof pToSeed.showResults === 'boolean' ? pToSeed.showResults : true,
        questions: pToSeed.questions || [],
        created_at: pToSeed.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: seedErr } = await supabase.from('presentations').upsert(dbPayload);
      if (seedErr) {
        if (
          seedErr.message?.includes('type') ||
          seedErr.message?.includes('description') ||
          seedErr.message?.includes('survey_settings') ||
          seedErr.message?.includes('lock_forward_slides')
        ) {
          delete dbPayload.type;
          delete dbPayload.description;
          delete dbPayload.survey_settings;
          delete dbPayload.lock_forward_slides;
          await supabase.from('presentations').upsert(dbPayload);
        }
      }
      return pToSeed.id;
    }
  } catch (err) {
    console.warn('ensurePresentationInSupabase failed:', err);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const action = searchParams.get('action');

  const supabase = getSupabase();

  if (action === 'list') {
    if (isSupabaseConfigured && supabase) {
      try {
        // Run all list queries concurrently in parallel
        const [presRes, partRes, respRes] = await Promise.all([
          supabase
            .from('presentations')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('participants')
            .select('presentation_id, room_code'),
          supabase
            .from('responses')
            .select('presentation_id'),
        ]);

        const presList = presRes.data;
        const error = presRes.error;
        const participantsData = partRes.data;
        const responsesData = respRes.data;

        if (presList && !error) {
          // If Supabase has zero presentations on initial launch, auto-seed in parallel
          if (presList.length === 0) {
            await Promise.all(
              DEFAULT_PRESENTATIONS.map((defaultPres) =>
                supabase.from('presentations').upsert({
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
                })
              )
            );
            return NextResponse.json(
              { success: true, presentations: DEFAULT_PRESENTATIONS },
              { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } }
            );
          }

          const partCountMap: Record<string, number> = {};
          (participantsData || []).forEach((p: any) => {
            if (p.presentation_id) partCountMap[p.presentation_id] = (partCountMap[p.presentation_id] || 0) + 1;
            if (p.room_code) partCountMap[p.room_code] = (partCountMap[p.room_code] || 0) + 1;
          });

          const respCountMap: Record<string, number> = {};
          (responsesData || []).forEach((r: any) => {
            if (r.presentation_id) respCountMap[r.presentation_id] = (respCountMap[r.presentation_id] || 0) + 1;
          });

          const formatted: Presentation[] = presList.map((p: any) => ({
            id: p.id,
            title: p.title,
            code: p.code,
            type: p.type || (p.id?.startsWith('survey_') ? 'survey' : 'presentation'),
            description: p.description || '',
            surveySettings: p.survey_settings || p.surveySettings || undefined,
            currentQuestionIndex: p.current_question_index,
            isLive: typeof p.is_live === 'boolean' ? p.is_live : true,
            isLocked: typeof p.is_locked === 'boolean' ? p.is_locked : false,
            lockForwardSlides: typeof p.lock_forward_slides === 'boolean' ? p.lock_forward_slides : false,
            showResults: p.show_results,
            questions: p.questions,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            participantCount: Math.max(partCountMap[p.id] ?? partCountMap[p.code] ?? 0, (store.participants[p.code] || []).length),
            responseCount: Math.max(respCountMap[p.id] ?? 0, (store.responses[p.code] || []).length),
          }));

          return NextResponse.json(
            { success: true, presentations: formatted },
            { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } }
          );
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
    return NextResponse.json(
      { success: true, presentations: list },
      { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } }
    );
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
        const { data: partData } = await supabase
          .from('participants')
          .select('*')
          .eq('presentation_id', pData.id)
          .order('joined_at', { ascending: false });

        const { data: respData } = await supabase
          .from('responses')
          .select('*')
          .eq('presentation_id', pData.id)
          .order('created_at', { ascending: false });

        const presentation: Presentation = {
          id: pData.id,
          title: pData.title,
          code: pData.code,
          type: pData.type || (pData.id?.startsWith('survey_') ? 'survey' : 'presentation'),
          description: pData.description || '',
          surveySettings: pData.survey_settings || pData.surveySettings || undefined,
          currentQuestionIndex: pData.current_question_index,
          isLive: typeof pData.is_live === 'boolean' ? pData.is_live : true,
          isLocked: typeof pData.is_locked === 'boolean' ? pData.is_locked : false,
          lockForwardSlides: typeof pData.lock_forward_slides === 'boolean' ? pData.lock_forward_slides : false,
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

        const participants: Participant[] = (partData || []).map((p: any) => ({
          id: p.id,
          presentationId: p.presentation_id,
          roomCode: p.room_code,
          firstName: p.first_name,
          lastName: p.last_name,
          whatsapp: p.whatsapp,
          email: p.email,
          joinedAt: p.joined_at,
        }));

        // Merge with local store if local store has additional/fallback responses or participants
        const store = getStoreData();
        const storeResponses = store.responses[code] || [];
        const storeParticipants = store.participants[code] || [];

        const finalResponses = responses.length > 0 ? responses : storeResponses;
        const finalParticipants = participants.length > 0 ? participants : storeParticipants;

        return NextResponse.json({
          success: true,
          presentation,
          participantCount: Math.max(finalParticipants.length, storeParticipants.length),
          participants: finalParticipants,
          responses: finalResponses,
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
    participants,
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
          const dbPayload: any = {
            id: presentation.id,
            title: presentation.title,
            code: presentation.code,
            type: presentation.type || (presentation.id?.startsWith('survey_') ? 'survey' : 'presentation'),
            description: presentation.description || '',
            survey_settings: presentation.surveySettings || {},
            current_question_index: presentation.currentQuestionIndex,
            is_live: typeof presentation.isLive === 'boolean' ? presentation.isLive : true,
            is_locked: typeof presentation.isLocked === 'boolean' ? presentation.isLocked : false,
            lock_forward_slides: presentation.lockForwardSlides ?? false,
            show_results: presentation.showResults,
            questions: presentation.questions,
            updated_at: new Date().toISOString(),
          };
          const { error } = await supabase.from('presentations').upsert(dbPayload);
          if (error) {
            if (
              error.message?.includes('type') ||
              error.message?.includes('description') ||
              error.message?.includes('survey_settings') ||
              error.message?.includes('lock_forward_slides')
            ) {
              delete dbPayload.type;
              delete dbPayload.description;
              delete dbPayload.survey_settings;
              delete dbPayload.lock_forward_slides;
              await supabase.from('presentations').upsert(dbPayload);
            }
          }
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
          const targetPresId =
            (await ensurePresentationInSupabase(supabase, code, body.presentation)) ||
            participant.presentationId;
          const partRow = {
            id: participant.id,
            presentation_id: targetPresId,
            room_code: participant.roomCode || code,
            first_name: participant.firstName || '',
            last_name: participant.lastName || '',
            whatsapp: participant.whatsapp || '',
            email: participant.email || '',
            joined_at: participant.joinedAt || new Date().toISOString(),
          };
          const { error: pErr } = await supabase.from('participants').insert(partRow);
          if (pErr) {
            await supabase.from('participants').upsert(partRow);
          }
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
          const targetPresId =
            (await ensurePresentationInSupabase(supabase, code, body.presentation)) ||
            submission.presentationId;
          const respRow = {
            id: submission.id,
            presentation_id: targetPresId,
            question_id: submission.questionId,
            participant_id: submission.participantId,
            participant_name: submission.participantName || '',
            participant_whatsapp: submission.participantWhatsapp || '',
            participant_email: submission.participantEmail || '',
            value: submission.value,
            created_at: submission.createdAt || new Date().toISOString(),
          };
          const { error: rErr } = await supabase.from('responses').insert(respRow);
          if (rErr) {
            await supabase.from('responses').upsert(respRow, { onConflict: 'id' });
          }
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

    if (action === 'submit_survey') {
      const participant: Participant = body.participant;
      const submissions: ResponseSubmission[] = body.submissions || [];

      if (isSupabaseConfigured && supabase) {
        try {
          const targetPresId =
            (await ensurePresentationInSupabase(supabase, code, body.presentation)) ||
            participant?.presentationId;

          if (participant && targetPresId) {
            const partRow = {
              id: participant.id,
              presentation_id: targetPresId,
              room_code: participant.roomCode || code,
              first_name: participant.firstName || '',
              last_name: participant.lastName || '',
              whatsapp: participant.whatsapp || '',
              email: participant.email || '',
              joined_at: participant.joinedAt || new Date().toISOString(),
            };
            const { error: pErr } = await supabase.from('participants').insert(partRow);
            if (pErr) {
              await supabase.from('participants').upsert(partRow);
            }
          }

          if (submissions.length > 0 && targetPresId) {
            const rows = submissions.map((s) => ({
              id: s.id,
              presentation_id: targetPresId,
              question_id: s.questionId,
              participant_id: s.participantId,
              participant_name: s.participantName || '',
              participant_whatsapp: s.participantWhatsapp || '',
              participant_email: s.participantEmail || '',
              value: s.value,
              created_at: s.createdAt || new Date().toISOString(),
            }));
            const { error: rErr } = await supabase.from('responses').insert(rows);
            if (rErr) {
              await supabase.from('responses').upsert(rows, { onConflict: 'id' });
            }
          }
        } catch (e) {
          console.warn('Supabase submit_survey batch failed:', e);
        }
      }

      if (participant) {
        const pList = store.participants[code] || [];
        const existingPIdx = pList.findIndex((p: Participant) => p.id === participant.id);
        if (existingPIdx >= 0) {
          pList[existingPIdx] = participant;
        } else {
          pList.push(participant);
        }
        store.participants[code] = pList;
      }

      const rList = store.responses[code] || [];
      for (const s of submissions) {
        const existingIdx = rList.findIndex(
          (r: ResponseSubmission) =>
            r.participantId === s.participantId && r.questionId === s.questionId
        );
        if (existingIdx >= 0) {
          rList[existingIdx] = s;
        } else {
          rList.push(s);
        }
      }
      store.responses[code] = rList;
      saveStoreData(store);

      return NextResponse.json({ success: true, count: rList.length });
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
          if (typeof body.isLive === 'boolean') {
            dbUpdates.is_live = body.isLive;
          }
          if (typeof body.lockForwardSlides === 'boolean') {
            dbUpdates.lock_forward_slides = body.lockForwardSlides;
          }
          if (typeof body.showResults === 'boolean') {
            dbUpdates.show_results = body.showResults;
          }
          const { error } = await supabase.from('presentations').update(dbUpdates).eq('code', code);
          if (error && error.message?.includes('lock_forward_slides')) {
            delete dbUpdates.lock_forward_slides;
            await supabase.from('presentations').update(dbUpdates).eq('code', code);
          }
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
        if (typeof body.isLive === 'boolean') {
          presentation.isLive = body.isLive;
        }
        if (typeof body.lockForwardSlides === 'boolean') {
          presentation.lockForwardSlides = body.lockForwardSlides;
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
          const { data: pres } = await supabase
            .from('presentations')
            .select('id')
            .eq('code', code)
            .maybeSingle();
          if (pres?.id) {
            await supabase.from('responses').delete().eq('presentation_id', pres.id);
          }
        } catch (e) {
          console.warn('Supabase reset responses failed:', e);
        }
      }

      store.responses[code] = [];
      saveStoreData(store);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_presentation') {
      let id = body.id;
      if (isSupabaseConfigured && supabase) {
        try {
          if (!id) {
            const { data: pres } = await supabase
              .from('presentations')
              .select('id')
              .eq('code', code)
              .maybeSingle();
            if (pres?.id) id = pres.id;
          }
          if (id) {
            await supabase.from('responses').delete().eq('presentation_id', id);
            await supabase.from('participants').delete().eq('presentation_id', id);
            await supabase.from('presentations').delete().eq('id', id);
          }
          await supabase.from('participants').delete().eq('room_code', code);
          await supabase.from('presentations').delete().eq('code', code);
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
