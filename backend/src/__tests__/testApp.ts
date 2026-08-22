/**
 * Minimal Express app used by supertest.
 * Mounts auth, student, admin, finance-officer, and hr routers.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRouter from '../routes/auth';
import studentRouter from '../routes/student';
import adminRouter from '../routes/admin';
import financeOfficerRouter from '../routes/financeOfficer';
import hrRouter from '../routes/hr';

const testApp = express();

testApp.use(cors({ origin: 'http://localhost:3000', credentials: true }));
testApp.use(cookieParser());
testApp.use(express.json());
testApp.use(express.urlencoded({ extended: true }));

// Mount without rate limiters so tests aren't throttled
testApp.use('/api/auth', authRouter);
testApp.use('/api/student', studentRouter);
testApp.use('/api/admin', adminRouter);
testApp.use('/api/finance-officer', financeOfficerRouter);
testApp.use('/api/hr', hrRouter);

export default testApp;
