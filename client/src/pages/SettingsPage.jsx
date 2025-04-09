import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSave, FaSync, FaBell, FaLock, FaPalette, FaUserCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  
  const [generalSettings, setGeneralSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
    language: 'english',
  });
  
  const [profileSettings, setProfileSettings] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [adminSettings, setAdminSettings] = useState({
    patrolFrequency: 'daily',
    reportRetentionDays: 90,
    officerInactivityThreshold: 30,
    systemMaintenanceDay: 'sunday',
  });
  
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (user) {
      setProfileSettings({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
      
      // Fetch settings from backend
      fetchSettings();
    }
  }, [user]);
  
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/settings');
      const { general, admin } = response.data;
      
      if (general) {
        setGeneralSettings(general);
      }
      
      if (admin && (user.role === 'admin' || user.role === 'manager')) {
        setAdminSettings(admin);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.put('/api/settings/general', generalSettings);
      toast.success('General settings updated successfully');
    } catch (error) {
      console.error('Error updating general settings:', error);
      toast.error('Failed to update general settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.put('/api/user/profile', profileSettings);
      updateUser(response.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.put('/api/user/change-password', {
        currentPassword: securitySettings.currentPassword,
        newPassword: securitySettings.newPassword,
      });
      
      setSecuritySettings({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.put('/api/settings/admin', adminSettings);
      toast.success('System settings updated successfully');
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('Failed to update system settings');
    } finally {
      setLoading(false);
    }
  };
  
  const renderGeneralSettings = () => (
    <form onSubmit={handleGeneralSubmit} className="space-y-8">
      <div className="bg-[#071a2f]/70 p-6 rounded-lg shadow-md border border-blue-900/30">
        <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">Notifications</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="emailNotifications" className="font-medium text-blue-300">
                Email Notifications
              </label>
              <p className="text-sm text-blue-200/70">Receive email notifications for important events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings.emailNotifications}
                onChange={(e) => setGeneralSettings({...generalSettings, emailNotifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#0a2440] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-blue-900/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="pushNotifications" className="font-medium text-blue-300">
                Push Notifications
              </label>
              <p className="text-sm text-blue-200/70">Receive push notifications on your devices</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings.pushNotifications}
                onChange={(e) => setGeneralSettings({...generalSettings, pushNotifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#0a2440] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-blue-900/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
      
      <div className="bg-[#071a2f]/70 p-6 rounded-lg shadow-md border border-blue-900/30">
        <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">Interface</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="darkMode" className="font-medium text-blue-300">
                Dark Mode
              </label>
              <p className="text-sm text-blue-200/70">Switch between light and dark theme</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={generalSettings.darkMode}
                onChange={(e) => setGeneralSettings({...generalSettings, darkMode: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#0a2440] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-blue-900/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div>
            <label htmlFor="language" className="block font-medium text-blue-300 mb-2">
              Language
            </label>
            <select
              id="language"
              value={generalSettings.language}
              onChange={(e) => setGeneralSettings({...generalSettings, language: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="german">German</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-md text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <FaSave className="mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </form>
  );
  
  const renderProfileSettings = () => (
    <form onSubmit={handleProfileSubmit} className="space-y-8">
      <div className="bg-[#071a2f]/70 p-6 rounded-lg shadow-md border border-blue-900/30">
        <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">Personal Information</h3>
        <div className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-blue-300 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={profileSettings.name}
              onChange={(e) => setProfileSettings({...profileSettings, name: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-blue-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={profileSettings.email}
              onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-blue-300 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={profileSettings.phone}
              onChange={(e) => setProfileSettings({...profileSettings, phone: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-blue-300 mb-1">
              Profile Picture URL
            </label>
            <input
              type="text"
              name="avatar"
              id="avatar"
              value={profileSettings.avatar}
              onChange={(e) => setProfileSettings({...profileSettings, avatar: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-md text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <FaSave className="mr-2" />
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </div>
    </form>
  );
  
  const renderSecuritySettings = () => (
    <form onSubmit={handleSecuritySubmit} className="space-y-8">
      <div className="bg-[#071a2f]/70 p-6 rounded-lg shadow-md border border-blue-900/30">
        <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">Change Password</h3>
        <div className="space-y-5">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-blue-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              value={securitySettings.currentPassword}
              onChange={(e) => setSecuritySettings({...securitySettings, currentPassword: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-blue-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              id="newPassword"
              value={securitySettings.newPassword}
              onChange={(e) => setSecuritySettings({...securitySettings, newPassword: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={securitySettings.confirmPassword}
              onChange={(e) => setSecuritySettings({...securitySettings, confirmPassword: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-md text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <FaLock className="mr-2" />
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </form>
  );
  
  const renderAdminSettings = () => (
    <form onSubmit={handleAdminSubmit} className="space-y-8">
      <div className="bg-[#071a2f]/70 p-6 rounded-lg shadow-md border border-blue-900/30">
        <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">System Configuration</h3>
        <div className="space-y-5">
          <div>
            <label htmlFor="patrolFrequency" className="block text-sm font-medium text-blue-300 mb-1">
              Default Patrol Frequency
            </label>
            <select
              id="patrolFrequency"
              value={adminSettings.patrolFrequency}
              onChange={(e) => setAdminSettings({...adminSettings, patrolFrequency: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="reportRetentionDays" className="block text-sm font-medium text-blue-300 mb-1">
              Report Retention Period (days)
            </label>
            <input
              type="number"
              name="reportRetentionDays"
              id="reportRetentionDays"
              min="1"
              max="365"
              value={adminSettings.reportRetentionDays}
              onChange={(e) => setAdminSettings({...adminSettings, reportRetentionDays: parseInt(e.target.value)})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="officerInactivityThreshold" className="block text-sm font-medium text-blue-300 mb-1">
              Officer Inactivity Threshold (days)
            </label>
            <input
              type="number"
              name="officerInactivityThreshold"
              id="officerInactivityThreshold"
              min="1"
              max="90"
              value={adminSettings.officerInactivityThreshold}
              onChange={(e) => setAdminSettings({...adminSettings, officerInactivityThreshold: parseInt(e.target.value)})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="systemMaintenanceDay" className="block text-sm font-medium text-blue-300 mb-1">
              System Maintenance Day
            </label>
            <select
              id="systemMaintenanceDay"
              value={adminSettings.systemMaintenanceDay}
              onChange={(e) => setAdminSettings({...adminSettings, systemMaintenanceDay: e.target.value})}
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-md text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <FaSave className="mr-2" />
            {loading ? 'Saving...' : 'Save System Settings'}
          </button>
        </div>
      </div>
    </form>
  );
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Settings</h1>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={fetchSettings}
            className="flex items-center px-4 py-2.5 bg-[#0a2440] hover:bg-[#0d2d50] text-blue-300 rounded-md transition-colors shadow-md border border-blue-900/30"
          >
            <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Settings
          </button>
        </div>
      </div>
      
      <div className="bg-[#071a2f]/80 backdrop-blur-md rounded-lg shadow-lg border border-blue-900/30 overflow-hidden">
        <div className="sm:flex sm:items-center border-b border-blue-900/30">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-5 px-6 text-center border-b-2 text-sm font-medium flex flex-col items-center transition-colors ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-blue-200/70 hover:text-blue-300 hover:border-blue-800'
              }`}
            >
              <FaBell className="w-5 h-5 mb-1.5" />
              <span>General</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-5 px-6 text-center border-b-2 text-sm font-medium flex flex-col items-center transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-blue-200/70 hover:text-blue-300 hover:border-blue-800'
              }`}
            >
              <FaUserCircle className="w-5 h-5 mb-1.5" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-5 px-6 text-center border-b-2 text-sm font-medium flex flex-col items-center transition-colors ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-blue-200/70 hover:text-blue-300 hover:border-blue-800'
              }`}
            >
              <FaLock className="w-5 h-5 mb-1.5" />
              <span>Security</span>
            </button>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-5 px-6 text-center border-b-2 text-sm font-medium flex flex-col items-center transition-colors ${
                  activeTab === 'admin'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-blue-200/70 hover:text-blue-300 hover:border-blue-800'
                }`}
              >
                <FaPalette className="w-5 h-5 mb-1.5" />
                <span>System</span>
              </button>
            )}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'profile' && renderProfileSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
          {activeTab === 'admin' && (user?.role === 'admin' || user?.role === 'manager') && renderAdminSettings()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 