import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import Spinner from '../components/ui/Spinner';

const ProfilePage = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    badgeNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  
  // Password validation state
  const [passwordError, setPasswordError] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        department: currentUser.department || '',
        badgeNumber: currentUser.badgeNumber || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    }
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear success and error messages when user starts typing
    setSuccess(false);
    setError(null);
    
    // Clear password errors when typing in password fields
    if (['currentPassword', 'newPassword', 'confirmNewPassword'].includes(name)) {
      setPasswordError((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validatePasswordSection = () => {
    let isValid = true;
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };
    
    // Only validate if user is trying to change password
    if (formData.newPassword || formData.confirmNewPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
        isValid = false;
      }
      
      if (formData.newPassword && formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters';
        isValid = false;
      }
      
      if (formData.newPassword !== formData.confirmNewPassword) {
        newErrors.confirmNewPassword = 'Passwords do not match';
        isValid = false;
      }
    }
    
    setPasswordError(newErrors);
    return isValid;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Skip validation if no password change is requested
    if (formData.newPassword || formData.confirmNewPassword) {
      if (!validatePasswordSection()) {
        return;
      }
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Prepare data to send
      const updateData = {
        name: formData.name,
        phone: formData.phone,
      };
      
      // Only include password fields if user is changing password
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      // Officers and admins can update department and badge number
      if (['admin', 'manager', 'officer'].includes(currentUser.role)) {
        updateData.department = formData.department;
        updateData.badgeNumber = formData.badgeNumber;
      }
      
      // Send update request
      const response = await userService.updateProfile(updateData);
      
      // Update the auth context with new user data
      updateUserProfile(response.data.data);
      
      // Show success message
      setSuccess(true);
      
      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">My Profile</h1>
      </div>

      {error && (
        <div className="bg-red-900/20 border-l-4 border-red-500/30 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border-l-4 border-green-500/30 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-400">Profile updated successfully!</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Basic info */}
        <div className="lg:col-span-2">
          <form onSubmit={handleProfileUpdate}>
            <div className="card-glass rounded-lg border border-blue-900/30 p-6">
              <h2 className="text-lg font-semibold mb-4 text-blue-300">Basic Information</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="name" className="block text-sm font-medium text-blue-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email" className="block text-sm font-medium text-blue-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-300/50 bg-[#071425]/70 focus:outline-none sm:text-sm cursor-not-allowed"
                      disabled
                    />
                    <p className="text-xs text-blue-300/50 mt-1">Email cannot be changed</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="phone" className="block text-sm font-medium text-blue-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="department" className="block text-sm font-medium text-blue-300 mb-1">Department</label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled={!['admin', 'manager', 'officer'].includes(currentUser?.role)}
                    >
                      <option value="">Select Department</option>
                      <option value="security">Security</option>
                      <option value="enforcement">Enforcement</option>
                      <option value="police">Police</option>
                    </select>
                  </div>
                </div>
                
                {['admin', 'manager', 'officer'].includes(currentUser?.role) && (
                  <div className="form-group">
                    <label htmlFor="badgeNumber" className="block text-sm font-medium text-blue-300 mb-1">Badge Number</label>
                    <input
                      type="text"
                      id="badgeNumber"
                      name="badgeNumber"
                      value={formData.badgeNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter badge number"
                    />
                  </div>
                )}
                
                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="btn-primary px-6"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Password section */}
            <div className="card-glass rounded-lg border border-blue-900/30 p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4 text-blue-300">Change Password</h2>
              
              <div className="space-y-4">
                <div className="form-group">
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-blue-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 sm:text-sm ${
                      passwordError.currentPassword ? 'border-red-500/50' : 'border-blue-900/30'
                    }`}
                  />
                  {passwordError.currentPassword && (
                    <p className="mt-1 text-sm text-red-400">{passwordError.currentPassword}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-blue-300 mb-1">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 sm:text-sm ${
                        passwordError.newPassword ? 'border-red-500/50' : 'border-blue-900/30'
                      }`}
                    />
                    {passwordError.newPassword && (
                      <p className="mt-1 text-sm text-red-400">{passwordError.newPassword}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-blue-300 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      value={formData.confirmNewPassword}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 sm:text-sm ${
                        passwordError.confirmNewPassword ? 'border-red-500/50' : 'border-blue-900/30'
                      }`}
                    />
                    {passwordError.confirmNewPassword && (
                      <p className="mt-1 text-sm text-red-400">{passwordError.confirmNewPassword}</p>
                    )}
                  </div>
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="btn-primary px-6"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Updating...
                      </>
                    ) : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        {/* Right column - Avatar and profile card */}
        <div className="lg:col-span-1">
          <div className="card-glass rounded-lg border border-blue-900/30 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center justify-center text-3xl font-medium shadow-glow shadow-blue-500/20 mb-4">
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              <h3 className="text-lg font-semibold text-blue-100">{currentUser?.name}</h3>
              <p className="text-blue-300/70 mt-1">{currentUser?.email}</p>
              
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize">
                  {currentUser?.role || 'User'}
                </span>
              </div>
              
              {currentUser?.department && (
                <p className="text-blue-300/70 mt-3">
                  <span className="font-medium text-blue-300">Department:</span> {currentUser.department}
                </p>
              )}
              
              {currentUser?.badgeNumber && (
                <p className="text-blue-300/70 mt-1">
                  <span className="font-medium text-blue-300">Badge:</span> {currentUser.badgeNumber}
                </p>
              )}
            </div>
          </div>
          
          <div className="card-glass rounded-lg border border-blue-900/30 p-6 mt-6">
            <h3 className="text-md font-semibold text-blue-300 mb-4">Account Information</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-300/70">Last Login</p>
                <p className="text-blue-100">{currentUser?.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleString() : 'Never'}</p>
              </div>
              
              <div>
                <p className="text-sm text-blue-300/70">Account Created</p>
                <p className="text-blue-100">{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-sm text-blue-300/70">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 