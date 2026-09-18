export type AIAction = 'summarize' | 'key-points' | 'notes' | 'grammar' | 'translate' | 'rewrite' | 'reply' | 'explain' | 'actions';
const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3.2";
const GOOGLE_TRANSLATE_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY as string | undefined;

export const hasGoogleTranslateKey = Boolean(GOOGLE_TRANSLATE_KEY);

type SubtitleBlock = { prefix: string; text: string };

const splitSubtitleBlocks = (source: string): SubtitleBlock[] => source
	.replace(/^WEBVTT.*$/im, "WEBVTT")
	.split(/\r?\n\s*\r?\n/)
	.map((block) => {
		const lines = block.split(/\r?\n/);
		const textStart = lines.findIndex((line) => line.trim() && !/^\d+$/.test(line.trim()) && !line.includes("-->"));
		if (textStart < 0) return { prefix: block, text: "" };
		return { prefix: lines.slice(0, textStart).join("\n"), text: lines.slice(textStart).join("\n") };
	});

const translateGoogleBatch = async (texts: string[], targetLanguage: string) => {
	if (!GOOGLE_TRANSLATE_KEY) throw new Error("GOOGLE_TRANSLATE_KEY_MISSING");
	const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(GOOGLE_TRANSLATE_KEY)}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ q: texts, target: targetLanguage, format: "text" }),
	});
	if (!response.ok) throw new Error("GOOGLE_TRANSLATE_ERROR");
	const data = (await response.json()) as { data?: { translations?: Array<{ translatedText: string }> } };
	const translations = data.data?.translations?.map((item) => item.translatedText);
	if (!translations || translations.length !== texts.length) throw new Error("GOOGLE_TRANSLATE_INVALID_RESPONSE");
	return translations;
};

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
	async translateSubtitlesWithGoogle(source: string, targetLanguage: string) {
		if (!source.trim()) throw new Error("EMPTY_TRANSCRIPT");
		const blocks = splitSubtitleBlocks(source);
		const translatedBlocks: SubtitleBlock[] = [];
		const maxBatchCharacters = 4500;
		for (let index = 0; index < blocks.length;) {
			const batch: SubtitleBlock[] = [];
			let batchCharacters = 0;
			while (index < blocks.length && batch.length < 25 && (batch.length === 0 || batchCharacters + blocks[index].text.length <= maxBatchCharacters)) {
				batch.push(blocks[index]);
				batchCharacters += blocks[index].text.length;
				index += 1;
			}
			const texts = batch.map((block) => block.text);
			const translated = await translateGoogleBatch(texts, targetLanguage);
			translated.forEach((text, itemIndex) => translatedBlocks.push({ prefix: batch[itemIndex].prefix, text }));
		}
		return translatedBlocks.map((block) => block.text ? `${block.prefix}\n${block.text}` : block.prefix).join("\n\n");
	},
};