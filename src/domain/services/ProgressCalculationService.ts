/**
 * Progress Calculation Domain Service
 * 
 * Domain service that handles complex progress calculation logic
 * across multiple learning progress records and entities.
 * 
 * @author Student-ACT LMS Team
 * @version 1.0.0
 */

import { LearningProgress, ProgressStatus } from '../entities/LearningProgress';
import { User } from '../entities/User';
import { LearningResource } from '../entities/LearningResource';

export interface ProgressSummary {
  overallCompletion: number;
  totalTimeSpent: number;
  resourcesStarted: number;
  resourcesCompleted: number;
  currentStatus: ProgressStatus;
  engagementScore: number;
  strugglingAreas: string[];
  achievements: string[];
  recommendations: string[];
}

export interface ResourceProgressAnalysis {
  resourceId: string;
  averageCompletion: number;
  completionRate: number;
  averageTimeSpent: number;
  strugglingStudentCount: number;
  topChallenges: string[];
  successFactors: string[];
  recommendedImprovements: string[];
}

export interface StudentPerformanceMetrics {
  studentId: string;
  overallGrade: string;
  completionVelocity: number; // Resources completed per week
  consistencyScore: number; // How consistent is the learning pattern
  engagementLevel: 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  improvementAreas: string[];
}

export interface LearningTrend {
  period: string;
  completionPercentage: number;
  timeSpent: number;
  progressStatus: ProgressStatus;
  trend: 'improving' | 'declining' | 'stable';
}

export class ProgressCalculationService {
  /**
   * Calculate overall progress summary for a student
   */
  public static calculateStudentProgress(
    student: User,
    progressRecords: LearningProgress[],
    resources: Map<string, LearningResource>
  ): ProgressSummary {
    if (progressRecords.length === 0) {
      return {
        overallCompletion: 0,
        totalTimeSpent: 0,
        resourcesStarted: 0,
        resourcesCompleted: 0,
        currentStatus: 'excellent',
        engagementScore: 0,
        strugglingAreas: [],
        achievements: [],
        recommendations: ['Start your first learning resource'],
      };
    }

    // Group progress by resource
    const resourceProgress = new Map<string, LearningProgress[]>();
    for (const progress of progressRecords) {
      const resourceId = progress.getResourceId();
      if (!resourceProgress.has(resourceId)) {
        resourceProgress.set(resourceId, []);
      }
      resourceProgress.get(resourceId)!.push(progress);
    }

    let totalCompletion = 0;
    let totalTimeSpent = 0;
    let resourcesStarted = 0;
    let resourcesCompleted = 0;
    const strugglingAreas: string[] = [];
    const achievements: string[] = [];

    // Analyze each resource
    for (const [resourceId, records] of resourceProgress) {
      const resource = resources.get(resourceId);
      const latestProgress = this.getLatestProgress(records);
      
      resourcesStarted++;
      
      const completion = latestProgress.getCompletionPercentage() || 0;
      totalCompletion += completion;
      totalTimeSpent += latestProgress.getTimeSpentMinutes() || 0;

      if (completion >= 100) {
        resourcesCompleted++;
        achievements.push(`Completed ${resource?.getCategory() || 'resource'}`);
      }

      if (latestProgress.isStruggling()) {
        strugglingAreas.push(resource?.getCategory() || 'Unknown area');
      }
    }

    const overallCompletion = resourcesStarted > 0 ? totalCompletion / resourcesStarted : 0;
    const engagementScore = this.calculateEngagementScore(progressRecords);
    const currentStatus = this.determineOverallStatus(progressRecords);

    const recommendations = this.generateRecommendations(
      overallCompletion,
      engagementScore,
      strugglingAreas,
      resourcesCompleted
    );

    return {
      overallCompletion,
      totalTimeSpent,
      resourcesStarted,
      resourcesCompleted,
      currentStatus,
      engagementScore,
      strugglingAreas,
      achievements,
      recommendations,
    };
  }

