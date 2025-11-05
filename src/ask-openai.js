import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function askOpenai(links) {
    return await generateText({
        model: openai("gpt-5-mini"),
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text", text: "Analyze the following video and evaluate the person appearing in it according to these parameters:\n" +
                            "Income Level: Determine whether the person’s income appears above average, based on clothing, environment, camera quality, and general presentation style.\n" +
                            "Age: Estimate if the person is older than 30 years old.\n" +
                            "Depth of Knowledge / Informational Value: Assess how deeply the person demonstrates knowledge of the topic — how many facts, analytical statements, or domain-specific terms they use.\n" +
                            "Intelligence: Estimate the intellectual level of the speaker based on articulation, reasoning structure, and complexity of thoughts.\n" +
                            "Consistency: Evaluate the consistency and coherence of their speech and opinions — whether their logic follows clearly and ideas are connected.\n" +
                            "Talking Head Presence: Detect if this is a talking-head video (the speaker looks directly into the camera and talks by themselves, with visible face and lips moving).\n" +
                            "Story Mode Check: Identify whether the video matches a “blogger talking to camera” format, similar to Instagram Stories or Reels — the person speaks directly, without voice-over, background narrator, or significant editing interruptions.\n" +
                            "Output a structured JSON with the following fields and confidence scores from 0 to 1:"
                    },
                    ...links.map(l => ({ type: "image", image: l }),)
                ]
            },
        ],
        maxTokens: 4096,
    });
}