import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Participant, ResponseSubmission } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStoreData } from '@/lib/server-store';
import * as XLSX from 'xlsx';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  let presentation: Presentation | null = null;
  let responses: ResponseSubmission[] = [];
  let participants: Participant[] = [];

  const supabase = getSupabase();

  if (isSupabaseConfigured && supabase) {
    try {
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

        const { data: partData } = await supabase
          .from('participants')
          .select('*')
          .eq('presentation_id', presData.id);

        if (partData) {
          participants = partData.map((p: any) => ({
            id: p.id,
            presentationId: p.presentation_id,
            roomCode: p.room_code,
            firstName: p.first_name,
            lastName: p.last_name,
            whatsapp: p.whatsapp,
            email: p.email,
            joinedAt: p.joined_at,
          }));
        }
      }
    } catch (e) {
      console.warn('Supabase fetch failed during xlsx export:', e);
    }
  }

  // Fallback to server store
  if (!presentation) {
    const store = getStoreData();
    presentation = store.presentations[code] || null;
    responses = store.responses[code] || [];
    participants = store.participants[code] || [];
  }

  if (!presentation) {
    return new NextResponse('Presentation not found', { status: 404 });
  }

  const questionMap = new Map(presentation.questions.map((q) => [q.id, q]));

  // Sheet 1: All Responses Row by Row
  const responsesSheetData = responses.map((r) => {
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

    return {
      'Submitted At': new Date(r.createdAt).toLocaleString(),
      'Participant Name': r.participantName,
      'WhatsApp Number': r.participantWhatsapp,
      'Email Address': r.participantEmail,
      'Question Title': q?.title || 'Untitled Question',
      'Question Type': q?.type ? q.type.replace('_', ' ').toUpperCase() : 'UNKNOWN',
      'Answer / Selection': readableAnswer,
    };
  });

  // Sheet 2: Registered Participants List
  // If participants array is empty, derive from responses
  const uniqueParticipantsMap = new Map<string, any>();
  participants.forEach((p) => {
    uniqueParticipantsMap.set(p.id, {
      'First Name': p.firstName,
      'Last Name': p.lastName,
      'WhatsApp Mobile Number': p.whatsapp,
      'Email Address': p.email,
      'Joined At': new Date(p.joinedAt).toLocaleString(),
    });
  });

  responses.forEach((r) => {
    if (!uniqueParticipantsMap.has(r.participantId)) {
      const parts = r.participantName.split(' ');
      uniqueParticipantsMap.set(r.participantId, {
        'First Name': parts[0] || r.participantName,
        'Last Name': parts.slice(1).join(' ') || '',
        'WhatsApp Mobile Number': r.participantWhatsapp,
        'Email Address': r.participantEmail,
        'Joined At': new Date(r.createdAt).toLocaleString(),
      });
    }
  });

  const participantsSheetData = Array.from(uniqueParticipantsMap.values()).map((p) => {
    const totalAnswered = responses.filter(
      (r) => r.participantWhatsapp === p['WhatsApp Mobile Number'] || r.participantEmail === p['Email Address']
    ).length;
    return {
      ...p,
      'Total Answers Submitted': totalAnswered,
    };
  });

  // Sheet 3: Questions Overview
  const questionsSheetData = presentation.questions.map((q, idx) => {
    const totalQResponses = responses.filter((r) => r.questionId === q.id).length;
    const choices = q.options ? q.options.map((o) => o.text).join(' | ') : 'N/A';

    return {
      'Slide #': idx + 1,
      'Question Title': q.title,
      'Question Type': q.type.replace('_', ' ').toUpperCase(),
      'Choices / Options': choices,
      'Total Responses Received': totalQResponses,
    };
  });

  // Build Excel Workbook
  const workbook = XLSX.utils.book_new();

  const wsResponses = XLSX.utils.json_to_sheet(
    responsesSheetData.length > 0
      ? responsesSheetData
      : [
          {
            'Submitted At': '',
            'Participant Name': '',
            'WhatsApp Number': '',
            'Email Address': '',
            'Question Title': 'No responses submitted yet',
            'Question Type': '',
            'Answer / Selection': '',
          },
        ]
  );
  XLSX.utils.book_append_sheet(workbook, wsResponses, 'Responses');

  const wsParticipants = XLSX.utils.json_to_sheet(
    participantsSheetData.length > 0
      ? participantsSheetData
      : [
          {
            'First Name': '',
            'Last Name': '',
            'WhatsApp Mobile Number': '',
            'Email Address': '',
            'Joined At': '',
            'Total Answers Submitted': 0,
          },
        ]
  );
  XLSX.utils.book_append_sheet(workbook, wsParticipants, 'Participants List');

  const wsQuestions = XLSX.utils.json_to_sheet(questionsSheetData);
  XLSX.utils.book_append_sheet(workbook, wsQuestions, 'Questions Summary');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const safeTitle = presentation.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const fileName = `${safeTitle}_${code}_Responses_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
