const User = require('../src/models/User');

describe('User model', () => {
  beforeAll(async () => {
    const utils = require('./utils');
    await utils.connectDB();
  });

  afterAll(async () => {
    const utils = require('./utils');
    await utils.disconnectDB();
  });

  beforeEach(async () => {
    const utils = require('./utils');
    await utils.clearDatabase();
  });

  it('hashes the password on save', async () => {
    const user = new User({ name: 'A', email: 'a@test.com', password: 'plain-password' });
    await user.save();

    expect(user.password).not.toBe('plain-password');
    expect(await user.comparePassword('plain-password')).toBe(true);
  });

  it('saves an existing user whose password is unchanged (Mongoose 9 promise hook)', async () => {
    // Regression: the pre-save hook used the removed callback style
    // `function (next) { ... return next(); }`, so ANY save() of an
    // existing document whose password was not modified crashed with
    // "next is not a function" (broke seedAdmin's promote path and any
    // future self-service profile/password update).
    const user = new User({ name: 'A', email: 'a@test.com', password: 'plain-password' });
    await user.save();

    user.name = 'A Updated';
    await user.save();

    expect(user.name).toBe('A Updated');
    expect(user.password).not.toBe('plain-password'); // still hashed
  });
});
