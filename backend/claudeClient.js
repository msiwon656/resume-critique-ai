// import 'dotenv/config';
// import Anthropic from '@anthropic-ai/sdk';

// const client = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// export default client;

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 실제 AI 첨삭 결과를 흉내 내는 mock 함수 (개발용, 비용 발생 안 함)
function mockCritique(content) {
  return JSON.stringify({
    overallFeedback:
      "전반적으로 성실한 태도는 느껴지지만, 구체적인 수치나 성과가 부족해 채용 담당자의 시선을 끌기 어렵습니다. 각 경험을 '무엇을 했는지'가 아니라 '어떤 결과를 만들었는지' 중심으로 다시 써보세요.",
    suggestions: [
      {
        original: "다양한 프로젝트를 진행했습니다.",
        revised: "3개월간 팀 프로젝트 4건을 완수했습니다.",
        reason: "'다양한'이라는 모호한 표현 대신 구체적인 기간과 개수를 명시하면 신뢰도가 높아집니다.",
      },
      {
        original: "팀원들과 협력하여 좋은 결과를 만들었습니다.",
        revised: "5명 팀에서 백엔드 API 설계를 담당해 개발 기간을 20% 단축했습니다.",
        reason: "본인의 구체적인 역할과 정량적 성과를 명시해야 차별화됩니다.",
      },
      {
        original: "문제 해결 능력이 뛰어납니다.",
        revised: "삭제됨 (또는 실제 사례로 대체 권장)",
        reason: "추상적인 자기 평가는 신뢰를 주기 어렵습니다. 구체적 사례로 증명하는 것이 효과적입니다.",
      },
    ],
  });
}

// 실제 Claude API 호출 함수 (나중에 이걸로 교체)
async function realCritique(content) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `당신은 채용 담당자 관점에서 이력서를 첨삭하는 전문가입니다.
다음 기준으로 첨삭해주세요:
1. 문장이 구체적인 수치와 성과 중심으로 되어 있는지
2. 동사로 시작하는 명확한 문장인지
3. 불필요하게 장황하거나 모호한 표현은 없는지

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 반환합니다.
{
  "overallFeedback": "전체적인 총평 (2-3문장)",
  "suggestions": [
    { "original": "원문 문장", "revised": "수정 제안 문장", "reason": "왜 이렇게 고쳐야 하는지 이유" }
  ]
}`,
    messages: [{ role: 'user', content: `다음 이력서를 첨삭해주세요:\n\n${content}` }],
  });

  return response.content[0].text;
}

// USE_MOCK_AI가 "true"면 mock, 아니면 실제 API 호출
export async function critiqueResume(content) {
  const useMock = process.env.USE_MOCK_AI === 'true';
  return useMock ? mockCritique(content) : realCritique(content);
}