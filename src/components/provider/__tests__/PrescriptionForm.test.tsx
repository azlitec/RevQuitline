import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrescriptionForm from '../PrescriptionForm';

describe('PrescriptionForm', () => {
  beforeEach(() => {
    // Mock fetch to avoid real network during tests
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { prescription: { id: 'rx-1' } } }),
    } as any);
    // Mock alert for validation errors
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render core form fields', () => {
    render(<PrescriptionForm patientId="patient-1" onCreated={jest.fn()} />);

    expect(screen.getByLabelText(/Medication/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dosage/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
  });

  it('should validate required fields and not submit when empty', async () => {
    render(<PrescriptionForm patientId="patient-1" onCreated={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
      const msg = (window.alert as jest.Mock).mock.calls[0][0] as string;
      // Expect at least medication and dosage errors included
      expect(msg.toLowerCase()).toContain('medication');
      expect(msg.toLowerCase()).toContain('dosage');
    });

    // Ensure no network call attempted due to client-side validation
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/provider/prescriptions'),
      expect.anything()
    );
  });

  it('should submit valid form and call onCreated', async () => {
    const onCreated = jest.fn();
    render(<PrescriptionForm patientId="patient-1" onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/Medication/i), 'Varenicline');
    await userEvent.type(screen.getByLabelText(/Dosage/i), '1 mg');
    await userEvent.selectOptions(screen.getByLabelText(/Frequency/i), 'Twice daily');
    await userEvent.clear(screen.getByLabelText(/Duration/i));
    await userEvent.type(screen.getByLabelText(/Duration/i), '12 weeks');
    await userEvent.clear(screen.getByLabelText(/Quantity/i));
    await userEvent.type(screen.getByLabelText(/Quantity/i), '84');
    await userEvent.type(screen.getByLabelText(/Instructions/i), 'Take with food');
    await userEvent.type(screen.getByLabelText(/Notes/i), 'Take with food');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
      expect(onCreated).toHaveBeenCalledWith('rx-1');
    });
  });
});