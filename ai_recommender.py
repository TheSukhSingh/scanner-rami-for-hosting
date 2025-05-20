# ai_recommender.py
import os
import traceback
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_recommendation(profile: dict) -> str:
    prompt = (
        "You're a cybersecurity analyst. Based on the following IP scan result, "
        "give a concise 100-word recommendation on what action to take (block, monitor, ignore, etc.).\n\n"
        f"{profile}\n\n"
        "Recommendation:"
    )

    try:
        # 🔍 Show the prompt for debugging
        print("\n🔍 Prompt sent to OpenAI:")
        print(prompt)

        # Make the API call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.4,
        )

        # Return AI-generated text
        return response.choices[0].message.content.strip()

    except Exception as e:
        # ❌ Show detailed error traceback
        print("❌ OpenAI API Error:")
        traceback.print_exc()
        return "⚠️ Recommendation unavailable due to AI service error."
