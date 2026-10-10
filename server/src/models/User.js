const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    // Custom message (array form) so the error handler can map it to a
    // stable, translatable code — the Mongoose default is not.
    minlength: [8, 'Password must be at least 8 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Internal claim token (never exposed via toJSON, never settable via
  // the API): see the index below and authController.register.
  adminSlot: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving (Mongoose 9: promise-based middleware, no
// callback — `next` was removed and would crash on every save of an
// existing document whose password is unchanged).
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Claim token for the "first registered user becomes admin" rule.
// The UNIQUE SPARSE index guarantees at most ONE document can hold the
// token: concurrent first registrations race, and the index (not the
// application) arbitrates atomically — exactly one winner.
// (Sparse: documents without the field do not index; nulls are ignored.)
userSchema.index({ adminSlot: 1 }, { unique: true, sparse: true });

// Compare password method
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Exclude password (and the internal claim token) from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.adminSlot;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
