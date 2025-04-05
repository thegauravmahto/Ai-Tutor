# AI Tutor K12 - MVP Proof-of-Concept 🚀

> A voice-interactive AI tutoring assistant built as a technical proof-of-concept (MVP) to explore capabilities for K-12 learning support.

<!-- Optional: Add a screenshot! -->
<!-- ![AI Tutor K12 Screenshot](link/to/your/screenshot.png) -->
<!-- Instructions:
    1. Take a screenshot of the running application.
    2. Upload the screenshot somewhere accessible (e.g., create an 'assets' folder in your repo, push it, and use the relative path, OR upload to an image hosting service).
    3. Uncomment the line above and replace `link/to/your/screenshot.png` with the actual URL or path. -->

---

## ✨ Key Features Demonstrated

This MVP showcases the integration of several key technologies:

*   🗣️ **Real-time Voice Interaction:** Users can ask questions using their voice, and the AI responds verbally.
    *   _(Tech: Browser Web Speech API for STT/TTS)_
*   🧠 **Conversational AI Core:** Powered by Google's Gemini API (using the fast `gemini-1.5-flash-latest` model for responsiveness) to understand questions and generate tutoring responses.
    *   _(Tech: Google Generative AI API, Python Backend)_
*   🧑‍🏫 **Guided AI Persona:** A **System Prompt** directs the AI to act as a patient, encouraging, and helpful K12 tutor, guiding students rather than just giving answers.
    *   _(Tech: Prompt Engineering within the backend API call)_
*   💾 **Conversation Context/Memory:** The AI remembers the last few turns of the conversation for more relevant and natural follow-up interactions.
    *   _(Tech: Frontend sends recent message history to the backend)_
*   📝 **Client-Side History Persistence:** Chat history is saved in the browser's `localStorage`, allowing users to resume their session after closing/reopening the tab.
    *   _(Tech: JavaScript `localStorage` API - Note: MVP level persistence)_
*   🖥️ **Interactive Transcript UI:** A clean, familiar chat interface displays the conversation history visually. Includes status indicators (Idle, Listening, Thinking, Speaking).
    *   _(Tech: HTML, CSS, JavaScript)_

---

## 🛠️ Technology Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
    *   *APIs:* Web Speech API (SpeechRecognition & SpeechSynthesis), localStorage API
*   **Backend:** Python 3.x
    *   *Framework:* Flask
*   **AI Model:** Google Gemini 1.5 Flash (via REST API)
*   **Environment:** Python Virtual Environment (`venv`)

---

## ⚙️ Setup & Installation

Follow these steps to run the POC locally:

1.  **Clone the Repository (or ensure you have the files):**
    ```bash
    # If you haven't cloned it after renaming on GitHub:
    git clone https://github.com/YourUsername/ai-tutor-k12.git
    cd ai-tutor-k12
    ```

2.  **Create and Activate Virtual Environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    # On Windows use: venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set Up API Key:**
    *   Create a file named `.env` in the root directory (`ai-tutor-k12/`).
    *   Add your Google Gemini API key to it:
        ```plaintext
        GEMINI_API_KEY=YOUR_API_KEY_HERE
        ```
    *   **IMPORTANT:** The `.gitignore` file prevents `.env` from being committed to Git. **Never commit your API keys!**

5.  **Run the Flask Application:**
    ```bash
    python app.py
    # Or: flask run --host=0.0.0.0 --port=3000
    ```

---

## 🚀 Usage

1.  Open your web browser (Chrome/Firefox recommended for Web Speech API support).
2.  Navigate to `http://localhost:3000` (or the address shown in the terminal).
3.  Grant microphone permission when prompted by the browser.
4.  Click the microphone button (it should turn red/indicate listening).
5.  Ask the AI Tutor a question (e.g., "Can you explain photosynthesis?", "What are prime numbers?").
6.  The AI will process your request (status: Thinking), generate a response, and speak it back while displaying it in the chat.
7.  Click the "Clear History" button (trash icon) to erase the conversation saved in your browser.

---

## 🔮 Potential Next Steps (Beyond MVP)

*   Implement server-side database storage for persistent, cross-device chat history.
*   Integrate API response streaming for faster perceived AI response time.
*   Explore more robust cloud-based STT/TTS services for better accuracy/accent handling.
*   Develop specific K12 curriculum modules or guided learning paths.
*   Add user accounts and progress tracking.
*   Refine error handling and UI/UX further.