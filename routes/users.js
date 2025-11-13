const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, address } = req.body;

    const user = await User.findById(req.user.id);

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    logger.info('Profile updated:', { userId: user._id });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/users/kyc
 * @desc    Submit KYC information
 * @access  Private
 */
router.post('/kyc', auth, async (req, res) => {
  try {
    const { 
      dateOfBirth, 
      ssn, 
      idType, 
      idNumber, 
      occupation 
    } = req.body;

    const user = await User.findById(req.user.id);

    user.kyc = {
      dateOfBirth,
      ssn,
      idType,
      idNumber,
      occupation,
      submittedAt: new Date()
    };
    user.kycStatus = 'submitted';

    await user.save();

    logger.info('KYC submitted:', { userId: user._id });

    res.json({
      success: true,
      message: 'KYC information submitted successfully',
      kycStatus: user.kycStatus
    });

  } catch (error) {
    logger.error('KYC submission error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/users/kyc-status
 * @desc    Get KYC status
 * @access  Private
 */
router.get('/kyc-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      kycStatus: user.kycStatus,
      visaCustomerId: user.visaCustomerId
    });

  } catch (error) {
    logger.error('Get KYC status error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
