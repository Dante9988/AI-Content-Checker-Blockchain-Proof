export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.GPT_MODEL || 'gpt-5',
    prompt: process.env.GPT_PROMPT || 'Please analyze this image and determine if it\'s authentic or AI-generated. Provide a score from 0 to 100, where 0 is definitely authentic and 100 is definitely AI-generated. Return your response as a JSON object with a "score" field.',
  },
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545',
    privateKey: process.env.PRIVATE_KEY,
    truChainAddress: process.env.TRUCHAIN_ADDRESS,
    imageVerificationAddress: process.env.IMAGE_VERIFICATION_ADDRESS,
  },
  verification: {
    minScoreThreshold: parseInt(process.env.MIN_SCORE_THRESHOLD, 10) || 5000,
    verificationPrice: process.env.VERIFICATION_PRICE || '10000000000000000000', // 10 tokens in wei
  },
});
