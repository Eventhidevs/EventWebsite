import React, { useState } from 'react';
import { X, Calendar, MapPin, Clock, User, Tag, FileText, Link, Mail } from 'lucide-react';
import emailjs from '@emailjs/browser';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    event_name: '',
    event_url: '',
    event_summary: '',
    full_address: '',
    region: '',
    presented_by_name: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    event_category: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const categories = [
    'Startup & Entrepreneurship',
    'Hackathon',
    'Tech & AI',
    'Career & Skills',
    'Finance & Business',
    'Networking & Community',
    'Education & Research',
    'Marketing & Branding'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await emailjs.send(
        'service_wpcsqa8',
        'template_gpxoh3o',
        {
          // These keys must match your template variables
          event_name: formData.event_name,
          event_url: formData.event_url,
          event_summary: formData.event_summary,
          full_address: formData.full_address,
          region: formData.region,
          presented_by_name: formData.presented_by_name,
          start_date: formData.start_date,
          start_time: formData.start_time,
          end_date: formData.end_date,
          end_time: formData.end_time,
          event_category: formData.event_category,
          to_email: 'deepak@hidevs.xyz'
        },
        'yOAgflGcPF9mseaJ-'
      );
      setSubmitSuccess(true);
    } catch (error) {
      alert('Failed to send email. Please try again.');
    }
    setIsSubmitting(false);
    
    // Reset form after success
    setTimeout(() => {
      setSubmitSuccess(false);
      setFormData({
        event_name: '',
        event_url: '',
        event_summary: '',
        full_address: '',
        region: '',
        presented_by_name: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        event_category: ''
      });
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-blue-600" />
              Create New Event
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {submitSuccess ? (
            <div className="text-center py-12">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Event Submitted Successfully!</h4>
              <p className="text-gray-600">Your event details have been sent to deepak@hidevs.xyz for review.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Event Name
                  </label>
                  <input
                    type="text"
                    name="event_name"
                    value={formData.event_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter event name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Link className="h-4 w-4 inline mr-1" />
                    Event URL
                  </label>
                  <input
                    type="url"
                    name="event_url"
                    value={formData.event_url}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Event Summary
                  </label>
                  <textarea
                    name="event_summary"
                    value={formData.event_summary}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Describe your event"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Full Address
                  </label>
                  <input
                    type="text"
                    name="full_address"
                    value={formData.full_address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="123 Main St, San Francisco, CA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Region
                  </label>
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="SOMA, Mission, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Presented By
                  </label>
                  <input
                    type="text"
                    name="presented_by_name"
                    value={formData.presented_by_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Organization or person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4 inline mr-1" />
                    Category
                  </label>
                  <select
                    name="event_category"
                    value={formData.event_category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    End Time
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Event'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;