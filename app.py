from flask import Flask, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY_MAIN")
BACKUP_KEY = os.getenv("GEMINI_API_KEY_BACKUP")

# configure the genai client
genai.configure(api_key=GEMINI_KEY)

# serve static files from current directory (index.html, script.js, style.css)
app = Flask(__name__, static_folder=".", static_url_path="")

@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True) or {}
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"reply": "Please enter a message."})

    # Emergency phrases
    emergency_phrases = ["chest pain","shortness of breath","heart attack","stroke"]
    emergency_alert = ""
    if any(p in user_message.lower() for p in emergency_phrases):
        emergency_alert = "⚠️ This seems like a medical emergency. Call local emergency services immediately.\n\n"

    prompt_text = (
        "You are Dr.Chat, a friendly healthcare assistant. "
        "Provide 3 to 5 concise but informative points. Each point should be 1–2 sentences, enough detail to be useful but not a full paragraph. "
        "Use emojis visually. Do NOT use markdown, lists, or bullets. "
        "Always remind the user this is general guidance, not a doctor’s advice."
    )

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content([
            {"role": "user", "parts": [prompt_text]},
            {"role": "user", "parts": [user_message]}
        ])
        generated_reply = response.text.strip() if getattr(response, "text", None) else "Sorry, I couldn’t generate a reply."
        reply = emergency_alert + generated_reply

    except Exception as e:
        # fallback with backup key
        try:
            genai.configure(api_key=BACKUP_KEY)
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content([
                {"role": "user", "parts": [prompt_text]},
                {"role": "user", "parts": [user_message]}
            ])
            generated_reply = response.text.strip() if getattr(response, "text", None) else "Sorry, I couldn’t generate a reply."
            reply = emergency_alert + generated_reply
        except Exception as e2:
            reply = f"Error contacting Gemini API: {e2}"

    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(debug=True, port=5500)
