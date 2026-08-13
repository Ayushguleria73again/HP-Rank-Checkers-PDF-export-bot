import axios from "axios";
import { ENV } from "../config/env.config";
import { logger } from "../utils/logger";

export interface BackendSubmission {
  _id: string;
  rollNumber?: string;
  score: number;
  category: string;
  shift: string;
  examId?: { name: string; stream: string };
  createdAt: string;
}

export interface BackendExam {
  _id: string;
  name: string;
  stream: string;
  totalQuestions?: number;
}

export interface BackendStats {
  totalSubmissions: number;
  todaySubmissions: number;
  avgScore: number;
  shiftStats: Array<{ _id: string; avg: number; total: number }>;
  examPopularity: Array<{ name: string; stream: string; count: number }>;
}

export class BackendDataService {
  /**
   * Fetch all registered exams from Backend API
   */
  public static async fetchAllExams(): Promise<BackendExam[]> {
    try {
      const endpoint = `${ENV.BACKEND_API_URL}/exams`;
      const response = await axios.get(endpoint, { timeout: 6000 });
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch (err) {
      logger.warn("Could not fetch exams list from /exams endpoint, trying stats fallback...", err);
    }

    // Fallback to stats popularity or default comprehensive list
    try {
      const stats = await this.fetchPlatformStats();
      if (stats?.examPopularity && stats.examPopularity.length > 0) {
        return stats.examPopularity.map((e, idx) => ({
          _id: String(idx + 1),
          name: e.name || e.stream,
          stream: e.stream,
        }));
      }
    } catch (err) {
      logger.error("Failed stats fallback for exams", err);
    }

    // Fallback default stream list
    return [
      { _id: "1", name: "TGT Non-Medical", stream: "NON_MEDICAL" },
      { _id: "2", name: "TGT Medical", stream: "MEDICAL" },
      { _id: "3", name: "TGT Arts", stream: "ARTS" },
      { _id: "4", name: "TGT Mathematics", stream: "MATHEMATICS" },
      { _id: "5", name: "JBT Teacher", stream: "JBT" },
      { _id: "6", name: "HP Patwari Exam", stream: "PATWARI" },
      { _id: "7", name: "HP Police Constable", stream: "POLICE" },
      { _id: "8", name: "General Competitive", stream: "GENERAL" },
    ];
  }

  /**
   * Fetch live platform statistics from existing Backend REST API
   */
  public static async fetchPlatformStats(): Promise<BackendStats | null> {
    try {
      const endpoint = `${ENV.BACKEND_API_URL}/admin/stats`;
      const response = await axios.get(endpoint, {
        headers: { "x-admin-password": ENV.ADMIN_PASSWORD },
        timeout: 8000,
      });

      return response.data;
    } catch (err) {
      logger.error("Failed to fetch stats from Backend API:", err);
      return null;
    }
  }

  /**
   * Fetch submissions by stream or examId for PDF report generation
   */
  public static async fetchSubmissionsByStream(streamOrExamId: string): Promise<BackendSubmission[]> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(streamOrExamId);

    // 1. If 24-character Mongo ObjectId, check general submissions endpoint first
    if (isObjectId) {
      try {
        const genEndpoint = `${ENV.BACKEND_API_URL}/admin/general/submissions?examId=${streamOrExamId}&export=true`;
        const genRes = await axios.get(genEndpoint, {
          headers: { "x-admin-password": ENV.ADMIN_PASSWORD },
          timeout: 8000,
        });

        if (genRes.data?.submissions && genRes.data.submissions.length > 0) {
          return genRes.data.submissions;
        }
      } catch (err) {
        logger.warn(`General submissions lookup failed for examId ${streamOrExamId}`, err);
      }
    }

    // 2. Try /admin/analytics/marks endpoint
    try {
      const analyticsEndpoint = `${ENV.BACKEND_API_URL}/admin/analytics/marks?stream=${encodeURIComponent(streamOrExamId)}&sort=desc`;
      const res = await axios.get(analyticsEndpoint, {
        headers: { "x-admin-password": ENV.ADMIN_PASSWORD },
        timeout: 8000,
      });

      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data;
      }
    } catch (err) {
      logger.warn(`Analytics marks lookup failed for ${streamOrExamId}`, err);
    }

    // 3. Fallback to /admin/submissions endpoint
    try {
      const endpoint = `${ENV.BACKEND_API_URL}/admin/submissions?stream=${encodeURIComponent(streamOrExamId)}&limit=500`;
      const response = await axios.get(endpoint, {
        headers: { "x-admin-password": ENV.ADMIN_PASSWORD },
        timeout: 8000,
      });

      return response.data.submissions || [];
    } catch (err) {
      logger.error(`Failed to fetch submissions for ${streamOrExamId}:`, err);
      return [];
    }
  }
}
