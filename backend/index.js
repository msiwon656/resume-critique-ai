import express from 'express';
import cors from 'cors';
import prisma from './prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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