'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Star, Heart, Menu, X, User, Home, Car, Laptop, Plus, LogOut, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function RentEase() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [messages, setMessages] = useState([]);

  // Auth form state
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    user_type: 'renter'
  });

  // Listing form state
  const [listingForm, setListingForm] = useState({
    title: '',
    description: '',
    category: 'apartment',
    price: '',
    location: '',
    amenities: '',
    images: []
  });

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    check_in: '',
    check_out: '',
    guests: 1
  });

  // Message form state
  const [messageForm, setMessageForm] = useState({
    receiver_id: '',
    message: ''
  });

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      loadUserData();
    }
    loadListings();
  }, []);

  // Filter listings when search/category changes
  useEffect(() => {
    let filtered = listings;
    
    if (searchQuery) {
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(listing => listing.category === categoryFilter);
    }
    
    setFilteredListings(filtered);
  }, [searchQuery, categoryFilter, listings]);

  const loadUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        // Token invalid, logout
        handleLogout();
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadListings = async () => {
    try {
      const response = await fetch('/api/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings);
        setFilteredListings(data.listings);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  const loadBookings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadMessages = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : authForm;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setShowAuthDialog(false);
        setAuthForm({ name: '', email: '', password: '', user_type: 'renter' });
        alert(`Welcome ${data.user.name}!`);
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('home');
    alert('Logged out successfully');
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      return;
    }

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...listingForm,
          amenities: listingForm.amenities.split(',').map(a => a.trim())
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Listing created successfully!');
        setListingForm({
          title: '',
          description: '',
          category: 'apartment',
          price: '',
          location: '',
          amenities: '',
          images: []
        });
        loadListings();
        setCurrentPage('dashboard');
      } else {
        alert(data.error || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setListingForm({
          ...listingForm,
          images: [...listingForm.images, data.imageUrl]
        });
      } else {
        alert(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      setShowAuthDialog(true);
      return;
    }

    if (!selectedListing) return;

    // Calculate total price
    const checkIn = new Date(bookingForm.check_in);
    const checkOut = new Date(bookingForm.check_out);
    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalPrice = days * selectedListing.price;

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listing_id: selectedListing.id,
          check_in: bookingForm.check_in,
          check_out: bookingForm.check_out,
          total_price: totalPrice
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Booking confirmed! Payment processed successfully (Mock).');
        setBookingForm({ check_in: '', check_out: '', guests: 1 });
        setSelectedListing(null);
        setCurrentPage('dashboard');
      } else {
        alert(data.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageForm)
      });

      if (response.ok) {
        alert('Message sent successfully!');
        setMessageForm({ receiver_id: '', message: '' });
        loadMessages();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const viewListingDetails = async (listing) => {
    try {
      const response = await fetch(`/api/listings/${listing.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedListing(data.listing);
        setCurrentPage('listing-detail');
      }
    } catch (error) {
      console.error('Error loading listing details:', error);
    }
  };

  // Navigation
  const NavBar = () => (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <Home className="h-8 w-8 text-sky-500" />
            <span className="text-2xl font-bold text-gray-800">RentEase</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {user.user_type === 'host' && (
                  <Button variant="outline" onClick={() => setCurrentPage('add-listing')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Listing
                  </Button>
                )}
                <Button variant="ghost" onClick={() => {
                  setCurrentPage('dashboard');
                  if (user.user_type === 'renter') {
                    loadBookings();
                  } else {
                    loadListings();
                  }
                }}>
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button variant="ghost" onClick={() => {
                  setCurrentPage('messages');
                  loadMessages();
                }}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </Button>
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => {
                  setAuthMode('login');
                  setShowAuthDialog(true);
                }}>
                  Login
                </Button>
                <Button onClick={() => {
                  setAuthMode('register');
                  setShowAuthDialog(true);
                }}>
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button variant="ghost" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2">
            {user ? (
              <>
                {user.user_type === 'host' && (
                  <Button variant="outline" className="w-full" onClick={() => {
                    setCurrentPage('add-listing');
                    setMobileMenuOpen(false);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Listing
                  </Button>
                )}
                <Button variant="ghost" className="w-full" onClick={() => {
                  setCurrentPage('dashboard');
                  setMobileMenuOpen(false);
                  if (user.user_type === 'renter') {
                    loadBookings();
                  }
                }}>
                  <User className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => {
                  setCurrentPage('messages');
                  loadMessages();
                  setMobileMenuOpen(false);
                }}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Messages
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="w-full" onClick={() => {
                  setAuthMode('login');
                  setShowAuthDialog(true);
                  setMobileMenuOpen(false);
                }}>
                  Login
                </Button>
                <Button className="w-full" onClick={() => {
                  setAuthMode('register');
                  setShowAuthDialog(true);
                  setMobileMenuOpen(false);
                }}>
                  Sign Up
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );

  // Home Page
  const HomePage = () => (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-sky-100 to-coral-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              Find Your Perfect Rental
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Apartments, cars, gadgets, and more. All in one place.
            </p>

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center border rounded-md px-3">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <Input
                  type="text"
                  placeholder="Where are you looking?"
                  className="border-0 focus-visible:ring-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="apartment">Apartments</SelectItem>
                  <SelectItem value="car">Cars</SelectItem>
                  <SelectItem value="gadget">Gadgets</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-sky-500 hover:bg-sky-600">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Listings */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Featured Listings</h2>
        
        {filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No listings found. {user?.user_type === 'host' ? 'Create your first listing!' : 'Check back later.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => viewListingDetails(listing)}>
                <div className="relative h-48 bg-gray-200">
                  {listing.images && listing.images[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80 hover:bg-white">
                    <Heart className="h-5 w-5" />
                  </Button>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{listing.title}</CardTitle>
                    <Badge variant="secondary">{listing.category}</Badge>
                  </div>
                  <CardDescription className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {listing.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm line-clamp-2">{listing.description}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div>
                    <span className="text-2xl font-bold text-sky-600">${listing.price}</span>
                    <span className="text-gray-500 text-sm">/day</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 text-sm">4.8</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-beige-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Why Choose RentEase?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-sky-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="h-8 w-8 text-sky-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Wide Selection</h3>
              <p className="text-gray-600">Browse apartments, cars, gadgets, and more</p>
            </div>
            <div className="text-center">
              <div className="bg-coral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-coral-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Hosts</h3>
              <p className="text-gray-600">All hosts are verified for your safety</p>
            </div>
            <div className="text-center">
              <div className="bg-beige-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-beige-800" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Communication</h3>
              <p className="text-gray-600">Message hosts directly through our platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Listing Detail Page
  const ListingDetailPage = () => {
    if (!selectedListing) return null;

    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => setCurrentPage('home')} className="mb-4">
          ← Back to Listings
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {selectedListing.images && selectedListing.images.length > 0 ? (
                selectedListing.images.map((img, idx) => (
                  <img key={idx} src={img} alt={selectedListing.title} className="w-full h-64 object-cover rounded-lg" />
                ))
              ) : (
                <div className="col-span-2 h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Home className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold">{selectedListing.title}</h1>
                  <Badge>{selectedListing.category}</Badge>
                </div>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  {selectedListing.location}
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-gray-600">{selectedListing.description}</p>
              </div>

              {selectedListing.amenities && selectedListing.amenities.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedListing.amenities.map((amenity, idx) => (
                      <Badge key={idx} variant="outline">{amenity}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedListing.host && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">Host Information</h2>
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>{selectedListing.host.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedListing.host.name}</p>
                      <p className="text-sm text-gray-500">{selectedListing.host.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-sky-600">${selectedListing.price}</span>
                  <span className="text-sm text-gray-500">/day</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <Label htmlFor="check_in">Check-in</Label>
                    <Input
                      id="check_in"
                      type="date"
                      value={bookingForm.check_in}
                      onChange={(e) => setBookingForm({ ...bookingForm, check_in: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="check_out">Check-out</Label>
                    <Input
                      id="check_out"
                      type="date"
                      value={bookingForm.check_out}
                      onChange={(e) => setBookingForm({ ...bookingForm, check_out: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests">Guests</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      value={bookingForm.guests}
                      onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })}
                    />
                  </div>
                  {bookingForm.check_in && bookingForm.check_out && (
                    <div className="border-t pt-4">
                      <div className="flex justify-between mb-2">
                        <span>Total Days:</span>
                        <span>{Math.ceil((new Date(bookingForm.check_out) - new Date(bookingForm.check_in)) / (1000 * 60 * 60 * 24))}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Price:</span>
                        <span>${Math.ceil((new Date(bookingForm.check_out) - new Date(bookingForm.check_in)) / (1000 * 60 * 60 * 24)) * selectedListing.price}</span>
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-sky-500 hover:bg-sky-600">
                    Book Now
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Add Listing Page
  const AddListingPage = () => (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Add New Listing</h1>
      <form onSubmit={handleCreateListing} className="space-y-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={listingForm.title}
            onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            value={listingForm.description}
            onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={listingForm.category} onValueChange={(value) => setListingForm({ ...listingForm, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="gadget">Gadget</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="price">Price (per day)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={listingForm.price}
              onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={listingForm.location}
            onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="amenities">Amenities (comma separated)</Label>
          <Input
            id="amenities"
            placeholder="WiFi, Parking, Kitchen"
            value={listingForm.amenities}
            onChange={(e) => setListingForm({ ...listingForm, amenities: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="images">Upload Images</Label>
          <Input
            id="images"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
          {listingForm.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {listingForm.images.map((img, idx) => (
                <img key={idx} src={img} alt={`Upload ${idx + 1}`} className="w-full h-24 object-cover rounded" />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1 bg-sky-500 hover:bg-sky-600">
            Create Listing
          </Button>
          <Button type="button" variant="outline" onClick={() => setCurrentPage('home')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );

  // Dashboard Page
  const DashboardPage = () => {
    useEffect(() => {
      if (user?.user_type === 'renter') {
        loadBookings();
      } else if (user?.user_type === 'host') {
        loadBookings();
        loadListings();
      }
    }, []);

    if (!user) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-lg text-gray-600">Please login to view your dashboard</p>
        </div>
      );
    }

    if (user.user_type === 'renter') {
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">My Bookings</h1>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No bookings yet. Start exploring!</p>
              <Button onClick={() => setCurrentPage('home')} className="mt-4">
                Browse Listings
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{booking.listing?.title || 'Listing'}</CardTitle>
                        <CardDescription>
                          {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge>{booking.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Host: {booking.host?.name}</p>
                        <p className="text-sm text-gray-600">Location: {booking.listing?.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-sky-600">${booking.total_price}</p>
                        <p className="text-sm text-gray-500">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Host Dashboard
    const hostListings = listings.filter(l => l.host_id === user.id);
    
    return (
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="bookings">Bookings Received</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Listings</h2>
              <Button onClick={() => setCurrentPage('add-listing')}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>

            {hostListings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No listings yet. Create your first listing!</p>
                <Button onClick={() => setCurrentPage('add-listing')} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hostListings.map((listing) => (
                  <Card key={listing.id}>
                    <div className="relative h-48 bg-gray-200">
                      {listing.images && listing.images[0] ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle>{listing.title}</CardTitle>
                      <CardDescription>{listing.location}</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between">
                      <span className="text-xl font-bold text-sky-600">${listing.price}/day</span>
                      <Badge>{listing.category}</Badge>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <h2 className="text-2xl font-bold mb-6">Bookings Received</h2>
            
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No bookings yet.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{booking.listing?.title || 'Listing'}</CardTitle>
                          <CardDescription>
                            Booked by: {booking.renter?.name || 'User'}
                          </CardDescription>
                        </div>
                        <Badge>{booking.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">Contact: {booking.renter?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">${booking.total_price}</p>
                          <p className="text-sm text-gray-500">Earning</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Messages Page
  const MessagesPage = () => {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Messages</h1>
        
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <Card key={msg.id}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarFallback>{msg.sender?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">{msg.sender?.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(msg.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{msg.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <Label htmlFor="receiver_email">Recipient (User ID)</Label>
                <Input
                  id="receiver_email"
                  value={messageForm.receiver_id}
                  onChange={(e) => setMessageForm({ ...messageForm, receiver_id: e.target.value })}
                  placeholder="Enter user ID"
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Send Message</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Auth Dialog
  const AuthDialog = () => (
    <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{authMode === 'login' ? 'Login' : 'Sign Up'}</DialogTitle>
          <DialogDescription>
            {authMode === 'login' ? 'Welcome back! Login to continue.' : 'Create your account to get started.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'register' && (
            <>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="user_type">Account Type</Label>
                <Select value={authForm.user_type} onValueChange={(value) => setAuthForm({ ...authForm, user_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="renter">Renter (Browse & Book)</SelectItem>
                    <SelectItem value="host">Host (Post Listings)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full">
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </Button>
          </DialogFooter>

          <p className="text-sm text-center text-gray-600">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="text-sky-600 hover:underline"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'listing-detail' && <ListingDetailPage />}
      {currentPage === 'add-listing' && <AddListingPage />}
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'messages' && <MessagesPage />}
      
      <AuthDialog />

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Home className="h-6 w-6" />
                <span className="text-xl font-bold">RentEase</span>
              </div>
              <p className="text-gray-400 text-sm">Your one-stop rental marketplace</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Safety</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 RentEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
