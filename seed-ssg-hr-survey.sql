-- Seed SQL for Supabase SQL Editor:
-- Super Star Group (SSG) - HR AI Literacy & Readiness Assessment Survey Form
-- Code: 774201

INSERT INTO presentations (
  id,
  title,
  code,
  type,
  description,
  survey_settings,
  current_question_index,
  is_live,
  is_locked,
  show_results,
  questions,
  updated_at
) VALUES (
  'ssg-hr-ai-readiness-assessment',
  'SSG HR AI Literacy & Readiness Assessment',
  '774201',
  'survey',
  'Super Star Group (SSG) • Participant questionnaire for the AI workshop by Ulka Ventures.

Please help us understand how HR work is performed today, which activities take the most effort, and where improvements would be most useful. Your responses will shape practical demonstrations and exercises for the upcoming two-day AI Literacy and Readiness Workshop for approximately 30 HR department participants.

Confidentiality Notice: This questionnaire is for workshop planning, not individual performance evaluation. No AI experience is required. Do not include employee names, ID numbers, individual salaries, CVs, medical details, or grievances.',
  '{
    "collectParticipantInfo": true,
    "requireName": false,
    "requireEmail": false,
    "requireWhatsapp": false,
    "isAnonymous": true,
    "thankYouMessage": "Thank you! Your feedback has been recorded and will directly shape practical exercises and demonstrations for the Super Star Group HR AI Workshop.",
    "allowMultipleSubmissions": false,
    "submitButtonText": "Submit Assessment Feedback"
  }'::jsonb,
  0,
  true,
  false,
  false,
  '[
    {
      "id": "ssg-q1",
      "type": "multiple_choice",
      "title": "1. Which employee groups do you support? (Select all that apply)",
      "description": "Select all employee groups that your team handles.",
      "required": true,
      "options": [
        { "id": "g-corp", "text": "Corporate office" },
        { "id": "g-factory", "text": "Factory employees" },
        { "id": "g-sales", "text": "Sales or field teams" },
        { "id": "g-eng", "text": "Engineering or technical teams" },
        { "id": "g-multi", "text": "Multiple groups" },
        { "id": "g-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q2",
      "type": "multiple_choice",
      "title": "2. Which areas are part of your role? (Select all that apply)",
      "description": "Mark all functional areas you are actively involved in.",
      "required": true,
      "options": [
        { "id": "r-recruitment", "text": "Recruitment and onboarding" },
        { "id": "r-attendance", "text": "Attendance and leave" },
        { "id": "r-payroll", "text": "Payroll and benefits" },
        { "id": "r-records", "text": "HR records and operations" },
        { "id": "r-perf", "text": "Performance and talent" },
        { "id": "r-ld", "text": "Learning and development" },
        { "id": "r-er", "text": "Employee relations and compliance" },
        { "id": "r-hris", "text": "HR reporting or HRIS" },
        { "id": "r-planning", "text": "Workforce planning" },
        { "id": "r-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q3",
      "type": "mcq",
      "title": "3. Approximately how many employees does your team support?",
      "description": "Choose one size range.",
      "required": true,
      "options": [
        { "id": "emp-under-100", "text": "Under 100" },
        { "id": "emp-100-499", "text": "100–499" },
        { "id": "emp-500-999", "text": "500–999" },
        { "id": "emp-1000-2499", "text": "1,000–2,499" },
        { "id": "emp-2500-plus", "text": "2,500 or more" },
        { "id": "emp-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q4",
      "type": "long_answer",
      "title": "4. Which tools or systems do you use for your HR activities?",
      "description": "Mention product name where known (or Excel, paper, email, Not used, Not sure) for: HRIS/ERP, Attendance & leave, Payroll, Recruitment, Training, Document storage.",
      "required": false
    },
    {
      "id": "ssg-q5",
      "type": "multiple_choice",
      "title": "5. Where else is HR information maintained? (Select all that apply)",
      "required": true,
      "options": [
        { "id": "loc-excel", "text": "Excel or spreadsheets" },
        { "id": "loc-email", "text": "Email" },
        { "id": "loc-shared", "text": "Shared folders" },
        { "id": "loc-paper", "text": "Paper files" },
        { "id": "loc-local", "text": "Individual computers" },
        { "id": "loc-chat", "text": "Messaging apps" },
        { "id": "loc-none", "text": "No other locations" },
        { "id": "loc-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q6",
      "type": "mcq",
      "title": "6. Which description best matches your everyday HR work?",
      "required": true,
      "options": [
        { "id": "w-paper", "text": "Mostly paper or manual" },
        { "id": "w-digital-manual", "text": "Digital files with manual handling" },
        { "id": "w-hybrid", "text": "Some system workflows and some manual work" },
        { "id": "w-system", "text": "Mostly system based" },
        { "id": "w-integrated", "text": "Integrated systems with substantial automation" }
      ]
    },
    {
      "id": "ssg-q7",
      "type": "mcq",
      "title": "7. How often do you re-enter the same information into different files or systems?",
      "required": true,
      "options": [
        { "id": "re-never", "text": "Never" },
        { "id": "re-rarely", "text": "Rarely" },
        { "id": "re-sometimes", "text": "Sometimes" },
        { "id": "re-often", "text": "Often" },
        { "id": "re-very-often", "text": "Very often" },
        { "id": "re-na", "text": "Not applicable" }
      ]
    },
    {
      "id": "ssg-q8a",
      "type": "rating_scale",
      "title": "8a. Environment Rating: Ease of finding HR information",
      "description": "Rate from 1 (Very poor) to 5 (Very good)",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q8b",
      "type": "rating_scale",
      "title": "8b. Environment Rating: Accuracy and consistency of HR data",
      "description": "Rate from 1 (Very poor) to 5 (Very good)",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q8c",
      "type": "rating_scale",
      "title": "8c. Environment Rating: Connection between HR systems",
      "description": "Rate from 1 (Very poor) to 5 (Very good)",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q8d",
      "type": "rating_scale",
      "title": "8d. Environment Rating: Consistency of processes across locations or units",
      "description": "Rate from 1 (Very poor) to 5 (Very good)",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q8e",
      "type": "rating_scale",
      "title": "8e. Environment Rating: Clarity of process ownership and approvals",
      "description": "Rate from 1 (Very poor) to 5 (Very good)",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q9",
      "type": "multiple_choice",
      "title": "9. Which FIVE activities consume the most of your time? (Select up to 5)",
      "required": true,
      "maxSelections": 5,
      "options": [
        { "id": "t-recruitment", "text": "Recruitment or CV review" },
        { "id": "t-interview", "text": "Interview coordination" },
        { "id": "t-onboarding", "text": "Onboarding" },
        { "id": "t-data-entry", "text": "Employee data entry" },
        { "id": "t-attendance", "text": "Attendance or leave" },
        { "id": "t-payroll", "text": "Payroll or overtime reconciliation" },
        { "id": "t-queries", "text": "Employee queries" },
        { "id": "t-letters", "text": "Letters and certificates" },
        { "id": "t-recurring-reports", "text": "Recurring reports" },
        { "id": "t-presentations", "text": "Management presentations" },
        { "id": "t-perf", "text": "Performance administration" },
        { "id": "t-training-admin", "text": "Training administration" },
        { "id": "t-training-materials", "text": "Training materials" },
        { "id": "t-policies", "text": "Policies or SOPs" },
        { "id": "t-compliance", "text": "Compliance documentation" },
        { "id": "t-er", "text": "Employee relations" },
        { "id": "t-planning", "text": "Workforce planning" },
        { "id": "t-meetings", "text": "Meetings and minutes" },
        { "id": "t-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q10",
      "type": "mcq",
      "title": "10. What share of your working time goes to repetitive administrative tasks?",
      "required": true,
      "options": [
        { "id": "share-under-10", "text": "Under 10%" },
        { "id": "share-10-25", "text": "10–25%" },
        { "id": "share-26-40", "text": "26–40%" },
        { "id": "share-41-60", "text": "41–60%" },
        { "id": "share-over-60", "text": "Over 60%" },
        { "id": "share-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q11",
      "type": "long_answer",
      "title": "11. Which THREE HR processes most need improvement? Briefly name them.",
      "description": "Identify 3 processes where automation or streamlining would make the biggest difference.",
      "required": true
    },
    {
      "id": "ssg-q12",
      "type": "multiple_choice",
      "title": "12. What usually causes delays or rework? (Select up to 5)",
      "required": true,
      "maxSelections": 5,
      "options": [
        { "id": "d-duplicate", "text": "Duplicate data entry" },
        { "id": "d-approvals", "text": "Multiple approvals" },
        { "id": "d-waiting", "text": "Waiting for other departments" },
        { "id": "d-incomplete", "text": "Incomplete information" },
        { "id": "d-disconnected", "text": "Disconnected systems" },
        { "id": "d-paper", "text": "Paper handling" },
        { "id": "d-email", "text": "Email back and forth" },
        { "id": "d-unclear", "text": "Unclear or inconsistent process" },
        { "id": "d-staffing", "text": "Limited staffing" },
        { "id": "d-errors", "text": "Data errors" },
        { "id": "d-skills", "text": "Limited system skills" },
        { "id": "d-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q13",
      "type": "mcq",
      "title": "13. How often do employees ask questions already answered in HR policies or circulars?",
      "required": true,
      "options": [
        { "id": "faq-never", "text": "Never" },
        { "id": "faq-rarely", "text": "Rarely" },
        { "id": "faq-sometimes", "text": "Sometimes" },
        { "id": "faq-often", "text": "Often" },
        { "id": "faq-very-often", "text": "Very often" },
        { "id": "faq-na", "text": "Not applicable" }
      ]
    },
    {
      "id": "ssg-q14",
      "type": "long_answer",
      "title": "14. Which employee group is hardest to serve efficiently, and why?",
      "description": "If none, write None.",
      "required": false
    },
    {
      "id": "ssg-q15",
      "type": "long_answer",
      "title": "15. Where do HR workflows differ between locations or business units?",
      "description": "Give one example, or write Not applicable.",
      "required": false
    },
    {
      "id": "ssg-q16",
      "type": "long_answer",
      "title": "16. Workflow to improve: What is the task, what triggers it, and what is the final output?",
      "description": "Choose ONE high-effort or frustrating task from your role to help build a workshop exercise.",
      "required": true
    },
    {
      "id": "ssg-q17",
      "type": "long_answer",
      "title": "17. What are the main steps today, including systems, handoffs and approvals?",
      "required": false
    },
    {
      "id": "ssg-q18",
      "type": "long_answer",
      "title": "18. How often do you perform this task, and approximate monthly volume?",
      "description": "e.g. Daily / Weekly / Monthly, and approximate number of cases per month.",
      "required": false
    },
    {
      "id": "ssg-q19",
      "type": "long_answer",
      "title": "19. How much effort and waiting time does one case typically require?",
      "description": "Active working time per case, time waiting for approval, other roles involved.",
      "required": false
    },
    {
      "id": "ssg-q20",
      "type": "long_answer",
      "title": "20. What causes the most difficulty, and what happens when it goes wrong?",
      "required": false
    },
    {
      "id": "ssg-q21",
      "type": "long_answer",
      "title": "21. What would a better outcome look like? Include a measurable improvement if possible.",
      "description": "Examples: fewer corrections, faster turnaround, fewer queries, hours saved.",
      "required": false
    },
    {
      "id": "ssg-q22",
      "type": "multiple_choice",
      "title": "22. What would be needed to improve this workflow? (Select all that apply)",
      "required": true,
      "options": [
        { "id": "wf-process", "text": "Clearer process" },
        { "id": "wf-data", "text": "Better data" },
        { "id": "wf-sys-config", "text": "System configuration or integration" },
        { "id": "wf-auto", "text": "Automation" },
        { "id": "wf-ai", "text": "AI assistance" },
        { "id": "wf-training", "text": "Training" },
        { "id": "wf-policy", "text": "Approval or policy change" },
        { "id": "wf-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q23",
      "type": "mcq",
      "title": "23. How much time do you personally spend preparing recurring HR reports?",
      "required": true,
      "options": [
        { "id": "rep-under-1", "text": "Under 1 hour per week" },
        { "id": "rep-1-3", "text": "1–3 hours" },
        { "id": "rep-3-5", "text": "More than 3–5 hours" },
        { "id": "rep-5-10", "text": "More than 5–10 hours" },
        { "id": "rep-over-10", "text": "Over 10 hours" },
        { "id": "rep-na", "text": "Not applicable" }
      ]
    },
    {
      "id": "ssg-q24",
      "type": "multiple_choice",
      "title": "24. Which insights are hardest to obtain when needed? (Select up to 3)",
      "required": true,
      "maxSelections": 3,
      "options": [
        { "id": "ins-headcount", "text": "Headcount" },
        { "id": "ins-turnover", "text": "Turnover" },
        { "id": "ins-absent", "text": "Absenteeism or overtime" },
        { "id": "ins-recruitment", "text": "Recruitment progress or time to hire" },
        { "id": "ins-training", "text": "Training effectiveness" },
        { "id": "ins-skills", "text": "Skills gaps" },
        { "id": "ins-engagement", "text": "Employee engagement" },
        { "id": "ins-costs", "text": "Workforce costs" },
        { "id": "ins-requirements", "text": "Workforce requirements" },
        { "id": "ins-none", "text": "None" },
        { "id": "ins-unsure", "text": "Not sure" },
        { "id": "ins-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q25a",
      "type": "rating_scale",
      "title": "25a. Data Readiness: Records are complete and updated regularly",
      "description": "1 = Strongly disagree to 5 = Strongly agree",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q25b",
      "type": "rating_scale",
      "title": "25b. Data Readiness: Measures have consistent definitions across teams",
      "description": "1 = Strongly disagree to 5 = Strongly agree",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q25c",
      "type": "rating_scale",
      "title": "25c. Data Readiness: I can obtain authorized reports or exports needed",
      "description": "1 = Strongly disagree to 5 = Strongly agree",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q25d",
      "type": "rating_scale",
      "title": "25d. Data Readiness: We know who owns each key dataset and corrects errors",
      "description": "1 = Strongly disagree to 5 = Strongly agree",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q25e",
      "type": "rating_scale",
      "title": "25e. Data Readiness: HR decisions in my area routinely use data",
      "description": "1 = Strongly disagree to 5 = Strongly agree",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q26",
      "type": "long_answer",
      "title": "26. For the workflow you described, what information is needed and where is it held?",
      "description": "Is a fictitious or approved anonymized sample available for a workshop exercise? (Yes / Could be prepared / No / Not sure). Please do not include confidential records.",
      "required": false
    },
    {
      "id": "ssg-q27",
      "type": "multiple_choice",
      "title": "27. What stops you from producing better HR reports or insights? (Select up to 3)",
      "required": true,
      "maxSelections": 3,
      "options": [
        { "id": "bar-missing", "text": "Missing data" },
        { "id": "bar-inconsistent", "text": "Inconsistent data" },
        { "id": "bar-consolidation", "text": "Manual consolidation" },
        { "id": "bar-access", "text": "Access restrictions" },
        { "id": "bar-skills", "text": "Limited analysis skills" },
        { "id": "bar-unclear", "text": "Unclear reporting requirements" },
        { "id": "bar-system", "text": "System limitations" },
        { "id": "bar-none", "text": "No significant barrier" },
        { "id": "bar-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q28",
      "type": "mcq",
      "title": "28. How often do you currently use AI tools for work?",
      "required": true,
      "options": [
        { "id": "ai-never", "text": "Never" },
        { "id": "ai-once-twice", "text": "Tried once or twice" },
        { "id": "ai-monthly", "text": "Monthly" },
        { "id": "ai-weekly", "text": "Weekly" },
        { "id": "ai-daily", "text": "Daily" }
      ]
    },
    {
      "id": "ssg-q29",
      "type": "long_answer",
      "title": "29. Which AI tools do you use, and for what tasks?",
      "description": "If you answered Never, you can write None or leave blank.",
      "required": false
    },
    {
      "id": "ssg-q30a",
      "type": "rating_scale",
      "title": "30a. AI Confidence: Explaining what generative AI can and cannot do",
      "description": "1 = Not at all confident to 5 = Very confident",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q30b",
      "type": "rating_scale",
      "title": "30b. AI Confidence: Writing clear instructions or prompts",
      "description": "1 = Not at all confident to 5 = Very confident",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q30c",
      "type": "rating_scale",
      "title": "30c. AI Confidence: Checking facts and calculations in AI outputs",
      "description": "1 = Not at all confident to 5 = Very confident",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q30d",
      "type": "rating_scale",
      "title": "30d. AI Confidence: Recognizing unfair or biased AI suggestions",
      "description": "1 = Not at all confident to 5 = Very confident",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q30e",
      "type": "rating_scale",
      "title": "30e. AI Confidence: Knowing what information may be shared with an AI tool",
      "description": "1 = Not at all confident to 5 = Very confident",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q30f",
      "type": "rating_scale",
      "title": "30f. AI Confidence: Identifying a suitable AI use case in my work",
      "description": "1 = Not at all confident to 5 = Very confident",
      "required": true,
      "minRating": 1,
      "maxRating": 5
    },
    {
      "id": "ssg-q31",
      "type": "mcq",
      "title": "31. What is your understanding of SSG guidance on AI tools?",
      "required": true,
      "options": [
        { "id": "g-exists-know", "text": "Guidance exists and I understand it" },
        { "id": "g-exists-clarify", "text": "Guidance exists but I need clarification" },
        { "id": "g-not-aware", "text": "I am not aware of any guidance" },
        { "id": "g-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q32",
      "type": "multiple_choice",
      "title": "32. Which issues concern you most about AI? (Select up to 3)",
      "required": true,
      "maxSelections": 3,
      "options": [
        { "id": "con-privacy", "text": "Employee privacy" },
        { "id": "con-confidential", "text": "Confidential information" },
        { "id": "con-incorrect", "text": "Incorrect answers" },
        { "id": "con-unfair", "text": "Unfair recruitment or evaluation" },
        { "id": "con-overreliance", "text": "Overreliance on AI" },
        { "id": "con-accountability", "text": "Lack of accountability" },
        { "id": "con-job-changes", "text": "Job changes" },
        { "id": "con-security", "text": "Security" },
        { "id": "con-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q33",
      "type": "mcq",
      "title": "33. Scenario: An AI tool gives a confident answer about an HR policy without a reliable source. What would you do first?",
      "required": true,
      "options": [
        { "id": "sc1-use", "text": "Use the answer as it is" },
        { "id": "sc1-verify", "text": "Verify it against the approved policy and consult the policy owner if needed" },
        { "id": "sc1-repeat", "text": "Ask the AI to repeat the answer" },
        { "id": "sc1-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q34",
      "type": "mcq",
      "title": "34. Scenario: You want AI to summarize employee CVs. What would you do before uploading any files?",
      "required": true,
      "options": [
        { "id": "sc2-upload-any", "text": "Upload to any available AI tool" },
        { "id": "sc2-check-rules", "text": "Check approved tools, authorization and data handling rules first" },
        { "id": "sc2-remove-names", "text": "Remove names only and assume sharing is safe" },
        { "id": "sc2-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q35",
      "type": "multiple_choice",
      "title": "35. Where would AI assistance be most valuable? (Select up to 5)",
      "required": true,
      "maxSelections": 5,
      "options": [
        { "id": "ast-jd", "text": "Job descriptions and interview questions" },
        { "id": "ast-cv", "text": "CV summaries for human review" },
        { "id": "ast-onboarding", "text": "Onboarding guidance" },
        { "id": "ast-policy-search", "text": "Policy search and employee FAQs" },
        { "id": "ast-letters", "text": "Letters and communications" },
        { "id": "ast-reports", "text": "Reports and spreadsheet analysis" },
        { "id": "ast-attendance", "text": "Attendance or overtime trend analysis" },
        { "id": "ast-training", "text": "Training content" },
        { "id": "ast-surveys", "text": "Employee survey summaries" },
        { "id": "ast-perf", "text": "Performance documentation support" },
        { "id": "ast-planning", "text": "Workforce planning support" },
        { "id": "ast-presentations", "text": "Presentations" },
        { "id": "ast-minutes", "text": "Meeting notes and action items" },
        { "id": "ast-sop", "text": "Policy or SOP drafts" },
        { "id": "ast-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q36",
      "type": "multiple_choice",
      "title": "36. What are your THREE most important improvement outcomes? (Select up to 3)",
      "required": true,
      "maxSelections": 3,
      "options": [
        { "id": "out-admin", "text": "Less administrative work" },
        { "id": "out-recruit", "text": "Faster recruitment" },
        { "id": "out-exp", "text": "Better employee experience" },
        { "id": "out-data", "text": "More reliable data" },
        { "id": "out-rep", "text": "Faster reporting" },
        { "id": "out-analysis", "text": "Better analysis" },
        { "id": "out-errors", "text": "Fewer errors" },
        { "id": "out-approvals", "text": "Faster approvals" },
        { "id": "out-consistent", "text": "More consistent processes" },
        { "id": "out-train", "text": "Better training" },
        { "id": "out-integ", "text": "Better system integration" },
        { "id": "out-other", "text": "Other" }
      ]
    },
    {
      "id": "ssg-q37",
      "type": "multiple_choice",
      "title": "37. What should the workshop emphasize? (Select up to 4)",
      "required": true,
      "maxSelections": 4,
      "options": [
        { "id": "emp-basics", "text": "AI basics and limitations" },
        { "id": "emp-prompts", "text": "Effective prompting" },
        { "id": "emp-check", "text": "Checking AI outputs" },
        { "id": "emp-safe", "text": "Safe data handling" },
        { "id": "emp-writing", "text": "HR writing and communication" },
        { "id": "emp-sheets", "text": "Spreadsheet analysis" },
        { "id": "emp-assistant", "text": "HR knowledge assistants" },
        { "id": "emp-workflow", "text": "Workflow automation" },
        { "id": "emp-pilot", "text": "Selecting practical pilot projects" }
      ]
    },
    {
      "id": "ssg-q38",
      "type": "long_answer",
      "title": "38. What will help you participate in hands-on exercises?",
      "description": "Device available: Laptop / Phone only / Shared laptop. Preferred language: English / Bengali / Both. Approved AI tool access & learning support needed.",
      "required": false
    },
    {
      "id": "ssg-q39",
      "type": "mcq",
      "title": "39. How ready is your team to try a small, supervised AI pilot?",
      "required": true,
      "options": [
        { "id": "pilot-ready", "text": "Ready with an owner and time available" },
        { "id": "pilot-interested", "text": "Interested but needs support" },
        { "id": "pilot-needs-process", "text": "Needs process or data improvements first" },
        { "id": "pilot-not-ready", "text": "Not ready at present" },
        { "id": "pilot-unsure", "text": "Not sure" }
      ]
    },
    {
      "id": "ssg-q40",
      "type": "long_answer",
      "title": "40. By the end of the two days, what ONE task would you like to perform better, and how would you know you had improved?",
      "description": "Describe your priority learning goal for the workshop.",
      "required": true
    }
  ]'::jsonb,
  now()
) ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  survey_settings = EXCLUDED.survey_settings,
  questions = EXCLUDED.questions,
  updated_at = now();