  /**
   * Analyze progress for a specific resource across all students
   */
  public static analyzeResourceProgress(
    resource: LearningResource,
    progressRecords: LearningProgress[],
    students: Map<string, User>
  ): ResourceProgressAnalysis {
    if (progressRecords.length === 0) {
      return {
        resourceId: resource.getId(),
        averageCompletion: 0,
        completionRate: 0,
        averageTimeSpent: 0,
        strugglingStudentCount: 0,
        topChallenges: [],
        successFactors: [],
        recommendedImprovements: ['No progress data available'],
      };
    }

    // Group by student to get latest progress for each
    const studentProgress = new Map<string, LearningProgress>();
    for (const progress of progressRecords) {
      const studentId = progress.getUserId();
      const existing = studentProgress.get(studentId);
      
      if (!existing || progress.getTrackingDate() > existing.getTrackingDate()) {
        studentProgress.set(studentId, progress);
      }
    }

    const latestRecords = Array.from(studentProgress.values());
    
    // Calculate metrics
    const completions = latestRecords.map(p => p.getCompletionPercentage() || 0);
    const timeSpents = latestRecords.map(p => p.getTimeSpentMinutes() || 0);
    
    const averageCompletion = completions.reduce((a, b) => a + b, 0) / completions.length;
    const completionRate = completions.filter(c => c >= 100).length / completions.length;
    const averageTimeSpent = timeSpents.reduce((a, b) => a + b, 0) / timeSpents.length;
    const strugglingStudentCount = latestRecords.filter(p => p.isStruggling()).length;

    // Analyze challenges
    const challenges = latestRecords
      .map(p => p.getChallengesFaced())
      .filter(c => c && c.trim())
      .map(c => c!.toLowerCase());

    const topChallenges = this.extractTopChallenges(challenges);
    const successFactors = this.identifySuccessFactors(latestRecords, students);
    const recommendedImprovements = this.generateResourceImprovements(
      averageCompletion,
      completionRate,
      strugglingStudentCount,
      topChallenges
    );

    return {
      resourceId: resource.getId(),
      averageCompletion,
      completionRate,
      averageTimeSpent,
      strugglingStudentCount,
      topChallenges,
      successFactors,
      recommendedImprovements,
    };
  }

  /**
   * Calculate student performance metrics
   */
  public static calculateStudentPerformance(
    student: User,
    progressRecords: LearningProgress[],
    timeWindowDays: number = 30
  ): StudentPerformanceMetrics {
    const cutoffDate = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);
    const recentRecords = progressRecords.filter(p => p.getTrackingDate() >= cutoffDate);

    // Calculate completion velocity (resources completed per week)
    const completedResources = recentRecords.filter(p => p.isComplete()).length;
    const completionVelocity = (completedResources / timeWindowDays) * 7;

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(recentRecords);

    // Determine engagement level
    const engagementScore = this.calculateEngagementScore(recentRecords);
    const engagementLevel = engagementScore >= 75 ? 'high' : engagementScore >= 50 ? 'medium' : 'low';

    // Determine risk level
    const strugglingCount = recentRecords.filter(p => p.isStruggling()).length;
    const riskLevel = strugglingCount > recentRecords.length * 0.5 ? 'high' :
                     strugglingCount > recentRecords.length * 0.25 ? 'medium' : 'low';

    // Calculate overall grade
    const averageCompletion = recentRecords.length > 0 ?
      recentRecords.reduce((sum, p) => sum + (p.getCompletionPercentage() || 0), 0) / recentRecords.length : 0;
    
    const overallGrade = this.calculateGrade(averageCompletion, engagementScore, consistencyScore);

    // Identify strengths and improvement areas
    const strengths = this.identifyStudentStrengths(recentRecords, engagementLevel, consistencyScore);
    const improvementAreas = this.identifyImprovementAreas(recentRecords, riskLevel);

