
describe('a partner reading the Why answers (#203)', () => {
  it('asks the questions about them, in order, with their own words winning', () => {
    const { partnerWhy } = require('./reflections');
    const out = partnerWhy([
      { question_key: 'gain', choice_key: 'more_energy', custom_text: null },
      { question_key: 'purpose', choice_key: 'healthier_routine', custom_text: null },
      { question_key: 'lose', choice_key: 'something_else', custom_text: 'My Saturday mornings' }
    ]);
    expect(out.map((x: any) => x.question)).toEqual([
      "What's their purpose for doing this?",
      'What will they gain if they stick with it?',
      "What will they lose if they don't?"
    ]);
    expect(out[0].answer).toBe('Build a healthier routine');
    expect(out[2].answer).toBe('My Saturday mornings');
  });

  it('leaves out a skipped question, and copes with none at all', () => {
    const { partnerWhy } = require('./reflections');
    expect(partnerWhy([{ question_key: 'matters', choice_key: 'something_else', custom_text: '  ' }])).toEqual([]);
    expect(partnerWhy(undefined)).toEqual([]);
  });
});
