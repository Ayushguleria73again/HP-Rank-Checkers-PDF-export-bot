import axios from "axios";
import fs from "fs";
import path from "path";
import { ENV } from "../config/env.config";
import { logger } from "../utils/logger";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number; // 0, 1, 2, 3
  explanation?: string;
  category?: string;
}

export class QuizDataService {
  private static localQuestionsCache: QuizQuestion[] = [];

  /**
   * Load quiz questions from Quiz Bot MongoDB or local JSON bank
   */
  public static async fetchQuizQuestions(count = 20, category?: string): Promise<QuizQuestion[]> {
    // 1. Try fetching from Quiz Bot API or shared DB if QUIZ_MONGODB_URI is provided
    if (ENV.QUIZ_MONGODB_URI) {
      try {
        const res = await axios.get(`${ENV.BACKEND_API_URL}/quiz/questions?limit=${count}`, {
          timeout: 5000,
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
      } catch (err) {
        logger.warn("Could not fetch quiz questions via API, falling back to local question bank...", err);
      }
    }

    // 2. Load from local Quiz-Bot question JSON dataset
    const allQuestions = this.getLocalQuestions();
    
    let filtered = allQuestions;
    if (category) {
      filtered = allQuestions.filter((q) => 
        q.category?.toLowerCase().includes(category.toLowerCase())
      );
      if (filtered.length === 0) filtered = allQuestions;
    }

    // Unbiased Fisher-Yates (Knuth) Shuffle
    const pool = [...filtered];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pool[i];
      pool[i] = pool[j];
      pool[j] = temp;
    }

    return pool.slice(0, Math.min(count, pool.length));
  }

  /**
   * Reads fallback questions from JSON dataset with multi-path resolution
   */
  private static getLocalQuestions(): QuizQuestion[] {
    if (this.localQuestionsCache.length > 0) {
      return this.localQuestionsCache;
    }

    const candidatePaths = [
      path.join(process.cwd(), "src/data/hp_gk_questions.json"),
      path.join(process.cwd(), "dist/data/hp_gk_questions.json"),
      path.join(__dirname, "../data/hp_gk_questions.json"),
      path.join(__dirname, "../../src/data/hp_gk_questions.json"),
    ];

    for (const jsonPath of candidatePaths) {
      if (fs.existsSync(jsonPath)) {
        try {
          const raw = fs.readFileSync(jsonPath, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.localQuestionsCache = parsed;
            logger.info(`Successfully loaded ${parsed.length} HP GK questions from ${jsonPath}`);
            return this.localQuestionsCache;
          }
        } catch (err) {
          logger.error(`Failed to parse local questions from ${jsonPath}`, err);
        }
      }
    }

    // Fallback default questions if file not found
    return [
      {
        question: "Which is the highest mountain peak in Himachal Pradesh?",
        options: ["Reo Purgyil", "Hanuman Tibba", "Shitidhar", "Kinner Kailash"],
        correctIndex: 0,
        explanation: "Reo Purgyil (6,816 m) in Kinnaur district is the highest peak in HP.",
        category: "Himachal GK"
      },
      {
        question: "On which date did Himachal Pradesh attain full statehood as the 18th state of India?",
        options: ["15th April 1948", "25th January 1971", "1st November 1966", "26th January 1950"],
        correctIndex: 1,
        explanation: "HP became the 18th state on 25th January 1971. Dr. Y.S. Parmar was the first CM.",
        category: "Himachal GK"
      },
      {
        question: "Who was the first Chief Minister of Himachal Pradesh?",
        options: ["Dr. Yashwant Singh Parmar", "Thakur Ram Lal", "Sh. Virbhadra Singh", "Sh. Shanta Kumar"],
        correctIndex: 0,
        explanation: "Dr. Yashwant Singh Parmar became the first Chief Minister of Himachal Pradesh on 24 March 1952.",
        category: "Himachal GK"
      }
    ];
  }
}
