import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('./anecdoteService', () => ({
  AnecdoteService: {
    createAnecdote: jest.fn().mockResolvedValue({ id: 'mock-1' }),
  },
}));

import { enqueueAnecdote, readQueue, writeQueue, newAnecdoteClientId } from './anecdoteOfflineQueue';

describe('anecdoteOfflineQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('generates unique client ids', () => {
    const id1 = newAnecdoteClientId();
    const id2 = newAnecdoteClientId();
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toEqual(id2);
  });

  it('enqueues an observation with saved status', async () => {
    const item = await enqueueAnecdote('teacher-1', {
      student_id: 'student-abc',
      observation_text: 'Student demonstrated great leadership during group activity.',
      context: 'classroom',
    });

    expect(item.id).toBeDefined();
    expect(item.status).toBe('saved');
    expect(item.teacherId).toBe('teacher-1');
    expect(item.payload.student_id).toBe('student-abc');

    const queue = await readQueue('teacher-1');
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(item.id);
  });

  it('preserves existing items when enqueuing new ones', async () => {
    await enqueueAnecdote('teacher-1', { student_id: 'student-1', observation_text: 'Note 1' });
    await enqueueAnecdote('teacher-1', { student_id: 'student-2', observation_text: 'Note 2' });

    const queue = await readQueue('teacher-1');
    expect(queue.length).toBe(2);
  });

  it('replaces the same client_generated_id instead of duplicating', async () => {
    const first = await enqueueAnecdote('teacher-1', {
      student_id: 'student-1',
      observation_text: 'First draft',
      client_generated_id: '11111111-1111-4111-8111-111111111111',
    });
    const second = await enqueueAnecdote('teacher-1', {
      student_id: 'student-1',
      observation_text: 'Retry of same observation',
      client_generated_id: '11111111-1111-4111-8111-111111111111',
    });

    expect(first.id).toBe(second.id);
    const queue = await readQueue('teacher-1');
    expect(queue.length).toBe(1);
    expect(queue[0].payload.observation_text).toBe('Retry of same observation');
  });
});
