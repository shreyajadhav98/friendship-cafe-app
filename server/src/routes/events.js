const express = require('express');
const mongoose = require('mongoose');
const EventBooking = require('../models/EventBooking');
const { authenticate } = require('../middleware/authenticate');
const { ADMIN_ROOM } = require('../sockets/orders');

const router = express.Router();
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const transitions = {
  Pending: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Completed', 'Cancelled'],
  Rejected: [], Completed: [], Cancelled: []
};

function cafeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function conflictsWithSpace(requestedSpace, existingSpace) {
  return requestedSpace === 'Full Cafe' || existingSpace === 'Full Cafe' || requestedSpace === existingSpace;
}

async function findApprovedConflicts({ eventDate, startTime, endTime, bookingSpace, excludeId }) {
  const filter = { eventDate, status: 'Approved' };
  if (excludeId) filter._id = { $ne: excludeId };
  const approved = await EventBooking.find(filter).select('bookingId startTime endTime bookingSpace eventType').lean();
  return approved.filter((entry) => conflictsWithSpace(bookingSpace, entry.bookingSpace) && hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime));
}

function publicBooking(booking) {
  return {
    id: String(booking._id),
    bookingId: booking.bookingId,
    eventType: booking.eventType,
    eventDate: booking.eventDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    bookingSpace: booking.bookingSpace,
    status: booking.status,
    guestCount: booking.guestCount,
    createdAt: booking.createdAt
  };
}

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const eventDate = parseDate(body.eventDate);
    const startTime = typeof body.startTime === 'string' ? body.startTime : '';
    const endTime = typeof body.endTime === 'string' ? body.endTime : '';
    if (!customerName || customerName.length > 120) return res.status(400).json({ error: 'Enter a customer name of 120 characters or fewer' });
    if (!/^\+?[\d\s().-]{6,25}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid contact phone number' });
    if (body.email && (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))) return res.status(400).json({ error: 'Enter a valid email address' });
    if (!eventDate) return res.status(400).json({ error: 'Choose a valid event date' });
    if (!timePattern.test(startTime) || !timePattern.test(endTime) || endTime <= startTime) return res.status(400).json({ error: 'Choose a valid time range with the end after the start' });
    if (Number(body.guestCount) < 1 || !Number.isInteger(Number(body.guestCount)) || Number(body.guestCount) > 1000) return res.status(400).json({ error: 'Guest count must be a whole number from 1 to 1000' });

    const parts = cafeDateParts();
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    if (body.eventDate < today || body.eventDate === today && startTime <= `${parts.hour}:${parts.minute}`) return res.status(400).json({ error: 'Event date and start time must be in the future' });

    const bookingSpace = body.bookingSpace || 'Private Section';
    if (!EventBooking.bookingSpaces.includes(bookingSpace)) return res.status(400).json({ error: 'Choose a valid booking space' });
    if (!EventBooking.cateringPreferences.includes(body.cateringPreference)) return res.status(400).json({ error: 'Choose a valid catering preference' });
    const conflicts = await findApprovedConflicts({ eventDate, startTime, endTime, bookingSpace });
    if (conflicts.length) return res.status(409).json({ error: 'This time slot overlaps an approved booking for the selected space', conflicts: conflicts.map((entry) => ({ bookingId: entry.bookingId, startTime: entry.startTime, endTime: entry.endTime, bookingSpace: entry.bookingSpace })) });

    const booking = await EventBooking.create({
      customerName, phone, email: body.email || '', eventType: body.eventType, eventDate, startTime, endTime,
      guestCount: Number(body.guestCount), bookingSpace, cateringPreference: body.cateringPreference,
      specialRequests: body.specialRequests || '', estimatedBudget: body.estimatedBudget === '' || body.estimatedBudget == null ? null : Number(body.estimatedBudget)
    });
    const io = req.app.get('io');
    if (io) io.to(ADMIN_ROOM).emit('new_event_booking', booking.toObject());
    return res.status(201).json({ booking: publicBooking(booking) });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: error.message });
    return next(error);
  }
});

router.get('/availability', async (req, res, next) => {
  try {
    const eventDate = parseDate(req.query.date);
    if (!eventDate) return res.status(400).json({ error: 'Provide date in YYYY-MM-DD format' });
    const bookings = await EventBooking.find({ eventDate, status: { $in: ['Pending', 'Approved'] } })
      .select('bookingId eventType startTime endTime bookingSpace status guestCount').sort({ startTime: 1 }).lean();
    return res.json({ date: req.query.date, slots: bookings });
  } catch (error) { return next(error); }
});

router.get('/lookup', async (req, res, next) => {
  try {
    const bookingId = typeof req.query.bookingId === 'string' ? req.query.bookingId.trim().toUpperCase() : '';
    const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : '';
    if (!bookingId && !/^\+?[\d\s().-]{6,25}$/.test(phone)) return res.status(400).json({ error: 'Enter a booking ID or valid phone number' });
    const query = bookingId ? { bookingId } : { phone };
    const bookings = await EventBooking.find(query).select('bookingId eventType eventDate startTime endTime bookingSpace status guestCount createdAt').sort({ eventDate: -1 }).limit(25).lean();
    return res.json({ bookings });
  } catch (error) { return next(error); }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && EventBooking.bookingStatuses.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.eventType && EventBooking.eventTypes.includes(req.query.eventType)) filter.eventType = req.query.eventType;
    if (req.query.upcoming === 'true') {
      const parts = cafeDateParts();
      filter.eventDate = { $gte: new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`) };
    }
    const bookings = await EventBooking.find(filter).sort({ eventDate: 1, startTime: 1, createdAt: -1 }).limit(300).lean();
    return res.json({ bookings });
  } catch (error) { return next(error); }
});

router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid booking id' });
    const booking = await EventBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Event booking not found' });
    const { status } = req.body || {};
    if (!EventBooking.bookingStatuses.includes(status)) return res.status(400).json({ error: 'Choose a valid event booking status' });
    if (status !== booking.status && !transitions[booking.status]?.includes(status)) return res.status(409).json({ error: `Cannot change booking from ${booking.status} to ${status}` });
    if (status === 'Approved' && booking.status !== 'Approved') {
      const conflicts = await findApprovedConflicts({ eventDate: booking.eventDate, startTime: booking.startTime, endTime: booking.endTime, bookingSpace: booking.bookingSpace, excludeId: booking._id });
      if (conflicts.length) return res.status(409).json({ error: 'This time slot overlaps another approved booking', conflicts: conflicts.map((entry) => ({ bookingId: entry.bookingId, startTime: entry.startTime, endTime: entry.endTime, bookingSpace: entry.bookingSpace })) });
    }
    if (typeof req.body.adminNotes === 'string') {
      if (req.body.adminNotes.length > 2000) return res.status(400).json({ error: 'Admin notes must be 2000 characters or fewer' });
      booking.adminNotes = req.body.adminNotes.trim();
    }
    booking.status = status;
    await booking.save();
    const result = booking.toObject();
    req.app.get('io')?.to(ADMIN_ROOM).emit('event_status_updated', result);
    return res.json({ booking: result });
  } catch (error) { return next(error); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid booking id' });
    const booking = await EventBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Event booking not found' });
    req.app.get('io')?.to(ADMIN_ROOM).emit('event_status_updated', { _id: String(booking._id), bookingId: booking.bookingId, status: 'Deleted' });
    return res.json({ message: 'Event booking deleted', bookingId: booking.bookingId });
  } catch (error) { return next(error); }
});

module.exports = router;
