export type AIAction = 'summarize' | 'key-points' | 'notes' | 'grammar' | 'translate' | 'rewrite' | 'reply' | 'explain' | 'actions';
const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3.2";

export const aiService = {
	async process(text: string, action: AIAction) {
		if (!text.trim()) throw new Error("EMPTY_TRANSCRIPT");
		const instructions: Record<AIAction, string> = {
			summarize: "Summarize this text clearly and briefly.",
			"key-points": "Extract the most important key points as a concise list.",
			notes: "Turn this text into useful structured notes.",
			grammar: "Correct grammar and spelling while preserving the original meaning.",
			translate: "Explain that translation requires a target language, then improve the text clarity without inventing a translation.",
			rewrite: "Rewrite this text to be clearer and more polished while preserving its meaning.",
			reply: "Draft a concise, helpful reply to this text.",
			explain: "Explain the meaning and important context of this text.",
			actions: "Extract practical action items from this text.",
		};
		let response: Response;
		try {
			response = await fetch(OLLAMA_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: OLLAMA_MODEL,
					prompt: `${instructions[action]}\n\nText:\n${text}`,
					stream: false,
				}),
			});
		} catch {
			throw new Error("OLLAMA_UNAVAILABLE");
		}
		if (!response.ok) throw new Error("OLLAMA_ERROR");
		const data = (await response.json()) as { response?: string };
		if (!data.response?.trim()) throw new Error("OLLAMA_EMPTY_RESPONSE");
		return data.response.trim();
	},
	async translateSubtitles(source: string, targetLanguage: string) {
		if (!source.trim()) throw new Error("EMPTY_TRANSCRIPT");
		let response: Response;
		try {
			response = await fetch(OLLAMA_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: OLLAMA_MODEL,
					prompt: `Translate only the spoken subtitle lines into ${targetLanguage}. Preserve every subtitle number, timestamp, line break, and WEBVTT header exactly. Do not add explanations.\n\n${source}`,
					stream: false,
				}),
			});
		} catch {
			throw new Error("OLLAMA_UNAVAILABLE");
		}
		if (!response.ok) throw new Error("OLLAMA_ERROR");
		const data = (await response.json()) as { response?: string };
		if (!data.response?.trim()) throw new Error("OLLAMA_EMPTY_RESPONSE");
		return data.response.trim();
	},
};