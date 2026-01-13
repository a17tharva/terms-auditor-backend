import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

app = Flask(__name__)
# Enable CORS so your Chrome Extension can talk to this local server
CORS(app) 

# CONFIGURATION
# In a real app, use environment variables for keys!
API_KEY = os.getenv("GENAI_API_KEY") 

genai.configure(api_key=API_KEY)

# We use 'gemini-1.5-flash' because it's fast and has a HUGE context window 
# (it can read that 100k char text easily).
model = genai.GenerativeModel('gemini-flash-latest')

@app.route('/analyze', methods=['POST'])
def analyze_terms():
    data = request.json
    text_content = data.get('text', '')

    if not text_content:
        return jsonify({"error": "No text provided"}), 400

    print(f"Received {len(text_content)} characters. Analyzing...")

    # THE SYSTEM PROMPT
    # This tells the AI exactly how to behave.
    prompt = f"""
    You are an expert legal auditor protecting consumer rights. 
    Analyze the following Terms and Conditions text. 
    Identify up to 4 specific "Red Flags" or suspicious clauses that a user should know about.
    Focus on:
    1. Data privacy violations (selling data).
    2. Hidden fees or aggressive auto-renewals.
    3. Forced arbitration (giving up right to sue).
    4. Intellectual property theft (owning user content).

    Output the result STRICTLY as this JSON format:
    {{
      "risk_score": (integer 1-10, where 10 is very risky),
      "summary": "One sentence summary of the agreement vibe.",
      "red_flags": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
    }}

    If the text is not a legal document, return risk_score: 0 and "Not a legal document" as summary.

    TEXT TO ANALYZE:
    {text_content[:15000]} 
    """ 
    # Note: We slice to 300k chars just to be safe, though Flash can handle more.

    try:
        response = model.generate_content(prompt)
        # Clean up the response to ensure it's valid JSON
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return cleaned_text, 200, {'Content-Type': 'application/json'}
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
