export const textToSpeechService = {
  speak(
    text: string,
    options: {
      voice?: SpeechSynthesisVoice;
      language?: string;
      rate: number;
      pitch: number;
      volume: number;
    },
  ) {
    if (!("speechSynthesis" in window)) throw new Error("TTS_UNAVAILABLE");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.language ?? options.voice?.lang ?? "en-US";
    utterance.voice = options.voice ?? null;
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  },
  speakSequence(
    items: Array<{
      text: string;
      voice?: SpeechSynthesisVoice;
      language: string;
      rate: number;
      pitch: number;
      volume: number;
    }>,
  ) {
    if (!("speechSynthesis" in window)) throw new Error("TTS_UNAVAILABLE");
    window.speechSynthesis.cancel();
    items.filter((item) => item.text.trim()).forEach((item) => {
      const utterance = new SpeechSynthesisUtterance(item.text.trim());
      utterance.lang = item.language;
      utterance.voice = item.voice ?? null;
      utterance.rate = item.rate;
      utterance.pitch = item.pitch;
      utterance.volume = item.volume;
      window.speechSynthesis.speak(utterance);
    });
  },
  pause: () => window.speechSynthesis.pause(),
  resume: () => window.speechSynthesis.resume(),
  stop: () => window.speechSynthesis.cancel(),
};
