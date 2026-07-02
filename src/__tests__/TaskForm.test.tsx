import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskForm } from '../components/TaskForm';

describe('TaskForm', () => {
	it('shows validation error when title is blank', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(<TaskForm onSubmit={onSubmit} />);

		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(screen.getByRole('alert')).toHaveTextContent('Le titre est requis');
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('submits trimmed values and resets create form', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();

		render(<TaskForm onSubmit={onSubmit} />);

		const titleInput = screen.getByLabelText('Titre');
		const descriptionInput = screen.getByLabelText('Description');

		await user.type(titleInput, '  Nouvelle tâche  ');
		await user.type(descriptionInput, '  Description utile  ');
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(onSubmit).toHaveBeenCalledWith({
			title: 'Nouvelle tâche',
			description: 'Description utile',
		});
		expect(titleInput).toHaveValue('');
		expect(descriptionInput).toHaveValue('');
	});

	it('renders edit mode and keeps values after submit', async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		const onCancel = vi.fn();

		render(
			<TaskForm
				onSubmit={onSubmit}
				onCancel={onCancel}
				mode="edit"
				initialValues={{ title: 'Titre existant', description: 'Texte' }}
			/>
		);

		expect(screen.getByRole('heading', { name: 'Modifier la tâche' })).toBeInTheDocument();

		await user.clear(screen.getByLabelText('Titre'));
		await user.type(screen.getByLabelText('Titre'), 'Titre modifié');
		await user.click(screen.getByRole('button', { name: 'Modifier' }));
		await user.click(screen.getByRole('button', { name: 'Annuler' }));

		expect(onSubmit).toHaveBeenCalledWith({
			title: 'Titre modifié',
			description: 'Texte',
		});
		expect(screen.getByLabelText('Titre')).toHaveValue('Titre modifié');
		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});