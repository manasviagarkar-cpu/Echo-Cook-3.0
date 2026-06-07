# Echo-Cook 3.0 🍳🎙️

An advanced, voice-controlled cooking assistant designed for completely hands-free kitchen utility. Echo-Cook 3.0 bridges the gap between culinary execution and agentic AI, allowing users to manage complex recipes, track pantry ingredients, and dynamically scale portions using real-time vocal feedback.

🚀 **Live Prototype:** https://echo-cook-3-0.vercel.app/

---

## 🛠️ The Tech Stack & Environment
Built for performance, modern aesthetics, and seamless real-time interactions:
*   **Environment:** Node.js (v24.14.1)
*   **Frontend Architecture:** [e.g., React.js / Next.js] deployed on **Vercel**
*   **UI/UX Paradigm:** Modern Glassmorphism with dynamic, fluid visual effects and responsive layouts.
*   **AI Integrations:** Integrated with Google Cloud API ecosystems and specialized agentic models.

---

## 🧠 Core Features & Architecture 

*   **Duplex Conversation Loop:** Engineered for the messy kitchen environment. The frontend automatically grants continuous microphone access immediately following step completions, ensuring a zero-touch, fluid dialogue stream without requiring repeated manual activation.
*   **Pantry Memory Engine:** Keeps track of available ingredients in real time, cross-referencing pantry state against target recipe requirements.
*   **Smart Scaling Module:** Dynamically calculates and re-renders ingredient ratios and step-by-step instructions on the fly based on user-requested portion shifts.

---

## 👥 Engineering Team & Contributions
Echo-Cook 3.0 was developed by a cross-functional three-member engineering team. 

*   **Frontend Developer Manasvi Agarkar :** Spearheaded the entire user interface architecture. Responsible for implementing the glassmorphic design system, managing complex state changes during dynamic recipe scaling, and orchestrating the UX state machine for the hands-free microphone access loop.
*   **Agent Developer:** Architected the specialized LLM processing layer, conversational intent parsing, and contextual memory management.
*   **Backend Designer:** Structured the database schemas, API endpoints, and real-time data sync pipeline for the pantry and recipe engines.

---

## 📐 UX Design & Architectural Decisions

### The Hands-Free UX Paradigm
Traditional voice assistants fail in the kitchen due to "timeout frustration" or requiring users to touch a screen with messy hands to wake the device. 

To solve this, Echo-Cook 3.0 utilizes an intentional **Duplex Conversation Loop**. The application state machine automatically triggers microphone capture at the end of each assistant utterance. 

> 🔒 **Privacy & Safety Disclaimer:** Continuous microphone polling is strictly scoped to active recipe sessions. Audio data is processed locally/via secure API streams exclusively for intent parsing; no audio streams or ambient voice data are permanently persisted or logged, ensuring complete user data privacy.

---

## 📸 Visual Showcase

### User Interface
<img width="1600" height="775" alt="image" src="https://github.com/user-attachments/assets/d1e107cf-e542-415a-ae4d-e476c33e7c0d" />
