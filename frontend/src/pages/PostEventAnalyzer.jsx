import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EventContext } from '../context/EventContext';
import postEventAnalyticsService from '../services/postEventAnalyticsService';
import { Button } from '../components/common/Button';
import { Loader } from '../components/common/Loader';
import {
  Award,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Info,
  HelpCircle,
  Command,
  BarChart2,
  Activity
} from 'react-feather';

const PostEventAnalysis = () => {
  const { selectedEvent } = useContext(EventContext);
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [report, setReport] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Check if report is available
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const eventToUse = selectedEvent?.id || selectedEvent?._id || eventId;
        if (!eventToUse) {
          setError('No event selected');
          setLoading(false);
          return;
        }
        
        const availability = await postEventAnalyticsService.checkReportAvailability(eventToUse);
        setIsAvailable(availability.available);
        
        if (availability.available) {
          fetchReport(eventToUse);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to check report availability: ' + err.message);
        setLoading(false);
      }
    };
    
    checkAvailability();
  }, [selectedEvent, eventId]);
  
  const fetchReport = async (eventId, force = false) => {
    try {
      setLoading(true);
      setError(null);
      const reportData = await postEventAnalyticsService.getPostEventReport(eventId, force);
      setReport(reportData);
      setIsAvailable(true);
    } catch (err) {
      setError('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = async (format = 'json') => {
    try {
      const eventToUse = selectedEvent?.id || selectedEvent?._id || eventId;
      const data = await postEventAnalyticsService.exportPostEventReport(eventToUse, format);
      
      if (format === 'json') {
        // For JSON, create a download file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.event.name.replace(/\s+/g, '_')}_report.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // For other formats (like PDF), the API response should be a blob
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.event.name.replace(/\s+/g, '_')}_report.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setError('Failed to export report: ' + err.message);
    }
  };
  
  // Map success level to visual elements
  const getSuccessLevelInfo = (level) => {
    const levels = {
      exceptional: { color: 'bg-green-500', text: 'text-green-500', icon: <Award className="text-green-500" size={24} /> },
      successful: { color: 'bg-green-400', text: 'text-green-400', icon: <ThumbsUp className="text-green-400" size={24} /> },
      satisfactory: { color: 'bg-blue-400', text: 'text-blue-400', icon: <ThumbsUp className="text-blue-400" size={24} /> },
      mixed: { color: 'bg-yellow-400', text: 'text-yellow-400', icon: <HelpCircle className="text-yellow-400" size={24} /> },
      challenging: { color: 'bg-orange-400', text: 'text-orange-400', icon: <AlertTriangle className="text-orange-400" size={24} /> },
      problematic: { color: 'bg-red-500', text: 'text-red-500', icon: <ThumbsDown className="text-red-500" size={24} /> }
    };
    
    return levels[level] || levels.mixed;
  };
  
  // Format insight type to visual elements
  const getInsightTypeInfo = (type) => {
    const types = {
      positive: { color: 'bg-green-500/20', icon: <ThumbsUp className="text-green-500" size={20} /> },
      negative: { color: 'bg-red-500/20', icon: <ThumbsDown className="text-red-500" size={20} /> },
      warning: { color: 'bg-orange-500/20', icon: <AlertTriangle className="text-orange-500" size={20} /> },
      info: { color: 'bg-blue-500/20', icon: <Info className="text-blue-500" size={20} /> },
      neutral: { color: 'bg-gray-500/20', icon: <HelpCircle className="text-gray-500" size={20} /> }
    };
    
    return types[type] || types.info;
  };
  
  // Format recommendation priority to visual elements
  const getPriorityInfo = (priority) => {
    const priorities = {
      high: { color: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500' },
      medium: { color: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500' },
      low: { color: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500' }
    };
    
    return priorities[priority] || priorities.medium;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center p-6 bg-red-900/20 text-red-400 rounded-lg mt-4 animate-fade-in">
        <p className="text-lg font-semibold">{error}</p>
        <Button
          variant="danger"
          className="mt-4 bg-accent hover:bg-accent-dark text-accent-foreground transition-colors duration-200"
          onClick={() => fetchReport(selectedEvent?.id || selectedEvent?._id || eventId)}
          icon={<RefreshCw size={16} />}
        >
          Retry
        </Button>
      </div>
    );
  }
  
  if (!isAvailable) {
    return (
      <div className="text-center p-8 bg-primary rounded-lg shadow-lg animate-fade-in">
        <BarChart2 size={48} className="text-accent mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary-foreground mb-2">Post-Event Analysis Not Available Yet</h2>
        <p className="text-primary-foreground/70 mb-6">
          This comprehensive analysis becomes available after your event concludes or within 24 hours of its scheduled end date.
        </p>
        
        <div className="max-w-lg mx-auto bg-primary-dark p-6 rounded-lg">
          <p className="text-primary-foreground/70 mb-4">
            The post-event analysis provides valuable insights including:
          </p>
          <ul className="text-left text-primary-foreground/70 space-y-2 mb-4">
            <li className="flex items-center">
              <TrendingUp size={16} className="text-accent mr-2" />
              Sentiment trend analysis
            </li>
            <li className="flex items-center">
              <AlertTriangle size={16} className="text-accent mr-2" />
              Key issue identification
            </li>
            <li className="flex items-center">
              <Award size={16} className="text-accent mr-2" />
              Improvement recommendations
            </li>
            <li className="flex items-center">
              <Command size={16} className="text-accent mr-2" />
              Actionable next steps
            </li>
          </ul>
          
          <Button
            variant="primary"
            className="mt-2 bg-accent hover:bg-accent-dark text-accent-foreground transition-colors duration-200"
            onClick={() => fetchReport(selectedEvent?.id || selectedEvent?._id || eventId, true)}
            icon={<RefreshCw size={16} />}
          >
            Generate Report Anyway
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 pb-12 bg-primary-dark min-h-screen animate-fade-in">
      {/* Report Header */}
      <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-primary-foreground">{report.event.name} - Post-Event Analysis</h1>
            <div className="flex items-center text-primary-foreground/70">
              <Calendar size={16} className="mr-2 text-accent" />
              {new Date(report.event.startDate).toLocaleDateString()} - 
              {new Date(report.event.endDate).toLocaleDateString()}
              <span className="ml-4 text-sm bg-accent/20 text-accent px-2 py-0.5 rounded">
                {report.eventStatus === 'completed' ? 'Completed' : 'Active'}
              </span>
            </div>
            <div className="text-sm text-primary-foreground/50 mt-1">
              Report generated: {new Date(report.reportGeneratedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="primary"
              icon={<Download size={16} />}
              onClick={() => handleExport('json')}
              className="bg-accent hover:bg-accent-dark text-accent-foreground transition-all duration-200 transform hover:scale-105"
            >
              Export
            </Button>
            <Button
              variant="primary"
              icon={<RefreshCw size={16} />}
              onClick={() => fetchReport(report.event.id, true)}
              className="bg-accent hover:bg-accent-dark text-accent-foreground transition-all duration-200 transform hover:scale-105"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex mb-6 bg-primary rounded-lg shadow-lg shadow-black/10 p-2">
        <button
          className={`flex-1 py-2 px-4 rounded-md ${activeTab === 'overview' ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/70 hover:text-primary-foreground'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md ${activeTab === 'insights' ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/70 hover:text-primary-foreground'}`}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md ${activeTab === 'recommendations' ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/70 hover:text-primary-foreground'}`}
          onClick={() => setActiveTab('recommendations')}
        >
          Recommendations
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md ${activeTab === 'details' ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/70 hover:text-primary-foreground'}`}
          onClick={() => setActiveTab('details')}
        >
          Detailed Analysis
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Success Score Card */}
          <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
            <h2 className="text-xl font-bold mb-4 text-primary-foreground">Event Success Score</h2>
            <div className="flex items-center">
              <div className="w-64 h-64 relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-primary-dark"></div>
                    <div 
                      className={`absolute bottom-0 left-0 right-0 ${getSuccessLevelInfo(report.summary.successLevel).color}`} 
                      style={{ height: `${report.summary.overallScore}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-4xl font-bold text-primary-foreground">{report.summary.overallScore}</span>
                      <span className="text-sm text-primary-foreground/70">out of 100</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 ml-6">
                <div className="flex items-center mb-2">
                  {getSuccessLevelInfo(report.summary.successLevel).icon}
                  <h3 className={`text-xl font-bold ml-2 ${getSuccessLevelInfo(report.summary.successLevel).text}`}>
                    {report.summary.successLevel.charAt(0).toUpperCase() + report.summary.successLevel.slice(1)}
                  </h3>
                </div>
                <p className="text-primary-foreground/70 mb-4">
                  This event's success score is calculated based on attendee sentiment ({report.summary.sentimentRatio} positive/negative ratio), 
                  issue resolution rate ({report.summary.issuesResolutionRate}%), and alert management efficiency ({report.summary.alertsResolutionRate}%).
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary-dark rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-primary-foreground/70">Feedback Items</span>
                      <span className="text-xl font-bold text-primary-foreground">{report.summary.feedbackTotal}</span>
                    </div>
                  </div>
                  <div className="bg-primary-dark rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-primary-foreground/70">Net Sentiment</span>
                      <span className={`text-xl font-bold ${parseFloat(report.summary.netSentimentScore) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {report.summary.netSentimentScore}
                      </span>
                    </div>
                  </div>
                  <div className="bg-primary-dark rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-primary-foreground/70">Alerts</span>
                      <span className="text-xl font-bold text-primary-foreground">{report.summary.alertsTotal}</span>
                    </div>
                  </div>
                  <div className="bg-primary-dark rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-primary-foreground/70">Response Time</span>
                      <span className="text-xl font-bold text-primary-foreground">{report.summary.averageAlertResponseTime} min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Feedback Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Feedback */}
            <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
              <h3 className="flex items-center text-lg font-bold mb-3 text-primary-foreground">
                <ThumbsUp size={20} className="text-green-500 mr-2" />
                Top Positive Feedback
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {report.feedback.topPositiveFeedback.length > 0 ? (
                  report.feedback.topPositiveFeedback.map((item, index) => (
                    <div key={index} className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                      <p className="text-primary-foreground/90 text-sm">"{item.text}"</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-primary-foreground/50">
                        <span>Via {item.source}</span>
                        <span>Score: {item.score.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-primary-foreground/50 italic">No positive feedback recorded</p>
                )}
              </div>
            </div>

            {/* Negative Feedback */}
            <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
              <h3 className="flex items-center text-lg font-bold mb-3 text-primary-foreground">
                <ThumbsDown size={20} className="text-red-500 mr-2" />
                Top Negative Feedback
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {report.feedback.topNegativeFeedback.length > 0 ? (
                  report.feedback.topNegativeFeedback.map((item, index) => (
                    <div key={index} className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                      <p className="text-primary-foreground/90 text-sm">"{item.text}"</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-primary-foreground/50">
                        <span>Via {item.source} • {item.issueType || 'Unknown issue'}</span>
                        <span>Score: {item.score.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-primary-foreground/50 italic">No negative feedback recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sentiment Distribution */}
            <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
              <h3 className="text-lg font-bold mb-3 text-primary-foreground">Sentiment Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-2/5 text-green-500">Positive</div>
                  <div className="w-3/5 bg-primary-dark rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${report.feedback.sentimentPercentages.positive}%` }}
                    ></div>
                  </div>
                  <div className="ml-2 text-primary-foreground/70">
                    {Math.round(report.feedback.sentimentPercentages.positive)}%
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-2/5 text-blue-400">Neutral</div>
                  <div className="w-3/5 bg-primary-dark rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-blue-400 h-full" 
                      style={{ width: `${report.feedback.sentimentPercentages.neutral}%` }}
                    ></div>
                  </div>
                  <div className="ml-2 text-primary-foreground/70">
                    {Math.round(report.feedback.sentimentPercentages.neutral)}%
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-2/5 text-red-500">Negative</div>
                  <div className="w-3/5 bg-primary-dark rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${report.feedback.sentimentPercentages.negative}%` }}
                    ></div>
                  </div>
                  <div className="ml-2 text-primary-foreground/70">
                    {Math.round(report.feedback.sentimentPercentages.negative)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Alert Status */}
            <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
              <h3 className="text-lg font-bold mb-3 text-primary-foreground">Alert Resolution</h3>
              <div className="flex items-center mb-3">
                <div className="w-full bg-primary-dark rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full" 
                    style={{ width: `${report.alerts.resolutionRate}%` }}
                  ></div>
                </div>
                <div className="ml-2 text-primary-foreground/70">
                  {Math.round(report.alerts.resolutionRate)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-primary-dark rounded p-2 flex justify-between">
                  <span className="text-primary-foreground/70">Total</span>
                  <span className="text-primary-foreground">{report.alerts.total}</span>
                </div>
                <div className="bg-primary-dark rounded p-2 flex justify-between">
                  <span className="text-primary-foreground/70">Resolved</span>
                  <span className="text-primary-foreground">{report.alerts.statusCounts.resolved}</span>
                </div>
                <div className="bg-primary-dark rounded p-2 flex justify-between">
                  <span className="text-primary-foreground/70">Response</span>
                  <span className="text-primary-foreground">{report.alerts.averageResponseTimeMinutes} min</span>
                </div>
                <div className="bg-primary-dark rounded p-2 flex justify-between">
                  <span className="text-primary-foreground/70">Critical</span>
                  <span className="text-primary-foreground">{report.alerts.severityCounts.critical}</span>
                </div>
              </div>
            </div>

            {/* Top Issues */}
            <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
              <h3 className="text-lg font-bold mb-3 text-primary-foreground">Top Issues</h3>
              {report.feedback.topIssues.length > 0 ? (
                <div className="space-y-2">
                  {report.feedback.topIssues.slice(0, 4).map((issue, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-2/5 truncate text-primary-foreground/90">{issue.issue}</div>
                      <div className="w-3/5 bg-primary-dark rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-accent h-full" 
                          style={{ width: `${issue.percentage}%` }}
                        ></div>
                      </div>
                      <div className="ml-2 text-primary-foreground/70 text-sm">
                        {Math.round(issue.percentage)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-primary-foreground/50 italic">No issues identified</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
          <h2 className="text-xl font-bold mb-4 text-primary-foreground">Key Event Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.insights.map((insight, index) => {
              const insightType = getInsightTypeInfo(insight.type);
              return (
                <div key={index} className={`${insightType.color} rounded-lg p-4 border border-${insight.type}-500/20`}>
                  <div className="flex items-start">
                    <div className="pt-1">
                      {insightType.icon}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-bold text-lg text-primary-foreground">{insight.title}</h3>
                      <p className="text-primary-foreground/80">{insight.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Sentiment Changes Chart - Simplified visual for trend detection */}
          {report.sentiment.sentimentChanges.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-3 text-primary-foreground">Sentiment Shifts</h3>
              <div className="bg-primary-dark p-4 rounded-lg">
                <div className="space-y-4">
                  {report.sentiment.sentimentChanges.map((change, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-1/4 text-sm text-primary-foreground/70">
                        {new Date(change.from).toLocaleDateString()} → {new Date(change.to).toLocaleDateString()}
                      </div>
                      <div className="w-3/4 flex items-center">
                        <div className={`h-8 flex-1 rounded-md ${change.direction === 'negative' ? 'bg-red-500/50' : 'bg-green-500/50'}`}></div>
                        <div className="ml-3">
                          <span className={`text-sm ${change.direction === 'negative' ? 'text-red-500' : 'text-green-500'}`}>
                            {change.changePct}% shift toward {change.direction} sentiment
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
          <h2 className="text-xl font-bold mb-4 text-primary-foreground">Improvement Recommendations</h2>
          
          <div className="space-y-4">
            {report.improvement.map((rec, index) => {
              const priorityInfo = getPriorityInfo(rec.priority);
              return (
                <div key={index} className={`${priorityInfo.color} rounded-lg p-4 border ${priorityInfo.border}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-primary-dark mr-2">
                        {rec.area}
                      </span>
                      <span className={`text-xs rounded-full px-2 py-0.5 bg-primary-dark ${priorityInfo.text}`}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-primary-foreground">{rec.title}</h3>
                  <p className="text-primary-foreground/80 mt-1">{rec.description}</p>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
            <h3 className="flex items-center text-lg font-bold mb-2 text-primary-foreground">
              <Info className="text-blue-500 mr-2" size={20} />
              Next Steps
            </h3>
            <p className="text-primary-foreground/80">
              Consider creating an action plan based on these recommendations. Focus on high-priority items first, 
              and assign team members to implement specific improvements before your next event.
            </p>
          </div>
        </div>
      )}

      {/* Detailed Analysis Tab */}
      {activeTab === 'details' && (
        <div className="bg-primary rounded-lg shadow-lg shadow-black/10 p-6">
          <h2 className="text-xl font-bold mb-4 text-primary-foreground">Detailed Analysis</h2>
          
          <div className="space-y-6">
            {/* Feedback Analysis */}
            <div className="bg-primary-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-3 flex items-center text-primary-foreground">
                <MessageCircle size={18} className="text-accent mr-2" />
                Feedback Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-primary-foreground/90 mb-2">Sentiment Distribution</h4>
                  <table className="w-full">
                    <tbody>
                      {Object.entries(report.feedback.sentimentCounts).map(([sentiment, count]) => (
                        <tr key={sentiment}>
                          <td className="py-1 text-primary-foreground/70">{sentiment}</td>
                          <td className="py-1 text-right text-primary-foreground">{count}</td>
                          <td className="py-1 text-right text-primary-foreground/70">
                            {report.feedback.sentimentPercentages[sentiment].toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary-foreground/90 mb-2">Feedback Sources</h4>
                  <table className="w-full">
                    <tbody>
                      {Object.entries(report.feedback.sourceCounts).map(([source, count]) => (
                        <tr key={source}>
                          <td className="py-1 text-primary-foreground/70">{source}</td>
                          <td className="py-1 text-right text-primary-foreground">{count}</td>
                          <td className="py-1 text-right text-primary-foreground/70">
                            {report.feedback.sourcePercentages[source].toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold text-primary-foreground/90 mb-2">Issue Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-primary-foreground/50 text-sm">
                        <th className="text-left py-2">Issue Type</th>
                        <th className="text-right py-2">Count</th>
                        <th className="text-right py-2">% of Negative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.feedback.topIssues.map((issue, index) => (
                        <tr key={index}>
                          <td className="py-1 text-primary-foreground/90">{issue.issue}</td>
                          <td className="py-1 text-right text-primary-foreground">{issue.count}</td>
                          <td className="py-1 text-right text-primary-foreground/70">
                            {issue.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Alert Analysis */}
            <div className="bg-primary-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-3 flex items-center text-primary-foreground">
                <Activity size={18} className="text-accent mr-2" />
                Alert Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-primary-foreground/90 mb-2">By Type</h4>
                  <table className="w-full">
                    <tbody>
                      {Object.entries(report.alerts.typeCounts).map(([type, count]) => (
                        <tr key={type}>
                          <td className="py-1 text-primary-foreground/70">{type}</td>
                          <td className="py-1 text-right text-primary-foreground">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary-foreground/90 mb-2">By Severity</h4>
                  <table className="w-full">
                    <tbody>
                      {Object.entries(report.alerts.severityCounts).map(([severity, count]) => (
                        <tr key={severity}>
                          <td className="py-1 text-primary-foreground/70">{severity}</td>
                          <td className="py-1 text-right text-primary-foreground">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary-foreground/90 mb-2">By Status</h4>
                  <table className="w-full">
                    <tbody>
                      {Object.entries(report.alerts.statusCounts).map(([status, count]) => (
                        <tr key={status}>
                          <td className="py-1 text-primary-foreground/70">{status}</td>
                          <td className="py-1 text-right text-primary-foreground">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold text-primary-foreground/90 mb-2">Response Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-primary rounded p-3">
                    <div className="text-primary-foreground/70 text-sm">Resolution Rate</div>
                    <div className="text-primary-foreground text-xl font-bold">{report.alerts.resolutionRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-primary rounded p-3">
                    <div className="text-primary-foreground/70 text-sm">Avg Response Time</div>
                    <div className="text-primary-foreground text-xl font-bold">{report.alerts.averageResponseTimeMinutes} minutes</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Daily Volume */}
            <div className="bg-primary-dark p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-3 flex items-center text-primary-foreground">
                <BarChart2 size={18} className="text-accent mr-2" />
                Daily Feedback Volume
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-primary-foreground/50 text-sm">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">Positive</th>
                      <th className="text-right py-2">Neutral</th>
                      <th className="text-right py-2">Negative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sentiment.dailyVolume.map((day, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-primary/20' : ''}>
                        <td className="py-2 text-primary-foreground/90">{new Date(day.date).toLocaleDateString()}</td>
                        <td className="py-2 text-right text-primary-foreground">{day.total}</td>
                        <td className="py-2 text-right text-green-500">{day.positive}</td>
                        <td className="py-2 text-right text-blue-400">{day.neutral}</td>
                        <td className="py-2 text-right text-red-500">{day.negative}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostEventAnalysis;