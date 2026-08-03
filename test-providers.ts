import { aiManager } from './core/ai/AIManager';
import { providerRegistry } from './providers/ProviderRegistry';
import { AIProviderType } from './core/ai/types';

async function test() {
  console.log("Before execute, Gemini is:", providerRegistry.getProvider(AIProviderType.GEMINI) ? "Registered" : "Not Registered");
  
  try {
    await aiManager.execute("simple-test", { message: "Hello" });
  } catch(e) {
    console.log("AIManager execution threw, which is fine if no API keys.");
  }
  
  const all = providerRegistry.getAllProviders();
  console.log("Total providers registered:", all.length);
  
  const gemini = providerRegistry.getProvider(AIProviderType.GEMINI);
  console.log("After execute, Gemini is:", gemini ? "Registered" : "Not Registered");
  
  const hasGroq = !!providerRegistry.getProvider(AIProviderType.GROQ);
  const hasOpenRouter = !!providerRegistry.getProvider(AIProviderType.OPENROUTER);
  const hasOpenAI = !!providerRegistry.getProvider(AIProviderType.OPENAI);
  const hasClaude = !!providerRegistry.getProvider(AIProviderType.CLAUDE);
  const hasMistral = !!providerRegistry.getProvider(AIProviderType.MISTRAL);
  const hasDeepSeek = !!providerRegistry.getProvider(AIProviderType.DEEPSEEK);
  const hasOllama = !!providerRegistry.getProvider(AIProviderType.OLLAMA);
  
  console.log("Has Groq:", hasGroq);
  console.log("Has OpenRouter:", hasOpenRouter);
  console.log("Has OpenAI:", hasOpenAI);
  console.log("Has Claude:", hasClaude);
  console.log("Has Mistral:", hasMistral);
  console.log("Has DeepSeek:", hasDeepSeek);
  console.log("Has Ollama:", hasOllama);
}

test();
