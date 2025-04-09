import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileDownload, FaChartBar, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());
  const [reportType, setReportType] = useState('patrol');

  useEffect(() => {
    fetchReports();
  }, [reportType, startDate, endDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/reports', {
        params: {
          type: reportType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      // Ensure reports is always an array
      const reportsData = Array.isArray(response.data) ? response.data : [];
      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (type) => {
    try {
      const response = await axios.get(`/api/reports/download`, {
        params: {
          type,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded successfully`);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const renderReportData = () => {
    if (loading) {
      return <div className="flex justify-center my-8"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;
    }

    if (!Array.isArray(reports) || reports.length === 0) {
      return <div className="text-center my-8 text-blue-300">No data available for the selected criteria</div>;
    }

    if (reportType === 'patrol') {
      return (
        <div className="bg-[#071a2f] rounded-lg overflow-hidden border border-blue-900/30">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-900/30">
              <thead className="bg-[#0a2440]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Patrol ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Officer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">End Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-[#0a2440]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-100">{report._id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.location?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {report.assignedOfficers?.map(officer => officer.name).join(', ') || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{format(new Date(report.startTime), 'MMM dd, yyyy HH:mm')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {report.endTime ? format(new Date(report.endTime), 'MMM dd, yyyy HH:mm') : 'Ongoing'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${report.status === 'completed' ? 'bg-green-900/50 text-green-300' : 
                          report.status === 'in-progress' ? 'bg-blue-900/50 text-blue-300' : 
                          'bg-yellow-900/50 text-yellow-300'}`}>
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (reportType === 'incident') {
      return (
        <div className="bg-[#071a2f] rounded-lg overflow-hidden border border-blue-900/30">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-900/30">
              <thead className="bg-[#0a2440]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Incident ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Reported By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-[#0a2440]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-100">{report._id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.location?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.reportedBy?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{format(new Date(report.date), 'MMM dd, yyyy HH:mm')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${report.severity === 'high' ? 'bg-red-900/50 text-red-300' : 
                          report.severity === 'medium' ? 'bg-yellow-900/50 text-yellow-300' : 
                          'bg-green-900/50 text-green-300'}`}>
                        {report.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${report.status === 'resolved' ? 'bg-green-900/50 text-green-300' : 
                          report.status === 'in-progress' ? 'bg-blue-900/50 text-blue-300' : 
                          'bg-yellow-900/50 text-yellow-300'}`}>
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (reportType === 'officer') {
      return (
        <div className="bg-[#071a2f] rounded-lg overflow-hidden border border-blue-900/30">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-900/30">
              <thead className="bg-[#0a2440]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Officer ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Patrols Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Incidents Reported</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-[#0a2440]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-100">{report._id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.patrolsCompleted || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">{report.incidentsReported || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${report.active ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {report.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">Reports</h1>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => downloadReport(reportType)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-md hover:from-blue-700 hover:to-blue-600 transition-colors shadow-md"
          >
            <FaFileDownload className="mr-2" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="bg-[#071a2f]/80 backdrop-blur-md p-6 rounded-lg shadow-lg border border-blue-900/30 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-2">Report Type</label>
            <div className="relative">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="patrol">Patrol Reports</option>
                <option value="incident">Incident Reports</option>
                <option value="officer">Officer Performance</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-400">
                <FaFilter size={16} />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-2">Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              maxDate={new Date()}
              dateFormat="MMMM d, yyyy"
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              wrapperClassName="datepicker-wrapper"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-300 mb-2">End Date</label>
            <DatePicker
              selected={endDate}
              onChange={setEndDate}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              maxDate={new Date()}
              dateFormat="MMMM d, yyyy"
              className="w-full px-4 py-2.5 bg-[#0a2440] text-blue-100 border border-blue-900/50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              wrapperClassName="datepicker-wrapper"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-md shadow-md transition-colors flex items-center justify-center"
            >
              <FaChartBar className="mr-2" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">
          {reportType === 'patrol' ? 'Patrol Reports' : reportType === 'incident' ? 'Incident Reports' : 'Officer Performance'}
        </h2>
        {renderReportData()}
      </div>

      {/* Custom CSS for datepicker */}
      <style jsx="true">{`
        .datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker {
          font-family: inherit;
          background-color: #071a2f;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }
        .react-datepicker__header {
          background-color: #0a2440;
          border-bottom: 1px solid rgba(59, 130, 246, 0.3);
        }
        .react-datepicker__current-month,
        .react-datepicker-time__header,
        .react-datepicker-year-header,
        .react-datepicker__day-name {
          color: #93c5fd;
        }
        .react-datepicker__day {
          color: #e2e8f0;
        }
        .react-datepicker__day:hover {
          background-color: #1e40af;
          border-radius: 0.3rem;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #3b82f6;
          border-radius: 0.3rem;
          color: white;
        }
        .react-datepicker__day--disabled {
          color: #475569;
        }
        .react-datepicker__navigation-icon::before {
          border-color: #93c5fd;
        }
      `}</style>
    </div>
  );
};

export default ReportsPage; 