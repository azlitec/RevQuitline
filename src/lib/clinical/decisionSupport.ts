import { SmokingMetric, HealthRecord, VitalSign } from '@prisma/client';

export interface ClinicalRecommendation {
  type: 'warning' | 'suggestion' | 'alert' | 'success';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  link?: string;
}

export interface PatientAssessment {
  smokingStatus: {
    cigarettesPerDay: number;
    quitDurationDays: number;
    carbonMonoxideLevel: number;
    cravingsIntensity: number;
  };
  vitalSigns: {
    bloodPressure: string;
    heartRate: number;
    oxygenSaturation: number;
  };
  medications: Array<{
    name: string;
    status: string;
  }>;
  recentHealthRecords: Array<{
    type: string;
    date: Date;
  }>;
}

export class ClinicalDecisionSupport {
  static analyzePatientData(assessment: PatientAssessment): ClinicalRecommendation[] {
    const recommendations: ClinicalRecommendation[] = [];

    // Smoking cessation recommendations
    this.analyzeSmokingStatus(assessment.smokingStatus, recommendations);
    
    // Vital signs analysis
    this.analyzeVitalSigns(assessment.vitalSigns, recommendations);
    
    // Medication adherence
    this.analyzeMedications(assessment.medications, recommendations);
    
    // Follow-up recommendations
    this.analyzeFollowUpNeeds(assessment.recentHealthRecords, recommendations);

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private static analyzeSmokingStatus(
    smokingStatus: PatientAssessment['smokingStatus'],
    recommendations: ClinicalRecommendation[]
  ) {
    const { cigarettesPerDay, quitDurationDays, carbonMonoxideLevel, cravingsIntensity } = smokingStatus;

    if (cigarettesPerDay > 10) {
      recommendations.push({
        type: 'warning',
        title: 'High Smoking Rate',
        message: `Patient is smoking ${cigarettesPerDay} cigarettes per day. Consider intensive cessation support.`,
        priority: 'high',
        action: 'Schedule intensive counseling session',
        link: '/provider/patients'
      });
    }

    if (carbonMonoxideLevel > 10) {
      recommendations.push({
        type: 'alert',
        title: 'Elevated Carbon Monoxide',
        message: `Carbon monoxide level is ${carbonMonoxideLevel} ppm, indicating recent smoking.`,
        priority: 'high',
        action: 'Discuss smoking reduction strategies',
        link: '/provider/patients'
      });
    }

    if (quitDurationDays > 0 && quitDurationDays < 30) {
      recommendations.push({
        type: 'suggestion',
        title: 'Early Quit Phase',
        message: `Patient has been smoke-free for ${quitDurationDays} days. Consider nicotine replacement therapy.`,
        priority: 'medium',
        action: 'Review medication options',
        link: '/provider/medications'
      });
    }

    if (cravingsIntensity > 7) {
      recommendations.push({
        type: 'warning',
        title: 'High Cravings Intensity',
        message: `Patient reports cravings intensity of ${cravingsIntensity}/10. Consider behavioral interventions.`,
        priority: 'medium',
        action: 'Schedule behavioral therapy',
        link: '/provider/appointments'
      });
    }

    if (quitDurationDays > 90) {
      recommendations.push({
        type: 'success',
        title: 'Long-term Success',
        message: `Congratulations! Patient has been smoke-free for ${quitDurationDays} days.`,
        priority: 'low',
        action: 'Celebrate milestone',
        link: '/provider/patients'
      });
    }
  }

  private static analyzeVitalSigns(
    vitalSigns: PatientAssessment['vitalSigns'],
    recommendations: ClinicalRecommendation[]
  ) {
    const { bloodPressure, heartRate, oxygenSaturation } = vitalSigns;

    // Parse blood pressure
    const [systolic, diastolic] = bloodPressure.split('/').map(Number);

    if (systolic > 140 || diastolic > 90) {
      recommendations.push({
        type: 'alert',
        title: 'High Blood Pressure',
        message: `Blood pressure reading of ${bloodPressure} mmHg may indicate hypertension.`,
        priority: 'high',
        action: 'Monitor and consider referral',
        link: '/provider/health-records'
      });
    }

    if (heartRate > 100) {
      recommendations.push({
        type: 'warning',
        title: 'Elevated Heart Rate',
        message: `Heart rate of ${heartRate} bpm may indicate stress or withdrawal symptoms.`,
        priority: 'medium',
        action: 'Assess stress levels',
        link: '/provider/health-records'
      });
    }

    if (oxygenSaturation < 95) {
      recommendations.push({
        type: 'alert',
        title: 'Low Oxygen Saturation',
        message: `Oxygen saturation of ${oxygenSaturation}% may indicate respiratory issues.`,
        priority: 'high',
        action: 'Consider pulmonary assessment',
        link: '/provider/health-records'
      });
    }
  }

  private static analyzeMedications(
    medications: PatientAssessment['medications'],
    recommendations: ClinicalRecommendation[]
  ) {
    const activeMeds = medications.filter(med => med.status === 'active');
    const nicotineMeds = activeMeds.filter(med => 
      med.name.toLowerCase().includes('nicotine') || 
      med.name.toLowerCase().includes('patch') ||
      med.name.toLowerCase().includes('gum') ||
      med.name.toLowerCase().includes('lozenge')
    );

    if (nicotineMeds.length === 0 && activeMeds.length > 0) {
      recommendations.push({
        type: 'suggestion',
        title: 'Consider Nicotine Replacement',
        message: 'Patient is on medications but not using nicotine replacement therapy.',
        priority: 'medium',
        action: 'Discuss NRT options',
        link: '/provider/medications'
      });
    }

    if (activeMeds.length >= 3) {
      recommendations.push({
        type: 'warning',
        title: 'Multiple Medications',
        message: `Patient is taking ${activeMeds.length} active medications. Monitor for interactions.`,
        priority: 'medium',
        action: 'Review medication regimen',
        link: '/provider/medications'
      });
    }
  }

  private static analyzeFollowUpNeeds(
    recentHealthRecords: PatientAssessment['recentHealthRecords'],
    recommendations: ClinicalRecommendation[]
  ) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentRecords = recentHealthRecords.filter(record => 
      new Date(record.date) > thirtyDaysAgo
    );

    if (recentRecords.length === 0) {
      recommendations.push({
        type: 'warning',
        title: 'No Recent Follow-up',
        message: 'Patient has not had a health record entry in the last 30 days.',
        priority: 'medium',
        action: 'Schedule follow-up appointment',
        link: '/provider/appointments'
      });
    }

    const assessmentRecords = recentRecords.filter(record => 
      record.type.includes('assessment') || record.type.includes('progress')
    );

    if (assessmentRecords.length === 0) {
      recommendations.push({
        type: 'suggestion',
        title: 'Assessment Needed',
        message: 'No recent progress assessments found.',
        priority: 'medium',
        action: 'Conduct progress assessment',
        link: '/provider/health-records'
      });
    }
  }

