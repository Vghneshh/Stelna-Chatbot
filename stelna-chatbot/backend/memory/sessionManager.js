const mongoose = require("mongoose");

const prcSessions = new Map();
const lastUserQuestions = new Map();

function getPRCCollection() {
  return mongoose.connection?.db?.collection("prc_sessions");
}

function getSessionKey(sessionId) {
  return sessionId || "anonymous";
}

async function startPRCSession(sessionKey) {
  const state = { currentQuestion: 0, answers: {} };
  prcSessions.set(sessionKey, state);

  const collection = getPRCCollection();
  if (collection) {
    const now = new Date();
    await collection.updateOne(
      { sessionId: sessionKey },
      {
        $set: {
          sessionId: sessionKey,
          currentQuestion: 0,
          answers: {},
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  return state;
}

async function getPRCSession(sessionKey) {
  const cached = prcSessions.get(sessionKey);
  if (cached) {
    return cached;
  }

  const collection = getPRCCollection();
  if (!collection) {
    return null;
  }

  const doc = await collection.findOne({ sessionId: sessionKey });
  if (!doc) {
    return null;
  }

  const state = {
    currentQuestion: doc.currentQuestion || 0,
    answers: doc.answers || {},
    productName: doc.productName,
    userSegment: doc.userSegment,
    problemStatement: doc.problemStatement,
    productDomain: doc.productDomain
  };

  prcSessions.set(sessionKey, state);
  return state;
}

async function savePRCSession(sessionKey, state) {
  prcSessions.set(sessionKey, state);

  const collection = getPRCCollection();
  if (collection) {
    await collection.updateOne(
      { sessionId: sessionKey },
      {
        $set: {
          sessionId: sessionKey,
          currentQuestion: state.currentQuestion,
          answers: state.answers,
          productName: state.productName,
          userSegment: state.userSegment,
          problemStatement: state.problemStatement,
          productDomain: state.productDomain,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
}

async function deletePRCSession(sessionKey) {
  prcSessions.delete(sessionKey);

  const collection = getPRCCollection();
  if (collection) {
    await collection.deleteOne({ sessionId: sessionKey });
  }
}

function getLastUserQuestion(sessionKey) {
  return lastUserQuestions.get(sessionKey) || "";
}

function setLastUserQuestion(sessionKey, question) {
  lastUserQuestions.set(sessionKey, question);
}

module.exports = {
  getSessionKey,
  startPRCSession,
  getPRCSession,
  savePRCSession,
  deletePRCSession,
  getLastUserQuestion,
  setLastUserQuestion
};