import subprocess
import threading
import queue
import time
from dataclasses import dataclass
from theo_api.config import settings

@dataclass
class UciLine:
    pv: list[str]           # moves in UCI
    eval_cp: int | None     # centipawns from White POV
    mate: int | None        # mate in N (positive means White mates)
    depth: int

@dataclass
class EngineAnalysis:
    fen: str
    lines: list[UciLine]    # sorted best-first
    best_move: str | None

class StockfishUCI:
    """
    Simple, reliable UCI wrapper.
    One instance per request is easiest (and safe). For speed later, pool it.
    """
    def __init__(self, path: str | None = None):
        self.path = path or settings.stockfish_path
        self.proc = subprocess.Popen(
            [self.path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )
        self.q: queue.Queue[str] = queue.Queue()
        self._reader_thread = threading.Thread(target=self._reader, daemon=True)
        self._reader_thread.start()

        self._send("uci")
        self._wait_for("uciok", timeout=5)
        self._send("isready")
        self._wait_for("readyok", timeout=5)

    def close(self):
        try:
            self._send("quit")
        except Exception:
            pass
        try:
            self.proc.kill()
        except Exception:
            pass

    def _reader(self):
        assert self.proc.stdout is not None
        for line in self.proc.stdout:
            self.q.put(line.strip())

    def _send(self, cmd: str):
        assert self.proc.stdin is not None
        self.proc.stdin.write(cmd + "\n")
        self.proc.stdin.flush()

    def _wait_for(self, token: str, timeout: float):
        end = time.time() + timeout
        while time.time() < end:
            try:
                line = self.q.get(timeout=0.1)
                if token in line:
                    return
            except queue.Empty:
                continue
        raise TimeoutError(f"Timed out waiting for {token}")

    def set_option(self, name: str, value: str | int):
        self._send(f"setoption name {name} value {value}")

    def analyze(self, *, fen: str, movetime_ms: int, depth: int | None, multipv: int) -> EngineAnalysis:
        # reset hash between games could be set later; for now keep simple
        self.set_option("MultiPV", multipv)

        self._send(f"position fen {fen}")
        if depth is not None:
            self._send(f"go depth {depth}")
        else:
            self._send(f"go movetime {movetime_ms}")

        lines: dict[int, UciLine] = {}
        best_move: str | None = None

        while True:
            line = self.q.get()
            if line.startswith("info "):
                parsed = _parse_info(line)
                if parsed is not None:
                    mpv, uciline = parsed
                    lines[mpv] = uciline
            elif line.startswith("bestmove"):
                parts = line.split()
                best_move = parts[1] if len(parts) > 1 else None
                break

        ordered = [lines[k] for k in sorted(lines.keys()) if k in lines]
        return EngineAnalysis(fen=fen, lines=ordered, best_move=best_move)


def _parse_info(line: str):
    # Parses:
    # info depth 12 multipv 1 score cp 23 pv e2e4 e7e5 ...
    # info depth 18 multipv 2 score mate -3 pv ...
    toks = line.split()
    if "pv" not in toks or "score" not in toks:
        return None

    def get_int_after(key: str) -> int | None:
        if key in toks:
            i = toks.index(key)
            if i + 1 < len(toks):
                try:
                    return int(toks[i + 1])
                except ValueError:
                    return None
        return None

    depth = get_int_after("depth") or 0
    multipv = get_int_after("multipv") or 1

    # score
    eval_cp = None
    mate = None
    if "score" in toks:
        si = toks.index("score")
        if si + 2 < len(toks):
            stype = toks[si + 1]
            sval = toks[si + 2]
            try:
                n = int(sval)
                if stype == "cp":
                    eval_cp = n
                elif stype == "mate":
                    mate = n
            except ValueError:
                pass

    pvi = toks.index("pv")
    pv_moves = toks[pvi + 1 :]

    return multipv, UciLine(pv=pv_moves, eval_cp=eval_cp, mate=mate, depth=depth)
