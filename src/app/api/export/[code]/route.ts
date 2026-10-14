import { NextRequest, NextResponse } from 'next/server';
import { Presentation, ResponseSubmission } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  let presentation: Presentation | null = null;
  let responses: ResponseSubmission[] = [];

  const supabase = getSupabase();

  if (isSupabaseConfigured && supabase) {
    const { data: presData } = await supabase
      .from('presentations')
      .select('*')
      .eq('code', code)
      .single();

    if (presData) {
      presentation = {
        id: presData.id,
        title: presData.title,
        code: presData.code,
        currentQuestionIndex: presData.current_question_index,
        isLive: presData.is_live,
        isLocked: presData.is_locked,
        showResults: presData.show_results,
        questions: presData.questions,
        createdAt: presData.created_at,
        updatedAt: presData.updated_at,
      };

      const { data: respData } = await supabase
        .from('responses')
        .select('*')
        .eq('presentation_id', presData.id);

      if (respData) {
        responses = respData.map((r: any) => ({
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
    }
  }

  // Fallback to in-memory store
  if (!presentation) {
    const globalStore = (global as any).__AUDIENCE_STORE__;
    if (globalStore) {
      presentation = globalStore.presentations.get(code) || null;
      responses = globalStore.responses.get(code) || [];
    }
  }

  if (!presentation) {
    return new NextResponse('Presentation not found', { status: 404 });
  }

  // Map questionId to title & options
  const questionMap = new Map(presentation.questions.map((q) => [q.id, q]));

  // Build CSV
  const headers = [
    'Submitted At',
    'Participant Name',
    'WhatsApp Number',
    'Email Address',
    'Question ID',
    'Question Type',
    'Question Title',
    'Answer / Selection',
  ];

  const escapeCSV = (str: string = '') => {
    const clean = str.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = responses.map((r) => {
    const q = questionMap.get(r.questionId);
    let readableAnswer = r.value;

    if (q) {
      if (q.type === 'mcq' && q.options) {
        const matched = q.options.find((opt) => opt.id === r.value);
        if (matched) readableAnswer = matched.text;
      } else if (q.type === 'multiple_choice' && q.options) {
        try {
          const ids: string[] = JSON.parse(r.value);
          const labels = ids
            .map((id) => q.options?.find((opt) => opt.id === id)?.text || id)
            .filter(Boolean);
          readableAnswer = labels.join(', ');
        } catch {
          readableAnswer = r.value;
        }
      }
    }

    return [
      escapeCSV(new Date(r.createdAt).toLocaleString()),
      escapeCSV(r.participantName),
      escapeCSV(r.participantWhatsapp),
      escapeCSV(r.participantEmail),
      escapeCSV(r.questionId),
      escapeCSV(q?.type || 'unknown'),
      escapeCSV(q?.title || 'Question'),
      escapeCSV(readableAnswer),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audience_responses_${code}_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
