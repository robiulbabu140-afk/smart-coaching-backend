import { Router } from 'express';
import * as ctrl from './class.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const r = Router();
r.use(authenticate);

r.post('/start', requireRole(['teacher']), ctrl.start);
r.get('/history', ctrl.history);
r.post('/:id/join', ctrl.join);
r.post('/:id/end', requireRole(['teacher']), ctrl.end);
r.post('/:id/respond', requireRole(['student']), ctrl.respond);
r.get('/:id/attendance', requireRole(['admin', 'teacher']), ctrl.attendance);

export default r;
