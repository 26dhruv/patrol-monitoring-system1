import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { incidentService, locationService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const IncidentFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  // Only treat as edit mode if ID is present and not 'new'
  const isEditMode = Boolean(id) && id !== 'new';
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [locations, setLocations] = useState([]);
  const [officers, setOfficers] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    time: new Date().toTimeString().slice(0, 5), // Current time in HH:MM format
    severity: 'medium',
    category: '',
    witnesses: [{
      name: '',
      contact: '',
      statement: ''
    }],
    involvedPersons: [{
      name: '',
      description: '',
      role: 'other'
    }],
    assignedTo: [],
  });
  
  // Fetch locations and officers on component mount
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        // Fetch locations
        const locationsResponse = await locationService.getAllLocations();
        setLocations(locationsResponse.data.data);
        
        // Fetch officers
        const officersResponse = await userService.getOfficers();
        setOfficers(officersResponse.data.data);
        
        // If in edit mode and ID is not 'new', fetch the incident data
        if (isEditMode && id !== 'new') {
          const incidentResponse = await incidentService.getIncident(id);
          const incident = incidentResponse.data.data;
          
          // Format date and time
          const incidentDate = new Date(incident.date);
          const formattedDate = incidentDate.toISOString().split('T')[0];
          
          // Populate form data
          setFormData({
            title: incident.title || '',
            description: incident.description || '',
            location: incident.location?._id || '',
            date: formattedDate,
            time: incident.time || '',
            severity: incident.severity || 'medium',
            category: incident.category || '',
            witnesses: incident.witnesses?.length > 0 ? incident.witnesses : [{
              name: '',
              contact: '',
              statement: ''
            }],
            involvedPersons: incident.involvedPersons?.length > 0 ? incident.involvedPersons : [{
              name: '',
              description: '',
              role: 'other'
            }],
            assignedTo: incident.assignedTo?.map(officer => officer._id) || [],
          });
        }
      } catch (err) {
        console.error('Error fetching form data:', err);
        setError('Failed to load form data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFormData();
  }, [id, isEditMode]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleMultiSelectChange = (e) => {
    const { name, options } = e.target;
    const selectedValues = Array.from(options)
      .filter(option => option.selected)
      .map(option => option.value);
    
    setFormData(prev => ({
      ...prev,
      [name]: selectedValues
    }));
  };
  
  const handleWitnessChange = (index, field, value) => {
    const updatedWitnesses = [...formData.witnesses];
    updatedWitnesses[index] = {
      ...updatedWitnesses[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      witnesses: updatedWitnesses
    }));
  };
  
  const handleInvolvedPersonChange = (index, field, value) => {
    const updatedInvolvedPersons = [...formData.involvedPersons];
    updatedInvolvedPersons[index] = {
      ...updatedInvolvedPersons[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      involvedPersons: updatedInvolvedPersons
    }));
  };
  
  const addWitness = () => {
    setFormData(prev => ({
      ...prev,
      witnesses: [
        ...prev.witnesses,
        {
          name: '',
          contact: '',
          statement: ''
        }
      ]
    }));
  };
  
  const removeWitness = (index) => {
    if (formData.witnesses.length <= 1) return;
    
    const updatedWitnesses = [...formData.witnesses];
    updatedWitnesses.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      witnesses: updatedWitnesses
    }));
  };
  
  const addInvolvedPerson = () => {
    setFormData(prev => ({
      ...prev,
      involvedPersons: [
        ...prev.involvedPersons,
        {
          name: '',
          description: '',
          role: 'other'
        }
      ]
    }));
  };
  
  const removeInvolvedPerson = (index) => {
    if (formData.involvedPersons.length <= 1) return;
    
    const updatedInvolvedPersons = [...formData.involvedPersons];
    updatedInvolvedPersons.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      involvedPersons: updatedInvolvedPersons
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.location) {
        throw new Error('Location is required');
      }
      if (!formData.category) {
        throw new Error('Category is required');
      }

      // Filter out empty witnesses and involved persons
      const filteredWitnesses = formData.witnesses.filter(w => w.name.trim() !== '');
      const filteredInvolvedPersons = formData.involvedPersons.filter(p => p.name.trim() !== '');
      
      // Format date as ISO string if it's not already
      let formattedDate = formData.date;
      if (formData.date && !formData.date.includes('T')) {
        formattedDate = new Date(formData.date).toISOString().split('T')[0];
      }

      // Prepare the incident data
      const incidentData = {
        ...formData,
        date: formattedDate,
        witnesses: filteredWitnesses,
        involvedPersons: filteredInvolvedPersons
      };
      
      console.log('Submitting incident data:', incidentData);
      
      // Determine if creating or updating
      let response;
      if (isEditMode) {
        console.log('Updating incident with ID:', id);
        response = await incidentService.updateIncident(id, incidentData);
      } else {
        console.log('Creating new incident');
        response = await incidentService.createIncident(incidentData);
      }
      
      console.log('Submission successful:', response.data);
      setSuccess(true);
      
      // Navigate to incident detail page after successful submission
      setTimeout(() => {
        navigate(`/incidents/${response.data.data._id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error submitting incident:', err);
      if (err.message) {
        // Client-side validation error
        setError(err.message);
      } else {
        // Server-side error
        console.error('Error details:', err.response?.data);
        setError(err.response?.data?.msg || err.response?.data?.message || 'Failed to submit incident. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }
  
  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          {isEditMode ? 'Edit Incident' : 'Report New Incident'}
        </h1>
        
        <Link
          to="/incidents"
          className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none transition-colors duration-200"
        >
          Back to Incidents
        </Link>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-md mb-4">
          {isEditMode ? 'Incident updated successfully!' : 'Incident reported successfully!'}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-glass rounded-lg border border-blue-900/30 p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-300">Incident Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-blue-300 mb-1">Incident Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Brief title describing the incident"
                />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-blue-300 mb-1">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select Category</option>
                  <option value="security">Security</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="medical">Medical</option>
                  <option value="fire">Fire</option>
                  <option value="theft">Theft</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="trespassing">Trespassing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-blue-300 mb-1">Severity</label>
                <select
                  id="severity"
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-blue-300 mb-1">Location</label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select Location</option>
                  {locations.map(location => (
                    <option key={location._id} value={location._id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-blue-300 mb-1">Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-blue-300 mb-1">Time</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              {hasRole(['admin', 'manager']) && (
                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-medium text-blue-300 mb-1">
                    Assign to Officers
                    <span className="text-xs text-blue-300/70 ml-1">(Hold Ctrl/Cmd to select multiple)</span>
                  </label>
                  <select
                    id="assignedTo"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleMultiSelectChange}
                    multiple
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-32"
                  >
                    {officers.map(officer => (
                      <option key={officer._id} value={officer._id}>
                        {officer.name} - {officer.badgeNumber || 'No Badge'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-blue-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Detailed description of what happened"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Witnesses Section */}
        <div className="card-glass rounded-lg border border-blue-900/30 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-300">Witnesses</h2>
            <button
              type="button"
              onClick={addWitness}
              className="btn-sm-outline"
            >
              Add Witness
            </button>
          </div>
          
          {formData.witnesses.map((witness, index) => (
            <div key={index} className="p-4 border border-blue-900/30 rounded-lg mb-4 bg-[#071425]/30">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-blue-300">Witness #{index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeWitness(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                  disabled={formData.witnesses.length <= 1}
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={witness.name}
                    onChange={(e) => handleWitnessChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Witness name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Contact Information</label>
                  <input
                    type="text"
                    value={witness.contact}
                    onChange={(e) => handleWitnessChange(index, 'contact', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Phone number or email"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-1">Statement</label>
                <textarea
                  value={witness.statement}
                  onChange={(e) => handleWitnessChange(index, 'statement', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Witness statement"
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Involved Persons Section */}
        <div className="card-glass rounded-lg border border-blue-900/30 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-300">People Involved</h2>
            <button
              type="button"
              onClick={addInvolvedPerson}
              className="btn-sm-outline"
            >
              Add Person
            </button>
          </div>
          
          {formData.involvedPersons.map((person, index) => (
            <div key={index} className="p-4 border border-blue-900/30 rounded-lg mb-4 bg-[#071425]/30">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium text-blue-300">Person #{index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeInvolvedPerson(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                  disabled={formData.involvedPersons.length <= 1}
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={person.name}
                    onChange={(e) => handleInvolvedPersonChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Person's name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-300 mb-1">Role</label>
                  <select
                    value={person.role}
                    onChange={(e) => handleInvolvedPersonChange(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="victim">Victim</option>
                    <option value="suspect">Suspect</option>
                    <option value="witness">Witness</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-1">Description</label>
                <textarea
                  value={person.description}
                  onChange={(e) => handleInvolvedPersonChange(index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Description of the person and their involvement"
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-4">
          <Link
            to="/incidents"
            className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none transition-colors duration-200"
          >
            Cancel
          </Link>
          
          <button
            type="submit"
            className="btn-primary px-6"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : isEditMode ? 'Update Incident' : 'Report Incident'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncidentFormPage; 