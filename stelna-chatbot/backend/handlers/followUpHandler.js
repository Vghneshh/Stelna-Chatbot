const { getLastUserQuestion } = require("../memory/sessionManager");

function handleFollowUp(session) {
  const lastQuestion = getLastUserQuestion(session);

  if (lastQuestion) {
    console.log("Follow-up context:", lastQuestion);
  }

  return {
    reply: "Glad that helped 👍\n\nWould you like to explore material selection, manufacturing method, or cost considerations next?"
  };
}

module.exports = { handleFollowUp };
