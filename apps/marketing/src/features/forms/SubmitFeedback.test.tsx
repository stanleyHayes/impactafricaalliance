import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubmitFeedback } from './SubmitFeedback';

describe('SubmitFeedback', () => {
  it('shows the success message when submission succeeds', () => {
    render(<SubmitFeedback isSuccess isError={false} successMessage="All done!" />);
    expect(screen.getByText('All done!')).toBeInTheDocument();
  });

  it('shows a generic error when submission fails', () => {
    render(<SubmitFeedback isSuccess={false} isError successMessage="All done!" />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('renders nothing in the idle state', () => {
    const { container } = render(
      <SubmitFeedback isSuccess={false} isError={false} successMessage="All done!" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
