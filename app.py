import os
import logging
import json # Needed for parsing history if sent differently
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai

# --- Basic Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()

# --- Flask App Initialization ---
app = Flask(__name__, template_folder='templates', static_folder='static')

# --- Gemini API Configuration ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logging.error("FATAL: GEMINI_API_KEY not found in environment variables.")
    # Consider exiting or raising an error in a real application
    # exit(1)
genai.configure(api_key=api_key)

# --- Model Selection and Configuration ---
MODEL_NAME = "gemini-2.0-flash" # Faster for chat

generation_config = {
    "temperature": 0.75,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 800, # Adjust based on expected response length
    "response_mime_type": "text/plain",
}

safety_settings = [
    # Add settings if needed, e.g.,
    # {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

# Initialize the model (outside of request scope)
try:
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config=generation_config,
        safety_settings=safety_settings
    )
    chat_model = model.start_chat(history=[]) # Use the chat interface
    logging.info(f"Gemini model '{MODEL_NAME}' initialized successfully.")
except Exception as e:
    logging.error(f"FATAL: Error initializing Gemini model: {e}", exc_info=True)
    model = None # Ensure model is None if initialization fails
    chat_model = None

# --- System Prompt ---
# Define it here, but apply it carefully with chat history
SYSTEM_PROMPT_INSTRUCTION = """You are an AI Tutor. Your goal is to help users understand concepts clearly and patiently.
Break down complex ideas. Ask clarifying questions. Be encouraging. Guide towards understanding, don't just give answers.
Keep responses relatively concise and focused unless asked to elaborate. Use simple language."""

# --- Flask Routes ---

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/ask', methods=['POST'])
def ask_ai():
    """Handles user queries, incorporates history, and interacts with Gemini."""
    if not model or not chat_model: # Check if model initialized properly
         logging.error("Model not initialized. Cannot process request.")
         return jsonify({"error": "AI model service unavailable"}), 503

    if not request.is_json:
        logging.warning("Request received is not JSON")
        return jsonify({"error": "Invalid request format: must be JSON"}), 400

    data = request.get_json()
    user_query = data.get('query')
    # History sent from frontend (already formatted for Gemini API)
    # [{role: 'user'/'model', parts: [{text: ...}]}]
    history_context = data.get('history', [])

    if not user_query:
        logging.warning("No 'query' provided in JSON payload")
        return jsonify({"error": "Missing 'query' in request"}), 400

    logging.info(f"Received query: '{user_query}'")
    # logging.debug(f"Received history context: {history_context}") # Uncomment for deep debug

    # --- Construct Prompt with History and System Instruction ---
    # For the chat model, we manage history explicitly.
    # We can prepend a system instruction if the history is empty or periodically.
    # A simple way for POC: Apply system prompt implicitly through initial chat setup if needed,
    # or ensure the history itself guides the model. The Gemini API often handles this well.
    # Let's try sending the history directly.

    # Set the chat model's history for this turn
    # Note: This overwrites previous turns in this specific `chat_model` instance.
    # For persistent server-side chat, you'd manage chat sessions differently.
    temp_chat_session = model.start_chat(history=history_context)

    # Add the system prompt as the very first 'user' turn if context is empty? Risky.
    # Better: Let the history and user query guide it. The model is trained for chat.
    # Optional: Add the system prompt to the generation config or specific API call if available.
    # For now, rely on the model's chat fine-tuning and the history context.

    try:
        # Send the user's *current* query to the chat session
        logging.info(f"Sending to Gemini: '{user_query}'")
        response = temp_chat_session.send_message(
             f"{SYSTEM_PROMPT_INSTRUCTION}\n\nUser Query: {user_query}" # Prepend system prompt to the CURRENT query
        )
        # Alternatively, if the API evolves to explicitly support system prompts in chat:
        # response = temp_chat_session.send_message(user_query, system_instruction=SYSTEM_PROMPT_INSTRUCTION)

        # Extract the text response
        ai_reply = response.text.strip()
        logging.info(f"AI Raw Reply: {ai_reply[:150]}...") # Log start of reply

        # Basic check for empty response which can sometimes happen
        if not ai_reply:
             logging.warning("Received empty text reply from Gemini.")
             # Consider sending a fallback message
             ai_reply = "Sorry, I couldn't generate a response for that."


        return jsonify({"reply": ai_reply})

    except Exception as e:
        logging.error(f"Error during Gemini API call or processing: {e}", exc_info=True)
        # Check for specific Gemini errors if needed (e.g., content blocking)
        error_message = f"AI communication error: {e}"
        if hasattr(e, 'message'): # More specific error message if available
            error_message = e.message
        # Check for safety feedback (content blocking)
        if hasattr(e, 'response') and hasattr(e.response, 'prompt_feedback'):
             feedback = e.response.prompt_feedback
             logging.warning(f"Gemini API call blocked or failed safety check: {feedback}")
             # You might return a specific message based on the block reason
             error_message = "My safety filters prevented processing that request."

        return jsonify({"error": error_message}), 500

# --- Run the Flask App ---
if __name__ == '__main__':
    # Use 0.0.0.0 to make accessible on network (use with caution)
    # Set debug=False for production
    app.run(host='0.0.0.0', port=3000, debug=True)