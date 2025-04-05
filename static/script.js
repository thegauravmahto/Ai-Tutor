document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const recordButton = document.getElementById('recordButton');
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    const messageList = document.getElementById('message-list');
    const chatWindow = document.querySelector('.chat-window');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');

    // --- App State ---
    let isListening = false;
    let isThinking = false;
    let isSpeaking = false;
    let chatHistory = []; // In-memory representation of chat

    // --- API & Config ---
    const BACKEND_URL = '/api/ask';
    const CHAT_HISTORY_KEY = 'aiTutorChatHistory_v2'; // Use a new key if format changes

    // --- Speech Recognition Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
    } else {
        console.error("Speech Recognition not supported by this browser.");
        updateUIState('error', 'Speech recognition not supported.');
        if(recordButton) recordButton.disabled = true;
        if(clearHistoryButton) clearHistoryButton.disabled = true;
    }

    // --- Speech Synthesis Setup ---
    const speechSynthesis = window.speechSynthesis;

    // ========================================================================
    //  UI Update Function
    // ========================================================================
    function updateUIState(state, message = null) {
        if (!statusIndicator || !statusText || !recordButton || !clearHistoryButton) {
            console.error("UI elements not found for state update.");
            return;
        }

        statusIndicator.className = `status status-${state}`; // Update class for styling

        switch (state) {
            case 'idle':
                statusText.textContent = message || 'Idle';
                recordButton.disabled = !recognition; // Disable if no recognition support
                recordButton.classList.remove('is-listening');
                clearHistoryButton.disabled = chatHistory.length === 0;
                isListening = false;
                isThinking = false;
                isSpeaking = false;
                break;
            case 'listening':
                statusText.textContent = message || 'Listening...';
                recordButton.disabled = false; // Still clickable to stop
                recordButton.classList.add('is-listening');
                clearHistoryButton.disabled = true;
                isListening = true;
                isThinking = false;
                isSpeaking = false;
                break;
            case 'thinking':
                statusText.textContent = message || 'Thinking...';
                recordButton.disabled = true;
                recordButton.classList.remove('is-listening');
                clearHistoryButton.disabled = true;
                isListening = false;
                isThinking = true;
                isSpeaking = false;
                break;
            case 'speaking':
                statusText.textContent = message || 'Speaking...';
                recordButton.disabled = true; // Prevent recording while speaking
                recordButton.classList.remove('is-listening'); // Ensure listening style removed
                clearHistoryButton.disabled = true;
                isListening = false;
                isThinking = false;
                isSpeaking = true;
                break;
            case 'error':
                statusText.textContent = `Error: ${message || 'Unknown error'}`;
                 recordButton.disabled = !recognition; // Allow retry if possible
                 recordButton.classList.remove('is-listening');
                clearHistoryButton.disabled = chatHistory.length === 0;
                isListening = false;
                isThinking = false;
                isSpeaking = false;
                break;
        }
         // console.log("UI State Updated:", state, message); // Debug log
    }


    // ========================================================================
    //  Scrolling Helper
    // ========================================================================
    function scrollToBottom() {
        if (!chatWindow) return;
        // Needs a slight delay sometimes for the DOM to update height fully
        setTimeout(() => {
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }, 50); // Short delay
    }


    // ========================================================================
    //  Chat History Management (localStorage)
    // ========================================================================
    function loadHistory() {
        if (!messageList || !clearHistoryButton) {
             console.error("Message list or clear button not found during history load.");
             return;
        }

        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        messageList.innerHTML = ''; // Clear visual list
        chatHistory = []; // Clear in-memory list

        let historyLoaded = false;
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    chatHistory = parsed;
                    // Add messages using the CORRECTED function below
                    chatHistory.forEach(msg => addMessageToDOM(msg.sender, msg.text, false, true)); // Add without saving, mark as history loading
                    historyLoaded = true;
                } else if (Array.isArray(parsed) && parsed.length === 0) {
                    // History exists but is empty
                    historyLoaded = false;
                 } else {
                    console.warn("Invalid history format found in localStorage.");
                    localStorage.removeItem(CHAT_HISTORY_KEY);
                }
            } catch (e) {
                console.error("Error parsing chat history:", e);
                localStorage.removeItem(CHAT_HISTORY_KEY);
            }
        }

        // Add welcome message ONLY if no valid history was loaded
        if (!historyLoaded) {
            const welcomeMsg = { sender: 'ai', text: "Hello! I'm ready to help. Click the microphone to ask a question." };
            addMessageToDOM(welcomeMsg.sender, welcomeMsg.text, true); // Add visually, mark as welcome
        }

        scrollToBottom(); // Scroll after loading everything
        updateUIState('idle'); // Set initial state
        clearHistoryButton.disabled = chatHistory.length === 0; // Ensure clear button state is correct
    }

    function saveHistory() {
        try {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
            if (clearHistoryButton) clearHistoryButton.disabled = chatHistory.length === 0; // Update clear button state
        } catch (e) {
            console.error("Error saving chat history:", e);
            // Maybe notify user if storage is full?
        }
    }

    function clearHistory() {
        if (confirm("Are you sure you want to clear the chat history?")) {
             // Cancel any ongoing speech/recognition
             if (isListening && recognition) recognition.abort(); // Use abort() to stop immediately
             if (isSpeaking && speechSynthesis) speechSynthesis.cancel();

            localStorage.removeItem(CHAT_HISTORY_KEY);
            loadHistory(); // Reload to show empty state & scroll correctly
            console.log("Chat history cleared.");
            updateUIState('idle', 'History Cleared'); // Update status message
        }
    }

    // ========================================================================
    //  Adding Messages (DOM & History)
    // ========================================================================
    function addMessage(sender, text, isWelcome = false) {
         // 1. Add to DOM
        addMessageToDOM(sender, text, isWelcome);

        // 2. Add to in-memory history (unless it's the non-persistent welcome message)
        if (!isWelcome) {
            // Avoid adding duplicate errors or system messages if needed
            chatHistory.push({ sender, text });
             // 3. Save updated history to localStorage
            saveHistory();
        }
    }


    // isHistoryLoad flag prevents scrolling on each message during initial bulk load
    function addMessageToDOM(sender, text, isWelcome = false, isHistoryLoad = false) {
        if (!messageList) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        if (isWelcome) {
            messageDiv.classList.add('welcome');
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        // Basic text insertion, replace newlines with <br> for display
        contentDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;

        messageDiv.appendChild(contentDiv);

        // Append the new message to the end of the list
        messageList.appendChild(messageDiv);

        // Scroll only if it's a new message, not during history load
        if (!isHistoryLoad) {
            scrollToBottom();
        }
    }


    // ========================================================================
    //  Speech Recognition Event Handlers
    // ========================================================================
    if (recognition) {
        recognition.onstart = () => {
            updateUIState('listening');
        };

        recognition.onresult = (event) => {
            const userText = event.results[0][0].transcript.trim();
            if (userText) {
                console.log("User said:", userText);
                addMessage('user', userText); // Add user message to history and DOM
                sendToBackend(userText); // Send to AI
            } else {
                 console.log("Empty transcription received.");
                 // Let onend handle returning to idle state naturally
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error, event.message);
            let errorMsg = event.error;
            if (event.error === 'no-speech') {
                errorMsg = "Didn't hear anything.";
            } else if (event.error === 'audio-capture') {
                errorMsg = "Microphone problem.";
            } else if (event.error === 'not-allowed') {
                errorMsg = "Permission denied.";
            } else {
                errorMsg = event.message || event.error; // Use message if available
            }
            updateUIState('error', errorMsg);
        };

        recognition.onend = () => {
            // Only revert to idle if we were actually listening state.
            // Avoids overriding thinking/speaking/error states triggered by onresult/onerror.
             if (isListening) {
                 updateUIState('idle');
             }
             console.log("Recognition ended.");
        };
    }

    // ========================================================================
    //  Text-to-Speech Function
    // ========================================================================
    function speakText(text) {
        return new Promise((resolve, reject) => {
            if (!text || typeof text !== 'string') {
                 console.warn("SpeakText: Invalid text provided");
                 return reject(new Error("Invalid text for speech"));
            }
            if (!speechSynthesis) {
                 console.error("Speech Synthesis not supported.");
                 updateUIState('error', 'Speech synthesis not supported.'); // Update UI as well
                 return reject(new Error("Speech Synthesis not supported"));
            }

            // Cancel existing speech first
            if (speechSynthesis.speaking) {
                 console.log("Cancelling previous speech...");
                speechSynthesis.cancel();
                 // Need a tiny delay for cancel to register before starting new speech
                 setTimeout(() => proceedWithSpeech(text, resolve, reject), 50);
            } else {
                 proceedWithSpeech(text, resolve, reject);
            }
        });
    }

    function proceedWithSpeech(text, resolve, reject) {
         const utterance = new SpeechSynthesisUtterance(text);
         utterance.lang = 'en-US';
         utterance.rate = 1.0;
         utterance.pitch = 1.0;

         let speechStarted = false; // Flag to prevent state change if cancelled early

         utterance.onstart = () => {
             speechStarted = true;
             console.log("Speech started.");
             updateUIState('speaking');
         };

         utterance.onend = () => {
             console.log("Speech finished.");
             // Only revert to idle if speech actually started and finished naturally
             if (speechStarted) {
                 updateUIState('idle');
             }
             resolve();
         };

         utterance.onerror = (event) => {
             console.error("Speech Synthesis Error:", event.error);
             updateUIState('error', `Speech error: ${event.error}`);
             reject(new Error(event.error));
         };

        // If voices are available, maybe choose one? (Optional)
        // const voices = speechSynthesis.getVoices();
        // if (voices.length > 0) {
        //    utterance.voice = voices[0]; // Example: use the first available voice
        // }

         speechSynthesis.speak(utterance);
    }


    // ========================================================================
    //  Backend Communication
    // ========================================================================
    async function sendToBackend(userQuery) {
        updateUIState('thinking');

        // Prepare history context
        const historyContext = chatHistory
            .slice(-6) // Send last N messages
            .filter(msg => !msg.text.startsWith("Sorry, couldn't get a response.")) // Exclude previous errors maybe?
            .map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));

        // console.log("Sending context:", JSON.stringify(historyContext)); // Debug log context

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ query: userQuery, history: historyContext }),
            });

            if (!response.ok) {
                let errorMsg = `Server error (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg; // Use specific error from backend if available
                } catch { /* Ignore if response body isn't JSON */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            const aiReply = data.reply;

            if (aiReply) {
                addMessage('ai', aiReply); // Add AI response to history and DOM
                await speakText(aiReply); // Speak the response
            } else {
                 throw new Error("Received empty reply from AI.");
            }

        } catch (error) {
            console.error('Error communicating with backend or processing response:', error);
            const displayError = `Sorry, an error occurred: ${error.message}`;
            // Add error message visually but DON'T save it to chatHistory array
            addMessageToDOM('ai', displayError);
            updateUIState('error', error.message);
            // Consider calling speakText(displayError) if you want errors read aloud
        }
        // Note: State transitions handled within speakText (onend, onerror) or here if speakText fails/is skipped
        // If speakText was successful, it ends in 'idle'. If it failed, it ends in 'error'.
        // If the backend call failed before even trying speakText, we are already in 'error' state here.
    }

    // ========================================================================
    //  Event Listeners
    // ========================================================================
    if(recordButton && recognition) {
        recordButton.addEventListener('click', () => {
            if (isListening) {
                recognition.stop(); // User explicitly stops listening
                 // onend handler will manage state change back to idle
            } else if (!isThinking && !isSpeaking) { // Only start if idle
                 // Cancel any pending speaking just in case (e.g., error message was being spoken)
                if (speechSynthesis.speaking) {
                    speechSynthesis.cancel();
                     updateUIState('idle'); // Ensure state reset if speech was interrupted
                }
                try {
                     recognition.start();
                     // onstart handler will manage state change to listening
                } catch (err) {
                     // Handle potential errors like mic already in use
                     console.error("Error starting recognition:", err);
                     updateUIState('error', "Couldn't start microphone.");
                }
            }
        });
    } else if (recordButton) {
        recordButton.disabled = true; // Ensure disabled if recognition failed to init
    }

    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', clearHistory);
    }


    // ========================================================================
    //  Initial Load
    // ========================================================================
    loadHistory();

}); // End DOMContentLoaded