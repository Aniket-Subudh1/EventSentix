import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Loader } from '../components/common/Loader';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Lock, 
  Shield,  
  LogOut,
  MessageCircle 
} from 'react-feather';

const Settings = () => {
  const { user, updateProfile, updateAlertPreferences, logout } = useContext(AuthContext);
  
  // Ensure user exists and provide default values
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || ''
  });
  
  // Provide default alert preferences if user.alertPreferences is undefined
  const [alertPreferences, setAlertPreferences] = useState({
    emailNotifications: user?.alertPreferences?.email?.enabled ?? true,
    pushNotifications: user?.alertPreferences?.push?.enabled ?? true,
    smsNotifications: user?.alertPreferences?.sms?.enabled ?? false,
    phoneNumber: user?.alertPreferences?.sms?.phoneNumber || '',
    alertThresholds: {
      negative: user?.alertPreferences?.alertThresholds?.negative ?? -0.5,
      critical: user?.alertPreferences?.alertThresholds?.critical ?? 3
    }
  });
  
  useEffect(() => {
    // Update state when user data changes
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || ''
      });
      
      setAlertPreferences({
        emailNotifications: user.alertPreferences?.email?.enabled ?? true,
        pushNotifications: user.alertPreferences?.push?.enabled ?? true,
        smsNotifications: user.alertPreferences?.sms?.enabled ?? false,
        phoneNumber: user.alertPreferences?.sms?.phoneNumber || '',
        alertThresholds: {
          negative: user.alertPreferences?.alertThresholds?.negative ?? -0.5,
          critical: user.alertPreferences?.alertThresholds?.critical ?? 3
        }
      });
    }
  }, [user]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phoneError, setPhoneError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAlertPreferencesChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setAlertPreferences(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : Number(value) // Convert to number for threshold values
        }
      }));
    } else {
      setAlertPreferences(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear phone error when user starts typing
    if (name === 'phoneNumber') {
      setPhoneError(null);
    }
  };
  
  const validatePhoneNumber = (phoneNumber) => {
    // Simple validation: should start with + and have 7-15 digits
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    return phoneRegex.test(phoneNumber);
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      await updateProfile(profileData);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAlertPreferencesUpdate = async (e) => {
    e.preventDefault();
    
    // Validate phone number if SMS notifications are enabled
    if (alertPreferences.smsNotifications && alertPreferences.phoneNumber) {
      if (!validatePhoneNumber(alertPreferences.phoneNumber)) {
        setPhoneError('Please enter a valid phone number with country code (e.g., +12345678900)');
        return;
      }
    }
    
    try {
      setLoading(true);
      setError(null);
      setPhoneError(null);
      
      // Convert to the format expected by the backend
      const apiAlertPreferences = {
        email: {
          enabled: alertPreferences.emailNotifications,
          threshold: 'critical' // Fixed value for now
        },
        sms: {
          enabled: alertPreferences.smsNotifications,
          phoneNumber: alertPreferences.phoneNumber,
          threshold: 'critical' // Fixed value for now
        },
        push: {
          enabled: alertPreferences.pushNotifications,
          threshold: 'all' // Fixed value for now
        }
      };
      
      await updateAlertPreferences(apiAlertPreferences);
    } catch (err) {
      setError(err.message || 'Failed to update alert preferences');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await updateProfile({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Add loading state if user data isn't available yet
  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center">
          <SettingsIcon size={24} className="mr-2" /> Settings
        </h1>
      </div>
      
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <div className="flex items-center mb-4">
            <User size={20} className="mr-2 text-blue-500" />
            <h3 className="text-lg font-medium">Profile Details</h3>
          </div>
          
          <form onSubmit={handleProfileUpdate}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={profileData.role}
                  readOnly
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? <Loader size="sm" color="white" className="mr-2" /> : null}
                  Update Profile
                </Button>
              </div>
            </div>
          </form>
        </Card>
        
        {/* Security Settings */}
        <Card>
          <div className="flex items-center mb-4">
            <Lock size={20} className="mr-2 text-blue-500" />
            <h3 className="text-lg font-medium">Security</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Change Password</h4>
                <p className="text-xs text-gray-500">Secure your account with a strong password</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPasswordModal(true)}
              >
                Change Password
              </Button>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Logout</h4>
                  <p className="text-xs text-gray-500">End your session and log out of all devices</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={logout}
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </Button>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Alert Preferences */}
        <Card>
          <div className="flex items-center mb-4">
            <Bell size={20} className="mr-2 text-blue-500" />
            <h3 className="text-lg font-medium">Alert Preferences</h3>
          </div>
          
          <form onSubmit={handleAlertPreferencesUpdate}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    name="emailNotifications"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    checked={alertPreferences.emailNotifications}
                    onChange={handleAlertPreferencesChange}
                  />
                  <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
                    Email Notifications
                  </label>
                </div>
                
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="pushNotifications"
                    name="pushNotifications"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    checked={alertPreferences.pushNotifications}
                    onChange={handleAlertPreferencesChange}
                  />
                  <label htmlFor="pushNotifications" className="text-sm font-medium text-gray-700">
                    Push Notifications
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="smsNotifications"
                    name="smsNotifications"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    checked={alertPreferences.smsNotifications}
                    onChange={handleAlertPreferencesChange}
                  />
                  <label htmlFor="smsNotifications" className="text-sm font-medium text-gray-700">
                    SMS Notifications
                  </label>
                </div>
                
                <div className="mt-4">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                    Phone Number (with country code)
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                      phoneError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    value={alertPreferences.phoneNumber}
                    onChange={handleAlertPreferencesChange}
                    placeholder="+12345678900"
                  />
                  {phoneError && (
                    <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your phone number with country code to receive SMS alerts
                  </p>
                </div>
              </div>
              
              <div>
                <label htmlFor="alertThresholds.negative" className="block text-sm font-medium text-gray-700 mb-1">
                  Negative Sentiment Threshold
                </label>
                <input
                  type="number"
                  id="alertThresholds.negative"
                  name="alertThresholds.negative"
                  min="-1"
                  max="0"
                  step="0.1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={alertPreferences.alertThresholds.negative}
                  onChange={handleAlertPreferencesChange}
                />
                <p className="mt-1 text-xs text-gray-500">Trigger alerts for sentiment below this value</p>
              </div>
              
              <div>
                <label htmlFor="alertThresholds.critical" className="block text-sm font-medium text-gray-700 mb-1">
                  Critical Issue Threshold
                </label>
                <input
                  type="number"
                  id="alertThresholds.critical"
                  name="alertThresholds.critical"
                  min="1"
                  max="10"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={alertPreferences.alertThresholds.critical}
                  onChange={handleAlertPreferencesChange}
                />
                <p className="mt-1 text-xs text-gray-500">Minimum number of similar issues to trigger a critical alert</p>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? <Loader size="sm" color="white" className="mr-2" /> : null}
                  Update Preferences
                </Button>
              </div>
            </div>
          </form>
        </Card>
        
        {/* Privacy & Integrations */}
        <Card>
          <div className="flex items-center mb-4">
            <Shield size={20} className="mr-2 text-blue-500" />
            <h3 className="text-lg font-medium">Privacy & Integrations</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Data Retention</h4>
                <p className="text-xs text-gray-500">Control how long your event data is stored</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
              >
                Configure
              </Button>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Connected Integrations</h4>
                  <p className="text-xs text-gray-500">Manage social media and third-party connections</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = '/integrations'}
                >
                  Manage
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
      >
        <form onSubmit={handlePasswordChange}>
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
                required
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  newPassword: e.target.value
                }))}
                required
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))}
                required
              />
            </div>
            
            <div className="mt-5 flex justify-end space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPasswordModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? <Loader size="sm" color="white" className="mr-2" /> : null}
                Change Password
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Settings;