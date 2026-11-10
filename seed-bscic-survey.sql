-- Seed SQL for Supabase SQL Editor:
-- BSCIC Training - Audience Poll
-- সেশন সার্ভে — এআই-সহায়ক বিজ্ঞাপন লেখা ও ক্রিয়েটিভ ডেভেলপমেন্ট
-- Code: 381024

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
  'bscic-training-audience-poll',
  'BSCIC Training - Audience Poll',
  '381024',
  'survey',
  'সেশন সার্ভে — এআই-সহায়ক বিজ্ঞাপন লেখা ও ক্রিয়েটিভ ডেভেলপমেন্ট
বিসিক (BSCIC) প্রশিক্ষণ কর্মসূচি • উদ্যোক্তা জরিপ

আপনার উদ্যোগ ও বিজ্ঞাপন অভিজ্ঞতা সম্পর্কে জানান। আপনার উত্তরের ওপর ভিত্তি করে আজকের সেশনের প্র্যাকটিক্যাল উদাহরণ ও এআই ডেমো সাজানো হবে।',
  '{
    "collectParticipantInfo": false,
    "requireName": true,
    "requireEmail": false,
    "requireWhatsapp": true,
    "isAnonymous": false,
    "thankYouMessage": "ধন্যবাদ! আপনার উত্তর সফলভাবে সংরক্ষিত হয়েছে। এটি আজকের সেশন পরিচালনায় সরাসরি কাজে লাগবে।",
    "allowMultipleSubmissions": true,
    "submitButtonText": "জরিপ জমা দিন"
  }'::jsonb,
  0,
  true,
  false,
  false,
  '[
    {
      "id": "bscic-q-name",
      "type": "short_answer",
      "title": "নাম",
      "description": "আপনার পূর্ণ নাম লিখুন",
      "required": true
    },
    {
      "id": "bscic-q-phone",
      "type": "short_answer",
      "title": "ফোন",
      "description": "আপনার মোবাইল বা হোয়াটসঅ্যাপ নম্বর",
      "required": true
    },
    {
      "id": "bscic-q-business",
      "type": "short_answer",
      "title": "ব্যবসার নাম",
      "description": "আপনার উদ্যোগ বা ব্যবসা প্রতিষ্ঠানের নাম",
      "required": true
    },
    {
      "id": "bscic-q-page",
      "type": "short_answer",
      "title": "FB পেজের নাম",
      "description": "আপনার ফেসবুক পেজের নাম বা লিংক",
      "required": false
    },
    {
      "id": "bscic-q1",
      "type": "mcq",
      "title": "১. আপনি প্রধানত কী বেচেন?",
      "description": "যেকোনো একটি প্রধান ক্যাটাগরি বেছে নিন",
      "required": true,
      "options": [
        { "id": "opt-fashion", "text": "পোশাক ও ফ্যাশন (থ্রি-পিস, শাড়ি, শার্ট, ব্যাগ)" },
        { "id": "opt-food", "text": "খাবার ও হোমমেড (কেক, লাঞ্চ, স্ন্যাকস, মিষ্টি)" },
        { "id": "opt-beauty", "text": "বিউটি ও পার্সোনাল কেয়ার" },
        { "id": "opt-lifestyle", "text": "হোম, লাইফস্টাইল ও ইলেকট্রনিক্স" },
        { "id": "opt-other", "text": "অন্যান্য (সংক্ষিপ্ত উত্তর)" }
      ]
    },
    {
      "id": "bscic-q2",
      "type": "mcq",
      "title": "২. আপনার বিক্রির সবচেয়ে বড় অংশ কোথায় হয়?",
      "description": "যেকোনো একটি বেছে নিন",
      "required": true,
      "options": [
        { "id": "opt-inbox", "text": "ফেসবুক পেজের ইনবক্স (মেসেজে অর্ডার)" },
        { "id": "opt-comment", "text": "ফেসবুক পেজের কমেন্ট" },
        { "id": "opt-website", "text": "নিজের ওয়েবসাইট" },
        { "id": "opt-shop", "text": "ফিজিক্যাল দোকান" },
        { "id": "opt-reseller", "text": "রিসেলার বা পাইকারি" }
      ]
    },
    {
      "id": "bscic-q3",
      "type": "mcq",
      "title": "৩. আপনার পেজের পোস্ট বা বিজ্ঞাপনের লেখা (কপি) কে লেখেন?",
      "description": "যেকোনো একটি বেছে নিন",
      "required": true,
      "options": [
        { "id": "opt-self", "text": "আমি নিজেই লিখি" },
        { "id": "opt-family-staff", "text": "পরিবারের কেউ বা একজন কর্মী" },
        { "id": "opt-agency", "text": "বাইরের ফ্রিল্যান্সার বা এজেন্সি" },
        { "id": "opt-boost-only", "text": "কেউ লেখে না — একটা পোস্ট দিয়ে বুস্ট করে দিই" }
      ]
    },
    {
      "id": "bscic-q4",
      "type": "true_false",
      "title": "৪. গত ৩ মাসে ফেসবুকে পেইড বিজ্ঞাপন (বুস্ট বা Ads Manager) চালিয়েছি।",
      "description": "সত্য অথবা মিথ্যা বেছে নিন",
      "required": true
    },
    {
      "id": "bscic-q5",
      "type": "mcq",
      "title": "৫. মাসে বিজ্ঞাপনে আনুমানিক কত টাকা খরচ হয়?",
      "description": "যেকোনো একটি বেছে নিন",
      "required": true,
      "options": [
        { "id": "opt-under-500", "text": "৫০০ টাকার কম" },
        { "id": "opt-500-2000", "text": "৫০০ – ২,০০০ টাকা" },
        { "id": "opt-2000-5000", "text": "২,০০০ – ৫,০০০ টাকা" },
        { "id": "opt-5000-15000", "text": "৫,০০০ – ১৫,০০০ টাকা" },
        { "id": "opt-over-15000", "text": "১৫,০০০ টাকার বেশি" },
        { "id": "opt-no-ad-spend", "text": "বিজ্ঞাপনে খরচ করি না" }
      ]
    },
    {
      "id": "bscic-q6",
      "type": "true_false",
      "title": "৬. আমি জানি গত মাসে কোন পোস্ট বা বিজ্ঞাপন থেকে কত মেসেজ বা অর্ডার এসেছে।",
      "description": "সত্য অথবা মিথ্যা বেছে নিন",
      "required": true
    },
    {
      "id": "bscic-q7",
      "type": "multiple_choice",
      "title": "৭. বিজ্ঞাপন বা পোস্ট লেখার সময় সবচেয়ে বেশি আটকে যান কোথায়?",
      "description": "সর্বোচ্চ ২টি অপশন বেছে নিতে পারেন",
      "required": true,
      "maxSelections": 2,
      "options": [
        { "id": "opt-first-line", "text": "প্রথম লাইনটা কীভাবে শুরু করব" },
        { "id": "opt-media-creative", "text": "ছবি বা ভিডিও কীভাবে বানাব" },
        { "id": "opt-target-audience", "text": "আমার ক্রেতা ঠিক কে, সেটা পরিষ্কার নয়" },
        { "id": "opt-offer-delivery", "text": "দাম, অফার বা ডেলিভারি কীভাবে বলব" },
        { "id": "opt-make-concise", "text": "লেখাটা ছোট করব কীভাবে" },
        { "id": "opt-understand-results", "text": "ফলাফল বুঝতে পারি না" }
      ]
    },
    {
      "id": "bscic-q8",
      "type": "mcq",
      "title": "৮. এর আগে এআই টুল (ChatGPT, Gemini ইত্যাদি) ব্যবহার করেছেন?",
      "description": "যেকোনো একটি বেছে নিন",
      "required": true,
      "options": [
        { "id": "opt-ai-regular", "text": "হ্যাঁ, নিয়মিত ব্যবহার করি" },
        { "id": "opt-ai-occasional", "text": "মাঝে মাঝে ব্যবহার করি" },
        { "id": "opt-ai-tried-once", "text": "এক-দুবার চেষ্টা করেছি, কাজে লাগেনি" },
        { "id": "opt-ai-never", "text": "কখনো ব্যবহার করিনি" }
      ]
    },
    {
      "id": "bscic-q9",
      "type": "short_answer",
      "title": "৯. কোন এআই টুল ব্যবহার করেন বা নাম শুনেছেন?",
      "description": "সংক্ষিপ্ত উত্তর (এক লাইন) — যেমন: ChatGPT, Gemini ইত্যাদি",
      "required": false
    },
    {
      "id": "bscic-q10",
      "type": "multiple_choice",
      "title": "১০. আজকের সেশনে সবচেয়ে বেশি কী শিখতে চান?",
      "description": "সর্বোচ্চ ২টি অপশন বেছে নিতে পারেন",
      "required": true,
      "maxSelections": 2,
      "options": [
        { "id": "opt-learn-ad-copy", "text": "এআই দিয়ে বিজ্ঞাপনের লেখা (কপি) বানানো" },
        { "id": "opt-learn-hook", "text": "হুক বা প্রথম লাইন লেখা" },
        { "id": "opt-learn-media-ideas", "text": "বিজ্ঞাপনের ছবি বা ভিডিওর আইডিয়া" },
        { "id": "opt-learn-target", "text": "ক্রেতাকে চেনা ও ঠিকভাবে টার্গেট করা" },
        { "id": "opt-learn-metrics", "text": "বিজ্ঞাপনের ফলাফল মাপা" },
        { "id": "opt-learn-budget", "text": "বাজেট কীভাবে ভাগ করব" }
      ]
    },
    {
      "id": "bscic-q11",
      "type": "multiple_choice",
      "title": "১১. এআই দিয়ে বিজ্ঞাপন বানানো নিয়ে আপনার প্রধান দুশ্চিন্তা কী?",
      "description": "সর্বোচ্চ ২টি অপশন বেছে নিতে পারেন",
      "required": true,
      "maxSelections": 2,
      "options": [
        { "id": "opt-concern-wrong-info", "text": "ভুল বা বানানো তথ্য লিখে ফেলবে" },
        { "id": "opt-concern-bangla-quality", "text": "বাংলা ঠিকঠাক আসবে না" },
        { "id": "opt-concern-customer-notice", "text": "কাস্টমার বুঝে ফেলবে যে এআই লিখেছে" },
        { "id": "opt-concern-no-time", "text": "শিখতে সময় লাগবে, আমার হাতে সময় নেই" },
        { "id": "opt-concern-account-block", "text": "অ্যাকাউন্ট ব্লক বা নীতিমালার ঝামেলা" },
        { "id": "opt-concern-none", "text": "এই নিয়ে কোনো দুশ্চিন্তা নেই" }
      ]
    },
    {
      "id": "bscic-q12",
      "type": "short_answer",
      "title": "১২. এক লাইনে বলুন — আপনার বিজ্ঞাপনের সবচেয়ে বড় সমস্যা কী?",
      "description": "সংক্ষিপ্ত উত্তর লিখুন",
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
