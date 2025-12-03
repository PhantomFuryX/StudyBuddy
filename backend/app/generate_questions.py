import openai, os, json
from config import OPENAI_API_KEY
openai.api_key = OPENAI_API_KEY

SYSTEM_PROMPT = """
You create SSC / Railway NTPC / State PSC MCQs.
Return ONLY JSON.
"""

def generate_from_text(text: str, max_q=10):
    prompt = SYSTEM_PROMPT + "\n\nSource:\n" + text + f"\n\nGenerate {max_q} MCQs."

    resp = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":prompt}],
        temperature=0.2,
        max_tokens=1500,
    )
    content = resp["choices"][0]["message"]["content"]

    try:
        return json.loads(content)
    except:
        import re
        m = re.search(r"\[.*\]", content, re.S)
        return json.loads(m.group(0))

if __name__ == "__main__":
    import sys
    txt = open(sys.argv[1]).read() if os.path.exists(sys.argv[1]) else sys.argv[1]
    print(json.dumps(generate_from_text(txt), indent=2, ensure_ascii=False))
