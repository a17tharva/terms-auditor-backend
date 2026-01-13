# Use this code to check out recent models 



import google.generativeai as genai

genai.configure(api_key="Your API key here ")

print("🔍 Checking available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Found: {m.name}")
except Exception as e:
    print(f"❌ Error: {e}")

