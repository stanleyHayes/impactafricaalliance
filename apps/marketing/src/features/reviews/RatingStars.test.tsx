import { MIN_RATINGS_FOR_AVERAGE, ratingSummary } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/test-utils';

import { RatingHeadline } from './RatingStars';

describe('the headline rating', () => {
  it('shows the average once enough people have rated', () => {
    renderWithProviders(<RatingHeadline summary={ratingSummary([5, 4, 5, 4])} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText(/from 4 ratings/)).toBeInTheDocument();
  });

  it('withholds the average while it would only describe the reviewer', () => {
    // Two ratings, one of them unhappy, would print "3.0" as though it were a
    // verdict. The count is the honest thing to show.
    renderWithProviders(<RatingHeadline summary={ratingSummary([5, 1])} />);

    expect(screen.queryByText('3.0')).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`2 ratings.*${MIN_RATINGS_FOR_AVERAGE}`))).toBeInTheDocument();
  });

  it('says nothing at all when nobody has rated', () => {
    const { container } = renderWithProviders(<RatingHeadline summary={ratingSummary([])} />);

    expect(container).toBeEmptyDOMElement();
  });
});