    return {
      studentId: student.getId(),
      overallGrade,
      completionVelocity,
      consistencyScore,
      engagementLevel,
      riskLevel,
      strengths,
      improvementAreas,
    };
  }

  /**
   * Calculate learning trends over time
   */
  public static calculateLearningTrends(
    progressRecords: LearningProgress[],
    periodDays: number = 7
  ): LearningTrend[] {
    if (progressRecords.length === 0) return [];

    // Sort by date
    const sortedRecords = progressRecords.sort((a, b) => 
      a.getTrackingDate().getTime() - b.getTrackingDate().getTime()
    );

    const trends: LearningTrend[] = [];
    const periodMs = periodDays * 24 * 60 * 60 * 1000;
    
    let currentPeriodStart = sortedRecords[0].getTrackingDate();
    let currentPeriodRecords: LearningProgress[] = [];

    for (const record of sortedRecords) {
      const recordTime = record.getTrackingDate().getTime();
      const periodStartTime = currentPeriodStart.getTime();

      if (recordTime - periodStartTime > periodMs) {
        // Process current period
        if (currentPeriodRecords.length > 0) {
          trends.push(this.calculatePeriodTrend(currentPeriodStart, currentPeriodRecords, periodDays));
        }

        // Start new period
        currentPeriodStart = new Date(periodStartTime + periodMs);
        currentPeriodRecords = [record];
      } else {
        currentPeriodRecords.push(record);
      }
    }

    // Process final period
    if (currentPeriodRecords.length > 0) {
      trends.push(this.calculatePeriodTrend(currentPeriodStart, currentPeriodRecords, periodDays));
    }

    // Calculate trend directions
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i];
      const previous = trends[i - 1];
      
      const completionDiff = current.completionPercentage - previous.completionPercentage;
      
      if (completionDiff > 5) {
        current.trend = 'improving';
      } else if (completionDiff < -5) {
        current.trend = 'declining';
      } else {
        current.trend = 'stable';
      }
    }

    return trends;
  }

  // Private helper methods

  private static getLatestProgress(records: LearningProgress[]): LearningProgress {
    return records.reduce((latest, current) => 
      current.getTrackingDate() > latest.getTrackingDate() ? current : latest
    );
  }

  private static calculateEngagementScore(records: LearningProgress[]): number {
    if (records.length === 0) return 0;

    const scores = records.map(record => record.getEngagementScore());
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private static determineOverallStatus(records: LearningProgress[]): ProgressStatus {
    if (records.length === 0) return 'excellent';

    const statusCounts = new Map<ProgressStatus, number>();
    
    for (const record of records) {
      const status = record.getProgressStatus();
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    // Return the most common status
    let maxCount = 0;
    let mostCommonStatus: ProgressStatus = 'excellent';
    
    for (const [status, count] of statusCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonStatus = status;
      }
    }

    return mostCommonStatus;
  }

  private static generateRecommendations(
    completion: number,
    engagement: number,
    strugglingAreas: string[],
    completedResources: number
  ): string[] {
    const recommendations: string[] = [];

    if (completion < 50) {
      recommendations.push('Focus on completing current resources before starting new ones');
    }

    if (engagement < 50) {
      recommendations.push('Try to engage more with learning materials and activities');
    }

    if (strugglingAreas.length > 0) {
      recommendations.push(`Seek help with: ${strugglingAreas.join(', ')}`);
    }

    if (completedResources === 0) {
      recommendations.push('Complete your first learning resource to build momentum');
    }

    if (completion > 80 && engagement > 70) {
      recommendations.push('Great progress! Consider taking on more challenging resources');
    }

    return recommendations;
  }

  private static extractTopChallenges(challenges: string[]): string[] {
    const challengeMap = new Map<string, number>();
    
    for (const challenge of challenges) {
      const words = challenge.split(/\s+/);
      for (const word of words) {
        if (word.length > 3) { // Ignore short words
          challengeMap.set(word, (challengeMap.get(word) || 0) + 1);
        }
      }
    }

    return Array.from(challengeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private static identifySuccessFactors(
    records: LearningProgress[],
    students: Map<string, User>
  ): string[] {
    const successfulRecords = records.filter(r => (r.getCompletionPercentage() || 0) >= 80);
    const factors: string[] = [];

    if (successfulRecords.length > 0) {
      const avgTimeSpent = successfulRecords.reduce((sum, r) => sum + (r.getTimeSpentMinutes() || 0), 0) / successfulRecords.length;
      
      if (avgTimeSpent > 60) {
        factors.push('Adequate time investment');
      }

      const resourceAccessRate = successfulRecords.filter(r => r.getResourcesAccessed()).length / successfulRecords.length;
      if (resourceAccessRate > 0.8) {
        factors.push('High resource access rate');
      }

      const assignmentCompletionRate = successfulRecords.filter(r => r.getAssignmentsCompleted()).length / successfulRecords.length;
      if (assignmentCompletionRate > 0.7) {
        factors.push('Good assignment completion');
      }
    }

    return factors;
  }

  private static generateResourceImprovements(
    avgCompletion: number,
    completionRate: number,
    strugglingCount: number,
    challenges: string[]
  ): string[] {
    const improvements: string[] = [];

    if (avgCompletion < 60) {
      improvements.push('Consider breaking down content into smaller modules');
    }

    if (completionRate < 0.5) {
      improvements.push('Review resource difficulty and prerequisites');
    }

    if (strugglingCount > 0) {
      improvements.push('Provide additional support materials');
    }

    if (challenges.length > 0) {
      improvements.push(`Address common challenges: ${challenges.join(', ')}`);
    }

    return improvements;
  }

  private static calculateConsistencyScore(records: LearningProgress[]): number {
    if (records.length < 2) return 100;

    const dates = records.map(r => r.getTrackingDate().getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];

    for (let i = 1; i < dates.length; i++) {
      intervals.push(dates[i] - dates[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    const consistencyScore = Math.max(0, 100 - (stdDev / avgInterval) * 100);
    return Math.min(100, consistencyScore);
  }

  private static calculateGrade(completion: number, engagement: number, consistency: number): string {
    const overallScore = (completion * 0.5) + (engagement * 0.3) + (consistency * 0.2);

    if (overallScore >= 90) return 'A+';
    if (overallScore >= 85) return 'A';
    if (overallScore >= 80) return 'A-';
    if (overallScore >= 75) return 'B+';
    if (overallScore >= 70) return 'B';
    if (overallScore >= 65) return 'B-';
    if (overallScore >= 60) return 'C+';
    if (overallScore >= 55) return 'C';
    if (overallScore >= 50) return 'C-';
    return 'F';
  }

  private static identifyStudentStrengths(
    records: LearningProgress[],
    engagementLevel: string,
    consistencyScore: number
  ): string[] {
    const strengths: string[] = [];

    if (engagementLevel === 'high') {
      strengths.push('High engagement with learning materials');
    }

    if (consistencyScore > 80) {
      strengths.push('Consistent learning pattern');
    }

    const completionRate = records.filter(r => r.isComplete()).length / records.length;
    if (completionRate > 0.8) {
      strengths.push('High completion rate');
    }

    return strengths;
  }

  private static identifyImprovementAreas(
    records: LearningProgress[],
    riskLevel: string
  ): string[] {
    const areas: string[] = [];

    if (riskLevel === 'high') {
      areas.push('Struggling with multiple resources - seek additional support');
    }

    const avgTimeSpent = records.reduce((sum, r) => sum + (r.getTimeSpentMinutes() || 0), 0) / records.length;
    if (avgTimeSpent < 30) {
      areas.push('Increase time spent on learning activities');
    }

    const resourceAccessRate = records.filter(r => r.getResourcesAccessed()).length / records.length;
    if (resourceAccessRate < 0.5) {
      areas.push('Access more learning resources and materials');
    }

    return areas;
  }

  private static calculatePeriodTrend(
    periodStart: Date,
    records: LearningProgress[],
    periodDays: number
  ): LearningTrend {
    const avgCompletion = records.reduce((sum, r) => sum + (r.getCompletionPercentage() || 0), 0) / records.length;
    const totalTimeSpent = records.reduce((sum, r) => sum + (r.getTimeSpentMinutes() || 0), 0);
    const mostCommonStatus = this.determineOverallStatus(records);

    return {
      period: `${periodStart.toISOString().split('T')[0]} (${periodDays}d)`,
      completionPercentage: avgCompletion,
      timeSpent: totalTimeSpent,
      progressStatus: mostCommonStatus,
      trend: 'stable', // Will be calculated later
    };
  }
}