  static generateSmokingCessationPlan(smokingStatus: PatientAssessment['smokingStatus']) {
    const { cigarettesPerDay, quitDurationDays, cravingsIntensity } = smokingStatus;
    
    let plan = {
      phase: '',
      recommendations: [] as string[],
      medications: [] as string[],
      followUpFrequency: ''
    };

    if (cigarettesPerDay > 20) {
      plan.phase = 'Intensive Cessation';
      plan.recommendations = [
        'Daily behavioral counseling',
        'Combination nicotine replacement therapy',
        'Weekly progress monitoring',
        'Emergency craving management plan'
      ];
      plan.medications = ['21mg nicotine patch', 'Nicotine gum as needed'];
      plan.followUpFrequency = 'Weekly';
    } else if (cigarettesPerDay > 10) {
      plan.phase = 'Standard Cessation';
      plan.recommendations = [
        'Bi-weekly counseling sessions',
        'Nicotine replacement therapy',
        'Craving coping strategies',
        'Progress tracking'
      ];
      plan.medications = ['14mg nicotine patch', 'Nicotine lozenges'];
      plan.followUpFrequency = 'Bi-weekly';
    } else if (cigarettesPerDay > 0) {
      plan.phase = 'Maintenance Phase';
      plan.recommendations = [
        'Monthly check-ins',
        'Relapse prevention strategies',
        'Social support engagement',
        'Healthy habit development'
      ];
      plan.medications = ['7mg nicotine patch if needed'];
      plan.followUpFrequency = 'Monthly';
    } else if (quitDurationDays > 0) {
      plan.phase = 'Post-Cessation';
      plan.recommendations = [
        'Relapse prevention',
        'Weight management support',
        'Stress management techniques',
        'Celebration of milestones'
      ];
      plan.medications = [];
      plan.followUpFrequency = 'Quarterly';
    }

    if (cravingsIntensity > 7) {
      plan.recommendations.push('Intensive craving management');
      if (!plan.medications.includes('Nicotine gum as needed')) {
        plan.medications.push('Nicotine gum for cravings');
      }
    }

    return plan;
  }
}