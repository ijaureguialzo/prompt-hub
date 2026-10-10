// Stable, translatable codes for Mongoose validator messages that are
// written explicitly in the schemas (the default Mongoose messages —
// "Path `x` is required." — map to the generic VALIDATION_ERROR code).
//
// Shared by the global error handler and the auth controller (which maps
// validation errors itself to keep response timing uniform for login).
module.exports = {
  'At most 20 tags are allowed': 'TAGS_TOO_MANY',
  'Please enter a valid email': 'EMAIL_INVALID',
  'Password must be at least 8 characters': 'PASSWORD_TOO_SHORT'
};
