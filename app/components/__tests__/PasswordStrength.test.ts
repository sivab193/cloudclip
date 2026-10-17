import { passwordAssessment } from '../../utils/passwordStrength';

describe('passwordAssessment', () => {
  it('rejects short and commonly guessed passwords', () => {
    expect(passwordAssessment('short').acceptable).toBe(false);
    expect(passwordAssessment('passwordpassword').acceptable).toBe(false);
  });

  it('accepts a long, uncommon passphrase', () => {
    expect(passwordAssessment('luminous kiln orchard vertex river').acceptable).toBe(true);
  });

  it('considers personal words when estimating strength', () => {
    expect(passwordAssessment('marlowe20262026', ['marlowe']).acceptable).toBe(false);
  });
});
