// documentExtractor.js
// Sends a document image/PDF to Claude via Anthropic API
// and extracts a specific field value from it.
//
// Requires VITE_ANTHROPIC_API_KEY to be set in your .env file.
// WARNING: This exposes the key to the browser. For production, proxy via a backend.

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export async function extractFieldFromDocument(file, extractionPrompt) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file to enable document extraction.'
    );
  }

  // Validate file size (5MB limit)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds 5MB limit. Please upload a smaller file.');
  }

  // Validate file type
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload JPG, PNG, WEBP, or PDF.');
  }

  // Step 1: Convert file to base64
  const base64Data = await fileToBase64(file);
  const mediaType = file.type;

  // Step 2: Build the message content
  const content = [];

  if (mediaType === 'application/pdf') {
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64Data,
      },
    });
  } else {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data,
      },
    });
  }

  content.push({
    type: 'text',
    text: `You are a document reader for a financial loan application system in India.

${extractionPrompt}

CRITICAL RULES:
- Respond with ONLY a valid JSON object. No explanation, no markdown, no extra text.
- If you cannot find the value, return: {"value": null, "confidence": "low", "reason": "field not found"}
- If you find the value, return: {"value": <extracted_value>, "confidence": "high", "display": "<human readable>"}
- For monetary amounts, return numbers only (no ₹ symbol, no commas) e.g. 1240
- For regularity/consistency, return one of exactly: "1.0", "0.8", "0.5", "0.2"
- For dates, return in YYYY-MM format
- Never hallucinate values that are not clearly visible in the document`,
  });

  // Step 3: Call Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Step 4: Parse the JSON response
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    throw new Error('Could not parse extraction response from Claude.');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}
