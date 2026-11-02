import { Presentation, Participant, ResponseSubmission, AggregatedResults, Question } from '@/types';
import {
  getSupabase,
  isSupabaseConfigured,
  isSupabaseHealthy,
  reportSupabaseFailure,
  reportSupabaseSuccess,
  withTimeout,
} from './supabase';
import { DEFAULT_PRESENTATIONS } from './default-data';

const LOCAL_STORAGE_KEY_PREFIX = 'audiencemeter_';

export function getLocalParticipant(): { firstName: string; lastName: string; whatsapp: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}participant`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalParticipant(profile: { firstName: string; lastName: string; whatsapp: string; email: string }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}participant`, JSON.stringify(profile));
  } catch {}
}

/**
 * Fetch presentation details by 6-digit room code with fast memory & local cache fallback
 */
export async function fetchPresentation(code: string): Promise<Presentation | null> {
  // 1. Fast in-memory check for default seeded presentations (e.g. SSG HR assessment)
  const defaultMatch = DEFAULT_PRESENTATIONS.find((dp) => dp.code === code);

  // 2. Client-side instant localStorage cache check
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`audiencemeter_survey_${code}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id && Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
          // Revalidate in background without blocking
          fetch(`/api/sync?code=${encodeURIComponent(code)}&survey_only=true`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.presentation) {
                try {
                  localStorage.setItem(`audiencemeter_survey_${code}`, JSON.stringify(data.presentation));
                } catch {}
              }
            })
            .catch(() => {});
          return parsed;
        }
      }
    } catch {}

    if (defaultMatch) {
      // Revalidate in background
      fetch(`/api/sync?code=${encodeURIComponent(code)}&survey_only=true`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.presentation) {
            try {
              localStorage.setItem(`audiencemeter_survey_${code}`, JSON.stringify(data.presentation));
            } catch {}
          }
        })
        .catch(() => {});
      return defaultMatch;
    }
  }

  // 3. Fast sync API call with survey_only=true (skips fetching unnecessary participant/response matrices)
  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}&survey_only=true`);
    if (res.ok) {
      const json = await res.json();
      if (json.presentation) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`audiencemeter_survey_${code}`, JSON.stringify(json.presentation));
          } catch {}
        }
        return json.presentation;
      }
    }
  } catch (err) {
    console.error('API sync fetch error in fetchPresentation:', err);
  }

  // 4. Supabase direct lookup fallback if sync API was unreachable
  const supabase = getSupabase();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('code', code)
        .maybeSingle();
      if (data && !error) {
        const presentation: Presentation = {
          id: data.id,
          title: data.title,
          code: data.code,
          type: data.type || (data.id?.startsWith('survey_') ? 'survey' : 'presentation'),
          description: data.description || '',
          surveySettings: data.survey_settings || data.surveySettings || undefined,
          currentQuestionIndex: data.current_question_index,
          isLive: typeof data.is_live === 'boolean' ? data.is_live : true,
          isLocked: typeof data.is_locked === 'boolean' ? data.is_locked : false,
          lockForwardSlides: typeof data.lock_forward_slides === 'boolean' ? data.lock_forward_slides : false,
          showResults: data.show_results,
          questions: data.questions,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`audiencemeter_survey_${code}`, JSON.stringify(presentation));
          } catch {}
        }
        return presentation;
      }
    } catch (err) {
      console.warn('Supabase fetch failed:', err);
    }
  }

  return defaultMatch || null;
}

/**
 * Fetch full presentation bundle (presentation, responses, participants) in a single parallel round-trip
 */
