'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Enhanced Icon component with fallbacks
const IconWithFallback = ({ icon, emoji, className = '' }: {
  icon: string;
  emoji: string;
  className?: string;
}) => {
  return (
    <span className={`icon-container ${className}`}>
      <span
        className="material-icons"
        style={{
          fontSize: '24px',
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: '1',
          letterSpacing: 'normal',
          textTransform: 'none',
          display: 'inline-block',
          whiteSpace: 'nowrap',
          wordWrap: 'normal',
          direction: 'ltr',
          WebkitFontFeatureSettings: '"liga"',
          WebkitFontSmoothing: 'antialiased'
        }}
      >
        {icon}
      </span>
      <span
        className="emoji-fallback"
        style={{
          fontSize: '20px',
          display: 'none'
        }}
      >
        {emoji}
      </span>
    </span>
  );
};

interface IntakeFormData {
  // Step 1: Personal Details
  birthDate: string;
  gender: string;
  ethnicity: string;
  address: string;
  city: string;
  country: string;

  // Step 2: Smoking History & Habits
  smokingDuration: string;
  cigarettesPerDay: number;
  smokingTriggers: string[];
  socialTriggers: string[];

  // Step 3: Health & Past Quit Attempts
  pastQuitAttempts: string;
  quitMethods: string[];
  healthIssues: string[];
  respiratoryChanges: string;
  cardiovascularChanges: string;
  healthRiskAwareness: number;

  // Step 4: Motivation & Support System
  quitReasons: string[];
  motivationLevel: number;
  smokerFriendsFamily: string;
  supportPeople: string[];

  // Step 5: Treatment Preferences & Goals
  nicotineReplacementInterest: string;
  pharmacologicalInterest: string;
  stressCopingStrategies: string[];
  followUpInterest: string;
  quitBenefitsAwareness: string;
}

interface IntakeFormProps {
  appointmentId?: string;
  onComplete?: (data: IntakeFormData) => void;
  onClose?: () => void;
}

const STEPS = [
  { id: 1, title: 'Personal Details', description: "Let's start with the basics." },
  { id: 2, title: 'Smoking History & Habits', description: 'Tell us about your current smoking habits. This is a judgment-free zone.' },
  { id: 3, title: 'Health & Past Quit Attempts', description: 'Your health context is important for us to create a safe plan.' },
  { id: 4, title: 'Motivation & Support System', description: 'Understanding your \'why\' is key to success. Let\'s explore it.' },
  { id: 5, title: 'Treatment Preferences & Goals', description: 'Finally, let\'s talk about the future and how we can best help you.' }
];

