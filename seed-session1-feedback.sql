-- Seed SQL for Supabase SQL Editor:
-- এআই-সহায়ক অ্যাড কপি ও ক্রিয়েটিভ ডেভেলপমেন্ট — সেশন ১
-- প্রতিক্রিয়া ও ধারণা যাচাই ফরম
-- Code: 582910

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
  'ai-ad-copy-creative-session-1',
  'এআই-সহায়ক অ্যাড কপি ও ক্রিয়েটিভ ডেভেলপমেন্ট — সেশন ১',
  '582910',
  'presentation',
  'এআই-সহায়ক অ্যাড কপি ও ক্রিয়েটিভ ডেভেলপমেন্ট — সেশন ১
প্রতিক্রিয়া ও ধারণা যাচাই ফরম

আপনার মতামত আমাদের পরের সেশনগুলো আরও কাজে লাগার মতো করতে সাহায্য করবে। সময় লাগবে মাত্র ৩ মিনিট।',
  '{
    "collectParticipantInfo": true,
    "requireName": false,
    "requireEmail": false,
    "requireWhatsapp": false,
    "isAnonymous": false,
    "thankYouMessage": "ধন্যবাদ! আপনার মূল্যবান মতামত সফলভাবে সংরক্ষিত হয়েছে। এটি আমাদের আগামী সেশনগুলো আরও কার্যকর করতে সরাসরি সাহায্য করবে।",
    "allowMultipleSubmissions": true,
    "submitButtonText": "মতামত জমা দিন"
  }'::jsonb,
  0,
  true,
  false,
  true,
  '[
    {
      "id": "session1-q1",
      "type": "mcq",
      "title": "১. ছোট ফেসবুক পেজের বিজ্ঞাপনে সবচেয়ে বেশি বিক্রি হারায় কোথায়?",
      "description": "খণ্ড ক — ধারণা যাচাই (একটি সঠিক উত্তর বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q1-hook", "text": "বিজ্ঞাপনের প্রথম দুই লাইনে" },
        { "id": "q1-photo", "text": "প্রোডাক্টের ছবিতে" },
        { "id": "q1-delivery", "text": "ডেলিভারি চার্জে" },
        { "id": "q1-price", "text": "দাম নির্ধারণে" }
      ]
    },
    {
      "id": "session1-q2",
      "type": "mcq",
      "title": "২. আদর্শ কাস্টমার (ICP) চেনার জন্য স্লাইডে দেওয়া তিনটি শর্ত কোনটি?",
      "description": "খণ্ড ক — ধারণা যাচাই (একটি সঠিক উত্তর বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q2-opt1", "text": "আগ্রহ তৈরি করা যায়, পণ্যটি সত্যিই কাজে লাগে, দাম তার বাজেটের মধ্যে" },
        { "id": "q2-opt2", "text": "বয়স ১৮ থেকে ৪০, বড় শহরে থাকে, ফেসবুকে সক্রিয়" },
        { "id": "q2-opt3", "text": "বেশি ফলোয়ার, বেশি লাইক, বেশি শেয়ার" },
        { "id": "q2-opt4", "text": "পণ্য পছন্দ করে, দাম জানে, রিভিউ পড়ে" }
      ]
    },
    {
      "id": "session1-q3",
      "type": "mcq",
      "title": "৩. AI-এর কাছে প্রম্পট দেওয়ার সময় সবচেয়ে কার্যকর কৌশল কোনটি?",
      "description": "খণ্ড ক — ধারণা যাচাই (একটি সঠিক উত্তর বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q3-ask-questions", "text": "আউটপুট দেওয়ার আগে একে একে প্রশ্ন করতে বলুন" },
        { "id": "q3-long-para", "text": "একটাই লম্বা প্যারায় সব তথ্য লিখে দিন" },
        { "id": "q3-only-english", "text": "সবসময় ইংরেজিতেই লিখুন" },
        { "id": "q3-five-products", "text": "একবারে পাঁচটা প্রোডাক্টের জন্য লিখুন" }
      ]
    },
    {
      "id": "session1-q4",
      "type": "mcq",
      "title": "৪. \"Benefit of benefit\" মানে কী?",
      "description": "খণ্ড ক — ধারণা যাচাই (একটি সঠিক উত্তর বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q4-real-benefit", "text": "সুবিধারও উপরের লাভ — গ্রাহকের জীবনে যে ভালো পরিবর্তন আসে" },
        { "id": "q4-all-features", "text": "পণ্যের সব ফিচার একসাথে বলে দেওয়া" },
        { "id": "q4-discount", "text": "সবচেয়ে বড় ছাড়টা দেখানো" },
        { "id": "q4-competitor", "text": "প্রতিযোগীর সুবিধার সাথে তুলনা করা" }
      ]
    },
    {
      "id": "session1-q5",
      "type": "mcq",
      "title": "৫. স্লাইড অনুযায়ী একটি বিজ্ঞাপনের চারটি লাইনের সঠিক ক্রম কোনটি?",
      "description": "খণ্ড ক — ধারণা যাচাই (একটি সঠিক উত্তর বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q5-hook-benefit-proof-cta", "text": "হুক → বেনিফিট → প্রুফ → সিটিএ (৪০ শব্দের নিচে)" },
        { "id": "q5-hook-price-photo-phone", "text": "হুক → দাম → ছবি → ফোন নম্বর" },
        { "id": "q5-benefit-hook-cta-proof", "text": "বেনিফিট → হুক → সিটিএ → প্রুফ" },
        { "id": "q5-offer-hook-proof-benefit", "text": "অফার → হুক → প্রুফ → বেনিফিট" }
      ]
    },
    {
      "id": "session1-q6",
      "type": "mcq",
      "title": "৬. AI ড্রাফটে নিজে থেকে \"ফ্রি ডেলিভারি\" বা \"প্রিমিয়াম লেদার\" যোগ করে ফেললে আপনার কাজ কী?",
      "description": "খণ্ড ক — ধারণা যাচাই (একটি সঠিক উত্তর বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q6-verify-eliminate", "text": "যাচাই করে বানানো দাবিটা বাদ দেওয়া — আজ সত্য, স্টকে আছে, এক বাক্যে প্রমাণযোগ্য কি না দেখা" },
        { "id": "q6-keep-it", "text": "ওটাই রেখে দেওয়া, কারণ এতে ক্লিক বাড়ে" },
        { "id": "q6-fix-price", "text": "শুধু দামটা ঠিক করে নেওয়া" },
        { "id": "q6-rewrite-all", "text": "পুরো ড্রাফট ফেলে দিয়ে নতুন করে লেখা" }
      ]
    },
    {
      "id": "session1-q7",
      "type": "mcq",
      "title": "৭. সামগ্রিকভাবে আজকের সেশনটি কেমন লেগেছে?",
      "description": "খণ্ড খ — উপস্থাপনার মান (যেকোনো একটি বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q7-excellent", "text": "অসাধারণ — প্রত্যাশার চেয়েও ভালো" },
        { "id": "q7-very-good", "text": "খুব ভালো" },
        { "id": "q7-good", "text": "ভালো" },
        { "id": "q7-average", "text": "মোটামুটি — আরও ভালো হতে পারত" }
      ]
    },
    {
      "id": "session1-q8",
      "type": "mcq",
      "title": "৮. আজকের বিষয়বস্তু আপনার নিজের ব্যবসার সাথে কতটা প্রাসঙ্গিক?",
      "description": "খণ্ড খ — উপস্থাপনার মান (যেকোনো একটি বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q8-full", "text": "পুরোপুরি — আজই কাজে লাগাতে পারব" },
        { "id": "q8-mostly", "text": "বেশিরভাগটাই প্রাসঙ্গিক" },
        { "id": "q8-partially", "text": "কিছু অংশ প্রাসঙ্গিক" },
        { "id": "q8-low", "text": "প্রাসঙ্গিকতা কম" }
      ]
    },
    {
      "id": "session1-q9",
      "type": "mcq",
      "title": "৯. প্রশিক্ষকের ব্যাখ্যা ও বাস্তব উদাহরণ কেমন ছিল?",
      "description": "খণ্ড খ — উপস্থাপনার মান (যেকোনো একটি বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q9-excellent", "text": "অসাধারণ — জটিল বিষয়গুলো সহজ করে বুঝিয়েছেন" },
        { "id": "q9-very-good", "text": "খুব ভালো" },
        { "id": "q9-good", "text": "ভালো" },
        { "id": "q9-average", "text": "মোটামুটি" }
      ]
    },
    {
      "id": "session1-q10",
      "type": "mcq",
      "title": "১০. লাইভ ডেমো ও হাতে-কলমে অংশ কতটা সহায়ক ছিল? (সাধারণ প্রম্পট বনাম ব্রিফ দেওয়া প্রম্পট)",
      "description": "খণ্ড খ — উপস্থাপনার মান (যেকোনো একটি বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q10-very-helpful", "text": "খুবই সহায়ক — নিজে করে দেখার মতো" },
        { "id": "q10-helpful", "text": "সহায়ক" },
        { "id": "q10-okay", "text": "ঠিক আছে" },
        { "id": "q10-need-more", "text": "আরও হাতে-কলমে চর্চা দরকার ছিল" }
      ]
    },
    {
      "id": "session1-q11",
      "type": "mcq",
      "title": "১১. স্লাইডের ভাষা, ডিজাইন ও পড়ার সহজতা কেমন ছিল?",
      "description": "খণ্ড খ — উপস্থাপনার মান (যেকোনো একটি বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q11-very-clear", "text": "খুব সহজ ও পরিষ্কার" },
        { "id": "q11-quite-clear", "text": "বেশ পরিষ্কার" },
        { "id": "q11-okay", "text": "ঠিক আছে" },
        { "id": "q11-heavy", "text": "কোথাও কোথাও ভারী লেগেছে" }
      ]
    },
    {
      "id": "session1-q12",
      "type": "multiple_choice",
      "title": "১২. আজকের সেশনের কোন অংশটি আপনার ব্যবসায় সবচেয়ে বেশি কাজে লাগবে? (একাধিক নির্বাচন করা যাবে)",
      "description": "খণ্ড গ — প্রয়োগ (একাধিক অপশন নির্বাচন করতে পারেন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q12-six-lines-brief", "text": "ছয় লাইনের ব্রিফ তৈরি" },
        { "id": "q12-three-angles", "text": "তিনটি সেলিং অ্যাঙ্গেল — বেনিফিট-লেড, প্রবলেম-সল্যুশন, অফার-লেড" },
        { "id": "q12-five-edits", "text": "রিফাইনের পাঁচটি এডিট" },
        { "id": "q12-media-prompts", "text": "ছবি ও ভিডিওর AI প্রম্পট" },
        { "id": "q12-ten-sec-checks", "text": "১০ সেকেন্ডের ৫ চেক (পাস মার্ক ৫/৫)" }
      ]
    },
    {
      "id": "session1-q13",
      "type": "mcq",
      "title": "১৩. আগামী সাত দিনের মধ্যে নিজের একটি বিজ্ঞাপনে এই পদ্ধতি প্রয়োগ করার আত্মবিশ্বাস কতটা?",
      "description": "খণ্ড গ — প্রয়োগ (যেকোনো একটি বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q13-ready-tomorrow", "text": "পুরোপুরি প্রস্তুত — কালই শুরু করব" },
        { "id": "q13-confident-this-week", "text": "বেশ আত্মবিশ্বাসী — এই সপ্তাহেই করব" },
        { "id": "q13-some-help", "text": "কিছুটা — একটু সহায়তা লাগবে" },
        { "id": "q13-thinking", "text": "এখনো ভাবছি" }
      ]
    },
    {
      "id": "session1-q14",
      "type": "mcq",
      "title": "১৪. এই সেশনটি আপনার পরিচিত কোনো ব্যবসায়ী বন্ধু বা সহকর্মীকে সুপারিশ করার সম্ভাবনা কতটা?",
      "description": "খণ্ড গ — প্রয়োগ (যেকোনো একটি বেছে নিন)",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": true,
      "options": [
        { "id": "q14-definitely", "text": "অবশ্যই সুপারিশ করব" },
        { "id": "q14-likely", "text": "খুব সম্ভবত করব" },
        { "id": "q14-maybe", "text": "হয়তো করব" },
        { "id": "q14-not-sure", "text": "এখনই বলতে পারছি না" }
      ]
    },
    {
      "id": "session1-q15",
      "type": "long_answer",
      "title": "১৫. আজকের সেশন থেকে আপনার সবচেয়ে বড় টেকঅ্যাওয়ে এক লাইনে লিখুন — আর কোন একটা জিনিস আমরা আরও ভালো করতে পারি? (ঐচ্ছিক)",
      "description": "খণ্ড ঘ — আপনার মূল্যবান মতামত বা পরামর্শ লিখুন",
      "showResultsToAudience": true,
      "isLocked": false,
      "required": false
    }
  ]'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  code = EXCLUDED.code,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  survey_settings = EXCLUDED.survey_settings,
  questions = EXCLUDED.questions,
  updated_at = now();
