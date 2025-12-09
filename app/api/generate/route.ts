import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// FAST LANE: Wait 2 seconds between items
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    console.log("--- 🤖 Gemini Agent (Comprehensive Screener) Starting ---");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Configure model to output JSON directly
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const { data: trials, error } = await supabase
      .from('trials')
      .select('*')
      .or('simple_summary.is.null,screener_questions.is.null') 
      .limit(5); 

    if (error) throw error;
    if (!trials || trials.length === 0) return NextResponse.json({ message: "No trials need processing." });

    const results = [];

    for (const [index, trial] of trials.entries()) {
      if (index > 0) {
        console.log("⏳ Cooling down...");
        await delay(2000); 
      }

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
           - 💊 Treatment... [Enter][Enter]
           - 📅 Frequency... [Enter][Enter]
           - ⚖️ Placebo... [Enter][Enter]
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
        
        1. **Quantity:** Do NOT limit the number of questions. Generate as many as necessary to accurately cover the Inclusion and Exclusion criteria.
        2. **Coverage:** - Must check Age range.
           - Must check the specific Condition (e.g. "Do you have acne scars?").
           - Must check ALL major Exclusion criteria (e.g., pregnancy, specific medications, conflicting diseases).
        3. **Bucket Logic:** Group long lists of similar exclusions into single questions to keep it readable (e.g., "Do you have a history of keloids, psoriasis, or eczema?" instead of 3 questions).
        4. **Correct Answer:** Define the answer required to be ELIGIBLE ("Yes" or "No").

        --- JSON OUTPUT FORMAT ---
        Output a single JSON object:
        {
          "summary": "The full text summary string with \\n\\n double breaks...",
          "questions": [
            { "question": "Are you at least 18 years old?", "correct_answer": "Yes" },
            { "question": "Do you have active acne?", "correct_answer": "No" }
            ... (Add as many as needed)
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
            screener_questions: aiData.questions 
          })
          .eq('nct_id', trial.nct_id);

        results.push({ id: trial.nct_id, status: "Success" });

      } catch (err: any) {
        console.error(err);
        if (err.message.includes('429')) {
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