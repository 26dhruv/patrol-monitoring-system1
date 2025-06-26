import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { incidentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const IncidentsPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIncidents, setTotalIncidents] = useState(0);
  
  // Filters and sorting
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    category: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setLoading(true);
        
        const queryParams = {
          page,
          limit,
          sort: `${sortOrder === 'desc' ? '-' : ''}${sortField}`,
        };
        
        // Add filters if they are set
        if (filters.status) queryParams.status = filters.status;
        if (filters.severity) queryParams.severity = filters.severity;
        if (filters.category) queryParams.category = filters.category;
        if (filters.search) queryParams.search = filters.search;
        if (filters.startDate) queryParams.startDate = new Date(filters.startDate).toISOString();
        if (filters.endDate) queryParams.endDate = new Date(filters.endDate).toISOString();
        
        const response = await incidentService.getAllIncidents(queryParams);
        
        setIncidents(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalIncidents(response.data.total);
        
      } catch (err) {
        console.error('Error fetching incidents:', err);
        setError('Failed to load incidents. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIncidents();
  }, [page, limit, sortField, sortOrder, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page when filters change
  };
  
  const handleSortChange = (field) => {
    if (field === sortField) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending when changing fields
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page when sort changes
  };
  
  const clearFilters = () => {
    setFilters({
      status: '',
      severity: '',
      category: '',
      startDate: '',
      endDate: '',
      search: '',
    });
    setPage(1);
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    
    return (
      <span className="ml-1 text-blue-400">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };
  
  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'low':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'medium':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'critical':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'reported':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'investigating':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'closed':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  if (loading && incidents.length === 0) {
    return <Spinner size="lg" fullScreen />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Incidents</h1>
        {hasRole(['admin', 'manager', 'officer']) && (
          <button
            onClick={() => navigate('/incidents/new')}
            className="btn-primary flex items-center whitespace-nowrap shadow-md"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report New Incident
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card-glass rounded-lg border border-blue-900/30 p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-blue-300 mb-1">Search</label>
            <input
              id="search"
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by title or description..."
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm placeholder-blue-400/50 text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-blue-300 mb-1">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-blue-300 mb-1">Severity</label>
            <select
              id="severity"
              name="severity"
              value={filters.severity}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-blue-300 mb-1">Category</label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Categories</option>
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
          
          <div className="self-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-blue-300 mb-1">Start Date</label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-blue-300 mb-1">End Date</label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="text-sm text-blue-300/70">
          Showing {incidents.length} of {totalIncidents} incidents
        </div>
      </div>

      {/* Incidents Table */}
      <div className="card-glass rounded-lg border border-blue-900/30 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-blue-900/30">
            <thead className="bg-[#071425]/50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('title')}
                >
                  <div className="flex items-center">
                    Title
                    {renderSortIndicator('title')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('category')}
                >
                  <div className="flex items-center">
                    Category
                    {renderSortIndicator('category')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('severity')}
                >
                  <div className="flex items-center">
                    Severity
                    {renderSortIndicator('severity')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('status')}
                >
                  <div className="flex items-center">
                    Status
                    {renderSortIndicator('status')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('date')}
                >
                  <div className="flex items-center">
                    Date
                    {renderSortIndicator('date')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider"
                >
                  Area
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/30">
              {loading && incidents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-4 text-center">
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-4 text-center text-blue-300/70">
                    No incidents found matching your filters.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
                  <tr key={incident._id} className="hover:bg-blue-900/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/incidents/${incident._id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                        {incident.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70 capitalize">
                      {incident.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityBadgeClass(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(incident.status)}`}>
                        {incident.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70">
                      {new Date(incident.date).toLocaleDateString()} {incident.time}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70">
                      {incident.area || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          to={`/incidents/${incident._id}`} 
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View
                        </Link>
                        
                        {hasRole(['admin', 'manager']) && (
                          <>
                            <span className="text-blue-900/50">|</span>
                            <Link 
                              to={`/incidents/${incident._id}/edit`} 
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Edit
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-blue-900/30 sm:px-6">
            <div className="flex items-center">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-full py-0 pl-2 pr-7 border-blue-900/30 bg-[#071425]/50 text-blue-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm rounded-md"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2 text-sm text-blue-300/70">per page</span>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end">
              <div>
                <p className="text-sm text-blue-300/70">
                  Showing <span className="font-medium text-blue-300">{incidents.length ? (page - 1) * limit + 1 : 0}</span> to <span className="font-medium text-blue-300">{Math.min(page * limit, totalIncidents)}</span> of{' '}
                  <span className="font-medium text-blue-300">{totalIncidents}</span> results
                </p>
              </div>
              
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px ml-4" aria-label="Pagination">
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-blue-900/30 bg-[#071425]/50 text-sm font-medium text-blue-300 hover:bg-blue-900/30 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Calculate page number to show
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  // Render page button
                  return (
                    <button
                      key={i}
                      onClick={() => setPage(pageNum)}
                      disabled={page === pageNum}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        page === pageNum 
                          ? 'z-10 bg-blue-900/30 border-blue-500/50 text-blue-300' 
                          : 'border-blue-900/30 bg-[#071425]/50 text-blue-300 hover:bg-blue-900/20'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-blue-900/30 bg-[#071425]/50 text-sm font-medium text-blue-300 hover:bg-blue-900/30 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentsPage; 