export default function IntakeForm({ appointmentId, onComplete, onClose }: IntakeFormProps) {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<IntakeFormData>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRetakeOption, setShowRetakeOption] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    if (appointmentId) {
      loadSavedProgress();
    }
  }, [appointmentId]);

  const loadSavedProgress = async () => {
    try {
      const response = await fetch(`/api/patient/intake-form?appointmentId=${appointmentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.formData) {
          setFormData(data.formData);
          setCurrentStep(data.currentStep || 1);
          setIsCompleted(data.completed || false);
          setShowRetakeOption(data.completed || false);
        }
      }
    } catch (error) {
      console.error('Error loading saved progress:', error);
    }
  };

  const saveProgress = async (markAsCompleted = false) => {
    if (!appointmentId) return;

    setSaving(true);
    try {
      const completionStatus = markAsCompleted || (currentStep >= STEPS.length && formData);

      await fetch('/api/patient/intake-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          formData,
          currentStep,
          completed: completionStatus, // Explicitly send boolean
        }),
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof IntakeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = async () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      await saveProgress();
    } else {
      await handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Mark form as completed
      setIsCompleted(true);
      setShowRetakeOption(true);

      // Save with completion status
      await saveProgress(true); // Pass true to mark as completed

      if (onComplete) {
        onComplete(formData as IntakeFormData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    // Reset form to allow re-taking
    setCurrentStep(1);
    setFormData({});
    setIsCompleted(false);
    setShowRetakeOption(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PersonalDetailsStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <SmokingHistoryStep formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <HealthHistoryStep formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <MotivationStep formData={formData} updateFormData={updateFormData} />;
      case 5:
        return <TreatmentPreferencesStep formData={formData} updateFormData={updateFormData} />;
      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-strong w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold gradient-text">Pre-consultation Intake Form</h2>
              <p className="text-gray-600 mt-1">Help us create your personalized quit plan</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-all duration-300 hover:scale-110"
              >
                <IconWithFallback icon="close" emoji="❌" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep} of {STEPS.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-800">{STEPS[currentStep - 1].title}</h3>
              <p className="text-sm text-gray-600">{STEPS[currentStep - 1].description}</p>
              {isCompleted && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <IconWithFallback icon="check_circle" emoji="✅" className="text-green-600 mr-1" />
                  Form Completed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {saving && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="animate-spin">
                    <IconWithFallback icon="refresh" emoji="🔄" className="text-blue-600 text-sm" />
                  </div>
                  <span>Saving...</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {showRetakeOption ? (
                <>
                  <button
                    onClick={handleRetake}
                    className="px-6 py-3 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-all duration-300 hover:scale-105"
                  >
                    <IconWithFallback icon="refresh" emoji="🔄" className="mr-2" />
                    Re-take Form
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  {currentStep > 1 && (
                    <button
                      onClick={prevStep}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105"
                    >
                      Previous
                    </button>
                  )}

                  <button
                    onClick={nextStep}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-medium hover:shadow-strong transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : currentStep === STEPS.length ? 'Complete Form' : 'Next Step'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Components
function PersonalDetailsStep({ formData, updateFormData }: {
  formData: Partial<IntakeFormData>;
  updateFormData: (field: keyof IntakeFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Birth Date</label>
          <input
            type="date"
            value={formData.birthDate || ''}
            onChange={(e) => updateFormData('birthDate', e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
          <select
            value={formData.gender || ''}
            onChange={(e) => updateFormData('gender', e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ethnicity</label>
          <select
            value={formData.ethnicity || ''}
            onChange={(e) => updateFormData('ethnicity', e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
          >
            <option value="">Select ethnicity</option>
            <option value="malay">Malay</option>
            <option value="chinese">Chinese</option>
            <option value="indian">Indian</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
          <select
            value={formData.country || ''}
            onChange={(e) => updateFormData('country', e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
          >
            <option value="">Select country</option>
            <option value="malaysia">Malaysia</option>
            <option value="singapore">Singapore</option>
            <option value="indonesia">Indonesia</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
        <input
          type="text"
          value={formData.address || ''}
          onChange={(e) => updateFormData('address', e.target.value)}
          placeholder="Street address"
          className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
        <input
          type="text"
          value={formData.city || ''}
          onChange={(e) => updateFormData('city', e.target.value)}
          placeholder="City"
          className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
        />
      </div>
    </div>
  );
}

function SmokingHistoryStep({ formData, updateFormData }: {
  formData: Partial<IntakeFormData>;
  updateFormData: (field: keyof IntakeFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">How long have you been smoking?</label>
        <select
          value={formData.smokingDuration || ''}
          onChange={(e) => updateFormData('smokingDuration', e.target.value)}
          className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
        >
          <option value="">Select duration</option>
          <option value="less-than-1">Less than 1 year</option>
          <option value="1-5">1-5 years</option>
          <option value="6-10">6-10 years</option>
          <option value="11-20">11-20 years</option>
          <option value="more-than-20">More than 20 years</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">How many cigarettes do you typically smoke in a day?</label>
        <input
          type="number"
          min="1"
          value={formData.cigarettesPerDay || ''}
          onChange={(e) => updateFormData('cigarettesPerDay', parseInt(e.target.value) || 0)}
          placeholder="Number of cigarettes"
          className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Are there specific situations or triggers that make you more likely to smoke?</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Stress or anxiety',
            'After meals',
            'With coffee or alcohol',
            'When bored',
            'Social situations',
            'Driving or commuting',
            'Work breaks',
            'Other'
          ].map((trigger) => (
            <label key={trigger} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.smokingTriggers || []).includes(trigger)}
                onChange={(e) => {
                  const current = formData.smokingTriggers || [];
                  if (e.target.checked) {
                    updateFormData('smokingTriggers', [...current, trigger]);
                  } else {
                    updateFormData('smokingTriggers', current.filter(t => t !== trigger));
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{trigger}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Do you smoke more in certain social settings or environments?</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'With friends',
            'Family gatherings',
            'Parties or events',
            'At work',
            'Alone at home',
            'While watching TV',
            'During breaks',
            'Other social settings'
          ].map((setting) => (
            <label key={setting} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.socialTriggers || []).includes(setting)}
                onChange={(e) => {
                  const current = formData.socialTriggers || [];
                  if (e.target.checked) {
                    updateFormData('socialTriggers', [...current, setting]);
                  } else {
                    updateFormData('socialTriggers', current.filter(t => t !== setting));
                  }
                }}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">{setting}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthHistoryStep({ formData, updateFormData }: {
  formData: Partial<IntakeFormData>;
  updateFormData: (field: keyof IntakeFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Have you ever tried to quit smoking before?</label>
        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              name="pastQuitAttempts"
              value="yes"
              checked={formData.pastQuitAttempts === 'yes'}
              onChange={(e) => updateFormData('pastQuitAttempts', e.target.value)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              name="pastQuitAttempts"
              value="no"
              checked={formData.pastQuitAttempts === 'no'}
              onChange={(e) => updateFormData('pastQuitAttempts', e.target.value)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">No</span>
          </label>
        </div>
      </div>

      {formData.pastQuitAttempts === 'yes' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">What methods or strategies have you used, and how successful were they?</label>
          <textarea
            value={formData.quitMethods?.join(', ') || ''}
            onChange={(e) => updateFormData('quitMethods', e.target.value.split(', '))}
            placeholder="List the methods you've tried (e.g., cold turkey, nicotine patches, counseling)"
            rows={3}
            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white resize-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Are you experiencing any health issues that you think might be related to smoking?</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Shortness of breath',
            'Chronic cough',
            'Chest pain',
            'Fatigue',
            'Frequent colds',
            'High blood pressure',
            'Heart problems',
            'Other'
          ].map((issue) => (
            <label key={issue} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.healthIssues || []).includes(issue)}
                onChange={(e) => {
                  const current = formData.healthIssues || [];
                  if (e.target.checked) {
                    updateFormData('healthIssues', [...current, issue]);
                  } else {
                    updateFormData('healthIssues', current.filter(i => i !== issue));
                  }
                }}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{issue}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Have you noticed any changes in your respiratory health?</label>
        <textarea
          value={formData.respiratoryChanges || ''}
          onChange={(e) => updateFormData('respiratoryChanges', e.target.value)}
          placeholder="Describe any changes you've noticed in your breathing, coughing, or lung function"
          rows={3}
          className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Have you noticed any changes in your cardiovascular health?</label>
        <textarea
          value={formData.cardiovascularChanges || ''}
          onChange={(e) => updateFormData('cardiovascularChanges', e.target.value)}
          placeholder="Describe any changes you've noticed in your heart health, blood pressure, or energy levels"
          rows={3}
          className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">How much do you know about the health risks associated with smoking?</label>
        <div className="space-y-3">
          <input
            type="range"
            min="1"
            max="10"
            value={formData.healthRiskAwareness || 5}
            onChange={(e) => updateFormData('healthRiskAwareness', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Very little (1)</span>
            <span className="font-semibold">Current: {formData.healthRiskAwareness || 5}/10</span>
            <span>A lot (10)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MotivationStep({ formData, updateFormData }: {
  formData: Partial<IntakeFormData>;
  updateFormData: (field: keyof IntakeFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">What are your reasons for wanting to quit smoking?</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Health concerns',
            'Save money',
            'Family pressure',
            'Doctor\'s advice',
            'Improve fitness',
            'Set good example',
            'Taste/smell improvement',
            'Other'
          ].map((reason) => (
            <label key={reason} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.quitReasons || []).includes(reason)}
                onChange={(e) => {
                  const current = formData.quitReasons || [];
                  if (e.target.checked) {
                    updateFormData('quitReasons', [...current, reason]);
                  } else {
                    updateFormData('quitReasons', current.filter(r => r !== reason));
                  }
                }}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">{reason}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">How important is it for you to quit smoking on a scale from 1 to 10?</label>
        <div className="space-y-3">
          <input
            type="range"
            min="1"
            max="10"
            value={formData.motivationLevel || 5}
            onChange={(e) => updateFormData('motivationLevel', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Not important (1)</span>
            <span className="font-semibold">Current: {formData.motivationLevel || 5}/10</span>
            <span>Very important (10)</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Do you have friends or family members who smoke, and how might this affect your efforts to quit?</label>
        <textarea
          value={formData.smokerFriendsFamily || ''}
          onChange={(e) => updateFormData('smokerFriendsFamily', e.target.value)}
          placeholder="Describe your social circle and how it might impact your quit journey"
          rows={3}
          className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Who in your life can provide support as you work on quitting smoking?</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Spouse/Partner',
            'Family members',
            'Close friends',
            'Doctor/Healthcare provider',
            'Support group',
            'Counselor/Therapist',
            'Colleagues',
            'Other'
          ].map((support) => (
            <label key={support} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.supportPeople || []).includes(support)}
                onChange={(e) => {
                  const current = formData.supportPeople || [];
                  if (e.target.checked) {
                    updateFormData('supportPeople', [...current, support]);
                  } else {
                    updateFormData('supportPeople', current.filter(s => s !== support));
                  }
                }}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">{support}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function TreatmentPreferencesStep({ formData, updateFormData }: {
  formData: Partial<IntakeFormData>;
  updateFormData: (field: keyof IntakeFormData, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Have you considered using nicotine replacement therapy (NRT), such as patches, gum, or lozenges?</label>
        <div className="space-y-2">
          {[
            { value: 'yes-interested', label: 'Yes, I\'m interested' },
            { value: 'yes-not-sure', label: 'Yes, but I\'m not sure which one' },
            { value: 'no-thanks', label: 'No, thank you' },
            { value: 'no-concerns', label: 'No, I have concerns about NRT' }
          ].map((option) => (
            <label key={option.value} className="flex items-center space-x-3">
              <input
                type="radio"
                name="nicotineReplacementInterest"
                value={option.value}
                checked={formData.nicotineReplacementInterest === option.value}
                onChange={(e) => updateFormData('nicotineReplacementInterest', e.target.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Are you open to discussing pharmacological options to aid in smoking cessation?</label>
        <div className="space-y-2">
          {[
            { value: 'yes-open', label: 'Yes, I\'m open to discussing options' },
            { value: 'maybe', label: 'Maybe, depending on the option' },
            { value: 'no-preference', label: 'No, I prefer non-pharmacological approaches' },
            { value: 'not-sure', label: 'I\'m not sure yet' }
          ].map((option) => (
            <label key={option.value} className="flex items-center space-x-3">
              <input
                type="radio"
                name="pharmacologicalInterest"
                value={option.value}
                checked={formData.pharmacologicalInterest === option.value}
                onChange={(e) => updateFormData('pharmacologicalInterest', e.target.value)}
                className="w-4 h-4 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">What are some alternative strategies you could use to cope with stress instead of smoking?</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Exercise or physical activity',
            'Deep breathing or meditation',
            'Talking to friends/family',
            'Hobbies or relaxation activities',
            'Professional counseling',
            'Nicotine replacement therapy',
            'Support groups',
            'Other'
          ].map((strategy) => (
            <label key={strategy} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all duration-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(formData.stressCopingStrategies || []).includes(strategy)}
                onChange={(e) => {
                  const current = formData.stressCopingStrategies || [];
                  if (e.target.checked) {
                    updateFormData('stressCopingStrategies', [...current, strategy]);
                  } else {
                    updateFormData('stressCopingStrategies', current.filter(s => s !== strategy));
                  }
                }}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{strategy}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Would you be open to scheduling regular follow-up appointments to track your progress?</label>
        <div className="space-y-2">
          {[
            { value: 'yes-weekly', label: 'Yes, weekly follow-ups' },
            { value: 'yes-biweekly', label: 'Yes, bi-weekly follow-ups' },
            { value: 'yes-monthly', label: 'Yes, monthly follow-ups' },
            { value: 'maybe', label: 'Maybe, depending on my progress' },
            { value: 'no-preference', label: 'No, I prefer to check in as needed' }
          ].map((option) => (
            <label key={option.value} className="flex items-center space-x-3">
              <input
                type="radio"
                name="followUpInterest"
                value={option.value}
                checked={formData.followUpInterest === option.value}
                onChange={(e) => updateFormData('followUpInterest', e.target.value)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Are you interested in learning more about the benefits of quitting and the available resources?</label>
        <div className="space-y-2">
          {[
            { value: 'very-interested', label: 'Very interested' },
            { value: 'somewhat-interested', label: 'Somewhat interested' },
            { value: 'not-particularly', label: 'Not particularly interested' },
            { value: 'already-informed', label: 'I\'m already well-informed' }
          ].map((option) => (
            <label key={option.value} className="flex items-center space-x-3">
              <input
                type="radio"
                name="quitBenefitsAwareness"
                value={option.value}
                checked={formData.quitBenefitsAwareness === option.value}
                onChange={(e) => updateFormData('quitBenefitsAwareness', e.target.value)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}