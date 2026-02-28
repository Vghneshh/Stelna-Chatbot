const conversations = {};

function getState(sessionId) {
  if (!conversations[sessionId]) {
    conversations[sessionId] = {
      productType: null,
      quantity: null,
      recommendedPlan: null
    };
  }
  return conversations[sessionId];
}

function updateState(sessionId, updates) {
  const state = getState(sessionId);
  Object.assign(state, updates);
  return state;
}

module.exports = { getState, updateState };