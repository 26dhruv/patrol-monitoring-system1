import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patrolService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const PatrolsPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatrols, setTotalPatrols] = useState(0);
  
  // Filters and sorting
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [sortField, setSortField] = useState('startTime');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchPatrols = async () => {
      try {
        setLoading(true);
        
        const queryParams = {
          page,
          limit,
          sort: `${sortOrder === 'desc' ? '-' : ''}${sortField}`,
        };
        
        // Add filters if they are set
        if (filters.status) queryParams.status = filters.status;
        if (filters.search) queryParams.search = filters.search;
        if (filters.startDate) queryParams.startDate = new Date(filters.startDate).toISOString();
        if (filters.endDate) queryParams.endDate = new Date(filters.endDate).toISOString();
        
        const response = await patrolService.getAllPatrols(queryParams);
        
        setPatrols(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalPatrols(response.data.total);
        
      } catch (err) {
        console.error('Error fetching patrols:', err);
        setError('Failed to load patrols. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatrols();
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
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'in-progress':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'completed':
        return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  if (loading && patrols.length === 0) {
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
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Patrols</h1>
        {hasRole(['admin', 'manager']) && (
          <button
            onClick={() => navigate('/assign-patrol')}
            className="btn-primary flex items-center whitespace-nowrap shadow-md"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign New Patrol
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
              placeholder="Search by title or ID..."
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
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
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
          
          <div className="self-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-blue-500/30 rounded-md text-blue-300 hover:bg-blue-900/30 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="text-sm text-blue-300/70">
          Showing {patrols.length} of {totalPatrols} patrols
        </div>
      </div>

      {/* Patrols Table */}
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
                  onClick={() => handleSortChange('status')}
                >
                  <div className="flex items-center">
                    Status
                    {renderSortIndicator('status')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('startTime')}
                >
                  <div className="flex items-center">
                    Start Time
                    {renderSortIndicator('startTime')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('endTime')}
                >
                  <div className="flex items-center">
                    End Time
                    {renderSortIndicator('endTime')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                  Officers
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/30">
              {loading && patrols.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center">
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : patrols.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-blue-300/70">
                    No patrols found matching your filters.
                  </td>
                </tr>
              ) : (
                patrols.map((patrol) => (
                  <tr key={patrol._id} className="hover:bg-blue-900/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/patrols/${patrol._id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                        {patrol.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(patrol.status)}`}>
                        {patrol.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70">
                      {new Date(patrol.startTime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70">
                      {patrol.endTime ? new Date(patrol.endTime).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70">
                      {patrol.assignedOfficers?.length || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          to={`/patrols/${patrol._id}`} 
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View
                        </Link>
                        
                        {hasRole(['admin', 'manager']) && (
                          <>
                            <span className="text-blue-900/50">|</span>
                            <Link 
                              to={`/patrols/${patrol._id}/edit`} 
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
                  Showing <span className="font-medium text-blue-300">{patrols.length ? (page - 1) * limit + 1 : 0}</span> to <span className="font-medium text-blue-300">{Math.min(page * limit, totalPatrols)}</span> of{' '}
                  <span className="font-medium text-blue-300">{totalPatrols}</span> results
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

export default PatrolsPage; 