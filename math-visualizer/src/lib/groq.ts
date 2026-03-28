import { Groq } from "groq-sdk";

const groq = new Groq({ 
  apiKey: "REPLACED_KEY", // 👈 Replace with your real key
  dangerouslyAllowBrowser: true 
});

export const extractProblemData = async (userInput: string) => {
  const completion = await groq.chat.completions.create({
    messages: [
      { 
        role: "system", 
        content: `You are a math word problem parser for students grades 1-12. Return ONLY a valid JSON object with this exact structure, no markdown:
{
  "problemType": "train",
  "title": "short title",
  "question": "what is being asked",
  "objects": [
    { "id": "a", "label": "Train A", "color": "#3b82f6", "speed": 60, "speedUnit": "km/h", "startPosition": 0, "direction": "right", "startTime": 0 }
  ],
  "environment": { "totalDistance": 500, "distanceUnit": "km", "timeUnit": "hours", "meetingPoint": null },
  "formulas": ["d = s x t"],
  "answer": { "value": 4, "unit": "hours", "expression": "500 / (60 + 65) = 4h" },
  "sliders": [
    { "id": "sl1", "label": "Speed A", "objectId": "a", "field": "speed", "min": 10, "max": 200, "step": 5, "default": 60 }
  ]
}
Rules: direction must be 'left' or 'right'. field in sliders must be 'speed', 'startPosition', or 'startTime'. Return ONLY the JSON.`
      },
      { role: "user", content: userInput }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  if (!response) throw new Error("AI returned empty response");
  return JSON.parse(response);
};