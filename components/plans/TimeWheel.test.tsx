import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TimeWheel } from './TimeWheel';

// Apple's wheel is native. Stood in for by a plain view that keeps its props,
// so a test can read what the app asked Apple for.
const lastApple: { props: any } = { props: null };
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      lastApple.props = props;
      return <View testID="apple-time" />;
    }
  };
});

const realOS = Platform.OS;
const asPlatform = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
};
afterEach(() => asPlatform(realOS));

// Scrolling cannot be driven from here, but every value on the wheel can also
// be tapped, and a tap goes through the same conversion a scroll does.
describe('TimeWheel on Android: every column is ours (#191)', () => {
  beforeEach(() => asPlatform('android'));

  it('offers twelve hours, the two half hours, and AM or PM', async () => {
    await render(<TimeWheel value={{ h: 6, m: 30 }} onChange={jest.fn()} />);
    for (const h of [1, 5, 9, 11]) expect(screen.getByText(String(h))).toBeTruthy();
    expect(screen.getByText('00')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('AM')).toBeTruthy();
    expect(screen.getByText('PM')).toBeTruthy();
    // Says what can be picked (#204).
    expect(screen.getByText('Times from 5:00 AM to 9:00 PM, every half hour.')).toBeTruthy();
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

describe("TimeWheel on iPhone: our day, Apple's time (decided 10 Nov 2026)", () => {
  beforeEach(() => asPlatform('ios'));

  const days = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return [0, 1, 2].map((n) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
  };

  it("hands hour, minutes and AM/PM to Apple's wheel, in half hours and daytime only", async () => {
    await render(<TimeWheel value={{ h: 6, m: 30 }} onChange={jest.fn()} />);
    expect(screen.getByTestId('apple-time')).toBeTruthy();
    const apple = lastApple;
    expect(apple.props.mode).toBe('time');
    expect(apple.props.display).toBe('spinner');
    expect(apple.props.minuteInterval).toBe(30);
    expect(apple.props.value.getHours()).toBe(6);
    expect(apple.props.value.getMinutes()).toBe(30);
    expect(apple.props.minimumDate.getHours()).toBe(5);
    expect(apple.props.maximumDate.getHours()).toBe(21);
    // No hour column of ours on iPhone.
    expect(screen.queryByText('11')).toBeNull();
  });

  it("reads the time back from Apple's wheel", async () => {
    const onChange = jest.fn();
    await render(<TimeWheel value={{ h: 6, m: 30 }} onChange={onChange} />);
    expect(screen.getByTestId('apple-time')).toBeTruthy();
    const apple = lastApple;
    const d = new Date();
    d.setHours(19, 30, 0, 0);
    apple.props.onValueChange({}, d);
    expect(onChange).toHaveBeenLastCalledWith({ h: 19, m: 30 });
  });

  it('keeps the day column ours, written by the app', async () => {
    const onDay = jest.fn();
    await render(<TimeWheel value={{ h: 6, m: 30 }} onChange={jest.fn()} days={days()} dayIndex={0} onDayIndex={onDay} />);
    expect(screen.getByText('Today')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tomorrow'));
    expect(onDay).toHaveBeenLastCalledWith(1);
  });
});
