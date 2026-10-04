import { inviteMessage } from './invite-message';

describe('inviteMessage', () => {
  it('names the first name and the activity, nothing agreed yet', () => {
    expect(inviteMessage('Dinesh Doluweera', 'running')).toBe(
      'Dinesh is challenging you to go for a run. Are you up for it?'
    );
    expect(inviteMessage('Gayan', 'home_workouts')).toBe('Gayan is challenging you to work out. Are you up for it?');
  });

  it('still reads with no name or an unknown activity', () => {
    expect(inviteMessage(null, 'yoga')).toBe("I'm challenging you to do yoga. Are you up for it?");
    expect(inviteMessage('Steve', null)).toBe(
      'Steve is challenging you to take on a challenge with them. Are you up for it?'
    );
  });
});
