import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { userService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const OfficerFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasRole } = useAuth();
  const isEditMode = Boolean(id);
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    badgeNumber: '',
    phone: '',
    department: 'security',
    role: 'officer',
    status: 'off-duty',
    profileImage: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    joinedDate: new Date().toISOString().split('T')[0]
  });
  
  useEffect(() => {
    if (isEditMode) {
      fetchOfficer();
    }
  }, [id]);
  
  const fetchOfficer = async () => {
    try {
      setLoading(true);
      const response = await userService.getUserById(id);
      const officer = response.data.data;
      
      // Format joined date for input
      const joinedDate = officer.joinedDate ? new Date(officer.joinedDate).toISOString().split('T')[0] : '';
      
      setFormData({
        name: officer.name || '',
        email: officer.email || '',
        password: '', // Don't include password in edit mode
        badgeNumber: officer.badgeNumber || '',
        phone: officer.phone || '',
        department: officer.department || 'security',
        role: officer.role || 'officer',
        status: officer.status || 'off-duty',
        profileImage: officer.profileImage || '',
        address: officer.address || '',
        emergencyContact: officer.emergencyContact || '',
        emergencyPhone: officer.emergencyPhone || '',
        joinedDate
      });
    } catch (err) {
      console.error('Error fetching officer details:', err);
      setError('Failed to load officer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Create a copy of form data to send
      const officerData = { ...formData };
      
      // Don't send empty password in edit mode
      if (isEditMode && !officerData.password) {
        delete officerData.password;
      }
      
      if (isEditMode) {
        await userService.updateUser(id, officerData);
      } else {
        await authService.register(officerData);
      }
      
      navigate('/officers');
    } catch (err) {
      console.error('Error saving officer:', err);
      setError(err.response?.data?.message || 'Failed to save officer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!hasRole(['admin', 'manager'])) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded">
        You don't have permission to access this page.
      </div>
    );
  }
  
  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }
  
  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          {isEditMode ? 'Edit Officer' : 'Add New Officer'}
        </h1>
        
        <button
          onClick={() => navigate('/officers')}
          className="btn-outline flex items-center"
        >
          Cancel
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="card-glass border border-blue-900/30 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-blue-300 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="name" className="block text-sm font-medium text-blue-300 mb-1">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email" className="block text-sm font-medium text-blue-300 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="block text-sm font-medium text-blue-300 mb-1">
                  {isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!isEditMode}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={isEditMode ? 'Enter new password' : 'Enter password'}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="badgeNumber" className="block text-sm font-medium text-blue-300 mb-1">Badge Number</label>
                <input
                  type="text"
                  id="badgeNumber"
                  name="badgeNumber"
                  value={formData.badgeNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter badge number"
                />
              </div>
            </div>
          </div>
          
          {/* Contact Information */}
          <div>
            <h2 className="text-xl font-semibold text-blue-300 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="phone" className="block text-sm font-medium text-blue-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="address" className="block text-sm font-medium text-blue-300 mb-1">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter address"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="emergencyContact" className="block text-sm font-medium text-blue-300 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  id="emergencyContact"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Emergency contact name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="emergencyPhone" className="block text-sm font-medium text-blue-300 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  id="emergencyPhone"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Emergency contact phone"
                />
              </div>
            </div>
          </div>
          
          {/* Job Information */}
          <div>
            <h2 className="text-xl font-semibold text-blue-300 mb-4">Job Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="department" className="block text-sm font-medium text-blue-300 mb-1">Department</label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="security">Security</option>
                  <option value="police">Police</option>
                  <option value="enforcement">Enforcement</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="status" className="block text-sm font-medium text-blue-300 mb-1">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="on-duty">On Duty</option>
                  <option value="off-duty">Off Duty</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="role" className="block text-sm font-medium text-blue-300 mb-1">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="officer">Officer</option>
                  <option value="manager">Manager</option>
                  {hasRole(['admin']) && <option value="admin">Admin</option>}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="joinedDate" className="block text-sm font-medium text-blue-300 mb-1">Joined Date</label>
                <input
                  type="date"
                  id="joinedDate"
                  name="joinedDate"
                  value={formData.joinedDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
          
        
          
          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : isEditMode ? 'Update Officer' : 'Create Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfficerFormPage; 