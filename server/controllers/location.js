const Location = require('../models/Location');
const geocodingService = require('../services/geocoding');

// @desc    Geocode a place name to coordinates
// @route   POST /api/locations/geocode
// @access  Private (Admin, Manager)
exports.geocodePlace = async (req, res, next) => {
  try {
    const { placeName, region = 'Ahmedabad, Gujarat, India' } = req.body;

    if (!placeName) {
      return res.status(400).json({
        success: false,
        error: 'Place name is required'
      });
    }

    const geocodeResult = await geocodingService.geocode(placeName, region);

    res.status(200).json({
      success: true,
      data: geocodeResult
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create a new location with optional geocoding
// @route   POST /api/locations
// @access  Private (Admin, Manager)
exports.createLocation = async (req, res, next) => {
  try {
    const { name, description, locationType, geocodePlace, coordinates, address } = req.body;

    // If geocodePlace is provided, geocode it first
    if (geocodePlace && (!coordinates || !coordinates.latitude || !coordinates.longitude)) {
      try {
        const geocodeResult = await geocodingService.geocode(geocodePlace);
        
        // Validate that the coordinates are within Ahmedabad district
        if (!geocodingService.isWithinAhmedabadDistrict(geocodeResult.latitude, geocodeResult.longitude)) {
          return res.status(400).json({
            success: false,
            error: 'Location must be within Ahmedabad district, Gujarat'
          });
        }

        // Use geocoded coordinates and address
        req.body.coordinates = {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude
        };
        req.body.address = geocodeResult.address;
        
        console.log(`Geocoded "${geocodePlace}" to: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      } catch (geocodeError) {
        return res.status(400).json({
          success: false,
          error: `Failed to geocode place: ${geocodeError.message}`
        });
      }
    } else if (coordinates && coordinates.latitude && coordinates.longitude) {
      // Validate manually entered coordinates are within Ahmedabad district
      if (!geocodingService.isWithinAhmedabadDistrict(coordinates.latitude, coordinates.longitude)) {
        return res.status(400).json({
          success: false,
          error: 'Coordinates must be within Ahmedabad district, Gujarat'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either geocodePlace or coordinates (latitude and longitude) must be provided'
      });
    }

    // Add user to req.body
    req.body.createdBy = req.user.userId;

    const location = await Location.create(req.body);

    res.status(201).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
exports.getLocations = async (req, res, next) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Location.find(JSON.parse(queryStr));

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('name');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Location.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const locations = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: locations.length,
      pagination,
      data: locations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single location
// @route   GET /api/locations/:id
// @access  Private
exports.getLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: `Location not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (Admin, Manager)
exports.updateLocation = async (req, res, next) => {
  try {
    let location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: `Location not found with id of ${req.params.id}`
      });
    }

    // Make sure user is creator or admin
    if (
      location.createdBy.toString() !== req.user.userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        error: `User ${req.user.userId} is not authorized to update this location`
      });
    }

    location = await Location.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private (Admin)
exports.deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        error: `Location not found with id of ${req.params.id}`
      });
    }

    // Only admins can delete locations
    if (req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'User is not authorized to delete locations'
      });
    }

    await location.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 