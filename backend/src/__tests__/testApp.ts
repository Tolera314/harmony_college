/**
 * Minimal Express app used by supertest.
 * Mounts only the auth router — no Socket.io, no static files, no HTTP server.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from '../routes/auth';
import studentRouter from '../routes/student';
import departmentHeadRouter from '../routes/departmentHead';
import adminRouter from '../routes/admin';

const testApp = express();

testApp.use(cors({ origin: 'http://localhost:3000', credentials: true }));
testApp.use(cookieParser());
testApp.use(express.json());
testApp.use(express.urlencoded({ extended: true }));

// Mount without rate limiters so tests aren't throttled
testApp.use('/api/auth', authRouter);
testApp.use('/api/student', studentRouter);
testApp.use('/api/department-head', departmentHeadRouter);
testApp.use('/api/admin', adminRouter);

export default testApp;
