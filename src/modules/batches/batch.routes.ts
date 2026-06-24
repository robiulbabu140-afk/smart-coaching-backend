import { Router } from 'express';
import * as ctrl from './batch.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';

const r = Router();
r.use(authenticate);

r.post('/', requireRole(['admin']), ctrl.create);
r.get('/', ctrl.list);
r.get('/:id', ctrl.getOne);
r.patch('/:id', requireRole(['admin']), ctrl.update);
r.delete('/:id', requireRole(['admin']), ctrl.archive);
r.post('/:id/members', requireRole(['admin']), ctrl.addMember);
r.delete('/:id/members/:studentId', requireRole(['admin']), ctrl.removeMember);
r.post('/:id/assign-teacher', requireRole(['admin']), ctrl.assignTeacher);

export default r;