export async function fetchPresentationBundle(code: string): Promise<{
  presentation: Presentation | null;
  responses: ResponseSubmission[];
  participants: Participant[];
}> {
  const supabase = getSupabase();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: pData } = await supabase
        .from('presentations')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (pData) {
        const [respRes, partRes] = await Promise.all([
          supabase.from('responses').select('*').eq('presentation_id', pData.id).order('created_at', { ascending: false }),
          supabase.from('participants').select('*').eq('presentation_id', pData.id).order('joined_at', { ascending: false }),
        ]);

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

        const responses: ResponseSubmission[] = (respRes.data || []).map((r: any) => ({
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

        const participants: Participant[] = (partRes.data || []).map((p: any) => ({
          id: p.id,
          presentationId: p.presentation_id,
          roomCode: p.room_code,
          firstName: p.first_name,
          lastName: p.last_name,
          whatsapp: p.whatsapp,
          email: p.email,
          joinedAt: p.joined_at,
        }));

        return { presentation, responses, participants };
      }
    } catch (err) {
      console.warn('Supabase fetchPresentationBundle failed, falling back to sync API:', err);
    }
  }

  // Fallback to sync API
  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
    if (res.ok) {
      const json = await res.json();
      return {
        presentation: json.presentation || null,
        responses: json.responses || [],
        participants: json.participants || [],
      };
    }
  } catch (err) {
    console.error('API sync fetch error in bundle:', err);
  }

  return { presentation: null, responses: [], participants: [] };
}

/**
 * Register participant join
 */
export async function registerParticipant(participant: Participant): Promise<boolean> {
  const supabase = getSupabase();
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

  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        code: participant.roomCode,
        participant,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Submit participant answer
 */
export async function submitResponse(submission: ResponseSubmission, roomCode: string): Promise<boolean> {
  const supabase = getSupabase();
  let supabaseSuccess = false;

  if (isSupabaseConfigured && supabase && isSupabaseHealthy()) {
    try {
      const { error } = await withTimeout(
        supabase.from('responses').upsert(
          {
            id: submission.id,
            presentation_id: submission.presentationId,
            room_code: roomCode,
            question_id: submission.questionId,
            participant_id: submission.participantId,
            participant_name: submission.participantName,
            participant_whatsapp: submission.participantWhatsapp,
            participant_email: submission.participantEmail,
            value: submission.value,
            created_at: submission.createdAt,
          },
          { onConflict: 'id' }
        ),
        1800
      );
      if (!error) {
        supabaseSuccess = true;
        reportSupabaseSuccess();
      } else {
        reportSupabaseFailure();
      }
    } catch (e) {
      reportSupabaseFailure();
      console.warn('Supabase response upsert failed:', e);
    }
  }

  // If Supabase was configured and succeeded, avoid redundant secondary write load
  if (supabaseSuccess) {
    return true;
  }

  // Fallback to sync endpoint
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_response',
        code: roomCode,
        submission,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Submit complete survey form (batch participant + all question responses in one go)
 */
export async function submitSurvey(
  participant: Participant,
  submissions: ResponseSubmission[],
  roomCode: string,
  presentation?: Presentation
): Promise<boolean> {
  // 1. Instant client backup to localStorage FIRST (never lose data on crash or reload)
  if (typeof window !== 'undefined') {
    try {
      const backupKey = `audiencemeter_survey_submissions_${roomCode}`;
      const existing = JSON.parse(localStorage.getItem(backupKey) || '[]');
      existing.push({
        participant,
        submissions,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(backupKey, JSON.stringify(existing));
    } catch {}
  }

  const supabase = getSupabase();
  let supabaseSuccess = false;

  // 2. Direct Supabase write with strict timeout & circuit breaker
  if (isSupabaseConfigured && supabase && isSupabaseHealthy()) {
    try {
      await withTimeout(
        (async () => {
          let targetPresId = participant.presentationId;
          const { data: dbPres } = await supabase
            .from('presentations')
            .select('id')
            .eq('code', roomCode)
            .maybeSingle();

          if (dbPres?.id) {
            targetPresId = dbPres.id;
          } else if (presentation) {
            const dbPayload: any = {
              id: presentation.id,
              title: presentation.title,
              code: presentation.code,
              type: presentation.type || (presentation.id?.startsWith('survey_') ? 'survey' : 'presentation'),
              description: presentation.description || '',
              survey_settings: presentation.surveySettings || {},
              current_question_index: presentation.currentQuestionIndex || 0,
              is_live: typeof presentation.isLive === 'boolean' ? presentation.isLive : true,
              is_locked: typeof presentation.isLocked === 'boolean' ? presentation.isLocked : false,
              lock_forward_slides: presentation.lockForwardSlides ?? false,
              show_results: typeof presentation.showResults === 'boolean' ? presentation.showResults : true,
              questions: presentation.questions,
              created_at: presentation.createdAt || new Date().toISOString(),
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
            targetPresId = presentation.id;
          }

          participant.presentationId = targetPresId;
          submissions.forEach((s) => (s.presentationId = targetPresId));

          const partRow = {
            id: participant.id,
            presentation_id: targetPresId,
            room_code: participant.roomCode,
            first_name: participant.firstName,
            last_name: participant.lastName,
            whatsapp: participant.whatsapp,
            email: participant.email,
            joined_at: participant.joinedAt,
          };

          const { error: pErr } = await supabase.from('participants').insert(partRow);
          if (pErr) {
            await supabase.from('participants').upsert(partRow);
          }

          if (submissions.length > 0) {
            const rows = submissions.map((s) => ({
              id: s.id,
              presentation_id: targetPresId,
              room_code: roomCode,
              question_id: s.questionId,
              participant_id: s.participantId,
              participant_name: s.participantName,
              participant_whatsapp: s.participantWhatsapp,
              participant_email: s.participantEmail,
              value: s.value,
              created_at: s.createdAt,
            }));
            const { error: rErr } = await supabase.from('responses').insert(rows);
            if (rErr) {
              const { error: upErr } = await supabase.from('responses').upsert(rows, { onConflict: 'id' });
              if (!upErr) supabaseSuccess = true;
            } else {
              supabaseSuccess = true;
            }
          } else {
            supabaseSuccess = true;
          }
        })(),
        2200
      );
      reportSupabaseSuccess();
    } catch (e) {
      reportSupabaseFailure();
      console.warn('Supabase survey batch submit failed on client:', e);
    }
  }

  // 3. Fallback to API sync (ensures server holds the responses)
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_survey',
        code: roomCode,
        participant,
        submissions,
        presentation,
      }),
    });
    return res.ok || supabaseSuccess;
  } catch {
    return supabaseSuccess || true;
  }
}

