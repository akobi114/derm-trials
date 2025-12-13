import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// RATE LIMIT SETTINGS: 
// Google Free Tier allows ~15 requests/min. 
// We wait 6 seconds between items to be safe.
const DELAY_MS = 6000;
const BATCH_SIZE = 3;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    console.log("--- 🤖 Gemini Agent (Safe Mode) Starting ---");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite", 
      generationConfig: { responseMimeType: "application/json" }
    });

    // --- 1. FETCH BATCH (UPDATED SAFETY LOGIC) ---
    // We now enforce TWO conditions:
    // 1. simple_summary MUST be null
    // 2. screener_questions MUST be null
    // If either one has data (e.g. you manually added questions), we SKIP it.
    const { data: trials, error } = await supabase
      .from('trials')
      .select('*')
      .is('simple_summary', null)      // Condition 1
      .is('screener_questions', null)  // Condition 2 (Protects your manual edits)
      .limit(BATCH_SIZE); 

    if (error) throw error;
    
    if (!trials || trials.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No completely empty trials found. Your custom edits are safe!", 
        details: [] 
      });
    }

    const results = [];

    for (const [index, trial] of trials.entries()) {
      if (index > 0) {
        console.log(`⏳ Cooling down for ${DELAY_MS/1000}s...`);
        await wait(DELAY_MS); 
      }

      console.log(`Processing: ${trial.nct_id}...`);

      const interventionText = trial.interventions ? JSON.stringify(trial.interventions) : "Not specified";
      const designText = trial.study_design ? JSON.stringify(trial.study_design) : "Not specified";

      const prompt = `
        You are a medical concierge explaining a clinical trial to a patient at an 8th-grade reading level.
        
        --- SOURCE DATA ---
        TITLE: ${trial.title}
        SUMMARY: ${trial.brief_summary}
        TREATMENTS: ${interventionText}
        DESIGN: ${designText}
        ELIGIBILITY: ${trial.inclusion_criteria}

        --- STRICT FORMATTING RULES (For Summary) ---
        1. **NO EXTRA EMOJIS:** ONLY use: 💊, 📅, ⚖️, 👥.
        2. **SPACING IS CRITICAL:** You must put a **DOUBLE LINE BREAK** (use \\n\\n) before EVERY SINGLE EMOJI. 
        3. **NO GREETINGS:** Start directly with the goal.
        4. **THIRD-PERSON ONLY:** Use "Researchers" or "The study."

        --- REQUIRED OUTPUT STRUCTURE (Summary) ---
        [Paragraph 1: The Goal - Start immediately]

        [Double Line Break]

        💊 **Treatment:** [Explain exactly what the patient takes/does]

        [Double Line Break]

        📅 **Frequency:** [How often?]

        [Double Line Break]

        ⚖️ **Placebo:** [Mention if there is a chance of inactive treatment]

        [Double Line Break]

        👥 **Who can join:** [Brief criteria]

        --- TASK 2: COMPREHENSIVE ELIGIBILITY QUIZ ---
        Create a "Yes/No" screening questionnaire.
        1. **Quantity:** Do NOT limit the number of questions.
        2. **Coverage:** Check Age, Condition, and Exclusion criteria.
        3. **Bucket Logic:** Group similar exclusions.
        4. **Correct Answer:** Define the answer required to be ELIGIBLE ("Yes" or "No").

        --- JSON OUTPUT FORMAT ---
        Output a single JSON object:
        {
          "summary": "The full text summary string...",
          "questions": [
            { "question": "Are you at least 18 years old?", "correct_answer": "Yes" },
            ...
          ]
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const aiData = JSON.parse(text);

        await supabase
          .from('trials')
          .update({ 
            simple_summary: aiData.summary,
            screener_questions: aiData.questions,
            last_updated: new Date().toISOString()
          })
          .eq('nct_id', trial.nct_id);

        results.push({ id: trial.nct_id, status: "Success" });

      } catch (err: any) {
        console.error(err);
        if (err.message && err.message.includes('429')) {
             results.push({ id: trial.nct_id, status: "Failed", error: "Rate Limit Hit - Pausing..." });
             break; 
        }
        results.push({ id: trial.nct_id, status: "Failed", error: err.message });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, details: results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}