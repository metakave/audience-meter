import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { getStoreData, saveStoreData } from '@/lib/server-store';
import {
  getSupabase,
  isSupabaseConfigured,
  isSupabaseHealthy,
  reportSupabaseFailure,
  reportSupabaseSuccess,
  withTimeout,
} from '@/lib/supabase';
import { DEFAULT_PRESENTATIONS } from '@/lib/default-data';

async function ensurePresentationInSupabase(
  supabase: any,
  code: string,
  preferredPresentation?: Presentation
): Promise<string | null> {
  try {
    const presRes: any = await withTimeout<any>(
      supabase
        .from('presentations')
        .select('id, code')
        .eq('code', code)
        .maybeSingle(),
      1500
    );
    const dbPres = presRes?.data;

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
      const { error: seedErr } = await withTimeout<any>(
        supabase.from('presentations').upsert(dbPayload),
        1500
      );
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
          await withTimeout<any>(supabase.from('presentations').upsert(dbPayload), 1500);
        }
      }
      return pToSeed.id;
    }
  } catch (err) {
    console.warn('ensurePresentationInSupabase failed or timed out:', err);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const action = searchParams.get('action');

  const supabase = getSupabase();

  if (action === 'list') {
    if (isSupabaseConfigured && supabase && isSupabaseHealthy()) {
      try {
        // Run all list queries concurrently in parallel with 2.2s timeout
        const [presRes, partRes, respRes] = await withTimeout(
          Promise.all([
            supabase
              .from('presentations')
              .select('*')
              .order('created_at', { ascending: false }),
            supabase
              .from('participants')
              .select('id, presentation_id, room_code'),
            supabase
              .from('responses')
              .select('id, presentation_id, participant_id'),
          ]),
          2200
        );

        reportSupabaseSuccess();

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

          // Count unique participants / submissions per presentation
          const partIdMap: Record<string, Set<string>> = {};
          (participantsData || []).forEach((p: any, idx: number) => {
            const pid = p.id || `part_${idx}`;
            if (p.presentation_id) {
              if (!partIdMap[p.presentation_id]) partIdMap[p.presentation_id] = new Set();
              partIdMap[p.presentation_id].add(pid);
            }
            if (p.room_code) {
              if (!partIdMap[p.room_code]) partIdMap[p.room_code] = new Set();
              partIdMap[p.room_code].add(pid);
            }
          });

          // Count responses and unique respondent submissions from responses table
          const respPartIdMap: Record<string, Set<string>> = {};
          const respCountMap: Record<string, number> = {};
          (responsesData || []).forEach((r: any) => {
            if (r.presentation_id) {
              respCountMap[r.presentation_id] = (respCountMap[r.presentation_id] || 0) + 1;
              if (r.participant_id) {
                if (!respPartIdMap[r.presentation_id]) respPartIdMap[r.presentation_id] = new Set();
                respPartIdMap[r.presentation_id].add(r.participant_id);
              }
            }
          });

          const formatted: Presentation[] = presList
            .filter((p: any) => p.code !== '000000' && p.id !== 'archived-sessions')
            .map((p: any) => {
            const partSubmissions = Math.max(
              partIdMap[p.id]?.size || 0,
              partIdMap[p.code]?.size || 0
            );
            const respSubmissions = Math.max(
              respPartIdMap[p.id]?.size || 0,
              respPartIdMap[p.code]?.size || 0
            );
            const storePartCount = (store.participants[p.code] || []).length;
            const storeRespPartCount = new Set((store.responses[p.code] || []).map((r: any) => r.participantId)).size;

            const participantCount = Math.max(partSubmissions, respSubmissions, storePartCount, storeRespPartCount);
            const responseCount = Math.max(
              (respCountMap[p.id] || 0) + (p.id !== p.code ? (respCountMap[p.code] || 0) : 0),
              (store.responses[p.code] || []).length
            );

            return {
              id: p.id,
              title: p.title,
              code: p.code,
              type:
                p.type === 'survey' ||
                p.id?.startsWith('survey_') ||
                p.id?.includes('survey') ||
                p.id?.includes('assessment') ||
                p.id?.includes('poll') ||
                Boolean(p.survey_settings || p.surveySettings)
                  ? 'survey'
                  : 'presentation',
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
              participantCount,
              responseCount,
            };
          });

          return NextResponse.json(
            { success: true, presentations: formatted },
            { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } }
          );
        }
      } catch (e) {
        reportSupabaseFailure();
        console.warn('Supabase list fetch error (circuit-breaker tripped, serving local store):', e);
      }
    }

    const store = getStoreData();
    const list = Object.values(store.presentations).map((p) => {
      const storePartCount = (store.participants[p.code] || []).length;
      const storeRespPartCount = new Set((store.responses[p.code] || []).map((r: any) => r.participantId)).size;
      return {
        ...p,
        participantCount: Math.max(storePartCount, storeRespPartCount),
        responseCount: (store.responses[p.code] || []).length,
      };
    });
    return NextResponse.json(
      { success: true, presentations: list },
      { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } }
    );
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
  }

  const presId = searchParams.get('id');
  const isSurveyOnly = searchParams.get('survey_only') === 'true' || searchParams.get('survey_only') === '1';

  // Fetch individual presentation & responses
  if (isSupabaseConfigured && supabase && isSupabaseHealthy()) {
    try {
      const presPromise = supabase
        .from('presentations')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      let pData: any = null;
      let partData: any[] = [];
      let respData: any[] = [];

      if (isSurveyOnly) {
        const presRes: any = await withTimeout<any>(presPromise, 2200);
        pData = presRes?.data;
        reportSupabaseSuccess();
      } else if (presId) {
        // High-speed parallel indexed execution with 2.2s timeout:
        // - presentations hits idx_presentations_code
        // - participants hits idx_participants_room
        // - responses hits idx_responses_presentation
        const targetIds = presId === code ? [code] : [presId, code];
        const [pRes, partRes, respRes]: any = await withTimeout<any>(
          Promise.all([
            presPromise,
            supabase
              .from('participants')
              .select('*')
              .eq('room_code', code)
              .order('joined_at', { ascending: false }),
            supabase
              .from('responses')
              .select('*')
              .in('presentation_id', targetIds)
              .order('created_at', { ascending: false }),
          ]),
          2200
        );
        pData = pRes?.data;
        partData = partRes?.data || [];
        respData = respRes?.data || [];
        reportSupabaseSuccess();
      } else {
        const presRes: any = await withTimeout<any>(presPromise, 2200);
        pData = presRes?.data;
        if (pData) {
          const targetIds = pData.id === code ? [code] : [pData.id, code];
          const [partRes, respRes]: any = await withTimeout<any>(
            Promise.all([
              supabase
                .from('participants')
                .select('*')
                .eq('room_code', code)
                .order('joined_at', { ascending: false }),
              supabase
                .from('responses')
                .select('*')
                .in('presentation_id', targetIds)
                .order('created_at', { ascending: false }),
            ]),
            2200
          );
          partData = partRes?.data || [];
          respData = respRes?.data || [];
        }
        reportSupabaseSuccess();
      }

      if (pData) {
        const presentation: Presentation = {
          id: pData.id,
          title: pData.title,
          code: pData.code,
          type:
            pData.type === 'survey' ||
            pData.id?.startsWith('survey_') ||
            pData.id?.includes('survey') ||
            pData.id?.includes('assessment') ||
            pData.id?.includes('poll') ||
            Boolean(pData.survey_settings || pData.surveySettings)
              ? 'survey'
              : 'presentation',
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

        // For survey respondents, return presentation immediately without waiting for responses/participants
        if (isSurveyOnly) {
          return NextResponse.json(
            { success: true, presentation },
            { headers: { 'Cache-Control': 'public, s-maxage=4, stale-while-revalidate=15' } }
          );
        }

        const responses: ResponseSubmission[] = respData.map((r: any) => ({
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

        const participants: Participant[] = partData.map((p: any) => ({
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

        // Merge DB and store responses uniquely by id
        const respMap = new Map<string, ResponseSubmission>();
        storeResponses.forEach((r) => respMap.set(r.id, r));
        responses.forEach((r) => respMap.set(r.id, r));
        const finalResponses = Array.from(respMap.values());

        // Merge DB and store participants uniquely by id
        const partMap = new Map<string, Participant>();
        storeParticipants.forEach((p) => partMap.set(p.id, p));
        participants.forEach((p) => partMap.set(p.id, p));
        const finalParticipants = Array.from(partMap.values());

        return NextResponse.json(
          {
            success: true,
            presentation,
            participantCount: Math.max(finalParticipants.length, storeParticipants.length),
            participants: finalParticipants,
            responses: finalResponses,
          },
          { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } }
        );
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

            return NextResponse.json(
              {
                success: true,
                presentation: defaultPres,
                participantCount: 0,
                participants: [],
                responses: [],
              },
              { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15' } }
            );
          }
        }
      }
    } catch (e) {
      reportSupabaseFailure();
      console.warn('Supabase fetch presentation failed in GET /api/sync (circuit breaker tripped):', e);
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

  if (isSurveyOnly) {
    return NextResponse.json(
      { success: true, presentation },
      { headers: { 'Cache-Control': 'public, s-maxage=4, stale-while-revalidate=15' } }
    );
  }

  const participants = store.participants[code] || [];
  const responses = store.responses[code] || [];

  return NextResponse.json(
    {
      success: true,
      presentation,
      participantCount: participants.length,
      participants,
      responses,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=5' } }
  );
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

      // 1. Immediately save into store
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

      // 2. Sync to Supabase with strict timeout
      if (isSupabaseConfigured && supabase && isSupabaseHealthy()) {
        try {
          await withTimeout(
            (async () => {
              const targetPresId =
                (await ensurePresentationInSupabase(supabase, code, body.presentation)) ||
                submission.presentationId;
              const respRow = {
                id: submission.id,
                presentation_id: targetPresId,
                room_code: code,
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
            })(),
            1800
          );
          reportSupabaseSuccess();
        } catch (e) {
          reportSupabaseFailure();
          console.warn('Supabase response upsert failed or timed out:', e);
        }
      }

      return NextResponse.json({ success: true, count: list.length });
    }

    if (action === 'submit_survey') {
      const participant: Participant = body.participant;
      const submissions: ResponseSubmission[] = body.submissions || [];

      // 1. Immediately save participant and responses into store (<1ms, zero timeouts)
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

      // 2. Sync to Supabase with strict timeout
      if (isSupabaseConfigured && supabase && isSupabaseHealthy()) {
        try {
          await withTimeout(
            (async () => {
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
                  room_code: code,
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
            })(),
            2000
          );
          reportSupabaseSuccess();
        } catch (e) {
          reportSupabaseFailure();
          console.warn('Supabase submit_survey batch failed or timed out:', e);
        }
      }

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
      let debugError: any = null;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: pres } = await supabase
            .from('presentations')
            .select('id')
            .eq('code', code)
            .maybeSingle();
          const targetIds = pres?.id ? (pres.id === code ? [code] : [pres.id, code]) : [code];

          const delResp = await supabase.from('responses').delete().in('presentation_id', targetIds);
          const delPart = await supabase.from('participants').delete().in('presentation_id', targetIds);
          const delPartCode = await supabase.from('participants').delete().eq('room_code', code);

          // Disassociate any remaining participants in case of RLS delete restrictions
          await supabase
            .from('participants')
            .update({ room_code: `cleared_${code}` })
            .in('presentation_id', targetIds);

          await supabase
            .from('participants')
            .update({ room_code: `cleared_${code}` })
            .eq('room_code', code);

          debugError = {
            delRespError: delResp.error,
            delPartError: delPart.error,
            delPartCodeError: delPartCode.error,
          };
        } catch (e: any) {
          debugError = e?.message || e;
        }
      }

      store.responses[code] = [];
      store.participants[code] = [];
      saveStoreData(store);
      return NextResponse.json({ success: true, debug: debugError });
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
