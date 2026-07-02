import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskItem } from '../components/TaskItem';
import type { Task } from '../types/task';

const task: Task = {
	id: 1,
	title: 'Faire les tests',
	description: 'Ajouter la couverture frontend',
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

afterEach(() => {
	vi.useRealTimers();
});

describe('TaskItem', () => {
	it('calls onToggle when checkbox changes', async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();

		render(<TaskItem task={task} onToggle={onToggle} onDelete={vi.fn()} onEdit={vi.fn()} />);

		await user.click(screen.getByRole('checkbox'));

		expect(onToggle).toHaveBeenCalledWith(1);
	});

	it('edits and saves trimmed values', async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();

		render(<TaskItem task={task} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={onEdit} />);

		await user.click(screen.getByRole('button', { name: 'Modifier' }));
		await user.clear(screen.getByLabelText('Modifier le titre'));
		await user.type(screen.getByLabelText('Modifier le titre'), '  Titre revu  ');
		await user.clear(screen.getByLabelText('Modifier la description'));
		await user.type(screen.getByLabelText('Modifier la description'), '  Nouvelle description  ');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(onEdit).toHaveBeenCalledWith(1, {
			title: 'Titre revu',
			description: 'Nouvelle description',
		});
		expect(screen.queryByLabelText('Modifier le titre')).not.toBeInTheDocument();
	});

	it('resets draft values when edit is cancelled', async () => {
		const user = userEvent.setup();

		render(<TaskItem task={task} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: 'Modifier' }));
		await user.clear(screen.getByLabelText('Modifier le titre'));
		await user.type(screen.getByLabelText('Modifier le titre'), 'Brouillon');
		await user.click(screen.getByRole('button', { name: 'Annuler' }));
		await user.click(screen.getByRole('button', { name: 'Modifier' }));

		expect(screen.getByLabelText('Modifier le titre')).toHaveValue('Faire les tests');
	});

	it('requires confirmation before deleting', async () => {
		vi.useFakeTimers();
		const onDelete = vi.fn();

		render(<TaskItem task={task} onToggle={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
		expect(onDelete).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
		expect(onDelete).toHaveBeenCalledWith(1);
	});
});