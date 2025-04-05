"use client"

import { useState, useEffect, useContext } from "react"
import { EventContext } from "../context/EventContext"
import { SocketContext } from "../context/SocketContext"
import analyticsService from "../services/analyticsService"

import SentimentOverview from "../components/dashboard/SentimentOverview"
import ActiveAlerts from "../components/dashboard/ActiveAlerts"
import FeedbackStream from "../components/dashboard/FeedbackStream"
import TrendingTopics from "../components/dashboard/TrendingTopics"
import SentimentChart from "../components/charts/SentimentChart"
import { Loader } from "../components/common/Loader"
import { Button } from "../components/common/Button"

// Icons
import { Calendar, Users, MessageCircle, Bell, Clock, RefreshCw } from "react-feather"

const Dashboard = () => {
  const { selectedEvent } = useContext(EventContext)
  const { socket, connected, newFeedback, newAlert } = useContext(SocketContext)

  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState("day")
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const getEventId = () => {
    if (!selectedEvent) return null
    return selectedEvent.id || selectedEvent._id || selectedEvent.eventId || selectedEvent.event_id
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const eventId = getEventId()
      if (!eventId) {
        throw new Error("Invalid or missing event ID")
      }

      console.log("Fetching dashboard data for event:", eventId)
      const data = await analyticsService.getDashboardData(eventId)
      setDashboardData(data)
      setLastRefresh(Date.now())
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError(err.message || "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedEvent) {
      fetchDashboardData()
    }
  }, [selectedEvent])

  useEffect(() => {
    if (socket && connected && selectedEvent) {
      const eventId = getEventId()
      if (!eventId) return

      socket.emit("join-event", { eventId })
      socket.emit("subscribe-alerts", { eventId })

      const handleNewFeedback = (feedback) => {
        console.log("New feedback received via socket:", feedback)
        if (feedback.event === eventId) {
          setDashboardData((prev) => {
            if (!prev) return prev
            const sentimentKey = feedback.sentiment || "neutral"
            return {
              ...prev,
              feedback: {
                ...prev.feedback,
                latest: [feedback, ...prev.feedback.latest.slice(0, 4)],
                recent: (prev.feedback.recent || 0) + 1,
                sentiment: {
                  ...prev.feedback.sentiment,
                  [sentimentKey]: {
                    ...prev.feedback.sentiment[sentimentKey],
                    count: (prev.feedback.sentiment[sentimentKey]?.count || 0) + 1,
                  },
                },
              },
            }
          })
        }
      }

      const handleNewAlert = (alert) => {
        console.log("New alert received via socket:", alert)
        if (alert.event === eventId) {
          setDashboardData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              alerts: {
                ...prev.alerts,
                latest: [alert, ...prev.alerts.latest.slice(0, 4)],
                active: (prev.alerts.active || 0) + 1,
              },
            }
          })
        }
      }

      const handleAlertUpdate = (alert) => {
        console.log("Alert update received via socket:", alert)
        if (alert.event === eventId) {
          setDashboardData((prev) => {
            if (!prev) return prev
            const updatedLatest = prev.alerts.latest.map((a) => (a._id === alert._id ? alert : a))
            const activeAdjustment = alert.status === "resolved" ? -1 : 0
            return {
              ...prev,
              alerts: {
                ...prev.alerts,
                latest: updatedLatest,
                active: Math.max(0, (prev.alerts.active || 0) + activeAdjustment),
              },
            }
          })
        }
      }

      socket.on("new-feedback", handleNewFeedback)
      socket.on("new-alert", handleNewAlert)
      socket.on("alert-updated", handleAlertUpdate)

      return () => {
        socket.off("new-feedback", handleNewFeedback)
        socket.off("new-alert", handleNewAlert)
        socket.off("alert-updated", handleAlertUpdate)
        socket.emit("leave-event", { eventId })
      }
    }
  }, [socket, connected, selectedEvent])

  useEffect(() => {
    if (newFeedback && selectedEvent) {
      const eventId = getEventId()
      if (newFeedback.event === eventId) {
        console.log("New feedback from context:", newFeedback)
        setDashboardData((prev) => {
          if (!prev) return prev
          const sentimentKey = newFeedback.sentiment || "neutral"
          return {
            ...prev,
            feedback: {
              ...prev.feedback,
              latest: [newFeedback, ...prev.feedback.latest.slice(0, 4)],
              recent: (prev.feedback.recent || 0) + 1,
              sentiment: {
                ...prev.feedback.sentiment,
                [sentimentKey]: {
                  ...prev.feedback.sentiment[sentimentKey],
                  count: (prev.feedback.sentiment[sentimentKey]?.count || 0) + 1,
                },
              },
            },
          }
        })
      }
    }
  }, [newFeedback, selectedEvent])

  useEffect(() => {
    if (newAlert && selectedEvent) {
      const eventId = getEventId()
      if (newAlert.event === eventId) {
        console.log("New alert from context:", newAlert)
        setDashboardData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            alerts: {
              ...prev.alerts,
              latest: [newAlert, ...prev.alerts.latest.slice(0, 4)],
              active: (prev.alerts.active || 0) + 1,
            },
          }
        })
      }
    }
  }, [newAlert, selectedEvent])

  useEffect(() => {
    if (selectedEvent) {
      const refreshInterval = setInterval(() => {
        fetchDashboardData()
      }, 60000)
      return () => clearInterval(refreshInterval)
    }
  }, [selectedEvent])

  useEffect(() => {
    const dashboardElement = document.getElementById("dashboard-content")
    if (dashboardElement) {
      dashboardElement.classList.add("animate-fade-in")
    }
  }, [])

  // Display a dark background loader while data is loading
  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#00001A]">
        <Loader size="lg" className="text-[#9D174D] animate-spin" />
      </div>
    )
  }

  // If no event is selected (and not loading), prompt user to select one
  if (!selectedEvent) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-black animate-fade-in rounded-xl">
        <h2 className="text-xl mb-4 text-white font-semibold">Select an event to view dashboard</h2>
        <Button
          variant="primary"
          onClick={() => (window.location.href = "/events")}
          className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:rotate-2"
        >
          <Calendar size={16} className="mr-2 text-[#9D174D]" /> Go to Events
        </Button>
      </div>
    )
  }

  return (
    <div id="dashboard-content" className="p-6 bg-[#00001A] min-h-screen">
      <div className="bg-white/5 backdrop-blur-lg rounded-xl shadow-xl p-6 mb-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-white bg-gradient-to-r from-[#9D174D] to-[#C53070] bg-clip-text text-transparent">
              {selectedEvent.name}
            </h1>
            <div className="flex items-center text-gray-300">
              <Calendar size={16} className="mr-2 text-[#9D174D]" />
              {selectedEvent.startDate && new Date(selectedEvent.startDate).toLocaleDateString()} -
              {selectedEvent.endDate && new Date(selectedEvent.endDate).toLocaleDateString()}
            </div>
          </div>
          <div className="flex space-x-2">
            <div className={`px-3 py-1 rounded-full text-white transition-all duration-300 border ${selectedEvent.isActive ? "bg-green-500/20 text-green-300 border-green-700" : "bg-red-500/20 text-red-300 border-red-700"}`}>
              {selectedEvent.isActive ? "Active" : "Inactive"}
            </div>
            <Button
              variant="primary"
              onClick={fetchDashboardData}
              disabled={loading}
              className="bg-[#9D174D] hover:bg-[#C53070] text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:rotate-2"
            >
              <RefreshCw size={16} className="mr-2 text-[#9D174D]" /> Refresh
            </Button>
          </div>
        </div>
        {loading && dashboardData && <div className="mt-2 text-sm text-gray-400 animate-pulse">Refreshing data...</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { title: "Active Alerts", value: dashboardData?.alerts?.active || 0, icon: <Bell size={24} className="text-[#9D174D]" />, color: "red" },
          { title: "Recent Feedback", value: dashboardData?.feedback?.recent || 0, icon: <MessageCircle size={24} className="text-[#9D174D]" />, color: "pink" },
          { title: "Connected Users", value: dashboardData?.event?.connectedUsers || 0, icon: <Users size={24} className="text-[#9D174D]" />, color: "green" },
          { title: "Time Remaining", value: `${dashboardData?.event?.daysRemaining || "0"} days`, icon: <Clock size={24} className="text-[#9D174D]" />, color: "pink" },
        ].map((stat, index) => (
          <div
            key={stat.title}
            className="bg-white/5 backdrop-blur-lg rounded-xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:rotate-1"
            style={{ animationDelay: `${100 * (index + 1)}ms` }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-300 mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              </div>
              <div className={`h-12 w-12 rounded-full bg-${stat.color}-500/20 flex items-center justify-center animate-pulse-slow`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <SentimentOverview
            sentimentData={dashboardData?.feedback?.sentiment}
            className="bg-white/5 backdrop-blur-lg rounded-xl shadow-xl p-6 transform transition-all duration-300 hover:shadow-2xl hover:scale-102 hover:rotate-1"
            style={{ animationDelay: "500ms" }}
          />

          <div
            className="bg-white/5 backdrop-blur-lg rounded-xl shadow-xl p-6 transform transition-all duration-300 hover:shadow-2xl hover:scale-102 hover:rotate-1"
            style={{ animationDelay: "600ms" }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Sentiment Timeline</h3>
              <div className="flex space-x-2">
                {["hour", "day", "week"].map((tf) => (
                  <button
                    key={tf}
                    className={`px-3 py-1 rounded-full transition-all duration-200 transform hover:scale-105 hover:rotate-2 ${
                      timeframe === tf 
                        ? "bg-[#9D174D] text-white" 
                        : "bg-[#00001A] text-gray-300 hover:bg-[#9D174D]/20"
                    }`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf.charAt(0).toUpperCase() + tf.slice(1)}ly
                  </button>
                ))}
              </div>
            </div>
            <SentimentChart timeframe={timeframe} eventId={getEventId()} height={300} />
          </div>

          <TrendingTopics
            topics={dashboardData?.trends}
            className="bg-white/5 text-white backdrop-blur-lg rounded-xl shadow-xl p-6 transform transition-all duration-300 hover:shadow-2xl hover:scale-102 hover:rotate-1"
            style={{ animationDelay: "700ms" }}
          />
        </div>

        <div className="space-y-6">
          <ActiveAlerts
            alerts={dashboardData?.alerts?.latest || []}
            className="bg-white/5 backdrop-blur-lg  text-white rounded-xl shadow-xl p-6 transform transition-all duration-300 hover:shadow-2xl hover:scale-102 hover:rotate-1"
            style={{ animationDelay: "800ms" }}
          />

          <FeedbackStream
            feedback={dashboardData?.feedback?.latest || []}
            className="bg-white/5 backdrop-blur-lg text-white rounded-xl shadow-xl p-6 transform transition-all duration-300 hover:shadow-2xl hover:scale-102 hover:rotate-1"
            style={{ animationDelay: "900ms" }}
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard;
