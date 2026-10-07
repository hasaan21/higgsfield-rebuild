# Capture Test

Status: **green**. Two canaries were sent in two separate Cursor chat sessions. Each prompt and its final response landed in `.agent-logs/` automatically.

## Tool and model

- **Tool:** Cursor 3.23.23, agent mode.
- **Model:** Claude Opus 5.5, logged as `claude-opus-5-5-medium` in the hook payload (`model_id: claude-opus-5-5`, medium effort). The same model plans and executes, and there is no separate planner model.

## Mechanism

Cursor project hooks run automatically on every prompt and every turn. Nothing has to be run by hand.

- **Config file:** `.cursor/hooks.json`.
- **Script:** `.cursor/hooks/agent_log.py`, run with `/usr/bin/python3` (the system Python, so it doesn't depend on shell PATH or pyenv).

| Hook event | What the script does |
|---|---|
| `beforeSubmitPrompt` | Appends the `PROMPT` entry. The `prompt` field is verbatim. |
| `afterAgentResponse` | Saves the assistant's `text` until the turn ends. A newer message replaces an older one. |
| `stop` | Writes the saved text as the `RESPONSE` entry for that turn. |

- **Not logged:** thinking, tool calls and diffs.
- **File naming:** one file per Cursor `conversation_id`, named `YYYY-MM-DD_HH-MM-SS_<conversation_id>.md` after the UTC time of the first prompt.
- **Header:** the front matter is regenerated on each write, which keeps `total_exchanges`, `last_prompt_time` and the model list current. Entry bodies are never rewritten.
- **Debug data:** raw hook payloads and state go to `.cursor/hooks/.state/`, which is gitignored. `.agent-logs/` is not ignored.

## Where the canaries landed

- Session 1 (the setup chat): `.agent-logs/2026-10-07_01-54-57_e99452ae-3dc1-49d3-aa7b-7900869c97e4.md`
- Session 2 (a new chat): `.agent-logs/2026-10-07_01-56-20_be4419b8-6057-4986-8ede-10ff61fa5481.md`

## Canary entries (raw)

### Session 1, `e99452ae`

```
[LOG_ENTRY type=PROMPT num=2 session=e99452ae]
timestamp: 2026-10-07T01:55:32.722Z
model: claude-opus-5-5-medium

CAPTURE TEST — 8x assignment, Hasaan Majeed


[LOG_ENTRY type=RESPONSE num=2 session=e99452ae]
timestamp: 2026-10-07T01:55:47.512Z
model: claude-opus-5-5-medium

The canary prompt was logged in this session. Its response will be written when this turn ends, so I can only confirm that next turn.

The log is `.agent-logs/2026-10-07_01-54-57_e99452ae-3dc1-49d3-aa7b-7900869c97e4.md`. The raw hook data also confirms a few things:

- **Real hooks are firing:** `beforeSubmitPrompt` captured your canary verbatim with model `claude-opus-5-5-medium`. These aren't my test runs.
- **Last turn's response was saved:** the setup reply was written in full when that turn ended.
- **The setup prompt was recovered, with a caveat:** you sent it before the hooks existed, so the hook pulled it from Cursor's transcript. It has the time of that recovery rather than when you actually sent it. It may also differ slightly in whitespace from what you pasted; I can see one place with a single blank line where your original had two. I'll note both in `CAPTURE-TEST.md`.
- **One response per turn:** Cursor sent `afterAgentResponse` once for the whole turn, not once per intermediate message.

**Next:** open a new agent chat in this workspace, send `CAPTURE TEST — 8x assignment, Hasaan Majeed` there, and then come back here and say "done". I'll confirm both canaries, prompt and response, landed in `.agent-logs/`. Then I'll write `CAPTURE-TEST.md` and commit it with the logs.
```

### Session 2, `be4419b8`

```
[LOG_ENTRY type=PROMPT num=1 session=be4419b8]
timestamp: 2026-10-07T01:56:20.729Z
model: claude-opus-5-5-medium

CAPTURE TEST — 8x assignment, Hasaan Majeed


[LOG_ENTRY type=RESPONSE num=1 session=be4419b8]
timestamp: 2026-10-07T01:56:38.474Z
model: claude-opus-5-5-medium

The hook saved your prompt in this new chat. It's in `.agent-logs/2026-10-07_01-56-20_be4419b8-6057-4986-8ede-10ff61fa5481.md` as prompt #1, word for word, timestamped `2026-10-07T01:56:20.729Z`, with model `claude-opus-5-5-medium`.

This reply will be added to that file when this turn ends, so I can't confirm the response capture from here. The hook's debug log also shows `transcript_path` was `null` when this chat's first prompt arrived. That's harmless here because the prompt came straight from the hook. But if `agent_log.py` ever needs to recover text from the transcript at the start of a new chat, it won't have it.

Next, go back to the original setup chat, [Capture hook setup](e99452ae-3dc1-49d3-aa7b-7900869c97e4), and say "done." That chat can then check that this file has both the prompt and this response, and write and commit `CAPTURE-TEST.md`.
```

## What didn't work at first, and known caveats

- **The very first prompt was sent before any hook existed.** It was the assignment brief that started this setup, so `beforeSubmitPrompt` never fired for it. To avoid losing it, the script falls back to Cursor's on-disk transcript (`transcript_path` in the hook payload) when a response arrives for a turn with no recorded prompt. That recovered `PROMPT num=1` in session `e99452ae`, with two caveats:
  - Its timestamp is when it was recovered at the end of the turn (`01:54:57.838Z`), not when it was actually sent, so it matches the response timestamp.
  - The transcript copy seems to have slightly different whitespace from what was pasted. In the example-format block, the original had two blank lines between entries and the transcript has one.

  Every prompt after that one came directly from `beforeSubmitPrompt`.
- **`chmod +x` on the hook script failed inside the agent's sandbox** with "Operation not permitted". That aborted the command chain, so the first simulated test never ran. It was rerun outside the sandbox. `hooks.json` calls the script through `/usr/bin/python3`, so the executable bit isn't needed anyway.
- **The first local simulation produced invalid JSON.** zsh's `echo` turned the `\n` in my test payload into a real newline, and Python's strict `json.loads` rejected it. The test was rerun using `print -r`. The parser now uses `strict=False` so raw control characters in prompts can't make a capture fail.
- **The transcript path isn't always available.** In the new chat, `transcript_path` was `null` on the first `beforeSubmitPrompt`. This doesn't matter in normal use, because prompts come from the hook payload. It does mean the transcript fallback only works after a chat has started.
- **Intermediate messages turned out not to be a problem.** The design assumed `afterAgentResponse` might fire for each intermediate assistant message, so the script keeps only the latest and writes it on `stop`. In practice Cursor fired it once per turn, with the final text.
