import axios from "axios";
import { ENV } from "../config/env.config";
import { logger } from "../utils/logger";

export interface BackendSubmission {
  _id: string;
  rollNumber?: string;
  score: number;
  category: string;
  shift: string;
  examId?: { _id: string; name: string; stream: string };
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
   * Fetch submissions strictly for the selected target exam (_id or stream).
   * Ensures zero cross-exam leakage by strict equality checks!
   */
  public static async fetchSubmissionsByStream(streamOrExamId: string): Promise<BackendSubmission[]> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(streamOrExamId);
    const candidateSubmissions: BackendSubmission[] = [];

    // Resolve exact exam object details (_id, stream, name)
    const allExams = await this.fetchAllExams();
    const matchedExam = allExams.find(
      (e) => e._id === streamOrExamId || e.stream === streamOrExamId || e.name === streamOrExamId
    );

    const targetExamId = matchedExam?._id || (isObjectId ? streamOrExamId : undefined);
    const targetStream = matchedExam?.stream || streamOrExamId;
    const targetExamName = matchedExam?.name || streamOrExamId;

    // 1. Strict Query General Submissions by examId
    if (targetExamId) {
      try {
        const genEndpoint = `${ENV.BACKEND_API_URL}/admin/general/submissions?examId=${targetExamId}&export=true`;
        const genRes = await axios.get(genEndpoint, {
          headers: { "x-admin-password": ENV.ADMIN_PASSWORD },
          timeout: 8000,
        });

        if (genRes.data?.submissions && Array.isArray(genRes.data.submissions) && genRes.data.submissions.length > 0) {
          // Strict filter: must match targetExamId
          const strictGen = genRes.data.submissions.filter((sub: any) => {
            const subExamId = sub.examId?._id || sub.examId;
            return String(subExamId) === String(targetExamId);
          });
          candidateSubmissions.push(...strictGen);
        }
      } catch (err) {
        logger.warn(`General submissions lookup by examId ${targetExamId} failed`, err);
      }
    }

    // 2. Fallback: Query all general submissions and filter strictly by exact examId or exact examName
    if (candidateSubmissions.length === 0) {
      try {
        const allGenEndpoint = `${ENV.BACKEND_API_URL}/admin/general/submissions?export=true`;
        const allGenRes = await axios.get(allGenEndpoint, {
          headers: { "x-admin-password": ENV.ADMIN_PASSWORD },
          timeout: 8000,
        });

        if (allGenRes.data?.submissions && Array.isArray(allGenRes.data.submissions)) {
          const filteredGen = allGenRes.data.submissions.filter((sub: any) => {
            const subExamId = sub.examId?._id || sub.examId;
            const subName = sub.examId?.name || sub.name || "";

            // Strict exact match (no loose substring inclusion!)
            const matchesId = targetExamId && String(subExamId) === String(targetExamId);
            const matchesExactName = targetExamName && subName.trim().toLowerCase() === targetExamName.trim().toLowerCase();

            return Boolean(matchesId || matchesExactName);
          });

          candidateSubmissions.push(...filteredGen);
        }
      } catch (err) {
        logger.warn(`Export query for all general submissions failed`, err);
      }
    }

    // 3. Query Legacy Submissions endpoint if no general submissions found
    if (candidateSubmissions.length === 0 && targetStream) {
      try {
        const endpoint = `${ENV.BACKEND_API_URL}/admin/submissions?stream=${encodeURIComponent(targetStream)}&limit=1000`;
        const response = await axios.get(endpoint, {
          headers: { "x-admin-password": ENV.ADMIN_PASSWORD },
          timeout: 8000,
        });

        if (response.data?.submissions && Array.isArray(response.data.submissions)) {
          const filteredLegacy = response.data.submissions.filter((sub: any) => {
            const subExamId = sub.examId?._id || sub.examId;
            const subStream = sub.examId?.stream || sub.stream || "";

            const matchesId = targetExamId && String(subExamId) === String(targetExamId);
            const matchesStream = targetStream && subStream.toUpperCase() === targetStream.toUpperCase();

            return Boolean(matchesId || matchesStream);
          });

          candidateSubmissions.push(...filteredLegacy);
        }
      } catch (err) {
        logger.warn(`Submissions lookup failed for stream ${targetStream}`, err);
      }
    }

    // Deduplicate candidate submissions strictly by submission ID
    const uniqueMap = new Map<string, BackendSubmission>();
    candidateSubmissions.forEach((sub) => {
      const key = sub._id || `${sub.rollNumber}_${sub.score}_${sub.shift}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, sub);
      }
    });

    return Array.from(uniqueMap.values());
  }
}
