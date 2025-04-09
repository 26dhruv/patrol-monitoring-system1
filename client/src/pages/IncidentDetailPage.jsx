import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { incidentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [newNote, setNewNote] = useState('');
  const [newAction, setNewAction] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  
  useEffect(() => {
    const fetchIncident = async () => {
      try {
        // Check if id is a valid MongoDB ObjectId format (24 hex chars)
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
          setError('Invalid incident ID format');
          setLoading(false);
          return;
        }
        
        const response = await incidentService.getIncident(id);
        setIncident(response.data.data);
      } catch (err) {
        console.error('Error fetching incident:', err);
        if (err.response && err.response.status === 404) {
          setError('Incident not found. It may have been deleted or you might not have permission to view it.');
        } else {
          setError('Failed to load incident details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchIncident();
  }, [id]);
  
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    setSubmittingNote(true);
    
    try {
      const response = await incidentService.addNote(id, { content: newNote });
      setIncident(response.data.data);
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Failed to add note. Please try again.');
    } finally {
      setSubmittingNote(false);
    }
  };
  
  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!newAction.trim()) return;
    
    setSubmittingAction(true);
    
    try {
      const response = await incidentService.addAction(id, { description: newAction });
      setIncident(response.data.data);
      setNewAction('');
    } catch (err) {
      console.error('Error adding action:', err);
      setError('Failed to add action. Please try again.');
    } finally {
      setSubmittingAction(false);
    }
  };
  
  const handleStatusChange = async (newStatus) => {
    if (changingStatus) return;
    
    setChangingStatus(true);
    
    try {
      const response = await incidentService.updateStatus(id, { status: newStatus });
      setIncident(response.data.data);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setChangingStatus(false);
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
      return;
    }
    
    try {
      await incidentService.deleteIncident(id);
      navigate('/incidents');
    } catch (err) {
      console.error('Error deleting incident:', err);
      setError('Failed to delete incident. Please try again.');
    }
  };
  
  if (loading) {
    return <Spinner size="lg" fullScreen />;
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link 
          to="/incidents" 
          className="btn-outline"
        >
          Back to Incidents
        </Link>
      </div>
    );
  }
  
  if (!incident) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-blue-900/20 border border-blue-500/30 text-blue-400 px-4 py-3 rounded mb-4">
          Incident not found.
        </div>
        <Link 
          to="/incidents" 
          className="btn-outline"
        >
          Back to Incidents
        </Link>
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'low':
        return 'bg-green-900/20 text-green-300 border-green-500/30';
      case 'medium':
        return 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30';
      case 'high':
        return 'bg-orange-900/20 text-orange-300 border-orange-500/30';
      case 'critical':
        return 'bg-red-900/20 text-red-300 border-red-500/30';
      default:
        return 'bg-blue-900/20 text-blue-300 border-blue-500/30';
    }
  };
  
  const getStatusClass = (status) => {
    switch (status) {
      case 'new':
        return 'bg-purple-900/20 text-purple-300 border-purple-500/30';
      case 'in-progress':
        return 'bg-blue-900/20 text-blue-300 border-blue-500/30';
      case 'resolved':
        return 'bg-green-900/20 text-green-300 border-green-500/30';
      case 'closed':
        return 'bg-gray-900/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-blue-900/20 text-blue-300 border-blue-500/30';
    }
  };
  
  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
          Incident Details
        </h1>
        
        <div className="flex gap-3">
          {hasRole(['admin', 'manager']) && (
            <>
              <Link
                to={`/incidents/${id}/edit`}
                className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none transition-colors duration-200"
              >
                Edit Incident
              </Link>
              
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-500/30 rounded-md text-red-400 hover:bg-red-900/30 hover:text-red-300 focus:outline-none transition-colors duration-200"
              >
                Delete
              </button>
            </>
          )}
          
          <Link
            to="/incidents"
            className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none transition-colors duration-200"
          >
            Back to Incidents
          </Link>
        </div>
      </div>
      
      {/* Main Incident Info */}
      <div className="card-glass border border-blue-900/30 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold mb-4 text-blue-200">{incident.title}</h2>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-blue-400">Category:</span>
                <span className="ml-2 capitalize">{incident.category || 'N/A'}</span>
              </div>
              
              <div>
                <span className="text-sm text-blue-400">Severity:</span>
                <span className={`ml-2 inline-block px-2 py-1 rounded border text-xs capitalize ${getSeverityClass(incident.severity)}`}>
                  {incident.severity}
                </span>
              </div>
              
              <div>
                <span className="text-sm text-blue-400">Status:</span>
                <span className={`ml-2 inline-block px-2 py-1 rounded border text-xs capitalize ${getStatusClass(incident.status)}`}>
                  {incident.status}
                </span>
              </div>
              
              <div>
                <span className="text-sm text-blue-400">Date & Time:</span>
                <span className="ml-2">
                  {formatDate(incident.date)} {incident.time}
                </span>
              </div>
              
              <div>
                <span className="text-sm text-blue-400">Location:</span>
                <span className="ml-2">{incident.location?.name || 'N/A'}</span>
              </div>
              
              <div>
                <span className="text-sm text-blue-400">Reported By:</span>
                <span className="ml-2">{incident.reportedBy?.name || 'Anonymous'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-2 text-blue-300">Description</h3>
            <p className="text-blue-100/80 whitespace-pre-line mb-4">{incident.description}</p>
            
            {hasRole(['admin', 'manager', 'officer']) && (
              <div className="mt-6">
                <h3 className="text-md font-semibold mb-2 text-blue-300">Change Status</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusChange('new')}
                    disabled={incident.status === 'new' || changingStatus}
                    className={`px-3 py-1.5 rounded text-xs ${
                      incident.status === 'new'
                        ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30 cursor-default'
                        : 'bg-purple-900/20 text-purple-300 border border-purple-500/30 hover:bg-purple-900/40'
                    }`}
                  >
                    New
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('in-progress')}
                    disabled={incident.status === 'in-progress' || changingStatus}
                    className={`px-3 py-1.5 rounded text-xs ${
                      incident.status === 'in-progress'
                        ? 'bg-blue-900/40 text-blue-300 border border-blue-500/30 cursor-default'
                        : 'bg-blue-900/20 text-blue-300 border border-blue-500/30 hover:bg-blue-900/40'
                    }`}
                  >
                    In Progress
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('resolved')}
                    disabled={incident.status === 'resolved' || changingStatus}
                    className={`px-3 py-1.5 rounded text-xs ${
                      incident.status === 'resolved'
                        ? 'bg-green-900/40 text-green-300 border border-green-500/30 cursor-default'
                        : 'bg-green-900/20 text-green-300 border border-green-500/30 hover:bg-green-900/40'
                    }`}
                  >
                    Resolved
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('closed')}
                    disabled={incident.status === 'closed' || changingStatus}
                    className={`px-3 py-1.5 rounded text-xs ${
                      incident.status === 'closed'
                        ? 'bg-gray-900/40 text-gray-300 border border-gray-500/30 cursor-default'
                        : 'bg-gray-900/20 text-gray-300 border border-gray-500/30 hover:bg-gray-900/40'
                    }`}
                  >
                    Closed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Assigned Officers */}
      <div className="card-glass border border-blue-900/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-300">Assigned Officers</h3>
        
        {incident.assignedTo && incident.assignedTo.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {incident.assignedTo.map((officer) => (
              <div key={officer._id} className="p-3 border border-blue-900/30 rounded-lg bg-[#071425]/30">
                <div className="font-medium text-blue-200">{officer.name}</div>
                <div className="text-sm text-blue-400">Badge: {officer.badgeNumber || 'N/A'}</div>
                <div className="text-sm text-blue-400">Phone: {officer.phone || 'N/A'}</div>
                <div className="text-sm text-blue-400">Email: {officer.email || 'N/A'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-blue-400">No officers assigned to this incident.</p>
        )}
      </div>
      
      {/* Witnesses */}
      {incident.witnesses && incident.witnesses.length > 0 && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-300">Witnesses</h3>
          
          <div className="space-y-4">
            {incident.witnesses.map((witness, index) => (
              <div key={index} className="p-4 border border-blue-900/30 rounded-lg bg-[#071425]/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-sm text-blue-400">Name:</span>
                    <span className="ml-2">{witness.name}</span>
                  </div>
                  
                  <div>
                    <span className="text-sm text-blue-400">Contact:</span>
                    <span className="ml-2">{witness.contact || 'N/A'}</span>
                  </div>
                </div>
                
                {witness.statement && (
                  <div>
                    <span className="text-sm text-blue-400">Statement:</span>
                    <p className="mt-1 text-blue-100/80 whitespace-pre-line">{witness.statement}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Involved Persons */}
      {incident.involvedPersons && incident.involvedPersons.length > 0 && (
        <div className="card-glass border border-blue-900/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-300">People Involved</h3>
          
          <div className="space-y-4">
            {incident.involvedPersons.map((person, index) => (
              <div key={index} className="p-4 border border-blue-900/30 rounded-lg bg-[#071425]/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-sm text-blue-400">Name:</span>
                    <span className="ml-2">{person.name}</span>
                  </div>
                  
                  <div>
                    <span className="text-sm text-blue-400">Role:</span>
                    <span className={`ml-2 inline-block px-2 py-1 rounded border text-xs capitalize ${
                      person.role === 'victim' 
                        ? 'bg-purple-900/20 text-purple-300 border-purple-500/30'
                        : person.role === 'suspect'
                          ? 'bg-red-900/20 text-red-300 border-red-500/30'
                          : 'bg-blue-900/20 text-blue-300 border-blue-500/30'
                    }`}>
                      {person.role}
                    </span>
                  </div>
                </div>
                
                {person.description && (
                  <div>
                    <span className="text-sm text-blue-400">Description:</span>
                    <p className="mt-1 text-blue-100/80 whitespace-pre-line">{person.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Activity Timeline */}
      <div className="card-glass border border-blue-900/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-300">Activity Timeline</h3>
        
        {hasRole(['admin', 'manager', 'officer']) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Add Note Form */}
            <div className="p-4 border border-blue-900/30 rounded-lg bg-[#071425]/30">
              <h4 className="text-md font-medium mb-3 text-blue-300">Add Note</h4>
              <form onSubmit={handleAddNote}>
                <div className="mb-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter note content..."
                  />
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={submittingNote}
                    className="btn-primary px-4 py-2"
                  >
                    {submittingNote ? <Spinner size="sm" /> : 'Add Note'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Add Action Form */}
            <div className="p-4 border border-blue-900/30 rounded-lg bg-[#071425]/30">
              <h4 className="text-md font-medium mb-3 text-blue-300">Record Action Taken</h4>
              <form onSubmit={handleAddAction}>
                <div className="mb-3">
                  <textarea
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe action taken..."
                  />
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={submittingAction}
                    className="btn-primary px-4 py-2"
                  >
                    {submittingAction ? <Spinner size="sm" /> : 'Record Action'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Timeline */}
        <div className="relative pl-8 space-y-6 before:absolute before:left-4 before:h-full before:w-0.5 before:bg-blue-900/30">
          {/* Notes and Actions in Timeline */}
          {incident.notes && incident.notes.length > 0 ? (
            incident.notes.map((note) => (
              <div key={note._id} className="relative">
                <div className="absolute left-[-8px] top-0 w-4 h-4 rounded-full bg-blue-500/30 border border-blue-300/70"></div>
                <div className="p-4 border border-blue-900/30 rounded-lg bg-[#071425]/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-md font-medium text-blue-300">Note</h4>
                    <div className="text-sm text-blue-400">{formatDate(note.createdAt)}</div>
                  </div>
                  <p className="text-blue-100/80 whitespace-pre-line">{note.content}</p>
                  <div className="mt-2 text-sm text-blue-400">By: {note.addedBy?.name || 'System'}</div>
                </div>
              </div>
            ))
          ) : (
            incident.actions && incident.actions.length === 0 && (
              <p className="text-blue-400">No activity recorded yet.</p>
            )
          )}
          
          {incident.actions && incident.actions.length > 0 && (
            incident.actions.map((action) => (
              <div key={action._id} className="relative">
                <div className="absolute left-[-8px] top-0 w-4 h-4 rounded-full bg-green-500/30 border border-green-300/70"></div>
                <div className="p-4 border border-blue-900/30 rounded-lg bg-[#071425]/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-md font-medium text-green-300">Action Taken</h4>
                    <div className="text-sm text-blue-400">{formatDate(action.createdAt)}</div>
                  </div>
                  <p className="text-blue-100/80 whitespace-pre-line">{action.description}</p>
                  <div className="mt-2 text-sm text-blue-400">By: {action.takenBy?.name || 'System'}</div>
                </div>
              </div>
            ))
          )}
          
          {/* Initial Report */}
          <div className="relative">
            <div className="absolute left-[-8px] top-0 w-4 h-4 rounded-full bg-purple-500/30 border border-purple-300/70"></div>
            <div className="p-4 border border-blue-900/30 rounded-lg bg-[#071425]/30">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-md font-medium text-purple-300">Incident Reported</h4>
                <div className="text-sm text-blue-400">{formatDate(incident.createdAt)}</div>
              </div>
              <p className="text-blue-100/80">Incident was initially reported.</p>
              <div className="mt-2 text-sm text-blue-400">By: {incident.reportedBy?.name || 'Anonymous'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailPage; 