
import { GoogleGenAI } from "@google/genai";
import { GeolocationCoordinates } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Extracts a Vehicle Identification Number (VIN) from an image.
 * @param base64ImageData The base64 encoded image data.
 * @returns The extracted VIN string.
 */
export const extractVinFromImage = async (base64ImageData: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: "Extract the Vehicle Identification Number (VIN) from this image. A VIN is a 17-character alphanumeric code. Respond with ONLY the VIN, with no extra text or formatting." },
          { inlineData: { mimeType: 'image/jpeg', data: base64ImageData } }
        ]
      },
    });
    const vin = response.text.trim().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    if (vin.length !== 17) {
        throw new Error(`Invalid VIN length extracted: ${vin.length}`);
    }
    return vin;
  } catch (error) {
    console.error("Error extracting VIN with Gemini:", error);
    throw new Error("Could not recognize a valid VIN. Please try again with a clearer image.");
  }
};

/**
 * Analyzes an image based on a user-provided prompt.
 * @param base64ImageData The base64 encoded image data.
 * @param prompt The user's question about the image.
 * @returns The text response from the model.
 */
export const analyzeImage = async (base64ImageData: string, prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64ImageData } }
        ]
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw new Error("Failed to analyze the image. Please try again.");
  }
};

/**
 * Analyzes a series of video frames based on a user-provided prompt.
 * @param frames A series of base64 encoded image frames from a video.
 * @param prompt The user's question about the video.
 * @returns The text response from the model.
 */
export const analyzeVideoFrames = async (frames: string[], prompt: string): Promise<string> => {
    if (frames.length === 0) {
        throw new Error("No frames provided for video analysis.");
    }
    try {
        const contentParts = [
            { text: prompt },
            ...frames.map(frame => ({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: frame,
                },
            })),
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: contentParts },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing video with Gemini:", error);
        throw new Error("Failed to analyze the video. Please try again.");
    }
};
