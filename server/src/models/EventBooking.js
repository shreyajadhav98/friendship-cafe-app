const mongoose = require('mongoose');
const crypto = require('crypto');

const eventTypes = [
  'Birthday Party', 'Anniversary Celebration', 'Bridal Shower', 'Baby Shower', 'Engagement Party',
  'Graduation Party', 'Farewell Party', 'Retirement Party', 'Reunion (Family or Friends)',
  'Corporate Meeting', 'Business Networking Event', 'Product Launch', 'Workshop or Masterclass',
  'Book Club Meeting', 'Open Mic Night', 'Live Music Performance', 'Stand-up Comedy Show',
  'Art Exhibition or Pop-up Shop', 'Holiday or Seasonal Party', 'Private Dinner or Brunch'
];
const bookingSpaces = ['Full Cafe', 'Private Section', 'Outdoor Patio'];
const cateringPreferences = ['Standard Menu', 'Custom Buffet', 'Drinks & Snacks Only', 'No Catering'];
const bookingStatuses = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

function createBookingId() {
  return `EVT-${crypto.randomBytes(4).toString('hex').slice(0, 4).toUpperCase()}`;
}

const eventBookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true, default: createBookingId, trim: true, uppercase: true },
  customerName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 25 },
  email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
  eventType: { type: String, required: true, enum: eventTypes },
  eventDate: { type: Date, required: true },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  guestCount: { type: Number, required: true, min: 1, max: 1000 },
  bookingSpace: { type: String, enum: bookingSpaces, default: 'Private Section', required: true },
  cateringPreference: { type: String, enum: cateringPreferences, required: true },
  specialRequests: { type: String, default: '', trim: true, maxlength: 3000 },
  estimatedBudget: { type: Number, min: 0, default: null },
  status: { type: String, enum: bookingStatuses, default: 'Pending', index: true },
  adminNotes: { type: String, default: '', trim: true, maxlength: 2000 }
}, { timestamps: true, versionKey: false });

eventBookingSchema.index({ eventDate: 1, status: 1, startTime: 1 });

const EventBooking = mongoose.models.EventBooking || mongoose.model('EventBooking', eventBookingSchema);
EventBooking.eventTypes = eventTypes;
EventBooking.bookingSpaces = bookingSpaces;
EventBooking.cateringPreferences = cateringPreferences;
EventBooking.bookingStatuses = bookingStatuses;

module.exports = EventBooking;
