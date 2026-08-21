import { pipeline } from '@xenova/transformers';

// Singleton instance to prevent loading the model multiple times
let extractor: any = null;

export async function getExtractor() {
  if (!extractor) {
    // using all-MiniLM-L6-v2, which creates a 384-dimensional vector.
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const ex = await getExtractor();
  // Generate embeddings for the input text
  const output = await ex(text, { pooling: 'mean', normalize: true });
  // Convert Float32Array to standard array
  return Array.from(output.data);
}
