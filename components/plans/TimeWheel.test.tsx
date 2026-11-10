import { fireEvent, render, screen } from '@testing-library/react-native';
import { TimeWheel } from './TimeWheel';

// Scrolling cannot be driven from here, but every value on the wheel can also
// be tapped, and a tap goes through the same conversion a scroll does.
describe('TimeWheel (#191)', () => {
  it('offers twelve hours, the two half hours, and AM or PM', async () => {
    await render(<TimeWheel value={{ h: 6, m: 30 }} onChange={jest.fn()} />);
    for (const h of [1, 5, 9, 11]) expect(screen.getByText(String(h))).toBeTruthy();
    expect(screen.getByText('00')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('AM')).toBeTruthy();
    expect(screen.getByText('PM')).toBeTruthy();
    // Half hours only, by decision: no :15, no :45.
    expect(screen.queryByText('15')).toBeNull();
    expect(screen.queryByText('45')).toBeNull();
  });

  it('changes one part of the time and keeps the rest', async () => {
    const onChange = jest.fn();
    await render(<TimeWheel value={{ h: 6, m: 30 }} onChange={onChange} />);
    await fireEvent.press(screen.getByText('7'));
    expect(onChange).toHaveBeenLastCalledWith({ h: 7, m: 30 });
    await fireEvent.press(screen.getByText('00'));
    expect(onChange).toHaveBeenLastCalledWith({ h: 6, m: 0 });
    await fireEvent.press(screen.getByText('PM'));
    expect(onChange).toHaveBeenLastCalledWith({ h: 18, m: 30 });
  });

  it('still lets a time outside daytime be chosen, and reports it as chosen', async () => {
    // The wheel does not refuse 10 PM. The picker that owns it does, with a
    // line saying what the range is.
    const onChange = jest.fn();
    await render(<TimeWheel value={{ h: 18, m: 0 }} onChange={onChange} />);
    await fireEvent.press(screen.getByText('10'));
    expect(onChange).toHaveBeenLastCalledWith({ h: 22, m: 0 });
  });

  it('carries the day too, written with the month', async () => {
    const onDay = jest.fn();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [0, 1, 2].map((n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
    await render(<TimeWheel value={{ h: 6, m: 30 }} onChange={jest.fn()} days={days} dayIndex={0} onDayIndex={onDay} />);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Tomorrow')).toBeTruthy();
    const third = screen.getByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2} [A-Z][a-z]{2}$/);
    await fireEvent.press(third);
    expect(onDay).toHaveBeenLastCalledWith(2);
  });

  it('gets noon and midnight the right way round', async () => {
    const onChange = jest.fn();
    await render(<TimeWheel value={{ h: 11, m: 0 }} onChange={onChange} />);
    await fireEvent.press(screen.getByText('12'));
    expect(onChange).toHaveBeenLastCalledWith({ h: 0, m: 0 });
  });
});
