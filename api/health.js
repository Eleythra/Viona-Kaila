module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    hasVectorStoreId: Boolean(process.env.OPENAI_VECTOR_STORE_ID),
  });
};
