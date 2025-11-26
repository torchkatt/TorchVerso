import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIManager {
    constructor() {
        this.apiKey = null; // User must provide this
        this.genAI = null;
        this.model = null;
    }

    init(apiKey) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("AI: Gemini Brain Activated 🧠");
    }

    async generateResponse(systemPrompt, userMessage) {
        if (!this.model) {
            return "Error: [MISSING_API_KEY] Please provide a Gemini API Key.";
        }

        try {
            // Simple prompt construction
            const prompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return text;
        } catch (error) {
            console.error("AI Error:", error);
            return "Error: My brain is offline (API Error).";
        }
    }
}
