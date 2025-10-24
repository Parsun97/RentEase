import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'rentease-secret-key-change-in-production';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  cachedClient = client;
  return client;
}

function getAuthToken(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function GET(request, { params }) {
  const client = await connectToDatabase();
  const db = client.db(process.env.DB_NAME || 'rentease');
  const url = new URL(request.url);
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');

  try {
    // GET /api/auth/me - Get current user
    if (path === 'auth/me') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'No token provided' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const user = await db.collection('users').findOne({ id: decoded.userId });
      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      
      const { password_hash, ...userWithoutPassword } = user;
      return Response.json({ user: userWithoutPassword });
    }

    // GET /api/listings - Get all listings with filters
    if (path === 'listings') {
      const search = url.searchParams.get('search') || '';
      const category = url.searchParams.get('category') || '';
      const minPrice = url.searchParams.get('minPrice');
      const maxPrice = url.searchParams.get('maxPrice');
      const hostId = url.searchParams.get('hostId');
      
      let query = {};
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (category) {
        query.category = category;
      }
      
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }
      
      if (hostId) {
        query.host_id = hostId;
      }
      
      const listings = await db.collection('listings').find(query).sort({ created_at: -1 }).toArray();
      return Response.json({ listings });
    }

    // GET /api/listings/:id - Get single listing
    if (path.startsWith('listings/')) {
      const listingId = path.split('/')[1];
      const listing = await db.collection('listings').findOne({ id: listingId });
      
      if (!listing) {
        return Response.json({ error: 'Listing not found' }, { status: 404 });
      }
      
      // Get host info
      const host = await db.collection('users').findOne({ id: listing.host_id });
      if (host) {
        const { password_hash, ...hostInfo } = host;
        listing.host = hostInfo;
      }
      
      // Get reviews for this listing
      const reviews = await db.collection('reviews').find({ listing_id: listingId }).sort({ created_at: -1 }).toArray();
      listing.reviews = reviews;
      
      return Response.json({ listing });
    }

    // GET /api/bookings - Get user bookings
    if (path === 'bookings') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const user = await db.collection('users').findOne({ id: decoded.userId });
      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      
      let bookings;
      if (user.user_type === 'host') {
        // Get bookings for host's listings
        bookings = await db.collection('bookings').find({ host_id: decoded.userId }).sort({ created_at: -1 }).toArray();
      } else {
        // Get bookings made by renter
        bookings = await db.collection('bookings').find({ renter_id: decoded.userId }).sort({ created_at: -1 }).toArray();
      }
      
      // Populate listing and user info
      for (let booking of bookings) {
        const listing = await db.collection('listings').findOne({ id: booking.listing_id });
        booking.listing = listing;
        
        if (user.user_type === 'host') {
          const renter = await db.collection('users').findOne({ id: booking.renter_id });
          if (renter) {
            const { password_hash, ...renterInfo } = renter;
            booking.renter = renterInfo;
          }
        } else {
          const host = await db.collection('users').findOne({ id: booking.host_id });
          if (host) {
            const { password_hash, ...hostInfo } = host;
            booking.host = hostInfo;
          }
        }
      }
      
      return Response.json({ bookings });
    }

    // GET /api/messages - Get user messages
    if (path === 'messages') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const conversationWith = url.searchParams.get('userId');
      
      let query;
      if (conversationWith) {
        query = {
          $or: [
            { sender_id: decoded.userId, receiver_id: conversationWith },
            { sender_id: conversationWith, receiver_id: decoded.userId }
          ]
        };
      } else {
        query = {
          $or: [
            { sender_id: decoded.userId },
            { receiver_id: decoded.userId }
          ]
        };
      }
      
      const messages = await db.collection('messages').find(query).sort({ created_at: 1 }).toArray();
      
      // Get user info for each message
      for (let message of messages) {
        const sender = await db.collection('users').findOne({ id: message.sender_id });
        if (sender) {
          const { password_hash, ...senderInfo } = sender;
          message.sender = senderInfo;
        }
      }
      
      return Response.json({ messages });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const client = await connectToDatabase();
  const db = client.db(process.env.DB_NAME || 'rentease');
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');

  try {
    // POST /api/auth/register - Register new user
    if (path === 'auth/register') {
      const body = await request.json();
      const { name, email, password, user_type } = body;
      
      if (!name || !email || !password || !user_type) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      if (!['renter', 'host'].includes(user_type)) {
        return Response.json({ error: 'Invalid user type' }, { status: 400 });
      }
      
      // Check if user exists
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return Response.json({ error: 'User already exists' }, { status: 400 });
      }
      
      // Hash password
      const password_hash = await bcrypt.hash(password, 10);
      
      // Create user
      const user = {
        id: uuidv4(),
        name,
        email,
        password_hash,
        user_type,
        profile_photo: '',
        created_at: new Date()
      };
      
      await db.collection('users').insertOne(user);
      
      // Generate token
      const token = jwt.sign({ userId: user.id, userType: user.user_type }, JWT_SECRET, { expiresIn: '7d' });
      
      const { password_hash: _, ...userWithoutPassword } = user;
      return Response.json({ user: userWithoutPassword, token });
    }

    // POST /api/auth/login - Login user
    if (path === 'auth/login') {
      const body = await request.json();
      const { email, password } = body;
      
      if (!email || !password) {
        return Response.json({ error: 'Missing email or password' }, { status: 400 });
      }
      
      // Find user
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      
      // Generate token
      const token = jwt.sign({ userId: user.id, userType: user.user_type }, JWT_SECRET, { expiresIn: '7d' });
      
      const { password_hash: _, ...userWithoutPassword } = user;
      return Response.json({ user: userWithoutPassword, token });
    }

    // POST /api/listings - Create new listing
    if (path === 'listings') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const user = await db.collection('users').findOne({ id: decoded.userId });
      if (!user || user.user_type !== 'host') {
        return Response.json({ error: 'Only hosts can create listings' }, { status: 403 });
      }
      
      const body = await request.json();
      const { title, description, category, price, location, amenities, images } = body;
      
      if (!title || !description || !category || !price || !location) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const listing = {
        id: uuidv4(),
        title,
        description,
        category,
        price: parseFloat(price),
        location,
        amenities: amenities || [],
        images: images || [],
        host_id: decoded.userId,
        available: true,
        created_at: new Date()
      };
      
      await db.collection('listings').insertOne(listing);
      return Response.json({ listing });
    }

    // POST /api/upload - Upload image
    if (path === 'upload') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }
      
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${uuidv4()}-${file.name}`;
      const filepath = path.join(uploadDir, filename);
      
      await writeFile(filepath, buffer);
      
      const imageUrl = `/uploads/${filename}`;
      return Response.json({ imageUrl });
    }

    // POST /api/bookings - Create booking
    if (path === 'bookings') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const user = await db.collection('users').findOne({ id: decoded.userId });
      if (!user || user.user_type !== 'renter') {
        return Response.json({ error: 'Only renters can create bookings' }, { status: 403 });
      }
      
      const body = await request.json();
      const { listing_id, check_in, check_out, total_price } = body;
      
      if (!listing_id || !check_in || !check_out || !total_price) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Get listing
      const listing = await db.collection('listings').findOne({ id: listing_id });
      if (!listing) {
        return Response.json({ error: 'Listing not found' }, { status: 404 });
      }
      
      // Check for booking conflicts
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);
      
      const conflictingBooking = await db.collection('bookings').findOne({
        listing_id,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { check_in: { $lte: checkOutDate }, check_out: { $gte: checkInDate } }
        ]
      });
      
      if (conflictingBooking) {
        return Response.json({ error: 'Listing is not available for selected dates' }, { status: 400 });
      }
      
      const booking = {
        id: uuidv4(),
        listing_id,
        renter_id: decoded.userId,
        host_id: listing.host_id,
        check_in: checkInDate,
        check_out: checkOutDate,
        total_price: parseFloat(total_price),
        status: 'confirmed', // Auto-confirm for MVP
        payment_status: 'paid', // Mock payment
        created_at: new Date()
      };
      
      await db.collection('bookings').insertOne(booking);
      return Response.json({ booking });
    }

    // POST /api/messages - Send message
    if (path === 'messages') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const body = await request.json();
      const { receiver_id, message, booking_id } = body;
      
      if (!receiver_id || !message) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const messageDoc = {
        id: uuidv4(),
        sender_id: decoded.userId,
        receiver_id,
        booking_id: booking_id || null,
        message,
        read_status: false,
        created_at: new Date()
      };
      
      await db.collection('messages').insertOne(messageDoc);
      return Response.json({ message: messageDoc });
    }

    // POST /api/reviews - Create review
    if (path === 'reviews') {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const body = await request.json();
      const { listing_id, rating, review_text } = body;
      
      if (!listing_id || !rating || !review_text) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const review = {
        id: uuidv4(),
        listing_id,
        user_id: decoded.userId,
        rating: parseInt(rating),
        review_text,
        created_at: new Date()
      };
      
      await db.collection('reviews').insertOne(review);
      return Response.json({ review });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const client = await connectToDatabase();
  const db = client.db(process.env.DB_NAME || 'rentease');
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');

  try {
    // PUT /api/listings/:id - Update listing
    if (path.startsWith('listings/')) {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const listingId = path.split('/')[1];
      const listing = await db.collection('listings').findOne({ id: listingId });
      
      if (!listing) {
        return Response.json({ error: 'Listing not found' }, { status: 404 });
      }
      
      if (listing.host_id !== decoded.userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      const body = await request.json();
      const { title, description, category, price, location, amenities, images, available } = body;
      
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (location !== undefined) updateData.location = location;
      if (amenities !== undefined) updateData.amenities = amenities;
      if (images !== undefined) updateData.images = images;
      if (available !== undefined) updateData.available = available;
      
      updateData.updated_at = new Date();
      
      await db.collection('listings').updateOne({ id: listingId }, { $set: updateData });
      
      const updatedListing = await db.collection('listings').findOne({ id: listingId });
      return Response.json({ listing: updatedListing });
    }

    // PUT /api/bookings/:id - Update booking status
    if (path.startsWith('bookings/')) {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const bookingId = path.split('/')[1];
      const booking = await db.collection('bookings').findOne({ id: bookingId });
      
      if (!booking) {
        return Response.json({ error: 'Booking not found' }, { status: 404 });
      }
      
      if (booking.host_id !== decoded.userId && booking.renter_id !== decoded.userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      const body = await request.json();
      const { status } = body;
      
      if (!status) {
        return Response.json({ error: 'Status is required' }, { status: 400 });
      }
      
      await db.collection('bookings').updateOne({ id: bookingId }, { $set: { status, updated_at: new Date() } });
      
      const updatedBooking = await db.collection('bookings').findOne({ id: bookingId });
      return Response.json({ booking: updatedBooking });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const client = await connectToDatabase();
  const db = client.db(process.env.DB_NAME || 'rentease');
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');

  try {
    // DELETE /api/listings/:id - Delete listing
    if (path.startsWith('listings/')) {
      const token = getAuthToken(request);
      if (!token) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      const listingId = path.split('/')[1];
      const listing = await db.collection('listings').findOne({ id: listingId });
      
      if (!listing) {
        return Response.json({ error: 'Listing not found' }, { status: 404 });
      }
      
      if (listing.host_id !== decoded.userId) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
      }
      
      await db.collection('listings').deleteOne({ id: listingId });
      return Response.json({ message: 'Listing deleted successfully' });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}