/**
 * Update presenter slide state (next, prev, lock, showResults)
 */
export async function updatePresentationState(
  code: string,
  updates: {
    currentQuestionIndex?: number;
    isLocked?: boolean;
    showResults?: boolean;
    isLive?: boolean;
    lockForwardSlides?: boolean;
  }
): Promise<boolean> {
  const supabase = getSupabase();
  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (typeof updates.currentQuestionIndex === 'number') {
        dbUpdates.current_question_index = updates.currentQuestionIndex;
      }
      if (typeof updates.isLocked === 'boolean') {
        dbUpdates.is_locked = updates.isLocked;
      }
      if (typeof updates.isLive === 'boolean') {
        dbUpdates.is_live = updates.isLive;
      }
      if (typeof updates.lockForwardSlides === 'boolean') {
        dbUpdates.lock_forward_slides = updates.lockForwardSlides;
      }
      if (typeof updates.showResults === 'boolean') {
        dbUpdates.show_results = updates.showResults;
      }
      const { error } = await supabase.from('presentations').update(dbUpdates).eq('code', code);
      if (error && error.message?.includes('lock_forward_slides')) {
        delete dbUpdates.lock_forward_slides;
        await supabase.from('presentations').update(dbUpdates).eq('code', code);
      }
    } catch (e) {
      console.warn('Supabase presentation update failed:', e);
    }
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_slide',
        code,
        ...updates,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Save full presentation (create or update)
 */
export async function savePresentation(presentation: Presentation): Promise<boolean> {
  const supabase = getSupabase();
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
        is_live: presentation.isLive,
        is_locked: presentation.isLocked,
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
      console.warn('Supabase presentation upsert failed:', e);
    }
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_presentation',
        code: presentation.code,
        presentation,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Delete a presentation and all associated participants and responses
 */
export async function deletePresentation(id: string, code: string): Promise<boolean> {
  const supabase = getSupabase();
  if (isSupabaseConfigured && supabase) {
    try {
      let targetId = id;
      if (!targetId) {
        const { data: pres } = await supabase
          .from('presentations')
          .select('id')
          .eq('code', code)
          .maybeSingle();
        if (pres?.id) targetId = pres.id;
      }
      if (targetId) {
        await supabase.from('responses').delete().eq('presentation_id', targetId);
        await supabase.from('participants').delete().eq('presentation_id', targetId);
        await supabase.from('presentations').delete().eq('id', targetId);
      }
      await supabase.from('participants').delete().eq('room_code', code);
      await supabase.from('presentations').delete().eq('code', code);
    } catch (e) {
      console.warn('Supabase delete presentation failed:', e);
    }
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_presentation',
        id,
        code,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('API delete presentation error:', err);
    return false;
  }
}

