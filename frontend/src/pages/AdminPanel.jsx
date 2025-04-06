import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import axios from 'axios';
import { io } from 'socket.io-client';
import "./css/Admin.css";

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const center = {
  lat: 40.7128, // Default latitude (e.g., NYC)
  lng: -74.0060, // Default longitude (e.g., NYC)
};

const libraries = ['places', 'directions'];

const AdminPanel = () => {
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState({ show: false, message: '', type: '' });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, alertId: null });
  const [currentPosition, setCurrentPosition] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Enhanced location tracking
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    const success = (position) => {
      setCurrentPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    };

    const error = (err) => {
      console.error(`Location Error (${err.code}): ${err.message}`);
    };

    const id = navigator.geolocation.watchPosition(success, error, options);
    setWatchId(id);

    const params = new URLSearchParams(location.search);
    const alertId = params.get('alertId');

    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/alerts`);
        setAlerts(res.data);
        setLoading(false);

        if (alertId) {
          const alert = res.data.find(a => a._id === alertId);
          if (alert) {
            setSelectedAlert(alert);
            setShowDirections(true);
          }
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setLoading(false);
      }
    };

    fetchAlerts();

    const socket = io('http://localhost:5000', {
      withCredentials: true,
      extraHeaders: {
        "my-custom-header": "abcd"
      },
      transports: ['websocket', 'polling']
    });

    socket.on('new-alert', (newAlert) => {
      setAlerts((prevAlerts) => [newAlert, ...prevAlerts]);
      if (alertId && newAlert._id === alertId) {
        setSelectedAlert(newAlert);
      }
    });

    socket.on('update-alert', (updatedAlert) => {
      setAlerts((prevAlerts) =>
        prevAlerts.map((alert) =>
          alert._id === updatedAlert._id ? updatedAlert : alert
        )
      );
      if (selectedAlert && selectedAlert._id === updatedAlert._id) {
        setSelectedAlert(updatedAlert);
      }
    });

    socket.on('delete-alert', (deletedAlertId) => {
      setAlerts((prevAlerts) =>
        prevAlerts.filter((alert) => alert._id !== deletedAlertId)
      );
      if (selectedAlert && selectedAlert._id === deletedAlertId) {
        setSelectedAlert(null);
      }
    });

    socket.on('connect', () => console.log('Connected to server'));
    socket.on('disconnect', (reason) => console.error('Disconnected:', reason));
    socket.on('connect_error', (error) => console.error('Connection error:', error));

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.disconnect();
    };
  }, [location.search]);

  useEffect(() => {
    if (selectedAlert && currentPosition && showDirections && selectedAlert.location) {
      if (googleLoaded) {
        calculateRoute();
        zoomToFitRoute();
      }
    } else if (!showDirections) {
      setDirections(null);
      setDistance(null);
      setDuration(null);
    }
  }, [selectedAlert, currentPosition, showDirections, googleLoaded]);

  const calculateRoute = () => {
    if (!window.google || !selectedAlert || !selectedAlert.location) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: currentPosition,
        destination: {
          lat: selectedAlert.location.latitude,
          lng: selectedAlert.location.longitude,
        },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          const route = result.routes[0];
          if (route && route.legs && route.legs[0]) {
            setDistance(route.legs[0].distance.text);
            setDuration(route.legs[0].duration.text);
          }
        } else {
          console.error(`Directions request failed: ${status}`);
        }
      }
    );
  };

  const updateAlertStatus = async (id, status) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/alerts/${id}`, { status });
      setAlerts((prevAlerts) =>
        prevAlerts.map((alert) =>
          alert._id === id ? response.data : alert
        )
      );
      if (selectedAlert && selectedAlert._id === id) {
        setSelectedAlert(response.data);
      }
    } catch (error) {
      console.error('Error updating alert status:', error);
    }
  };

  const showDeleteConfirmation = (id) => {
    setConfirmDelete({ show: true, alertId: id });
  };

  const cancelDelete = () => {
    setConfirmDelete({ show: false, alertId: null });
  };

  const toggleDirections = () => {
    setShowDirections(!showDirections);
  };

  const viewOnMap = (alert) => {
    if (alert.location?.latitude && alert.location?.longitude && mapRef.current) {
      setSelectedAlert(alert);
      mapRef.current.panTo({
        lat: alert.location.latitude,
        lng: alert.location.longitude
      });
      mapRef.current.setZoom(15);
    }
  };

  const openInGoogleMaps = (alert = selectedAlert) => {
    if (alert && currentPosition && alert.location) {
      const userLat = alert.location.latitude;
      const userLng = alert.location.longitude;
      const adminLat = currentPosition.lat;
      const adminLng = currentPosition.lng;
      const url = `https://www.google.com/maps/dir/?api=1&origin=${adminLat},${adminLng}&destination=${userLat},${userLng}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const zoomToFitRoute = () => {
    if (!mapRef.current || !selectedAlert || !currentPosition || !selectedAlert.location) return;
    
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(currentPosition);
    bounds.extend({
      lat: selectedAlert.location.latitude,
      lng: selectedAlert.location.longitude,
    });
    mapRef.current.fitBounds(bounds);
  };

  const confirmDeleteAlert = async () => {
    const id = confirmDelete.alertId;
    if (!id) return;

    try {
      const response = await axios.delete(`http://localhost:5000/api/alerts/${id}`);
      if (response.status !== 200) {
        throw new Error(`Server responded with ${response.status}`);
      }

      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert._id !== id));
      if (selectedAlert && selectedAlert._id === id) {
        setSelectedAlert(null);
        setShowDirections(false);
      }

      setDeleteStatus({
        show: true,
        message: 'Alert deleted successfully',
        type: 'success',
      });
      setConfirmDelete({ show: false, alertId: null });

      setTimeout(() => {
        setDeleteStatus({ show: false, message: '', type: '' });
      }, 3000);
    } catch (error) {
      console.error('Error deleting alert:', error);
      setDeleteStatus({
        show: true,
        message: `Error deleting alert: ${error.message}`,
        type: 'error',
      });
      setConfirmDelete({ show: false, alertId: null });
      setTimeout(() => {
        setDeleteStatus({ show: false, message: '', type: '' });
      }, 3000);
    }
  };

  if (loading) {
    return <div>Loading alerts...</div>;
  }

  return (
    <div className="admin-panel">
      <h1>Alerts Dashboard</h1>

      {deleteStatus.show && (
        <div className={`status-message ${deleteStatus.type}`}>{deleteStatus.message}</div>
      )}

      {confirmDelete.show && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <h3>Delete Alert</h3>
            <p>Are you sure you want to delete this alert? This action cannot be undone.</p>
            <div className="delete-modal-buttons">
              <button className="cancel-btn" onClick={cancelDelete}>Cancel</button>
              <button className="confirm-delete-btn" onClick={confirmDeleteAlert}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-layout">
        <div className="map-container">
          <LoadScript 
            googleMapsApiKey="YOUR_api_KEY"
            libraries={libraries}
            onLoad={() => setGoogleLoaded(true)}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={currentPosition || center}
              zoom={10}
              onLoad={(map) => {
                mapRef.current = map;
                if (selectedAlert && selectedAlert.location?.latitude) {
                  map.panTo({ lat: selectedAlert.location.latitude, lng: selectedAlert.location.longitude });
                }
              }}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false
              }}
            >
              {googleLoaded && directions && showDirections && (
                <DirectionsRenderer
                  directions={directions}
                  options={{ polylineOptions: { strokeColor: '#2E86C1', strokeWeight: 5 } }}
                />
              )}

              {currentPosition && googleLoaded && (
                <Marker
                  position={currentPosition}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#2E86C1',
                    fillOpacity: 1,
                    strokeColor: '#2874A6',
                    strokeWeight: 2,
                    scale: 8,
                  }}
                />
              )}

              {googleLoaded && alerts.map((alert) =>
                alert.location && alert.location.latitude ? (
                  <Marker
                    key={alert._id}
                    position={{ lat: alert.location.latitude, lng: alert.location.longitude }}
                    onClick={() => {
                      setSelectedAlert(alert);
                      if (mapRef.current) mapRef.current.panTo({ lat: alert.location.latitude, lng: alert.location.longitude });
                    }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: alert.type === 'sos' ? 'red' : alert.status === 'new' ? 'red' : alert.status === 'acknowledged' ? 'orange' : 'green',
                      fillOpacity: 0.6,
                      strokeColor: alert.type === 'sos' ? 'red' : alert.status === 'new' ? 'red' : alert.status === 'acknowledged' ? 'orange' : 'green',
                      strokeWeight: 2,
                      scale: 10,
                    }}
                  />
                ) : null
              )}

              {googleLoaded && selectedAlert && selectedAlert.location?.latitude && (
                <InfoWindow
                  position={{ lat: selectedAlert.location.latitude, lng: selectedAlert.location.longitude }}
                  onCloseClick={() => {
                    setSelectedAlert(null);
                    setShowDirections(false);
                  }}
                >
                  <div style={{ maxWidth: '300px', padding: '5px' }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>{selectedAlert.userName || selectedAlert.title}</h3>
                    <p style={{ margin: '0 0 5px 0' }}>{selectedAlert.message || selectedAlert.description}</p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', textTransform: 'capitalize' }}>Status: {selectedAlert.status}</p>
                    <p style={{ margin: '5px 0 0 0' }}>Type: {selectedAlert.type}</p>
                    <div style={{ margin: '10px 0' }}>
                      <p style={{ margin: '0', fontSize: '12px' }}>
                        <strong>Location:</strong>{' '}
                        {selectedAlert.location.latitude.toFixed(6)}, {selectedAlert.location.longitude.toFixed(6)}
                      </p>
                      {distance && showDirections && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                          <strong>Distance:</strong> {distance} ({duration} driving)
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDirections();
                          if (showDirections) zoomToFitRoute();
                        }}
                        style={{ padding: '5px 10px', backgroundColor: showDirections ? '#28a745' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        {showDirections ? 'Hide Route' : 'Show Route'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInGoogleMaps();
                        }}
                        style={{ padding: '5px 10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Open in Maps
                      </button>
                    </div>
                    {(selectedAlert.status === 'resolved' || selectedAlert.type === 'sos') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showDeleteConfirmation(selectedAlert._id);
                        }}
                        style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
                      >
                        Delete Alert
                      </button>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>

        {/* <div className="alerts-container">
          <h2>Recent Alerts</h2>
          {alerts.length === 0 ? (
            <p>No alerts found.</p>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert, index) => (
                <div
                  key={`${alert._id}-${index}`}
                  className={`alert-card ${alert.status} ${alert.type === 'sos' ? 'sos' : ''}`}
                  onClick={() => {
                    if (alert.location?.latitude) {
                      setSelectedAlert(alert);
                      if (mapRef.current) mapRef.current.panTo({ lat: alert.location.latitude, lng: alert.location.longitude });
                    }
                  }}
                >
                  <div className="alert-header">
                    <h3>{alert.userName || alert.title}</h3>
                    <span className="date">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="message">{alert.message || alert.description}</p>
                  {alert.location && alert.location.latitude ? (
                    <div className="location-details">
                      <p>
                        Location: {alert.location.latitude.toFixed(6)}, {alert.location.longitude.toFixed(6)}
                        {alert.location.accuracy && ` (Accuracy: ${alert.location.accuracy.toFixed(1)}m)`}
                      </p>
                      {selectedAlert && selectedAlert._id === alert._id && distance && showDirections && (
                        <p>Distance: {distance} ({duration} driving)</p>
                      )}
                    </div>
                  ) : (
                    <p className="location-details">Location: Unavailable</p>
                  )}
                  <div className="alert-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        viewOnMap(alert);
                      }}
                      className="action-btn view-map"
                      disabled={!alert.location?.latitude}
                    >
                      View on Map
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlert(alert);
                        setShowDirections(true);
                        zoomToFitRoute();
                      }}
                      className="action-btn show-route"
                      disabled={!alert.location?.latitude}
                    >
                      Show Route
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(alert);
                      }}
                      className="action-btn get-directions"
                      disabled={!alert.location?.latitude}
                    >
                      Get Directions
                    </button>

                    {alert.status === 'new' && (
                      <>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            updateAlertStatus(alert._id, 'acknowledged'); 
                          }} 
                          className="action-btn acknowledge"
                        >
                          Acknowledge
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            updateAlertStatus(alert._id, 'inProgress'); 
                          }} 
                          className="action-btn in-progress"
                        >
                          In Progress
                        </button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          updateAlertStatus(alert._id, 'inProgress'); 
                        }} 
                        className="action-btn in-progress"
                      >
                        In Progress
                      </button>
                    )}
                    {(alert.status === 'new' || alert.status === 'acknowledged' || alert.status === 'inProgress') && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          updateAlertStatus(alert._id, 'resolved'); 
                        }} 
                        className="action-btn resolve"
                      >
                        Resolve
                      </button>
                    )}
                    {(alert.status === 'resolved' || alert.type === 'sos') && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          showDeleteConfirmation(alert._id); 
                        }} 
                        className="action-btn delete"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default AdminPanel;