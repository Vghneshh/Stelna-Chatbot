const { shouldTriggerPRC, startPRC, nextQuestion } = require("../ai/prc/prcEngine");

function formatStageLabel(stage) {
  const labels = {
    knowledge: "Knowledge Readiness",
    functional: "Functional Requirements",
    nonfunctional: "Non-Functional Requirements",
    manufacturing: "Manufacturing Readiness"
  };
  return labels[stage] || String(stage || "");
}

async function handlePRC(session, message) {
  if (shouldTriggerPRC(message)) {
    const first = await startPRC(session);
    const firstQuestion = first.question;
    const stageMeta = first.stageMeta || {
      stage: "knowledge",
      stageNumber: 1,
      stageQuestionNum: 1,
      stageQuestionTotal: 29
    };
    const stageLabel = formatStageLabel(stageMeta.stage);

    return {
      type: "prc_start",
      message: `Let's evaluate your Product Readiness.\n\nStage ${stageMeta.stageNumber}: ${stageLabel}\nQuestion ${stageMeta.stageQuestionNum} of ${stageMeta.stageQuestionTotal}\n\n${firstQuestion.question}`
    };
  }

  const prcResponse = await nextQuestion(session, message);

  if (!prcResponse) {
    return null;
  }

  if (prcResponse.done) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const totalQuestions = prcResponse.totalQuestions || 29;

    return {
      type: "prc_redirect",
      message: `Excellent! You've completed the ${totalQuestions}-question assessment. 🎉\n\nLet me take you to your Product Readiness Checklist...`,
      prcUrl: `${frontendUrl}/prc.html`,
      prcAnswers: prcResponse.answers,
      knowledgeReadiness: prcResponse.knowledgeReadiness || [],
      functionalRequirements: prcResponse.functionalRequirements || [],
      nonFunctionalRequirements: prcResponse.nonFunctionalRequirements || [],
      manufacturingReadiness: prcResponse.manufacturingReadiness || []
    };
  }

  const totalQuestions = prcResponse.totalQuestions || 29;
  const stageMeta = prcResponse.stageMeta || {
    stage: "knowledge",
    stageNumber: 1,
    stageQuestionNum: prcResponse.questionNum,
    stageQuestionTotal: totalQuestions
  };
  const stageLabel = formatStageLabel(stageMeta.stage).toUpperCase();

  return {
    type: "prc_question",
    message: `${prcResponse.botMessage}\n\nStage: ${stageLabel}\nQuestion ${prcResponse.questionNum} of ${totalQuestions}\n\n${prcResponse.question.question}`
  };
}

module.exports = { handlePRC };
