import { Presentation, Participant, ResponseSubmission, AggregatedResults, Question } from '@/types';
import { getSupabase, isSupabaseConfigured } from './supabase';

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
 * Fetch presentation details by 6-digit room code
 */
export async function fetchPresentation(code: string): Promise<Presentation | null> {
  const supabase = getSupabase();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('code', code)
        .single();
      if (data && !error) {
        return {
          id: data.id,
          title: data.title,
          code: data.code,
          currentQuestionIndex: data.current_question_index,
          isLive: data.is_live,
          isLocked: data.is_locked,
          showResults: data.show_results,
          questions: data.questions,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to sync API:', err);
    }
  }

  // Fallback to API sync
  try {
    const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
    if (res.ok) {
      const json = await res.json();
      return json.presentation || null;
    }
  } catch (err) {
    console.error('API sync fetch error:', err);
  }
  return null;
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

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('responses').upsert(
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
      if (!error) {
        supabaseSuccess = true;
      }
    } catch (e) {
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
 * Update presenter slide state (next, prev, lock, showResults)
 */
export async function updatePresentationState(
  code: string,
  updates: { currentQuestionIndex?: number; isLocked?: boolean; showResults?: boolean }
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
      if (typeof updates.showResults === 'boolean') {
        dbUpdates.show_results = updates.showResults;
      }
      await supabase.from('presentations').update(dbUpdates).eq('code', code);
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
      if (id) {
        await supabase.from('presentations').delete().eq('id', id);
      }
      await supabase.from('presentations').delete().eq('code', code);
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
