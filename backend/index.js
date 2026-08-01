import express from 'express';
import cors from 'cors';
import prisma from './prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import claude from './claudeClient.js';
import { critiqueResume } from './claudeClient.js';

// 이 미들웨어는 나중에 로그인한 사용자만 접근 가능한 API에 붙일 예정 
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '토큰이 없습니다.' });

  const token = authHeader.split(' ')[1]; // "Bearer <토큰>" 형식에서 토큰만 추출

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

const app = express();
const PORT = 3001; // 지출관리 프로젝트(3000)와 겹치지 않게 3001로 설정

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('이력서 첨삭 AI 서버 정상 작동합니다');
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

app.post('/auth/signup', async (req, res) => { 
    try { 
        const { email, password, name } = req.body;

        if (!email || !password) { 
            return res.status(400).json({ error: '이메일과 비밀번호는 필수입니다.' });
        } 

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) { 
            return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
        });

        res.status(201).json({ id: user.id, email: user.email, name: user.name});
    } catch (err) { 
        res.status(500).json({ error: err.message });
    }
});

// 로그인
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 이력서 첨삭
app.post('/resumes/critique', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: '이력서 내용을 입력해주세요.' });
    }

//     const response = await claude.messages.create({
//       model: 'claude-sonnet-4-6',
//       max_tokens: 2048,
//       system: `당신은 채용 담당자 관점에서 이력서를 첨삭하는 전문가입니다.
// 다음 기준으로 첨삭해주세요:
// 1. 문장이 구체적인 수치와 성과 중심으로 되어 있는지
// 2. 동사로 시작하는 명확한 문장인지
// 3. 불필요하게 장황하거나 모호한 표현은 없는지

// 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 반환합니다.
// {
//   "overallFeedback": "전체적인 총평 (2-3문장)",
//   "suggestions": [
//     { "original": "원문 문장", "revised": "수정 제안 문장", "reason": "왜 이렇게 고쳐야 하는지 이유" }
//   ]
// }`,
//       messages: [
//         { role: 'user', content: `다음 이력서를 첨삭해주세요:\n\n${content}` },
//       ],
//     });
//    const feedbackText = response.content[0].text;

      const feedbackText = await critiqueResume(content);

    // 이력서와 첨삭 결과를 함께 DB에 저장
    const resume = await prisma.resume.create({
      data: {
        userId: req.userId,
        title: title || '제목 없음',
        content,
        feedback: feedbackText,
      },
    });

    res.status(201).json({
      id: resume.id,
      title: resume.title,
      content: resume.content,
      feedback: JSON.parse(feedbackText),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 내 이력서 목록 조회
app.get('/resumes', authMiddleware, async (req, res) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});