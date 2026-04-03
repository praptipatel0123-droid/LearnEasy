const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:      { type: String, required: true },
  city:       { type: String, required: true },
  state:      { type: String, required: true },
  country:    { type: String, required: true },
  grade:      { type: Number, required: true },
  board:      { type: String, required: true },
  password:   { type: String, required: true },
}, { timestamps: true });

UserSchema.pre('save', async function () {
  if (this.isModified('password'))
    this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', UserSchema);
