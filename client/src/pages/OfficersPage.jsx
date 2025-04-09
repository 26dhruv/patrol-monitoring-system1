import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const OfficersPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOfficers, setTotalOfficers] = useState(0);
  
  // Filters and sorting
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    search: '',
  });
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        setLoading(true);
        
        const queryParams = {
          page,
          limit,
          sort: `${sortOrder === 'desc' ? '-' : ''}${sortField}`,
          role: 'officer',
        };
        
        // Add filters if they are set
        if (filters.status) queryParams.status = filters.status;
        if (filters.department) queryParams.department = filters.department;
        if (filters.search) queryParams.search = filters.search;
        
        const response = await userService.getOfficers(queryParams);
        
        setOfficers(response.data.data);
        setTotalPages(response.data.totalPages || Math.ceil(response.data.data.length / limit));
        setTotalOfficers(response.data.total || response.data.data.length);
        
      } catch (err) {
        console.error('Error fetching officers:', err);
        setError('Failed to load officers. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOfficers();
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
      // Default to ascending when changing fields
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1); // Reset to first page when sort changes
  };
  
  const clearFilters = () => {
    setFilters({
      status: '',
      department: '',
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
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'on-duty':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'off-duty':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'inactive':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  };

  const handleUpdateStatus = async (officerId, newStatus) => {
    try {
      await userService.updateUserStatus(officerId, newStatus);
      
      // Update the status in the local state
      setOfficers(prev => 
        prev.map(officer => 
          officer._id === officerId 
            ? { ...officer, status: newStatus } 
            : officer
        )
      );
    } catch (err) {
      console.error('Error updating officer status:', err);
    }
  };

  if (loading && officers.length === 0) {
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
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Officers</h1>
        {hasRole(['admin', 'manager']) && (
          <button
            onClick={() => navigate('/officers/add')}
            className="btn-primary flex items-center whitespace-nowrap shadow-md"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Officer
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
              placeholder="Search by name, email, or badge number..."
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
              <option value="on-duty">On Duty</option>
              <option value="off-duty">Off Duty</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-blue-300 mb-1">Department</label>
            <select
              id="department"
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-md shadow-sm text-blue-100 bg-[#071425]/50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Departments</option>
              <option value="security">Security</option>
              <option value="police">Police</option>
              <option value="enforcement">Enforcement</option>
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
        
        <div className="text-sm text-blue-300/70">
          Showing {officers.length} of {totalOfficers} officers
        </div>
      </div>

      {/* Officers Table */}
      <div className="card-glass rounded-lg border border-blue-900/30 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-blue-900/30">
            <thead className="bg-[#071425]/50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('name')}
                >
                  <div className="flex items-center">
                    Name
                    {renderSortIndicator('name')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('email')}
                >
                  <div className="flex items-center">
                    Email
                    {renderSortIndicator('email')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange('department')}
                >
                  <div className="flex items-center">
                    Department
                    {renderSortIndicator('department')}
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
                {hasRole(['admin', 'manager']) && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/30">
              {loading && officers.length === 0 ? (
                <tr>
                  <td colSpan={hasRole(['admin', 'manager']) ? 5 : 4} className="px-4 py-4 text-center">
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={hasRole(['admin', 'manager']) ? 5 : 4} className="px-4 py-4 text-center text-blue-300/70">
                    No officers found matching your filters.
                  </td>
                </tr>
              ) : (
                officers.map((officer) => (
                  <tr key={officer._id} className="hover:bg-blue-900/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center justify-center font-medium shadow-glow shadow-blue-500/20">
                          {officer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <Link to={`/officers/${officer._id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                            {officer.name}
                          </Link>
                          <p className="text-xs text-blue-300/70 mt-1">
                            Badge: {officer.badgeNumber || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70">
                      {officer.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-300/70">
                      {officer.department ? (
                        <span className="capitalize">{officer.department}</span>
                      ) : (
                        <span className="text-blue-300/50">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(officer.status)}`}>
                        {officer.status ? officer.status.replace('-', ' ') : 'unknown'}
                      </span>
                    </td>
                    {hasRole(['admin', 'manager']) && (
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/officers/${officer._id}`}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            View
                          </Link>
                          
                          <span className="text-blue-900/50">|</span>
                          
                          <Link
                            to={`/officers/${officer._id}/edit`}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </Link>
                          
                          <span className="text-blue-900/50">|</span>
                          
                          <div className="relative group">
                            <button
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Status
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-[#071425]/90 border border-blue-900/30 rounded-md shadow-lg py-1 z-10 hidden group-hover:block backdrop-blur-md">
                              <button
                                onClick={() => handleUpdateStatus(officer._id, 'on-duty')}
                                className="block w-full text-left px-4 py-2 text-sm text-blue-100 hover:bg-blue-900/30"
                                disabled={officer.status === 'on-duty'}
                              >
                                Set as On Duty
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(officer._id, 'off-duty')}
                                className="block w-full text-left px-4 py-2 text-sm text-blue-100 hover:bg-blue-900/30"
                                disabled={officer.status === 'off-duty'}
                              >
                                Set as Off Duty
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(officer._id, 'inactive')}
                                className="block w-full text-left px-4 py-2 text-sm text-blue-100 hover:bg-blue-900/30"
                                disabled={officer.status === 'inactive'}
                              >
                                Set as Inactive
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
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
                  Showing <span className="font-medium text-blue-300">{officers.length ? (page - 1) * limit + 1 : 0}</span> to <span className="font-medium text-blue-300">{Math.min(page * limit, totalOfficers)}</span> of{' '}
                  <span className="font-medium text-blue-300">{totalOfficers}</span> results
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

export default OfficersPage; 