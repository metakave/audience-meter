import { NextRequest, NextResponse } from 'next/server';
import { Presentation, Participant, ResponseSubmission, Question } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStoreData } from '@/lib/server-store';
import * as XLSX from 'xlsx';

function formatAnswer(q: Question | undefined, rawValue: string): string {
  if (!q || !rawValue) return rawValue || '';

  if (q.type === 'mcq' && q.options) {
    const matched = q.options.find((opt) => opt.id === rawValue);
    if (matched) return matched.text;
  } else if (q.type === 'multiple_choice' && q.options) {
    try {
      const ids: string[] = JSON.parse(rawValue);
      if (Array.isArray(ids)) {
        const labels = ids
          .map((id) => q.options?.find((opt) => opt.id === id)?.text || id)
          .filter(Boolean);
        return labels.join(', ');
      }
    } catch {
      // not JSON array, might be single ID
      const matched = q.options.find((opt) => opt.id === rawValue);
      if (matched) return matched.text;
    }
  } else if (q.type === 'true_false') {
    if (rawValue === 'true') return 'True';
    if (rawValue === 'false') return 'False';
  }

  return rawValue;
}

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
          type: presData.type || (presData.id?.startsWith('survey_') ? 'survey' : 'presentation'),
          description: presData.description || '',
          surveySettings: presData.survey_settings || presData.surveySettings || undefined,
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

  // Fallback or merge with server store
  const store = getStoreData();
  if (!presentation) {
    presentation = store.presentations[code] || null;
  }
  if (responses.length === 0 && (store.responses[code] || []).length > 0) {
    responses = store.responses[code] || [];
  }
  if (participants.length === 0 && (store.participants[code] || []).length > 0) {
    participants = store.participants[code] || [];
  }

  if (!presentation) {
    return new NextResponse('Survey / Presentation not found', { status: 404 });
  }

  const questionMap = new Map(presentation.questions.map((q) => [q.id, q]));

  // Build Respondent Master Directory (merging participants table and distinct response submitters)
  const respondentsMap = new Map<
    string,
    {
      id: string;
      name: string;
      whatsapp: string;
      email: string;
      submittedAt: string;
    }
  >();

  participants.forEach((p) => {
    respondentsMap.set(p.id, {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`.trim() || 'Anonymous',
      whatsapp: p.whatsapp || '',
      email: p.email || '',
      submittedAt: p.joinedAt,
    });
  });

  responses.forEach((r) => {
    if (!respondentsMap.has(r.participantId)) {
      respondentsMap.set(r.participantId, {
        id: r.participantId,
        name: r.participantName || 'Anonymous',
        whatsapp: r.participantWhatsapp || '',
        email: r.participantEmail || '',
        submittedAt: r.createdAt,
      });
    }
  });

  // 1. PRIMARY SHEET: Google Forms Spreadsheet Format (1 row per submission, 1 column per question)
  const gridSheetData: Record<string, any>[] = [];

  Array.from(respondentsMap.values()).forEach((resp, rowIdx) => {
    const userResponses = responses.filter((r) => r.participantId === resp.id);
    const latestTimestamp = userResponses.length > 0
      ? userResponses[userResponses.length - 1].createdAt
      : resp.submittedAt;

    const rowObj: Record<string, any> = {
      'Submission #': rowIdx + 1,
      'Timestamp': new Date(latestTimestamp).toLocaleString(),
      'Respondent Name': resp.name,
      'WhatsApp / Phone': resp.whatsapp || 'N/A',
      'Email Address': resp.email || 'N/A',
    };

    // Columns for each question in the presentation/survey
    presentation.questions.forEach((q, qIdx) => {
      const match = userResponses.find((r) => r.questionId === q.id);
      const colHeader = `Q${qIdx + 1}: ${q.title}`;
      rowObj[colHeader] = match ? formatAnswer(q, match.value) : '';
    });

    gridSheetData.push(rowObj);
  });

  // Fallback empty row if no submissions yet
  if (gridSheetData.length === 0) {
    const emptyRow: Record<string, any> = {
      'Submission #': '',
      'Timestamp': '',
      'Respondent Name': 'No responses submitted yet',
      'WhatsApp / Phone': '',
      'Email Address': '',
    };
    presentation.questions.forEach((q, qIdx) => {
      emptyRow[`Q${qIdx + 1}: ${q.title}`] = '';
    });
    gridSheetData.push(emptyRow);
  }

  // 2. DETAILED SHEET: All Responses Row by Row
  const detailedSheetData = responses.map((r, idx) => {
    const q = questionMap.get(r.questionId);
    return {
      'Record #': idx + 1,
      'Submitted At': new Date(r.createdAt).toLocaleString(),
      'Respondent Name': r.participantName || 'Anonymous',
      'WhatsApp Number': r.participantWhatsapp || 'N/A',
      'Email Address': r.participantEmail || 'N/A',
      'Question Title': q?.title || 'Untitled Question',
      'Question Type': q?.type ? q.type.replace('_', ' ').toUpperCase() : 'UNKNOWN',
      'Answer / Selection': formatAnswer(q, r.value),
    };
  });

  // 3. RESPONDENTS LIST SHEET
  const respondentsSheetData = Array.from(respondentsMap.values()).map((resp, idx) => {
    const answeredCount = responses.filter((r) => r.participantId === resp.id).length;
    return {
      '#': idx + 1,
      'Respondent Name': resp.name,
      'WhatsApp Mobile Number': resp.whatsapp || 'N/A',
      'Email Address': resp.email || 'N/A',
      'First Recorded At': new Date(resp.submittedAt).toLocaleString(),
      'Total Questions Answered': answeredCount,
      'Completion Status': answeredCount >= presentation.questions.length ? 'Completed' : 'Partial',
    };
  });

  // 4. QUESTIONS OVERVIEW & STATS SHEET
  const questionsSheetData = presentation.questions.map((q, idx) => {
    const qResponses = responses.filter((r) => r.questionId === q.id);
    const choices = q.options ? q.options.map((o) => o.text).join(' | ') : 'N/A';

    let statsSummary = `${qResponses.length} answers`;
    if (q.type === 'rating_scale' && qResponses.length > 0) {
      const sum = qResponses.reduce((acc, r) => acc + (parseFloat(r.value) || 0), 0);
      const avg = (sum / qResponses.length).toFixed(1);
      statsSummary += ` (Average: ${avg} / ${q.maxRating || 5})`;
    }

    return {
      'Question #': idx + 1,
      'Question Title': q.title,
      'Question Type': q.type.replace('_', ' ').toUpperCase(),
      'Required': q.required ? 'YES' : 'NO',
      'Choices / Scale': choices,
      'Total Responses Received': qResponses.length,
      'Quick Stats': statsSummary,
    };
  });

  // Build Excel Workbook
  const workbook = XLSX.utils.book_new();

  // Primary Sheet: Form Responses Grid
  const wsGrid = XLSX.utils.json_to_sheet(gridSheetData);
  const gridColWidths = [
    { wch: 14 }, // Submission #
    { wch: 22 }, // Timestamp
    { wch: 25 }, // Respondent Name
    { wch: 20 }, // WhatsApp / Phone
    { wch: 28 }, // Email Address
    ...presentation.questions.map(() => ({ wch: 35 })), // Each Question column
  ];
  wsGrid['!cols'] = gridColWidths;
  XLSX.utils.book_append_sheet(
    workbook,
    wsGrid,
    presentation.type === 'survey' ? 'Survey Responses (Grid)' : 'Form Responses (Grid)'
  );

  // Sheet 2: Detailed Responses
  const wsDetailed = XLSX.utils.json_to_sheet(
    detailedSheetData.length > 0
      ? detailedSheetData
      : [
          {
            'Record #': '',
            'Submitted At': '',
            'Respondent Name': 'No responses yet',
            'WhatsApp Number': '',
            'Email Address': '',
            'Question Title': '',
            'Question Type': '',
            'Answer / Selection': '',
          },
        ]
  );
  wsDetailed['!cols'] = [
    { wch: 10 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 28 },
    { wch: 35 },
    { wch: 18 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsDetailed, 'Detailed Responses');

  // Sheet 3: Respondents Summary
  const wsRespondents = XLSX.utils.json_to_sheet(
    respondentsSheetData.length > 0
      ? respondentsSheetData
      : [
          {
            '#': '',
            'Respondent Name': 'No respondents yet',
            'WhatsApp Mobile Number': '',
            'Email Address': '',
            'First Recorded At': '',
            'Total Questions Answered': 0,
            'Completion Status': '',
          },
        ]
  );
  wsRespondents['!cols'] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 22 },
    { wch: 28 },
    { wch: 22 },
    { wch: 25 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsRespondents, 'Respondents List');

  // Sheet 4: Questions Overview
  const wsQuestions = XLSX.utils.json_to_sheet(questionsSheetData);
  wsQuestions['!cols'] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 20 },
    { wch: 12 },
    { wch: 35 },
    { wch: 25 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsQuestions, 'Questions Summary');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const safeTitle = presentation.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const typeTag = presentation.type === 'survey' ? 'Survey_Responses' : 'Responses';
  const fileName = `${safeTitle}_${code}_${typeTag}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
