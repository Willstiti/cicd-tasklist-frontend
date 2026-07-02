import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTasks } from '../hooks/useTasks';
import * as taskApi from '../api/taskApi';
import type { Task } from '../types/task';

vi.mock('../api/taskApi', () => ({
	getTasks: vi.fn(),
	createTask: vi.fn(),
	updateTask: vi.fn(),
	deleteTask: vi.fn(),
}));

const existingTask: Task = {
	id: 1,
	title: 'Existante',
	description: null,
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

const updatedTask: Task = {
	...existingTask,
	title: 'Mise à jour',
	completed: true,
};

describe('useTasks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(taskApi.getTasks).mockResolvedValue([existingTask]);
	});

	it('loads tasks on mount', async () => {
		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(taskApi.getTasks).toHaveBeenCalledTimes(1);
		expect(result.current.tasks).toEqual([existingTask]);
		expect(result.current.error).toBeNull();
	});

	it('exposes API errors from initial load', async () => {
		vi.mocked(taskApi.getTasks).mockRejectedValueOnce(new Error('API down'));

		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe('API down');
		expect(result.current.tasks).toEqual([]);
	});

	it('adds, edits, toggles and removes tasks in state', async () => {
		vi.mocked(taskApi.createTask).mockResolvedValueOnce({
			id: 2,
			title: 'Nouvelle',
			description: 'Details',
			completed: false,
			createdAt: '2026-01-16T10:00:00Z',
			updatedAt: '2026-01-16T10:00:00Z',
		});
		vi.mocked(taskApi.updateTask)
			.mockResolvedValueOnce(updatedTask)
			.mockResolvedValueOnce(existingTask);
		vi.mocked(taskApi.deleteTask).mockResolvedValueOnce(undefined);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.addTask({ title: 'Nouvelle', description: 'Details' });
		});
		expect(result.current.tasks.map((task) => task.id)).toEqual([2, 1]);

		await act(async () => {
			await result.current.editTask(1, { title: 'Mise à jour' });
		});
		expect(result.current.tasks.find((task) => task.id === 1)).toEqual(updatedTask);

		await act(async () => {
			await result.current.toggleComplete(1);
		});
		expect(taskApi.updateTask).toHaveBeenLastCalledWith(1, { completed: false });
		expect(result.current.tasks.find((task) => task.id === 1)).toEqual(existingTask);

		await act(async () => {
			await result.current.removeTask(1);
		});
		expect(result.current.tasks).toHaveLength(1);
		expect(result.current.tasks[0].id).toBe(2);
	});
});