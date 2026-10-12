import { render, screen } from '@testing-library/react';
import PageHeader from './components/PageHeader';
import LineLegend from './components/LineLegend';
import { LINES } from './lib/lines';

test('page header shows title and subtitle', () => {
  render(<PageHeader title="Facilities" subtitle="Amenities" />);
  expect(screen.getByRole('heading', { name: 'Facilities' })).toBeInTheDocument();
  expect(screen.getByText('Amenities')).toBeInTheDocument();
});

test('line legend names every line in text, not just colour', () => {
  render(<LineLegend />);
  LINES.forEach((line) => expect(screen.getByText(line.name)).toBeInTheDocument());
});