/**
 * Fetch all responses for a presentation
 */
export async function fetchResponses(presentationId: string, roomCode: string): Promise<ResponseSubmission[]> {
  const supabase = getSupabase();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('presentation_id', presentationId);
      if (data && !error) {
        return data.map((r: any) => ({
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
      }
    } catch (e) {
      console.warn('Supabase fetch responses failed:', e);
    }
  }

  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(roomCode)}`);
    if (res.ok) {
      const json = await res.json();
      return json.responses || [];
    }
  } catch {}
  return [];
}

/**
 * Aggregates responses for visualization
 */
export function aggregateQuestionResults(
  question: Question,
  allResponses: ResponseSubmission[]
): AggregatedResults {
  // Ensure strict concurrency safety: de-duplicate responses by participantId, keeping the latest vote
  const participantMap = new Map<string, ResponseSubmission>();
  for (const r of allResponses) {
    if (r.questionId === question.id) {
      participantMap.set(r.participantId, r);
    }
  }
  const responses = Array.from(participantMap.values());
  const total = responses.length;

  if (question.type === 'mcq' || question.type === 'multiple_choice') {
    const counts: Record<string, number> = {};
    question.options?.forEach((opt) => {
      counts[opt.id] = 0;
    });

    responses.forEach((r) => {
      if (question.type === 'mcq') {
        if (counts[r.value] !== undefined) {
          counts[r.value]++;
        }
      } else {
        // multiple_choice
        try {
          const ids: string[] = JSON.parse(r.value);
          if (Array.isArray(ids)) {
            ids.forEach((id) => {
              if (counts[id] !== undefined) counts[id]++;
            });
          }
        } catch {
          if (counts[r.value] !== undefined) counts[r.value]++;
        }
      }
    });

    return {
      questionId: question.id,
      totalResponses: total,
      optionCounts: counts,
    };
  }

  if (question.type === 'short_answer') {
    // Generate word/phrase frequencies for word cloud
    const phraseMap = new Map<string, number>();
    responses.forEach((r) => {
      const trimmed = r.value.trim().toLowerCase();
      if (trimmed) {
        phraseMap.set(trimmed, (phraseMap.get(trimmed) || 0) + 1);
      }
    });

    const wordCloud = Array.from(phraseMap.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count);

    return {
      questionId: question.id,
      totalResponses: total,
      wordCloud,
    };
  }

  if (question.type === 'long_answer') {
    return {
      questionId: question.id,
      totalResponses: total,
      textResponses: responses
        .map((r) => ({
          id: r.id,
          name: r.participantName || 'Anonymous',
          text: r.value,
          createdAt: r.createdAt,
        }))
        .reverse(),
    };
  }

  if (question.type === 'true_false') {
    let trueCount = 0;
    let falseCount = 0;
    responses.forEach((r) => {
      if (r.value === 'true') trueCount++;
      if (r.value === 'false') falseCount++;
    });
    return {
      questionId: question.id,
      totalResponses: total,
      trueFalseCounts: { trueCount, falseCount },
    };
  }

  if (question.type === 'rating_scale') {
    const ratingCounts: Record<number, number> = {};
    const min = question.minRating || 1;
    const max = question.maxRating || 5;
    for (let i = min; i <= max; i++) ratingCounts[i] = 0;

    let sum = 0;
    let count = 0;
    responses.forEach((r) => {
      const val = parseInt(r.value, 10);
      if (!isNaN(val) && val >= min && val <= max) {
        ratingCounts[val] = (ratingCounts[val] || 0) + 1;
        sum += val;
        count++;
      }
    });

    return {
      questionId: question.id,
      totalResponses: total,
      ratingCounts,
      ratingAverage: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
    };
  }

  return {
    questionId: question.id,
    totalResponses: total,
  };
}
