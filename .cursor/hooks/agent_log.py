#!/usr/bin/python3
"""Cursor hook: capture each prompt and the final response of each turn into .agent-logs/.

Wired in .cursor/hooks.json to:
  beforeSubmitPrompt  -> writes the PROMPT entry
  afterAgentResponse  -> stashes the latest assistant message (overwritten until the turn ends)
  stop                -> writes the stashed message as the RESPONSE entry

Must never block the agent: every path exits 0 with valid JSON.
"""
import datetime
import fcntl
import json
import os
import re
import subprocess
import sys

TOOL = "cursor"
DEFAULT_AUTHOR = "hasaanmajeed"

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG_DIR = os.path.join(ROOT, ".agent-logs")
STATE_DIR = os.path.join(ROOT, ".cursor", "hooks", ".state")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def author():
    for key in ("github.user", "user.github"):
        try:
            out = subprocess.run(["git", "config", key], cwd=ROOT, capture_output=True, text=True, timeout=3)
            if out.stdout.strip():
                return out.stdout.strip()
        except Exception:
            pass
    return os.environ.get("AGENT_LOG_AUTHOR", DEFAULT_AUTHOR)


def load_state(sid):
    path = os.path.join(STATE_DIR, sid + ".json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def save_state(sid, state):
    path = os.path.join(STATE_DIR, sid + ".json")
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2)
    os.replace(tmp, path)


def new_state(sid, ts, model):
    stamp = ts[:19].replace("T", "_").replace(":", "-")
    return {
        "session_id": sid,
        "file": "%s_%s.md" % (stamp, sid),
        "date": ts[:10],
        "author": author(),
        "models": [model],
        "project": os.path.basename(ROOT),
        "total_exchanges": 0,
        "first_prompt_time": ts,
        "last_prompt_time": ts,
        "pending_response": None,
        "responded_num": 0,
    }


def header(state):
    sid = state["session_id"]
    return (
        "---\n"
        "session_id: {sid}\n"
        "date: {date}\n"
        "author: {author}\n"
        "model: {model}\n"
        "tool: {tool}\n"
        "project: {project}\n"
        "total_exchanges: {n}\n"
        "first_prompt_time: {first}\n"
        "last_prompt_time: {last}\n"
        "---\n\n"
        "# Session Log - {date}\n\n"
        "Session: `{short}` | Project: `{project}` | Author: `{author}`\n\n"
        "---\n"
    ).format(
        sid=sid,
        date=state["date"],
        author=state["author"],
        model=", ".join(state["models"]),
        tool=TOOL,
        project=state["project"],
        n=state["total_exchanges"],
        first=state["first_prompt_time"],
        last=state["last_prompt_time"],
        short=sid[:8],
    )


def write_entry(state, kind, num, ts, model, body):
    path = os.path.join(LOG_DIR, state["file"])
    existing = ""
    if os.path.exists(path):
        with open(path) as f:
            existing = f.read()
        # Strip the old front matter + title block; everything from the first entry on is preserved verbatim.
        idx = existing.find("\n[LOG_ENTRY ")
        existing = existing[idx:] if idx != -1 else ""
    entry = "\n[LOG_ENTRY type={kind} num={num} session={short}]\ntimestamp: {ts}\nmodel: {model}\n\n{body}\n\n".format(
        kind=kind, num=num, short=state["session_id"][:8], ts=ts, model=model, body=body.rstrip("\n")
    )
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        f.write(header(state) + existing + entry)
    os.replace(tmp, path)


def flush_response(state):
    pending = state.get("pending_response")
    if not pending or state["responded_num"] >= state["total_exchanges"]:
        state["pending_response"] = None
        return
    num = state["total_exchanges"]
    write_entry(state, "RESPONSE", num, pending["timestamp"], pending["model"], pending["text"])
    state["responded_num"] = num
    state["pending_response"] = None


def backfill_prompt(data):
    """Recover the user prompt from the on-disk transcript when the hook was installed mid-turn."""
    path = data.get("transcript_path")
    if not path or not os.path.exists(path):
        return None
    last = None
    with open(path) as f:
        for line in f:
            try:
                obj = json.loads(line)
            except ValueError:
                continue
            if obj.get("role") != "user":
                continue
            content = obj.get("message", {}).get("content", obj.get("content"))
            if isinstance(content, list):
                content = "".join(c.get("text", "") for c in content if isinstance(c, dict))
            if isinstance(content, str):
                last = content
    if last is None:
        return None
    m = re.search(r"<user_query>\n?(.*?)\n?</user_query>", last, re.S)
    return m.group(1) if m else last


def handle(event, data):
    sid = data.get("conversation_id") or data.get("session_id") or "unknown-session"
    model = data.get("model") or "unknown-model"
    ts = now_iso()
    state = load_state(sid)

    if event == "beforeSubmitPrompt":
        if state is None:
            state = new_state(sid, ts, model)
        else:
            flush_response(state)
        if model not in state["models"]:
            state["models"].append(model)
        state["total_exchanges"] += 1
        state["last_prompt_time"] = ts
        write_entry(state, "PROMPT", state["total_exchanges"], ts, model, data.get("prompt", ""))
        save_state(sid, state)
        return {"continue": True}

    if event == "afterAgentResponse":
        if state is None or state["responded_num"] >= state["total_exchanges"]:
            prompt = backfill_prompt(data)
            if prompt is not None:
                if state is None:
                    state = new_state(sid, ts, model)
                state["total_exchanges"] += 1
                state["last_prompt_time"] = ts
                write_entry(state, "PROMPT", state["total_exchanges"], ts, model, prompt)
        if state is None:
            return {}
        state["pending_response"] = {"text": data.get("text", ""), "timestamp": ts, "model": model}
        save_state(sid, state)
        return {}

    if event == "stop":
        if state is not None:
            flush_response(state)
            save_state(sid, state)
        return {}

    return {}


def main():
    event = sys.argv[1] if len(sys.argv) > 1 else ""
    raw = sys.stdin.read()
    out = {"continue": True} if event == "beforeSubmitPrompt" else {}
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        os.makedirs(STATE_DIR, exist_ok=True)
        with open(os.path.join(STATE_DIR, "debug.jsonl"), "a") as dbg:
            dbg.write(json.dumps({"event": event, "at": now_iso(), "input": raw}) + "\n")
        data = json.loads(raw or "{}", strict=False)
        with open(os.path.join(STATE_DIR, ".lock"), "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            out = handle(event, data)
    except Exception as e:
        with open(os.path.join(STATE_DIR, "errors.log"), "a") as f:
            f.write("%s %s %r\n" % (now_iso(), event, e))
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()
